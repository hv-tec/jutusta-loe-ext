// Jutusta — service worker. Teeb API-kõned (host_permissions → CORS-vaba).
const API_BASE = "https://jutusta.ee/api/v1";

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

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "jutusta-read" && tab?.id && info.selectionText) {
    chrome.tabs.sendMessage(tab.id, { type: "READ_TEXT", text: info.selectionText });
  }
});

chrome.commands.onCommand.addListener((cmd, tab) => {
  if (cmd === "read-selection" && tab?.id) {
    chrome.tabs.sendMessage(tab.id, { type: "READ_SELECTION" });
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
  if (!res.ok) return { error: `Tõlge ebaõnnestus (HTTP ${res.status})` };
  const data = await res.json();
  return { appended: data.appended || "" };
}

async function handleTts({ text, voice, speed }) {
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
        voice_settings: { speed: typeof speed === "number" ? speed : cfg.speed },
      }),
    }
  );
  if (!res.ok) return { error: `Kõnesüntees ebaõnnestus (HTTP ${res.status})` };
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
