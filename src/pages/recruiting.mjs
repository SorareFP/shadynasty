import { esc, layout, scroll, num, DASH } from '../html.mjs';
import {
  classRankings, classRankingsLabel, prospects, userTeams, rosterNeeds, positionGroup, POSITION_TARGETS,
} from '../model.mjs';

export const PAGE_SIZE = 100;

export function height(inches) {
  if (!inches) return DASH;
  return `${Math.floor(inches / 12)}'${inches % 12}"`;
}

export const stars = (n) => (n ? '★'.repeat(n) : DASH);

// The fields the browser board needs; also written to prospects.json.
// `key` identifies a prospect for the watchlist. The API's own recruitId is
// rank-based and shifts when rankings change, so it is not used.
export function prospectRows(season) {
  return prospects(season).map((r) => ({
    key: [r.name, r.position, r.hometown, r.state].map((v) => v ?? '').join('|'),
    rank: r.rank ?? null,
    name: r.name ?? '',
    stars: r.stars ?? 0,
    position: r.position ?? '',
    group: positionGroup(r.position),
    positionRank: r.positionRank ?? null,
    stateRank: r.stateRank ?? null,
    archetype: r.archetype ?? '',
    height: r.height ?? null,
    weight: r.weight ?? null,
    hometown: r.hometown ?? '',
    state: r.state ?? '',
    pipeline: r.pipeline ?? '',
  }));
}

const NEED_LABEL = { high: 'Thin', some: 'Short', set: 'Covered' };

function needsTable(team, rows) {
  if (!rows.length) return `<p class="muted">No roster captured for ${esc(team.name)} yet. ${DASH}</p>`;
  const body = rows.map((r) => {
    const leaving = r.leaving
      ? `${esc(r.leaving)} <span class="muted small">(${r.leavingPlayers.slice(0, 3).map((p) => `${esc(p.name)} ${esc(p.overall)}`).join(', ')}${r.leaving > 3 ? ', …' : ''})</span>`
      : '0';
    return `<tr>
  <td>${esc(r.label)}</td>
  <td class="n">${esc(r.total)}</td>
  <td class="wrap-cell">${leaving}</td>
  <td class="n">${esc(r.returning)}${r.target ? ` <span class="muted">/ ${esc(r.target)}</span>` : ''}</td>
  <td class="n">${esc(r.bestReturning)}</td>
  <td><span class="need need-${r.need}">${NEED_LABEL[r.need]}</span></td>
  <td><button type="button" class="link" data-group="${esc(r.group)}">Prospects</button></td></tr>`;
  }).join('');
  return scroll(`<table>
<thead><tr><th>Position</th><th class="n">Now</th><th>Leaving</th><th class="n">Back</th><th class="n">Best back</th><th>Need</th><th></th></tr></thead>
<tbody>${body}</tbody></table>`);
}

function needsSection(season) {
  const teams = userTeams(season);
  if (!teams.length) return `<p class="muted">No user teams found. ${DASH}</p>`;
  return teams.map((t) => `<div class="needs">
  <h3>${esc(t.name)}</h3>
  ${needsTable(t, rosterNeeds(season, t.teamId))}
</div>`).join('');
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
  const uniq = (field) => [...new Set(rows.map((r) => r[field]).filter(Boolean))].sort();
  const opt = (v, label = v) => `<option value="${esc(v)}">${esc(label)}</option>`;
  const groups = POSITION_TARGETS.filter((t) => rows.some((r) => r.group === t.group));
  const hasAth = rows.some((r) => r.group === 'ATH');
  const first = rows.slice(0, PAGE_SIZE).map((r) => `<tr>
  <td></td><td class="n">${esc(r.rank)}</td><td>${esc(r.name)}</td><td>${stars(r.stars)}</td><td>${esc(r.position)}</td>
  <td class="n">${esc(r.positionRank)}</td><td>${esc(r.archetype)}</td><td class="n">${height(r.height)}</td><td class="n">${esc(r.weight)}</td>
  <td>${esc(r.hometown)}, ${esc(r.state)}</td><td class="n">${esc(r.stateRank)}</td><td>${esc(r.pipeline)}</td></tr>`).join('');
  const th = (label, sort, numeric) => `<th${numeric ? ' class="n"' : ''}><button type="button" class="sort" data-sort="${sort}">${label}</button></th>`;
  return `<form class="filters" id="prospect-filters">
  <label>Group <select id="f-group"><option value="">All</option>${groups.map((g) => opt(g.group, g.label)).join('')}${hasAth ? opt('ATH', 'Athlete') : ''}</select></label>
  <label>Position <select id="f-position"><option value="">All</option>${uniq('position').map((v) => opt(v)).join('')}</select></label>
  <label>Stars <select id="f-stars"><option value="0">Any</option><option value="5">5 only</option><option value="4">4 and up</option><option value="3">3 and up</option></select></label>
  <label>State <select id="f-state"><option value="">All</option>${uniq('state').map((v) => opt(v)).join('')}</select></label>
  <label>Pipeline <select id="f-pipeline"><option value="">All</option>${uniq('pipeline').map((v) => opt(v)).join('')}</select></label>
  <label>Archetype <select id="f-archetype"><option value="">All</option>${uniq('archetype').map((v) => opt(v)).join('')}</select></label>
  <label>Name <input id="f-name" type="search" placeholder="Search" autocomplete="off"></label>
  <label class="check"><input id="f-watch" type="checkbox"> Watchlist only</label>
  <button type="reset" id="f-reset">Clear filters</button>
</form>
<p class="muted small" id="prospect-count">Showing the top ${Math.min(PAGE_SIZE, rows.length)} of ${rows.length} prospects</p>
<p class="muted small">Star a prospect to add him to your watchlist. It is saved in this browser only, so each coach keeps his own.</p>
${scroll(`<table id="prospect-table">
<thead><tr><th><span class="sr">Watch</span></th>${th('Rank', 'rank', true)}<th>Name</th><th>Stars</th><th>Pos</th>${th('Pos rank', 'positionRank', true)}<th>Archetype</th>${th('Ht', 'height', true)}${th('Wt', 'weight', true)}<th>Hometown</th>${th('State rank', 'stateRank', true)}<th>Pipeline</th></tr></thead>
<tbody>${first}</tbody></table>`)}
<button type="button" id="prospect-more" hidden>Show more</button>`;
}

export function render(archive) {
  const season = archive.seasons?.[archive.current];
  const label = classRankingsLabel(season);
  const body = `<h1>Recruiting</h1>
<p class="note">The game shares class rankings and the prospect pool, but not ratings or dev traits for unsigned prospects, each coach's board, or where a prospect has committed.</p>
<section>
  <h2>Team needs</h2>
  <p class="muted small">Seniors are counted as leaving; early draft entries and transfers are not predicted. "Back" compares returning players with a typical depth for that position, which is this site's own yardstick.</p>
  ${needsSection(season)}
</section>
<section>
  <h2>Class rankings <span class="muted small">${label ? esc(label) : ''}</span></h2>
  ${classTable(classRankings(season))}
</section>
<section id="prospects">
  <h2>Prospects</h2>
  ${prospectSection(prospectRows(season))}
</section>`;
  return layout({ archive, active: 'recruiting', title: 'Recruiting', body, scripts: '<script src="recruits.js" defer></script>' });
}
