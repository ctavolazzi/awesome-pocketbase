# Scripts Directory

This directory contains automation scripts and utilities for the awesome-pocketbase project.

## Cursor Coding Protocols

The Cursor Coding Protocols system provides version management, telemetry, and update checking for AI-enhanced development workflows.

### Quick Start

```bash
# Show version information
./scripts/cursor-protocols version show

# Check telemetry status
./scripts/cursor-protocols telemetry status

# View full help
./scripts/cursor-protocols help
```

### Available Commands

- **version** - Manage versions
  - `show` - Display version information
  - `current` - Show current version number
  - `history` - Show version history

- **telemetry** - Manage telemetry settings
  - `status` - Show telemetry status
  - `enable` - Enable anonymous telemetry
  - `disable` - Disable telemetry
  - `show` - Show what data would be collected

- **privacy** - View privacy policy

- **help** - Show help information

### Files

- `cursor-protocols-cli.js` - Main CLI interface
- `version-manager.js` - Version management system
- `cursor-protocols` - Helper script for easy access
- `../cursor-protocols-version.json` - Version tracking data

### Installation Details

- **Version**: 2.0.0
- **Environment**: production
- **Update Channel**: stable
- **Telemetry**: Disabled by default

### Privacy

Telemetry is **disabled by default** and requires explicit opt-in. When enabled, only anonymous usage data is collected (no personal information, code, or project details).

View the full privacy policy:
```bash
./scripts/cursor-protocols privacy
```

### Documentation

For more information about cursor coding protocols, visit:
https://github.com/ctavolazzi/cursor-coding-protocols

