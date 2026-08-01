/* webpush.js — Web Push with an encrypted payload, using only WebCrypto.
 *
 * Two specs do the work here:
 *   RFC 8291 — Message Encryption for Web Push (aes128gcm)
 *   RFC 8292 — VAPID, which is just a signed JWT proving who is sending
 *
 * No dependencies, so this runs unchanged on a Cloudflare Worker.
 */

const enc = new TextEncoder();

export function b64urlToBytes(s) {
  const pad = s.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(pad + '='.repeat((4 - (pad.length % 4)) % 4));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function bytesToB64url(bytes) {
  let bin = '';
  const b = new Uint8Array(bytes);
  for (let i = 0; i < b.length; i++) bin += String.fromCharCode(b[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function concat(...parts) {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of parts) { out.set(p, off); off += p.length; }
  return out;
}

async function hmac(keyBytes, data) {
  const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, data));
}

/* HKDF with a single output block — every length we need is <= 32 bytes. */
async function hkdf(salt, ikm, info, length) {
  const prk = await hmac(salt, ikm);
  const out = await hmac(prk, concat(info, Uint8Array.of(1)));
  return out.slice(0, length);
}

/* ------------------------------------------------------------------ VAPID */

export async function vapidHeaders(endpoint, publicKeyB64, privateKeyB64, subject) {
  const aud = new URL(endpoint).origin;
  const header = { typ: 'JWT', alg: 'ES256' };
  const claims = {
    aud,
    exp: Math.floor(Date.now() / 1000) + 12 * 3600, // spec caps this at 24h
    sub: subject,
  };

  const signingInput = enc.encode(
    bytesToB64url(enc.encode(JSON.stringify(header))) + '.' +
    bytesToB64url(enc.encode(JSON.stringify(claims)))
  );

  const key = await crypto.subtle.importKey(
    'pkcs8', b64urlToBytes(privateKeyB64),
    { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']
  );
  // WebCrypto returns the raw r||s pair, which is exactly what JWS wants.
  const sig = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, signingInput));

  const jwt = new TextDecoder().decode(signingInput) + '.' + bytesToB64url(sig);
  return { Authorization: `vapid t=${jwt}, k=${publicKeyB64}` };
}

/* ------------------------------------------------------------- Encryption */

/* Body layout (RFC 8188 §2.1):
     salt(16) | record size(4) | key id length(1) | server public key(65) | ciphertext */
export async function encryptPayload(plaintextStr, p256dhB64, authB64) {
  const uaPublic = b64urlToBytes(p256dhB64);   // 65 bytes, 0x04 || X || Y
  const authSecret = b64urlToBytes(authB64);   // 16 bytes

  const serverKeys = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']
  );
  const serverPublic = new Uint8Array(await crypto.subtle.exportKey('raw', serverKeys.publicKey));

  const uaKey = await crypto.subtle.importKey(
    'raw', uaPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, []
  );
  const shared = new Uint8Array(
    await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, serverKeys.privateKey, 256)
  );

  // The auth secret salts the first extraction; `key_info` binds the result to
  // both parties' public keys so a swapped key can't decrypt.
  const keyInfo = concat(enc.encode('WebPush: info'), Uint8Array.of(0), uaPublic, serverPublic);
  const ikm = await hkdf(authSecret, shared, keyInfo, 32);

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, concat(enc.encode('Content-Encoding: aes128gcm'), Uint8Array.of(0)), 16);
  const nonce = await hkdf(salt, ikm, concat(enc.encode('Content-Encoding: nonce'), Uint8Array.of(0)), 12);

  // 0x02 marks the final record; there is only ever one here.
  const record = concat(enc.encode(plaintextStr), Uint8Array.of(2));
  const aesKey = await crypto.subtle.importKey('raw', cek, { name: 'AES-GCM' }, false, ['encrypt']);
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce, tagLength: 128 }, aesKey, record)
  );

  const rs = new Uint8Array(4);
  new DataView(rs.buffer).setUint32(0, 4096);

  return concat(salt, rs, Uint8Array.of(serverPublic.length), serverPublic, ciphertext);
}

/* ------------------------------------------------------------------- Send */

export async function sendPush(subscription, payloadObj, env) {
  const body = await encryptPayload(
    JSON.stringify(payloadObj),
    subscription.keys.p256dh,
    subscription.keys.auth
  );

  const auth = await vapidHeaders(
    subscription.endpoint,
    env.VAPID_PUBLIC_KEY,
    env.VAPID_PRIVATE_KEY,
    env.VAPID_SUBJECT || 'mailto:nobody@example.com'
  );

  const res = await fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      ...auth,
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      TTL: '86400',
      Urgency: 'normal',
    },
    body,
  });

  return { ok: res.ok, status: res.status, text: res.ok ? '' : await res.text().catch(() => '') };
}
