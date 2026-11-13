(()=>{
'use strict';
const $=id=>document.getElementById(id);
const deckData={deep:Array.isArray(window.HEART_CARDS)?window.HEART_CARDS:[],fun:Array.isArray(window.HEART_FUN_CARDS)?window.HEART_FUN_CARDS:[]};
const freeIds=new Set([1,2,3,21,22,23,41,42,43,61,62,63,81,82,83,101,102,103]);
const categories={
  deep:{de:['Alle Karten','Emotionale Verbundenheit','Liebe & Beziehungen','Vertrauen & Verletzlichkeit','Träume & Zukunft','Fernbeziehung','Liebes-Challenges'],en:['All cards','Emotional Connection','Love & Relationships','Trust & Vulnerability','Dreams & Future','Long-Distance Love','Love Challenges']},
  fun:{de:['Alle Karten','Lach dich verliebt','Frech & verspielt','Trau dich, albern zu sein','Was wäre dir lieber?','Liebenswertes Chaos','Mission Liebe'],en:['All cards','Laugh Out Loud','Flirt Alert','Dare to Be Silly','Would You Rather','Couple Chaos','Love Challenges']}
};
const translations={
 de:{createRoom:'♡ Spielraum erstellen',orJoin:'Oder einem Spielraum beitreten',invitation:'Einladungslink oder Raumcode',join:'Beitreten',connected:'Gemeinsamer Spielraum verbunden',shareLink:'Einladungslink',copyLink:'Link kopieren',shareRoom:'Teilen',playTogether:'Gemeinsam spielen ♥',leaveRoom:'Raum verlassen',roomInfo:'Die Karten werden live zwischen beiden Geräten synchronisiert. Premium-Karten bleiben gesperrt.',roomFailure:'Verbindung zum Spielraum fehlgeschlagen.',invalidRoom:'Spielraum nicht gefunden oder ungültig.',copySuccess:'Einladungslink kopiert.',roomBusy:'Verbindung wird aufgebaut …',tagline:'220 Fragen für Liebe, Nähe und ganz besondere Momente.',questions:'Fragen',play:'Jetzt spielen ♥',eightLanguages:'8 Sprachen',twoDecks:'2 Kartendecks',categories:'Kategorien',favorites:'Favoriten',couple:'Paarmodus',settings:'Einstellungen',home:'Home',yourDeck:'DEIN KARTENDECK',category:'Kategorie',previous:'Zurück',next:'Nächste Karte',save:'Merken',saved:'Gespeichert',shuffle:'Mischen',previewNote:'Design-Prototyp · Premium-Karten sind weiterhin geschützt.',categoryLead:'Wähle eine Sammlung und entdecke passende Fragen.',favoriteLead:'Deine gemerkten Fragen bleiben auf diesem Gerät.',together:'Zusammen spielen, auch auf Distanz',coupleText:'Der echte Paarmodus funktioniert bereits in der bestehenden Test-App. Dieser Prototyp zeigt zunächst nur das neue Design.',openReal:'Funktionierenden Paarmodus öffnen ↗',noMock:'Kein vorgetäuschter Spielraum: Für Live-Synchronisierung öffnet sich die bestehende Testversion.',language:'Sprache der Fragen',langDesc:'Die Kartentexte stammen aus der vorhandenen Sammlung mit acht Sprachen.',aboutTitle:'Über diesen Prototyp',aboutText:'Eine eigenständige Design-Vorschau. Sie ersetzt nicht die veröffentlichte App und nimmt keine Zahlungen entgegen.',premium:'🔒 Premium-Karte – nur in der Vollversion freischaltbar.',empty:'Noch keine Favoriten. Tippe in einer freien Karte auf „Merken“.',select:'Karte auswählen',noData:'Kartendaten konnten nicht geladen werden.'},
 en:{createRoom:'♡ Create room',orJoin:'Or join an existing room',invitation:'Invite link or room code',join:'Join',connected:'Shared game room connected',shareLink:'Invite link',copyLink:'Copy link',shareRoom:'Share',playTogether:'Play together ♥',leaveRoom:'Leave room',roomInfo:'Cards synchronize live between both devices. Premium cards remain locked.',roomFailure:'Could not connect to game room.',invalidRoom:'Room not found or invalid.',copySuccess:'Invite link copied.',roomBusy:'Connecting …',tagline:'220 questions for love, laughter and meaningful moments.',questions:'questions',play:'Start playing ♥',eightLanguages:'8 languages',twoDecks:'2 card decks',categories:'Categories',favorites:'Favorites',couple:'Couple mode',settings:'Settings',home:'Home',yourDeck:'YOUR DECK',category:'Category',previous:'Previous',next:'Next card',save:'Save',saved:'Saved',shuffle:'Shuffle',previewNote:'Design preview · Premium cards remain locked.',categoryLead:'Choose a collection and discover your next conversation.',favoriteLead:'Saved questions stay on this device.',together:'Play together, even miles apart',coupleText:'The real couple mode already works in the existing test app. This prototype demonstrates the new design.',openReal:'Open working couple mode ↗',noMock:'No fake room creation: the real test version handles live synchronization.',language:'Question language',langDesc:'Card content comes from the existing eight-language collection.',aboutTitle:'About this preview',aboutText:'An independent design prototype. It does not replace the published app or process payments.',premium:'🔒 Premium card – unlock in the full app.',empty:'No favorites yet. Save a free card to see it here.',select:'Choose a card',noData:'Card data could not be loaded.'}
};
const locale=()=>translations[lang]||translations.en;
const catLabels=()=>categories[deck][lang]||categories[deck].en;
let lang='de',deck='deep',category='all',pos=0,order=[],flipped=true,started=false,random=false;
let roomId=null,roomRef=null,unsubscribe=null,db=null,firebaseApi=null,applyingRemote=false,busy=false;
let favorites=new Set();
try{const savedLang=localStorage.getItem('heart-design-lang');if(['de','en','es','fr','zh','ur','hi','ar'].includes(savedLang))lang=savedLang;const saved=JSON.parse(localStorage.getItem('heart-design-favorites')||'[]');if(Array.isArray(saved))favorites=new Set(saved);}catch(e){console.warn('Local preview storage unavailable',e);}
const screens=['home','game','categories','favorites','couple','settings'];
let toastTimer;
function toast(msg){const node=$('toast');node.textContent=msg;node.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>{node.hidden=true;},3000);}
function persist(){try{localStorage.setItem('heart-design-favorites',JSON.stringify([...favorites]));}catch{}}
function setLanguage(value){lang=value;try{localStorage.setItem('heart-design-lang',lang);}catch{}document.documentElement.lang=lang;document.documentElement.dir=['ar','ur'].includes(lang)?'rtl':'ltr';$('languagePicker').value=lang;$('languageShort').textContent=lang.toUpperCase();document.querySelectorAll('[data-i18n]').forEach(el=>{const phrase=locale()[el.dataset.i18n];if(phrase)el.textContent=phrase;});renderCategories();renderFavorites();renderGame();}
function showScreen(screen){if(!screens.includes(screen))return;screens.forEach(name=>{const el=$('screen-'+name);const isCurrent=name===screen;el.hidden=!isCurrent;el.classList.toggle('is-active',isCurrent);});document.querySelectorAll('.nav-item').forEach(btn=>{const yes=btn.dataset.screen===screen||screen==='game'&&btn.dataset.screen==='home';btn.classList.toggle('is-active',yes);if(yes)btn.setAttribute('aria-current','page');else btn.removeAttribute('aria-current');});if(screen==='categories')renderCategories();if(screen==='favorites')renderFavorites();if(screen==='game')renderGame();window.scrollTo({top:0,behavior:'instant'});}
function updateTiles(){document.querySelectorAll('[data-deck]').forEach(btn=>{const active=btn.dataset.deck===deck;btn.classList.toggle('is-selected',active);btn.setAttribute('aria-pressed',String(active));});document.querySelectorAll('[data-select-deck]').forEach(btn=>btn.classList.toggle('is-active',btn.dataset.selectDeck===deck));}
function buildOrder(){order=deckData[deck].map((card,index)=>({card,index})).filter(item=>category==='all'||Number(item.card.cat)===Number(category)).map(item=>item.index);pos=0;flipped=true;}
function setDeck(value){if(!deckData[value]?.length){toast(locale().noData);return;}deck=value;category='all';random=false;buildOrder();updateTiles();renderCategories();renderGame();syncRoom();}
function current(){return deckData[deck][order[pos]];}
function isFree(c){return !!c&&freeIds.has(Number(c.id));}
function question(c){return c&&typeof c[lang]==='string'&&c[lang].trim()?c[lang]:c?.en||c?.de||'';}
function key(c){return deck+':'+c.id;}
function startGame(){if(!deckData[deck].length){toast(locale().noData);return;}if(!roomId)buildOrder();started=true;flipped=true;showScreen('game');syncRoom();}
function renderGame(){if(!order.length){buildOrder();if(!order.length)return;}$('gameRoomBar').hidden=!roomId;const card=current();if(!card)return;$('gameTitle').textContent=deck==='deep'?'Deep Questions':'Love & Laughs';const opts=$('gameCategory');opts.replaceChildren();catLabels().forEach((text,i)=>{const option=document.createElement('option');option.value=i?' '+(i-1):'all';option.value=option.value.trim();option.textContent=text;opts.appendChild(option);});opts.value=category;$('cardNumber').textContent=String(card.id).padStart(2,'0');$('cardCategory').textContent=(catLabels()[Number(card.cat)+1]||'').toUpperCase();$('cardCount').textContent=String(pos+1).padStart(2,'0')+' / '+String(order.length);$('cardLockLabel').textContent=isFree(card)?'':'🔒 PREMIUM';$('cardQuestion').textContent=!flipped?'♡ THE HEART COLLECTION':isFree(card)?question(card):locale().premium;$('cardQuestion').dir=['ar','ur'].includes(lang)?'rtl':'auto';$('favCard').disabled=!isFree(card);$('favCard').firstChild.textContent=favorites.has(key(card))?'♥ ':'♡ ';$('favCard').lastElementChild.textContent=favorites.has(key(card))?locale().saved:locale().save;}
function renderCategories(){const list=$('categoryList');list.replaceChildren();updateTiles();if(!deckData[deck].length)return;catLabels().forEach((name,i)=>{const match=i?' '+(i-1):'all';const value=match.trim();const count=deckData[deck].filter(c=>value==='all'||Number(c.cat)===Number(value)).length;const button=document.createElement('button');button.type='button';button.className='category-row';const left=document.createElement('span');left.textContent=name;const small=document.createElement('small');small.textContent=count+' '+locale().questions;left.appendChild(small);const arrow=document.createElement('span');arrow.className='arrow';arrow.textContent='›';button.append(left,arrow);button.addEventListener('click',()=>{category=value;buildOrder();started=true;showScreen('game');syncRoom();});list.appendChild(button);});}
function renderFavorites(){const list=$('favoritesList');list.replaceChildren();const saved=[...favorites].filter(x=>/^(deep|fun):\d+$/.test(x));if(!saved.length){const el=document.createElement('p');el.className='empty-state';el.textContent=locale().empty;list.appendChild(el);return;}for(const savedKey of saved){const [d,id]=savedKey.split(':');const c=deckData[d].find(x=>String(x.id)===id);if(!c||!isFree(c))continue;const btn=document.createElement('button');btn.type='button';btn.className='favorite-row';const left=document.createElement('span');left.textContent=question(c);const small=document.createElement('small');small.textContent=d==='deep'?'Deep Questions':'Love & Laughs';left.appendChild(small);const right=document.createElement('span');right.className='arrow';right.textContent='›';btn.append(left,right);btn.addEventListener('click',()=>{setDeck(d);category='all';buildOrder();const target=order.findIndex(i=>Number(deckData[d][i].id)===Number(id));pos=Math.max(target,0);started=true;showScreen('game');syncRoom();});list.appendChild(btn);}}
document.querySelectorAll('[data-screen]').forEach(btn=>btn.addEventListener('click',()=>showScreen(btn.dataset.screen)));
document.querySelectorAll('[data-deck]').forEach(btn=>btn.addEventListener('click',()=>setDeck(btn.dataset.deck)));
document.querySelectorAll('[data-select-deck]').forEach(btn=>btn.addEventListener('click',()=>setDeck(btn.dataset.selectDeck)));
$('playNow').addEventListener('click',startGame);
$('prevCard').addEventListener('click',()=>{if(!order.length)return;pos=(pos-1+order.length)%order.length;flipped=true;started=true;renderGame();syncRoom();});
$('nextCard').addEventListener('click',()=>{if(!order.length)return;pos=(pos+1)%order.length;flipped=true;started=true;renderGame();syncRoom();});
$('flipCard').addEventListener('click',()=>{flipped=!flipped;started=true;renderGame();syncRoom();});
$('favCard').addEventListener('click',()=>{const c=current();if(!isFree(c))return;const k=key(c);if(favorites.has(k))favorites.delete(k);else favorites.add(k);persist();renderGame();});
$('shuffleCard').addEventListener('click',()=>{for(let i=order.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[order[i],order[j]]=[order[j],order[i]];}pos=0;flipped=true;random=true;started=true;renderGame();syncRoom();toast(locale().shuffle+' ✓');});
$('gameCategory').addEventListener('change',e=>{category=e.target.value;random=false;buildOrder();started=true;renderGame();syncRoom();});
$('languageQuick').addEventListener('click',()=>showScreen('settings'));
$('languagePicker').addEventListener('change',e=>setLanguage(e.target.value));

/* Live rooms use the same Firestore schema and project as the existing couple-test app.
   This preview maintains its own UI and does not navigate away. */
const validRoom=id=>/^[a-f0-9]{40}$/.test(id||'');
function newRoomId(){const bytes=new Uint8Array(20);crypto.getRandomValues(bytes);return Array.from(bytes,x=>x.toString(16).padStart(2,'0')).join('');}
function inviteUrl(id){const url=new URL(location.href);url.searchParams.delete('deck');url.searchParams.delete('card');url.searchParams.set('room',id);return url.toString();}
function updateRoomUrl(id){const url=new URL(location.href);url.searchParams.delete('room');if(id)url.searchParams.set('room',id);history.replaceState({},'',url);}
function roomData(){const c=current();if(!c)return null;return {deck,cardId:Number(c.id),category,random,flipped,started,sequence:order.map(index=>Number(deckData[deck][index].id)),updatedAt:Date.now()};}
function showRoomUI(){const active=!!roomId;$('roomSetup').hidden=active;$('roomActive').hidden=!active;$('gameRoomBar').hidden=!active;$('roomStatus').textContent=locale().connected;const status=$('roomError');if(active){status.hidden=true;$('roomLink').value=inviteUrl(roomId);}if(!active)$('roomLink').value='';}
function roomError(error){const code=String(error?.code||'');console.error('Heart Collection room error:',error);let message=locale().roomFailure;if(code==='permission-denied'||code==='firestore/permission-denied')message+=' (Firebase: permission-denied)';else if(code==='auth/operation-not-allowed')message+=' (Anonymous login disabled)';else if(code==='auth/unauthorized-domain')message+=' (Domain not authorized)';else if(code==='unavailable'||code==='auth/network-request-failed')message+=' (Network unavailable)';else if(code)message+=' ('+code+')';$('roomError').textContent=message;$('roomError').hidden=false;toast(message);}
async function ensureFirebase(){if(db&&firebaseApi)return true;const config=window.HEART_FIREBASE_CONFIG;if(!config?.apiKey||!config?.projectId)throw Error('Missing Firebase configuration');const [firebase,auth,firestore]=await Promise.all([import('https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js'),import('https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js'),import('https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js')]);const app=firebase.getApps().length?firebase.getApp():firebase.initializeApp(config);await auth.signInAnonymously(auth.getAuth(app));db=firestore.getFirestore(app);firebaseApi=firestore;return true;}
function applyRoomState(data){
 if(!data||!deckData[data.deck==='fun'?'fun':'deep']?.length)return;
 applyingRemote=true;
 try{
  deck=data.deck==='fun'?'fun':'deep';category=['all','0','1','2','3','4','5'].includes(data.category)?data.category:'all';random=!!data.random;flipped=!!data.flipped;started=!!data.started;
  const list=deckData[deck];const incoming=Array.isArray(data.sequence)?data.sequence:[];
  const seen=new Set();order=incoming.map(id=>list.findIndex(card=>Number(card.id)===Number(id))).filter(index=>{if(index<0||seen.has(index))return false;seen.add(index);return true;});
  if(!order.length)order=list.map((_,index)=>index).filter(index=>category==='all'||Number(list[index].cat)===Number(category));
  pos=Math.max(0,order.findIndex(index=>Number(list[index].id)===Number(data.cardId)));
  updateTiles();renderCategories();renderGame();
 }finally{applyingRemote=false;}
}
async function syncRoom(){if(!roomId||!roomRef||!firebaseApi||applyingRemote||busy)return;const data=roomData();if(!data)return;try{await firebaseApi.updateDoc(roomRef,data);}catch(error){roomError(error);}}
async function enterRoom(id,create){
 if(busy)return;
 if(!validRoom(id)){$('roomError').textContent=locale().invalidRoom;$('roomError').hidden=false;toast(locale().invalidRoom);return;}
 busy=true;$('roomError').hidden=true;
 $('createRoom').disabled=true;$('joinRoom').disabled=true;
 try{
  await ensureFirebase();
  const ref=firebaseApi.doc(db,'rooms',id);
  if(create){if(!order.length)buildOrder();const data=roomData();if(!data)throw Error('No card data');await firebaseApi.setDoc(ref,data);}
  else{const snap=await firebaseApi.getDoc(ref);if(!snap.exists()){toast(locale().invalidRoom);$('roomError').textContent=locale().invalidRoom;$('roomError').hidden=false;return;}applyRoomState(snap.data());}
  if(unsubscribe){unsubscribe();unsubscribe=null;}
  roomId=id;roomRef=ref;updateRoomUrl(id);showRoomUI();showScreen('couple');
  unsubscribe=firebaseApi.onSnapshot(ref,snapshot=>{
    if(!snapshot.exists()){toast(locale().invalidRoom);leaveRoom();return;}
    applyRoomState(snapshot.data());
  },error=>roomError(error));
 }catch(error){roomError(error);}
 finally{busy=false;$('createRoom').disabled=false;$('joinRoom').disabled=false;}
}
function leaveRoom(){if(unsubscribe){unsubscribe();unsubscribe=null;}roomId=null;roomRef=null;updateRoomUrl(null);showRoomUI();renderGame();showScreen('couple');}
async function copyLink(){const link=$('roomLink').value;if(!link)return;try{await navigator.clipboard.writeText(link);toast(locale().copySuccess);}catch(error){$('roomLink').focus();$('roomLink').select();toast(link);}}
async function shareLink(){const link=$('roomLink').value;if(!link)return;try{if(navigator.share)await navigator.share({title:'The Heart Collection',text:locale().together,url:link});else await copyLink();}catch(error){if(error?.name!=='AbortError')await copyLink();}}
$('createRoom').addEventListener('click',()=>enterRoom(newRoomId(),true));
$('joinRoom').addEventListener('click',()=>{const raw=$('joinInput').value.trim();let id=raw;try{id=new URL(raw).searchParams.get('room')||raw;}catch{}enterRoom(id,false);});
$('joinInput').addEventListener('keydown',event=>{if(event.key==='Enter')$('joinRoom').click();});
$('copyRoom').addEventListener('click',copyLink);
$('shareRoom').addEventListener('click',shareLink);
$('roomPlay').addEventListener('click',startGame);
$('leaveRoom').addEventListener('click',leaveRoom);
$('openRoomFromGame').addEventListener('click',()=>showScreen('couple'));

if(!deckData.deep.length||!deckData.fun.length)toast(locale().noData);
buildOrder();setLanguage(lang);showRoomUI();showScreen('home');const incomingRoom=new URLSearchParams(location.search).get('room');if(incomingRoom){showScreen('couple');enterRoom(incomingRoom,false);}
})();