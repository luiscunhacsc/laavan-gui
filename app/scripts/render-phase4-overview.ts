import {readFile,writeFile} from 'node:fs/promises';
import {Resvg} from '@resvg/resvg-js';
const path='../docs/phase-4-diagrams/overview';
await writeFile(path+'.png',new Resvg(await readFile(path+'.svg','utf8'),{font:{loadSystemFonts:true}}).render().asPng());
