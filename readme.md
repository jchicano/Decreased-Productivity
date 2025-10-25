# Decreased Productivity

> **Note:** This is a maintained fork of the original [Decreased Productivity extension](https://github.com/jchicano/Decreased-Productivity), updated to Manifest V3 for compatibility with modern Chrome versions (88+).

Discreetly surf the web! Control exactly how you want web pages to look like. A Chrome and Firefox extension.

**Current Version:** 0.47.0.1
**Chrome Compatibility:** Chrome 88+ (tested on Chrome 141+)

* ~~Chrome Web Store~~ (original extension was unpublished - see installation instructions below)
* Firefox: https://addons.mozilla.org/firefox/addon/decreased-productivity-andryou/

Decreased Productivity (DP) creates a more "consistent" browsing experience (for you and others around you) by letting you control what you want to see ("stealth browsing" => text/page background colours, the cloaking of images, hiding page favicons, changing fonts, etc.). You can choose what style you want (e.g. green text on a black background) by going to the Options page (right-click on icon in address bar and click on "Options"). DP has tab-specific support and domain whitelisting/blacklisting!

Translated for 17 different languages/dialects: Arabic, German, English (US), English (British), Spanish, Tagalog, French, Italian, Japanese, Korean, Portuguese (Brazil), Portuguese (Portugal), Russian, Turkish, Vietnamese, Chinese (Simplified), and Chinese (Traditional)!

Please note that I am not responsible for what you do with this extension and any subsequent consequences; please browse responsibly.

Featured on Lifehacker: http://lifehacker.com/5666312/decreased-productivity-for-chrome-camouflages-your-non+work-browsing

## What's New in This Fork (v0.47.0.1)

This fork updates the extension to **Manifest V3**, ensuring compatibility with modern Chrome browsers and meeting Chrome Web Store requirements:

### Major Changes
- ✅ **Manifest V3 Migration**: Fully migrated from deprecated Manifest V2
- ✅ **Chrome 88+ Minimum**: Updated from Chrome 6+ to Chrome 88+ minimum requirement
- ✅ **Chrome 141+ Tested**: Confirmed working on Chrome 141 and later versions
- ✅ **All Features Preserved**: Every original functionality remains intact

### Technical Updates
- Migrated from background page to service worker
- Updated `chrome.pageAction` to `chrome.action` API
- Replaced `chrome.tabs.executeScript` with `chrome.scripting.executeScript`
- Updated context menu API (removed deprecated `onclick` handlers)
- Removed synchronous XMLHttpRequest for service worker compatibility
- Updated messaging system for service worker architecture
- Added `scripting` permission for Chrome Manifest V3 requirements

## Features
* change the default font for cloaked pages (Calibri, Helvetica, Arial, a custom font, or leave page fonts unchanged)
* set page background, text, link, and table border colours
* hide page icons (aka favicons)
* replace page titles
* keyboard toggle (CTRL/CMD + 12)
* choose between tab-specific cloaking or global cloaking
* choose whether new tabs are cloaked or uncloaked by default
* control image opacity
* whitelist/blacklist domains (whitelisted domains will never be cloaked while blacklisted domains will always be cloaked (even if "Enable" is unticked))
* adds right-click option to open links/images safely (can be removed in Options)
* choose to always show images that are within a specified dimension
* choose between five modes: Paranoid (remove images and multimedia), SFW0 (cloak images and multimedia), SFW1 (cloak images and remove multimedia), SFW2 (cloak images only), and NSFW (show all)
* add and customize a toggle cloak icon in address bar

## Installation

### Chrome (Load as Unpacked Extension)
Since the original extension is no longer available on the Chrome Web Store, you'll need to load it manually:

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in the top-right corner)
4. Click "Load unpacked"
5. Select the extension folder (the directory containing `manifest.json`)
6. The extension is now installed and ready to use!
7. (Optional) Allow in Incognito Mode - Go to extension details and enable "Allow in incognito"

### Firefox
Install from Mozilla Add-ons: https://addons.mozilla.org/firefox/addon/decreased-productivity-andryou/

### First Time Setup
- Right-click on the extension icon in your address bar
- Select "Options" to configure your preferences
- Set your preferred colors, fonts, and cloaking mode

## Contributing

This is a community-maintained fork. Contributions are welcome!

### How to Contribute
- 🐛 **Report bugs** - Open an issue describing the problem
- 💡 **Suggest features** - Share your ideas for improvements
- 🔧 **Submit Pull Requests** - Fix bugs or add features
- 📝 **Update documentation** - Help improve the README or wiki

### Development
- Fork this repository
- Make your changes
- Test thoroughly with Chrome 88+
- Submit a PR with a clear description of your changes

All contributions will be reviewed before merging. Please ensure your code:
- Maintains compatibility with Manifest V3
- Preserves existing functionality
- Follows the existing code style
- Is tested on modern Chrome versions

## Credits

* **Original Extension:** Created by Andrew Y.
* **Icon Design:** by dunedhel
* **Manifest V3 Migration:** Assisted by [Cursor AI](https://cursor.sh)
* **Maintained by:** Community contributions

## Showing Thanks
* Click on the coffee-cup icon in the Options page to support the original author via PayPal :)
* Bitcoin: **39VJ5L9Yd6WocG6r88uE7ZZnM5J2M5bW92**