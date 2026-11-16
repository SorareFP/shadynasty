import { esc, layout, scroll, num, DASH } from '../html.mjs';
import { champions, awardsBySeason, recordBook } from '../model.mjs';
import { LEADER_CATEGORIES } from '../statcodes.mjs';

function championsTable(rows) {
  if (!rows.length) return `<p class="muted">No champions recorded yet. ${DASH}</p>`;
  return scroll(`<table>
<thead><tr><th>Season</th><th>Champion</th><th class="n">Score</th><th>Runner-up</th><th>Coach</th></tr></thead>
<tbody>${rows.map((c) => `<tr${c.championUserControlled ? ' class="user"' : ''}>
  <td>${esc(c.year)}</td><td>${esc(c.champion)}</td><td class="n">${esc(c.championScore)}–${esc(c.runnerUpScore)}</td>
  <td>${esc(c.runnerUp)}</td><td>${esc(c.coach)}</td></tr>`).join('')}</tbody></table>`);
}

function recordTable(records, withOpponent) {
  const rows = LEADER_CATEGORIES.filter((c) => records[c.key]).map((c) => {
    const r = records[c.key];
    return `<tr><td>${esc(c.label)}</td><td class="n">${num(r.value)}</td><td>${esc(r.name)} <span class="muted">${esc(r.position)}</span></td>
  <td>${esc(r.team)}</td><td>${esc(r.season)}${withOpponent ? ` ${r.isHome ? 'vs' : 'at'} ${esc(r.opponent)}` : ''}</td></tr>`;
  });
  if (!rows.length) return `<p class="muted">No records yet. ${DASH}</p>`;
  return scroll(`<table>
<thead><tr><th>Record</th><th class="n">Mark</th><th>Player</th><th>Team</th><th>${withOpponent ? 'Game' : 'Season'}</th></tr></thead>
<tbody>${rows.join('')}</tbody></table>`);
}

function awardsSection(bySeason) {
  const years = Object.keys(bySeason).map(Number).sort((a, b) => b - a);
  if (!years.length) return `<p class="muted">No award winners recorded yet. ${DASH}</p>`;
  return years.map((y, i) => `<details${i === 0 ? ' open' : ''}>
  <summary>${esc(y)} awards</summary>
  ${scroll(`<table>
<thead><tr><th>Award</th><th>Winner</th><th>Pos</th><th>School</th></tr></thead>
<tbody>${bySeason[y].map((w) => `<tr${w.userControlled ? ' class="user"' : ''}>
  <td>${esc(w.award)}</td><td>${esc(w.winner)}</td><td>${esc(w.position)}</td><td>${esc(w.school)}</td></tr>`).join('')}</tbody></table>`)}
</details>`).join('');
}

export function render(archive) {
  const book = recordBook(archive);
  const tracked = Object.values(archive.seasons ?? {}).filter((s) => s.boxScores?.games?.length).map((s) => s.year);
  const from = tracked.length ? Math.min(...tracked) : null;
  const body = `<h1>History</h1>
<section>
  <h2>National champions</h2>
  ${championsTable(champions(archive))}
</section>
<section>
  <h2>Record book</h2>
  <p class="muted small">Records count user-team players in games you played${from ? `, starting with the ${esc(from)} season` : ''}. Earlier seasons were not captured.</p>
  <h3>Single game</h3>
  ${recordTable(book.singleGame, true)}
  <h3>Season</h3>
  ${recordTable(book.season, false)}
</section>
<section>
  <h2>Awards</h2>
  ${awardsSection(awardsBySeason(archive))}
</section>`;
  return layout({ archive, active: 'history', title: 'History', body });
}
