chrome.runtime.sendMessage({ type: "config" }, (cfg) => {
  const el = document.getElementById("status");
  if (cfg && cfg.hasKey) {
    el.className = "status ok";
    el.textContent = `Valmis · hääl: ${cfg.voice} · ${cfg.source}→${cfg.target}`;
  } else {
    el.className = "status warn";
    el.textContent = "API võti puudub — ava seaded.";
  }
});

document.getElementById("opts").addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
  window.close();
});
