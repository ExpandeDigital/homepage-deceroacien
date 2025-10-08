#!/usr/bin/env node
import { cp, mkdir, readdir, rm } from 'fs/promises';
import path from 'path';

const root = process.cwd();
const distDir = path.join(root, 'dist');

const EXCLUDED_DIRS = new Set([
  '.git',
  '.github',
  '.vscode',
  'node_modules',
  'dist',
  'api',
  'scripts',
  'src'
]);

const EXCLUDED_FILES = new Set([
  '.env',
  '.env.example',
  'Dockerfile',
  'cloudbuild.yaml',
  'package.json',
  'package-lock.json',
  'postcss.config.cjs',
  'tailwind.config.js',
  'README.md',
  'README-PLATAFORMA.md',
  'README-FULL-ACCESS.md',
  'README-MERCADOPAGO.md'
]);

function shouldInclude(srcPath) {
  const relative = path.relative(root, srcPath);
  if (!relative || relative === '') return true;
  const parts = relative.split(path.sep);
  if (EXCLUDED_DIRS.has(parts[0])) return false;
  if (EXCLUDED_FILES.has(relative)) return false;
  return true;
}

async function copyEntry(entryName) {
  const src = path.join(root, entryName);
  if (!shouldInclude(src)) return;
  const dest = path.join(distDir, entryName);
  await cp(src, dest, {
    recursive: true,
    dereference: false,
    filter: (srcPath) => shouldInclude(srcPath)
  });
}

async function main() {
  await rm(distDir, { recursive: true, force: true });
  await mkdir(distDir, { recursive: true });
  const entries = await readdir(root);
  await Promise.all(entries.map(copyEntry));
  console.log('[build-static] Dist actualizada en', distDir);
}

main().catch((err) => {
  console.error('[build-static] Error:', err);
  process.exit(1);
});
