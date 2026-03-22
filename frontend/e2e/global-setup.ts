import { execSync, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import waitOn from 'wait-on';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function globalSetup() {
  console.log('\n[Global Setup] Starting Docker containers...');
  execSync('npm run docker:up', { stdio: 'inherit' });

  const enginePath = path.resolve(__dirname, '../../backend/vstable-engine');

  console.log('[Global Setup] Building Go Engine...');
  try {
    execSync('go build -o vstable-engine main.go', {
      cwd: '../backend',
      stdio: 'inherit',
    });
    console.log('[Global Setup] Go Engine built.');
  } catch (error) {
    console.error('[Global Setup] Failed to build Go Engine:', error);
    process.exit(1);
  }

  console.log('[Global Setup] Starting Go Engine in background...');
  const logFile = fs.openSync(path.resolve(__dirname, 'engine.log'), 'a');
  const engineProcess = spawn(enginePath, [], {
    detached: true,
    stdio: ['ignore', logFile, logFile],
    cwd: path.resolve(__dirname, '../../backend'),
  });
  engineProcess.unref();

  if (engineProcess.pid) {
    fs.writeFileSync(path.resolve(__dirname, '.engine.pid'), engineProcess.pid.toString());
    console.log(`[Global Setup] Go Engine started with PID: ${engineProcess.pid}`);
  }

  console.log('[Global Setup] Waiting for databases and engine to be ready...');
  try {
    await waitOn({
      resources: [
        'tcp:localhost:5433', // PostgreSQL
        'tcp:localhost:3307', // MySQL
        'tcp:localhost:39082', // Go Engine gRPC
      ],
      timeout: 60000,
    });
    console.log(
      '[Global Setup] Ports are open. Waiting 5 seconds for databases to fully initialize...'
    );
    await new Promise((resolve) => setTimeout(resolve, 5000));
    console.log('[Global Setup] Infrastructure is ready.');
  } catch (error) {
    console.error('[Global Setup] Timed out waiting for infrastructure:', error);
    process.exit(1);
  }
}

export default globalSetup;
