/* webpush.test.mjs — proves the encryption and VAPID signing are correct.
 *
 *   node webpush.test.mjs
 *
 * The push service is a black box we can't reach from CI, so instead of
 * trusting the sending code we play the receiving end: decrypt what we
 * produced by following RFC 8291/8188 from the browser's side, and verify the
 * VAPID JWT with the published public key. A mistake in key derivation, the
 * nonce, or the header framing fails here rather than silently on a phone.
 */

// Node 20+ already exposes WebCrypto as the global `crypto`, same as a Worker.
import { encryptPayload, vapidHeaders, b64urlToBytes, bytesToB64url } from './webpush.js';

let pass = 0, fail = 0;
const check = (name, cond, detail) => {
  if (cond) { pass++; console.log('  PASS  ' + name); }
  else { fail++; console.log('  FAIL  ' + name + (detail ? '  <- ' + detail : '')); }
};

const enc = new TextEncoder();
const concat = (...ps) => {
  const out = new Uint8Array(ps.reduce((n, p) => n + p.length, 0));
  let o = 0; for (const p of ps) { out.set(p, o); o += p.length; }
  return out;
};
async function hmac(k, d) {
  const key = await crypto.subtle.importKey('raw', k, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, d));
}
async function hkdf(salt, ikm, info, len) {
  const prk = await hmac(salt, ikm);
  return (await hmac(prk, concat(info, Uint8Array.of(1)))).slice(0, len);
}

/* ---- stand in for a real browser subscription ---- */
async function fakeSubscription() {
  const kp = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const pub = new Uint8Array(await crypto.subtle.exportKey('raw', kp.publicKey));
  const auth = crypto.getRandomValues(new Uint8Array(16));
  return {
    privateKey: kp.privateKey,
    uaPublic: pub,
    subscription: {
      endpoint: 'https://web.push.apple.com/QW1hemluZw',
      keys: { p256dh: bytesToB64url(pub), auth: bytesToB64url(auth) },
    },
  };
}

/* ---- the receiving half of RFC 8291, written independently ---- */
async function decrypt(body, uaPrivate, uaPublic, authB64) {
  const salt = body.slice(0, 16);
  const idLen = body[20];
  const asPublic = body.slice(21, 21 + idLen);
  const ciphertext = body.slice(21 + idLen);

  const asKey = await crypto.subtle.importKey('raw', asPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: asKey }, uaPrivate, 256));

  const keyInfo = concat(enc.encode('WebPush: info'), Uint8Array.of(0), uaPublic, asPublic);
  const ikm = await hkdf(b64urlToBytes(authB64), shared, keyInfo, 32);
  const cek = await hkdf(salt, ikm, concat(enc.encode('Content-Encoding: aes128gcm'), Uint8Array.of(0)), 16);
  const nonce = await hkdf(salt, ikm, concat(enc.encode('Content-Encoding: nonce'), Uint8Array.of(0)), 12);

  const key = await crypto.subtle.importKey('raw', cek, { name: 'AES-GCM' }, false, ['decrypt']);
  const plain = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: nonce, tagLength: 128 }, key, ciphertext));

  let end = plain.length;                   // strip the 0x02 record delimiter
  while (end > 0 && plain[end - 1] === 0) end--;
  if (plain[end - 1] === 2) end--;
  return new TextDecoder().decode(plain.slice(0, end));
}

console.log('\nPayload encryption (RFC 8291)');
{
  const f = await fakeSubscription();
  const message = JSON.stringify({ title: 'Leg day', body: 'Squats 4×5–8', url: './index.html' });
  const body = await encryptPayload(message, f.subscription.keys.p256dh, f.subscription.keys.auth);

  check('body has the aes128gcm header framing', body.length > 21 && body[20] === 65, 'idLen=' + body[20]);
  const rs = new DataView(body.buffer, body.byteOffset + 16, 4).getUint32(0);
  check('record size field is 4096', rs === 4096, String(rs));
  check('server key is a valid uncompressed point', body[21] === 0x04, '0x' + body[21].toString(16));
  // Byte length, not string length: the rep ranges carry × and – which are
  // multi-byte in UTF-8, and the record is bytes + 1 delimiter + 16 GCM tag.
  const plainBytes = enc.encode(message).length;
  check('ciphertext is plaintext + delimiter + GCM tag',
    body.length - 21 - 65 === plainBytes + 1 + 16,
    `${body.length - 21 - 65} vs ${plainBytes + 1 + 16}`);

  const round = await decrypt(body, f.privateKey, f.uaPublic, f.subscription.keys.auth);
  check('decrypts back to the exact payload', round === message, round.slice(0, 60));

  // a different subscription's auth secret must not decrypt it
  const g = await fakeSubscription();
  let rejected = false;
  try { await decrypt(body, g.privateKey, g.uaPublic, g.subscription.keys.auth); }
  catch { rejected = true; }
  check('another subscription cannot decrypt it', rejected);

  // two sends of the same message must differ (fresh salt + ephemeral key)
  const body2 = await encryptPayload(message, f.subscription.keys.p256dh, f.subscription.keys.auth);
  check('each send uses a fresh salt and key', bytesToB64url(body) !== bytesToB64url(body2));
}

console.log('\nVAPID signing (RFC 8292)');
{
  const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const pubRaw = new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey));
  const pkcs8 = new Uint8Array(await crypto.subtle.exportKey('pkcs8', pair.privateKey));

  const endpoint = 'https://web.push.apple.com/abc123';
  const headers = await vapidHeaders(endpoint, bytesToB64url(pubRaw), bytesToB64url(pkcs8), 'mailto:me@example.com');

  check('header uses the vapid scheme', /^vapid t=[\w-]+\.[\w-]+\.[\w-]+, k=[\w-]+$/.test(headers.Authorization),
    headers.Authorization.slice(0, 60));

  const jwt = headers.Authorization.match(/t=([^,]+)/)[1];
  const [h, p, s] = jwt.split('.');
  const claims = JSON.parse(new TextDecoder().decode(b64urlToBytes(p)));
  const head = JSON.parse(new TextDecoder().decode(b64urlToBytes(h)));

  check('alg is ES256', head.alg === 'ES256', head.alg);
  check('aud is the push service origin', claims.aud === 'https://web.push.apple.com', claims.aud);
  check('sub carries the contact', claims.sub === 'mailto:me@example.com', claims.sub);
  const hours = (claims.exp - Math.floor(Date.now() / 1000)) / 3600;
  check('exp is inside the 24h the spec allows', hours > 0 && hours <= 24, hours.toFixed(1) + 'h');

  const ok = await crypto.subtle.verify(
    { name: 'ECDSA', hash: 'SHA-256' }, pair.publicKey,
    b64urlToBytes(s), enc.encode(h + '.' + p)
  );
  check('signature verifies against the published key', ok);

  const tampered = JSON.parse(JSON.stringify(claims));
  tampered.aud = 'https://evil.example';
  const badOk = await crypto.subtle.verify(
    { name: 'ECDSA', hash: 'SHA-256' }, pair.publicKey,
    b64urlToBytes(s), enc.encode(h + '.' + bytesToB64url(enc.encode(JSON.stringify(tampered))))
  );
  check('a tampered audience fails verification', !badOk);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
