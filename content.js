const defaultSites = [
  { origin: "https://www.apple.com", color: "#49ff89" }
];

function applySites(sites) {
  const site = sites.find((entry) => entry.origin === location.origin);
  const root = document.documentElement;
  if (!root) return;

  if (!site || !/^#[0-9a-f]{6}$/i.test(site.color)) {
    root.removeAttribute("data-edge-light-active");
    root.style.removeProperty("--edge-light-rgb");
    return;
  }

  const rgb = [1, 3, 5].map((offset) => parseInt(site.color.slice(offset, offset + 2), 16));
  root.style.setProperty("--edge-light-rgb", rgb.join(", "));
  root.setAttribute("data-edge-light-active", "");
}

chrome.storage.local.get("sites").then(({ sites }) => {
  applySites(Array.isArray(sites) ? sites : defaultSites);
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.sites) {
    applySites(Array.isArray(changes.sites.newValue) ? changes.sites.newValue : defaultSites);
  }
});
