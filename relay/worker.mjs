// Shadynasty relay: a Cloudflare Worker that receives Dynasty Rewired webhook
// deliveries and asks GitHub to rebuild the site.
//
// Dynasty Rewired can't send GitHub's login header, so this sits in between:
// it checks each delivery's signature, then starts the "Update site" workflow
// with a repository_dispatch event. GitHub keeps at most one rebuild waiting
// behind the one running, so a burst of deliveries becomes one or two rebuilds.
//
// Secrets (set in Cloudflare, never in this file):
//   DR_WEBHOOK_SECRET  the whsec_... signing secret from Dynasty Rewired
//   GITHUB_TOKEN       a fine-grained GitHub token for the shadynasty repo
//                      with Contents: Read and write
// Optional variable:
//   GITHUB_REPO        defaults to SorareFP/shadynasty

const TOLERANCE_SECONDS = 300;
const EVENT_TYPE = 'dynasty-updated';
const DEFAULT_REPO = 'SorareFP/shadynasty';

const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');

function parseSignature(header) {
  const parts = {};
  for (const piece of String(header ?? '').split(',')) {
    const i = piece.indexOf('=');
    if (i > 0) parts[piece.slice(0, i).trim()] = piece.slice(i + 1).trim();
  }
  return parts;
}

function sameText(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// True when the header is a valid, recent signature of the raw body.
export async function verifySignature(rawBody, header, secret, nowSeconds = Math.floor(Date.now() / 1000)) {
  if (!secret || !header) return false;
  const { t, v1 } = parseSignature(header);
  if (!/^\d+$/.test(t ?? '') || !/^[0-9a-f]{64}$/i.test(v1 ?? '')) return false;
  if (Math.abs(nowSeconds - Number(t)) > TOLERANCE_SECONDS) return false;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = await crypto.subtle.sign('HMAC', key, enc.encode(`${t}.${rawBody}`));
  return sameText(hex(mac), v1.toLowerCase());
}

export async function dispatch(env, payload, fetchImpl = fetch) {
  const repo = env.GITHUB_REPO || DEFAULT_REPO;
  const res = await fetchImpl(`https://api.github.com/repos/${repo}/dispatches`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'shadynasty-relay',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ event_type: EVENT_TYPE, client_payload: payload }),
    signal: AbortSignal.timeout(8000),
  });
  return res.status;
}

const reply = (status, text) => new Response(text, { status, headers: { 'Content-Type': 'text/plain' } });

export async function handle(request, env, fetchImpl = fetch, nowSeconds) {
  if (request.method !== 'POST') return reply(405, 'Shadynasty relay: POST only.');
  if (!env.DR_WEBHOOK_SECRET || !env.GITHUB_TOKEN) return reply(500, 'Relay is missing a secret.');

  const raw = await request.text();
  const ok = await verifySignature(raw, request.headers.get('x-dr-signature'), env.DR_WEBHOOK_SECRET, nowSeconds);
  if (!ok) return reply(401, 'Bad signature.');

  // Test deliveries also start a rebuild, so "Send test delivery" proves the whole chain works.
  const payload = {
    dataset: request.headers.get('x-dr-dataset') || 'unknown',
    test: request.headers.get('x-dr-test') === 'true',
  };
  let status;
  try {
    status = await dispatch(env, payload, fetchImpl);
  } catch {
    status = 0;
  }
  // A failure here makes Dynasty Rewired retry later, so no update is lost.
  if (status < 200 || status >= 300) return reply(502, `GitHub refused the rebuild (${status}).`);
  return reply(202, 'Rebuild requested.');
}

export default {
  fetch: (request, env) => handle(request, env),
};
