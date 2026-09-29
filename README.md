<p align="center">
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://github.com/simongrieve/images/blob/d934c2fc1b4c36fc66e5afb2e3082e5546ccb43b/mark-dark-mode-128.png">
  <source media="(prefers-color-scheme: light)" srcset="https://github.com/simongrieve/images/blob/d934c2fc1b4c36fc66e5afb2e3082e5546ccb43b/mark-light-mode-128.png">
  <img alt="Fallback image description" src="default-image.png">
</picture>
</p>

<h2 align="center">A Discord Bot for <a href="https://github.com/ctrl-alt-doc/ctrlaltdoc" />ctrl alt doc</a></h2>
  
[![npm](https://img.shields.io/npm/v/ctrlaltbot?style=flat-square&color=ce0985&labelColor=212121&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNiAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZmZmIj48ZyBzdHJva2Utd2lkdGg9IjIuNCI+PHBhdGggZD0iTTUuNiAzLjRINGEyIDIgMCAwIDAtMiAydjEzLjJhMiAyIDAgMCAwIDIgMmgxLjYiLz48cGF0aCBkPSJNMjAuNCAzLjRIMjJhMiAyIDAgMCAxIDIgMnYxMy4yYTIgMiAwIDAgMS0yIDJoLTEuNiIvPjxjaXJjbGUgY3g9IjExLjIiIGN5PSIxNCIgcj0iMy4zIi8+PHBhdGggZD0iTTE0LjUgMTAuN3Y2LjYiLz48L2c+PHBhdGggZD0iTTE4LjQgOS42aDEuNHY4LjhoLTEuNHoiIGZpbGw9IiNmZmYiIHN0cm9rZT0ibm9uZSIvPjwvc3ZnPg==)](https://www.npmjs.com/package/ctraltbot)
[![downloads](https://img.shields.io/npm/dm/ctrlaltbot?style=flat-square&color=be0078&labelColor=212121&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNiAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZmZmIj48ZyBzdHJva2Utd2lkdGg9IjIuNCI+PHBhdGggZD0iTTUuNiAzLjRINGEyIDIgMCAwIDAtMiAydjEzLjJhMiAyIDAgMCAwIDIgMmgxLjYiLz48cGF0aCBkPSJNMjAuNCAzLjRIMjJhMiAyIDAgMCAxIDIgMnYxMy4yYTIgMiAwIDAgMS0yIDJoLTEuNiIvPjxjaXJjbGUgY3g9IjExLjIiIGN5PSIxNCIgcj0iMy4zIi8+PHBhdGggZD0iTTE0LjUgMTAuN3Y2LjYiLz48L2c+PHBhdGggZD0iTTE4LjQgOS42aDEuNHY4LjhoLTEuNHoiIGZpbGw9IiNmZmYiIHN0cm9rZT0ibm9uZSIvPjwvc3ZnPg==)](https://www.npmjs.com/package/ctrlaltbot)
[![docs](https://img.shields.io/badge/docs-ctrl_alt_doc-ce0985?style=flat-square&labelColor=212121&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNiAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZmZmIj48ZyBzdHJva2Utd2lkdGg9IjIuNCI+PHBhdGggZD0iTTUuNiAzLjRINGEyIDIgMCAwIDAtMiAydjEzLjJhMiAyIDAgMCAwIDIgMmgxLjYiLz48cGF0aCBkPSJNMjAuNCAzLjRIMjJhMiAyIDAgMCAxIDIgMnYxMy4yYTIgMiAwIDAgMS0yIDJoLTEuNiIvPjxjaXJjbGUgY3g9IjExLjIiIGN5PSIxNCIgcj0iMy4zIi8+PHBhdGggZD0iTTE0LjUgMTAuN3Y2LjYiLz48L2c+PHBhdGggZD0iTTE4LjQgOS42aDEuNHY4LjhoLTEuNHoiIGZpbGw9IiNmZmYiIHN0cm9rZT0ibm9uZSIvPjwvc3ZnPg==)](https://docs.ctrlaltdoc.cc/discord)
[![license](https://img.shields.io/npm/l/ctrlaltbot?style=flat-square&color=7f7f7f&labelColor=212121)](LICENSE)
[![Discord](https://img.shields.io/discord/1541521626137370698?style=flat-square&color=ce0985&labelColor=212121&logo=discord&logoColor=white)](https://discord.gg/f6XemeeUpD)


The Discord companion for ctrl alt doc. It lets people search and read a ctrl alt doc documentation site without leaving Discord.

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/ctrl-alt-doc/ctrlaltbot/tree/main/template)

The bot is deliberately a thin integration layer:

```text
Discord → bot → CAD HTTP API → bot → Discord
```

CAD remains responsible for finding documents, resolving slugs, and maintaining the documentation collection. The bot does not duplicate CAD’s search or document logic.

## Commands

```text
/ask <question>
/docs search <query>
/docs page <slug> [header]
```

`/ask` and `/docs search` run the same search. Queries can be written as questions, such as `/ask how do I add a callout`: CAD matches individual words, ignores filler words, and tolerates small typos. When a heading matches better than the page title, the result shows that section's text and links straight to it. When there are several results, a menu below the embed lists up to ten; choosing one switches the embed to that page or section. Only the person who searched can switch the shared message. Anyone else who uses the menu gets their own private copy. Autocomplete suggests matching page titles while typing, with your own wording kept as the first choice.

`/docs page` retrieves page metadata from CAD. The optional `header` argument is autocomplete-enabled from the page table of contents. When selected, the embed shows that section's content and its link opens the page at the matching heading. Pages may define an optional YAML `excerpt`; pages without one return no excerpt.

Server administrators can set the embed colour with:

```text
/docs settings colour hex:#ce0985
```

The setting is stored per Discord server in Cloudflare KV. The default colour is `#ce0985`.

Responses use a consistent branded embed with an `Open page` link button. Empty and error states use the same accent colour, and error replies are ephemeral. Set `BRAND_AVATAR_URL` to a stable public avatar URL for the embed footer.

## Installation

The bot runs as a Cloudflare Worker in your own Cloudflare account. You need a Cloudflare account, a GitHub or GitLab account, and a ctrl alt doc site the Worker can reach.

### 1. Create the Discord application

In the [Discord Developer Portal](https://discord.com/developers/applications):

1. Create an application and add a bot.
2. Note the **Application ID** and **Public Key** from **General Information**, and the bot **Token** from **Bot** (select **Reset Token**). Keep the token secret.
3. Invite the bot to your server using the `bot` and `applications.commands` scopes.

### 2. Deploy

Select **Deploy to Cloudflare** above. Cloudflare will:

- create a repository for your bot in your GitHub or GitLab account;
- ask for your docs site address, the Application ID, the Public Key, and the bot token;
- create the storage the bot uses for server settings;
- build and deploy the bot, and redeploy it whenever that repository changes.

Copy the Worker URL shown when the deployment finishes.

### 3. Connect Discord to the Worker

In the Discord Developer Portal, open **General Information** and set **Interactions Endpoint URL** to the Worker URL. Discord verifies the endpoint when you save.

The bot registers its slash commands itself as soon as Discord first contacts it, so `/ask` and `/docs` appear within a minute or two. There is nothing to run.

## Updates

Your bot's repository contains only your configuration. The bot itself is the [`ctrlaltbot`](https://www.npmjs.com/package/ctrlaltbot) npm package, and the repository is set up so that new versions reach you without any commands:

1. When a new version is published, Dependabot opens a pull request in your repository.
2. Compatible updates (minor and patch versions) are merged automatically by the included workflow. Major versions, which may need changes on your side, wait for you to review and merge them.
3. Merging redeploys the bot, and the bot updates its slash commands on its own.

To review every update yourself, delete `.github/workflows/auto-update.yml` from your repository. To check for updates immediately, open your repository's **Insights → Dependency graph → Dependabot** and select **Check for updates**.

## Manual installation

To deploy without the button, for example from CI you already run:

```bash
git clone https://github.com/ctrl-alt-doc/ctrlaltbot.git
cp -r ctrlaltbot/template my-bot
cd my-bot
npm install
```

Edit `vars` in `wrangler.jsonc`, then:

```bash
npx wrangler login
npx wrangler secret put DISCORD_PUBLIC_KEY
npx wrangler secret put DISCORD_TOKEN
npx wrangler deploy
```

Wrangler creates the settings storage on the first deploy. Then connect Discord to the Worker URL as in step 3. To update, run `npm update ctrlaltbot && npx wrangler deploy`.

Do not put `DISCORD_TOKEN` or `DISCORD_PUBLIC_KEY` in `wrangler.jsonc`, source control, or CI logs.

## Configuration

| Name | Kind | Purpose |
| --- | --- | --- |
| `CAD_BASE_URL` | variable | Address of your ctrl alt doc site. |
| `DISCORD_CLIENT_ID` | variable | Discord Application ID. |
| `DISCORD_PUBLIC_KEY` | secret | Verifies that requests come from Discord. |
| `DISCORD_TOKEN` | secret | Registers and updates the slash commands. Without it, register them manually with `npx ctrlaltbot-register`. |
| `DISCORD_GUILD_ID` | variable, optional | Registers commands to one server instead of globally. Server commands update instantly, which is useful for testing. |
| `BRAND_AVATAR_URL` | variable, optional | Avatar shown in embed footers. |
| `BRAND_SETTINGS` | KV namespace | Per-server settings, and the record of which command definitions are registered. |

The bot checks its command definitions when a Worker instance handles its first interaction, and hourly through a Cron Trigger. It only contacts Discord when the definitions have changed.

## CAD requirements

The configured CAD site must be running and reachable by the Worker. If the docs site is also a Cloudflare Worker in the same account, the bot needs the `global_fetch_strictly_public` compatibility flag, which the template includes; without it Cloudflare blocks the request with error 1042, which the bot logs as `CAD_BLOCKED`.

The bot expects these endpoints:

```text
GET /api/search?q=<query>
GET /api/page?slug=<slug>
GET /api/suggest?q=<text>&kind=page
```

Search results may include an optional `heading` (`{ "id": "...", "title": "..." }`) naming the best-matching section, which the bot uses as the link anchor.

The page endpoint must return `toc` for heading autocomplete. For section results it should return the page's Markdown source as `markdown`; older CAD versions that only return rendered HTML as `content` still work, with plainer formatting. A missing page must return HTTP 404.

```json
{
  "title": "Markdown",
  "description": "...",
  "excerpt": "...",
  "slug": "reference/markdown",
  "toc": [{ "id": "headings", "title": "Headings", "level": 2 }],
  "content": "<h2 id=\"headings\">Headings</h2>...",
  "markdown": "## Headings\n\n..."
}
```

Discord requires a reply within three seconds. If CAD answers within 2.5 seconds, the bot replies directly; otherwise it shows Discord's "thinking" state and edits the reply when CAD responds. CAD requests time out after 10 seconds, and the bot then returns a documentation-server error rather than waiting indefinitely. Autocomplete cannot be deferred, so its CAD requests give up after 2.5 seconds.

## Development

This repository contains the `ctrlaltbot` package and, in `template/`, the repository that the Deploy button copies for each operator.

```bash
npm install
npm run build
npm test
```

`wrangler.jsonc` at the repository root is a development configuration that runs the source directly:

```bash
npx wrangler dev
```

Discord requires a public HTTPS URL for live interactions. Use a tunnel, or deploy a separate test Worker with `npx wrangler deploy --name ctrlaltbot-test`. Set `DISCORD_GUILD_ID` on test Workers so their commands register to your test server only.

To register commands by hand, fill in `.env` from `.env.example` and run `npm run register:dev`.

### Releases

GitHub Actions runs the build, tests, and npm package inspection for pushes and pull requests targeting `main`.

To publish a release, update `package.json` and `package-lock.json` to the new version, commit the change, and push a matching tag:

```bash
git tag v1.0.3
git push origin v1.0.3
```

A matching `v<version>` tag runs the release workflow, which publishes the package to npm. Operators receive it through Dependabot. The repository must have an `NPM_TOKEN` Actions secret with permission to publish `ctrlaltbot`.

Use semantic versioning carefully: minor and patch releases are merged into operators' bots automatically, so anything that requires operators to change their configuration must be a major release.

## Architecture

- `src/index.ts` verifies and routes Discord HTTP interactions, and runs the scheduled command check.
- `src/commands.ts` defines the slash commands.
- `src/register-commands.ts` registers the commands manually (`ctrlaltbot-register`).
- `src/cad/client.ts` owns HTTP communication with CAD.
- `src/cad/types.ts` describes CAD response contracts.
- `src/discord/responses.ts` builds the branded embed, menu, and link-button payloads.
- `src/discord/sections.ts` extracts a single section of a page for Discord.
- `src/discord/deferred.ts` defers slow replies and completes them through the interaction webhook.
- `src/discord/registration.ts` registers the commands with Discord when their definitions change.
- `src/brand.ts` contains the shared brand constants and runtime host/avatar configuration.
- `template/` is the operator repository created by the Deploy button.

The bot receives interactions over HTTP only. It does not connect to the Discord Gateway, does not read server messages, and does not require the privileged Message Content intent.

## Data and privacy boundaries

The bot does not maintain a user database, search history, analytics system, telemetry system, AI integration, or external search integration. Search queries are sent to the configured CAD server for the request and are not deliberately persisted by the bot.

The hosting environment and CAD server may retain normal process or HTTP access logs according to their own configuration.

## Self-hosting model

Each operator runs their own deployment with their own:

- Discord application and bot token;
- Discord server;
- CAD documentation site;
- hosting and log-retention configuration.

For the pink bot name in Discord, a server admin can give the bot a role with colour `#ff88c8`. The role must be positioned and permissioned appropriately; the bot does not attempt to change its own managed role.

This project is not designed as a central SaaS bot.
