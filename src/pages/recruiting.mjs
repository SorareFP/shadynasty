import { esc, layout, scroll, num, DASH } from '../html.mjs';
import {
  classRankings, classRankingsLabel, prospects, userTeams, rosterNeeds, positionGroup, POSITION_TARGETS, activeSeason,
} from '../model.mjs';
import { SCHEMES, ROLES, rolesFor } from '../schemes.mjs';
import { FLAGS, RULES, flagsFor } from '../flags.mjs';

export const PAGE_SIZE = 100;

// The site owner's team. Team needs open on this team; a viewer can switch,
// and the choice is remembered in that viewer's browser.
export const DEFAULT_TEAM = 'Texas';

export function height(inches) {
  if (!inches) return DASH;
  return `${Math.floor(inches / 12)}'${inches % 12}"`;
}

export const stars = (n) => (n ? `${n}★` : DASH);

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
    roles: rolesFor(r),
    flags: flagsFor(r),
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
  <td><button type="button" class="link" data-group="${esc(r.group)}" title="Show ${esc(r.label.toLowerCase())} prospects on the board">${esc(r.label)}</button></td>
  <td class="names">${leaving}</td>
  <td class="n">${esc(r.returning)}${r.target ? ` <span class="muted">/ ${esc(r.target)}</span>` : ''}</td>
  <td class="n">${esc(r.bestReturning)}</td>
  <td><span class="need need-${r.need}">${NEED_LABEL[r.need]}</span></td>
  <td>${r.portalSpots ? `<span class="need need-portal">Save ${esc(r.portalSpots)}</span>` : ''}</td></tr>`;
  }).join('');
  const portal = rows.filter((r) => r.portalSpots);
  const total = portal.reduce((n, r) => n + r.portalSpots, 0);
  const advice = portal.length
    ? `<p class="note"><strong>Save ${total} spot${total === 1 ? '' : 's'} for the transfer portal:</strong> ${portal.map((r) => `${esc(r.portalSpots)} at ${esc(r.label.toLowerCase())} (${esc(r.topLeaving)} starter-level senior${r.topLeaving === 1 ? '' : 's'} leaving, ${esc(r.readyReturning)} of ${esc(r.starters)} starting spot${r.starters === 1 ? '' : 's'} covered)`).join('; ')}. A high school signee is unlikely to start there next season.</p>`
    : '';
  return advice + scroll(`<table class="compact">
<thead><tr><th>Position</th><th>Leaving</th><th class="n">Back</th><th class="n">Best</th><th>Need</th><th>Portal</th></tr></thead>
<tbody>${body}</tbody></table>`);
}

function needsSection(season) {
  const teams = userTeams(season);
  if (!teams.length) return `<p class="muted">No user teams found. ${DASH}</p>`;
  const chosen = (teams.find((t) => t.name === DEFAULT_TEAM) ?? teams[0]).teamId;
  const picker = teams.length > 1
    ? `<label class="team-pick">Team <select id="needs-team">${teams.map((t) => `<option value="${esc(t.teamId)}"${t.teamId === chosen ? ' selected' : ''}>${esc(t.name)}</option>`).join('')}<option value="all">All teams</option></select></label>`
    : '';
  return picker + teams.map((t) => `<div class="needs" data-team="${esc(t.teamId)}"${t.teamId === chosen ? '' : ' hidden'}>
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

const ROLE_BY_KEY = Object.fromEntries(ROLES.map((ro) => [ro.key, ro]));
const SCHEME_SHORT = { tite: 'Tite', raid: 'Raid', best: '' };

// Short labels such as "Tite Nose, Raid QB, S-tier" for the Fit column.
export function fitLabels(roles) {
  const labels = [...new Set((roles ?? []).map((k) => {
    const ro = ROLE_BY_KEY[k];
    return ro ? `${SCHEME_SHORT[ro.scheme] ?? ''} ${ro.short}`.trim() : null;
  }).filter(Boolean))];
  return labels.length ? esc(labels.join(', ')) : '';
}

const FLAG_BY_KEY = Object.fromEntries(FLAGS.map((fl) => [fl.key, fl]));

export function flagLabels(flags) {
  const labels = (flags ?? []).map((k) => FLAG_BY_KEY[k]?.label).filter(Boolean);
  return labels.length ? esc(labels.join(', ')) : '';
}

function rulesSection() {
  return RULES.map((rule) => `<details>
  <summary>${esc(rule.title)}</summary>
  <ul class="rules">${rule.points.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>
  <p class="muted small source">Based on <a href="${rule.source.url}">${esc(rule.source.label)}</a>.</p>
</details>`).join('');
}

function schemeSection() {
  return SCHEMES.map((sc, i) => `<details${i === 0 ? ' open' : ''}>
  <summary>${esc(sc.label)}</summary>
  ${scroll(`<table class="compact">
<thead><tr><th>Role</th><th>Who to target</th></tr></thead>
<tbody>${sc.roles.map((ro) => `<tr><td class="names"><button type="button" class="link" data-role="${esc(ro.key)}" title="Show prospects who fit this role on the board">${esc(ro.label)}</button></td><td class="names">${esc(ro.want)}</td></tr>`).join('')}</tbody></table>`)}
  ${sc.note ? `<p class="muted small pad">${esc(sc.note)}</p>` : ''}
  <p class="muted small source">Based on <a href="${sc.source.url}">${esc(sc.source.label)}</a>.</p>
</details>`).join('');
}

function pipelineEditor(rows) {
  const regions = [...new Set(rows.map((r) => r.pipeline).filter(Boolean))].sort();
  if (!regions.length) return '';
  return `<details id="pipeline-editor">
  <summary>My pipelines</summary>
  <p class="muted small pad">Set your tier for each region as the game shows it on your coach screen (5 is strongest). It is saved in this browser only. The board then shows your tier beside each prospect, and can sort by it or hide everyone else.</p>
  <div class="pipe-grid">${regions.map((p, i) => `<label>${esc(p)} <select data-pipeline="${esc(p)}" id="pipe-${i}"><option value="0">None</option><option>1</option><option>2</option><option>3</option><option>4</option><option>5</option></select></label>`).join('')}</div>
  <p class="pad"><button type="button" id="pipe-clear">Clear my pipelines</button></p>
</details>`;
}

function prospectSection(rows) {
  if (!rows.length) return `<p class="muted">No prospect list captured yet. ${DASH}</p>`;
  const uniq = (field) => [...new Set(rows.map((r) => r[field]).filter(Boolean))].sort();
  const opt = (v, label = v) => `<option value="${esc(v)}">${esc(label)}</option>`;
  const groups = POSITION_TARGETS.filter((t) => rows.some((r) => r.group === t.group));
  const hasAth = rows.some((r) => r.group === 'ATH');
  const first = rows.slice(0, PAGE_SIZE).map((r) => `<tr>
  <td></td><td class="n">${esc(r.rank)}</td><td>${esc(r.name)}</td><td class="n">${stars(r.stars)}</td><td>${esc(r.position)}</td>
  <td class="n">${esc(r.positionRank)}</td><td>${esc(r.archetype)}</td><td class="n">${height(r.height)}</td><td class="n">${esc(r.weight)}</td>
  <td>${esc(r.hometown)}, ${esc(r.state)}</td><td class="n">${esc(r.stateRank)}</td><td>${esc(r.pipeline)}</td><td>${fitLabels(r.roles)}</td><td>${flagLabels(r.flags)}</td></tr>`).join('');
  const th = (label, sort, numeric) => `<th${numeric ? ' class="n"' : ''}><button type="button" class="sort" data-sort="${sort}">${label}</button></th>`;
  return `<form class="filters" id="prospect-filters">
  <label>Group <select id="f-group"><option value="">All</option>${groups.map((g) => opt(g.group, g.label)).join('')}${hasAth ? opt('ATH', 'Athlete') : ''}</select></label>
  <label>Position <select id="f-position"><option value="">All</option>${uniq('position').map((v) => opt(v)).join('')}</select></label>
  <label>Stars <select id="f-stars"><option value="0">Any</option><option value="5">5 only</option><option value="4">4 and up</option><option value="3">3 and up</option></select></label>
  <label>State <select id="f-state"><option value="">All</option>${uniq('state').map((v) => opt(v)).join('')}</select></label>
  <label>Pipeline <select id="f-pipeline"><option value="">All</option>${uniq('pipeline').map((v) => opt(v)).join('')}</select></label>
  <label>Archetype <select id="f-archetype"><option value="">All</option>${uniq('archetype').map((v) => opt(v)).join('')}</select></label>
  <label>Scheme fit <select id="f-role"><option value="">Any</option>${SCHEMES.map((sc) => `<optgroup label="${esc(sc.label)}"><option value="scheme:${sc.key}">Any ${esc(sc.label)} role</option>${sc.roles.map((ro) => `<option value="${esc(ro.key)}" data-short="${esc(ro.short)}">${esc(ro.label)}</option>`).join('')}</optgroup>`).join('')}</select></label>
  <label>Notes <select id="f-flag"><option value="">Any</option>${FLAGS.map((fl) => `<option value="${esc(fl.key)}" title="${esc(fl.detail)}">${esc(fl.label)}</option>`).join('')}</select></label>
  <label>Name <input id="f-name" type="search" placeholder="Search" autocomplete="off"></label>
  <label class="check"><input id="f-watch" type="checkbox"> Watchlist only</label>
  <label class="check"><input id="f-mypipe" type="checkbox"> My pipelines only</label>
  <button type="reset" id="f-reset">Clear filters</button>
</form>
<p class="muted small" id="prospect-count">Showing the top ${Math.min(PAGE_SIZE, rows.length)} of ${rows.length} prospects</p>
${pipelineEditor(rows)}
<details class="legend">
  <summary>What the notes mean</summary>
  <dl class="pairs pad">${FLAGS.map((fl) => `<dt>${esc(fl.label)}</dt><dd>${esc(fl.detail)}</dd>`).join('')}</dl>
</details>
<p class="muted small">Star a prospect to add him to your watchlist. It is saved in this browser only, so each coach keeps his own.</p>
${scroll(`<table id="prospect-table">
<thead><tr><th><span class="sr">Watch</span></th>${th('Rank', 'rank', true)}<th>Name</th><th class="n">Stars</th><th>Pos</th>${th('Pos rank', 'positionRank', true)}<th>Archetype</th>${th('Ht', 'height', true)}${th('Wt', 'weight', true)}<th>Hometown</th>${th('State rank', 'stateRank', true)}${th('Pipeline', 'pipeTier', false)}<th>Fit</th><th>Notes</th></tr></thead>
<tbody>${first}</tbody></table>`)}
<button type="button" id="prospect-more" hidden>Show more</button>`;
}

export function render(archive) {
  const season = activeSeason(archive);
  const label = classRankingsLabel(season);
  const body = `<h1>Recruiting</h1>
<p class="note">The game shares class rankings and the prospect pool, but not ratings or dev traits for unsigned prospects, each coach's board, or where a prospect has committed.</p>
<div class="hub">
<div class="hub-main">
<section id="prospects">
  <h2>Prospects</h2>
  ${prospectSection(prospectRows(season))}
</section>
<section>
  <h2>Class rankings <span class="muted small">${label ? esc(label) : ''}</span></h2>
  ${classTable(classRankings(season))}
</section>
<section class="quiet">
  <h2>Recruiting rules of thumb</h2>
  <p class="muted small">Background for the Fit and Notes columns: findings from Dominate CFB Dynasty's testing, in short. The odds are theirs.</p>
  ${rulesSection()}
</section>
</div>
<aside class="hub-side" aria-label="Team needs and scheme targets">
<section>
  <h2>Team needs</h2>
  ${needsSection(season)}
  <p class="muted small">Click a position to see its prospects. Seniors count as leaving; early draft entries and transfers are not predicted. "Back" is returning players against a typical depth, and "Best" is the top returner's overall; both yardsticks are this site's own. A portal spot is suggested where a senior rated 88 or better leaves and no returner rated 84 or better can take the job.</p>
</section>
<section>
  <h2>Scheme targets</h2>
  ${schemeSection()}
  <p class="muted small">Click a role to see who fits it by position, archetype and size. Ratings and dev traits stay hidden until you scout in the game.</p>
</section>
</aside>
</div>`;
  return layout({ archive, active: 'recruiting', title: 'Recruiting', body, scripts: '<script src="recruits.js" defer></script>' });
}
