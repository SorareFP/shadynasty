// Read-only client for the Dynasty Rewired developer API.

export const DEFAULT_BASE = 'https://dynastyrewired.com/api/developer/v1';

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export function createClient({ token, fetchImpl = fetch, base = DEFAULT_BASE }) {
  if (!token) throw new ApiError('DR_API_TOKEN is not set', 0);
  const scrub = (text) => String(text ?? '').split(token).join('[token]');

  async function get(path, params) {
    const url = new URL(base + path);
    for (const [k, v] of Object.entries(params ?? {})) {
      if (v !== undefined && v !== null) url.searchParams.set(k, v);
    }
    let res;
    try {
      res = await fetchImpl(url.toString(), {
        headers: { authorization: `Bearer ${token}`, accept: 'application/json' },
        signal: AbortSignal.timeout(20_000),
      });
    } catch (e) {
      throw new ApiError(`Request to ${path} failed: ${scrub(e.message)}`, 0);
    }
    if (!res.ok) {
      let detail = '';
      try {
        const body = await res.json();
        detail = body?.error?.message ?? body?.error?.code ?? '';
      } catch { /* non-JSON error body */ }
      throw new ApiError(scrub(`${path} returned ${res.status}${detail ? `: ${detail}` : ''}`), res.status);
    }
    return res.json();
  }

  async function getAllBoxScores(league, season) {
    const games = [];
    let after;
    for (let page = 0; page < 200; page++) {
      const body = await get(`/leagues/${league}/seasons/${season}/box-scores`, { after });
      games.push(...(body.data?.games ?? []));
      after = body.data?.next;
      if (!after) break;
    }
    return games;
  }

  return { get, getAllBoxScores };
}
