import { execSync } from 'child_process';
import waitOn from 'wait-on';

async function globalSetup() {
  console.log('\n[Global Setup] Starting Docker containers...');
  execSync('npm run docker:up', { stdio: 'inherit' });

  console.log('[Global Setup] Building Go Engine...');
  try {
    // appDir is frontend/, so backend is at ../backend
    execSync('go build -o quickpg-engine main.go', { 
      cwd: '../backend',
      stdio: 'inherit' 
    });
    console.log('[Global Setup] Go Engine built.');
  } catch (error) {
    console.error('[Global Setup] Failed to build Go Engine:', error);
    process.exit(1);
  }

  console.log('[Global Setup] Waiting for databases to be ready...');
  try {
    await waitOn({
      resources: [
        'tcp:localhost:5433', // PostgreSQL
        'tcp:localhost:3307', // MySQL
      ],
      timeout: 60000, // 60 seconds
    });
    console.log('[Global Setup] Ports are open. Waiting 5 seconds for databases to fully initialize...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    console.log('[Global Setup] Databases are ready.');
  } catch (error) {
    console.error('[Global Setup] Timed out waiting for databases:', error);
    process.exit(1);
  }
}

export default globalSetup;
