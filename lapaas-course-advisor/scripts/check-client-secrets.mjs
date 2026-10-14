import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const root = fileURLToPath(new URL('../', import.meta.url));
for (const path of ['.env.local', '.env']) if (existsSync(`${root}${path}`)) process.loadEnvFile(`${root}${path}`);
const key = process.env.GEMINI_API_KEY;
let checked = 0;
async function inspect(directory) {
  for (const file of await readdir(directory, { withFileTypes: true })) {
    const path = `${directory}/${file.name}`;
    if (file.isDirectory()) await inspect(path);
    else if (/\.(?:js|jsx|css|html|json)$/.test(file.name)) {
      const content = await readFile(path, 'utf8'); checked++;
      assert.ok(!/AIza[\w-]{30,}/.test(content), 'Key-like text found in client files');
      if (key && key.length > 8) assert.ok(!content.includes(key), 'Configured API key found in client files');
    }
  }
}
await inspect(`${root}src`);
await inspect(`${root}dist`);
const ignore = await readFile(`${root}.gitignore`, 'utf8');
assert.ok(ignore.includes('.env\n') && ignore.includes('.env.*\n') && ignore.includes('!.env.example'));
console.log(`Client secret scan passed for ${checked} source/build files. Environment values were not displayed.`);
