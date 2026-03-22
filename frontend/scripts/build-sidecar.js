import { execSync } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getRustHost() {
  try {
    const output = execSync('rustc -vV', { encoding: 'utf-8' });
    const hostLine = output.split('\n').find(line => line.startsWith('host:'));
    return hostLine ? hostLine.replace('host: ', '').trim() : null;
  } catch (e) {
    return null;
  }
}

const frontendDir = path.resolve(__dirname, '..');
const backendDir = path.resolve(frontendDir, '../backend');
const binDir = path.resolve(frontendDir, 'tauri/bin');

if (!existsSync(binDir)) {
  mkdirSync(binDir, { recursive: true });
}

/**
 * 核心逻辑：确定需要构建的目标列表
 */
const targets = [];
const currentHost = getRustHost();

if (process.platform === 'darwin') {
  // 在 macOS 上，为了保险起见，我们同时构建 intel 和 arm64 版本
  // 这解决了 Node.js 在 Rosetta 模式下运行但 Tauri 需要原生架构的问题
  targets.push('x86_64-apple-darwin');
  targets.push('aarch64-apple-darwin');
} else if (currentHost) {
  targets.push(currentHost);
} else {
  // 其他平台的保底方案
  const arch = process.arch === 'arm64' ? 'aarch64' : (process.arch === 'x64' ? 'x86_64' : process.arch);
  const platform = process.platform === 'win32' ? 'pc-windows-msvc' : 'unknown-linux-gnu';
  targets.push(`${arch}-${platform}`);
}

// 去重
const uniqueTargets = [...new Set(targets)];

for (const target of uniqueTargets) {
  const extension = target.includes('windows') ? '.exe' : '';
  const outPath = path.join(binDir, `vstable-engine-${target}${extension}`);

  console.log(`Building Go sidecar for target: ${target}...`);

  const goEnv = { ...process.env };
  // 映射 Go 的架构名称
  if (target.startsWith('aarch64')) goEnv.GOARCH = 'arm64';
  else if (target.startsWith('x86_64')) goEnv.GOARCH = 'amd64';
  
  // 映射 Go 的系统名称
  if (target.includes('apple-darwin')) goEnv.GOOS = 'darwin';
  else if (target.includes('windows')) goEnv.GOOS = 'windows';
  else if (target.includes('linux')) goEnv.GOOS = 'linux';

  try {
    execSync(`go build -o "${outPath}" main.go`, {
      cwd: backendDir,
      stdio: 'inherit',
      env: goEnv
    });
    console.log(`Successfully built: ${outPath}`);
  } catch (error) {
    console.error(`Failed to build sidecar for ${target}:`, error.message);
    // 如果是跨平台编译环境没配好可能会失败，但在 Mac 上编译 Mac 架构通常没问题
  }
}
