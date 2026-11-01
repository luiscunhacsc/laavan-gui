import {Resvg} from '@resvg/resvg-js';
import {readFile,writeFile,readdir} from 'node:fs/promises';
const directory = process.argv[2] || 'docs/references';
let status;
try { status = JSON.parse(await readFile(`${directory}/status.json`, 'utf8')); }
catch(error) { if (error.code !== 'ENOENT') throw error; }
for (const name of await readdir(directory)) {
  if (!name.endsWith('.svg')) continue;
  if (status?.[name.replace('.svg','')]?.ok === false) continue;
  const svg = await readFile(`${directory}/${name}`);
  const png = new Resvg(svg,{font:{loadSystemFonts:true},fitTo:{mode:'original'}}).render().asPng();
  await writeFile(`${directory}/${name.replace('.svg','.png')}`,png);
  console.log(name);
}
