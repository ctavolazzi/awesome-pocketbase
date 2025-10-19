#!/usr/bin/env node

import { spawn } from 'child_process';
import { createInterface } from 'readline';

const processes = [];

// Colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  blue: '\x1b[34m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
};

function log(color, prefix, message) {
  console.log(`${color}${prefix}${colors.reset} ${message}`);
}

function cleanup() {
  log(colors.yellow, '[SHUTDOWN]', 'Stopping all services...');
  processes.forEach((proc) => {
    try {
      proc.kill('SIGTERM');
    } catch (err) {
      // Process might already be dead
    }
  });
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

async function waitForServer(url, name, maxAttempts = 30) {
  log(colors.yellow, '[WAIT]', `Waiting for ${name} to start...`);

  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        log(colors.green, '[READY]', `${name} is ready!`);
        return true;
      }
    } catch (err) {
      // Server not ready yet
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  log(colors.red, '[ERROR]', `${name} failed to start within ${maxAttempts} seconds`);
  return false;
}

function startProcess(command, args, name, color) {
  log(color, `[START]`, `Starting ${name}...`);

  const proc = spawn(command, args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: true,
  });

  processes.push(proc);

  proc.stdout.on('data', (data) => {
    const lines = data.toString().trim().split('\n');
    lines.forEach((line) => {
      log(color, `[${name}]`, line);
    });
  });

  proc.stderr.on('data', (data) => {
    const lines = data.toString().trim().split('\n');
    lines.forEach((line) => {
      log(colors.red, `[${name}:ERR]`, line);
    });
  });

  proc.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      log(colors.red, `[EXIT]`, `${name} exited with code ${code}`);
      cleanup();
    }
  });

  return proc;
}

async function main() {
  console.log('\n' + colors.bright + '🚀 PocketBase Demo Launcher' + colors.reset);
  console.log('==========================\n');

  // Start PocketBase
  const pbProc = startProcess(
    './pocketbase',
    ['serve', '--http=127.0.0.1:8090'],
    'PocketBase',
    colors.blue
  );

  const pbReady = await waitForServer('http://127.0.0.1:8090/api/health', 'PocketBase');
  if (!pbReady) {
    cleanup();
    return;
  }

  console.log('');

  // Start API Server
  const serverProc = startProcess(
    'node',
    ['server/index.mjs'],
    'API-Server',
    colors.magenta
  );

  const serverReady = await waitForServer('http://127.0.0.1:3030/healthz', 'API Server');
  if (!serverReady) {
    cleanup();
    return;
  }

  console.log('');

  // Start Web UI
  const uiProc = startProcess(
    'npx',
    ['live-server', '--port=4173', '--entry-file=public/index.html', '--no-browser'],
    'WebUI',
    colors.green
  );

  await new Promise((resolve) => setTimeout(resolve, 2000));

  console.log('\n' + colors.bright + '✨ All services running!' + colors.reset);
  console.log('========================\n');
  console.log(`${colors.blue}📦 PocketBase:${colors.reset}    http://127.0.0.1:8090`);
  console.log(`${colors.magenta}🔧 API Server:${colors.reset}    http://127.0.0.1:3030`);
  console.log(`${colors.green}🌐 Web UI:${colors.reset}        http://localhost:4173`);
  console.log('');
  console.log(`${colors.yellow}📊 Admin Panel:${colors.reset}   http://127.0.0.1:8090/_/`);
  console.log(`${colors.yellow}🔍 Health Check:${colors.reset}  http://127.0.0.1:3030/healthz`);
  console.log('');
  console.log(colors.bright + 'Press Ctrl+C to stop all services' + colors.reset);
  console.log('');

  // Keep running
  await new Promise(() => {});
}

main().catch((err) => {
  log(colors.red, '[FATAL]', err.message);
  cleanup();
});


