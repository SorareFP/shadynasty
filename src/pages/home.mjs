import { esc, layout, scroll, teamFile, DASH } from '../html.mjs';
import { userTeams, teamSummary, top25 } from '../model.mjs';

export function gameLine(g) {
  if (!g) return DASH;
  const where = g.isHome ? 'vs' : 'at';
  if (g.status !== 'final') return `${where} ${esc(g.opponent)} <span class="muted">(${esc(g.week)})</span>`;
  return `<span class="res res-${g.result}">${esc(g.result)}</span> ${esc(g.teamScore)}–${esc(g.oppScore)} ${where} ${esc(g.opponent)}`;
}

function teamCard(season, team) {
  const s = teamSummary(season, team.teamId);
  return `<article class="card team-card">
  <header>
    <h2><a href="${teamFile(team)}">${esc(team.name)}</a></h2>
    <span class="rank">${s.rank ? `#${esc(s.rank)}` : 'Unranked'}</span>
  </header>
  <p class="record">${esc(team.record)} <span class="muted">(${esc(team.conferenceRecord)} ${esc(team.conference)})</span></p>
  <dl class="pairs">
    <dt>Last</dt><dd>${gameLine(s.last)}</dd>
    <dt>Next</dt><dd>${gameLine(s.next)}</dd>
    <dt>Ratings</dt><dd>${esc(team.overall)} OVR · ${esc(team.offense)} OFF · ${esc(team.defense)} DEF</dd>
  </dl>
</article>`;
}

function move(row) {
  if (row.previousRank == null || row.previousState === 'unranked') return '<span class="muted">new</span>';
  const d = row.previousRank - row.rank;
  if (d === 0) return `<span class="muted">${DASH}</span>`;
  return d > 0 ? `<span class="up">▲${d}</span>` : `<span class="down">▼${-d}</span>`;
}

function pollTable(poll) {
  if (!poll) return `<p class="muted">No poll has been released yet. ${DASH}</p>`;
  const rows = poll.rows.map((r) => `<tr${r.userControlled ? ' class="user"' : ''}>
  <td class="n">${esc(r.rank)}</td><td>${esc(r.school)}</td><td class="n">${esc(r.record)}</td><td class="n">${move(r)}</td></tr>`).join('');
  const others = poll.receivingVotes?.length
    ? `<p class="muted small">Also receiving votes: ${poll.receivingVotes.slice(0, 10).map((v) => `${esc(v.school)} ${esc(v.votes)}`).join(', ')}</p>`
    : '';
  return `${scroll(`<table>
<thead><tr><th class="n">Rank</th><th>School</th><th class="n">Record</th><th class="n">Move</th></tr></thead>
<tbody>${rows}</tbody></table>`)}${others}`;
}

export function render(archive) {
  const season = archive.seasons?.[archive.current];
  if (!season?.schedule) {
    return layout({
      archive, active: 'home', title: 'Home',
      body: '<h1>Home</h1><p>No data yet. The site fills in after the league\'s next advance is captured.</p>',
    });
  }
  const teams = userTeams(season);
  const poll = top25(season);
  const body = `<h1 class="sr">Home</h1>
<section class="cards">${teams.map((t) => teamCard(season, t)).join('') || `<p class="muted">No user teams found. ${DASH}</p>`}</section>
<section>
  <h2>Top 25 <span class="muted small">${poll ? `Media poll · ${esc(poll.label)}` : ''}</span></h2>
  ${pollTable(poll)}
</section>`;
  return layout({ archive, active: 'home', title: 'Home', body });
}
