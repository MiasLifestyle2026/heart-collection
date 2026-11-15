import {mkdir,copyFile,rm} from 'node:fs/promises';
import {resolve,join} from 'node:path';
const project=resolve(import.meta.dirname,'..');
const root=resolve(project,'..');
const out=join(project,'www');

// Rebuild the embedded web app from scratch to avoid packaging cached legacy screens.
await rm(out,{recursive:true,force:true});
await mkdir(out,{recursive:true});
for(const file of [
  'index.html','prototype.js','prototype.css','cards.js','love-laughs-cards.js',
  'interface.js','firebase-config.js','manifest.webmanifest','icon.svg'
]){
  await copyFile(join(root,file),join(out,file));
}
console.log('Prepared luxury Heart Collection Android UI with both decks and native couple mode.');

// Do not unlock premium client-side: installable APKs can be copied and modified.
if(process.env.HEART_CLOSED_TEST==='1'){
  throw new Error('Closed-test premium requires server-verified entitlements; local premium unlock disabled.');
}
