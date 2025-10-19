#!/usr/bin/env node

/**
 * Comprehensive Startup Script with Pre-flight Checks
 * Runs tests, validates environment, and starts all services
 */

import { spawn } from 'child_process';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const PORTS = {
  pocketbase: 8090,
  express: 3030,
  frontend: 4173,
  ollama: 11434
};

const SERVICES = [];
let startupErrors = [];
let startupWarnings = [];

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('');
  log('═'.repeat(70), 'cyan');
  log(`  ${title}`, 'bright');
  log('═'.repeat(70), 'cyan');
  console.log('');
}

// Check if port is in use
async function checkPort(port, name) {
  return new Promise((resolve) => {
    const { exec } = require('child_process');
    exec(`lsof -ti:${port}`, (error, stdout) => {
      if (stdout.trim()) {
        log(`⚠️  Port ${port} (${name}) is already in use`, 'yellow');
        log(`   Killing existing process...`, 'yellow');
        exec(`kill -9 ${stdout.trim()}`, () => {
          setTimeout(() => resolve(true), 1000);
        });
      } else {
        resolve(true);
      }
    });
  });
}

// Run tests
async function runTests() {
  logSection('🧪 RUNNING PRE-FLIGHT TESTS');

  return new Promise((resolve) => {
    const testProcess = spawn('npm', ['run', 'test:server'], {
      cwd: __dirname,
      stdio: 'pipe'
    });

    let output = '';
    let passed = 0;
    let failed = 0;

    testProcess.stdout.on('data', (data) => {
      const str = data.toString();
      output += str;

      // Count passing tests
      if (str.includes('✔')) {
        passed++;
        process.stdout.write(colors.green + '✔' + colors.reset);
      }
      if (str.includes('✖')) {
        failed++;
        process.stdout.write(colors.red + '✖' + colors.reset);
      }
    });

    testProcess.stderr.on('data', (data) => {
      output += data.toString();
    });

    testProcess.on('close', (code) => {
      console.log('');

      if (code === 0) {
        log(`✅ All tests passed (${passed} tests)`, 'green');
        resolve({ success: true, passed, failed });
      } else {
        log(`❌ Tests failed (${passed} passed, ${failed} failed)`, 'red');
        startupErrors.push(`Tests failed: ${failed} test(s) failing`);

        // Save test output
        writeFileSync(join(__dirname, 'test-errors.log'), output);
        log(`   Test output saved to test-errors.log`, 'yellow');

        resolve({ success: false, passed, failed, output });
      }
    });
  });
}

// Check environment
function checkEnvironment() {
  logSection('🔍 CHECKING ENVIRONMENT');

  const checks = [
    { name: 'Node.js version', check: () => process.version, required: true },
    { name: 'PocketBase binary', check: () => existsSync(join(__dirname, 'pocketbase')), required: true },
    { name: 'package.json', check: () => existsSync(join(__dirname, 'package.json')), required: true },
    { name: 'node_modules', check: () => existsSync(join(__dirname, 'node_modules')), required: true },
    { name: 'Server code', check: () => existsSync(join(__dirname, 'server/index.mjs')), required: true },
    { name: 'Frontend code', check: () => existsSync(join(__dirname, 'public/index.html')), required: true },
    { name: 'env.template', check: () => existsSync(join(__dirname, 'env.template')), required: false },
  ];

  let allPassed = true;

  for (const check of checks) {
    const result = check.check();
    const passed = typeof result === 'boolean' ? result : !!result;

    if (passed) {
      log(`✅ ${check.name}${typeof result === 'string' ? ': ' + result : ''}`, 'green');
    } else {
      if (check.required) {
        log(`❌ ${check.name} - MISSING (REQUIRED)`, 'red');
        startupErrors.push(`Missing required: ${check.name}`);
        allPassed = false;
      } else {
        log(`⚠️  ${check.name} - MISSING (optional)`, 'yellow');
        startupWarnings.push(`Missing optional: ${check.name}`);
      }
    }
  }

  return allPassed;
}

// Check external services
async function checkExternalServices() {
  logSection('🌐 CHECKING EXTERNAL SERVICES');

  // Check Ollama
  try {
    const response = await fetch('http://127.0.0.1:11434/api/tags');
    if (response.ok) {
      const data = await response.json();
      log(`✅ Ollama is running (${data.models?.length || 0} models)`, 'green');

      // Check for llama3.2:3b
      const hasModel = data.models?.some(m => m.name.includes('llama3.2'));
      if (hasModel) {
        log(`   ✓ llama3.2 model found`, 'green');
      } else {
        log(`   ⚠️  llama3.2 model not found`, 'yellow');
        startupWarnings.push('llama3.2 model not available - AI feed may not work');
      }
    }
  } catch (error) {
    log(`⚠️  Ollama not running - AI features will be disabled`, 'yellow');
    startupWarnings.push('Ollama not running - start with: ollama serve');
  }
}

// Start a service
function startService(name, command, args, options = {}) {
  log(`Starting ${name}...`, 'cyan');

  const process = spawn(command, args, {
    cwd: options.cwd || __dirname,
    stdio: options.stdio || 'pipe',
    detached: false
  });

  // Create log files
  if (!existsSync(join(__dirname, 'logs'))) {
    mkdirSync(join(__dirname, 'logs'));
  }

  const logFile = join(__dirname, 'logs', `${name.toLowerCase().replace(/\s/g, '-')}.log`);
  const logStream = require('fs').createWriteStream(logFile, { flags: 'a' });

  if (process.stdout) {
    process.stdout.pipe(logStream);
  }
  if (process.stderr) {
    process.stderr.pipe(logStream);
  }

  process.on('error', (error) => {
    log(`❌ ${name} failed to start: ${error.message}`, 'red');
    startupErrors.push(`${name} failed: ${error.message}`);
  });

  process.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      log(`⚠️  ${name} exited with code ${code}`, 'yellow');
    }
  });

  SERVICES.push({ name, process });
  log(`✅ ${name} started (PID: ${process.pid})`, 'green');

  return process;
}

// Wait for service to be ready
async function waitForService(url, name, maxAttempts = 30) {
  log(`Waiting for ${name} to be ready...`, 'cyan');

  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        log(`✅ ${name} is ready`, 'green');
        return true;
      }
    } catch (error) {
      // Service not ready yet
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
    process.stdout.write('.');
  }

  console.log('');
  log(`❌ ${name} failed to become ready`, 'red');
  startupErrors.push(`${name} not responding at ${url}`);
  return false;
}

// Generate error report page
function generateErrorPage() {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Startup Error - PocketBase Demo</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Courier New', monospace;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 10px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      max-width: 800px;
      width: 100%;
      padding: 40px;
    }
    h1 {
      color: #e74c3c;
      margin-bottom: 20px;
      font-size: 32px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .emoji { font-size: 40px; }
    .section {
      margin: 30px 0;
      padding: 20px;
      background: #f8f9fa;
      border-radius: 5px;
      border-left: 4px solid #e74c3c;
    }
    .section h2 {
      color: #2c3e50;
      margin-bottom: 15px;
      font-size: 20px;
    }
    .error-list, .warning-list {
      list-style: none;
      margin: 10px 0;
    }
    .error-list li {
      padding: 10px;
      margin: 5px 0;
      background: #fee;
      border-left: 3px solid #e74c3c;
      border-radius: 3px;
    }
    .warning-list li {
      padding: 10px;
      margin: 5px 0;
      background: #fffbea;
      border-left: 3px solid #f39c12;
      border-radius: 3px;
    }
    .actions {
      margin-top: 30px;
      display: flex;
      gap: 15px;
      flex-wrap: wrap;
    }
    .btn {
      padding: 12px 24px;
      border: none;
      border-radius: 5px;
      font-family: 'Courier New', monospace;
      font-size: 16px;
      cursor: pointer;
      text-decoration: none;
      display: inline-block;
      transition: transform 0.2s;
    }
    .btn:hover { transform: translateY(-2px); }
    .btn-primary {
      background: #3498db;
      color: white;
    }
    .btn-secondary {
      background: #95a5a6;
      color: white;
    }
    .timestamp {
      color: #7f8c8d;
      font-size: 14px;
      margin-top: 20px;
    }
    code {
      background: #2c3e50;
      color: #ecf0f1;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1><span class="emoji">🚨</span> Startup Failed</h1>
    <p>The PocketBase Demo failed to start properly. Please review the errors below.</p>

    ${startupErrors.length > 0 ? `
    <div class="section">
      <h2>❌ Errors (${startupErrors.length})</h2>
      <ul class="error-list">
        ${startupErrors.map(err => `<li>${err}</li>`).join('')}
      </ul>
    </div>
    ` : ''}

    ${startupWarnings.length > 0 ? `
    <div class="section">
      <h2>⚠️ Warnings (${startupWarnings.length})</h2>
      <ul class="warning-list">
        ${startupWarnings.map(warn => `<li>${warn}</li>`).join('')}
      </ul>
    </div>
    ` : ''}

    <div class="section">
      <h2>🔧 Troubleshooting Steps</h2>
      <ol style="padding-left: 20px; line-height: 1.8;">
        <li>Check that all dependencies are installed: <code>npm install</code></li>
        <li>Verify PocketBase binary exists: <code>./pocketbase --version</code></li>
        <li>Run tests manually: <code>npm run test:server</code></li>
        <li>Check logs in the <code>logs/</code> directory</li>
        <li>Review <code>test-errors.log</code> if tests failed</li>
        <li>Ensure no other services are using ports 3030, 4173, or 8090</li>
      </ol>
    </div>

    <div class="actions">
      <button class="btn btn-primary" onclick="window.location.reload()">
        🔄 Retry Startup
      </button>
      <a href="/logs" class="btn btn-secondary">
        📋 View Logs
      </a>
    </div>

    <p class="timestamp">
      Error occurred at: ${new Date().toISOString()}<br>
      Check logs directory for detailed output
    </p>
  </div>
</body>
</html>`;

  writeFileSync(join(__dirname, 'public', 'startup-error.html'), html);
  return join(__dirname, 'public', 'startup-error.html');
}

// Main startup sequence
async function startup() {
  console.clear();

  logSection('🚀 POCKETBASE DEMO - COMPREHENSIVE STARTUP');
  log('Starting pre-flight checks and service initialization...', 'cyan');

  try {
    // Step 1: Check environment
    const envOk = checkEnvironment();
    if (!envOk) {
      throw new Error('Environment check failed');
    }

    // Step 2: Check external services
    await checkExternalServices();

    // Step 3: Clean up ports
    logSection('🧹 CLEANING UP PORTS');
    await checkPort(PORTS.pocketbase, 'PocketBase');
    await checkPort(PORTS.express, 'Express API');
    await checkPort(PORTS.frontend, 'Frontend');
    log('✅ All ports are clean', 'green');

    // Step 4: Run tests
    const testResult = await runTests();
    if (!testResult.success) {
      throw new Error('Tests failed - aborting startup');
    }

    // Step 5: Start services
    logSection('🎬 STARTING SERVICES');

    // Start PocketBase
    startService(
      'PocketBase',
      join(__dirname, 'pocketbase'),
      ['serve', `--http=127.0.0.1:${PORTS.pocketbase}`]
    );

    await waitForService(`http://127.0.0.1:${PORTS.pocketbase}/api/health`, 'PocketBase');

    // Start Express API
    startService(
      'Express API',
      'node',
      [join(__dirname, 'server/index.mjs')]
    );

    await waitForService(`http://127.0.0.1:${PORTS.express}/healthz`, 'Express API');

    // Start Frontend
    startService(
      'Frontend',
      'npx',
      ['--yes', 'http-server', 'public', '-p', PORTS.frontend.toString(), '--cors', '-c-1']
    );

    await waitForService(`http://localhost:${PORTS.frontend}`, 'Frontend');

    // Start Ollama Feed (optional)
    const ollamaRunning = await fetch('http://127.0.0.1:11434/api/tags')
      .then(r => r.ok)
      .catch(() => false);

    if (ollamaRunning) {
      startService(
        'Ollama Feed',
        'node',
        [join(__dirname, 'ollama-feed.mjs')]
      );
      log('✅ AI feed generator started', 'green');
    } else {
      log('⚠️  Skipping Ollama feed (Ollama not running)', 'yellow');
    }

    // Success!
    logSection('✅ STARTUP COMPLETE');
    log('All services are running successfully!', 'green');
    console.log('');
    log('📊 Service Status:', 'bright');
    log(`   • PocketBase:   http://127.0.0.1:${PORTS.pocketbase}`, 'cyan');
    log(`   • Express API:  http://127.0.0.1:${PORTS.express}`, 'cyan');
    log(`   • Frontend:     http://localhost:${PORTS.frontend}`, 'cyan');
    log(`   • Admin Panel:  http://127.0.0.1:${PORTS.pocketbase}/_/`, 'cyan');
    console.log('');
    log('🎯 Open your browser to: http://localhost:' + PORTS.frontend, 'green');
    console.log('');
    log('📋 Logs are being written to the logs/ directory', 'yellow');
    log('Press Ctrl+C to stop all services', 'yellow');
    console.log('');

  } catch (error) {
    logSection('❌ STARTUP FAILED');
    log(error.message, 'red');

    // Generate error page
    const errorPage = generateErrorPage();
    log(`\n📄 Error report generated: ${errorPage}`, 'yellow');

    // Start minimal server to show error page
    const http = require('http');
    const fs = require('fs');
    const server = http.createServer((req, res) => {
      const html = fs.readFileSync(errorPage, 'utf8');
      res.writeHead(503, { 'Content-Type': 'text/html' });
      res.end(html);
    });

    server.listen(PORTS.frontend, () => {
      log(`\n🌐 Error page available at: http://localhost:${PORTS.frontend}`, 'cyan');
      log('   Open this URL to see detailed error information', 'cyan');
    });

    return;
  }

  // Handle shutdown
  process.on('SIGINT', () => {
    logSection('🛑 SHUTTING DOWN');
    log('Stopping all services...', 'yellow');

    for (const service of SERVICES) {
      try {
        service.process.kill();
        log(`✓ Stopped ${service.name}`, 'green');
      } catch (error) {
        log(`✗ Failed to stop ${service.name}`, 'red');
      }
    }

    log('\n👋 Goodbye!', 'cyan');
    process.exit(0);
  });
}

// Run startup
startup().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

