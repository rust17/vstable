import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function globalTeardown() {
  console.log('\n[Global Teardown] Stopping Go Engine...');
  const pidFile = path.resolve(__dirname, '.engine.pid');
  if (fs.existsSync(pidFile)) {
    const pid = parseInt(fs.readFileSync(pidFile, 'utf8'), 10);
    try {
      process.kill(-pid, 'SIGKILL'); // Kill the whole process group if detached
    } catch (e) {
      try {
        process.kill(pid, 'SIGKILL');
      } catch (err) {}
    }
    fs.unlinkSync(pidFile);
  }

  console.log('[Global Teardown] Stopping Docker containers...');
  execSync('npm run docker:down', { stdio: 'inherit' });
  console.log('[Global Teardown] Cleanup complete.');
}

export default globalTeardown;
