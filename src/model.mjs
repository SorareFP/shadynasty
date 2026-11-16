// Pure functions that turn archived API data into what the pages show.

import { LEADER_CATEGORIES } from './statcodes.mjs';

const LEADERS_SHOWN = 5;

export function userTeams(season) {
  return (season?.schedule?.teams ?? []).filter((t) => t.userControlled);
}

function teamGames(season, teamId) {
  const out = [];
  for (const week of season?.schedule?.weeks ?? []) {
    for (const g of week.games ?? []) {
      const isHome = g.homeTeamId === teamId;
      if (!isHome && g.awayTeamId !== teamId) continue;
      const final = g.status === 'final';
      const teamScore = isHome ? g.homeScore : g.awayScore;
      const oppScore = isHome ? g.awayScore : g.homeScore;
      out.push({
        gameId: g.gameId,
        week: week.label,
        status: g.status,
        isHome,
        opponent: isHome ? g.awayName : g.homeName,
        opponentUser: Boolean(isHome ? g.awayUserControlled : g.homeUserControlled),
        teamScore,
        oppScore,
        result: !final || teamScore == null || oppScore == null ? null
          : teamScore > oppScore ? 'W' : teamScore < oppScore ? 'L' : 'T',
      });
    }
  }
  return out;
}

function latestPoll(season, name) {
  let best = null;
  for (const week of season?.rankings?.weeks ?? []) {
    for (const poll of week.polls ?? []) {
      if (poll.poll !== name || poll.state !== 'available' || !poll.rows?.length) continue;
      if (!best || (poll.capturedAt ?? 0) >= (best.poll.capturedAt ?? 0)) best = { week, poll };
    }
  }
  return best;
}

export function top25(season, name = 'media') {
  const found = latestPoll(season, name);
  if (!found) return null;
  return {
    poll: name,
    label: found.week.stage?.label ?? '',
    rows: found.poll.rows,
    receivingVotes: found.poll.receivingVotes ?? [],
  };
}

export function teamSummary(season, teamId) {
  const team = (season?.schedule?.teams ?? []).find((t) => t.teamId === teamId) ?? null;
  const games = teamGames(season, teamId);
  const finals = games.filter((g) => g.status === 'final');
  const poll = latestPoll(season, 'media');
  const row = poll?.poll.rows.find((r) => r.teamId === teamId);
  return {
    team,
    games,
    last: finals.at(-1) ?? null,
    next: games.find((g) => g.status !== 'final') ?? null,
    rank: row?.rank ?? null,
  };
}

// Per-player season totals for one team, keyed by basePlayerId (the roster id).
function playerTotals(season, teamId) {
  const totals = new Map();
  for (const g of season?.boxScores?.games ?? []) {
    for (const p of g.players ?? []) {
      if (p.teamId !== teamId) continue;
      const key = p.basePlayerId ?? p.playerId;
      let t = totals.get(key);
      if (!t) {
        t = { name: p.name, position: p.position, games: 0, stats: {} };
        totals.set(key, t);
      }
      t.games += 1;
      for (const c of LEADER_CATEGORIES) t.stats[c.code] = (t.stats[c.code] ?? 0) + (p.stats?.[c.code] ?? 0);
    }
  }
  return [...totals.values()];
}

export function seasonLeaders(season, teamId) {
  const totals = playerTotals(season, teamId);
  const out = {};
  for (const c of LEADER_CATEGORIES) {
    out[c.key] = totals
      .filter((t) => t.stats[c.code] > 0)
      .sort((a, b) => b.stats[c.code] - a.stats[c.code])
      .slice(0, LEADERS_SHOWN)
      .map((t) => ({ name: t.name, position: t.position, value: t.stats[c.code], games: t.games }));
  }
  return out;
}

function seasonList(archive) {
  return Object.values(archive?.seasons ?? {}).sort((a, b) => a.year - b.year);
}

export function champions(archive) {
  const byYear = new Map();
  for (const s of seasonList(archive)) {
    for (const c of s.postseason?.championships ?? []) byYear.set(c.year, c);
  }
  return [...byYear.values()].sort((a, b) => b.year - a.year);
}

export function headToHead(archive) {
  const current = archive?.seasons?.[archive.current];
  const titles = {};
  for (const c of champions(archive)) if (c.coach) titles[c.coach] = (titles[c.coach] ?? 0) + 1;

  const coaches = (current?.coaches?.active ?? [])
    .filter((c) => c.userControlled && c.role === 'HC')
    .map((c) => ({
      name: c.name,
      school: c.school,
      teamId: c.teamId,
      wins: c.wins,
      losses: c.losses,
      bowlRecord: c.bowlRecord ?? null,
      playoffWins: c.playoffWins ?? null,
      playoffLosses: c.playoffLosses ?? null,
      titles: titles[c.name] ?? 0,
    }));

  const meetings = [];
  for (const s of seasonList(archive)) {
    for (const week of s.schedule?.weeks ?? []) {
      for (const g of week.games ?? []) {
        if (!(g.awayUserControlled && g.homeUserControlled) || g.status !== 'final') continue;
        meetings.push({
          season: s.year,
          week: week.label,
          awayName: g.awayName,
          awayScore: g.awayScore,
          homeName: g.homeName,
          homeScore: g.homeScore,
          winner: g.awayScore > g.homeScore ? g.awayName : g.homeScore > g.awayScore ? g.homeName : null,
        });
      }
    }
  }
  return { coaches, meetings };
}

function latestCapture(season, dataset, has) {
  return (season?.recruiting?.captures ?? [])
    .filter((c) => c.dataset === dataset && has(c))
    .sort((a, b) => (a.capturedAt ?? 0) - (b.capturedAt ?? 0))
    .at(-1) ?? null;
}

export function classRankings(season) {
  const cap = latestCapture(season, 'top_classes', (c) => c.classes?.length);
  if (!cap) return [];
  const users = new Set(userTeams(season).map((t) => t.teamId));
  return [...cap.classes]
    .sort((a, b) => a.rank - b.rank)
    .map((c) => ({ ...c, isUser: users.has(c.teamId) }));
}

export function classRankingsLabel(season) {
  return latestCapture(season, 'top_classes', (c) => c.classes?.length)?.stage?.label ?? null;
}

export function prospects(season) {
  return latestCapture(season, 'all_recruits', (c) => c.recruits?.length)?.recruits ?? [];
}

export function awardsBySeason(archive) {
  const out = {};
  for (const s of seasonList(archive)) {
    if (s.awards?.winners?.length) out[s.year] = s.awards.winners;
  }
  return out;
}

export function recordBook(archive) {
  const singleGame = {};
  const season = {};
  for (const c of LEADER_CATEGORIES) {
    singleGame[c.key] = null;
    season[c.key] = null;
  }
  for (const s of seasonList(archive)) {
    const teams = userTeams(s);
    for (const team of teams) {
      for (const g of s.boxScores?.games ?? []) {
        const meta = g.game ?? {};
        const isHome = meta.homeTeamId === team.teamId;
        if (!isHome && meta.awayTeamId !== team.teamId) continue;
        for (const p of g.players ?? []) {
          if (p.teamId !== team.teamId) continue;
          for (const c of LEADER_CATEGORIES) {
            const value = p.stats?.[c.code] ?? 0;
            if (value > 0 && value > (singleGame[c.key]?.value ?? 0)) {
              singleGame[c.key] = {
                name: p.name, position: p.position, team: team.name, season: s.year, value,
                opponent: isHome ? meta.awayName : meta.homeName, isHome,
              };
            }
          }
        }
      }
      const leaders = seasonLeaders(s, team.teamId);
      for (const c of LEADER_CATEGORIES) {
        const top = leaders[c.key][0];
        if (top && top.value > (season[c.key]?.value ?? 0)) {
          season[c.key] = { name: top.name, position: top.position, team: team.name, season: s.year, value: top.value };
        }
      }
    }
  }
  return { singleGame, season };
}
