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

## Installation and self-hosting

This project is an HTTP Discord interactions Worker. It does not maintain a Discord Gateway login or an online presence. Choose the installation path that matches how you want to operate it:

### Deploy from the repository

This is the recommended option for operators who want to track configuration and updates themselves:

```bash
git clone https://github.com/ctrl-alt-doc/cad-bot.git
cd cad-bot
npm ci
```

Create the required KV namespace and put its ID in `wrangler.jsonc`:

```bash
npx wrangler kv namespace create BRAND_SETTINGS
```

Then authenticate Wrangler, set the Worker secrets, and deploy:

```bash
npx wrangler login
npx wrangler secret put DISCORD_PUBLIC_KEY
npx wrangler secret put DISCORD_TOKEN
npx wrangler deploy
```

Set the deployed Worker URL as the Discord application's Interactions Endpoint URL, then register commands with `DISCORD_TOKEN`, `DISCORD_CLIENT_ID`, and an optional `DISCORD_GUILD_ID`.

### Discord application setup

Create a Discord application and bot in the [Discord Developer Portal](https://discord.com/developers/applications). Record the application ID, bot token, and public key. Invite the bot to a test server with the `bot` and `applications.commands` scopes.

Set the Interactions Endpoint URL only after the Worker has been deployed. Discord validates the endpoint with the public key.

Register commands from the repository checkout:

```bash
DISCORD_TOKEN="your-bot-token" \
DISCORD_CLIENT_ID="your-application-id" \
DISCORD_GUILD_ID="your-test-server-id" \
npx tsx src/register-commands.ts
```

Use `DISCORD_GUILD_ID` during development so command changes appear quickly. Omit it for global commands; global propagation can take longer.

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

The archive includes the compiled Worker, `wrangler.jsonc`, configuration example, and release notes. `npx wrangler` may download Wrangler if it is not installed globally. Create the KV namespace and replace its placeholder ID in `wrangler.jsonc` before deploying.

### Test locally with Wrangler

```bash
npx wrangler dev
```

Use the local URL for development checks. Discord requires a publicly reachable HTTPS endpoint for a live application, so deploy the Worker or use a suitable tunnel for local interaction testing.

The npm package is a distribution artifact for these Worker deployments and command registration. `npm start` is not a standalone bot server and does not log the bot into Discord.

### Install from npm

The npm package is useful when you want the compiled Worker artifacts or the command-registration script. It is not, by itself, a complete deployment directory:

```bash
npm install --global cad-discord
mkdir cad-discord-config
cd cad-discord-config
cp "$(npm root --global)/cad-discord/.env.example" .env
```

For a Worker deployment, use the GitHub release archive instead because it includes the Wrangler configuration. For command registration from an npm installation, fill in `.env` and run:

```bash
cad-discord-register
```

The `cad-discord` executable is not a standalone server and should not be used as a replacement for `wrangler deploy`.

### Local development

Install dependencies and run the Worker locally:

```bash
npm install
npx wrangler dev
```

Use `npm run build` for a production TypeScript build and `npm test` for the test suite. Discord requires a public HTTPS endpoint for live interaction testing; use a tunnel or deploy a test Worker.

## Requirements

- Node.js with native `fetch` support
- A Discord application and bot
- A CAD documentation site exposing the bot API endpoints
- A Cloudflare account for Worker deployment
- A Cloudflare KV namespace bound as `BRAND_SETTINGS`

### Supported package managers

The repository includes npm metadata and is tested with npm:

```bash
npm ci
```

Other Node package managers can install the dependencies, but their lockfiles are not the release source of truth. If using pnpm, Yarn, or Bun, install the equivalent Wrangler and TypeScript dependencies, then use the same `wrangler` commands. npm remains the recommended and documented path.

### Install scripts and npm approvals

Newer npm versions may warn that install scripts for `esbuild` and `workerd` are pending approval. Those scripts prepare binaries used by Wrangler. Review and approve them, then rebuild:

```bash
npm approve-scripts esbuild workerd
npm rebuild esbuild workerd
```

If your npm version does not support package-specific approval, use the review command npm prints and then run `npm rebuild`.

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
