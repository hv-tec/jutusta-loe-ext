// Jutusta — service worker. Teeb API-kõned (host_permissions → CORS-vaba).
const API_BASE = "https://jutusta.ee/api/v1";

// Selgemad veateated levinud HTTP-staatustele.
function apiError(stage, status) {
  if (status === 402) return "Jutusta krediit otsas — osta krediiti jutusta.ee-s";
  if (status === 429) return "Jutusta päringulimiit täis — proovi hiljem uuesti";
  if (status === 401 || status === 403) return "API võti vale või aegunud — ava laienduse seaded";
  return `${stage} ebaõnnestus (HTTP ${status})`;
}

// Eelista API enda veateadet (nt "Sul pole piisavalt krediiti"), muidu üldine.
async function errFromRes(stage, res) {
  try {
    const j = await res.json();
    const m = j && j.detail && (j.detail.message || (typeof j.detail === "string" ? j.detail : null));
    if (m) return m;
  } catch (_) {}
  return apiError(stage, res.status);
}

async function getConfig() {
  const d = await chrome.storage.local.get(["apiKey", "voice", "source", "target", "speed"]);
  return {
    apiKey: d.apiKey || "",
    voice: d.voice || "henri",
    source: d.source || "en",
    target: d.target || "et",
    speed: typeof d.speed === "number" ? d.speed : 1.0,
  };
}

// --- Käivitajad: paremklõpsu menüü + kiirklahv ---
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "jutusta-read",
    title: "Loe eesti keeles ette",
    contexts: ["selection"],
  });
});

// Süstib sisu-skripti aktiivsesse vahelehte nõudmisel (activeTab annab loa
// kasutaja žesti — paremklõps või kiirklahv — peale). content.js on idempotentne.
async function ensureInjected(tabId) {
  await chrome.scripting.insertCSS({ target: { tabId }, files: ["content.css"] });
  await chrome.scripting.executeScript({ target: { tabId }, files: ["content.js"] });
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "jutusta-read" && tab?.id && info.selectionText) {
    try {
      await ensureInjected(tab.id);
      chrome.tabs.sendMessage(tab.id, { type: "READ_TEXT", text: info.selectionText });
    } catch (_) {}
  }
});

chrome.commands.onCommand.addListener(async (cmd, tab) => {
  if (cmd === "read-selection" && tab?.id) {
    try {
      await ensureInjected(tab.id);
      chrome.tabs.sendMessage(tab.id, { type: "READ_SELECTION" });
    } catch (_) {}
  }
});

// --- API-proksi content-scriptile ---
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "translate") {
    handleTranslate(msg).then(sendResponse).catch((e) => sendResponse({ error: String(e?.message || e) }));
    return true;
  }
  if (msg.type === "tts") {
    handleTts(msg).then(sendResponse).catch((e) => sendResponse({ error: String(e?.message || e) }));
    return true;
  }
  if (msg.type === "config") {
    getConfig().then((c) => sendResponse({ hasKey: !!c.apiKey, ...c, apiKey: undefined }));
    return true;
  }
});

async function handleTranslate({ text, source, target, previous }) {
  const cfg = await getConfig();
  if (!cfg.apiKey) return { error: "API võti puudub — ava laienduse seaded." };
  const res = await fetch(`${API_BASE}/translate/chunk`, {
    method: "POST",
    headers: { "xi-api-key": cfg.apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      source: source || cfg.source,
      target: target || cfg.target,
      new_source: text,
      previous: previous || null,
    }),
  });
  if (!res.ok) return { error: await errFromRes("Tõlge", res) };
  const data = await res.json();
  return { appended: data.appended || "" };
}

async function handleTts({ text, voice, speed, language }) {
  const cfg = await getConfig();
  if (!cfg.apiKey) return { error: "API võti puudub — ava laienduse seaded." };
  const res = await fetch(
    `${API_BASE}/text-to-speech/${encodeURIComponent(voice || cfg.voice)}?output_format=wav`,
    {
      method: "POST",
      headers: { "xi-api-key": cfg.apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        model_id: "jutusta_v1",
        language_code: language || cfg.target,
        voice_settings: { speed: typeof speed === "number" ? speed : cfg.speed },
      }),
    }
  );
  if (!res.ok) return { error: await errFromRes("Kõnesüntees", res) };
  const buf = await res.arrayBuffer();
  return { audioBase64: abToBase64(buf) };
}

function abToBase64(buf) {
  const bytes = new Uint8Array(buf);
  let bin = "";
  const step = 0x8000;
  for (let i = 0; i < bytes.length; i += step) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + step));
  }
  return btoa(bin);
}
