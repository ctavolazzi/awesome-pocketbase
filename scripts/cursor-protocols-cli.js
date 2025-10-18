#!/usr/bin/env node
/**
 * cursor-coding-protocols CLI
 * Main command-line interface for the toolkit
 */

const VersionManager = require('./version-manager');

const COMMANDS = {
  version: {
    description: 'Manage versions',
    usage: 'cursor-protocols version [show|current|history|init]',
    subcommands: {
      show: 'Display version information',
      current: 'Show current version number',
      history: 'Show version history',
      init: 'Initialize version tracking'
    }
  },
  update: {
    description: 'Check for and install updates',
    usage: 'cursor-protocols update [check|install|rollback]',
    subcommands: {
      check: 'Check for available updates',
      install: 'Install latest update',
      rollback: 'Rollback to previous version'
    }
  },
  telemetry: {
    description: 'Manage telemetry settings',
    usage: 'cursor-protocols telemetry [enable|disable|status|show]',
    subcommands: {
      enable: 'Enable anonymous telemetry',
      disable: 'Disable telemetry',
      status: 'Show telemetry status',
      show: 'Show what data would be collected'
    }
  },
  privacy: {
    description: 'View privacy policy',
    usage: 'cursor-protocols privacy'
  },
  help: {
    description: 'Show help information',
    usage: 'cursor-protocols help [command]'
  }
};

class CLI {
  constructor() {
    this.versionManager = new VersionManager();
  }

  run(args) {
    const command = args[0];
    const subArgs = args.slice(1);

    if (!command || command === 'help' || command === '--help' || command === '-h') {
      this.showHelp(subArgs[0]);
      return;
    }

    if (command === '--version' || command === '-v') {
      console.log(this.versionManager.getCurrentVersion());
      return;
    }

    switch (command) {
      case 'version':
        this.handleVersion(subArgs);
        break;

      case 'update':
        this.handleUpdate(subArgs);
        break;

      case 'telemetry':
        this.handleTelemetry(subArgs);
        break;

      case 'privacy':
        this.handlePrivacy();
        break;

      default:
        console.error(`❌ Unknown command: ${command}`);
        console.log('Run "cursor-protocols help" for usage information');
        process.exit(1);
    }
  }

  handleVersion(args) {
    const subCommand = args[0] || 'show';

    switch (subCommand) {
      case 'show':
      case 'info':
        this.versionManager.display(args[1]);
        break;

      case 'current':
        console.log(this.versionManager.getCurrentVersion());
        break;

      case 'history':
        const history = this.versionManager.getHistory();
        if (history.length === 0) {
          console.log('📝 No version history yet');
        } else {
          console.log('\n📜 Version History:');
          console.log('─────────────────────────────────────');
          history.forEach((h, i) => {
            const date = new Date(h.updated).toLocaleDateString();
            console.log(`  ${i + 1}. v${h.version.padEnd(10)} ${date}`);
          });
          console.log('─────────────────────────────────────\n');
        }
        break;

      case 'init':
        this.versionManager.initialize({
          environment: args[1] || 'production'
        });
        break;

      default:
        console.error(`❌ Unknown version subcommand: ${subCommand}`);
        console.log('Usage: cursor-protocols version [show|current|history|init]');
        process.exit(1);
    }
  }

  handleUpdate(args) {
    const subCommand = args[0];

    switch (subCommand) {
      case 'check':
        console.log('🔍 Checking for updates...');
        console.log('ℹ️  Update checking not yet implemented');
        console.log('   Coming in Phase 2 of versioning system');
        break;

      case 'install':
        console.log('📥 Installing update...');
        console.log('ℹ️  Update installation not yet implemented');
        console.log('   Coming in Phase 2 of versioning system');
        break;

      case 'rollback':
        console.log('🔄 Rolling back...');
        console.log('ℹ️  Rollback not yet implemented');
        console.log('   Coming in Phase 2 of versioning system');
        break;

      default:
        console.error(`❌ Unknown update subcommand: ${subCommand}`);
        console.log('Usage: cursor-protocols update [check|install|rollback]');
        process.exit(1);
    }
  }

  handleTelemetry(args) {
    const subCommand = args[0];

    switch (subCommand) {
      case 'enable':
        this.versionManager.setTelemetry(true);
        console.log('\nℹ️  What we collect (anonymously):');
        console.log('   • Installation ID (UUID, no personal info)');
        console.log('   • Version information');
        console.log('   • OS type (e.g., "macOS")');
        console.log('   • Node.js major version');
        console.log('   • Test results (pass/fail only)');
        console.log('\n✅ We NEVER collect:');
        console.log('   ✗ User identity, email, or name');
        console.log('   ✗ Project names or file paths');
        console.log('   ✗ Code content');
        console.log('   ✗ IP address or location');
        console.log('\nView full privacy policy: cursor-protocols privacy\n');
        break;

      case 'disable':
        this.versionManager.setTelemetry(false);
        break;

      case 'status':
        const enabled = this.versionManager.getTelemetryStatus();
        console.log(`\nTelemetry Status: ${enabled ? '✅ Enabled' : '❌ Disabled'}`);
        if (enabled) {
          console.log('\nTo disable: cursor-protocols telemetry disable');
        } else {
          console.log('\nTo enable: cursor-protocols telemetry enable');
        }
        console.log('For details: cursor-protocols privacy\n');
        break;

      case 'show':
        this.showTelemetryData();
        break;

      default:
        console.error(`❌ Unknown telemetry subcommand: ${subCommand}`);
        console.log('Usage: cursor-protocols telemetry [enable|disable|status|show]');
        process.exit(1);
    }
  }

  showTelemetryData() {
    const info = this.versionManager.getVersionInfo();

    if (!info) {
      console.log('❌ Version tracking not initialized');
      return;
    }

    console.log('\n📊 Telemetry Data Example');
    console.log('─────────────────────────────────────');
    console.log('This is what would be collected if telemetry is enabled:\n');

    const exampleData = {
      installationId: info.installationId,
      version: info.version,
      environment: {
        os: process.platform,
        nodeVersion: process.version.split('.')[0] + '.x'
      },
      telemetryEnabled: info.telemetryEnabled
    };

    console.log(JSON.stringify(exampleData, null, 2));
    console.log('\n✅ Notice: No personal information included');
    console.log('─────────────────────────────────────\n');
  }

  handlePrivacy() {
    console.log(`
╔═══════════════════════════════════════════════════════════════╗
║           cursor-coding-protocols Privacy Policy              ║
╚═══════════════════════════════════════════════════════════════╝

📜 Our Commitment

We respect your privacy. Telemetry is DISABLED by default and
requires explicit opt-in.

─────────────────────────────────────────────────────────────────

✅ What We Collect (with your permission):

  • Installation ID (anonymous UUID)
  • Version information
  • OS type (e.g., "macOS", "Linux", "Windows")
  • Node.js major version (e.g., "18.x")
  • Test execution results (pass/fail only)

─────────────────────────────────────────────────────────────────

❌ What We NEVER Collect:

  • Your name, email, or any personal information
  • Project names or file paths
  • Code content or file contents
  • IP addresses
  • Geographic location
  • Browsing history
  • Any PII (personally identifiable information)

─────────────────────────────────────────────────────────────────

🔒 Your Rights:

  • View data:    cursor-protocols telemetry show
  • Disable:      cursor-protocols telemetry disable
  • Delete data:  Contact: ctavolazzi@gmail.com

─────────────────────────────────────────────────────────────────

📖 Full Policy:

  https://github.com/ctavolazzi/cursor-coding-protocols/privacy

─────────────────────────────────────────────────────────────────

Current Status: ${this.versionManager.getTelemetryStatus() ? '✅ Enabled' : '❌ Disabled'}

To change: cursor-protocols telemetry [enable|disable]

╚═══════════════════════════════════════════════════════════════╝
    `);
  }

  showHelp(command) {
    if (command && COMMANDS[command]) {
      this.showCommandHelp(command);
      return;
    }

    console.log(`
╔═══════════════════════════════════════════════════════════════╗
║        cursor-coding-protocols Command Line Interface         ║
╚═══════════════════════════════════════════════════════════════╝

📦 Version Management, Updates, and Self-Improvement System

Usage:
  cursor-protocols <command> [options]

Commands:
${Object.entries(COMMANDS).map(([cmd, info]) =>
  `  ${cmd.padEnd(12)} ${info.description}`
).join('\n')}

Options:
  -h, --help     Show this help message
  -v, --version  Show version number

Examples:
  cursor-protocols version show
  cursor-protocols update check
  cursor-protocols telemetry status
  cursor-protocols help version

For more help on a specific command:
  cursor-protocols help <command>

Documentation:
  https://github.com/ctavolazzi/cursor-coding-protocols

╚═══════════════════════════════════════════════════════════════╝
    `);
  }

  showCommandHelp(command) {
    const cmd = COMMANDS[command];
    console.log(`
Command: ${command}
Description: ${cmd.description}
Usage: ${cmd.usage}
`);

    if (cmd.subcommands) {
      console.log('Subcommands:');
      Object.entries(cmd.subcommands).forEach(([sub, desc]) => {
        console.log(`  ${sub.padEnd(12)} ${desc}`);
      });
      console.log('');
    }
  }
}

// Run CLI if called directly
if (require.main === module) {
  const cli = new CLI();
  const args = process.argv.slice(2);

  try {
    cli.run(args);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

module.exports = CLI;

