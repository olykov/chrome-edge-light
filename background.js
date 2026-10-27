const defaultOrigin = "https://www.apple.com";

function pattern(origin) {
  const url = new URL(origin);
  if (!["http:", "https:"].includes(url.protocol) || url.origin !== origin) return null;
  return `${url.protocol}//${url.hostname}/*`;
}

function scriptId(match) {
  return `site-${btoa(match).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")}`;
}

async function restoreSites() {
  const { sites } = await chrome.storage.local.get("sites");
  if (!Array.isArray(sites)) return;

  const registered = await chrome.scripting.getRegisteredContentScripts();
  const ids = new Set(registered.map((script) => script.id));
  const missing = [];

  for (const site of sites) {
    if (typeof site?.origin !== "string" || site.origin === defaultOrigin) continue;
    let match;
    try { match = pattern(site.origin); } catch { continue; }
    if (!match || ids.has(scriptId(match))) continue;
    if (!await chrome.permissions.contains({ origins: [match] })) continue;
    missing.push({
      id: scriptId(match), matches: [match],
      css: ["edge-light.css"], js: ["content.js"], runAt: "document_start"
    });
    ids.add(scriptId(match));
  }

  if (missing.length) await chrome.scripting.registerContentScripts(missing);
}

chrome.runtime.onInstalled.addListener(() => { restoreSites().catch(console.error); });
chrome.runtime.onStartup.addListener(() => { restoreSites().catch(console.error); });
