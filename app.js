(() => {
  "use strict";

  function start() {
    const cards = Array.isArray(window.HEART_CARDS)
      ? window.HEART_CARDS : [];

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
        connected: "Gemeinsamer Spielraum",
        missing: "Übersetzung nicht verfügbar:",
        setup: "Firebase muss eingerichtet werden.",
        offline: "Verbindung fehlgeschlagen.",
        invalid: "Ungültiger Einladungslink.",
        front: "Tiefgründige Fragen",
        front2: "für Paare",
        categories: [
          "Alle Karten",
          "Emotionale Verbindung",
          "Liebe & Beziehung",
          "Vertrauen & Offenheit",
          "Träume & Zukunft",
          "Liebe auf Distanz",
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
        connected: "Shared game room",
        missing: "Translation unavailable:",
        setup: "Firebase must be configured.",
        offline: "Connection failed.",
        invalid: "Invalid invitation link.",
        front: "Deep Questions",
        front2: "for Couples",
        categories: [
          "All cards",
          "Emotional Connection",
          "Love & Relationships",
          "Trust & Vulnerability",
          "Dreams & Future",
          "Long-Distance Love",
          "Love Challenges"
        ]
      }
    };

    const allTranslations =
      typeof HEART_UI !== "undefined" ? HEART_UI : {};

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
    let firebaseTools = null;
    let unsubscribe = null;
    let roomReady = false;
    let remoteApply = false;
    let roomGeneration = 0;
    let connectionState = "connecting";
    let pendingWrites = Promise.resolve();

    let favorites;

    try {
      favorites = new Set(
        JSON.parse(
          localStorage.getItem("heart-favorites") || "[]"
        )
      );
    } catch {
      favorites = new Set();
    }

    const params = new URLSearchParams(location.search);
    const shared = Number(params.get("card"));
    const roomFromUrl = params.get("room");

    function t() {
      return {
        ...fallback.en,
        ...(fallback[lang] || {}),
        ...(allTranslations[lang] || {})
      };
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

    function connectionText(state) {
      const messages = {
        de: {
          connecting: "Verbindung wird hergestellt …",
          connected: "Gemeinsamer Spielraum · verbunden",
          offline: "Verbindung unterbrochen"
        },
        en: {
          connecting: "Connecting …",
          connected: "Shared game room · connected",
          offline: "Connection interrupted"
        },
        es: {
          connecting: "Conectando …",
          connected: "Sala compartida · conectado",
          offline: "Conexión interrumpida"
        },
        fr: {
          connecting: "Connexion en cours …",
          connected: "Salon partagé · connecté",
          offline: "Connexion interrompue"
        },
        zh: {
          connecting: "正在连接…",
          connected: "共享房间 · 已连接",
          offline: "连接已中断"
        },
        ur: {
          connecting: "رابطہ قائم ہو رہا ہے…",
          connected: "مشترکہ کمرہ · منسلک",
          offline: "رابطہ منقطع ہوگیا"
        },
        hi: {
          connecting: "कनेक्ट हो रहा है…",
          connected: "साझा कमरा · कनेक्टेड",
          offline: "कनेक्शन टूट गया"
        },
        ar: {
          connecting: "جارٍ الاتصال…",
          connected: "غرفة مشتركة · متصل",
          offline: "انقطع الاتصال"
        }
      };

      return (messages[lang] || messages.en)[state];
    }

    function setConnection(state) {
      connectionState = state;

      if ($("roomStatus")) {
        $("roomStatus").textContent =
          connectionText(state);
      }
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
      const key =
        "title" + lang[0].toUpperCase() + lang.slice(1);

      return card[key] || card.titleEn || "";
    }

    function current() {
      return cards[sequence[position]];
    }

    function updateFront() {
      const front = document.querySelector(
        ".playing-card .front .big, " +
        ".card-front .big, .front .big"
      );

      if (!front) return;

      const x = t();

      const desired =
        `100<br><em>${x.front || x.heading}</em>` +
        `<br>${x.front2 || x.heading2}`;

      if (front.innerHTML !== desired) {
        front.innerHTML = desired;
      }

      front.dir =
        ["ar", "ur"].includes(lang) ? "rtl" : "auto";
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
          const j = Math.floor(
            Math.random() * (i + 1)
          );

          [sequence[i], sequence[j]] =
            [sequence[j], sequence[i]];
        }
      }

      position = target === undefined
        ? 0
        : Math.max(
            0,
            sequence.findIndex(i =>
              Number(cards[i].id) === Number(target)
            )
          );

      flipped = false;
      render();
    }

    function render() {
      const card = current();
      if (!card) return;

      const x = t();
      const question = translated(card);

      $("card").classList.toggle("flipped", flipped);

      $("counter").textContent =
        `${position + 1} / ${sequence.length}`;

      $("number").textContent =
        String(card.id).padStart(2, "0");

      $("categoryName").textContent =
        (x.categories[Number(card.cat) + 1] || "")
          .toUpperCase();

      $("question").textContent = question;

      $("question").classList.toggle(
        "long",
        question.length > 112
      );

      $("bonusTitle").textContent =
        Number(card.cat) === 5
          ? cardTitle(card)
          : "";

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
        if ($(id)) $(id).textContent = value;
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

      x.categories.forEach((name, i) => {
        const option = document.createElement("option");

        option.value =
          i === 0 ? "all" : String(i - 1);

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

      if (roomId) {
        setConnection(connectionState);
      }

      updateFront();
      render();
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

    function roomState() {
      return {
        cardId: Number(current().id),
        category,
        random,
        flipped,
        sequence: sequence.map(i =>
          Number(cards[i].id)
        ),
        updatedAt: Date.now()
      };
    }

    function canPlay() {
      if (mode !== "couple") return true;

      if (!roomId) {
        return false;
      }

      if (!roomReady) {
        toast(connectionText(connectionState));
        return false;
      }

      return true;
    }

    function syncCard() {
      if (
        mode !== "couple" ||
        !roomId ||
        !roomReady ||
        remoteApply ||
        !current() ||
        !firebaseTools
      ) {
        return;
      }

      const id = roomId;
      const state = roomState();

      const ref = firebaseTools.doc(
        db,
        "rooms",
        id
      );

      pendingWrites = pendingWrites
        .catch(() => {})
        .then(async () => {
          if (roomId !== id) return;

          await firebaseTools.updateDoc(
            ref,
            state
          );
        })
        .catch(error => {
          console.error(
            "Card synchronization failed:",
            error
          );

          toast(t().offline);
        });
    }

    function step(direction) {
      if (!sequence.length || !canPlay()) return;

      position =
        (position + direction + sequence.length) %
        sequence.length;

      flipped = true;
      render();
      syncCard();
    }

    async function firebaseReady() {
      if (db && firebaseTools) return true;

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
          appSdk,
          authSdk,
          storeSdk
        ] = await Promise.all([
          import(
            "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js"
          ),
          import(
            "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js"
          ),
          import(
            "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js"
          )
        ]);

        const app = appSdk.getApps().length
          ? appSdk.getApp()
          : appSdk.initializeApp(config);

        const auth = authSdk.getAuth(app);

        if (!auth.currentUser) {
          await authSdk.signInAnonymously(auth);
        }

        db = storeSdk.getFirestore(app);

        firebaseTools = {
          doc: storeSdk.doc,
          getDoc: storeSdk.getDoc,
          setDoc: storeSdk.setDoc,
          onSnapshot: storeSdk.onSnapshot,
          updateDoc: storeSdk.updateDoc
        };

        return true;
      } catch (error) {
        console.error(
          "Firebase initialization failed:",
          error
        );

        toast(t().offline);
        return false;
      }
    }

    function applyRoomData(data) {
      remoteApply = true;

      try {
        category =
          typeof data.category === "string"
            ? data.category
            : "all";

        if (
          category !== "all" &&
          !/^[0-5]$/.test(category)
        ) {
          category = "all";
        }

        random = !!data.random;

        $("category").value = category;
        $("random").checked = random;

        const ids = Array.isArray(data.sequence)
          ? data.sequence
          : [];

        const restored = ids
          .map(id =>
            cards.findIndex(card =>
              Number(card.id) === Number(id)
            )
          )
          .filter(i => i >= 0);

        if (restored.length) {
          sequence = restored;
        } else {
          buildSequence(data.cardId);
        }

        position = Math.max(
          0,
          sequence.findIndex(i =>
            Number(cards[i].id) === Number(data.cardId)
          )
        );

        flipped =
          typeof data.flipped === "boolean"
            ? data.flipped
            : true;

        render();
      } finally {
        remoteApply = false;
      }
    }

    function stopListening() {
      if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
      }
    }

    async function enterRoom(id, create) {
      if (!validRoom(id)) {
        toast(t().invalid);
        return;
      }

      const generation = ++roomGeneration;

      stopListening();

      roomId = id;
      roomReady = false;

      setMode("couple");
      setConnection("connecting");

      $("roomLink").value = roomUrl(id);

      try {
        if (!await firebaseReady()) {
          throw new Error("Firebase unavailable");
        }

        if (generation !== roomGeneration) return;

        const ref = firebaseTools.doc(
          db,
          "rooms",
          id
        );

        if (create) {
          category = "all";
          random = false;

          $("category").value = "all";
          $("random").checked = false;

          buildSequence();

          flipped = false;
          render();

          await firebaseTools.setDoc(
            ref,
            roomState()
          );
        } else {
          const snapshot =
            await firebaseTools.getDoc(ref);

          if (!snapshot.exists()) {
            throw new Error("Room does not exist");
          }

          if (generation !== roomGeneration) return;

          applyRoomData(snapshot.data());
        }

        if (generation !== roomGeneration) return;

        const url = new URL(location.href);

        url.searchParams.set("room", id);
        url.searchParams.delete("card");

        history.replaceState({}, "", url);

        unsubscribe = firebaseTools.onSnapshot(
          ref,
          { includeMetadataChanges: true },
          snapshot => {
            if (
              generation !== roomGeneration ||
              roomId !== id
            ) {
              return;
            }

            if (!snapshot.exists()) {
              if (!snapshot.metadata.fromCache) {
                toast(t().invalid);
                leaveRoom();
              } else {
                roomReady = false;
                setConnection("offline");
              }

              return;
            }

            applyRoomData(snapshot.data());

            roomReady = !snapshot.metadata.fromCache;

            setConnection(
              roomReady ? "connected" : "offline"
            );
          },
          error => {
            if (generation !== roomGeneration) return;

            console.error(
              "Room listener error:",
              error
            );

            roomReady = false;
            setConnection("offline");
            toast(t().offline);
          }
        );
      } catch (error) {
        console.error(
          "Could not enter room:",
          error
        );

        if (generation !== roomGeneration) return;

        roomReady = false;
        setConnection("offline");
        toast(t().offline);

        if (create) {
          roomId = null;
          setMode("couple");
        } else {
          const url = new URL(location.href);

          url.searchParams.set("room", id);
          url.searchParams.delete("card");

          history.replaceState({}, "", url);
        }
      }
    }

    function leaveRoom() {
      ++roomGeneration;

      stopListening();

      roomId = null;
      roomReady = false;
      remoteApply = false;

      const url = new URL(location.href);

      url.searchParams.delete("room");

      history.replaceState({}, "", url);

      setMode("solo");
    }

    $("card").addEventListener("click", () => {
      if (!canPlay()) return;

      flipped = !flipped;

      render();
      syncCard();
    });

    $("next").addEventListener(
      "click",
      () => step(1)
    );

    $("prev").addEventListener(
      "click",
      () => step(-1)
    );

    $("category").addEventListener(
      "change",
      event => {
        if (!canPlay()) {
          event.target.value = category;
          return;
        }

        category = event.target.value;

        buildSequence();
        syncCard();
      }
    );

    $("random").addEventListener(
      "change",
      event => {
        if (!canPlay()) {
          event.target.checked = random;
          return;
        }

        random = event.target.checked;

        buildSequence();
        syncCard();"
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
          {
            getFirestore,
            doc,
            setDoc,
            onSnapshot,
            updateDoc
          }
        ] = await Promise.all([
          import(
            "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js"
          ),
          import(
            "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js"
          ),
          import(
            "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js"
          )
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
                cards.findIndex(card =>
                  Number(card.id) === Number(id)
                )
              )
              .filter(i => i >= 0);

            if (!sequence.length) {
              buildSequence(data.cardId);
            }

            position = Math.max(
              0,
              sequence.findIndex(i =>
                Number(cards[i].id) ===
                Number(data.cardId)
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

    $("next").addEventListener(
      "click",
      () => step(1)
    );

    $("prev").addEventListener(
      "click",
      () => step(-1)
    );

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

    $("createRoom").addEventListener(
      "click",
      async () => {
        try {
          await enterRoom(randomId(), true);
        } catch (error) {
          console.error(error);
          toast(t().offline);
        }
      }
    );

    $("joinRoom").addEventListener(
      "click",
      async () => {
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
      }
    );

    $("leaveRoom").addEventListener(
      "click",
      leaveRoom
    );

    $("copyRoom").addEventListener(
      "click",
      async () => {
        try {
          await navigator.clipboard.writeText(
            $("roomLink").value
          );
          toast(t().copy);
        } catch {
          toast($("roomLink").value);
        }
      }
    );

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

    $("share").addEventListener(
      "click",
      async () => {
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
      }
    );

    window.addEventListener("keydown", event => {
      if (event.key === "ArrowRight") step(1);
      if (event.key === "ArrowLeft") step(-1);

      if (
        event.key === " " &&
        ![
          "BUTTON",
          "INPUT",
          "SELECT",
          "TEXTAREA"
        ].includes(event.target.tagName)
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
  }

  // Load the eight-language interface automatically.
  // No changes to index.html are required.

  if (typeof HEART_UI !== "undefined") {
    start();
  } else {
    const script = document.createElement("script");
    script.src = "./interface.js?v=2";

    script.onload = () => start();
    script.onerror = () => {
      console.error("interface.js could not be loaded");
      start();
    };

    document.head.appendChild(script);
  }
})();
                 
