# Edge Light

A small Chromium extension that adds a colored glow to selected websites. Choose between a soft glow around the viewport edges and a light that follows the pointer. It starts with a green edge glow on `https://www.apple.com/`. Add sites and choose their colors from the extension menu.

## Install

1. Open `chrome://extensions` (or `arc://extensions` in Arc).
2. Enable **Developer mode**.
3. Select **Load unpacked** and choose this repository folder.

## Use

Open the extension menu to choose a glow mode, add a site, change its color, or remove it. The mode applies to all configured sites. Pointer Light leaves the area directly under the pointer clear, fades while a button is held, and does not capture pointer events. Adding a new domain opens a settings tab where the browser asks for access to that domain. Reload an already open site after adding it. Mode and color changes on an open site apply immediately.

When the extension is reloaded or updated, it restores content scripts for saved sites with existing permissions. Reload open site tabs afterward.

Settings stay in local browser storage. The extension makes no network requests. An address without a scheme uses HTTPS; paths are ignored, so a rule covers the whole origin.

## License

MIT. See [LICENSE](LICENSE).
