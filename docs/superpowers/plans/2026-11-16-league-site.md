# Shadynasty 2.1 League Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A self-updating static website showing the Shadynasty 2.1 dynasty's status, user-team stats, recruiting and history, built from Dynasty Rewired's API.

**Architecture:** A Node sync script pulls the league's datasets and archives them as JSON in the repository. A build script turns the archive into plain HTML pages. A scheduled GitHub Actions job runs both hourly and publishes to GitHub Pages.

**Tech Stack:** Node 24 (ES modules, built-in `fetch` and `node:test`), no npm dependencies, plain HTML/CSS, one small browser script, GitHub Actions, GitHub Pages.

**Spec:** `docs/design.md`

## Global Constraints

- API base: `https://dynastyrewired.com/api/developer/v1`; league id `cfb27-738435`; auth header `Authorization: Bearer <token>`.
- Token is read only from env var `DR_API_TOKEN` (locally loaded from `.env`). It must never be written to `data/`, `site/`, logs or git. `.env` is git-ignored.
- Limits: 60 requests/minute, 2,000/day. A no-change run makes exactly 1 request.
- No npm dependencies. No framework.
- Archive lives in `data/league.json` and `data/<season>/<dataset>.json`, committed to git. Pages are built from the archive only, never from live API calls.
- User teams are derived from data (`userControlled` on schedule teams, matched by `teamId`), never hard-coded. Today they are Clemson (`829161493`) and Texas (`829161584`).
- Roster `playerId` equals box-score `basePlayerId`; box-score `playerId` is a different id. Join on `basePlayerId`.
- Pages must be readable at phone width and in light and dark mode.
- No recruiting actions, no written news stories, no CPU-player stats.

## Review Focus

1. API returns 402, 5xx or times out: archive and published site stay untouched, the run exits non-zero. (Task 1)
2. A dataset that previously had data comes back empty, `unavailable` or `pending`: the archived copy is kept, not overwritten. (Task 1)
3. Offseason or early-season state (no next game, awards pending, playoff poll `not_released`, zero box scores): every page renders, showing "—" where data is missing. (Task 3)
4. Names containing `&`, `'`, `<` or `.` (Texas A&M, Hogg McDoggnald Jr.): escaped in HTML, intact in display. (Task 3)
5. A user coach changes school or the season rolls over to 2038: pages follow the new user teams, and 2037 remains in History and the record book. (Tasks 2 and 3)

## File Structure

| File | Responsibility |
|---|---|
| `scripts/api.mjs` | HTTP client: auth, errors, box-score pagination |
| `scripts/sync.mjs` | Change detection, fetching, merging into the archive |
| `src/archive.mjs` | Read the archive from disk into one object |
| `src/statcodes.mjs` | EA stat code → label, and leader categories |
| `src/model.mjs` | Pure functions turning archive data into page data |
| `src/html.mjs` | `esc()`, page layout, nav |
| `src/pages/{home,team,h2h,recruiting,history}.mjs` | One renderer per page |
| `scripts/build.mjs` | Archive → `site/` |
| `assets/style.css`, `assets/recruits.js` | Styling; prospect filter |
| `.github/workflows/update.yml` | Hourly sync, build, commit, deploy |
| `test/*.test.mjs`, `test/fixtures/` | Tests and trimmed real samples |

---

### Task 1: API client and archive sync

**Files:**
- Create: `package.json` (`"type": "module"`, scripts `test`: `node --test`, `sync`, `build`), `.gitignore` (`.env`, `site/`, `node_modules/`), `scripts/api.mjs`, `scripts/sync.mjs`
- Test: `test/api.test.mjs`, `test/sync.test.mjs`
- Move: existing exploratory `data/*.json` → `test/fixtures/` (trim box scores to 2 games, recruits to 50, schedule teams to 10 including both user teams); delete the rest of `data/`.

**Interfaces:**
- Produces:
  - `class ApiError extends Error { status: number }`
  - `createClient({ token, fetchImpl = fetch, base }) → { get(path, params?) → Promise<object>, getAllBoxScores(league, season) → Promise<object[]> }`
  - `sync({ client, league, dataDir, rosterTeamIds? }) → Promise<{ changed: boolean, season: number }>`
  - Archive layout: `data/league.json` (the `GET /leagues/{league}` `data` object) and `data/<season>/{schedule,box-scores,rankings,postseason,recruiting,coaches,awards}.json` plus `data/<season>/rosters/<teamId>.json`. Each file holds the response's `data` object; `box-scores.json` holds `{ games: [...] }`.

- [ ] **Step 1: Write failing tests for the client** in `test/api.test.mjs`, using an injected fake `fetchImpl`:
  - `sends bearer token`: request header `authorization` equals `Bearer drk_test`.
  - `throws ApiError with status on 402`: `await assert.rejects(client.get('/leagues'), e => e instanceof ApiError && e.status === 402)`.
  - `error message never contains the token`.
  - `getAllBoxScores follows next cursor`: fake returns `{data:{games:[a],next:'c1'}}` then `{data:{games:[b],next:null}}`; result is `[a, b]`, and the second request has `after=c1`.
- [ ] **Step 2: Run `node --test test/api.test.mjs`** — expected: fails, module not found.
- [ ] **Step 3: Implement `scripts/api.mjs`.** 20-second timeout via `AbortSignal.timeout`.
- [ ] **Step 4: Run the tests** — expected: pass.
- [ ] **Step 5: Write failing tests for sync** in `test/sync.test.mjs`, using a fake client and a temp directory:
  - `first run writes every dataset` and returns `{ changed: true, season: 2037 }`.
  - `unchanged stage makes one request and writes nothing`: change key is `stage.key` + `stageObservedAt` from `GET /leagues/{league}` compared to `data/league.json`.
  - `box scores merge by gameId`: archive has games A and B, API returns B' and C → archive has A, B', C.
  - `empty or unavailable dataset does not overwrite`: archived schedule with weeks is kept when the API returns `state: "unavailable"`; same for awards `pending` with zero winners and recruiting with zero captures.
  - `ApiError mid-run leaves the archive byte-identical` (fetch everything into memory first, write only after all succeed; `league.json` is written last).
  - `roster team ids default to the schedule's userControlled teams`.
- [ ] **Step 6: Run** — expected: fail.
- [ ] **Step 7: Implement `scripts/sync.mjs`.** When run as a script it loads `.env` if present, calls `sync`, prints `changed` or `no change`, and exits 1 on any error.
- [ ] **Step 8: Run all tests** — expected: pass.
- [ ] **Step 9: Run `node scripts/sync.mjs` for real** — expected: `changed`, and `data/2037/` holds 7 dataset files plus 2 rosters. Run it again — expected: `no change`.
- [ ] **Step 10: `git init`, commit** (`feat: api client and archive sync`). Confirm `git status` does not list `.env`.

### Task 2: Model and stat codes

**Files:**
- Create: `src/archive.mjs`, `src/statcodes.mjs`, `src/model.mjs`
- Test: `test/model.test.mjs`

**Interfaces:**
- Consumes: archive layout from Task 1.
- Produces:
  - `loadArchive(dataDir) → { league, seasons: { [year]: { schedule, boxScores, rankings, postseason, recruiting, coaches, awards, rosters: { [teamId]: roster } } }, current: number }` — missing files become `null`.
  - `STAT_LABELS: { [code]: string }` and `LEADER_CATEGORIES: [{ key, label, code, min? }]` for passing yards, passing TDs, rushing yards, rushing TDs, receptions, receiving yards, receiving TDs, tackles, sacks, interceptions, field goals made. Codes come from `https://dynastyrewired.com/developer/data` (fetch it during this task; `PSPY` passing yards is confirmed). Any code not found there is left out rather than guessed.
  - `userTeams(season) → team[]` (schedule teams with `userControlled`)
  - `teamSummary(season, teamId) → { team, rank|null, last|null, next|null, games[] }` — `rank` from the latest available media poll.
  - `top25(season) → { label, rows[] } | null`
  - `seasonLeaders(season, teamId) → { [categoryKey]: [{ name, position, value }] }` — sums box-score player stats by `basePlayerId`, top 5 per category, zero totals dropped.
  - `headToHead(archive) → { coaches: [{ name, school, wins, losses, bowlRecord, playoffWins, playoffLosses, titles }], meetings: [{ season, week, awayName, awayScore, homeName, homeScore }] }` — titles counted from `postseason.championships[].coach`.
  - `classRankings(season) → rows[]` with `isUser` set by matching user `teamId`s (the API's own `userControlled` flag on classes is unreliable).
  - `prospects(season) → recruit[]` from the latest `all_recruits` capture.
  - `champions(archive) → rows[]`, `awardsBySeason(archive) → { [year]: winners[] }`
  - `recordBook(archive) → { singleGame: {...}, season: {...} }` — best per leader category across all archived seasons, each with player, team, season and (for single game) opponent.

- [ ] **Step 1: Write failing tests** in `test/model.test.mjs` against the fixtures:
  - `userTeams` returns names `['Clemson', 'Texas']`.
  - `teamSummary` for Texas: `last` is `Texas 52, SMU 21`; `next.status === 'scheduled'`.
  - `teamSummary` on a season with no scheduled games left returns `next: null`; with no polls, `rank: null`.
  - `seasonLeaders` sums one player across two fixture games (assert the exact summed value from the fixture) and joins on `basePlayerId`.
  - `seasonLeaders` on a season with `boxScores: null` returns every category as `[]`.
  - `headToHead` titles: Danny Bateman 4, Hogg McDoggnald Jr. 3 (from the real postseason fixture); `meetings` is `[]` when the user teams have not played.
  - `headToHead` finds a meeting in a synthetic schedule where both sides are `userControlled`.
  - `classRankings` marks exactly the two user teams `isUser`.
  - `recordBook` over two synthetic seasons picks the higher value and reports its season.
  - `loadArchive` with seasons 2037 and 2038 present sets `current` from `league.json` and keeps both.
- [ ] **Step 2: Run** — expected: fail.
- [ ] **Step 3: Implement the three modules.**
- [ ] **Step 4: Run all tests** — expected: pass.
- [ ] **Step 5: Commit** (`feat: model and stat codes`).

### Task 3: Pages and build

**Files:**
- Create: `src/html.mjs`, `src/pages/home.mjs`, `src/pages/team.mjs`, `src/pages/h2h.mjs`, `src/pages/recruiting.mjs`, `src/pages/history.mjs`, `scripts/build.mjs`, `assets/style.css`, `assets/recruits.js`
- Test: `test/build.test.mjs`

**Interfaces:**
- Consumes: everything Task 2 produces.
- Produces:
  - `esc(value) → string` (null/undefined → `—`)
  - `layout({ title, active, nav, body }) → string`
  - Each page module exports `render(archive) → string`; `team.mjs` exports `render(archive, teamId)`.
  - `build({ dataDir, outDir }) → Promise<string[]>` writing `index.html`, `team-<slug>.html` per user team (slug = lowercase name, non-alphanumerics to `-`), `head-to-head.html`, `recruiting.html`, `history.html`, `prospects.json`, and copied assets. All links are relative, so the site works under a GitHub Pages sub-path.
  - Page content is as listed under "Pages" in the spec. Home shows "Updated <date>" from the latest capture time. Recruiting states that boards and commitments are not available; team stat leaders state they cover user games only.
  - `assets/recruits.js` loads `prospects.json` and filters by position, minimum stars and state, showing 100 rows at a time.

- [ ] **Step 1: Write failing tests** in `test/build.test.mjs` (build fixtures into a temp dir):
  - writes the six expected files plus `prospects.json`.
  - `index.html` contains `Shadynasty 2.1`, `Week 3`, `Clemson` and `Texas`.
  - a team named `Texas A&M` renders as `Texas A&amp;M`; a name containing `<script>` is escaped.
  - an archive with awards `null`, zero box scores, playoff poll `not_released` and no scheduled games builds without throwing, and the pages contain `—`.
  - an archive whose user teams are Arizona State and Clemson produces `team-arizona-state.html` and nav links to it.
  - an archive with seasons 2037 and 2038: `history.html` mentions both; `index.html` shows 2038.
  - no output file contains the string `drk_`.
  - every `href` and `src` in the output is relative (none starts with `/` or `http`, except links to `dynastyrewired.com`).
- [ ] **Step 2: Run** — expected: fail.
- [ ] **Step 3: Implement the renderers, build script and assets.**
- [ ] **Step 4: Run all tests** — expected: pass.
- [ ] **Step 5: Run `node scripts/build.mjs`, open `site/index.html` in the browser pane**, and check each page at desktop and phone width, light and dark, and that the prospect filter narrows results. Fix what looks wrong.
- [ ] **Step 6: Commit** (`feat: pages and build`).

### Task 4: Publish and automate

**Files:**
- Create: `.github/workflows/update.yml`, `README.md` (what it is, how to run sync/build locally, what to do if updates fail)

**Interfaces:**
- Consumes: `npm run sync`, `npm run build`, `site/`.

- [ ] **Step 1: Write the workflow.** Triggers: `schedule` (`17 * * * *`), `workflow_dispatch`, `push` to `main`. Permissions: `contents: write`, `pages: write`, `id-token: write`. Concurrency group `site`. Steps: checkout; setup-node 24; `npm test`; `npm run sync` with `DR_API_TOKEN` from secrets; commit and push `data/` if it changed (message `data: <stage label>`); `npm run build`; upload `site/` with `actions/upload-pages-artifact`; deploy with `actions/deploy-pages`. A sync failure fails the job before deploy.
- [ ] **Step 2: Create the public repository `SorareFP/shadynasty` and push `main`** (owner approved this account and a public site).
- [ ] **Step 3: Owner sets the secret.** Give them one command to run that reads the token from `.env` into the `DR_API_TOKEN` repository secret; the agent does not handle the token value.
- [ ] **Step 4: Enable Pages with source "GitHub Actions"** (`gh api` on the repo's pages endpoint).
- [ ] **Step 5: Trigger the workflow with `gh workflow run` and watch it** — expected: green, and the Pages URL returns the home page with `Shadynasty 2.1`.
- [ ] **Step 6: Trigger it again** — expected: sync prints `no change`, no data commit, still green.
- [ ] **Step 7: Commit README; give the owner the link.**
