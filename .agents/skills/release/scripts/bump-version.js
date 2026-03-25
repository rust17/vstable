const fs = require('fs');
const path = require('path');

const packageJsonPath = path.resolve(process.cwd(), 'frontend/package.json');
const tauriConfPath = path.resolve(process.cwd(), 'frontend/tauri/tauri.conf.json');

function bump(version) {
  if (!version) {
    console.error('Error: Version is required. Example: node bump-version.js 0.5.4');
    process.exit(1);
  }

  // Update package.json
  if (fs.existsSync(packageJsonPath)) {
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    pkg.version = version;
    fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2) + '\n');
    console.log(`Updated frontend/package.json to version ${version}`);
  } else {
    console.error(`Error: ${packageJsonPath} not found`);
  }

  // Update tauri.conf.json
  if (fs.existsSync(tauriConfPath)) {
    const conf = JSON.parse(fs.readFileSync(tauriConfPath, 'utf8'));
    conf.version = version;
    // Also update bundle version if it exists and matches
    if (conf.bundle && conf.bundle.version) {
        conf.bundle.version = version;
    }
    fs.writeFileSync(tauriConfPath, JSON.stringify(conf, null, 2) + '\n');
    console.log(`Updated frontend/tauri/tauri.conf.json to version ${version}`);
  } else {
    console.error(`Error: ${tauriConfPath} not found`);
  }
}

const newVersion = process.argv[2];
bump(newVersion);
