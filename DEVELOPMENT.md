# Development Guide

This document provides information about the development tools and workflows used in the awesome-pocketbase project.

## Cursor Coding Protocols

This project uses the Cursor Coding Protocols system for enhanced AI-assisted development workflows.

### Installation Status

✅ **Installed and Active**

- **Version**: 2.0.0
- **Environment**: production
- **Update Channel**: stable
- **Telemetry**: Disabled
- **Installed**: October 18, 2025

### Quick Commands

```bash
# Show version information
./scripts/cursor-protocols version show

# Check current version
./scripts/cursor-protocols version current

# View version history
./scripts/cursor-protocols version history

# Check telemetry status
./scripts/cursor-protocols telemetry status

# View privacy policy
./scripts/cursor-protocols privacy

# Get help
./scripts/cursor-protocols help
```

### What Are Cursor Coding Protocols?

The Cursor Coding Protocols is a self-improving development toolkit that provides:

- **Version Management**: Track protocol versions and updates
- **Telemetry System**: Optional anonymous usage analytics (disabled by default)
- **Update Management**: Check for and install protocol updates
- **Privacy-First**: No personal information collected without explicit consent

### Files

The following files are part of the cursor protocols installation:

```
scripts/
├── cursor-protocols           # Helper script for easy CLI access
├── cursor-protocols-cli.js    # Main command-line interface
├── version-manager.js         # Version tracking system
└── README.md                  # Scripts documentation

.cursor-protocols-version.json # Version tracking data (root)
```

### Privacy & Telemetry

Telemetry is **disabled by default** and requires explicit opt-in.

When enabled, the following anonymous data is collected:
- Installation ID (anonymous UUID)
- Version information
- OS type (e.g., "macOS")
- Node.js major version
- Test execution results (pass/fail only)

**Never collected:**
- Your name, email, or personal information
- Project names or file paths
- Code content
- IP addresses or location

To manage telemetry:

```bash
# Check status
./scripts/cursor-protocols telemetry status

# Enable (opt-in)
./scripts/cursor-protocols telemetry enable

# Disable
./scripts/cursor-protocols telemetry disable

# See what would be collected
./scripts/cursor-protocols telemetry show
```

### Documentation

For detailed documentation, see:
- [Scripts README](./scripts/README.md)
- [Cursor Coding Protocols on GitHub](https://github.com/ctavolazzi/cursor-coding-protocols)

## Contributing

When contributing to this project, please be aware of the cursor protocols system and ensure your changes don't interfere with the version tracking files.

### Files to Avoid Modifying

- `.cursor-protocols-version.json` - Managed automatically by the version system
- `scripts/cursor-protocols-cli.js` - Core protocol CLI (update via protocol update system)
- `scripts/version-manager.js` - Core version manager (update via protocol update system)

## Other Development Tools

(Add information about other development tools and workflows here as they are added to the project)

