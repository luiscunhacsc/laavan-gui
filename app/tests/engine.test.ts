import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

test('the locked webR entry loads under browser module rules and starts a PostMessage worker',()=>{
  const result=execFileSync(process.execPath,[
    '--experimental-vm-modules',fileURLToPath(new URL('../scripts/check-engine-browser.mjs',import.meta.url)),
  ],{encoding:'utf8',timeout:15000,windowsHide:true});
  assert.match(result,/PASS: integrity-checked browser engine/);
});
