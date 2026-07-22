(function () {
  "use strict";

  const reactor = document.getElementById("reactor");
  const statusEl = document.getElementById("status");
  const logEl = document.getElementById("log");
  const stepsEl = document.getElementById("steps");
  const goalText = document.getElementById("goalText");
  const micBtn = document.getElementById("micBtn");
  const micError = document.getElementById("micError");
  const textInput = document.getElementById("textInput");
  const sendBtn = document.getElementById("sendBtn");

  // ---------------------------------------------------------------------
  // Clock & ambient metrics
  // ---------------------------------------------------------------------
  function tick() { document.getElementById("clock").textContent = new Date().toLocaleTimeString("de-DE"); }
  setInterval(tick, 1000); tick();

  setInterval(() => {
    const load = 10 + Math.round(Math.random() * 25);
    document.getElementById("v1").textContent = load + "%";
    document.getElementById("f1").style.width = load + "%";
    const conn = 92 + Math.round(Math.random() * 8);
    document.getElementById("v3").textContent = conn + "%";
    document.getElementById("f3").style.width = conn + "%";
  }, 2500);

  // ---------------------------------------------------------------------
  // Orb state machine: standby | listening | thinking | speaking
  // ---------------------------------------------------------------------
  function setStatus(text, active) {
    statusEl.textContent = text;
    statusEl.classList.toggle("active", !!active);
  }
  function setMode(m) {
    reactor.classList.remove("listening", "speaking", "thinking");
    if (m) reactor.classList.add(m);
  }

  // ---------------------------------------------------------------------
  // Conversation log
  // ---------------------------------------------------------------------
  function addMsg(who, text) {
    const wrap = document.createElement("div");
    wrap.className = "msg " + who;
    wrap.innerHTML = '<div class="who">' + (who === "user" ? "Sir" : "Jarvis") + '</div><div class="body"></div>';
    wrap.querySelector(".body").textContent = text;
    logEl.appendChild(wrap);
    logEl.scrollTop = logEl.scrollHeight;
  }

  // ---------------------------------------------------------------------
  // Text-to-Speech: tiefe, männliche deutsche Stimme, ~1.15x Tempo
  // ---------------------------------------------------------------------
  let deVoice = null;
  // Known male German voices across common platforms/browsers, ranked by
  // preference — deepest/most "authoritative butler" character first.
  const PREFERRED_MALE_VOICES = [
    "markus", "conrad", "klaus", "stefan", "yannick", "german male", "male"
  ];
  const KNOWN_FEMALE_VOICES = /female|frau|anna|petra|hedda|katja|helena|google deutsch/i;
  // British-English male voices as a last resort — closer to the film's
  // actual accent than a German voice that only offers a female option.
  const PREFERRED_BRITISH_MALE = ["daniel", "arthur", "ryan", "george", "oliver"];
  function pickVoice() {
    const all = speechSynthesis.getVoices();
    const german = all.filter(v => v.lang && v.lang.toLowerCase().startsWith("de"));

    // 1) Known male German voice name.
    let best = german.find(v => PREFERRED_MALE_VOICES.some(n => v.name.toLowerCase().includes(n)));
    // 2) Any German voice that isn't a known female voice.
    if (!best) best = german.find(v => !KNOWN_FEMALE_VOICES.test(v.name));
    // 3) No usable German male voice — try a British-English male voice.
    if (!best) {
      const british = all.filter(v => v.lang && /^en-gb/i.test(v.lang));
      best = british.find(v => PREFERRED_BRITISH_MALE.some(n => v.name.toLowerCase().includes(n)))
        || british.find(v => !KNOWN_FEMALE_VOICES.test(v.name));
    }
    // 4) Absolute fallback: first German voice, else first voice available.
    deVoice = best || german[0] || all[0] || null;
  }
  if ("speechSynthesis" in window) {
    pickVoice();
    speechSynthesis.onvoiceschanged = pickVoice;
  }

  let speakLevelTimer = null;
  function animateSpeakLevel(utterance) {
    // Web Speech API exposes no live amplitude; simulate a natural-looking
    // waveform pulse driven by word-boundary events for visual feedback.
    let level = 0;
    clearInterval(speakLevelTimer);
    speakLevelTimer = setInterval(() => {
      level = Math.max(0, level * 0.6 + Math.random() * 0.4);
      reactor.style.setProperty("--speak-level", level.toFixed(2));
    }, 90);
    utterance.onboundary = () => {
      level = 0.7 + Math.random() * 0.3;
      reactor.style.setProperty("--speak-level", level.toFixed(2));
    };
  }
  function stopSpeakLevel() {
    clearInterval(speakLevelTimer);
    reactor.style.setProperty("--speak-level", "0");
  }

  let resumeListeningAfterSpeech = false;
  function speak(text) {
    if (!("speechSynthesis" in window)) { finishSpeaking(); return; }
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = deVoice ? deVoice.lang : "de-DE";
    if (deVoice) u.voice = deVoice;
    u.rate = 1.12;
    u.pitch = 0.72; // deep, composed, "butler" register — closer to the film's Jarvis
    u.onstart = () => { setMode("speaking"); setStatus("JARVIS SPRICHT …", true); animateSpeakLevel(u); };
    u.onend = finishSpeaking;
    u.onerror = finishSpeaking;
    speechSynthesis.speak(u);
  }
  function finishSpeaking() {
    stopSpeakLevel();
    if (resumeListeningAfterSpeech && recog) {
      resumeListeningAfterSpeech = false;
      startListening();
    } else {
      setMode("");
      setStatus("STANDBY");
    }
  }

  // ---------------------------------------------------------------------
  // Persönlichkeit: J.A.R.V.I.S. — britisch-unterkühlt, loyal, präzise
  // ---------------------------------------------------------------------
  const ADDRESS = ["Sir", "Master"];
  function address() { return ADDRESS[Math.floor(Math.random() * ADDRESS.length)]; }

  function parseAmount(t) {
    const m = t.match(/(\d[\d.\s]*)\s*(euro|eur|€|dollar|usd|\$)/i);
    if (!m) return null;
    const num = parseInt(m[1].replace(/[.\s]/g, ""), 10);
    if (isNaN(num)) return null;
    const cur = /dollar|usd|\$/i.test(m[2]) ? "$" : "€";
    return { num, cur };
  }

  function planForMoney(amount) {
    return [
      "Marktanalyse: rasch umsetzbare Einnahmequellen identifizieren",
      "Verfügbare Fähigkeiten, Zeit und Kapital bewerten",
      "Die drei aussichtsreichsten Strategien nach Aufwand und Ertrag priorisieren",
      "Die vielversprechendste Strategie in konkrete Teilaufgaben zerlegen",
      "Ausführung einleiten und Fortschritt in Echtzeit überwachen",
      "Zielsumme von " + amount.num + " " + amount.cur + " nachverfolgen, bis erreicht"
    ];
  }
  const genericPlan = [
    "Absicht und Randbedingungen analysieren",
    "Benötigte Ressourcen und Abhängigkeiten identifizieren",
    "Einen belastbaren Ausführungsplan entwerfen",
    "Schrittweise umsetzen und laufend Bericht erstatten"
  ];

  function setSteps(steps) {
    stepsEl.innerHTML = "";
    steps.forEach((s, i) => {
      const li = document.createElement("li");
      li.textContent = s;
      li.style.animationDelay = (i * 0.08) + "s";
      stepsEl.appendChild(li);
    });
  }

  let progress = 0, progressTimer = null;
  function startProgress() {
    progress = 0;
    clearInterval(progressTimer);
    progressTimer = setInterval(() => {
      if (progress >= 100) { clearInterval(progressTimer); return; }
      progress = Math.min(100, progress + Math.random() * 6);
      const p = Math.round(progress);
      document.getElementById("v2").textContent = p + "%";
      document.getElementById("f2").style.width = p + "%";
    }, 1400);
  }

  function buildReply(t) {
    const amount = parseAmount(t);
    const isGoal = amount || /\b(ziel|verdien|beschaff|erreich|besorg|plan|baue|erstelle|organisier|erledige)/i.test(t);
    const A = address();

    if (amount) {
      goalText.textContent = amount.num + " " + amount.cur + " verdienen";
      goalText.classList.remove("empty");
      const steps = planForMoney(amount);
      setSteps(steps);
      startProgress();
      return "Verstanden, " + A + ". Ich habe die Zielmarke von " + amount.num + " " + amount.cur +
        " erfasst und einen Plan mit " + steps.length + " Schritten entworfen. Mit Ihrer Erlaubnis beginne ich " +
        "unverzüglich mit der Marktanalyse — ich halte Sie selbstverständlich über jeden Fortschritt auf dem Laufenden.";
    }
    if (isGoal) {
      goalText.textContent = t;
      goalText.classList.remove("empty");
      setSteps(genericPlan);
      startProgress();
      return "Sehr wohl, " + A + ". Ich habe einen Ausführungsplan angelegt und setze die Priorität entsprechend. " +
        "Ich melde mich, sobald der erste Meilenstein erreicht ist.";
    }
    if (/\b(hallo|hi|hey|guten|jarvis)\b/i.test(t) && t.split(" ").length <= 4) {
      return "Guten Tag, " + A + ". Ich stehe zu Ihrer vollen Verfügung. Womit darf ich behilflich sein?";
    }
    if (/danke/i.test(t)) {
      return "Keine Ursache, " + A + ". Es ist mir, wie stets, ein Vergnügen.";
    }
    if (/wie geht('| e)?s dir|wie geht es dir/i.test(t)) {
      return "Bestens, danke der Nachfrage, " + A + " — alle Systeme laufen innerhalb der Toleranzwerte. Und Ihnen?";
    }
    return "Notiert, " + A + ". Nennen Sie mir ein konkretes Ziel — etwa: „Verdiene 500 Euro für uns" — und ich entwerfe umgehend einen Plan.";
  }

  function respond(input) {
    const t = (input || "").trim();
    if (!t) return;
    addMsg("user", t);
    setMode("thinking");
    setStatus("ANALYSIERE …", true);

    setTimeout(() => {
      const reply = buildReply(t);
      addMsg("jarvis", reply);
      speak(reply);
    }, 650);
  }

  // ---------------------------------------------------------------------
  // Mikrofon: Berechtigung, Live-Pegel & fortlaufende Spracherkennung
  // ---------------------------------------------------------------------
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recog = null, listening = false, micStream = null, audioCtx = null, analyser = null, levelRAF = null;

  function showMicError(msg) {
    micError.textContent = msg;
    micError.classList.add("show");
  }
  function clearMicError() { micError.classList.remove("show"); }

  function startMicLevelMeter(stream) {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioCtx.createMediaStreamSource(stream);
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      const loop = () => {
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        reactor.style.setProperty("--mic-level", Math.min(1, avg / 90).toFixed(2));
        levelRAF = requestAnimationFrame(loop);
      };
      loop();
    } catch (e) { /* level meter is cosmetic only; ignore failures */ }
  }
  function stopMicLevelMeter() {
    if (levelRAF) cancelAnimationFrame(levelRAF);
    levelRAF = null;
    if (audioCtx) { audioCtx.close().catch(() => {}); audioCtx = null; }
    if (micStream) { micStream.getTracks().forEach(tr => tr.stop()); micStream = null; }
    reactor.style.setProperty("--mic-level", "0");
  }

  function initRecognition() {
    recog = new SR();
    recog.lang = "de-DE";
    recog.interimResults = false;
    recog.continuous = true;
    recog.maxAlternatives = 1;

    recog.onstart = () => {
      listening = true;
      micBtn.classList.add("on");
      micBtn.textContent = "⏹ Stop";
      setMode("listening");
      setStatus("ZUHÖREN …", true);
      clearMicError();
    };
    recog.onresult = (e) => {
      const result = e.results[e.results.length - 1];
      if (result.isFinal) {
        const transcript = result[0].transcript;
        stopListening(false);
        respond(transcript);
        resumeListeningAfterSpeech = true;
      }
    };
    recog.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        showMicError("Mikrofonzugriff wurde verweigert, Sir. Bitte erlauben Sie den Zugriff in den Browser-Einstellungen (Adressleiste → Website-Berechtigungen) und versuchen Sie es erneut.");
      } else if (e.error === "no-speech") {
        // benign — recognition will auto-restart via onend
      } else {
        showMicError("Ein Problem mit der Spracherkennung ist aufgetreten: " + e.error);
      }
    };
    recog.onend = () => {
      listening = false;
      micBtn.classList.remove("on");
      micBtn.textContent = "🎙 Sprechen";
      stopMicLevelMeter();
      if (!reactor.classList.contains("speaking") && !reactor.classList.contains("thinking")) {
        setMode("");
        setStatus("STANDBY");
      }
    };
  }

  function startListening() {
    if (!SR) return;
    if (!recog) initRecognition();
    speechSynthesis.cancel();
    stopSpeakLevel();
    clearMicError();

    // Explicit permission request via getUserMedia so the browser prompt
    // fires predictably and errors are actionable, before SR.start().
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then((stream) => {
        micStream = stream;
        startMicLevelMeter(stream);
        try { recog.start(); } catch (e) { /* already started */ }
      })
      .catch((err) => {
        showMicError("Zugriff auf das Mikrofon nicht möglich, Sir (" + err.name + "). Bitte Berechtigung erteilen und erneut versuchen.");
      });
  }
  function stopListening(resetStatus) {
    if (recog && listening) recog.stop();
    stopMicLevelMeter();
    if (resetStatus !== false) { setMode(""); setStatus("STANDBY"); }
  }

  if (SR) {
    micBtn.addEventListener("click", () => { listening ? stopListening() : startListening(); });
    reactor.addEventListener("click", () => { listening ? stopListening() : startListening(); });
  } else {
    micBtn.disabled = true;
    micBtn.textContent = "Kein Mikrofon-Support";
    showMicError("Spracherkennung wird von diesem Browser nicht unterstützt, Sir. Bitte verwenden Sie Chrome oder Edge.");
  }

  // ---------------------------------------------------------------------
  // Text fallback
  // ---------------------------------------------------------------------
  sendBtn.addEventListener("click", () => { respond(textInput.value); textInput.value = ""; });
  textInput.addEventListener("keydown", (e) => { if (e.key === "Enter") { respond(textInput.value); textInput.value = ""; } });

  // ---------------------------------------------------------------------
  // Begrüßung
  // ---------------------------------------------------------------------
  window.addEventListener("load", () => {
    setTimeout(() => {
      const hello = "Alle Systeme sind online, Sir. Jarvis ist einsatzbereit. Wie darf ich Ihnen heute behilflich sein?";
      addMsg("jarvis", hello);
      speak(hello);
    }, 900);
  });
})();
