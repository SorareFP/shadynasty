import { esc, layout, scroll, num, depthFile, DASH } from '../html.mjs';
import { userTeams, activeSeason } from '../model.mjs';
import { depthChart } from '../depth.mjs';

function playerCell(p) {
  if (!p) return `<td class="names muted">${DASH}</td>`;
  const keys = p.keys.map((k) => `${esc(k.label)} ${esc(k.value)}`).join(' · ');
  const abilities = p.abilities.length ? `<br><span class="muted small">${esc(p.abilities.join(', '))}</span>` : '';
  return `<td class="names${p.leaving ? ' leaving' : ''}">
  <strong>${esc(p.name)}</strong> <span class="muted">${esc(p.position)} · ${esc(p.year)} · ${esc(p.overall)} OVR</span>
  <span class="fit-score" title="How well his ratings suit this spot">${num(p.score, 1)}</span>
  <br><span class="muted small">${keys}</span>${abilities}</td>`;
}

function sideTable(slots) {
  const strings = Math.max(1, ...slots.map((s) => s.players.length));
  const heads = ['Starter', 'Backup', 'Third'].slice(0, Math.max(2, strings));
  return scroll(`<table class="compact depth">
<thead><tr><th>Spot</th>${heads.map((h) => `<th>${h}</th>`).join('')}<th>What the spot needs</th></tr></thead>
<tbody>${slots.map((s) => `<tr>
  <td class="names"><strong>${esc(s.label)}</strong></td>
  ${heads.map((_, i) => playerCell(s.players[i])).join('')}
  <td class="names muted">${esc(s.want)}</td></tr>`).join('')}</tbody></table>`);
}

const LINEUP_NOTES = [
  'Receivers: in the game\'s depth chart, put the X at receiver 1 and the Z at receiver 2, then the Y first and the H second at slot receiver.',
  'Defensive line: set tackle and end substitutions to keep fresh and rotate all of them; the nose and both interior tackles take double teams every play.',
  'Edges: in every 3-3-5 and 3-4 formation, switch the package to SAM/WILL Edge so your two thumping linebackers line up on the ball and the Mikes play behind them.',
  'Sub linebackers: whoever comes in for nickel should be your best coverage linebackers.',
  'Slot corner: only matters if you blitz from the slot; otherwise your third corner plays there.',
];

export function render(archive, teamId) {
  const season = activeSeason(archive);
  const teams = userTeams(season);
  const team = teams.find((t) => t.teamId === teamId) ?? { name: 'Team' };
  const roster = season?.rosters?.[teamId];
  const chart = depthChart(roster);
  const side = (name) => chart.slots.filter((s) => s.side === name);
  const others = teams.filter((t) => t.teamId !== teamId);
  const leaving = chart.slots.flatMap((s) => s.players.slice(0, 1)).filter((p) => p.leaving).length;

  const body = roster?.players?.length
    ? `<header class="page-head">
  <h1>Depth chart: ${esc(team.name)}</h1>
  ${others.length ? `<p class="muted small">Other teams: ${others.map((t) => `<a href="${depthFile(t)}">${esc(t.name)}</a>`).join(', ')}</p>` : ''}
</header>
<p class="note">A recommended lineup for the Air Raid offense and the 3-3-5 Tite defense, worked out from each player's ratings. The site cannot see the depth chart you have set in the game, so this is who should play where, not who does.</p>
<p class="muted small">The number in the box is how well a player's ratings suit that spot (99 is best), using the ratings each scheme's video says matter there. Nobody is listed twice: once a player takes a spot, the next best man fills the others. Shaded players are seniors${leaving ? `; ${leaving} of your starters here leave after this season` : ''}.</p>
<section>
  <h2>Offense <span class="muted small">Air Raid</span></h2>
  ${sideTable(side('offense'))}
</section>
<section>
  <h2>Defense <span class="muted small">3-3-5 Tite</span></h2>
  ${sideTable(side('defense'))}
</section>
<section>
  <h2>Specialists</h2>
  ${sideTable(side('special'))}
</section>
<section class="quiet">
  <h2>Setting it up in the game</h2>
  <ul class="rules">${LINEUP_NOTES.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>
  <p class="muted small">From <a href="https://www.youtube.com/watch?v=PckbWSx28mM">Coach TWILL's Air Raid recruiting guide</a> and <a href="https://www.youtube.com/watch?v=W1p9CemZ09I">Mills' 3-3-5 Tite masterclass</a>. The rating weights behind each spot are this site's own reading of their advice.</p>
</section>`
    : `<h1>Depth chart: ${esc(team.name)}</h1><p class="muted">No roster captured for ${esc(team.name)} yet. ${DASH}</p>`;
  return layout({ archive, active: 'depth', title: `Depth chart: ${team.name}`, body });
}
