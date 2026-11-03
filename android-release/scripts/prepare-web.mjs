import {mkdir,copyFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
const project=resolve(import.meta.dirname,'..');
const root=resolve(project,'..');
const out=join(project,'www');
await mkdir(out,{recursive:true});
for(const file of ['index.html','app.js','cards.js','love-laughs-cards.js','interface.js','style.css','firebase-config.js','manifest.webmanifest','icon.svg']){
  await copyFile(join(root,file),join(out,file));
}
console.log('Prepared Heart Collection assets for both decks.');
