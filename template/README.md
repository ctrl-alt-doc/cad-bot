# My ctrlaltbot

This repository runs [ctrlaltbot](https://github.com/ctrl-alt-doc/ctrlaltbot), a Discord bot for a ctrl alt doc documentation site, on Cloudflare Workers.

It contains only your configuration. The bot itself is the `ctrlaltbot` npm package.

## Settings

- **Docs site and Discord IDs**: `vars` in `wrangler.jsonc`. Commit a change here to redeploy with it.
- **Secrets** (`DISCORD_PUBLIC_KEY`, `DISCORD_TOKEN`): Cloudflare dashboard → Workers & Pages → your Worker → Settings → Variables and Secrets.

## Updates

Dependabot opens a pull request when a new version of the bot is published. Minor and patch versions are merged automatically by `.github/workflows/auto-update.yml`, which redeploys the bot. Major versions wait for you to merge them; check the [changelog](https://github.com/ctrl-alt-doc/ctrlaltbot/blob/main/CHANGELOG.md) first.

Delete `.github/workflows/auto-update.yml` to review every update yourself.

## Local development

```bash
npm install
cp .dev.vars.example .dev.vars   # then fill in the values
npm run dev
```
