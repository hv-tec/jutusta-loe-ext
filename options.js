const $ = (id) => document.getElementById(id);

// ISO-koodi → eestikeelne nimi (kuvamiseks; tundmatu kood näidatakse suurtähtedes).
const LANG_NAMES = {
  et: "Eesti", en: "Inglise", de: "Saksa", fi: "Soome", ru: "Vene", uk: "Ukraina",
  ar: "Araabia", az: "Aserbaidžaani", bg: "Bulgaaria", bs: "Bosnia", ca: "Katalaani",
  cs: "Tšehhi", da: "Taani", el: "Kreeka", es: "Hispaania", fr: "Prantsuse",
  gl: "Galeegi", he: "Heebrea", hi: "Hindi", hr: "Horvaadi", hu: "Ungari",
  id: "Indoneesia", it: "Itaalia", ja: "Jaapani", ko: "Korea", lt: "Leedu",
  lv: "Läti", mk: "Makedoonia", ms: "Malai", nl: "Hollandi", no: "Norra",
  pl: "Poola", pt: "Portugali", ro: "Rumeenia", sk: "Slovaki", sl: "Sloveeni",
  sr: "Serbia", sv: "Rootsi", ta: "Tamili", th: "Tai", tr: "Türgi",
  ur: "Urdu", vi: "Vietnami", zh: "Hiina",
};
const langName = (c) => LANG_NAMES[c] || (c || "").toUpperCase();
const GENDER_LABEL = { female: "Naised", male: "Mehed" };

let voices = (window.JUTUSTA_VOICES || []).slice();
let saved = { voice: "henri", source: "en", target: "et", speed: 1.0 };

// --- Keelte dropdownid (lähte + siht) tuletatakse häälte loendist ---
function langsWithVoices() {
  const set = new Set(voices.map((v) => v.language).filter(Boolean));
  return [...set].sort((a, b) => {
    if (a === "et") return -1; // eesti esimesena
    if (b === "et") return 1;
    return langName(a).localeCompare(langName(b), "et");
  });
}

function fillLangSelect(sel, selected) {
  const langs = langsWithVoices();
  sel.innerHTML = "";
  for (const c of langs) {
    const o = document.createElement("option");
    o.value = c;
    o.textContent = `${langName(c)} (${c})`;
    sel.appendChild(o);
  }
  sel.value = langs.includes(selected) ? selected : (langs.includes("et") ? "et" : langs[0]);
}

// --- Häälte dropdown filtreeritakse sihtkeele järgi, grupeeritud soo kaupa ---
function populateVoices(targetLang, wantVoice) {
  const sel = $("voice");
  sel.innerHTML = "";
  const list = voices.filter((v) => v.language === targetLang);
  const groups = { female: [], male: [], other: [] };
  for (const v of list) groups[v.gender === "female" ? "female" : v.gender === "male" ? "male" : "other"].push(v);

  for (const g of ["female", "male", "other"]) {
    if (!groups[g].length) continue;
    const og = document.createElement("optgroup");
    og.label = GENDER_LABEL[g] || "Muu";
    groups[g].sort((a, b) => a.name.localeCompare(b.name, "et"));
    for (const v of groups[g]) {
      const o = document.createElement("option");
      o.value = v.voice_id;
      o.textContent = v.category === "cloned" ? `${v.name} (kloonitud)` : v.name;
      og.appendChild(o);
    }
    sel.appendChild(og);
  }
  // Säilita soovitud hääl kui see on selles keeles olemas, muidu esimene.
  if (wantVoice && list.some((v) => v.voice_id === wantVoice)) sel.value = wantVoice;
  $("voicecount").textContent = `${list.length} häält keeles ${langName(targetLang)}`;
}

function rebuild() {
  fillLangSelect($("source"), saved.source);
  fillLangSelect($("target"), saved.target);
  populateVoices($("target").value, saved.voice);
}

async function load() {
  const d = await chrome.storage.local.get([
    "apiKey", "voice", "source", "target", "speed", "voicesCache",
  ]);
  $("apiKey").value = d.apiKey || "";
  saved = {
    voice: d.voice || "henri",
    source: d.source || "en",
    target: d.target || "et",
    speed: typeof d.speed === "number" ? d.speed : 1.0,
  };
  if (Array.isArray(d.voicesCache) && d.voicesCache.length) voices = d.voicesCache;
  $("speed").value = saved.speed;
  $("speedval").textContent = saved.speed.toFixed(1) + "×";
  rebuild();
  // Värskenda elavalt, kui võti olemas (vaikne).
  if (d.apiKey) refreshVoices(d.apiKey, true);
}

// --- Värskenda häälte loend API-st ---
async function refreshVoices(apiKey, silent) {
  try {
    const res = await fetch("https://jutusta.ee/api/v1/voices", {
      headers: { "xi-api-key": apiKey },
    });
    if (!res.ok) {
      if (!silent) msg(`Häälte laadimine ebaõnnestus (HTTP ${res.status})`, "#b00020");
      return;
    }
    const data = await res.json();
    const raw = Array.isArray(data) ? data : data.voices || [];
    const norm = raw
      .map((v) => ({
        voice_id: v.voice_id,
        name: v.name,
        gender: (v.labels && v.labels.gender) || v.gender || "",
        language: v.language || (v.labels && v.labels.language) || "",
        category: v.category || "premade",
      }))
      .filter((v) => v.voice_id && v.language);
    if (!norm.length) return;
    voices = norm;
    await chrome.storage.local.set({ voicesCache: norm });
    // Hoia praegused valikud alles, kui võimalik.
    saved.source = $("source").value;
    saved.target = $("target").value;
    saved.voice = $("voice").value;
    rebuild();
    if (!silent) msg(`Värskendatud ✓ (${norm.length} häält)`, "#137333");
  } catch (e) {
    if (!silent) msg("Värskendamine ebaõnnestus: " + e.message, "#b00020");
  }
}

// --- Sündmused ---
$("target").addEventListener("change", () => populateVoices($("target").value, $("voice").value));

$("speed").addEventListener("input", () => {
  $("speedval").textContent = parseFloat($("speed").value).toFixed(1) + "×";
});

$("refresh").addEventListener("click", () => {
  const apiKey = $("apiKey").value.trim();
  if (!apiKey) return msg("Sisesta enne API võti.", "#b00020");
  msg("Laen hääli…", "#666");
  refreshVoices(apiKey, false);
});

$("save").addEventListener("click", async () => {
  await chrome.storage.local.set({
    apiKey: $("apiKey").value.trim(),
    voice: $("voice").value,
    source: $("source").value,
    target: $("target").value,
    speed: parseFloat($("speed").value),
  });
  msg("Salvestatud ✓", "#137333");
});

$("test").addEventListener("click", async () => {
  const apiKey = $("apiKey").value.trim();
  if (!apiKey) return msg("Sisesta enne API võti.", "#b00020");
  msg("Sünteesin…", "#666");
  try {
    const res = await fetch(
      `https://jutusta.ee/api/v1/text-to-speech/${encodeURIComponent($("voice").value)}?output_format=wav`,
      {
        method: "POST",
        headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          text: "Tere! See on Jutusta proovihääl.",
          model_id: "jutusta_v1",
          language_code: $("target").value,
          voice_settings: { speed: parseFloat($("speed").value) },
        }),
      }
    );
    if (!res.ok) return msg(`Viga: HTTP ${res.status}`, "#b00020");
    const blob = await res.blob();
    new Audio(URL.createObjectURL(blob)).play();
    msg("Töötab ✓", "#137333");
  } catch (e) {
    msg("Viga: " + e.message, "#b00020");
  }
});

function msg(t, color) {
  const el = $("msg");
  el.textContent = t;
  el.style.color = color || "#111";
}

load();
