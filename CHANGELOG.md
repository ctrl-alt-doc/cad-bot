# Changelog

All notable changes to this project are documented here.

## [1.1.2] - 2026-09-29

### Fixed

- Section text from docs sites that only send rendered HTML showed headings as plain text and the paragraph after each heading as a large heading, because each heading's "#" permalink was left in the text. Headings now appear in bold, code blocks as code blocks, and inline code, bold text, and lists are kept; other text that Discord would treat as formatting is escaped.

## [1.1.1] - 2026-09-29

### Fixed

- Section text works again with docs sites that send Markdown in the page API's `content` field rather than as `markdown`. In 1.1.0 these sites showed "Open the page to read this section."
- The template enables the `global_fetch_strictly_public` compatibility flag, so the bot can reach a docs site hosted as a Worker in the same Cloudflare account. Without it, Cloudflare blocks the request with error 1042 and every search fails. Existing deployments need to add the flag to their `wrangler.jsonc`.
- CAD failures are logged with the error code, request URL, and HTTP status instead of only a stack trace, and Cloudflare's same-account block is reported as `CAD_BLOCKED` with instructions rather than as a missing page.

## [1.1.0] - 2026-09-29

### Changed

- Renamed from `cad-discord` to `ctrlaltbot`. The package is now a library that operators install through the template repository; the manual register command is `ctrlaltbot-register`.
- Settings storage is created automatically on deploy; `wrangler.jsonc` no longer needs a KV namespace ID.
- Server colour settings are only read from storage for commands that display an embed.

### Added

- Deploy to Cloudflare button and an operator template (`template/`) that receives updates through Dependabot, with automatic merging of minor and patch versions.
- The Worker registers its own slash commands when their definitions change, checked on the first interaction after a deploy and hourly, so updates need no manual registration. Requires the `DISCORD_TOKEN` secret.
- `/ask <question>` command for natural-language searches.
- Autocomplete on search queries, keeping the typed text as the first choice.
- Search results link to the best-matching heading when CAD provides one, and show that section's text.
- A menu of up to ten matching pages replaces the "Also matching" links; choosing one switches the result in place.
- Automated tests for search result formatting and autocomplete choices.

### Fixed

- Slow documentation servers no longer make commands fail with "The application did not respond": replies are deferred after 2.5 seconds and completed when CAD responds.
- `/docs page … header:` now shows the selected section's text instead of a placeholder, stops at the next heading, keeps code blocks and formatting, and shows up to 1,500 characters instead of 200.
- Missing pages report "Page not found" instead of a generic server error.
- Unknown commands and missing options get an explanatory ephemeral reply instead of failing the interaction.
- Autocomplete responses respect Discord's 25-choice and 100-character limits.

### Removed

- `discord.js` and `dotenv` dependencies.
- The `cad-discord` binary, which started the Worker as a Node process.

## [1.0.7] - 2026-09-26

### Fixed

- Point the packaged Wrangler deployment at the included compiled `dist/index.js` entrypoint.
- Document the build step required when deploying directly from source.

## [1.0.6] - 2026-09-26

### Fixed

- Replaced instance-specific Wrangler deployment values with self-hosting placeholders.
- Removed the maintainer's Worker name, CAD host, Discord application ID, and KV namespace ID from the distributable configuration.

## [1.0.5] - 2026-09-26

### Added

- Per-server embed colour settings with `/docs settings colour`.
- Permission checks requiring Administrator or Manage Server access.

## [1.0.4] - 2026-09-22

### Added

- Branded embeds for documentation results, empty states, and errors.
- Per-server embed colour settings with `/docs settings colour`.
- `Open page` and `Browse the docs` link buttons.
- Centralized brand configuration and optional footer avatar URL.
- Support for section, breadcrumb, and version metadata when provided by CAD.

### Changed

- Error replies are now ephemeral and never expose stack traces.
- Updated Wrangler configuration for the new Discord application.

### Removed

- The `/docs list` command and its category autocomplete option.
