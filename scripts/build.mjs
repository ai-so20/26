import { mkdir, copyFile, cp, rm } from 'node:fs/promises';
await rm('dist',{recursive:true,force:true});
await mkdir('dist/domain',{recursive:true});
await cp('public','dist',{recursive:true});
await copyFile('src/domain/process.mjs','dist/domain/process.mjs');
console.log('Web build complete');
