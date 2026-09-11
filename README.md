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
/docs page <slug>
/docs list category:<slug>
```

`/docs search` uses CAD’s title-priority search. A single result is returned directly; multiple results include a heading and compact title/link entries. Discord autocomplete suggests page titles while typing.

`/docs page` retrieves page metadata from CAD. Pages may define an optional YAML `excerpt`; pages without one return no excerpt.

`/docs list` browses the direct pages in a CAD navigation category, for example:

```text
/docs list category:reference
```

Responses are plain Discord messages. The bot does not use embeds.

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

Run it directly from TypeScript during development:

```bash
npm run dev
```

Register the `/docs` command during development:

```bash
npm run register:dev
```

When `DISCORD_GUILD_ID` is set, the script registers guild commands, which update immediately and are useful during development. When it is omitted, the script registers global commands for a public installation; Discord notes that global command updates can take longer to propagate. Do not omit the guild ID accidentally during local development.

Run compiled output:

```bash
npm start
```

## Create a release tarball

Create a versioned runtime archive after building and testing:

```bash
npm run release
```

This creates:

```text
release/cad-discord-<version>.tar.gz
```

The archive contains the compiled `dist/` directory, package metadata, `.env.example`, and this README. It does not contain `.env`, `node_modules`, or development tests.

An operator can install it with:

```bash
tar -xzf cad-discord-<version>.tar.gz
cd cad-discord-<version>
npm ci --omit=dev
cp .env.example .env
# edit .env
npm run register
npm start
```

The release install uses the compiled registration script, so development dependencies are not required.

## Automated releases

GitHub Actions runs the build, tests, and npm package inspection for pushes and pull requests targeting `main`.

To publish a release, update `package.json` and `package-lock.json` to the new version, commit the change, and push a matching tag:

```bash
git tag v1.0.3
git push origin v1.0.3
```

A matching `v<version>` tag runs the release workflow. It creates the GitHub release tarball, publishes the package to npm, and attaches the tarball to the GitHub release. The repository must have an `NPM_TOKEN` Actions secret with permission to publish `cad-discord`.

## Install from npm

The public [`cad-discord` npm package](https://www.npmjs.com/package/cad-discord) is the quickest way to install the bot. GitHub Releases remain available when you want a versioned archive instead.

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
GET /api/list?category=<category-slug>
GET /api/suggest?q=<text>&kind=page|category
```

## Architecture

- `src/index.ts` boots Discord and routes interactions.
- `src/register-commands.ts` registers the guild slash command.
- `src/cad/client.ts` owns HTTP communication with CAD.
- `src/cad/types.ts` describes CAD response contracts.
- `src/discord/responses.ts` formats plain Discord messages.

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

This project is not designed as a central SaaS bot.
# cad-bot
