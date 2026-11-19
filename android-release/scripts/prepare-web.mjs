import {mkdir,copyFile,rm,readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {resolve,join} from 'node:path';
const project=resolve(import.meta.dirname,'..');
const root=resolve(project,'..');
const out=join(project,'www');

// Rebuild the embedded web app from scratch to avoid packaging cached legacy screens.
await rm(out,{recursive:true,force:true});
await mkdir(out,{recursive:true});
for(const file of [
  'index.html','prototype.js','prototype.css','cards.js','love-laughs-cards.js',
  'translations-it.js','translations-ko.js','translations-pl.js','translations-nl.js','translations-tr.js',
  'translations-ui-extra.js','interface.js','firebase-config.js','manifest.webmanifest','icon.svg'
]){
  await copyFile(join(root,file),join(out,file));
}
// Fail the Android build if any advertised language or translated card is missing.
const testContext=vm.createContext({window:{}});
for(const file of ['cards.js','love-laughs-cards.js','translations-it.js','translations-ko.js','translations-pl.js','translations-nl.js','translations-tr.js','translations-ui-extra.js']){
  vm.runInContext(await readFile(join(out,file),'utf8'),testContext,{filename:file,timeout:10000});
}
const languages=['de','en','es','fr','zh','ur','hi','ar','it','ko','pl','nl','tr'];
const decks=[testContext.window.HEART_CARDS,testContext.window.HEART_FUN_CARDS];
for(const deck of decks){
  if(!Array.isArray(deck)||deck.length!==110)throw new Error('Expected 110 questions in each deck');
  for(let i=0;i<110;i++){
    if(Number(deck[i].id)!==i+1)throw new Error('Question IDs must remain in order 1–110');
    for(const language of languages){
      if(typeof deck[i][language]!=='string'||!deck[i][language].trim()){
        throw new Error('Missing question '+(i+1)+' in language '+language);
      }
    }
  }
}
for(const language of ['it','ko','pl','nl','tr']){
  const ui=testContext.window.HEART_EXTRA_UI?.[language];
  if(!ui||ui.deepCategories.length!==7||ui.funCategories.length!==7)throw new Error('Missing localized menu/category labels for '+language);
}
console.log('Verified: 220 questions x 13 languages; all five added UI translations and category sets.');

// Do not unlock premium client-side: installable APKs can be copied and modified.
if(process.env.HEART_CLOSED_TEST==='1'){
  throw new Error('Closed-test premium requires server-verified entitlements; local premium unlock disabled.');
}
