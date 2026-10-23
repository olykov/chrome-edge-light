const defaultSites = [
  { origin: "https://www.apple.com", color: "#49ff89" }
];
const confirmButton = document.querySelector("#confirm");
const status = document.querySelector("#status");
let pendingSite;
let permissionGranted = false;
let completed = false;

function pattern(origin) {
  const url = new URL(origin);
  return `${url.protocol}//${url.hostname}/*`;
}

function scriptId(origin) {
  return `site-${btoa(pattern(origin)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")}`;
}

function setStatus(message, error = false) {
  status.textContent = message;
  status.classList.toggle("error", error);
}

async function showPending(saved) {
  if (!saved || !/^https?:\/\//.test(saved.origin) || !/^#[0-9a-f]{6}$/i.test(saved.color)) {
    if (!completed) setStatus("Поверніться в меню Edge Light і виберіть сайт.", true);
    return;
  }
  completed = false;
  pendingSite = saved;
  document.querySelector("#site-origin").textContent = saved.origin;
  document.querySelector("#site-color").style.setProperty("--site-color", saved.color);
  permissionGranted = await chrome.permissions.contains({ origins: [pattern(saved.origin)] });
  confirmButton.textContent = permissionGranted ? "Додати сайт" : "Надати доступ і додати";
  confirmButton.disabled = false;
  setStatus("");
}

chrome.storage.session.get("pendingSite").then(({ pendingSite: saved }) => showPending(saved));
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "session" && changes.pendingSite) showPending(changes.pendingSite.newValue);
});

confirmButton.addEventListener("click", async () => {
  if (!pendingSite) return;
  confirmButton.disabled = true;
  const { origin, color } = pendingSite;
  let step = "отримання дозволу";
  try {
    if (!permissionGranted) {
      try {
        permissionGranted = await chrome.permissions.request({ origins: [pattern(origin)] });
      } catch (error) {
        if (!await chrome.permissions.contains({ origins: [pattern(origin)] })) throw error;
        permissionGranted = true;
      }
      if (!permissionGranted) { setStatus("Дозвіл не надано.", true); return; }
    }

    step = "реєстрація сайту";
    const id = scriptId(origin);
    const registered = await chrome.scripting.getRegisteredContentScripts({ ids: [id] });
    if (!registered.length) {
      await chrome.scripting.registerContentScripts([{
        id, matches: [pattern(origin)],
        css: ["edge-light.css"], js: ["content.js"], runAt: "document_start"
      }]);
    }

    step = "збереження налаштувань";
    const { sites: saved } = await chrome.storage.local.get("sites");
    const sites = Array.isArray(saved) ? saved : defaultSites;
    if (!sites.some((site) => site.origin === origin)) {
      await chrome.storage.local.set({ sites: [...sites, { origin, color }] });
    }
    completed = true;
    await chrome.storage.session.remove("pendingSite");
    setStatus("Сайт додано. Оновіть його вкладку.");
  } catch (error) {
    setStatus(`Помилка на кроці «${step}»: ${error?.message || "невідома причина"}`, true);
  } finally {
    confirmButton.disabled = false;
  }
});
