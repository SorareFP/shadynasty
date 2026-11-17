# Webhook relay

Makes the site update about two minutes after Dynasty Rewired saves new data, instead of waiting for the hourly check.

```
Dynasty Rewired  →  relay (Cloudflare Worker)  →  GitHub "Update site" workflow
   webhook           checks the signature           full refresh, rebuild, deploy
```

Dynasty Rewired can't send the login header GitHub needs, so the relay in [worker.mjs](worker.mjs) sits in between. It checks each delivery's signature and asks GitHub to rebuild. When GitHub refuses, the relay answers with an error and Dynasty Rewired tries again later, so no update is lost. The hourly and daily checks keep running as a backup.

## One-time setup (about 10 minutes)

Never paste the token or the secret into chat, an issue or this repo. They go only into Cloudflare's settings.

### 1. GitHub token

1. Open https://github.com/settings/personal-access-tokens/new in a browser (the GitHub phone app doesn't have this page). To get there by hand: your profile picture (top right) → **Settings** → **Developer settings** at the very bottom of the left sidebar → **Personal access tokens** → **Fine-grained tokens** → **Generate new token**.
2. Name: `shadynasty relay`. Expiration: up to a year (put a reminder in your calendar).
3. Repository access: **Only select repositories** → `shadynasty`.
4. Permissions → Repository permissions → **Contents: Read and write**. Leave everything else alone.
5. Generate it and keep the page open; you'll paste it in step 2.

### 2. Cloudflare Worker

1. Sign up for a free account at cloudflare.com and open the dashboard.
2. Go to **Workers & Pages** → **Create** → **Start with Hello World**. Name it `shadynasty-relay` and deploy.
3. Click **Edit code**, replace everything in the editor with the contents of [worker.mjs](worker.mjs), and click **Deploy**.
4. In the Worker's **Settings → Variables and Secrets**, add two variables, each with type **Secret**:
   - `GITHUB_TOKEN`: the token from step 1.
   - `DR_WEBHOOK_SECRET`: leave this one for step 3.
5. Copy the Worker's address, which looks like `https://shadynasty-relay.<your-name>.workers.dev`.

### 3. Dynasty Rewired

1. Open the league → **League settings → Webhook**, paste the Worker address and save.
2. Copy the `whsec_…` signing secret it shows.
3. Back in Cloudflare, add the secret `DR_WEBHOOK_SECRET` with that value.
4. In Dynasty Rewired, press **Send test delivery**. It should succeed, and an "Update site" run should start in the repo's Actions tab within a few seconds.

Turning the webhook on sends a full copy of every saved season first. Deliveries made before step 3 fail and are retried automatically. GitHub keeps only one rebuild waiting behind the running one, so the burst shows up as a few runs, plus some runs marked cancelled.

## If something goes wrong

- **Dynasty Rewired emails about failed deliveries:** the GitHub token has expired or a secret is wrong. Make a new token and replace `GITHUB_TOKEN` in Cloudflare. After 50 failures in a row the webhook turns itself off; turn it back on in League settings.
- **A leaked secret:** rotate it in League settings, then update `DR_WEBHOOK_SECRET` in Cloudflare. For a leaked GitHub token, delete it on GitHub and make a new one.
- **Changing the relay code:** paste the new [worker.mjs](worker.mjs) into the Cloudflare editor and deploy again. `npm test` covers it.
