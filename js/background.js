// (c) Andrew
// Icon by dunedhel: http://dunedhel.deviantart.com/
// Supporting functions by AdThwart - T. Joseph

// Version comes straight from the manifest so it never drifts.
var version = chrome.runtime.getManifest().version;

// Per-tab state, keyed by tab id. Service workers are terminated when idle, so this
// state is mirrored to chrome.storage.session and restored on start-up.
var cloakedTabs = [];      // tabs that are currently cloaked
var uncloakedTabs = [];    // tabs that are currently not cloaked (used for stickiness)
var manualUncloak = {};    // tabId -> domain the user explicitly uncloaked on that tab
var manualCloakTabs = [];  // tabs the user cloaked on purpose (icon, hotkey, "open safely", stickiness)
var dpicon = 'coffee', dptitle = 'Decreased Productivity';
var blackList = [], whiteList = [];

// ===== Settings cache (MV3 service workers have no window.localStorage) =====
// Settings live in chrome.storage.local. They are cached in memory so the rest of the
// code can keep reading them synchronously through the `localStorage` proxy below.
var localStorageCache = {};

// Older builds of the options page saved checkboxes as real booleans, while this file
// compares against the strings 'true' / 'false' everywhere. Normalise on read.
function normalizeValue(v) {
	return (typeof v === 'boolean') ? String(v) : v;
}

var localStorage = new Proxy({}, {
	get: function(target, prop) {
		return normalizeValue(localStorageCache[prop]);
	},
	set: function(target, prop, value) {
		localStorageCache[prop] = value;
		chrome.storage.local.set({[prop]: value}).catch(function(e) { console.error('[DP] Error saving setting', prop, e); });
		return true;
	},
	deleteProperty: function(target, prop) {
		delete localStorageCache[prop];
		chrome.storage.local.remove(prop).catch(function(e) { console.error('[DP] Error removing setting', prop, e); });
		return true;
	},
	has: function(target, prop) {
		return prop in localStorageCache;
	}
});

function isTrue(v) { return v === 'true' || v === true; }

// ===== Initialisation =====
// Every event handler awaits `ready` so nothing runs against an empty cache right
// after the service worker has been (re)started.
var ready = initializeExtension();

async function initializeExtension() {
	try {
		localStorageCache = (await chrome.storage.local.get(null)) || {};
		await restoreTabState();
		setDefaultOptions();
		initLists();
		dpicon = localStorage["iconType"] || 'coffee';
		dptitle = localStorage["iconTitle"] || 'Decreased Productivity';
		if (localStorage["version"] != version) localStorage["version"] = version;
	} catch(e) {
		console.error('[DP] Error initializing extension:', e);
	}
}

async function restoreTabState() {
	try {
		if (!chrome.storage.session) return;
		var saved = await chrome.storage.session.get(['cloakedTabs', 'uncloakedTabs', 'manualUncloak', 'manualCloakTabs']);
		if (Array.isArray(saved.cloakedTabs)) cloakedTabs = saved.cloakedTabs;
		if (Array.isArray(saved.uncloakedTabs)) uncloakedTabs = saved.uncloakedTabs;
		if (saved.manualUncloak && typeof saved.manualUncloak === 'object') manualUncloak = saved.manualUncloak;
		if (Array.isArray(saved.manualCloakTabs)) manualCloakTabs = saved.manualCloakTabs;
	} catch(e) {
		console.error('[DP] Could not restore tab state:', e);
	}
}

var persistTimer = null;
function persistTabState() {
	if (!chrome.storage.session) return;
	clearTimeout(persistTimer);
	persistTimer = setTimeout(function() {
		chrome.storage.session.set({cloakedTabs: cloakedTabs, uncloakedTabs: uncloakedTabs, manualUncloak: manualUncloak, manualCloakTabs: manualCloakTabs})
			.catch(function(e) { console.error('[DP] Could not save tab state:', e); });
	}, 50);
}

// ----- Tab state helpers
function markCloaked(tabId) {
	var i = uncloakedTabs.indexOf(tabId);
	if (i != -1) uncloakedTabs.splice(i, 1);
	if (cloakedTabs.indexOf(tabId) == -1) cloakedTabs.push(tabId);
	persistTabState();
}
function markUncloaked(tabId) {
	var i = cloakedTabs.indexOf(tabId);
	if (i != -1) cloakedTabs.splice(i, 1);
	if (uncloakedTabs.indexOf(tabId) == -1) uncloakedTabs.push(tabId);
	persistTabState();
}
function forgetTab(tabId) {
	var i = cloakedTabs.indexOf(tabId);
	if (i != -1) cloakedTabs.splice(i, 1);
	i = uncloakedTabs.indexOf(tabId);
	if (i != -1) uncloakedTabs.splice(i, 1);
	delete manualUncloak[tabId];
	i = manualCloakTabs.indexOf(tabId);
	if (i != -1) manualCloakTabs.splice(i, 1);
	persistTabState();
}
function isCloakedTab(tabId) { return cloakedTabs.indexOf(tabId) != -1; }
// A manual cloak follows the tab across domains (tab-specific mode); a cloak triggered only
// by the blacklist does not, so leaving a blacklisted site uncloaks the tab again.
function setManualCloak(tabId, on) {
	var i = manualCloakTabs.indexOf(tabId);
	if (on && i == -1) manualCloakTabs.push(tabId);
	else if (!on && i != -1) manualCloakTabs.splice(i, 1);
	persistTabState();
}
function isManualCloak(tabId) { return manualCloakTabs.indexOf(tabId) != -1; }

// ----- Supporting Functions

// Decide whether a tab should be cloaked. Returns 'true' or 'false'.
function enabled(tab) {
	if (!tab || !isCloakableUrl(tab.url)) return 'false';
	var domain = extractDomainFromURL(tab.url);
	var dpdomaincheck = domainCheck(domain);
	// Whitelisted domains are never cloaked.
	if (dpdomaincheck == '0') return 'false';
	// The user explicitly uncloaked this tab while on this domain: respect that until
	// the tab moves to another domain.
	if (manualUncloak[tab.id] && manualUncloak[tab.id] === domain) return 'false';
	// Blacklisted domains are always cloaked.
	if (dpdomaincheck == '1') return 'true';
	if (!isTrue(localStorage["enable"])) return 'false';
	if (isTrue(localStorage["global"])) return 'true';
	if (isManualCloak(tab.id) || localStorage["newPages"] == "Cloak") return 'true';
	return 'false';
}
function domainCheck(domain) {
	if (!domain) return '-1';
	if (in_array(domain, whiteList) == '1') return '0';
	if (in_array(domain, blackList) == '1') return '1';
	return '-1';
}
function in_array(needle, haystack) {
	if (!haystack || !needle) return false;
	needle = needle.toLowerCase();
	if (binarySearch(haystack, needle) != -1) return '1';
	if (needle.indexOf('www.') == 0) {
		if (binarySearch(haystack, needle.substring(4)) != -1) return '1';
	}
	for (var i = 0; i < haystack.length; i++) {
		if (haystack[i].indexOf("*") == -1 && haystack[i].indexOf("?") == -1) continue;
		if (new RegExp('^(?:www\\.|^)(?:'+haystack[i].replace(/\./g, '\\.').replace(/^\[/, '\\[').replace(/\]$/, '\\]').replace(/\?/g, '.').replace(/\*/g, '[^.]+')+')').test(needle)) return '1';
	}
	return false;
}
function binarySearch(list, item) {
	var min = 0;
	var max = list.length - 1;
	var guess;
	while (min <= max) {
		guess = (min + max) >> 1;
		if (list[guess] === item) return guess;
		if (list[guess] < item) min = guess + 1;
		else max = guess - 1;
	}
	return -1;
}
function extractDomainFromURL(url) {
	if (!url) return "";
	if (url.indexOf("://") != -1) url = url.substr(url.indexOf("://") + 3);
	if (url.indexOf("/") != -1) url = url.substr(0, url.indexOf("/"));
	if (url.indexOf("@") != -1) url = url.substr(url.indexOf("@") + 1);
	if (url.match(/^(?:\[[A-Fa-f0-9:.]+\])(:[0-9]+)?$/g)) {
		if (url.indexOf("]:") != -1) return url.substr(0, url.indexOf("]:")+1);
		return url.toLowerCase();
	}
	if (url.indexOf(":") > 0) url = url.substr(0, url.indexOf(":"));
	return url.toLowerCase();
}
function parseList(json) {
	try {
		var list = JSON.parse(json || '[]');
		if (!Array.isArray(list)) return [];
		return list.filter(function(d) { return typeof d === 'string' && d.trim() !== ''; })
			.map(function(d) { return d.trim().toLowerCase(); });
	} catch(e) {
		return [];
	}
}
function domainHandler(domain, action) {
	try {
		domain = String(domain || '').trim().toLowerCase();
		if (!domain) return false;
		var tempWhitelist = parseList(localStorage['whiteList']);
		var tempBlacklist = parseList(localStorage['blackList']);

		// Remove domain from both lists first
		tempWhitelist = tempWhitelist.filter(function(d) { return d !== domain; });
		tempBlacklist = tempBlacklist.filter(function(d) { return d !== domain; });

		if (action == 0) tempWhitelist.push(domain);      // Whitelist
		else if (action == 1) tempBlacklist.push(domain); // Blacklist
		// action 2: remove only

		localStorage['blackList'] = JSON.stringify(tempBlacklist);
		localStorage['whiteList'] = JSON.stringify(tempWhitelist);
		blackList = tempBlacklist.sort();
		whiteList = tempWhitelist.sort();
		return true;
	} catch(e) {
		console.error('[DP] Error in domainHandler:', e);
		return false;
	}
}
// ----- Options
function optionExists(opt) {
	return (typeof localStorage[opt] != "undefined");
}
function defaultOptionValue(opt, val) {
	if (!optionExists(opt)) localStorage[opt] = val;
}
function setDefaultOptions() {
	defaultOptionValue("version", version);
	defaultOptionValue("enable", "true");
	defaultOptionValue("enableToggle", "true");
	defaultOptionValue("hotkey", "CTRL F12");
	defaultOptionValue("paranoidhotkey", "ALT P");
	defaultOptionValue("global", "false");
	defaultOptionValue("newPages", "Uncloak");
	defaultOptionValue("sfwmode", "SFW");
	defaultOptionValue("savedsfwmode", "");
	defaultOptionValue("opacity1", "0.05");
	defaultOptionValue("opacity2", "0.5");
	defaultOptionValue("collapseimage", "false");
	defaultOptionValue("showIcon", "true");
	defaultOptionValue("iconType", "coffee");
	defaultOptionValue("iconTitle", "Decreased Productivity");
	defaultOptionValue("disableFavicons", "false");
	defaultOptionValue("hidePageTitles", "false");
	defaultOptionValue("pageTitleText", "Google Chrome");
	defaultOptionValue("enableStickiness", "false");
	defaultOptionValue("maxwidth", "0");
	defaultOptionValue("maxheight", "0");
	defaultOptionValue("showContext", "true");
	defaultOptionValue("showUnderline", "true");
	defaultOptionValue("removeBold", "false");
	defaultOptionValue("showUpdateNotifications", "true");
	defaultOptionValue("font", "Arial");
	defaultOptionValue("customfont", "");
	defaultOptionValue("fontsize", "12");
	defaultOptionValue("s_bg", "FFFFFF");
	defaultOptionValue("s_link", "000099");
	defaultOptionValue("s_table", "cccccc");
	defaultOptionValue("s_text", "000000");
	defaultOptionValue("customcss", "");
	// fix hotkey shortcut if in old format (if using + as separator instead of space)
	if (localStorage["hotkey"] && localStorage["hotkey"].indexOf('+') != -1) {
		localStorage["hotkey"] = localStorage["hotkey"].replace(/\+$/, "APLUSA").replace(/\+/g, " ").replace(/APLUSA/, "+");
	}
	// delete old options if they exist
	if (optionExists("globalEnable")) delete localStorage["globalEnable"];
	if (optionExists("style")) delete localStorage["style"];
	// set SFW Level to SFW (for new change in v0.46.3)
	if (localStorage["sfwmode"] == "true") localStorage["sfwmode"] = "SFW";
	if (!optionExists("blackList")) localStorage['blackList'] = JSON.stringify([]);
	if (!optionExists("whiteList")) localStorage['whiteList'] = JSON.stringify([]);
}
function initLists() {
	blackList = parseList(localStorage['blackList']).sort();
	whiteList = parseList(localStorage['whiteList']).sort();
}

// ----- Context menus
// Called by clicking on the "open safely" context menu item
function newCloak(info, tab) {
	// Enable cloaking (in case it has been disabled) and open the link in a new tab
	localStorage["enable"] = "true";
	var url = info.mediaType ? info.srcUrl : info.linkUrl;
	chrome.tabs.create({'url': url, 'openerTabId': tab ? tab.id : undefined}, function(newTab) {
		if (chrome.runtime.lastError || !newTab) return;
		markCloaked(newTab.id);
		setManualCloak(newTab.id, true);
	});
}
function initializeContextMenus() {
	chrome.contextMenus.removeAll(function() {
		if (chrome.runtime.lastError) return;
		var ignore = function() { void chrome.runtime.lastError; };
		chrome.contextMenus.create({"id": "whitelistdomain", "title": chrome.i18n.getMessage("whitelistdomain"), "contexts": ['action']}, ignore);
		chrome.contextMenus.create({"id": "blacklistdomain", "title": chrome.i18n.getMessage("blacklistdomain"), "contexts": ['action']}, ignore);
		chrome.contextMenus.create({"id": "removelist", "title": chrome.i18n.getMessage("removelist"), "contexts": ['action']}, ignore);
		// Context menu item that shows only if you right-click on links/images
		if (isTrue(localStorage["showContext"])) {
			chrome.contextMenus.create({"id": "opensafely", "title": chrome.i18n.getMessage("opensafely"), "contexts": ['link', 'image']}, ignore);
		}
	});
}
function handleContextMenuClick(info, tab) {
	if (info.menuItemId == 'opensafely') {
		newCloak(info, tab);
		return;
	}
	if (!tab || !isCloakableUrl(tab.url)) return;
	var domain = extractDomainFromURL(tab.url);
	switch(info.menuItemId) {
		case 'whitelistdomain':
			domainHandler(domain, 0);
			setTabCloak(tab, false);
			break;
		case 'blacklistdomain':
			domainHandler(domain, 1);
			delete manualUncloak[tab.id];
			setTabCloak(tab, true);
			break;
		case 'removelist':
			domainHandler(domain, 2);
			delete manualUncloak[tab.id];
			setTabCloak(tab, isTrue(localStorage["enable"]) && (localStorage['newPages'] == 'Cloak' || isTrue(localStorage['global'])));
			break;
	}
}
// ----- Main Functions
function isCloakableUrl(url) {
	return typeof url === 'string' && /^https?:\/\//i.test(url);
}
function hotkeyChange() {
	chrome.tabs.query({}, function(tabs) {
		tabs.forEach(function(tab) {
			if (!isCloakableUrl(tab.url)) return;
			chrome.scripting.executeScript({
				target: {tabId: tab.id, allFrames: true},
				func: function(enableToggle, hotkey, paranoidhotkey) {
					if (typeof hotkeySet === 'function') hotkeySet(enableToggle, hotkey, paranoidhotkey);
				},
				args: [localStorage["enableToggle"], localStorage["hotkey"], localStorage["paranoidhotkey"]]
			}).catch(function() { /* tab not scriptable (e.g. Chrome Web Store) */ });
		});
	});
}
function optionsSaveTrigger(prevglob, newglob) {
	prevglob = normalizeValue(prevglob);
	newglob = normalizeValue(newglob);
	var enable = localStorage["enable"];
	var global = newglob;
	if (prevglob == 'true' && newglob == 'false') {
		global = 'true';
		enable = 'false';
	}
	if (global == 'false') {
		// Re-apply (or remove) the cloak on tabs that are currently cloaked so new settings take effect
		var tabs = cloakedTabs.slice();
		tabs.forEach(function(tabId) {
			chrome.tabs.get(tabId, function(tab) {
				if (chrome.runtime.lastError || !tab) { forgetTab(tabId); return; }
				setTabCloak(tab, enable == 'true' || domainCheck(extractDomainFromURL(tab.url)) == '1');
			});
		});
	} else recursiveCloak(enable, global);
}
// Apply the cloak state to every tab (global mode)
function recursiveCloak(enable, global, tabId) {
	if (global == 'true') {
		chrome.tabs.query({}, function(tabs) {
			tabs.forEach(function(tab) {
				if (!isCloakableUrl(tab.url)) return;
				var cloak = enable == 'true';
				var dpdomaincheck = domainCheck(extractDomainFromURL(tab.url));
				// Ensure whitelisted or blacklisted tabs stay as they are
				if (dpdomaincheck == '0') cloak = false;
				else if (dpdomaincheck == '1') cloak = true;
				delete manualUncloak[tab.id];
				setTabCloak(tab, cloak);
			});
		});
	} else if (tabId) {
		magician(enable, tabId);
	}
}
// Cloak or uncloak a single tab and keep the tracking in sync
function setTabCloak(tab, cloak) {
	magician(cloak ? 'true' : 'false', tab.id);
	if (cloak) markCloaked(tab.id);
	else markUncloaked(tab.id);
}
function magician(enable, tabId) {
	// The content script fetches the settings itself and applies or removes the cloak
	chrome.tabs.sendMessage(tabId, {action: enable == 'true' ? 'applyCloak' : 'removeCloak'}).catch(function() {
		// No content script in that tab (yet): it will ask for its state when it loads
	});
	updateIcon(tabId, enable == 'true');
}
function updateIcon(tabId, cloaked) {
	if (!isTrue(localStorage["showIcon"])) return;
	var path = "/img/addressicon/" + dpicon + (cloaked ? "" : "-disabled") + ".png";
	chrome.action.setIcon({path: path, tabId: tabId}).catch(function() {});
	chrome.action.setTitle({title: dptitle, tabId: tabId}).catch(function() {});
}
// Toolbar icon / hotkey toggle
function dpHandle(tab) {
	if (!tab || !isCloakableUrl(tab.url)) return;
	var domain = extractDomainFromURL(tab.url);
	if (isTrue(localStorage["global"]) && domainCheck(domain) != '1') {
		if (isTrue(localStorage["enable"])) {
			localStorage["enable"] = "false";
			recursiveCloak('false', 'true');
		} else {
			localStorage["enable"] = "true";
			recursiveCloak('true', 'true');
		}
	} else {
		localStorage["enable"] = "true";
		if (isCloakedTab(tab.id)) {
			// Remember the manual choice so the tab is not re-cloaked on reload
			// (e.g. a blacklisted domain or "cloak new pages") while it stays on this domain
			manualUncloak[tab.id] = domain;
			setManualCloak(tab.id, false);
			setTabCloak(tab, false);
		} else {
			delete manualUncloak[tab.id];
			setManualCloak(tab.id, true);
			setTabCloak(tab, true);
		}
	}
}
function setDPIcon() {
	dpicon = localStorage["iconType"] || 'coffee';
	dptitle = localStorage["iconTitle"] || 'Decreased Productivity';
	chrome.tabs.query({}, function(tabs) {
		tabs.forEach(function(tab) { updateIcon(tab.id, isCloakedTab(tab.id)); });
	});
}
function getSettings() {
	var fontface;
	if (localStorage["font"] == '-Custom-') fontface = localStorage["customfont"] || 'Arial';
	else fontface = localStorage["font"];
	return {sfwmode: localStorage["sfwmode"], font: fontface, fontsize: localStorage["fontsize"], underline: localStorage["showUnderline"], background: localStorage["s_bg"], text: localStorage["s_text"], table: localStorage["s_table"], link: localStorage["s_link"], bold: localStorage["removeBold"], opacity1: localStorage["opacity1"], opacity2: localStorage["opacity2"], collapseimage: localStorage["collapseimage"], maxheight: localStorage["maxheight"], maxwidth: localStorage["maxwidth"], customcss: localStorage["customcss"], favicon: localStorage["disableFavicons"], hidePageTitles: localStorage["hidePageTitles"], pageTitleText: localStorage["pageTitleText"], enableToggle: localStorage["enableToggle"], hotkey: localStorage["hotkey"], paranoidhotkey: localStorage["paranoidhotkey"]};
}
// Evaluate a tab, update tracking and return 'true' / 'false'
function evaluateTab(tab) {
	var enable = enabled(tab);
	if (enable == 'true') markCloaked(tab.id);
	else markUncloaked(tab.id);
	updateIcon(tab.id, enable == 'true');
	return enable;
}

// ----- Event listeners (registered synchronously at top level, as MV3 requires)
chrome.storage.onChanged.addListener(function(changes, areaName) {
	if (areaName !== 'local') return;
	ready.then(function() {
		for (var key in changes) {
			if (changes[key].newValue === undefined) delete localStorageCache[key];
			else localStorageCache[key] = changes[key].newValue;
		}
		if ('whiteList' in changes || 'blackList' in changes) initLists();
		if ('iconType' in changes || 'iconTitle' in changes) setDPIcon();
		if ('showContext' in changes) initializeContextMenus();
	});
});

chrome.tabs.onUpdated.addListener(function(tabId, changeinfo, tab) {
	if (changeinfo.status != "loading") return;
	ready.then(function() {
		if (!isCloakableUrl(tab.url)) {
			updateIcon(tabId, false);
			return;
		}
		var domain = extractDomainFromURL(tab.url);
		// A manual "uncloak" only sticks while the tab stays on the same domain
		if (manualUncloak[tabId] && manualUncloak[tabId] !== domain) {
			delete manualUncloak[tabId];
			persistTabState();
		}
		var enable = enabled(tab);
		if (enable == 'true') {
			markCloaked(tabId);
			updateIcon(tabId, true);
			return;
		}
		// Stickiness: tabs opened from a cloaked tab inherit the cloak
		if (isTrue(localStorage["enableStickiness"]) && isTrue(localStorage["enable"])
			&& uncloakedTabs.indexOf(tabId) == -1 && !manualUncloak[tabId]
			&& domainCheck(domain) != '0'
			&& tab.openerTabId !== undefined && isCloakedTab(tab.openerTabId)) {
			markCloaked(tabId);
			setManualCloak(tabId, true);
			magician('true', tabId);
			return;
		}
		markUncloaked(tabId);
		updateIcon(tabId, false);
	});
});
chrome.tabs.onRemoved.addListener(function(tabId) {
	ready.then(function() { forgetTab(tabId); });
});
chrome.tabs.onReplaced.addListener(function(addedTabId, removedTabId) {
	ready.then(function() {
		if (isCloakedTab(removedTabId)) markCloaked(addedTabId);
		if (isManualCloak(removedTabId)) setManualCloak(addedTabId, true);
		forgetTab(removedTabId);
	});
});
chrome.tabs.onActivated.addListener(function(activeInfo) {
	ready.then(function() { updateIcon(activeInfo.tabId, isCloakedTab(activeInfo.tabId)); });
});

var requestDispatchTable = {
	// Single round trip used by the content script: should this tab be cloaked, and with which settings
	"get-cloak-state": function(request, sender, sendResponse) {
		if (!sender.tab) { sendResponse({shouldCloak: false, settings: getSettings()}); return; }
		var enable = evaluateTab(sender.tab);
		sendResponse({shouldCloak: enable === 'true', settings: getSettings()});
	},
	// Legacy messages, kept for compatibility
	"get-enabled": function(request, sender, sendResponse) {
		var enable = sender.tab ? evaluateTab(sender.tab) : 'false';
		var s = getSettings();
		sendResponse({enable: enable, background: s.background, favicon: s.favicon, hidePageTitles: s.hidePageTitles, pageTitleText: s.pageTitleText, enableToggle: s.enableToggle, hotkey: s.hotkey, paranoidhotkey: s.paranoidhotkey});
	},
	"should-cloak-tab": function(request, sender, sendResponse) {
		sendResponse({shouldCloak: !!sender.tab && evaluateTab(sender.tab) === 'true'});
	},
	"get-settings": function(request, sender, sendResponse) {
		var s = getSettings();
		s.enable = sender.tab ? enabled(sender.tab) : 'false';
		sendResponse(s);
	},
	"get-domain-status": function(request, sender, sendResponse) {
		var url = (sender && sender.tab && sender.tab.url) ? sender.tab.url : (request && request.url) ? request.url : '';
		var domain = extractDomainFromURL(url);
		sendResponse({domain: domain, result: domainCheck(domain)});
	},
	"toggle": function(request, sender, sendResponse) {
		if (localStorage["savedsfwmode"] != "") {
			// Leaving paranoid mode: restore the previous level and keep the tab cloaked
			localStorage["sfwmode"] = localStorage["savedsfwmode"];
			localStorage["savedsfwmode"] = "";
			localStorage["enable"] = "true";
			if (isTrue(localStorage["global"])) recursiveCloak('true', 'true');
			else { delete manualUncloak[sender.tab.id]; setManualCloak(sender.tab.id, true); setTabCloak(sender.tab, true); }
		} else {
			dpHandle(sender.tab);
		}
		sendResponse({success: true});
	},
	"toggleparanoid": function(request, sender, sendResponse) {
		if (localStorage["savedsfwmode"] == "") {
			localStorage["savedsfwmode"] = localStorage["sfwmode"];
			localStorage["sfwmode"] = "Paranoid";
			localStorage["enable"] = "true";
			if (isTrue(localStorage["global"])) recursiveCloak('true', 'true');
			else { delete manualUncloak[sender.tab.id]; setManualCloak(sender.tab.id, true); setTabCloak(sender.tab, true); }
		} else {
			localStorage["sfwmode"] = localStorage["savedsfwmode"];
			localStorage["savedsfwmode"] = "";
			dpHandle(sender.tab);
		}
		sendResponse({success: true});
	},
	"setDPIcon": function(request, sender, sendResponse) {
		setDPIcon();
		sendResponse({success: true});
	},
	"optionsSaveTrigger": function(request, sender, sendResponse) {
		optionsSaveTrigger(request.prevglob, request.newglob);
		sendResponse({success: true});
	},
	"hotkeyChange": function(request, sender, sendResponse) {
		hotkeyChange();
		sendResponse({success: true});
	},
	"domainHandler": function(request, sender, sendResponse) {
		sendResponse({success: domainHandler(request.domain, request.type)});
	},
	"initLists": function(request, sender, sendResponse) {
		initLists();
		sendResponse({success: true});
	},
	"ping": function(request, sender, sendResponse) {
		sendResponse({pong: true});
	}
};
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
	var action = request && (request.reqtype || request.action);
	if (!(action in requestDispatchTable)) return false;
	ready.then(function() {
		try {
			requestDispatchTable[action](request, sender, sendResponse);
		} catch(e) {
			console.error('[DP] Error handling message', action, e);
			sendResponse({});
		}
	});
	return true; // respond asynchronously
});

chrome.contextMenus.onClicked.addListener(function(info, tab) {
	ready.then(function() { handleContextMenuClick(info, tab); });
});

// If the toolbar icon is clicked, either enable or disable the cloak
chrome.action.onClicked.addListener(function(tab) {
	ready.then(function() { dpHandle(tab); });
});

chrome.runtime.onInstalled.addListener(function() {
	ready.then(function() {
		initializeContextMenus();
		setDPIcon();
	});
});
chrome.runtime.onStartup.addListener(function() {
	ready.then(function() {
		initializeContextMenus();
		setDPIcon();
	});
});
