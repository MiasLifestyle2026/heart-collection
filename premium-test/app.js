(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const cards = Array.isArray(window.HEART_CARDS) ? window.HEART_CARDS : [];
  const translations = window.HEART_UI || {};
  const languageNames = {de:'🇩🇪 Deutsch',en:'🇬🇧 English',es:'🇪🇸 Español',zh:'🇨🇳 中文',fr:'🇫🇷 Français',ur:'🇵🇰 اردو',hi:'🇮🇳 हिन्दी',ar:'🌍 العربية'};
  const extra = {
    de:{start:'❤️ Spiel starten',copySuccess:'Link kopiert',offline:'Verbindung fehlgeschlagen. Bitte Internet prüfen.',invalid:'Ungültiger oder nicht vorhandener Spielraum.',setup:'Firebase ist nicht eingerichtet.',missing:'Übersetzung nicht verfügbar. Englische Frage:'},
    en:{start:'❤️ Start game',copySuccess:'Link copied',offline:'Connection failed. Check your internet.',invalid:'Invalid or missing room.',setup:'Firebase is not configured.',missing:'Translation unavailable. English question:'},
    es:{start:'❤️ Empezar juego',copySuccess:'Enlace copiado'},fr:{start:'❤️ Commencer',copySuccess:'Lien copié'},zh:{start:'❤️ 开始游戏',copySuccess:'链接已复制'},ur:{start:'❤️ کھیل شروع کریں',copySuccess:'لنک کاپی ہو گیا'},hi:{start:'❤️ खेल शुरू करें',copySuccess:'लिंक कॉपी हो गया'},ar:{start:'❤️ ابدأ اللعبة',copySuccess:'تم نسخ الرابط'}
  };
  const fallback = {heading:'100 Deep Questions',heading2:'for Couples',subtitle:'Conversations that bring two hearts closer.',category:'Choose a category',shuffle:'Shuffle cards',prev:'Previous',next:'Next card',share:'Share this card',tap:'Tap to reveal',footer:'A little closer, one question at a time.',favorite:'Save favorite',saved:'Saved',solo:'Solo mode',couple:'Couple mode',create:'Create room',join:'Join room',leave:'Leave room',copy:'Copy link',room:'Invitation link',front:'Deep Questions',front2:'for Couples',categories:['All cards','Emotional Connection','Love & Relationships','Trust & Vulnerability','Dreams & Future','Long-Distance Love','Love Challenges']};
  let lang = localStorage.getItem('heart-lang') || 'de';
  if (!languageNames[lang]) lang='de';
  let category='all', random=false, sequence=[], position=0, flipped=false, started=false;
  let mode='solo', roomId=null, db=null, unsubscribe=null, roomRef=null, applyingRemote=false, busy=false;
  let favorites;
  try { favorites=new Set(JSON.parse(localStorage.getItem('heart-favorites')||'[]')); } catch { favorites=new Set(); }
  const urlParams=new URLSearchParams(location.search);
  const shared=Number(urlParams.get('card'));
  const incomingRoom=urlParams.get('room');
  const t=()=>({...fallback,...(translations[lang]||translations.en||{}),...extra.en,...(extra[lang]||{})});
  // Premium preview only: entitlement and payment verification must be implemented server-side.
  const freeIds=new Set([1,2,3,21,22,23,41,42,43,61,62,63,81,82,83,101,102,103]);
  const isFree=c=>!!c&&freeIds.has(Number(c.id));
  const premiumText=()=>({de:'🔒 Premium-Karte\nMit Heart Collection Premium für 4,95 € im Monat freischalten. Ein Abo reicht für beide Partner im gemeinsamen Spielraum.',en:'🔒 Premium card\nUnlock with Heart Collection Premium for €4.95/month. One subscription covers both partners in a shared room.',es:'🔒 Tarjeta Premium\nDisponible con la suscripción Premium.',fr:'🔒 Carte Premium\nDisponible avec l’abonnement Premium.',zh:'🔒 高级卡片\n订阅后解锁。',ur:'🔒 پریمیم کارڈ\nسبسکرپشن کے ساتھ دستیاب۔',hi:'🔒 प्रीमियम कार्ड\nसदस्यता से अनलॉक करें।',ar:'🔒 بطاقة مميزة\nمتاحة بالاشتراك.'}[lang]||'🔒 Premium card');
  const current=()=>cards[sequence[position]];
  const ids=()=>sequence.map(i=>Number(cards[i].id));
  function toast(message){const el=$('toast');if(!el)return;el.textContent=message;el.classList.add('show');clearTimeout(window._heartToast);window._heartToast=setTimeout(()=>el.classList.remove('show'),3200);}
  function translated(c){return typeof c[lang]==='string'&&c[lang].trim()?c[lang]:`${t().missing}\n\n${c.en||c.de||''}`;}
  function cardTitle(c){const key='title'+lang[0].toUpperCase()+lang.slice(1);return c[key]||c.titleEn||'';}
  function setText(id,value){const el=$(id);if(el)el.textContent=value;}
  function render(){const c=current();if(!c)return;const x=t();const locked=!isFree(c);const q=locked?premiumText():translated(c);
    $('card').classList.toggle('flipped',flipped);
    setText('counter',`${position+1} / ${sequence.length}`);
    setText('number',String(c.id).padStart(2,'0'));
    setText('categoryName',(x.categories[Number(c.cat)+1]||'').toUpperCase());
    setText('question',q);$('question').classList.toggle('long',q.length>112);
    setText('bonusTitle',!locked&&Number(c.cat)===5?cardTitle(c):'');
    setText('favoriteText',locked?'🔒 Premium':favorites.has(c.id)?x.saved:x.favorite);
    $('favorite').disabled=locked;
    $('share').disabled=locked;
    $('favorite').firstChild.textContent=favorites.has(c.id)?'♥ ':'♡ ';
    $('question').dir=['ar','ur'].includes(lang)?'rtl':'auto';
    $('card').setAttribute('aria-label',flipped?'Flip card':'Reveal question');
    $('startGame').hidden=started;
    $('startGame').disabled=busy;
  }
  function labels(){const x=t();document.documentElement.lang=lang;
    $('heading').innerHTML=`${x.heading}<br><em>${x.heading2}</em>`;
    const map={subtitle:x.subtitle,categoryLabel:x.category,shuffleLabel:x.shuffle,prevText:x.prev,nextText:x.next,shareText:x.share,tap:x.tap,footerText:x.footer,soloText:x.solo,coupleText:x.couple,createRoom:x.create,joinRoom:x.join,leaveRoom:x.leave,copyRoom:x.copy,roomLabel:x.room,startGame:x.start};
    for(const [id,value] of Object.entries(map))setText(id,value);
    const front=document.querySelector('.playing-card .front .big');
    if(front){front.innerHTML=`100<br><em>${x.front}</em><br>${x.front2}`;front.dir=['ar','ur'].includes(lang)?'rtl':'auto';}
    const select=$('category');select.replaceChildren();x.categories.forEach((name,i)=>{const o=document.createElement('option');o.value=i===0?'all':String(i-1);o.textContent=name;select.appendChild(o);});select.value=category;
    const language=$('lang');language.replaceChildren();for(const [code,name] of Object.entries(languageNames)){const o=document.createElement('option');o.value=code;o.textContent=name;language.appendChild(o);}language.value=lang;
    render();
  }
  function buildSequence(target){sequence=cards.map((_,i)=>i).filter(i=>category==='all'||Number(cards[i].cat)===Number(category));if(random){for(let i=sequence.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[sequence[i],sequence[j]]=[sequence[j],sequence[i]];}}position=target===undefined?0:Math.max(0,sequence.findIndex(i=>Number(cards[i].id)===Number(target)));started=false;flipped=false;render();}
  function roomData(){return {cardId:Number(current().id),category,random,flipped,started,sequence:ids(),updatedAt:Date.now()};}
  async function sync(){if(mode!=='couple'||!roomRef||applyingRemote||!current())return;try{await window._heartFirebase.updateDoc(roomRef,roomData());}catch(e){console.error(e);toast(t().offline);}}
  function setMode(next){mode=next;$('soloMode').classList.toggle('selected',next==='solo');$('coupleMode').classList.toggle('selected',next==='couple');$('couplePanel').hidden=next!=='couple';$('roomActive').hidden=!(next==='couple'&&roomId);$('roomSetup').hidden=!!roomId;}
  function validRoom(id){return /^[a-f0-9]{40}$/.test(id||'');}
  function randomId(){const a=new Uint8Array(20);crypto.getRandomValues(a);return Array.from(a,b=>b.toString(16).padStart(2,'0')).join('');}
  function roomUrl(id){const u=new URL(location.href);u.searchParams.delete('card');u.searchParams.set('room',id);return u.toString();}
  function updateAddress(id){const u=new URL(location.href);u.searchParams.delete('room');u.searchParams.delete('card');if(id)u.searchParams.set('room',id);history.replaceState({},'',u);}
  async function firebaseReady(){if(db)return true;const cfg=window.HEART_FIREBASE_CONFIG;if(!cfg||!cfg.apiKey||cfg.apiKey==='REPLACE_ME'){toast(t().setup);return false;}
    try{const [{initializeApp,getApps,getApp},{getAuth,signInAnonymously},{getFirestore,doc,setDoc,getDoc,onSnapshot,updateDoc}]=await Promise.all([
      import('https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js'),import('https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js'),import('https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js')]);
      const app=getApps().length?getApp():initializeApp(cfg);await signInAnonymously(getAuth(app));db=getFirestore(app);window._heartFirebase={doc,setDoc,getDoc,onSnapshot,updateDoc};return true;
    }catch(e){console.error(e);toast(t().offline);return false;}}
  function applyRoom(data){applyingRemote=true;try{
    category=typeof data.category==='string'?data.category:'all';random=!!data.random;
    const incoming=Array.isArray(data.sequence)?data.sequence:[];
    sequence=incoming.map(id=>cards.findIndex(c=>Number(c.id)===Number(id))).filter(i=>i>=0);
    if(!sequence.length){category='all';sequence=cards.map((_,i)=>i);}
    position=Math.max(0,sequence.findIndex(i=>Number(cards[i].id)===Number(data.cardId)));
    started=typeof data.started==='boolean'?data.started:true;
    flipped=typeof data.flipped==='boolean'?data.flipped:started;
    $('category').value=category;$('random').checked=random;render();
  }finally{applyingRemote=false;}}
  async function enterRoom(id,create){if(busy)return;if(!validRoom(id)){toast(t().invalid);return;}busy=true;render();
    try{if(!await firebaseReady())return;
      const api=window._heartFirebase;const ref=api.doc(db,'rooms',id);
      if(create){category=$('category').value;random=$('random').checked;buildSequence();await api.setDoc(ref,roomData());}
      else{const snap=await api.getDoc(ref);if(!snap.exists()){toast(t().invalid);return;}}
      if(unsubscribe){unsubscribe();unsubscribe=null;}
      roomId=id;roomRef=ref;setMode('couple');$('roomLink').value=roomUrl(id);setText('roomStatus',lang==='de'?'Gemeinsamer Spielraum':'Shared game room');updateAddress(id);
      unsubscribe=api.onSnapshot(ref,snap=>{if(!snap.exists()){toast(t().invalid);leaveRoom();return;}applyRoom(snap.data());},e=>{console.error(e);toast(t().offline);});
    }catch(e){console.error(e);toast(t().offline);}finally{busy=false;render();}}
  function leaveRoom(){if(unsubscribe){unsubscribe();unsubscribe=null;}roomId=null;roomRef=null;updateAddress(null);setMode('solo');started=false;flipped=false;render();}
  async function startGame(){if(busy||!current())return;started=true;position=0;flipped=true;render();await sync();}
  async function step(delta){if(!sequence.length||busy)return;position=(position+delta+sequence.length)%sequence.length;started=true;flipped=true;render();await sync();}
  async function flip(){if(!current()||busy)return;started=true;flipped=!flipped;render();await sync();}
  if(!cards.length){toast('cards.js missing');return;}
  buildSequence(Number.isInteger(shared)&&shared>=1&&shared<=110?shared:undefined);
  if(Number.isInteger(shared)&&shared>=1&&shared<=110){started=true;flipped=true;}
  labels();
  $('startGame').addEventListener('click',startGame);
  $('card').addEventListener('click',flip);
  $('next').addEventListener('click',()=>step(1));
  $('prev').addEventListener('click',()=>step(-1));
  $('category').addEventListener('change',async e=>{category=e.target.value;buildSequence();await sync();});
  $('random').addEventListener('change',async e=>{random=e.target.checked;buildSequence();await sync();});
  $('lang').addEventListener('change',e=>{if(!languageNames[e.target.value])return;lang=e.target.value;localStorage.setItem('heart-lang',lang);labels();});
  $('soloMode').addEventListener('click',()=>{if(roomId)leaveRoom();else setMode('solo');});
  $('coupleMode').addEventListener('click',()=>setMode('couple'));
  $('createRoom').addEventListener('click',()=>enterRoom(randomId(),true));
  $('joinRoom').addEventListener('click',()=>{const raw=$('joinInput').value.trim();let id=raw;try{id=new URL(raw).searchParams.get('room')||raw;}catch{}enterRoom(id,false);});
  $('leaveRoom').addEventListener('click',leaveRoom);
  $('copyRoom').addEventListener('click',async()=>{const link=$('roomLink').value;try{await navigator.clipboard.writeText(link);toast(t().copySuccess);}catch{toast(link);}});
  $('favorite').addEventListener('click',()=>{if(!isFree(current()))return;const id=current().id;if(favorites.has(id))favorites.delete(id);else favorites.add(id);localStorage.setItem('heart-favorites',JSON.stringify([...favorites]));render();});
  $('share').addEventListener('click',async()=>{const c=current();if(!isFree(c))return;const u=new URL(location.href);u.searchParams.delete('room');u.searchParams.set('card',c.id);try{if(navigator.share)await navigator.share({title:'Mia’s Lifestyle',text:translated(c),url:u.toString()});else{await navigator.clipboard.writeText(u.toString());toast(t().copySuccess);}}catch(e){if(e.name!=='AbortError')toast(t().offline);}});
  window.addEventListener('keydown',e=>{if(['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName))return;if(e.key==='ArrowRight')step(1);if(e.key==='ArrowLeft')step(-1);if(e.key===' '&&!['BUTTON'].includes(e.target.tagName)){e.preventDefault();flip();}});
  if(incomingRoom){setMode('couple');enterRoom(incomingRoom,false);}
  if('serviceWorker'in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('./sw.js').catch(()=>{});
})();
