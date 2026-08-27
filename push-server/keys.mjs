/* keys.mjs — generate a VAPID key pair.
 *
 *   node keys.mjs
 *
 * Prints a public key (safe to publish — the app fetches it from the Worker)
 * and a private key (a secret — never commit it, never paste it anywhere but
 * `wrangler secret put`).
 *
 * VAPID is just ECDSA on P-256. Keys are the raw curve points, base64url with
 * the padding stripped, per RFC 8292.
 */

import { webcrypto as crypto } from 'node:crypto';

const b64url = (buf) =>
  Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);

const pub = await crypto.subtle.exportKey('raw', pair.publicKey);      // 65 bytes, 0x04 || X || Y
// PKCS#8 rather than the bare `d` scalar: WebCrypto can import this in one
// call, whereas a lone `d` needs x and y reattached before it's usable.
const pkcs8 = await crypto.subtle.exportKey('pkcs8', pair.privateKey);

console.log('\nVAPID_PUBLIC_KEY  (public — goes in wrangler.toml [vars])\n');
console.log('  ' + b64url(pub));
console.log('\nVAPID_PRIVATE_KEY (secret — wrangler secret put VAPID_PRIVATE_KEY)\n');
console.log('  ' + b64url(pkcs8));
console.log('\nPUSH_TOKEN        (secret — wrangler secret put PUSH_TOKEN)\n');
console.log('  ' + b64url(crypto.getRandomValues(new Uint8Array(24))));
console.log('\nKeep the two secrets out of git. The public key is not sensitive.\n');
