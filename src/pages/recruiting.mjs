import { esc, layout, scroll, num, DASH } from '../html.mjs';
import { classRankings, classRankingsLabel, prospects } from '../model.mjs';

export const PAGE_SIZE = 100;

export function height(inches) {
  if (!inches) return DASH;
  return `${Math.floor(inches / 12)}'${inches % 12}"`;
}

export const stars = (n) => (n ? '★'.repeat(n) : DASH);

// The fields the browser filter needs; also written to prospects.json.
export function prospectRows(season) {
  return prospects(season).map((r) => ({
    rank: r.rank ?? null,
    name: r.name ?? '',
    stars: r.stars ?? 0,
    position: r.position ?? '',
    archetype: r.archetype ?? '',
    height: r.height ?? null,
    weight: r.weight ?? null,
    hometown: r.hometown ?? '',
    state: r.state ?? '',
  }));
}

function classTable(rows) {
  if (!rows.length) return `<p class="muted">No class rankings captured yet. ${DASH}</p>`;
  const shown = rows.filter((r) => r.rank <= 25 || r.isUser);
  return scroll(`<table>
<thead><tr><th class="n">Rank</th><th>School</th><th class="n">Commits</th><th class="n">5★</th><th class="n">4★</th><th class="n">3★</th><th class="n">Points</th></tr></thead>
<tbody>${shown.map((r) => `<tr${r.isUser ? ' class="user"' : ''}>
  <td class="n">${esc(r.rank)}</td><td>${esc(r.school)}</td><td class="n">${esc(r.commits)}</td>
  <td class="n">${esc(r.five)}</td><td class="n">${esc(r.four)}</td><td class="n">${esc(r.three)}</td><td class="n">${num(r.points, 1)}</td></tr>`).join('')}</tbody></table>`);
}

function prospectSection(rows) {
  if (!rows.length) return `<p class="muted">No prospect list captured yet. ${DASH}</p>`;
  const positions = [...new Set(rows.map((r) => r.position).filter(Boolean))].sort();
  const states = [...new Set(rows.map((r) => r.state).filter(Boolean))].sort();
  const opt = (v) => `<option value="${esc(v)}">${esc(v)}</option>`;
  const first = rows.slice(0, PAGE_SIZE).map((r) => `<tr>
  <td class="n">${esc(r.rank)}</td><td>${esc(r.name)}</td><td>${stars(r.stars)}</td><td>${esc(r.position)}</td>
  <td>${esc(r.archetype)}</td><td class="n">${height(r.height)}</td><td class="n">${esc(r.weight)}</td>
  <td>${esc(r.hometown)}, ${esc(r.state)}</td></tr>`).join('');
  return `<form class="filters" id="prospect-filters">
  <label>Position <select id="f-position"><option value="">All</option>${positions.map(opt).join('')}</select></label>
  <label>Stars <select id="f-stars"><option value="0">Any</option><option value="5">5 only</option><option value="4">4 and up</option><option value="3">3 and up</option></select></label>
  <label>State <select id="f-state"><option value="">All</option>${states.map(opt).join('')}</select></label>
  <label>Name <input id="f-name" type="search" placeholder="Search" autocomplete="off"></label>
</form>
<p class="muted small" id="prospect-count">Showing the top ${Math.min(PAGE_SIZE, rows.length)} of ${rows.length} prospects</p>
${scroll(`<table id="prospect-table">
<thead><tr><th class="n">Rank</th><th>Name</th><th>Stars</th><th>Pos</th><th>Archetype</th><th class="n">Ht</th><th class="n">Wt</th><th>Hometown</th></tr></thead>
<tbody>${first}</tbody></table>`)}
<button type="button" id="prospect-more" hidden>Show more</button>`;
}

export function render(archive) {
  const season = archive.seasons?.[archive.current];
  const label = classRankingsLabel(season);
  const body = `<h1>Recruiting</h1>
<p class="note">The game only shares class rankings and the prospect pool. Each coach's board and where a prospect has committed are not available outside the game.</p>
<section>
  <h2>Class rankings <span class="muted small">${label ? esc(label) : ''}</span></h2>
  ${classTable(classRankings(season))}
</section>
<section>
  <h2>Prospects</h2>
  ${prospectSection(prospectRows(season))}
</section>`;
  return layout({ archive, active: 'recruiting', title: 'Recruiting', body, scripts: '<script src="recruits.js" defer></script>' });
}
