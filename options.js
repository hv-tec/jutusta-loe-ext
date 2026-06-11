const $ = (id) => document.getElementById(id);

async function load() {
  const d = await chrome.storage.local.get(["apiKey", "voice", "source", "target", "speed"]);
  $("apiKey").value = d.apiKey || "";
  $("voice").value = d.voice || "henri";
  $("source").value = d.source || "en";
  $("target").value = d.target || "et";
  const sp = typeof d.speed === "number" ? d.speed : 1.0;
  $("speed").value = sp;
  $("speedval").textContent = sp.toFixed(1) + "×";
}

$("speed").addEventListener("input", () => {
  $("speedval").textContent = parseFloat($("speed").value).toFixed(1) + "×";
});

$("save").addEventListener("click", async () => {
  await chrome.storage.local.set({
    apiKey: $("apiKey").value.trim(),
    voice: $("voice").value,
    source: $("source").value.trim() || "en",
    target: $("target").value.trim() || "et",
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
