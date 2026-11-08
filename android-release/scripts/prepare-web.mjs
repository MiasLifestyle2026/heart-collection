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

// Never unlock premium using a build flag: APKs can be copied and modified.
if(process.env.HEART_CLOSED_TEST==='1'){
  throw new Error('Closed-test premium requires verified server-side tester entitlements; insecure local unlock is disabled.');
}
