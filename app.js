(function () {
  "use strict";

  const reactor = document.getElementById("reactor");
  const statusEl = document.getElementById("status");
  const logEl = document.getElementById("log");
  const stepsEl = document.getElementById("steps");
  const goalText = document.getElementById("goalText");
  const goalChip = document.getElementById("goalChip");
  const goalSub = document.getElementById("goalSub");
  const micBtn = document.getElementById("micBtn");
  const micError = document.getElementById("micError");
  const textInput = document.getElementById("textInput");
  const sendBtn = document.getElementById("sendBtn");

  // ---------------------------------------------------------------------
  // Clock, session id & ambient KPIs
  // ---------------------------------------------------------------------
  function tick() { document.getElementById("clock").textContent = new Date().toLocaleTimeString("de-DE"); }
  setInterval(tick, 1000); tick();

  document.getElementById("sessionId").textContent =
    "JV-" + Math.floor(1000 + Math.random() * 9000);

  setInterval(() => {
    const load = 10 + Math.round(Math.random() * 25);
    document.getElementById("v1").textContent = load + "%";
    document.getElementById("f1").style.width = load + "%";
    const conn = 92 + Math.round(Math.random() * 8);
    document.getElementById("v3").textContent = conn + "%";
    document.getElementById("f3").style.width = conn + "%";
  }, 2500);

  // ---------------------------------------------------------------------
  // Market ticker strip — ambient financial texture, duplicated once for
  // a seamless scroll loop
  // ---------------------------------------------------------------------
  const TICKER_SEED = [
    { sym: "DAX", val: "18.942,10", delta: "+0,64%", up: true },
    { sym: "MSCI WORLD", val: "3.412,88", delta: "+0,21%", up: true },
    { sym: "EUR/USD", val: "1,0863", delta: "-0,08%", up: false },
    { sym: "BTC", val: "58.204", delta: "+2,13%", up: true },
    { sym: "GOLD", val: "2.331,40", delta: "+0,12%", up: true },
    { sym: "10Y BUND", val: "2,41%", delta: "-0,03%", up: false },
    { sym: "S&P 500", val: "5.487,03", delta: "+0,37%", up: true }
  ];
  function renderTicker() {
    const track = document.getElementById("tickerTrack");
    const html = TICKER_SEED.map(t =>
      '<span class="ticker-item"><span class="sym">' + t.sym + '</span>' +
      '<span class="val">' + t.val + '</span>' +
      '<span class="delta ' + (t.up ? "up" : "down") + '">' + t.delta + '</span></span>'
    ).join("");
    track.innerHTML = html + html; // duplicate for seamless loop
  }
  renderTicker();

  // ---------------------------------------------------------------------
  // State machine: standby | listening | thinking | speaking
  // ---------------------------------------------------------------------
  function setStatus(text, active) {
    statusEl.textContent = text;
    statusEl.classList.toggle("active", !!active);
  }
  function setMode(m) {
    reactor.classList.remove("listening", "speaking", "thinking");
    if (m) reactor.classList.add(m);
    if (window.JarvisBrain) window.JarvisBrain.setState(m || "standby");
  }

  // ---------------------------------------------------------------------
  // Neural mesh visualization — a rotating pseudo-3D point cloud shaped
  // like a brain, connected into a synapse mesh with traveling impulses.
  // Pure canvas, no dependencies, respects prefers-reduced-motion.
  // ---------------------------------------------------------------------
  (function initBrain() {
    const canvas = document.getElementById("brainCanvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const STATE_STYLE = {
      standby:   { color: "#4fd6ff", dim: "#1c6c85", rot: 0.06, spawnMs: 700 },
      listening: { color: "#2ee6a6", dim: "#12654b", rot: 0.10, spawnMs: 260 },
      thinking:  { color: "#f0a63f", dim: "#8a5c17", rot: 0.30, spawnMs: 90 },
      speaking:  { color: "#eafcff", dim: "#4fd6ff", rot: 0.16, spawnMs: 160 }
    };
    let state = "standby";
    let micLevel = 0, speakLevel = 0;

    const NODE_COUNT = 170;
    let nodes = [], edges = [], pulses = [];
    let angle = 0, lastSpawn = 0, lastTime = 0;
    let W = 0, H = 0, R = 0, DPR = Math.min(window.devicePixelRatio || 1, 2);

    // Uniform sphere sampling deformed into a two-hemisphere "brain" blob:
    // organic fold-like ripples via layered sine harmonics, plus a groove
    // pushed open along the x=0 plane to read as a longitudinal fissure.
    function buildNodes() {
      nodes = [];
      for (let i = 0; i < NODE_COUNT; i++) {
        const u = Math.random(), v = Math.random();
        const theta = u * Math.PI * 2;
        const phi = Math.acos(1 - 2 * v);
        const fold = 1 + 0.11 * Math.sin(5 * theta + 2 * phi) + 0.07 * Math.sin(9 * phi) + 0.05 * Math.cos(7 * theta);
        let x = Math.sin(phi) * Math.cos(theta) * fold;
        let y = Math.cos(phi) * fold * 0.82;
        let z = Math.sin(phi) * Math.sin(theta) * fold;

        const gap = 0.16;
        if (Math.abs(x) < gap) x += Math.sign(x || 1) * (gap - Math.abs(x)) * 1.6;

        nodes.push({
          x, y, z,
          phase: Math.random() * Math.PI * 2,
          freq: 0.6 + Math.random() * 0.9,
          // projected each frame:
          sx: 0, sy: 0, scale: 1, depth: 0
        });
      }
    }

    function buildEdges() {
      edges = [];
      const seen = new Set();
      const K = 3;
      for (let i = 0; i < nodes.length; i++) {
        const dists = [];
        for (let j = 0; j < nodes.length; j++) {
          if (i === j) continue;
          const dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y, dz = nodes[i].z - nodes[j].z;
          dists.push([j, dx * dx + dy * dy + dz * dz]);
        }
        dists.sort((a, b) => a[1] - b[1]);
        for (let k = 0; k < K; k++) {
          const j = dists[k][0];
          const key = i < j ? i + "-" + j : j + "-" + i;
          if (seen.has(key)) continue;
          seen.add(key);
          edges.push([i, j]);
        }
      }
    }

    function resize() {
      const rect = canvas.parentElement.getBoundingClientRect();
      W = rect.width; H = rect.height;
      canvas.width = W * DPR; canvas.height = H * DPR;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      R = Math.min(W, H) * 0.34;
    }

    function spawnPulse(now) {
      if (!edges.length) return;
      const [a, b] = edges[Math.floor(Math.random() * edges.length)];
      const reverse = Math.random() < 0.5;
      pulses.push({ a: reverse ? b : a, b: reverse ? a : b, t: 0, speed: 1.1 + Math.random() * 1.1 });
      if (pulses.length > 40) pulses.shift();
    }

    function project(n) {
      const cos = Math.cos(angle), sin = Math.sin(angle);
      const rx = n.x * cos + n.z * sin;
      const rz = -n.x * sin + n.z * cos;
      const wx = rx * R, wy = n.y * R, wz = rz * R;
      const focal = R * 3.2;
      const scale = focal / (focal + wz);
      n.sx = W / 2 + wx * scale;
      n.sy = H / 2 + wy * scale;
      n.scale = scale;
      n.depth = wz;
    }

    function frame(t) {
      if (!lastTime) lastTime = t;
      const dt = Math.min((t - lastTime) / 1000, 0.05);
      lastTime = t;
      const style = STATE_STYLE[state] || STATE_STYLE.standby;

      angle += style.rot * dt * (0.6 + micLevel * 0.8 + speakLevel * 0.6);

      // Trailing fade instead of a hard clear — reads as a living, glowing
      // field rather than a flat redraw.
      ctx.fillStyle = "rgba(5,7,11,0.32)";
      ctx.fillRect(0, 0, W, H);

      nodes.forEach(project);
      const order = nodes.map((_, i) => i).sort((i, j) => nodes[i].depth - nodes[j].depth);

      // Edges
      ctx.lineWidth = 1;
      edges.forEach(([i, j]) => {
        const a = nodes[i], b = nodes[j];
        const depthAvg = (a.depth + b.depth) / (2 * R);
        const op = Math.max(0.04, Math.min(0.34, 0.2 + depthAvg * 0.22));
        ctx.strokeStyle = hexToRgba(style.dim, op);
        ctx.beginPath();
        ctx.moveTo(a.sx, a.sy);
        ctx.lineTo(b.sx, b.sy);
        ctx.stroke();
      });

      // Nodes, back-to-front
      order.forEach((idx) => {
        const n = nodes[idx];
        const flicker = 0.55 + 0.45 * Math.sin(t / 1000 * n.freq + n.phase);
        const amp = state === "thinking" || state === "speaking" ? 1.3 : 1;
        const rad = (1.4 + flicker * 1.6 * amp) * Math.max(0.4, n.scale);
        const op = Math.max(0.25, Math.min(1, 0.4 + n.scale * 0.5 + flicker * 0.25));
        ctx.beginPath();
        ctx.fillStyle = hexToRgba(style.color, op);
        ctx.arc(n.sx, n.sy, rad, 0, Math.PI * 2);
        ctx.fill();
      });

      // Traveling impulses along synapses
      const spawnInterval = style.spawnMs / (1 + micLevel * 2 + speakLevel * 1.5);
      if (t - lastSpawn > spawnInterval) { lastSpawn = t; spawnPulse(t); }
      pulses.forEach((p) => { p.t += dt * p.speed; });
      pulses = pulses.filter((p) => p.t < 1);
      pulses.forEach((p) => {
        const a = nodes[p.a], b = nodes[p.b];
        const x = a.sx + (b.sx - a.sx) * p.t;
        const y = a.sy + (b.sy - a.sy) * p.t;
        ctx.save();
        ctx.shadowBlur = 10;
        ctx.shadowColor = style.color;
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      if (!reduceMotion) requestAnimationFrame(frame);
    }

    function hexToRgba(hex, a) {
      const v = hex.replace("#", "");
      const r = parseInt(v.substring(0, 2), 16);
      const g = parseInt(v.substring(2, 4), 16);
      const b = parseInt(v.substring(4, 6), 16);
      return "rgba(" + r + "," + g + "," + b + "," + a + ")";
    }

    buildNodes();
    buildEdges();
    resize();
    window.addEventListener("resize", resize);
    requestAnimationFrame(frame);
    if (reduceMotion) frame(0); // draw a single static frame

    window.JarvisBrain = {
      setState(s) { state = STATE_STYLE[s] ? s : "standby"; },
      setMicLevel(v) { micLevel = v; },
      setSpeakLevel(v) { speakLevel = v; }
    };
  })();

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
  function pickVoice() {
    // German only — never fall back to an English voice, even if no male
    // German voice is installed, so Jarvis always speaks German.
    const german = speechSynthesis.getVoices().filter(v => v.lang && v.lang.toLowerCase().startsWith("de"));

    // 1) Known male German voice name.
    let best = german.find(v => PREFERRED_MALE_VOICES.some(n => v.name.toLowerCase().includes(n)));
    // 2) Any German voice that isn't a known female voice.
    if (!best) best = german.find(v => !KNOWN_FEMALE_VOICES.test(v.name));
    // 3) Absolute fallback: first available German voice.
    deVoice = best || german[0] || null;
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
      if (window.JarvisBrain) window.JarvisBrain.setSpeakLevel(level);
    }, 90);
    utterance.onboundary = () => {
      level = 0.7 + Math.random() * 0.3;
      if (window.JarvisBrain) window.JarvisBrain.setSpeakLevel(level);
    };
  }
  function stopSpeakLevel() {
    clearInterval(speakLevelTimer);
    if (window.JarvisBrain) window.JarvisBrain.setSpeakLevel(0);
  }

  let resumeListeningAfterSpeech = false;

  // Split into clause-sized chunks and queue them as separate utterances.
  // A single long utterance is where most engines glitch/stutter; short,
  // natural phrase boundaries produce a smoother, more composed delivery.
  function splitIntoPhrases(text) {
    return text
      .split(/(?<=[.!?…])\s+|(?<=[,;:—])\s+(?=\S{12,})/)
      .map(s => s.trim())
      .filter(Boolean);
  }

  function speak(text) {
    if (!("speechSynthesis" in window)) { finishSpeaking(); return; }
    speechSynthesis.cancel();
    const phrases = splitIntoPhrases(text);
    if (!phrases.length) { finishSpeaking(); return; }

    let started = false;
    phrases.forEach((phrase, i) => {
      const u = new SpeechSynthesisUtterance(phrase);
      u.lang = "de-DE";
      if (deVoice) u.voice = deVoice;
      u.rate = 1.0;
      u.pitch = 0.92; // gently lowered, natural register — avoids synthesis artifacts from extreme pitch shifts
      u.volume = 1;
      if (i === 0) {
        u.onstart = () => { started = true; setMode("speaking"); setStatus("JARVIS SPRICHT …", true); animateSpeakLevel(u); };
      } else {
        u.onstart = () => { animateSpeakLevel(u); };
      }
      if (i === phrases.length - 1) {
        u.onend = finishSpeaking;
        u.onerror = finishSpeaking;
      }
      speechSynthesis.speak(u);
    });
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

  const eurFmt = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 });
  function activateMandate(displayText, subText) {
    goalText.textContent = displayText;
    goalText.classList.remove("empty");
    goalChip.textContent = "Aktives Mandat";
    goalChip.classList.add("active");
    goalSub.textContent = subText;
  }

  function buildReply(t) {
    const amount = parseAmount(t);
    const isGoal = amount || /\b(ziel|verdien|beschaff|erreich|besorg|plan|baue|erstelle|organisier|erledige)/i.test(t);
    const A = address();

    if (amount) {
      const formatted = eurFmt.format(amount.num) + " " + amount.cur;
      activateMandate(formatted, "Mandat erteilt um " + new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }));
      const steps = planForMoney(amount);
      setSteps(steps);
      startProgress();
      return "Verstanden, " + A + ". Ich habe die Zielmarke von " + formatted +
        " erfasst und einen Plan mit " + steps.length + " Schritten entworfen. Mit Ihrer Erlaubnis beginne ich " +
        "unverzüglich mit der Marktanalyse — ich halte Sie selbstverständlich über jeden Fortschritt auf dem Laufenden.";
    }
    if (isGoal) {
      activateMandate(t, "Mandat erteilt um " + new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }));
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
    return "Notiert, " + A + ". Nennen Sie mir ein konkretes Ziel — etwa: „Verdiene 500 Euro für uns“ — und ich entwerfe umgehend einen Plan.";
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
        if (window.JarvisBrain) window.JarvisBrain.setMicLevel(Math.min(1, avg / 90));
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
    if (window.JarvisBrain) window.JarvisBrain.setMicLevel(0);
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
