import { execSync } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

try {
  // 1. Get Rust target triple
  const rustcOutput = execSync('rustc -vV', { encoding: 'utf-8' });
  const match = rustcOutput.match(/host: (.+)/);
  if (!match || !match[1]) {
    throw new Error('Could not find host triple in rustc output');
  }
  const targetTriple = match[1].trim();
  console.log(`Detected target triple: ${targetTriple}`);

  // 2. Prepare paths
  // __dirname is 'frontend/scripts', so backend is '../../backend'
  const backendDir = path.resolve(__dirname, '../../backend');
  const binDir = path.resolve(__dirname, '../tauri/bin');
  if (!existsSync(binDir)) {
    mkdirSync(binDir, { recursive: true });
  }

  // 3. Determine output filename
  const isWindows = targetTriple.includes('windows');
  const ext = isWindows ? '.exe' : '';
  const outPath = path.join(binDir, `vstable-engine-${targetTriple}${ext}`);

  // 4. Run go build
  console.log(`Building Go sidecar for ${targetTriple}...`);
  // Ensure we build exactly where backend main.go is.
  execSync(`go build -o "${outPath}" main.go`, {
    cwd: backendDir,
    stdio: 'inherit'
  });

  console.log(`Successfully built sidecar at ${outPath}`);
} catch (error) {
  console.error('Failed to build sidecar:', error);
  process.exit(1);
}
