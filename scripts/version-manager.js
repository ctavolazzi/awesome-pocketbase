#!/usr/bin/env node
/**
 * Version Manager - SECURITY HARDENED
 * Handles version tracking, history, and metadata for cursor-coding-protocols
 * Part of the Self-Improving Versioning System
 * 
 * Security Features:
 * - Input validation on all user inputs
 * - Path traversal protection
 * - Version string validation
 * - JSON schema validation
 * - Race condition protection
 * - Secure error handling
 */

const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

// Security: Valid environment values (whitelist)
const VALID_ENVIRONMENTS = ['production', 'development', 'testing', 'staging'];

// Security: Semantic versioning regex (strict)
const VERSION_REGEX = /^v?\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?(\+[a-zA-Z0-9.-]+)?$/;

/**
 * Validate version string format
 * @throws {Error} If version is invalid
 */
function validateVersion(version) {
  if (typeof version !== 'string') {
    throw new Error('Version must be a string');
  }
  
  const cleaned = version.trim();
  if (!VERSION_REGEX.test(cleaned)) {
    throw new Error(
      'Invalid version format. Must follow semantic versioning (e.g., 2.0.0, 2.0.0-beta.1)'
    );
  }
  
  return cleaned.replace(/^v/, ''); // Remove leading 'v' if present
}

/**
 * Validate environment string
 * @throws {Error} If environment is invalid
 */
function validateEnvironment(env) {
  if (typeof env !== 'string') {
    throw new Error('Environment must be a string');
  }
  
  const cleaned = env.trim().toLowerCase();
  if (!VALID_ENVIRONMENTS.includes(cleaned)) {
    throw new Error(
      `Invalid environment. Must be one of: ${VALID_ENVIRONMENTS.join(', ')}`
    );
  }
  
  return cleaned;
}

/**
 * Validate package.json structure
 * @throws {Error} If structure is invalid
 */
function validatePackageJson(data) {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    throw new Error('package.json must be a JSON object');
  }
  
  if (data.version !== undefined) {
    if (typeof data.version !== 'string') {
      throw new Error('package.json version must be a string');
    }
    // Validate version format
    validateVersion(data.version);
  }
  
  return data;
}

/**
 * Validate version info structure
 * @throws {Error} If structure is invalid
 */
function validateVersionInfo(data) {
  if (typeof data !== 'object' || data === null) {
    throw new Error('Version info must be a JSON object');
  }
  
  // Required fields
  const required = ['version', 'installed', 'updated', 'installationId'];
  for (const field of required) {
    if (!(field in data)) {
      throw new Error(`Missing required field: ${field}`);
    }
  }
  
  // Validate types
  if (typeof data.version !== 'string') throw new Error('version must be string');
  if (typeof data.installed !== 'string') throw new Error('installed must be string');
  if (typeof data.updated !== 'string') throw new Error('updated must be string');
  if (typeof data.installationId !== 'string') throw new Error('installationId must be string');
  
  // Validate dates
  if (isNaN(Date.parse(data.installed))) {
    throw new Error('installed must be valid ISO date');
  }
  if (isNaN(Date.parse(data.updated))) {
    throw new Error('updated must be valid ISO date');
  }
  
  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(data.installationId)) {
    throw new Error('installationId must be valid UUID');
  }
  
  // Validate version format
  validateVersion(data.version);
  
  // Validate optional fields
  if (data.environment !== undefined) {
    validateEnvironment(data.environment);
  }
  
  if (data.history !== undefined && !Array.isArray(data.history)) {
    throw new Error('history must be an array');
  }
  
  return data;
}

class VersionManager {
  constructor(options = {}) {
    // Security: Resolve and validate root directory
    const candidateRoot = options.rootDir
      ? path.resolve(options.rootDir)
      : path.resolve(__dirname, '..');

    if (!fs.existsSync(candidateRoot) || !fs.statSync(candidateRoot).isDirectory()) {
      throw new Error('Invalid cursor-protocols root directory');
    }
    
    // Security: Validate we're in a legitimate cursor-protocols directory
    const expectedFiles = options.expectedFiles || ['AGENTS.md', 'README.md', 'install.sh'];
    const hasExpectedFiles = expectedFiles.some(file =>
      fs.existsSync(path.join(candidateRoot, file))
    );
    
    if (!hasExpectedFiles && !options.allowEmptyRoot) {
      throw new Error(
        'Invalid cursor-protocols installation directory. ' +
        'Expected files not found.'
      );
    }
    
    this.rootDir = candidateRoot;
    
    // Security: Use validated paths
    const versionFileName = options.versionFileName || '.cursor-protocols-version.json';
    const packageFileName = options.packageFileName || 'package.json';
    this.versionFile = this._validatePath(versionFileName);
    this.packageFile = this._validatePath(packageFileName);
  }

  /**
   * Security: Validate file path to prevent traversal attacks
   * @private
   * @throws {Error} If path is invalid or attempts traversal
   */
  _validatePath(relativePath) {
    if (typeof relativePath !== 'string') {
      throw new Error('Path must be a string');
    }
    
    // Security: Construct and normalize path
    const fullPath = path.join(this.rootDir, relativePath);
    const normalized = path.normalize(fullPath);
    
    // Security: Prevent path traversal
    const rootWithSep = this.rootDir.endsWith(path.sep) ? this.rootDir : `${this.rootDir}${path.sep}`;
    if (!(normalized === this.rootDir || normalized.startsWith(rootWithSep))) {
      throw new Error('Path traversal detected - access denied');
    }
    
    // Security: Prevent access to hidden directories
    const relativePart = path.relative(this.rootDir, normalized);
    const segments = relativePart.split(path.sep).filter(Boolean);
    const disallowedHidden = segments.some(segment => {
      if (!segment.startsWith('.')) return false;
      return !segment.startsWith('.cursor');
    });
    if (disallowedHidden) {
      throw new Error('Access to hidden directories not allowed');
    }
    
    return normalized;
  }

  /**
   * Security: Safe error logging
   * @private
   */
  _logError(userMessage, technicalError) {
    if (process.env.NODE_ENV === 'development') {
      console.error(`❌ ${userMessage}:`, technicalError.message);
    } else {
      console.error(`❌ ${userMessage}`);
    }
  }

  /**
   * Initialize version tracking for a new installation
   * Security: Atomic operation with exclusive file creation
   */
  async initialize(options = {}) {
    try {
      // Security: Validate environment
      const environment = options.environment 
        ? validateEnvironment(options.environment)
        : 'production';
      
      // Security: Use exclusive file creation to prevent race conditions
      let fd;
      try {
        fd = await fsPromises.open(this.versionFile, 'wx'); // 'wx' = exclusive create
      } catch (error) {
        if (error.code === 'EEXIST') {
          console.log('⚠️  Version tracking already initialized');
          return this.getVersionInfo();
        }
        throw error;
      }
      
      const version = await this.detectVersion();
      const versionInfo = {
        version: version,
        installed: new Date().toISOString(),
        updated: new Date().toISOString(),
        installationId: this.generateInstallationId(),
        environment: environment,
        updateChannel: options.updateChannel || 'stable',
        telemetryEnabled: Boolean(options.telemetryEnabled), // Security: Force boolean
        history: []
      };

      await fd.writeFile(JSON.stringify(versionInfo, null, 2));
      await fd.close();
      
      console.log(`✅ Version tracking initialized: v${version}`);
      return versionInfo;
      
    } catch (error) {
      this._logError('Failed to initialize version tracking', error);
      throw error;
    }
  }

  /**
   * Initialize (sync version for backwards compatibility)
   */
  initializeSync(options = {}) {
    try {
      // Check if already exists
      if (fs.existsSync(this.versionFile)) {
        console.log('⚠️  Version tracking already initialized');
        return this.getVersionInfo();
      }
      
      // Security: Validate environment
      const environment = options.environment 
        ? validateEnvironment(options.environment)
        : 'production';
      
      const version = this.detectVersion();
      const versionInfo = {
        version: version,
        installed: new Date().toISOString(),
        updated: new Date().toISOString(),
        installationId: this.generateInstallationId(),
        environment: environment,
        updateChannel: options.updateChannel || 'stable',
        telemetryEnabled: Boolean(options.telemetryEnabled),
        history: []
      };

      this.saveVersionInfo(versionInfo);
      console.log(`✅ Version tracking initialized: v${version}`);
      return versionInfo;
      
    } catch (error) {
      this._logError('Failed to initialize version tracking', error);
      return null;
    }
  }

  /**
   * Detect current version from package.json or fallback
   * Security: Validates JSON structure and version format
   */
  detectVersion() {
    try {
      if (fs.existsSync(this.packageFile)) {
        const content = fs.readFileSync(this.packageFile, 'utf8');
        
        // Security: Parse and validate JSON
        let pkg;
        try {
          pkg = JSON.parse(content);
          pkg = validatePackageJson(pkg);
        } catch (parseError) {
          this._logError('Malformed package.json, using default version', parseError);
          return '2.0.0';
        }
        
        if (pkg.version) {
          // Security: Validate version format
          try {
            return validateVersion(pkg.version);
          } catch (versionError) {
            this._logError('Invalid version in package.json', versionError);
            return '2.0.0';
          }
        }
      }
    } catch (error) {
      this._logError('Could not read package.json', error);
    }

    // Fallback to 2.0.0 based on current state
    return '2.0.0';
  }

  /**
   * Generate anonymous installation ID
   * Security: Uses cryptographically secure random UUID
   */
  generateInstallationId() {
    return crypto.randomUUID();
  }

  /**
   * Get current version information
   * Security: Validates structure before returning
   */
  getVersionInfo() {
    if (!fs.existsSync(this.versionFile)) {
      return null;
    }

    try {
      const content = fs.readFileSync(this.versionFile, 'utf8');
      const data = JSON.parse(content);
      
      // Security: Validate structure
      return validateVersionInfo(data);
    } catch (error) {
      this._logError('Error reading version file', error);
      return null;
    }
  }

  /**
   * Save version information
   * Security: Validates before saving
   */
  saveVersionInfo(versionInfo) {
    try {
      // Security: Validate structure before saving
      validateVersionInfo(versionInfo);
      
      fs.writeFileSync(
        this.versionFile,
        JSON.stringify(versionInfo, null, 2),
        'utf8'
      );
      return true;
    } catch (error) {
      this._logError('Error saving version file', error);
      return false;
    }
  }

  /**
   * Get current version string
   */
  getCurrentVersion() {
    const info = this.getVersionInfo();
    return info ? info.version : 'unknown';
  }

  /**
   * Check if version tracking is initialized
   */
  isInitialized() {
    return fs.existsSync(this.versionFile);
  }

  /**
   * Update to a new version
   * Security: Validates version format
   */
  updateVersion(newVersion) {
    try {
      // Security: Validate version format
      const validatedVersion = validateVersion(newVersion);
      
      const info = this.getVersionInfo();
      if (!info) {
        console.error('❌ Version tracking not initialized');
        return false;
      }

      // Add current version to history
      info.history.push({
        version: info.version,
        installed: info.installed,
        updated: info.updated
      });

      // Update to new version
      info.version = validatedVersion;
      info.updated = new Date().toISOString();

      this.saveVersionInfo(info);
      console.log(`✅ Updated to version ${validatedVersion}`);
      return true;
    } catch (error) {
      this._logError('Failed to update version', error);
      return false;
    }
  }

  /**
   * Get version history
   */
  getHistory() {
    const info = this.getVersionInfo();
    return info ? info.history : [];
  }

  /**
   * Display version information (for CLI)
   */
  display(format = 'pretty') {
    const info = this.getVersionInfo();

    if (!info) {
      console.log('❌ Version tracking not initialized');
      console.log('Run: cursor-protocols version init');
      return;
    }

    if (format === 'json') {
      console.log(JSON.stringify(info, null, 2));
      return;
    }

    console.log('\n📦 cursor-coding-protocols');
    console.log('─────────────────────────────────────');
    console.log(`Version:         v${info.version}`);
    console.log(`Installed:       ${new Date(info.installed).toLocaleString()}`);
    console.log(`Last Updated:    ${new Date(info.updated).toLocaleString()}`);
    console.log(`Environment:     ${info.environment}`);
    console.log(`Update Channel:  ${info.updateChannel}`);
    console.log(`Telemetry:       ${info.telemetryEnabled ? '✅ Enabled' : '❌ Disabled'}`);
    console.log(`Installation ID: ${info.installationId.substring(0, 8)}...`);

    if (info.history.length > 0) {
      console.log('\nVersion History:');
      info.history.forEach((h, i) => {
        console.log(`  ${i + 1}. v${h.version} (${new Date(h.updated).toLocaleDateString()})`);
      });
    }
    console.log('─────────────────────────────────────\n');
  }

  /**
   * Compare two version strings
   * Security: Validates version format, handles pre-release
   * Returns: -1 if v1 < v2, 0 if equal, 1 if v1 > v2
   */
  compareVersions(v1, v2) {
    try {
      // Security: Validate both versions
      const version1 = validateVersion(v1);
      const version2 = validateVersion(v2);
      
      // Split into [major.minor.patch, prerelease, build]
      const [ver1Main, ...ver1Rest] = version1.split(/[-+]/);
      const [ver2Main, ...ver2Rest] = version2.split(/[-+]/);
      
      // Compare main version numbers
      const parts1 = ver1Main.split('.').map(Number);
      const parts2 = ver2Main.split('.').map(Number);
      
      // Security: Validate all parts are valid numbers
      if (parts1.some(isNaN) || parts2.some(isNaN)) {
        throw new Error('Invalid version numbers');
      }
      
      const maxLength = Math.max(parts1.length, parts2.length);
      for (let i = 0; i < maxLength; i++) {
        const part1 = parts1[i] || 0;
        const part2 = parts2[i] || 0;
        
        if (part1 > part2) return 1;
        if (part1 < part2) return -1;
      }
      
      // If main versions are equal, compare pre-release
      // Version without pre-release is GREATER than one with it
      const ver1Pre = ver1Rest.find(r => !version1.includes('+' + r));
      const ver2Pre = ver2Rest.find(r => !version2.includes('+' + r));
      
      if (!ver1Pre && ver2Pre) return 1;
      if (ver1Pre && !ver2Pre) return -1;
      if (ver1Pre && ver2Pre) {
        return ver1Pre.localeCompare(ver2Pre);
      }
      
      return 0;
    } catch (error) {
      this._logError('Error comparing versions', error);
      return 0;
    }
  }

  /**
   * Check if a version is newer than current
   */
  isNewerVersion(version) {
    try {
      const current = this.getCurrentVersion();
      return this.compareVersions(version, current) > 0;
    } catch (error) {
      this._logError('Error checking version', error);
      return false;
    }
  }

  /**
   * Enable/disable telemetry
   */
  setTelemetry(enabled) {
    try {
      const info = this.getVersionInfo();
      if (!info) {
        console.error('❌ Version tracking not initialized');
        return false;
      }

      // Security: Force boolean
      info.telemetryEnabled = Boolean(enabled);
      this.saveVersionInfo(info);
      console.log(`✅ Telemetry ${enabled ? 'enabled' : 'disabled'}`);
      return true;
    } catch (error) {
      this._logError('Failed to update telemetry setting', error);
      return false;
    }
  }

  /**
   * Get telemetry status
   */
  getTelemetryStatus() {
    const info = this.getVersionInfo();
    return info ? Boolean(info.telemetryEnabled) : false;
  }
}

// CLI Interface
if (require.main === module) {
  const manager = new VersionManager();
  const args = process.argv.slice(2);
  const command = args[0];

  try {
    switch (command) {
      case 'init':
        // Security: Validate environment
        const env = args[1] ? validateEnvironment(args[1]) : undefined;
        manager.initializeSync({ environment: env });
        break;

      case 'show':
      case 'info':
        manager.display(args[1]);
        break;

      case 'current':
        console.log(manager.getCurrentVersion());
        break;

      case 'history':
        const history = manager.getHistory();
        if (history.length === 0) {
          console.log('No version history');
        } else {
          console.log('\nVersion History:');
          history.forEach((h, i) => {
            console.log(`${i + 1}. v${h.version} (${new Date(h.updated).toLocaleDateString()})`);
          });
        }
        break;

      case 'update':
        if (!args[1]) {
          console.error('❌ Please specify version: version update <version>');
          process.exit(1);
        }
        // Security: Version validation happens in updateVersion()
        manager.updateVersion(args[1]);
        break;

      case 'telemetry':
        const subCommand = args[1];
        if (subCommand === 'enable') {
          manager.setTelemetry(true);
        } else if (subCommand === 'disable') {
          manager.setTelemetry(false);
        } else if (subCommand === 'status') {
          const status = manager.getTelemetryStatus();
          console.log(`Telemetry: ${status ? '✅ Enabled' : '❌ Disabled'}`);
        } else {
          console.log('Usage: version telemetry [enable|disable|status]');
        }
        break;

      default:
        console.log(`
cursor-coding-protocols Version Manager (SECURITY HARDENED)

Usage:
  node version-manager.js <command> [options]

Commands:
  init [env]           Initialize version tracking (env: production|development|testing)
  show [json]          Display version information (json for JSON format)
  info [json]          Alias for 'show'
  current              Display current version number only
  history              Show version history
  update <version>     Update to a new version (validates format)
  telemetry <action>   Manage telemetry (enable|disable|status)

Security Features:
  ✅ Input validation on all commands
  ✅ Version format validation (semantic versioning)
  ✅ Path traversal protection
  ✅ JSON schema validation
  ✅ Race condition protection
  ✅ Secure error handling

Examples:
  node version-manager.js init production
  node version-manager.js show
  node version-manager.js update 2.1.0
  node version-manager.js telemetry enable
        `);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (process.env.NODE_ENV === 'development') {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

module.exports = VersionManager;

// Export validation functions for testing
module.exports.validateVersion = validateVersion;
module.exports.validateEnvironment = validateEnvironment;
module.exports.validatePackageJson = validatePackageJson;
module.exports.validateVersionInfo = validateVersionInfo;
