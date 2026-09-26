# Changelog

All notable changes to this project are documented here.

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
