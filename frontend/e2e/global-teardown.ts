import { execSync } from 'child_process';

async function globalTeardown() {
  console.log('\n[Global Teardown] Stopping Docker containers...');
  execSync('npm run docker:down', { stdio: 'inherit' });
  console.log('[Global Teardown] Docker containers stopped.');
}

export default globalTeardown;
