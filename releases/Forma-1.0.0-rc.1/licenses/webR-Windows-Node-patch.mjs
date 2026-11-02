// webR 0.6.0 passes Windows drive paths directly to import(). Node requires file: URLs.
// Only the Node test runner needs this compatibility correction; browser files stay upstream.
import {readFile, writeFile} from 'node:fs/promises';
const paths = ['spike/node_modules/webr/dist/webr.mjs', 'spike/node_modules/webr/dist/webr-worker.js'];
for (const path of paths) {
  let text = await readFile(path, 'utf8');
  const original = /await import\(\(await import\("path"\)\)\.default\.resolve\(([re])\)\)/g;
  let count = 0;
  text = text.replace(original, (_, variable) => {
    count++;
    return `await import((await import("url")).pathToFileURL((await import("path")).default.resolve(${variable})).href)`;
  });
  if (!count && !text.includes('pathToFileURL((await import("path"))')) throw new Error(`Unexpected upstream code: ${path}`);
  if (count) await writeFile(path, text);
  console.log(`${path}: ${count ? 'corrected Windows import path' : 'already corrected'}`);
}
