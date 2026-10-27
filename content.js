const defaultSites = [
  { origin: "https://www.apple.com", color: "#49ff89" }
];

let sites = defaultSites;
let mode = "edge";
let pointerGlow;

function hidePointer() {
  pointerGlow?.removeAttribute("data-visible");
}

function movePointer(event) {
  if (!pointerGlow) return;
  if (event.buttons) { hidePointer(); return; }
  pointerGlow.style.setProperty("--edge-light-x", `${event.clientX}px`);
  pointerGlow.style.setProperty("--edge-light-y", `${event.clientY}px`);
  pointerGlow.setAttribute("data-visible", "");
}

function render() {
  const root = document.documentElement;
  const site = sites.find((entry) => entry.origin === location.origin);
  const active = site && /^#[0-9a-f]{6}$/i.test(site.color);

  root.toggleAttribute("data-edge-light-active", Boolean(active));
  root.setAttribute("data-light-mode", mode);
  if (active) {
    const rgb = [1, 3, 5].map((offset) => parseInt(site.color.slice(offset, offset + 2), 16));
    root.style.setProperty("--edge-light-rgb", rgb.join(", "));
  } else {
    root.style.removeProperty("--edge-light-rgb");
  }

  if (active && mode === "pointer") {
    if (!pointerGlow) {
      pointerGlow = document.createElement("div");
      pointerGlow.id = "edge-light-pointer-glow";
      pointerGlow.setAttribute("aria-hidden", "true");
      root.append(pointerGlow);
    }
  } else {
    pointerGlow?.remove();
    pointerGlow = null;
  }
  hidePointer();
}

window.addEventListener("pointermove", movePointer, { capture: true, passive: true });
window.addEventListener("pointerdown", hidePointer, { capture: true, passive: true });
window.addEventListener("pointerup", movePointer, { capture: true, passive: true });
document.addEventListener("mouseleave", hidePointer);
window.addEventListener("blur", hidePointer);

chrome.storage.local.get(["sites", "mode"]).then((saved) => {
  sites = Array.isArray(saved.sites) ? saved.sites : defaultSites;
  mode = saved.mode === "pointer" ? "pointer" : "edge";
  render();
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (changes.sites) sites = Array.isArray(changes.sites.newValue) ? changes.sites.newValue : defaultSites;
  if (changes.mode) mode = changes.mode.newValue === "pointer" ? "pointer" : "edge";
  if (changes.sites || changes.mode) render();
});
