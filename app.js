(() => {
  "use strict";

  function start() {
    const $ = id => document.getElementById(id);
    const cards = Array.isArray(window.HEART_CARDS) ? window.HEART_CARDS : [];
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
    const fallback = {
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
        missing: "Übersetzung nicht verfügbar:",
        setup: "Firebase muss eingerichtet werden.",
        offline: "Verbindung fehlgeschlagen.",
        invalid: "Ungültiger Einladungslink.",
        front: "Tiefgründige Fragen",
        front2: "für Paare",
        categories: [
          "Alle Karten", "Emotionale Verbindung",
          "Liebe & Beziehung", "Vertrauen & Offenheit",
          "Träume & Zukunft", "Liebe auf Distanz",
          "Love Challenges"
        ]
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
        missing: "Translation unavailable:",
        setup: "Firebase must be configured.",
        offline: "Connection failed.",
        invalid: "Invalid invitation link.",
        front: "Deep Questions",
        front2: "for Couples",
        categories: [
          "All cards", "Emotional Connection",
          "Love & Relationships", "Trust & Vulnerability",
          "Dreams & Future", "Long-Distance Love",
          "Love Challenges"
        ]
      }
    };
    const ui = typeof HEART_UI !== "undefined" ? HEART_UI : {};
    let lang = localStorage.getItem("heart-lang") || "de";
    if (!languages[lang]) lang = "de";

    let category = "all", random = false, sequence = [];
    let position = 0, flipped = false, mode = "solo";
    let roomId = null, roomReady = false, generation = 0;
    let unsubscribe = null, db = null, fs = null;
    let writing = Promise.resolve(), remoteApply = false;
    let status = "connecting", gameStarted = false;
    let favorites;
    try {
      favorites = new Set(JSON.parse(localStorage.getItem("heart-favorites") || "[]"));
    } catch {
      favorites = new Set();
    }
    const query = new URLSearchParams(location.search);
    const t = () => ({
      ...fallback.en,
      ...(fallback[lang] || {}),
      ...(ui[lang] || {})
    });
    const toast = msg => {
      if (!$("toast")) return;
      $("toast").textContent = msg;
      $("toast").classList.add("show");
      clearTimeout(window._heartToast);
      window._heartToast = setTimeout(() => $("toast").classList.remove("show"), 2600);
    };
    const translated = c =>
      typeof c[lang] === "string" && c[lang].trim()
        ? c[lang]
        : t().missing + "\n\n" + (c.en || c.de || "");
    const current = () => cards[sequence[position]];
    const roomUrl = id => {
      const u = new URL(location.href);
      u.searchParams.delete("card");
      u.searchParams.set("room", id);
      return u.toString();
    };
    const validRoom = id => /^[a-f0-9]{40}$/.test(id || "");

    function updateFront() {
      const el = document.querySelector(
        ".playing-card .front .big, .card-front .big, .front .big"
      );
      if (el) {
        const x = t();
        el.innerHTML = "100<br><em>" + (x.front || x.heading) +
          "</em><br>" + (x.front2 || x.heading2);
        el.dir = ["ar", "ur"].includes(lang) ? "rtl" : "auto";
      }
    }

    function render() {
      const c = current();
      if (!c) return;
      const x = t(), question = translated(c);
      $("card").classList.toggle("flipped", flipped);
      $("counter").textContent = (position + 1) + " / " + sequence.length;
      $("number").textContent = String(c.id).padStart(2, "0");
      $("categoryName").textContent =
        (x.categories[Number(c.cat) + 1] || "").toUpperCase();
      $("question").textContent = question;
      $("question").classList.toggle("long", question.length > 112);
      const key = "title" + lang[0].toUpperCase() + lang.slice(1);
      $("bonusTitle").textContent =
        Number(c.cat) === 5 ? (c[key] || c.titleEn || "") : "";
      $("favoriteText").textContent =
        favorites.has(c.id) ? x.saved : x.favorite;
      $("favorite").firstChild.textContent =
        favorites.has(c.id) ? "♥ " : "♡ ";
      $("question").dir = ["ar", "ur"].includes(lang) ? "rtl" : "auto";
      $("card").setAttribute("aria-label", flipped ? "Flip card" : "Reveal question");
      const btn = $("startGame");
      if (btn) {
        btn.hidden = !(mode === "couple" && roomId &&
          roomReady && !gameStarted);
      }
    }

    function buildSequence(target) {
      sequence = cards.map((_, i) => i).filter(i =>
        category === "all" || Number(cards[i].cat) === Number(category)
      );
      if (random) {
        for (let i = sequence.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [sequence[i], sequence[j]] = [sequence[j], sequence[i]];
        }
      }
      position = target === undefined ? 0 :
        Math.max(0, sequence.findIndex(i =>
          Number(cards[i].id) === Number(target)));
      flipped = false;
      render();
    }

    function connectionText(s) {
      const messages = {
        de: ["Verbindung wird hergestellt …",
          "Gemeinsamer Spielraum · verbunden",
          "Verbindung unterbrochen"],
        en: ["Connecting …", "Shared game room · connected",
          "Connection interrupted"]
      };
      const a = messages[lang] || messages.en;
      return a[s === "connected" ? 1 : s === "offline" ? 2 : 0];
    }

    function setConnection(s) {
      status = s;
      if ($("roomStatus")) $("roomStatus").textContent = connectionText(s);
    }

    function labels() {
      const x = t();
      $("heading").innerHTML = x.heading + "<br><em>" + x.heading2 + "</em>";
      const fields = {
        subtitle: x.subtitle, categoryLabel: x.category,
        shuffleLabel: x.shuffle, prevText: x.prev,
        nextText: x.next, shareText: x.share,
        tap: x.tap, footerText: x.footer,
        soloText: x.solo, coupleText: x.couple,
        createRoom: x.create, joinRoom: x.join,
        leaveRoom: x.leave, copyRoom: x.copy,
        roomLabel: x.room
      };
      Object.entries(fields).forEach(([id, value]) => {
        if ($(id)) $(id).textContent = value;
      });
      const select = $("lang");
      select.replaceChildren();
      Object.entries(languages).forEach(([code, name]) => {
        const o = document.createElement("option");
        o.value = code;
        o.textContent = name;
        select.appendChild(o);
      });
      select.value = lang;
      const cats = $("category");
      cats.replaceChildren();
      x.categories.forEach((name, i) => {
        const o = document.createElement("option");
        o.value = i === 0 ? "all" : String(i - 1);
        o.textContent = name;
        cats.appendChild(o);
      });
      cats.value = category;
      if ($("joinInput")) {
        $("joinInput").placeholder = lang === "de"
          ? "Einladungslink oder Raumcode"
          : "Invitation link or room code";
      }
      updateFront();
      if (roomId) setConnection(status);
      if ($("startGame")) $("startGame").textContent =
        lang === "de" ? "Spiel starten" : "Start game";
      render();
    }

    function setMode(next) {
      mode = next;
      $("soloMode").classList.toggle("selected", next === "solo");
      $("coupleMode").classList.toggle("selected", next === "couple");
      $("couplePanel").hidden = next !== "couple";
      $("roomActive").hidden = !(next === "couple" && roomId);
      $("roomSetup").hidden = !!roomId;
      render();
    }

    function ensureStartButton() {
      if ($("startGame")) return;
      const btn = document.createElement("button");
      btn.id = "startGame";
      btn.className = "primary";
      btn.hidden = true;
      btn.style.cssText =
        "display:block;margin:12px auto;max-width:260px;width:100%;";
      $("card").parentElement.insertAdjacentElement("afterend", btn);
      btn.addEventListener("click", () => {
        if (!canPlay()) return;
        gameStarted = true;
        flipped = true;
        render();
        syncCard();
      });
    }

    function roomState() {
      return {
        cardId: Number(current().id),
        category, random, flipped,
        started: gameStarted,
        sequence: sequence.map(i => Number(cards[i].id)),
        updatedAt: Date.now()
      };
    }

    function canPlay() {
      if (mode !== "couple") return true;
      if (!roomId) return false;
      if (!roomReady) {
        toast(connectionText(status));
        return false;
      }
      return true;
    }

    function syncCard() {
      if (mode !== "couple" || !roomId || !roomReady ||
          remoteApply || !current() || !fs) return;
      const id = roomId;
      const state = roomState();
      const ref = fs.doc(db, "rooms", id);
      writing = writing.catch(() => {}).then(async () => {
        if (roomId !== id) return;
        await fs.updateDoc(ref, state);
      }).catch(e => {
        console.error("Synchronization:", e);
        toast(t().offline);
      });
    }

    function step(delta) {
      if (!sequence.length || !canPlay()) return;
      position = (position + delta + sequence.length) % sequence.length;
      gameStarted = true;
      flipped = true;
      render();
      syncCard();
    }

    async function firebaseReady() {
      if (db && fs) return true;
      const config = window.HEART_FIREBASE_CONFIG;
      if (!config || !config.apiKey || config.apiKey === "REPLACE_ME") {
        toast(t().setup);
        return false;
      }
      try {
        const [appSdk, authSdk, storeSdk] = await Promise.all([
          import("https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js"),
          import("https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js"),
          import("https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js")
        ]);
        const app = appSdk.getApps().length
          ? appSdk.getApp() : appSdk.initializeApp(config);
        const auth = authSdk.getAuth(app);
        if (!auth.currentUser) await authSdk.signInAnonymously(auth);
        db = storeSdk.getFirestore(app);
        fs = {
          doc: storeSdk.doc,
          getDoc: storeSdk.getDoc,
          setDoc: storeSdk.setDoc,
          onSnapshot: storeSdk.onSnapshot,
          updateDoc: storeSdk.updateDoc
        };
        return true;
      } catch (e) {
        console.error("Firebase:", e);
        toast(t().offline);
        return false;
      }
    }

    function applyRoomData(data) {
      remoteApply = true;
      try {
        category = typeof data.category === "string"
          ? data.category : "all";
        if (category !== "all" && !/^[0-5]$/.test(category)) {
          category = "all";
        }
        random = !!data.random;
        $("category").value = category;
        $("random").checked = random;
        const ids = Array.isArray(data.sequence) ? data.sequence : [];
        const restored = ids.map(id =>
          cards.findIndex(c => Number(c.id) === Number(id))
        ).filter(i => i >= 0);
        if (restored.length) sequence = restored;
        else buildSequence(data.cardId);
        position = Math.max(0, sequence.findIndex(i =>
          Number(cards[i].id) === Number(data.cardId)
        ));
        gameStarted = typeof data.started === "boolean"
          ? data.started : !!data.flipped;
        flipped = typeof data.flipped === "boolean"
          ? data.flipped : false;
        render();
      } finally {
        remoteApply = false;
      }
    }

    function leaveRoom() {
      ++generation;
      if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
      }
      roomId = null;
      roomReady = false;
      gameStarted = false;
      const u = new URL(location.href);
      u.searchParams.delete("room");
      history.replaceState({}, "", u);
      setMode("solo");
    }

    async function enterRoom(id, create) {
      if (!validRoom(id)) {
        toast(t().invalid);
        return;
      }
      const gen = ++generation;
      if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
      }
      roomId = id;
      roomReady = false;
      setMode("couple");
      setConnection("connecting");
      $("roomLink").value = roomUrl(id);
      try {
        if (!await firebaseReady()) throw Error("Firebase unavailable");
        if (gen !== generation) return;
        const ref = fs.doc(db, "rooms", id);
        if (create) {
          category = "all";
          random = false;
          gameStarted = false;
          $("category").value = "all";
          $("random").checked = false;
          buildSequence();
          flipped = false;
          render();
          await fs.setDoc(ref, roomState());
        } else {
          const snap = await fs.getDoc(ref);
          if (!snap.exists()) throw Error("Room not found");
          if (gen !== generation) return;
          applyRoomData(snap.data());
        }
        if (gen !== generation) return;
        const u = new URL(location.href);
        u.searchParams.set("room", id);
        u.searchParams.delete("card");
        history.replaceState({}, "", u);
        unsubscribe = fs.onSnapshot(
          ref,
          { includeMetadataChanges: true },
          snap => {
            if (gen !== generation || roomId !== id) return;
            if (!snap.exists()) {
              if (!snap.metadata.fromCache) {
                toast(t().invalid);
                leaveRoom();
              } else {
                roomReady = false;
                setConnection("offline");
              }
              return;
            }
            applyRoomData(snap.data());
            roomReady = !snap.metadata.fromCache;
            setConnection(roomReady ? "connected" : "offline");
            render();
          },
          e => {
            if (gen !== generation) return;
            console.error("Room listener:", e);
            roomReady = false;
            setConnection("offline");
            toast(t().offline);
          }
        );
      } catch (e) {
        if (gen !== generation) return;
        console.error("Room:", e);
        toast(t().offline);
        roomReady = false;
        setConnection("offline");
        if (create) {
          roomId = null;
          setMode("couple");
        }
      }
    }

    if (!cards.length) {
      toast("cards.js missing");
      return;
    }
    ensureStartButton();
    const shared = Number(query.get("card"));
    buildSequence(
      Number.isInteger(shared) && shared >= 1 && shared <= 110
        ? shared : undefined
    );
    if (query.has("card") && shared >= 1 && shared <= 110) {
      flipped = true;
      gameStarted = true;
    }
    document.documentElement.lang = lang;
    labels();

    $("card").addEventListener("click", () => {
      if (!canPlay()) return;
      if (mode === "couple" && !gameStarted) gameStarted = true;
      flipped = !flipped;
      render();
      syncCard();
    });
    $("next").addEventListener("click", () => step(1));
    $("prev").addEventListener("click", () => step(-1));
    $("category").addEventListener("change", e => {
      if (!canPlay()) {
        e.target.value = category;
        return;
      }
      category = e.target.value;
      buildSequence();
      gameStarted = false;
      syncCard();
    });
    $("random").addEventListener("change", e => {
      if (!canPlay()) {
        e.target.checked = random;
        return;
      }
      random = e.target.checked;
      buildSequence();
      gameStarted = false;
      syncCard();
    });
    $("lang").addEventListener("change", e => {
      if (!languages[e.target.value]) return;
      lang = e.target.value;
      localStorage.setItem("heart-lang", lang);
      document.documentElement.lang = lang;
      labels();
    });
    $("soloMode").addEventListener("click", () => {
      if (roomId) leaveRoom();
      else setMode("solo");
    });
    $("coupleMode").addEventListener("click", () => setMode("couple"));
    $("createRoom").addEventListener("click", () => {
      const bytes = crypto.getRandomValues(new Uint8Array(20));
      const id = Array.from(bytes, b =>
        b.toString(16).padStart(2, "0")
      ).join("");
      enterRoom(id, true);
    });
    $("joinRoom").addEventListener("click", () => {
      const raw = $("joinInput").value.trim();
      let id = raw;
      try {
        id = new URL(raw).searchParams.get("room") || raw;
      } catch {}
      enterRoom(id, false);
    });
    $("leaveRoom").addEventListener("click", leaveRoom);
    $("copyRoom").addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText($("roomLink").value);
        toast(t().copy);
      } catch {
        toast($("roomLink").value);
      }
    });
    $("favorite").addEventListener("click", () => {
      const id = current().id;
      if (favorites.has(id)) favorites.delete(id);
      else favorites.add(id);
      localStorage.setItem(
        "heart-favorites",
        JSON.stringify([...favorites])
      );
      render();
    });
    $("share").addEventListener("click", async () => {
      const c = current();
      const u = new URL(location.href);
      u.searchParams.set("card", c.id);
      u.searchParams.delete("room");
      try {
        if (navigator.share) {
          await navigator.share({
            title: "Mia’s Lifestyle",
            text: translated(c),
            url: u.toString()
          });
        } else {
          await navigator.clipboard.writeText(u.toString());
          toast(t().copy);
        }
      } catch (e) {
        if (e.name !== "AbortError") toast(t().offline);
      }
    });
    window.addEventListener("keydown", e => {
      if (["INPUT", "SELECT", "TEXTAREA", "BUTTON"].includes(e.target.tagName)) return;
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
      if (e.key === " ") {
        e.preventDefault();
        if (!canPlay()) return;
        gameStarted = true;
        flipped = !flipped;
        render();
        syncCard();
      }
    });
    if (query.get("room")) enterRoom(query.get("room"), false);
    if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
      navigator.serviceWorker.register("./sw.js").catch(() => {});
    }
  }

  if (typeof HEART_UI !== "undefined") start();
  else {
    const script = document.createElement("script");
    script.src = "./interface.js?v=2";
    script.onload = () => start();
    script.onerror = () => start();
    document.head.appendChild(script);
  }
})();
