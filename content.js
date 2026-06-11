// Jutusta — content script. Püüab valiku, näitab nuppu, mängib heli järjest.
(function () {
  let btn = null;
  let statusEl = null;
  let controller = null; // { cancelled, audio }

  // --- Valiku tuvastus + hõljuv nupp ---
  document.addEventListener("mouseup", (e) => {
    setTimeout(() => {
      const sel = window.getSelection();
      const text = sel ? sel.toString().trim() : "";
      if (text && !inBtn(e.target)) showButton(sel);
      else if (!inBtn(e.target)) hideButton();
    }, 10);
  });
  document.addEventListener("mousedown", (e) => {
    if (btn && !inBtn(e.target)) hideButton();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") stopReading();
  });

  function inBtn(t) {
    return btn && (t === btn || btn.contains(t));
  }

  function showButton(sel) {
    hideButton();
    let rect;
    try {
      rect = sel.getRangeAt(0).getBoundingClientRect();
    } catch (_) {
      return;
    }
    const text = sel.toString().trim();
    btn = document.createElement("div");
    btn.className = "jutusta-read-btn";
    btn.textContent = "🔊 Loe eesti k.";
    btn.style.top = window.scrollY + rect.bottom + 6 + "px";
    btn.style.left = window.scrollX + rect.left + "px";
    btn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      hideButton();
      readText(text);
    });
    document.body.appendChild(btn);
  }
  function hideButton() {
    if (btn) {
      btn.remove();
      btn = null;
    }
  }

  // --- Sõnumid service workerilt ---
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "READ_TEXT" && msg.text) readText(msg.text.trim());
    else if (msg.type === "READ_SELECTION") {
      const t = window.getSelection().toString().trim();
      if (t) readText(t);
    }
  });

  // --- Põhivoog ---
  async function readText(text) {
    if (!text) return;
    stopReading();
    const ctrl = { cancelled: false, audio: null };
    controller = ctrl;

    const cfg = await chrome.storage.local.get(["voice", "source", "target", "speed"]);
    const opts = {
      voice: cfg.voice || "henri",
      source: cfg.source || "en",
      target: cfg.target || "et",
      speed: typeof cfg.speed === "number" ? cfg.speed : 1.0,
    };

    const chunks = splitChunks(text, 500);
    showStatus(`Tõlgin ja loen… (0/${chunks.length})`);

    const gen = (i) => generate(chunks[i], opts);
    try {
      let next = gen(0); // alusta esimese genereerimist
      for (let i = 0; i < chunks.length; i++) {
        const blob = await next;
        if (ctrl.cancelled) return;
        if (i + 1 < chunks.length) next = gen(i + 1); // genereeri järgmine mängimise ajal
        showStatus(`Loen… (${i + 1}/${chunks.length})`);
        await playBlob(blob, ctrl);
        if (ctrl.cancelled) return;
      }
      hideStatus();
    } catch (err) {
      showStatus("Viga: " + (err?.message || err), true);
      setTimeout(hideStatus, 5000);
    } finally {
      if (controller === ctrl) controller = null;
    }
  }

  async function generate(srcText, opts) {
    const tr = await send({ type: "translate", text: srcText, source: opts.source, target: opts.target });
    if (tr.error) throw new Error(tr.error);
    const et = (tr.appended || "").trim();
    if (!et) return null;
    const tts = await send({ type: "tts", text: et, voice: opts.voice, speed: opts.speed });
    if (tts.error) throw new Error(tts.error);
    return b64ToBlob(tts.audioBase64, "audio/wav");
  }

  function send(msg) {
    return new Promise((resolve) => chrome.runtime.sendMessage(msg, resolve));
  }

  function playBlob(blob, ctrl) {
    return new Promise((resolve) => {
      if (!blob) return resolve();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      ctrl.audio = audio;
      const done = () => {
        URL.revokeObjectURL(url);
        resolve();
      };
      audio.onended = done;
      audio.onerror = done;
      audio.play().catch(done);
    });
  }

  function stopReading() {
    if (controller) {
      controller.cancelled = true;
      if (controller.audio) {
        try {
          controller.audio.pause();
        } catch (_) {}
      }
      controller = null;
    }
    hideStatus();
  }

  // Tükelda lausete kaupa, grupeeri ~maxLen tähemärgini (madal esimese heli latentsus).
  function splitChunks(text, maxLen) {
    const parts = text.replace(/\s+/g, " ").match(/[^.!?]+[.!?]*\s*/g) || [text];
    const out = [];
    let cur = "";
    for (let s of parts) {
      if ((cur + s).length > maxLen && cur) {
        out.push(cur.trim());
        cur = s;
      } else {
        cur += s;
      }
      while (cur.length > maxLen) {
        out.push(cur.slice(0, maxLen).trim());
        cur = cur.slice(maxLen);
      }
    }
    if (cur.trim()) out.push(cur.trim());
    return out;
  }

  function b64ToBlob(b64, type) {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type });
  }

  // --- Olekuriba ---
  function ensureStatus() {
    if (!statusEl) {
      statusEl = document.createElement("div");
      statusEl.className = "jutusta-status";
      const txt = document.createElement("span");
      txt.className = "jt-txt";
      const stop = document.createElement("button");
      stop.className = "jt-stop";
      stop.textContent = "Peata";
      stop.onclick = stopReading;
      statusEl.append(txt, stop);
      document.body.appendChild(statusEl);
    }
    return statusEl;
  }
  function showStatus(txt, isErr) {
    const el = ensureStatus();
    el.querySelector(".jt-txt").textContent = txt;
    el.style.background = isErr ? "#b00020" : "#1f2937";
    el.style.display = "flex";
  }
  function hideStatus() {
    if (statusEl) statusEl.style.display = "none";
  }
})();
