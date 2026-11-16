import { esc, layout, scroll, num, DASH } from '../html.mjs';
import { teamSummary, seasonLeaders, activeSeason } from '../model.mjs';
import { LEADER_CATEGORIES, DEV_TRAITS } from '../statcodes.mjs';

function scheduleTable(games) {
  if (!games.length) return `<p class="muted">No games on the schedule. ${DASH}</p>`;
  const rows = games.map((g) => {
    const final = g.status === 'final';
    return `<tr${g.opponentUser ? ' class="user"' : ''}>
  <td>${esc(g.week)}</td>
  <td>${g.isHome ? 'vs' : 'at'} ${esc(g.opponent)}</td>
  <td class="n">${final ? `<span class="res res-${g.result}">${esc(g.result)}</span> ${esc(g.teamScore)}–${esc(g.oppScore)}` : DASH}</td></tr>`;
  }).join('');
  return scroll(`<table>
<thead><tr><th>Week</th><th>Opponent</th><th class="n">Result</th></tr></thead>
<tbody>${rows}</tbody></table>`);
}

function leadersGrid(leaders) {
  const blocks = LEADER_CATEGORIES.filter((c) => leaders[c.key].length).map((c) => `<div class="leader">
  <h3>${esc(c.label)}</h3>
  <ol>${leaders[c.key].map((r) => `<li><span>${esc(r.name)} <span class="muted">${esc(r.position)}</span></span><span class="n">${num(r.value)}</span></li>`).join('')}</ol>
</div>`);
  if (!blocks.length) return `<p class="muted">No box scores captured yet. ${DASH}</p>`;
  return `<div class="leaders">${blocks.join('')}</div>`;
}

function rosterTable(roster) {
  const players = [...(roster?.players ?? [])].sort((a, b) => (b.overall ?? 0) - (a.overall ?? 0));
  if (!players.length) return `<p class="muted">No roster captured yet. ${DASH}</p>`;
  const rows = players.map((p) => `<tr>
  <td class="n">${esc(p.jersey)}</td><td>${esc(p.name)}</td><td>${esc(p.position)}</td><td>${esc(p.year)}</td>
  <td class="n">${esc(p.overall)}</td><td>${esc(DEV_TRAITS[p.devTraitId])}</td></tr>`).join('');
  return scroll(`<table>
<thead><tr><th class="n">#</th><th>Player</th><th>Pos</th><th>Year</th><th class="n">OVR</th><th>Dev trait</th></tr></thead>
<tbody>${rows}</tbody></table>`);
}

export function render(archive, teamId) {
  const season = activeSeason(archive);
  const s = teamSummary(season, teamId);
  const team = s.team ?? { name: 'Team' };
  const body = `<header class="page-head">
  <h1>${esc(team.name)}</h1>
  <p class="record">${esc(team.record)} <span class="muted">(${esc(team.conferenceRecord)} ${esc(team.conference)})</span>
  · ${s.rank ? `#${esc(s.rank)}` : 'Unranked'}
  · ${esc(team.overall)} OVR · ${esc(team.offense)} OFF · ${esc(team.defense)} DEF</p>
</header>
<section>
  <h2>Schedule</h2>
  ${scheduleTable(s.games)}
</section>
<section>
  <h2>Season leaders</h2>
  <p class="muted small">Totals come from the games you played yourselves; simulated games are not captured.</p>
  ${leadersGrid(seasonLeaders(season, teamId))}
</section>
<section>
  <h2>Roster</h2>
  ${rosterTable(season?.rosters?.[teamId])}
</section>`;
  return layout({ archive, active: `team-${teamId}`, title: team.name, body });
}
