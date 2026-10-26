
(() => {
  "use strict";

  const cards = Array.isArray(window.HEART_CARDS)
    ? window.HEART_CARDS
    : [];

  const $ = id => document.getElementById(id);

  const languages = {
    de: "🇩🇪 Deutsch",
    en: "🇬🇧 English",
    es: "🇪🇸 Español",
    zh: "🇨🇳 中文",
    fr: "🇫🇷 Français",
    ur: "🇵🇰 اردو",
    hi: "🇮🇳 हिन्दी",
    ar: "🌍 العربية"
  };

  const fallbackCategories = {
    de: [
      "Alle Karten",
      "Emotionale Verbindung",
      "Liebe & Beziehung",
      "Vertrauen & Offenheit",
      "Träume & Zukunft",
      "Liebe auf Distanz",
      "Love Challenges"
    ],
    en: [
      "All cards",
      "Emotional Connection",
      "Love & Relationships",
      "Trust & Vulnerability",
      "Dreams & Future",
      "Long-Distance Love",
      "Love Challenges"
    ]
  };

  const fallbackUI = {
    de: {
      heading: "100 tiefgründige Fragen",
      heading2: "für Paare",
      subtitle: "Gespräche, die zwei Herzen näherbringen.",
      category: "Kategorie wählen",
      shuffle: "Karten mischen",
      prev: "Zurück",
      next: "Nächste Karte",
      share: "Karte teilen",
      tap: "Antippen und aufdecken",
      footer: "Mit jeder Frage ein bisschen näher.",
      favorite: "Favorit speichern",
      saved: "Gespeichert",
      solo: "Einzel-Modus",
      couple: "Paar-Modus",
      create: "Spielraum erstellen",
      join: "Spielraum beitreten",
      room: "Einladungslink",
      copy: "Link kopieren",
      leave: "Raum verlassen",
      connected: "Gemeinsamer Spielraum",
      missing: "Übersetzung noch nicht verfügbar. Englische Frage:",
      setup: "Für den Paar-Modus muss Firebase eingerichtet werden.",
      offline: "Verbindung fehlgeschlagen. Bitte Internet prüfen.",
      invalid: "Ungültiger Einladungslink."
    },
    en: {
      heading: "100 Deep Questions",
      heading2: "for Couples",
      subtitle: "Conversations that bring two hearts closer.",
      category: "Choose a category",
      shuffle: "Shuffle cards",
      prev: "Previous",
      next: "Next card",
      share: "Share this card",
      tap: "Tap to reveal",
      footer: "A little closer, one question at a time.",
      favorite: "Save favorite",
      saved: "Saved",
      solo: "Solo mode",
      couple: "Couple mode",
      create: "Create room",
      join: "Join room",
      room: "Invitation link",
      copy: "Copy link",
      leave: "Leave room",
      connected: "Shared game room",
      missing: "Translation unavailable. English question:",
      setup: "Firebase must be configured for couple mode.",
      offline: "Connection failed. Please check your internet.",
      invalid: "Invalid invitation link."
    }
  };

  let lang = localStorage.getItem("heart-lang") || "de";
  if (!languages[lang]) lang = "de";

  let category = "all";
  let random = false;
  let sequence = [];
  let position = 0;
  let flipped = false;
  let mode = "solo";
  let roomId = null;
  let db = null;
  let unsubscribe = null;
  let updateRoom = null;
  let remoteApply = false;

  let favorites;
  try {
    favorites = new Set(
      JSON.parse(localStorage.getItem("heart-favorites") || "[]")
    );
  } catch {
    favorites = new Set();
  }

  const params = new URLSearchParams(location.search);
  const shared = Number(params.get("card"));
  const roomFromUrl = params.get("room");

  function t() {
    const base = fallbackUI[lang] || fallbackUI.en;
    const extra = window.HEART_UI?.[lang] || {};
    return { ...base, ...extra };
  }

  function categoryNames() {
    return window.HEART_UI?.[lang]?.categories ||
      fallbackCategories[lang] ||
      fallbackCategories.en;
  }

  function toast(message) {
    const element = $("toast");
    if (!element) return;

    element.textContent = message;
    element.classList.add("show");

    clearTimeout(window._toastTimer);
    window._toastTimer = setTimeout(() => {
      element.classList.remove("show");
    }, 2600);
  }

  function translated(card) {
    if (
      typeof card[lang] === "string" &&
      card[lang].trim()
    ) {
      return card[lang];
    }

    return `${t().missing}\n\n${card.en || card.de || ""}`;
  }

  function cardTitle(card) {
    const key = "title" +
      lang[0].toUpperCase() +
      lang.slice(1);

    return card[key] || card.titleEn || "";
  }

  function current() {
    return cards[sequence[position]];
  }

  function updateFront() {
    const x = t();

    const front = document.querySelector(
      ".playing-card .front .big"
    );

    if (front) {
      const title = x.front || x.heading;
      const subtitle = x.front2 || x.heading2;

      front.replaceChildren(
        document.createTextNode("100"),
        document.createElement("br"),
        document.createElement("em"),
        document.createElement("br"),
        document.createTextNode(subtitle)
      );

      front.querySelector("em").textContent = title;
      front.dir = ["ar", "ur"].includes(lang) ? "rtl" : "auto";
    }
  }

  function buildSequence(target) {
    sequence = cards
      .map((_, i) => i)
      .filter(i =>
        category === "all" ||
        Number(cards[i].cat) === Number(category)
      );

    if (random) {
      for (let i = sequence.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [sequence[i], sequence[j]] =
          [sequence[j], sequence[i]];
      }
    }

    position = target === undefined
      ? 0
      : Math.max(
          0,
          sequence.findIndex(
            i => Number(cards[i].id) === Number(target)
          )
        );

    flipped = false;
    render();
  }

  function render() {
    const card = current();
    if (!card) return;

    const question = translated(card);
    const x = t();

    $("card").classList.toggle("flipped", flipped);
    $("counter").textContent =
      `${position + 1} / ${sequence.length}`;

    $("number").textContent =
      String(card.id).padStart(2, "0");

    $("categoryName").textContent =
      (categoryNames()[Number(card.cat) + 1] || "")
        .toUpperCase();

    $("question").textContent = question;
    $("question").classList.toggle(
      "long",
      question.length > 112
    );

    $("bonusTitle").textContent =
      Number(card.cat) === 5 ? cardTitle(card) : "";

    $("favoriteText").textContent =
      favorites.has(card.id) ? x.saved : x.favorite;

    $("favorite").firstChild.textContent =
      favorites.has(card.id) ? "♥ " : "♡ ";

    $("question").dir =
      ["ar", "ur"].includes(lang) ? "rtl" : "auto";

    $("card").setAttribute(
      "aria-label",
      flipped ? "Flip card" : "Reveal question"
    );
  }

  function labels() {
    const x = t();

    $("heading").innerHTML =
      `${x.heading}<br><em>${x.heading2}</em>`;

    const fields = {
      subtitle: x.subtitle,
      categoryLabel: x.category,
      shuffleLabel: x.shuffle,
      prevText: x.prev,
      nextText: x.next,
      shareText: x.share,
      tap: x.tap,
      footerText: x.footer,
      soloText: x.solo,
      coupleText: x.couple,
      createRoom: x.create,
      joinRoom: x.join,
      leaveRoom: x.leave,
      copyRoom: x.copy,
      roomLabel: x.room
    };

    Object.entries(fields).forEach(([id, value]) => {
      const element = $(id);
      if (element) element.textContent = value;
    });

    const languageSelect = $("lang");
    languageSelect.replaceChildren();

    Object.entries(languages).forEach(([code, name]) => {
      const option = document.createElement("option");
      option.value = code;
      option.textContent = name;
      languageSelect.appendChild(option);
    });

    languageSelect.value = lang;

    const categorySelect = $("category");
    categorySelect.replaceChildren();

    categoryNames().forEach((name, i) => {
      const option = document.createElement("option");
      option.value = i === 0 ? "all" : String(i - 1);
      option.textContent = name;
      categorySelect.appendChild(option);
    });

    categorySelect.value = category;

    const placeholders = {
      de: "Einladungslink oder Raumcode",
      en: "Invitation link or room code",
      es: "Enlace de invitación o código",
      fr: "Lien d'invitation ou code",
      zh: "邀请链接或房间代码",
      ur: "دعوتی لنک یا کمرے کا کوڈ",
      hi: "निमंत्रण लिंक या रूम कोड",
      ar: "رابط الدعوة أو رمز الغرفة"
    };

    if ($("joinInput")) {
      $("joinInput").placeholder = placeholders[lang];
    }

    if (roomId && $("roomStatus")) {
      $("roomStatus").textContent = x.connected;
    }

    updateFront();
    render();
  }

  function syncCard() {
    if (
      mode === "couple" &&
      roomId &&
      updateRoom &&
      !remoteApply &&
      current()
    ) {
      updateRoom({
        cardId: current().id,
        category,
        random,
        sequence: sequence.map(i => cards[i].id)
      }).catch(() => toast(t().offline));
    }
  }

  function step(direction) {
    if (!sequence.length) return;

    position =
      (position + direction + sequence.length) %
      sequence.length;

    flipped = true;
    render();
    syncCard();
  }

  function setMode(next) {
    mode = next;

    $("soloMode").classList.toggle(
      "selected",
      next === "solo"
    );

    $("coupleMode").classList.toggle(
      "selected",
      next === "couple"
    );

    $("couplePanel").hidden = next !== "couple";
    $("roomActive").hidden =
      !(next === "couple" && roomId);

    $("roomSetup").hidden = !!roomId;
  }

  function randomId() {
    const bytes = new Uint8Array(20);
    crypto.getRandomValues(bytes);

    return Array.from(
      bytes,
      value => value.toString(16).padStart(2, "0")
    ).join("");
  }

  function roomUrl(id) {
    const url = new URL(location.href);
    url.searchParams.delete("card");
    url.searchParams.set("room", id);
    return url.toString();
  }

  function validRoom(id) {
    return /^[a-f0-9]{40}$/.test(id || "");
  }

  async function firebaseReady() {
    if (db) return true;

    const config = window.HEART_FIREBASE_CONFIG;

    if (
      !config ||
      !config.apiKey ||
      config.apiKey === "REPLACE_ME"
    ) {
      toast(t().setup);
      return false;
    }

    try {
      const [
        { initializeApp, getApps, getApp },
        { getAuth, signInAnonymously },
        { getFirestore, doc, setDoc, onSnapshot, updateDoc }
      ] = await Promise.all([
        import("https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js"),
        import("https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js"),
        import("https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js")
      ]);

      const app = getApps().length
        ? getApp()
        : initializeApp(config);

      await signInAnonymously(getAuth(app));

      db = getFirestore(app);

      window._heartFirebase = {
        doc,
        setDoc,
        onSnapshot,
        updateDoc
      };

      return true;
    } catch (error) {
      console.error(error);
      toast(t().offline);
      return false;
    }
  }

  async function enterRoom(id, create) {
    if (!validRoom(id)) {
      toast(t().invalid);
      return;
    }

    if (!await firebaseReady()) return;

    if (unsubscribe) unsubscribe();

    const {
      doc,
      setDoc,
      onSnapshot,
      updateDoc
    } = window._heartFirebase;

    const ref = doc(db, "rooms", id);

    if (create) {
      await setDoc(ref, {
        cardId: current().id,
        category,
        random,
        sequence: sequence.map(i => cards[i].id),
        updatedAt: Date.now()
      });
    }

    roomId = id;

    updateRoom = changes => updateDoc(ref, {
      ...changes,
      updatedAt: Date.now()
    });

    setMode("couple");

    $("roomLink").value = roomUrl(id);
    $("roomStatus").textContent = t().connected;

    const url = new URL(location.href);
    url.searchParams.set("room", id);
    url.searchParams.delete("card");
    history.replaceState({}, "", url);

    unsubscribe = onSnapshot(
      ref,
      snapshot => {
        if (!snapshot.exists()) {
          toast(t().invalid);
          leaveRoom();
          return;
        }

        const data = snapshot.data();
        remoteApply = true;

        try {
          category =
            typeof data.category === "string"
              ? data.category
              : "all";

          random = !!data.random;

          $("category").value = category;
          $("random").checked = random;

          const ids = Array.isArray(data.sequence)
            ? data.sequence
            : [];

          sequence = ids
            .map(id =>
              cards.findIndex(
                card => Number(card.id) === Number(id)
              )
            )
            .filter(i => i >= 0);

          if (!sequence.length) {
            buildSequence(data.cardId);
          }

          position = Math.max(
            0,
            sequence.findIndex(
              i => Number(cards[i].id) === Number(data.cardId)
            )
          );

          flipped = true;
          render();
        } finally {
          remoteApply = false;
        }
      },
      error => {
        console.error(error);
        toast(t().offline);
      }
    );
  }

  function leaveRoom() {
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }

    roomId = null;
    updateRoom = null;

    const url = new URL(location.href);
    url.searchParams.delete("room");
    history.replaceState({}, "", url);

    setMode("solo");
  }

  $("card").addEventListener("click", () => {
    flipped = !flipped;
    render();
  });

  $("next").addEventListener("click", () => step(1));
  $("prev").addEventListener("click", () => step(-1));

  $("category").addEventListener("change", event => {
    category = event.target.value;
    buildSequence();
    syncCard();
  });

  $("random").addEventListener("change", event => {
    random = event.target.checked;
    buildSequence();
    syncCard();
  });

  $("lang").addEventListener("change", event => {
    if (!languages[event.target.value]) return;

    lang = event.target.value;
    localStorage.setItem("heart-lang", lang);
    document.documentElement.lang = lang;

    labels();
  });

  $("soloMode").addEventListener("click", () => {
    if (roomId) leaveRoom();
    else setMode("solo");
  });

  $("coupleMode").addEventListener("click", () => {
    setMode("couple");
  });

  $("createRoom").addEventListener("click", async () => {
    try {
      await enterRoom(randomId(), true);
    } catch (error) {
      console.error(error);
      toast(t().offline);
    }
  });

  $("joinRoom").addEventListener("click", async () => {
    const raw = $("joinInput").value.trim();
    let id = raw;

    try {
      id = new URL(raw).searchParams.get("room") || raw;
    } catch {}

    try {
      await enterRoom(id, false);
    } catch (error) {
      console.error(error);
      toast(t().offline);
    }
  });

  $("leaveRoom").addEventListener("click", leaveRoom);

  $("copyRoom").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(
        $("roomLink").value
      );
      toast(t().copy);
    } catch {
      toast($("roomLink").value);
    }
  });

  $("favorite").addEventListener("click", () => {
    const id = current().id;

    if (favorites.has(id)) {
      favorites.delete(id);
    } else {
      favorites.add(id);
    }

    localStorage.setItem(
      "heart-favorites",
      JSON.stringify([...favorites])
    );

    render();
  });

  $("share").addEventListener("click", async () => {
    const card = current();
    const url = new URL(location.href);

    url.searchParams.set("card", card.id);
    url.searchParams.delete("room");

    try {
      if (navigator.share) {
        await navigator.share({
          title: "Mia’s Lifestyle",
          text: translated(card),
          url: url.toString()
        });
      } else {
        await navigator.clipboard.writeText(
          url.toString()
        );
        toast(t().copy);
      }
    } catch (error) {
      if (error.name !== "AbortError") {
        toast(t().offline);
      }
    }
  });

  window.addEventListener("keydown", event => {
    if (event.key === "ArrowRight") step(1);
    if (event.key === "ArrowLeft") step(-1);

    if (
      event.key === " " &&
      !["BUTTON", "INPUT", "SELECT", "TEXTAREA"]
        .includes(event.target.tagName)
    ) {
      event.preventDefault();
      flipped = !flipped;
      render();
    }
  });

  if (cards.length) {
    const target =
      Number.isInteger(shared) &&
      shared >= 1 &&
      shared <= 110
        ? shared
        : undefined;

    buildSequence(target);

    if (target !== undefined) {
      flipped = true;
    }

    document.documentElement.lang = lang;
    labels();

    if (roomFromUrl) {
      setMode("couple");
      enterRoom(roomFromUrl, false)
        .catch(() => toast(t().offline));
    }
  } else {
    toast("cards.js missing");
  }

  if (
    "serviceWorker" in navigator &&
    location.protocol.startsWith("http")
  ) {
    navigator.serviceWorker
      .register("./sw.js")
      .catch(() => {});
  }
})();
ocation.href);u.searchParams.set('card',c.id);u.searchParams.delete('room');try{if(navigator.share)await navigator.share({title:'Mia’s Lifestyle',text:translated(c),url:u.toString()});else{await navigator.clipboard.writeText(u.toString());toast(t().copy)}}catch(e){if(e.name!=='AbortError')toast(t().offline)}});
window.addEventListener('keydown',e=>{if(e.key==='ArrowRight')step(1);if(e.key==='ArrowLeft')step(-1);if(e.key===' '&&!['BUTTON','INPUT','SELECT','TEXTAREA'].includes(e.target.tagName)){e.preventDefault();flipped=!flipped;render()}});
if(cards.length){buildSequence(Number.isInteger(shared)&&shared>=1&&shared<=110?shared:undefined);if(Number.isInteger(shared)&&shared>=1&&shared<=110)flipped=true;document.documentElement.lang=lang;labels();if(roomFromUrl){setMode('couple');enterRoom(roomFromUrl,false).catch(()=>toast(t().offline))}}else toast('cards.js missing');
if('serviceWorker'in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('./sw.js').catch(()=>{});
})();
