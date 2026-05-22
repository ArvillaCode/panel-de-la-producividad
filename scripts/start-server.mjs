import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const distIndex = resolve(rootDir, 'dist', 'index.html');
const port = process.env.PORT || '3000';

if (!/^\d+$/.test(port)) {
  console.error(`Invalid PORT value: ${port}`);
  process.exit(1);
}

if (!existsSync(distIndex)) {
  console.error('dist/index.html was not found. Run "npm run build" before starting the production server.');
  process.exit(1);
}

const viteBin = resolve(rootDir, 'node_modules', 'vite', 'bin', 'vite.js');
const child = spawn(process.execPath, [viteBin, 'preview', '--host', '0.0.0.0', '--port', port], {
  cwd: rootDir,
  stdio: 'inherit',
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
