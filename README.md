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

The setting is stored per Discord server in Cloudflare KV. The default colour is `#ce0985`.

Responses use a consistent branded embed with an `Open page` link button. Empty and error states use the same accent colour, and error replies are ephemeral. Set `BRAND_AVATAR_URL` to a stable public avatar URL for the embed footer; otherwise the bot uses `/brand/ctrl-alt-bot-512.png` on the CAD site.

## Installation

This bot runs as a Cloudflare Worker. The simplest supported setup is: create a Discord application, deploy the Worker, connect Discord to its URL, and register the commands.

### 1. Create the Discord application

In the [Discord Developer Portal](https://discord.com/developers/applications):

1. Create an application and add a bot.
2. Copy the **Application ID**, **Bot Token**, and **Public Key**.
3. Invite the bot to your server using the `bot` and `applications.commands` scopes.

Keep the token secret.

### 2. Download the bot

Use either the source repository or a GitHub release archive.

From source:

```bash
git clone https://github.com/ctrl-alt-doc/cad-bot.git
cd cad-bot
npm ci
```

From a release archive:

```bash
tar -xzf cad-discord-<version>.tar.gz
cd cad-discord-<version>
npm ci --omit=dev
```

### 3. Log in to Cloudflare

```bash
npx wrangler login
```

### 4. Create the colour-settings database

Run this once:

```bash
npx wrangler kv namespace create BRAND_SETTINGS
```

Copy the returned ID into `wrangler.jsonc`, replacing:

```text
REPLACE_WITH_BRAND_SETTINGS_NAMESPACE_ID
```

Before deploying, edit the same file and replace these example values with your own:

```jsonc
"name": "cad-discord-your-name",
"CAD_BASE_URL": "https://your-docs.example.com",
"DISCORD_CLIENT_ID": "YOUR_DISCORD_APPLICATION_ID"
```

### 5. Add the Discord secrets

Run each command and paste the requested value:

```bash
npx wrangler secret put DISCORD_PUBLIC_KEY
npx wrangler secret put DISCORD_TOKEN
```

### 6. Deploy

```bash
npx wrangler deploy
```

Copy the Worker URL printed by Wrangler.

### 7. Connect Discord to the Worker

In the Discord Developer Portal, open **General Information** and set **Interactions Endpoint URL** to the Worker URL.

Discord should verify the endpoint.

### 8. Register slash commands

From a source checkout, create a `.env` file:

```text
DISCORD_TOKEN=your-bot-token
DISCORD_CLIENT_ID=your-application-id
DISCORD_GUILD_ID=your-test-server-id
```

Then run:

```bash
npx tsx src/register-commands.ts
```

`DISCORD_GUILD_ID` is recommended while testing because commands update immediately. Omit it when registering global commands for public use.

### Test locally

```bash
npx wrangler dev
```

Discord requires a public HTTPS URL for live interactions. Use a tunnel for local testing or deploy a separate test Worker with:

```bash
npx wrangler deploy --name cad-discord-test
```

The npm package is a distribution artifact and is not a standalone bot server. Do not use `npm start` to run the production bot.

### Other package managers

npm is the documented and tested package manager:

```bash
npm ci
```

pnpm, Yarn, and Bun may install the project dependencies, but npm remains the release source of truth. If npm warns that `esbuild` or `workerd` install scripts need approval, run:

```bash
npm approve-scripts esbuild workerd
npm rebuild esbuild workerd
```

## Requirements

- Node.js with native `fetch` support
- A Discord application and bot
- A CAD documentation site exposing the bot API endpoints
- A Cloudflare account for Worker deployment
- A Cloudflare KV namespace bound as `BRAND_SETTINGS`

### CI/CD deployment

For automated deployments, install Wrangler in the CI environment, authenticate with a Cloudflare API token, and store the Discord credentials as encrypted CI secrets. The deployment step is:

```bash
npx wrangler deploy
```

Do not put `DISCORD_TOKEN` or `DISCORD_PUBLIC_KEY` in `wrangler.jsonc`, source control, Docker images, or CI logs. Set them with `wrangler secret put` or the equivalent CI-managed Wrangler secret workflow.

### Docker, traditional Node hosting, and other platforms

There is currently no supported Docker image, Express server, Fastify server, traditional long-running Node process, or Discord Gateway client in this package. The Worker entrypoint exports `fetch` and expects Cloudflare Worker bindings, including KV. Do not run `node dist/index.js` or `npm start` as a production bot process.

The code can be adapted to another HTTP runtime, but that requires replacing Wrangler bindings and providing an HTTPS endpoint that accepts Discord interactions. That is an integration port, not an installation option supported by this release.

## Configuration

Copy the example environment file:

```bash
cp .env.example .env
```

Fill in:

```text
DISCORD_TOKEN=          # secret bot token
DISCORD_CLIENT_ID=      # Discord application ID
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

CAD requests have a bounded timeout. If the configured CAD server is unreachable or does not respond in time, the bot returns a generic documentation-server error rather than waiting indefinitely.

The configured CAD site must be running and reachable by the Worker. The bot expects these endpoints:

```text
GET /api/search?q=<query>
GET /api/page?slug=<slug>
GET /api/suggest?q=<text>&kind=page

The page endpoint must return `toc` and `content` for heading autocomplete and section results:

```json
{
  "title": "Markdown",
  "description": "...",
  "excerpt": "...",
  "slug": "reference/markdown",
  "toc": [{ "id": "headings", "title": "Headings", "level": 2 }],
  "content": "## Headings\n\n..."
}
```

## Architecture

- `src/index.ts` verifies and routes Discord HTTP interactions.
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
