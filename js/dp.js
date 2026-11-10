// (c) Andrew
// Icon by dunedhel: http://dunedhel.deviantart.com/
// Supporting functions by AdThwart - T. Joseph
var origtitle;
var postloaddelay;
var dphotkeylistener;
var dpCloaked = false;
var dpSettings = null;
var dpDomObserver = null;
var timestamp = Math.round(new Date().getTime()/1000.0);

// ----- Messaging helpers
// chrome.runtime.sendMessage rejects / sets lastError when the service worker is unreachable
// (e.g. the extension was reloaded). Always swallow that instead of throwing in the page.
function dpSend(message, callback) {
	try {
		chrome.runtime.sendMessage(message, function(response) {
			if (chrome.runtime.lastError) { if (callback) callback(null); return; }
			if (callback) callback(response);
		});
	} catch(e) {
		if (callback) callback(null);
	}
}

// ----- Initial stealth: hide the page until the cloak is in place
function addInitialStealth(bg) {
	if (document.querySelector("style[__decreased__='initialstealth"+timestamp+"']")) return;
	var stealth = document.createElement("style");
	stealth.setAttribute("__decreased__", "initialstealth"+timestamp);
	stealth.textContent = "html, html *, html *[style], body *:before, body *:after { background-color: #" + bg + " !important; background-image: none !important; background: #" + bg + " !important; } html * { visibility: hidden !important; }";
	(document.documentElement || document).appendChild(stealth);
}
function removeInitialStealth() {
	var node = document.querySelector("style[__decreased__='initialstealth"+timestamp+"']");
	if (node) node.remove();
}

function addCloak(sfw, f, fsize, u, bg, text, table, link, bold, o1, o2, collapseimage, customcss) {
	var curlocation = document.location.href;
	var boldcss = '';
	var fontType = '';
	var isBold = (bold === true || bold === 'true');
	var o1Num = parseFloat(o1);
	collapseimage = String(collapseimage);

	if (f != 'Serif' && f != 'Monospace' && f != '-Unchanged-') f = '"' + f + '", sans-serif';
	if (f != '-Unchanged-') {
		fontType = 'font-size: ' + fsize + 'px !important; font-family: ' + f + ' !important; } h1, h2, h3, h4, h5, h6 { font-size: ' + fsize + 'px !important; font-weight: ' + (isBold ? 'normal' : 'bold') + ' !important; ';
	}
	if (isBold) boldcss = 'font-weight: normal !important; ';

	// The code that does the magic
	var magic = 'html, html *, html *[style], body *:before, body *:after { background-color: #' + bg + ' !important; border-color: #' + table + ' !important; border-collapse: collapse !important; color: #' + text + ' !important; stroke: #' + text + ' !important; fill: #' + bg + ' !important; text-decoration: none !important; -webkit-filter: initial !important; filter: none !important; box-shadow: none !important; -webkit-box-shadow: none !important; text-shadow: none !important; ' + boldcss + fontType + '} ';
	if (curlocation.match(/^https?:\/\/www\.facebook\.com\//i)) {
		magic += 'html, html *:not(.img), body *:not(.img):before, body *:not(.img):after { background-image: none !important; } ';
		magic += '*:after { content: initial !important; }  ';
		if (sfw == 'SFW' || sfw == 'SFW1' || sfw == 'SFW2') magic += 'i.img { opacity: '+o1+' !important; } i.img:hover { opacity: '+o2+' !important; } ';
		else if (o1Num == 0 && collapseimage == 'true') magic += 'i.img { display: none !important; } ';
		else if (sfw == 'Paranoid') magic += 'i.img { visibility: hidden !important; opacity: 0 !important; } ';
	} else {
		if (!curlocation.match(/^https?:\/\/web\.whatsapp\.com\//i)) magic += 'html, html *, body *:before, body *:after { background-image: none !important; } ';
	}
	if (curlocation.match(/^https?:\/\/www\.engadget\.com\//i)) {
		magic += 'html, html *, html *[style], body *:before, body *:after { border-width: 0px !important; }';
	} else {
		magic += 'html, html *, html *[style], body *:before, body *:after { border-width: 1px !important; }';
	}
	magic += ' input[type=text],input[type=password],input[type=file],input[type=search],textarea,input[type=button],input[type=submit] { border: 1px dotted #' + table + ' !important; background-color: #' + bg + ' !important; color: #' + text + ' !important; } html::selection, html *::selection { background: #888888 !important; color: #fff !important; }';
	// Links: enforce colour across states with high specificity
	magic += ' html body a, html body a:link, html body a:visited, html body a:hover, html body a:active, html body a * { color: #' + link + ' !important; text-decoration: ' + ((u === true || u === 'true') ? 'underline' : 'none') + ' !important; }';

	if (sfw == 'SFW' || sfw == 'SFW1' || sfw == 'SFW2') {
		if (o1Num == 0 && collapseimage == 'true') magic += ' iframe, img, canvas, input[type=image], path, polygon, picture { display: none !important; }';
		else magic += ' iframe, img, canvas, input[type=image], path, polygon, picture { opacity: '+o1+' !important; } iframe:hover, img:hover, input[type=image]:hover, path:hover, polygon:hover, picture:hover { opacity: '+o2+' !important; }';
	}
	if (sfw == 'SFW') {
		if (o1Num == 0 && collapseimage == 'true') magic += ' object, embed, param, video, audio { display: none !important; }';
		else magic += ' object, embed, param, video, audio { opacity: '+o1+' !important; } object:hover, embed:hover, param:hover, video:hover, audio:hover { opacity: '+o2+' !important; }';
	}
	if (sfw == 'SFW1') magic += ' object, embed, param, video, audio { display: none !important; opacity: 0 !important; }';
	if (sfw == 'Paranoid') {
		// Hide all visual media and backgrounds in paranoid mode
		magic += ' html, html * { background-image: none !important; -webkit-mask-image: none !important; mask-image: none !important; } *:before, *:after { content: none !important; }';
		magic += ' img, image, svg, canvas, input[type=image], path, polygon, object, embed, param, video, audio, picture { display: none !important; opacity: 0 !important; }';
		magic += ' [class*="logo" i], [id*="logo" i] { display: none !important; }';
		magic += ' iframe { opacity: 0.05 !important; } iframe:hover { opacity: 0.5 !important; }';
	}

	magic += ' .dp'+timestamp+'_visible { visibility: visible !important; opacity: 1 !important; }';
	magic += ' .dp'+timestamp+'_hide { display: none !important }';

	// Site-specific fixes
	if (curlocation.match(/^https?:\/\/www\.(?:facebook\.com|facebookcorewwwi\.onion)\//i)) {
		magic += " ._52c6, ._5ine, .__cy, .fbPhotosPhotoTagboxes, ._jfi, ._5vb_ ._5aqh::before { position: initial !important; } "; // fix link caption, event cover photo, full-screen photo mode
		magic += " ._4zoz._4zoz._4zoz, ._559p { clear: both !important; } "; // fix main timeline post status box
		magic += " ._2yq ._4-u2::before { background-color: transparent !important; } "; // fix main timeline post title bars
		magic += " ._2-sx { position: absolute !important; top: 0 !important; left: 0 !important; } "; // fix spotlight photo positioning
		magic += " ._4d3w._2nw8 ._4g9v, ._4d3w._2nw8 ._4g9v *, ._4d3w._2nw8 .snowliftOverlayBar, ._4d3w .rightButtons .overlayBarButtons, ._4d3w .rightButtons .overlayBarButtons * { background-color: transparent !important; } "; // make spotlight top/bottom bars transparent
		magic += " ._1ift { pointer-events: initial !important; } "; // make chat icons react to hover
		magic += " ._3htz { display: none !important; } "; // hide video overlay
	}
	else if (curlocation.match(/^https?:\/\/www\.youtube\.com\//i)) {
		magic += " .ytp-gradient-top, .ytp-gradient-bottom { display: none !important; } "; // improve embedded youtube display
		magic += " .ytp-chrome-top, .ytp-title, .ytp-title *, .ytp-chrome-bottom[style], .ytp-chrome-bottom * { background-color: transparent !important; } "; // improve embedded youtube display
		magic += " .ytp-play-button:not(.ytp-play-button-playlist)::before, .ytp-fullscreen-button::after { display: none !important; } "; // improve embedded youtube display
		magic += " .like-button-renderer-like-button:before, .like-button-renderer-dislike-button:before, .yt-high-contrast-mode-white .yt-uix-button-subscribe-branded:before { content: '' !important; } ";
	}
	else if (curlocation.match(/^https?:\/\/www\.instagram\.com\//i)) {
		magic += " ._ovg3g, ._njmhc { position: initial !important; } ._sppa1 { display: none !important; } ";
	}
	else if (curlocation.match(/^https?:\/\/web\.whatsapp\.com\//i)) {
		magic += " .app > div, .app > div > div, .app > div > div > span { background-color: transparent !important; } "; // fix blank white screen
		magic += " .message-in { float: none !important; } "; // fix incoming message display
		magic += " .msg { clear: both !important; } "; // fix outgoing message display
		magic += ' .copyable-text, .copyable-text > div { background-color: transparent !important; } '; // fix message timestamping
		magic += ' .message-in, .message-out { border: 1px dotted #' + table + ' !important; } '; // distinguish bubbles
		magic += ' .drawer-manager, .drawer-manager > .pane { background-color: transparent !important; } '; // fix white screen bug
		magic += ' .video-thumb, .video-thumb > div { background-color: transparent !important; } '; // show video thumbnails
		magic += ' .message-out .tail-container { display: none !important; } '; // hide message out tail
		if (sfw == 'SFW' || sfw == 'SFW1' || sfw == 'SFW2') {
			magic += ' div[data-asset-intro-image="true"] { opacity: '+o1+' !important; } div[data-asset-intro-image="true"]:hover { opacity: '+o2+' !important; } '; // add cloak support for welcome graphic
			magic += ' .icon { opacity: '+o1+' !important; } .icon:hover { opacity: '+o2+' !important; } '; // add cloak support for welcome graphic
			magic += ' .video-thumb > div { opacity: '+o1+' !important; } .video-thumb > div:hover { opacity: '+o2+' !important; } '; // add cloak support for video thumbnails
			magic += ' .emojik { opacity: '+o1+' !important; } .emojik:hover { opacity: '+o2+' !important; } '; // add cloak support for emoji list
		} else if (sfw == 'Paranoid') magic += ' div[data-asset-intro-image="true"] { display: none !important; } '; // hide welcome graphic
		magic += ' .copyable-text img { pointer-events: initial !important; } '; // make emojis and icons at cloak-hover opacity
	}
	else if (curlocation.match(/^https?:\/\/(?:twitter|x)\.com\//i)) {
		magic += " .QuoteTweet, .QuoteTweet *, #playerContainer, #playerContainer *, .Gallery, .Gallery * { background-color: transparent !important; } ";
		if (sfw != 'Paranoid' && sfw != 'SFW1') magic += " #playerContainer video { opacity: 1 !important; } ";
		magic += " .Grid--withGutter>.Grid-cell { margin-right: -1px !important; margin-left: -1px !important; } ";
	}
	else if (curlocation.match(/^https?:\/\/www\.engadget\.com\//i)) {
		magic += " .o-hit { cursor: initial !important; } ";
		magic += " .o-hit .o-hit__link { position: initial !important; } ";
	}
	else if (curlocation.match(/^https?:\/\/.*\.?((lifehack|gawk)er|deadspin|jalopnik|gizmodo|jezebel|kotaku)\.com\//i)) {
		magic += " .img-border:after { position: initial !important; } ";
	}
	else if (curlocation.match(/^https?:\/\/www\.reddit\.com\//i)) {
		magic += ' .res-nightmode #header-bottom-right { background-color: #' + bg + ' !important; border-color: #' + table + ' !important; } ';
		magic += ' .RES-keyNav-activeElement, .RES-keyNav-activeElement .md-container, .res-commentBoxes .comment, .res-commentBoxes .comment .comment, .res-commentBoxes .comment .comment .comment, .res-commentBoxes .comment .comment .comment .comment, .res-commentBoxes .comment .comment .comment .comment .comment, .res-commentBoxes .comment .comment .comment .comment .comment .comment, .res-commentBoxes .comment .comment .comment .comment .comment .comment .comment, .res-commentBoxes .comment .comment .comment .comment .comment .comment .comment .comment, .res-commentBoxes .comment .comment .comment .comment .comment .comment .comment .comment .comment, .res-commentBoxes .comment .comment .comment .comment .comment .comment .comment .comment .comment .comment  { background-color: #' + bg + ' !important; border-color: #' + table + ' !important; } ';
		magic  += ' .res-nightmode .link, .res-nightmode .RES-keyNav-activeElement, .res-nightmode .RES-keyNav-activeElement .md-container, .res-nightmode.res-commentBoxes .comment, .res-nightmode.res-commentBoxes .comment .comment, .res-nightmode.res-commentBoxes .comment .comment .comment, .res-nightmode.res-commentBoxes .comment .comment .comment .comment, .res-nightmode.res-commentBoxes .comment .comment .comment .comment .comment, .res-nightmode.res-commentBoxes .comment .comment .comment .comment .comment .comment, .res-nightmode.res-commentBoxes .comment .comment .comment .comment .comment .comment .comment, .res-nightmode.res-commentBoxes .comment .comment .comment .comment .comment .comment .comment .comment, .res-nightmode.res-commentBoxes .comment .comment .comment .comment .comment .comment .comment .comment .comment, .res-nightmode.res-commentBoxes .comment .comment .comment .comment .comment .comment .comment .comment .comment .comment { background-color: #' + bg + ' !important; border-color: #' + table + ' !important; } ';
		magic += ' .res-nightmode #header-bottom-right a, .res-nightmode a.title, .res-nightmode a.title:visited, .res-nightmode .RES-keyNav-activeElement > .tagline, .res-nightmode .RES-keyNav-activeElement .md-container > .md, .res-nightmode .RES-keyNav-activeElement .md-container > .md p, .res-nightmode #search input[type="text"] { color: #' + text + ' !important; } ';
		magic += ' .usertext-edit textarea { border: 1px dotted #' + table + ' !important; } ';
	}
	else if (curlocation.match(/^https?:\/\/.+\.(?:wikia|fandom)\.com\//i)) {
		magic += " body.background-dynamic.skin-oasis::after, body.background-dynamic.skin-oasis::before { background-image: none !important; } ";
	}
	if (customcss) magic += ' ' + String(customcss).replace(/(?:\r\n|\r|\n)/g, ' ');

	// Replace any previous cloak (settings may have changed) and drop the initial stealth
	removeCloakStyle();
	removeInitialStealth();
	var cssinject = document.createElement("style");
	cssinject.setAttribute("__decreased__", "productivity"+timestamp);
	cssinject.textContent = magic;
	(document.documentElement || document).appendChild(cssinject);
}
function removeCloakStyle() {
	document.querySelectorAll("style[__decreased__='productivity"+timestamp+"']").forEach(function(n) { n.remove(); });
}

// Post-load adjustments that need the DOM (re-run when the page changes)
function dpPostLoad(settings) {
	var maxheight = parseInt(settings.maxheight, 10) || 0;
	var maxwidth = parseInt(settings.maxwidth, 10) || 0;
	// "Show images within" option: images within the size limit are shown uncloaked
	if (maxwidth > 0 && maxheight > 0) {
		document.querySelectorAll("img:not([__decreased__='image"+timestamp+"'])").forEach(function(img) {
			if (!img.complete || !img.naturalWidth) return; // re-checked on a later pass
			img.setAttribute('__decreased__', 'image'+timestamp);
			if (img.width <= maxwidth && img.height <= maxheight) img.classList.add('dp'+timestamp+'_visible');
			else if (settings.sfwmode == "Paranoid") img.classList.add('dp'+timestamp+'_hide');
		});
	}
	// Extra hardening for Paranoid: hide elements that still render CSS-driven images
	if (settings.sfwmode === 'Paranoid') {
		document.querySelectorAll('a, div, span, i, header, section, figure, li, button').forEach(function(el) {
			try {
				var cs = window.getComputedStyle(el);
				var hasMaskImg = (cs.webkitMaskImage && cs.webkitMaskImage !== 'none') || (cs.maskImage && cs.maskImage !== 'none');
				if ((cs.backgroundImage && cs.backgroundImage !== 'none') || hasMaskImg) {
					el.style.setProperty('visibility', 'hidden', 'important');
					el.setAttribute('__decreased__', 'hidden'+timestamp);
				}
			} catch(_e) {}
		});
	}
}
function schedulePostLoad() {
	clearTimeout(postloaddelay);
	postloaddelay = setTimeout(function() {
		if (dpCloaked && dpSettings) { try { dpPostLoad(dpSettings); } catch(e) {} }
	}, 500);
}
// Mutation events (DOMSubtreeModified) were removed from Chrome, so use a MutationObserver
function observeDom() {
	if (dpDomObserver) return;
	dpDomObserver = new MutationObserver(function(mutations) {
		for (var i = 0; i < mutations.length; i++) {
			if (mutations[i].addedNodes.length) { schedulePostLoad(); return; }
		}
	});
	dpDomObserver.observe(document.documentElement || document, {childList: true, subtree: true});
	window.addEventListener('load', schedulePostLoad, {once: true});
}
function unobserveDom() {
	if (dpDomObserver) { dpDomObserver.disconnect(); dpDomObserver = null; }
	clearTimeout(postloaddelay);
}

// Apply the cloak with the given settings (idempotent)
function applyCloak(settings) {
	if (!settings) return;
	dpSettings = settings;
	dpCloaked = true;
	addCloak(settings.sfwmode, settings.font, settings.fontsize, settings.underline, settings.background, settings.text, settings.table, settings.link, settings.bold, settings.opacity1, settings.opacity2, settings.collapseimage, settings.customcss);
	if (settings.favicon === true || settings.favicon === 'true') faviconObserve();
	else faviconrestore();
	if (settings.hidePageTitles === true || settings.hidePageTitles === 'true') {
		replaceTitle(settings.pageTitleText);
		titleBind(settings.pageTitleText);
	} else {
		titleRestore();
	}
	observeDom();
	try { dpPostLoad(settings); } catch(e) {}
}
function removeCss(name) {
	if (typeof(name) !== 'undefined') {
		document.querySelectorAll("style[__decreased__='"+name+"']").forEach(function(n) { n.remove(); });
		return;
	}
	dpCloaked = false;
	removeCloakStyle();
	removeInitialStealth();
	unobserveDom();
	faviconrestore();
	titleRestore();
	document.querySelectorAll("[__decreased__]").forEach(function(el) {
		if (el.getAttribute('__decreased__') === 'hidden'+timestamp) el.style.removeProperty('visibility');
		el.classList.remove('dp'+timestamp+'_visible', 'dp'+timestamp+'_hide');
		el.removeAttribute('__decreased__');
	});
}

// Favicon.js - Change favicon dynamically [http://ajaxify.com/run/favicon].
// Copyright (c) 2006 Michael Mahemoff
// Modifications - Andrew Y.
var DP_BLANK_ICON = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAAZiS0dEAP8A/wD/oL2nkwAAAAlwSFlzAAALEwAACxMBAJqcGAAAAAd0SU1FB9oFFAADATTAuQQAAAAZdEVYdENvbW1lbnQAQ3JlYXRlZCB3aXRoIEdJTVBXgQ4XAAAAEklEQVQ4y2NgGAWjYBSMAggAAAQQAAGFP6pyAAAAAElFTkSuQmCC'; // transparent png
function faviconblank() {
	var head = document.head || document.querySelector('head');
	if (!head) return;
	faviconclear();
	if (!document.getElementById("decreasedproductivity"+timestamp)) {
		var link = document.createElement("link");
		link.type = "image/x-icon";
		link.rel = "icon";
		link.id = "decreasedproductivity"+timestamp;
		link.href = DP_BLANK_ICON;
		head.appendChild(link);
	}
}
function faviconclear() {
	document.querySelectorAll("link[rel~='icon'], link[rel='apple-touch-icon'], link[rel='apple-touch-icon-precomposed'], link[rel='mask-icon']").forEach(function(l) {
		if (l.id === "decreasedproductivity"+timestamp) return;
		l.setAttribute('data-rel', l.getAttribute('rel'));
		l.removeAttribute('rel');
	});
}
function faviconrestore() {
	if (window.__dp_faviconObserver) { window.__dp_faviconObserver.disconnect(); window.__dp_faviconObserver = null; }
	var own = document.getElementById("decreasedproductivity"+timestamp);
	if (own) own.remove();
	document.querySelectorAll("link[data-rel]").forEach(function(l) {
		l.setAttribute('rel', l.getAttribute('data-rel'));
		l.removeAttribute('data-rel');
	});
}
function faviconObserve() {
	if (window.__dp_faviconObserver) return;
	var obs = new MutationObserver(function() {
		if (document.querySelector("link[rel~='icon']:not(#decreasedproductivity"+timestamp+")") || !document.getElementById("decreasedproductivity"+timestamp)) faviconblank();
	});
	window.__dp_faviconObserver = obs;
	obs.observe(document.documentElement || document, {childList: true, subtree: true, attributes: true, attributeFilter: ['rel', 'href']});
	faviconblank();
}
// Favicon Blanking Code END
function replaceTitle(text) {
	if (document.title != text) {
		if (document.title && !origtitle) origtitle = document.title;
		document.title = text;
	}
}
function titleBind(text) {
	if (window.__dp_titleObserver) window.__dp_titleObserver.disconnect();
	// MutationObserver keeps the replacement title even when the page (or an SPA) changes it
	var observer = new MutationObserver(function() { replaceTitle(text); });
	window.__dp_titleObserver = observer;
	observer.observe(document.documentElement || document, {childList: true, subtree: true, characterData: true});
}
function titleRestore() {
	if (window.__dp_titleObserver) { window.__dp_titleObserver.disconnect(); window.__dp_titleObserver = null; }
	if (origtitle) { document.title = origtitle; origtitle = undefined; }
}
function hotkeySet(hotkeyenabled, hotkey, paranoidhotkey) {
	if (dphotkeylistener) { dphotkeylistener.reset(); dphotkeylistener = null; }
	if (window.__dp_hotkeys_handler) { window.removeEventListener('keydown', window.__dp_hotkeys_handler, true); window.__dp_hotkeys_handler = null; }
	if (!(hotkeyenabled == 'true' || hotkeyenabled === true)) return;
	if (!window.keypress || !window.keypress.Listener) return;
	dphotkeylistener = new window.keypress.Listener();
	if (hotkey) {
		dphotkeylistener.simple_combo(hotkey.toLowerCase(), function() { dpSend({reqtype: "toggle"}); });
	}
	if (paranoidhotkey) {
		dphotkeylistener.simple_combo(paranoidhotkey.toLowerCase(), function() { dpSend({reqtype: "toggleparanoid"}); });
	}
}

// Listen for messages from the background service worker
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
	if (request.action === 'applyCloak') {
		dpSend({reqtype: "get-settings"}, function(settings) {
			if (settings) applyCloak(settings);
			sendResponse({success: !!settings});
		});
		return true; // keep the channel open for the async response
	} else if (request.action === 'removeCloak') {
		removeCss();
		sendResponse({success: true});
	}
	return false;
});

// Bootstrap: ask the background (once) whether this tab should be cloaked and with which settings
dpSend({reqtype: "get-cloak-state"}, function(state) {
	if (!state || !state.settings) return;
	var settings = state.settings;
	var setHotkeys = function() { hotkeySet(settings.enableToggle, settings.hotkey, settings.paranoidhotkey); };
	if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setHotkeys, {once: true});
	else setHotkeys();
	if (state.shouldCloak) {
		addInitialStealth(settings.background);
		applyCloak(settings);
	}
});
