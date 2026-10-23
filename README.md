# Edge Light

A small Chromium extension that adds a soft colored glow around the viewport edges of selected websites. It starts with a green glow on `https://www.apple.com/`. Add sites and choose their colors from the extension menu.

## Install

1. Open `chrome://extensions` (or `arc://extensions` in Arc).
2. Enable **Developer mode**.
3. Select **Load unpacked** and choose this repository folder.

## Use

Open the extension menu to add a site, change its color, or remove it. Adding a new domain opens a settings tab where the browser asks for access to that domain. Reload an already open site after adding it. Color changes on an open site apply immediately.

Settings stay in local browser storage. The extension makes no network requests. An address without a scheme uses HTTPS; paths are ignored, so a rule covers the whole origin.

## License

MIT. See [LICENSE](LICENSE).
