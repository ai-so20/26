import { mkdir, copyFile, readdir } from 'node:fs/promises';
await mkdir('dist/domain', { recursive: true });
for (const file of await readdir('public')) await copyFile('public/' + file, 'dist/' + file);
await copyFile('src/domain/process.mjs', 'dist/domain/process.mjs');
console.log('Static web build complete');
