# Shadynasty 2.1

A league site for our EA Sports College Football 27 Online Dynasty: where things stand, stats for the user teams, recruiting, and league history.

## How it works

1. [Dynasty Rewired](https://dynastyrewired.com/) captures the league after each advance.
2. Once an hour, a GitHub Actions job asks its API whether anything changed. If so, it saves the new data under `data/` and commits it.
3. The job rebuilds the pages from `data/` and publishes them with GitHub Pages.

`data/` is the archive. The record book and past seasons are built from it, so keep it.

## What it cannot show

- Stats from simulated games. Only games played by a user are captured.
- Each coach's recruiting board, or where a prospect committed.
- Game results from before the 2037 season.

## Running it yourself

Needs Node 24. There is nothing to install.

```bash
npm test
```

```bash
npm run sync
```

```bash
npm run build
```

`npm run sync` reads the API token from a `.env` file containing `DR_API_TOKEN=...`. That file is ignored by git; never commit it. `npm run build` writes the site to `site/`.

## If the site stops updating

Open the repository's **Actions** tab and look at the latest "Update site" run.

- **`returned 402`**: the Dynasty Rewired trial ended or the subscription lapsed. Subscribe and the next run recovers.
- **`returned 401`**: the token was replaced or revoked. Create a new one under Account → API access on Dynasty Rewired and update the `DR_API_TOKEN` secret under Settings → Secrets and variables → Actions.
- **No runs at all for a long time**: GitHub pauses scheduled jobs after 60 days without activity in the repository. Open the Actions tab and re-enable the workflow.

A failed run never changes the published site; it stays on the last good version.
