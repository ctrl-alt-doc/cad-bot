# ctrl alt doc — Discord bot

This is the Discord companion for [ctrl alt doc](https://github.com/simongrieve/ctrlaltdoc). It provides a small Discord interface to a configured CAD documentation site.

[Download the latest release](https://github.com/ctrl-alt-doc/cad-bot/releases/latest)

[Install `cad-discord` from npm](https://www.npmjs.com/package/cad-discord)

The bot is deliberately a thin integration layer:

```text
Discord → bot → CAD HTTP API → bot → Discord
```

CAD remains responsible for finding documents, resolving slugs, and maintaining the documentation collection. The bot does not duplicate CAD’s search or document logic.

## Commands

```text
/docs search <query>
/docs page <slug> [header]
```

`/docs search` uses CAD’s title-priority search. A single result is returned directly; multiple results include a heading and compact title/link entries. Discord autocomplete suggests page titles while typing.

`/docs page` retrieves page metadata from CAD. The optional `header` argument is autocomplete-enabled from the page table of contents. When selected, the embed shows that section's content and its link opens the page at the matching heading. Pages may define an optional YAML `excerpt`; pages without one return no excerpt.

Server administrators can set the embed colour with:

```text
/docs settings colour hex:#ce0985
```

The setting is stored per Discord server in Cloudflare KV. Create a KV namespace, bind it as `BRAND_SETTINGS` in `wrangler.jsonc`, then deploy:

```bash
npx wrangler kv namespace create BRAND_SETTINGS
```

Copy the returned namespace ID into the `kv_namespaces` binding before running `npx wrangler deploy`. The default colour is `#ce0985`.

Responses use a consistent branded embed with an `Open page` link button. Empty and error states use the same accent colour, and error replies are ephemeral. Set `BRAND_AVATAR_URL` to a stable public avatar URL for the embed footer; otherwise the bot uses `/brand/ctrl-alt-bot-512.png` on the CAD site.

## Self-hosting options

This project is an HTTP Discord interactions Worker. It does not maintain a Discord Gateway login or an online presence. Choose one of these deployment options:

### Deploy from the repository

This is the recommended option for operators who want to track configuration and updates themselves:

```bash
git clone https://github.com/ctrl-alt-doc/cad-bot.git
cd cad-bot
npm ci
npx wrangler secret put DISCORD_PUBLIC_KEY
npx wrangler secret put DISCORD_TOKEN
npx wrangler deploy
```

Set the deployed Worker URL as the Discord application's Interactions Endpoint URL, then register commands with `DISCORD_TOKEN`, `DISCORD_CLIENT_ID`, and an optional `DISCORD_GUILD_ID`.

### Deploy a release archive

Download the archive from GitHub Releases, extract it, and install production dependencies:

```bash
tar -xzf cad-discord-<version>.tar.gz
cd cad-discord-<version>
npm ci --omit=dev
npx wrangler secret put DISCORD_PUBLIC_KEY
npx wrangler secret put DISCORD_TOKEN
npx wrangler deploy
```

The archive includes the compiled Worker, `wrangler.jsonc`, configuration example, and release notes. `npx wrangler` may download Wrangler if it is not installed globally.

### Test locally with Wrangler

```bash
npx wrangler dev
```

Use the local URL for development checks. Discord requires a publicly reachable HTTPS endpoint for a live application, so deploy the Worker or use a suitable tunnel for local interaction testing.

The npm package is a distribution artifact for these Worker deployments and command registration. `npm start` is not a standalone bot server and does not log the bot into Discord.

## Requirements

- Node.js with native `fetch` support
- A Discord application and bot
- A CAD documentation site exposing the bot API endpoints

## Configuration

Copy the example environment file:

```bash
cp .env.example .env
```

Fill in:

```text
DISCORD_TOKEN=          # secret bot token
DISCORD_CLIENT_ID=1551648923544846448  # Discord application ID
DISCORD_GUILD_ID=       # optional: use guild registration during development
CAD_BASE_URL=http://localhost:5173
```

Never commit `.env` or paste the token into chat, documentation, or source control.

## Development

Install dependencies:

```bash
npm install
```

Build and type-check the bot:

```bash
npm run build
```

Run the automated client and formatter tests:

```bash
npm test
```

Register the `/docs` command during development:

```bash
npm run register:dev
```

When `DISCORD_GUILD_ID` is set, the script registers guild commands, which update immediately and are useful during development. When it is omitted, the script registers global commands for a public installation; Discord notes that global command updates can take longer to propagate. Do not omit the guild ID accidentally during local development.

## Create a release tarball

Create a versioned runtime archive after building and testing:

```bash
npm run release
```

This creates:

```text
release/cad-discord-<version>.tar.gz
```

The archive contains the compiled Worker, package metadata, Wrangler configuration, `.env.example`, README, and changelog. It does not contain `.env`, `node_modules`, or development tests.

## Automated releases

GitHub Actions runs the build, tests, and npm package inspection for pushes and pull requests targeting `main`.

To publish a release, update `package.json` and `package-lock.json` to the new version, commit the change, and push a matching tag:

```bash
git tag v1.0.3
git push origin v1.0.3
```

A matching `v<version>` tag runs the release workflow. It creates the GitHub release tarball, publishes the package to npm, and attaches the tarball to the GitHub release. The repository must have an `NPM_TOKEN` Actions secret with permission to publish `cad-discord`.

## Install from npm

The public [`cad-discord` npm package](https://www.npmjs.com/package/cad-discord) contains the same compiled Worker artifacts. For a complete self-hosted deployment, the GitHub release archive is usually easier because it includes `wrangler.jsonc` and the deployment documentation.

```bash
npm install --global cad-discord
```

Create a directory for the deployment and copy the example configuration from the installed package:

```bash
mkdir cad-discord-config
cd cad-discord-config
cp "$(npm root --global)/cad-discord/.env.example" .env
# edit .env
```

Then register the commands and start the bot:

```bash
cad-discord-register
cad-discord
```

The npm package exposes `cad-discord` to start the bot and `cad-discord-register` to register its slash commands. Both commands use the `.env` file in the current working directory.

CAD requests have a bounded timeout. If the configured CAD server is unreachable or does not respond in time, the bot returns a generic documentation-server error rather than waiting indefinitely.

The configured CAD site must be running and reachable by the bot. The bot expects these endpoints:

```text
GET /api/search?q=<query>
GET /api/page?slug=<slug>
GET /api/suggest?q=<text>&kind=page|category
```

## Architecture

- `src/index.ts` boots Discord and routes interactions.
- `src/register-commands.ts` registers the guild slash command.
- `src/cad/client.ts` owns HTTP communication with CAD.
- `src/cad/types.ts` describes CAD response contracts.
- `src/discord/responses.ts` builds the branded embed and link-button payloads.
- `src/brand.ts` contains the shared brand constants and runtime host/avatar configuration.

The bot requests only the `Guilds` gateway intent. It does not read arbitrary server messages and does not require the privileged Message Content intent.

## Data and privacy boundaries

The bot does not maintain a user database, search history, analytics system, telemetry system, AI integration, or external search integration. Search queries are sent to the configured CAD server for the request and are not deliberately persisted by the bot.

The hosting environment and CAD server may retain normal process or HTTP access logs according to their own configuration.

## Self-hosting model

Each operator can run their own deployment with their own:

- Discord application and bot token;
- Discord server;
- CAD documentation site;
- hosting and log-retention configuration.

For the pink bot name in Discord, a server admin can give the bot a role with colour `#ff88c8`. The role must be positioned and permissioned appropriately; the bot does not attempt to change its own managed role.

This project is not designed as a central SaaS bot.
# cad-bot
