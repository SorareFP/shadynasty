// Shared HTML helpers: escaping, page shell, navigation.

import { userTeams, activeSeason } from './model.mjs';
import { DEFAULT_TEAM } from './config.mjs';

export const DASH = '—';

export function esc(value) {
  if (value === null || value === undefined || value === '') return DASH;
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function slug(name) {
  return String(name ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'team';
}

export const teamFile = (team) => `team-${slug(team.name)}.html`;
export const depthFile = (team) => `depth-${slug(team.name)}.html`;

export function navItems(archive) {
  const season = activeSeason(archive);
  const teams = userTeams(season);
  const mine = teams.find((t) => t.name === DEFAULT_TEAM) ?? teams[0];
  return [
    { key: 'home', label: 'Home', href: 'index.html' },
    ...userTeams(season).map((t) => ({ key: `team-${t.teamId}`, label: t.name, href: teamFile(t) })),
    { key: 'h2h', label: 'Head-to-head', href: 'head-to-head.html' },
    ...(mine ? [{ key: 'depth', label: 'Depth chart', href: depthFile(mine) }] : []),
    { key: 'recruiting', label: 'Recruiting', href: 'recruiting.html' },
    { key: 'history', label: 'History', href: 'history.html' },
  ];
}

export function formatDate(ms) {
  if (!ms) return null;
  return new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

export function num(value, digits = 0) {
  if (value === null || value === undefined || value === '') return DASH;
  const n = Number(value);
  if (!Number.isFinite(n)) return DASH;
  return Number.isInteger(n) ? String(n) : n.toFixed(digits || 1);
}

// Wraps a table so wide content scrolls inside it instead of the page.
export const scroll = (table) => `<div class="scroll">${table}</div>`;

export function layout({ archive, active, title, body, scripts = '' }) {
  const league = archive.league;
  const leagueName = league?.name ?? 'Dynasty';
  const stage = league?.stage;
  const when = stage ? `${esc(stage.year ?? archive.current)} · ${esc(stage.label)}` : '';
  const updated = formatDate(league?.stageObservedAt);
  const nav = navItems(archive)
    .map((n) => `<a href="${n.href}"${n.key === active ? ' aria-current="page"' : ''}>${esc(n.label)}</a>`)
    .join('');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} · ${esc(leagueName)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600&amp;family=Barlow+Condensed:wght@600;700&amp;display=swap">
<link rel="stylesheet" href="style.css">
</head>
<body>
<header class="top">
  <div class="wrap top-row">
    <a class="brand" href="index.html">${esc(leagueName)}</a>
    <span class="stage">${when}</span>
  </div>
  <nav class="wrap nav" aria-label="Pages">${nav}</nav>
</header>
<main class="wrap">
${body}
</main>
<footer class="wrap foot">
  <span>${updated ? `Updated ${esc(updated)}` : ''}</span>
  <span>Data from <a href="https://dynastyrewired.com/">Dynasty Rewired</a></span>
</footer>
${scripts}
</body>
</html>
`;
}
