import {copyFile, lstat, mkdir, readdir, realpath, rm, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

// This exporter intentionally has no npm dependencies and never reads runtime
// data, backend source, environment files, or Sites deployment credentials.
const root = await realpath(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'));
const source = path.join(root, 'public');
const output = path.join(root, '.pages-output');
if (path.dirname(output) !== root || path.basename(output) !== '.pages-output') throw new Error('Unexpected Pages output directory.');
if ((await lstat(source)).isSymbolicLink()) throw new Error('public must be a real source directory.');

const forbiddenNames = new Set(['.data', '.git', '.github', '.openai', 'node_modules', 'server', 'drizzle', 'deploy']);
const forbiddenFiles = new Set(['admin.json', 'subscribers.json', 'server.mjs', 'package.json', 'package-lock.json']);
const staticExtensions = new Set(['.html','.css','.js','.mjs','.json','.svg','.png','.jpg','.jpeg','.gif','.webp','.avif','.ico','.mp3','.wav','.m4a','.aac','.ogg','.oga','.flac','.mp4','.webm','.mov','.woff','.woff2','.ttf','.otf','.txt','.wasm','.pdf']);
const files = [];
const skipped = [];
let totalBytes = 0;

async function inspect(directory, relative = '') {
  for (const entry of await readdir(directory, {withFileTypes: true})) {
    const name = entry.name.toLowerCase();
    const local = path.join(relative, entry.name);
    if (entry.name.startsWith('.') || forbiddenNames.has(name) || forbiddenFiles.has(name) || name === 'cname') {
      skipped.push(local);
      continue;
    }
    if (entry.isSymbolicLink()) throw new Error(`Symbolic links cannot be published: ${local}`);
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) await inspect(filename, local);
    else if (entry.isFile()) {
      if (!staticExtensions.has(path.extname(name))) throw new Error(`Unsupported public file type: ${local}`);
      const information = await lstat(filename);
      totalBytes += information.size;
      files.push({source: filename, relative: local});
    } else throw new Error(`Only regular files can be published: ${local}`);
  }
}

await inspect(source);
if (!files.some(file => file.relative === 'index.html')) throw new Error('public/index.html is required.');
if (!files.some(file => file.relative === 'projects.js')) throw new Error('The static projects fallback is required.');
if (!files.some(file => file.relative === path.join('assets', 'audio.json'))) throw new Error('The static audio fallback is required.');
if (totalBytes > 1024 ** 3) throw new Error('The Pages export exceeds 1 GiB. Reduce the published media first.');

try {
  const existing = await lstat(output);
  if (existing.isSymbolicLink() || await realpath(output) !== output) throw new Error('Refusing to replace a linked Pages output directory.');
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
// Only this verified generated directory is replaced; public stays untouched.
await rm(output, {recursive: true, force: true});
await mkdir(output, {recursive: true});
for (const file of files) {
  const destination = path.join(output, file.relative);
  await mkdir(path.dirname(destination), {recursive: true});
  await copyFile(file.source, destination);
}
await writeFile(path.join(output, '.nojekyll'), '');
console.log(JSON.stringify({output: '.pages-output', files: files.length + 1, bytes: totalBytes, cname: false, skipped}, null, 2));
