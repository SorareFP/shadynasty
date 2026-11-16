import { esc, layout, scroll, DASH } from '../html.mjs';
import { headToHead } from '../model.mjs';

function coachCard(c, seriesWins) {
  const playoff = c.playoffWins == null ? DASH : `${esc(c.playoffWins)}-${esc(c.playoffLosses)}`;
  return `<article class="card coach">
  <h2>${esc(c.name)}</h2>
  <p class="muted">${esc(c.school)}</p>
  <dl class="pairs">
    <dt>Career</dt><dd>${esc(c.wins)}-${esc(c.losses)}</dd>
    <dt>Bowls</dt><dd>${esc(c.bowlRecord)}</dd>
    <dt>Playoff</dt><dd>${playoff}</dd>
    <dt>National titles</dt><dd>${esc(c.titles)}</dd>
    <dt>Series wins</dt><dd>${esc(seriesWins)}</dd>
  </dl>
</article>`;
}

export function render(archive) {
  const h = headToHead(archive);
  const winsBySchool = {};
  for (const m of h.meetings) if (m.winner) winsBySchool[m.winner] = (winsBySchool[m.winner] ?? 0) + 1;

  const cards = h.coaches.length
    ? h.coaches.map((c) => coachCard(c, winsBySchool[c.school] ?? 0)).join('')
    : `<p class="muted">No coach records captured yet. ${DASH}</p>`;

  const firstYear = Math.min(...Object.values(archive.seasons ?? {}).filter((s) => s.schedule).map((s) => s.year));
  const since = Number.isFinite(firstYear) ? ` Game results are tracked from ${esc(firstYear)} on.` : '';
  const meetings = h.meetings.length
    ? scroll(`<table>
<thead><tr><th>Season</th><th>Week</th><th>Away</th><th class="n"></th><th>Home</th><th class="n"></th></tr></thead>
<tbody>${[...h.meetings].reverse().map((m) => `<tr>
  <td>${esc(m.season)}</td><td>${esc(m.week)}</td>
  <td${m.winner === m.awayName ? ' class="win"' : ''}>${esc(m.awayName)}</td><td class="n">${esc(m.awayScore)}</td>
  <td${m.winner === m.homeName ? ' class="win"' : ''}>${esc(m.homeName)}</td><td class="n">${esc(m.homeScore)}</td></tr>`).join('')}</tbody></table>`)
    : `<p class="muted">You have not played each other yet.${since}</p>`;

  const body = `<h1>Head-to-head</h1>
<section class="cards">${cards}</section>
<section>
  <h2>Meetings</h2>
  ${meetings}
</section>`;
  return layout({ archive, active: 'h2h', title: 'Head-to-head', body });
}
