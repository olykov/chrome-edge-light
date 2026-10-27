const defaultSites = [
  { origin: "https://www.apple.com", color: "#49ff89" }
];
const list = document.querySelector("#site-list");
const count = document.querySelector("#site-count");
const form = document.querySelector("#add-site-form");
const urlInput = document.querySelector("#site-url");
const colorInput = document.querySelector("#site-color");
const status = document.querySelector("#status");
const preview = document.querySelector(".preview");
const modeInputs = document.querySelectorAll('input[name="mode"]');
const modeDescription = document.querySelector("#mode-description");
let sites = [];

function showMode(mode) {
  const selected = mode === "pointer" ? "pointer" : "edge";
  document.querySelector(`input[name="mode"][value="${selected}"]`).checked = true;
  preview.dataset.mode = selected;
  modeDescription.textContent = selected === "pointer"
    ? "Світіння рухається за курсором і згасає під час натискання."
    : "М’яка підсвітка країв сторінки.";
}

for (const input of modeInputs) {
  input.addEventListener("change", async () => {
    if (!input.checked) return;
    try {
      await chrome.storage.local.set({ mode: input.value });
      showMode(input.value);
      setStatus("Режим збережено.");
    } catch {
      const { mode } = await chrome.storage.local.get("mode");
      showMode(mode);
      setStatus("Не вдалося зберегти режим.", true);
    }
  });
}

function setStatus(message, error = false) {
  status.textContent = message;
  status.classList.toggle("error", error);
}

function pattern(origin) {
  const url = new URL(origin);
  return `${url.protocol}//${url.hostname}/*`;
}
function showPreview(color) {
  const rgb = [1, 3, 5].map((offset) => parseInt(color.slice(offset, offset + 2), 16));
  preview.style.setProperty("--preview-rgb", rgb.join(", "));
}
function scriptId(origin) {
  return `site-${btoa(pattern(origin)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")}`;
}

function parseOrigin(value) {
  const url = new URL(/^[a-z]+:\/\//i.test(value) ? value : `https://${value}`);
  if (!["http:", "https:"].includes(url.protocol) || !url.hostname || url.username || url.password) {
    throw new Error("Введіть адресу сайту з http або https.");
  }
  return url.origin;
}

async function saveSites() {
  await chrome.storage.local.set({ sites });
  render();
}

function render() {
  list.replaceChildren();
  count.textContent = String(sites.length);

  for (const site of sites) {
    const row = document.createElement("li");
    const name = document.createElement("span");
    const colorLabel = document.createElement("label");
    const picker = document.createElement("input");
    const value = document.createElement("span");
    const remove = document.createElement("button");

    name.className = "site-name";
    name.textContent = site.origin;
    name.title = site.origin;
    colorLabel.className = "color-control";
    picker.type = "color";
    picker.value = site.color;
    picker.setAttribute("aria-label", `Колір для ${site.origin}`);
    value.textContent = site.color.toUpperCase();
    picker.addEventListener("input", () => {
      value.textContent = picker.value.toUpperCase();
      showPreview(picker.value);
    });
    picker.addEventListener("change", async () => {
      site.color = picker.value;
      try { await saveSites(); setStatus("Колір збережено."); }
      catch { setStatus("Не вдалося зберегти колір.", true); }
    });
    colorLabel.append(picker, value);
    remove.className = "remove";
    remove.type = "button";
    remove.textContent = "×";
    remove.setAttribute("aria-label", `Видалити ${site.origin}`);
    remove.addEventListener("click", () => removeSite(site.origin));
    row.append(name, colorLabel, remove);
    list.append(row);
  }
}

async function removeSite(origin) {
  const previous = sites;
  try {
    sites = sites.filter((site) => site.origin !== origin);
    await saveSites();
  } catch {
    sites = previous;
    setStatus("Не вдалося видалити сайт. Спробуйте ще раз.", true);
    return;
  }
  try {
    if (pattern(origin) !== pattern(defaultSites[0].origin) &&
        !sites.some((site) => pattern(site.origin) === pattern(origin))) {
      const id = scriptId(origin);
      const registered = await chrome.scripting.getRegisteredContentScripts({ ids: [id] });
      if (registered.length) await chrome.scripting.unregisterContentScripts({ ids: [id] });
      await chrome.permissions.remove({ origins: [pattern(origin)] });
    }
    setStatus("Сайт видалено.");
  } catch {
    setStatus("Сайт вимкнено, але дозвіл міг залишитися в Arc.", true);
  }
}

colorInput.addEventListener("input", () => showPreview(colorInput.value));
showPreview(colorInput.value);

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  let origin;
  try { origin = parseOrigin(urlInput.value.trim()); }
  catch { setStatus("Введіть коректну адресу сайту.", true); return; }
  if (sites.some((site) => site.origin === origin)) {
    setStatus("Цей сайт уже є в списку.", true);
    return;
  }

  const addButton = form.querySelector("button");
  addButton.disabled = true;
  let step = "перевірка дозволу";
  const previousSites = sites;
  try {
    if (pattern(origin) !== pattern(defaultSites[0].origin) &&
        !sites.some((site) => pattern(site.origin) === pattern(origin))) {
      const granted = await chrome.permissions.contains({ origins: [pattern(origin)] });
      if (!granted) {
        step = "відкриття вкладки для дозволу";
        await chrome.storage.session.set({ pendingSite: { origin, color: colorInput.value } });
        await chrome.runtime.openOptionsPage();
        setStatus("Підтвердьте додавання у відкритій вкладці.");
        return;
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
    }
    step = "збереження налаштувань";
    sites = [...sites, { origin, color: colorInput.value }];
    await saveSites();
    urlInput.value = "";
    setStatus("Сайт додано. Оновіть його вкладку.");
  } catch (error) {
    sites = previousSites;
    setStatus(`Помилка на кроці «${step}»: ${error?.message || "невідома причина"}`, true);
  } finally {
    addButton.disabled = false;
  }
});

chrome.storage.local.get(["sites", "mode"]).then(({ sites: saved, mode }) => {
  sites = Array.isArray(saved) ? saved : defaultSites.map((site) => ({ ...site }));
  render();
  showMode(mode);
});
