import { readFile, writeFile } from 'node:fs/promises';
const home = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
await writeFile(new URL('../lib/site-home.ts', import.meta.url), `const home = ${JSON.stringify(home)};\nexport default home;\n`);
