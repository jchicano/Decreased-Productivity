// (c) Andrew
// Icon by dunedhel: http://dunedhel.deviantart.com/
// Supporting functions by AdThwart - T. Joseph

//'use strict'; - enable after testing
// Version is now available from manifest directly
var version = "0.47.0.1";
var cloakedTabs = [];
var uncloakedTabs = [];
var contextLoaded = false;
var dpicon, dptitle;
var blackList, whiteList;

// ===== localStorage SHIM for Service Worker (MV3) =====
// Service workers don't have access to localStorage, so we create a synchronous-like wrapper
// This initializes a cache that syncs with chrome.storage.local
var localStorageCache = {};
var storageInitialized = false;

// Initialize storage cache from chrome.storage.local
async function initializeStorage() {
	try {
		const data = await chrome.storage.local.get(null);
		localStorageCache = data || {};
		storageInitialized = true;
		return true;
	} catch(e) {
		console.error('Error initializing storage:', e);
		return false;
	}
}

// Synchronous localStorage replacement using cache
var localStorage = {
	getItem: function(key) {
		return localStorageCache[key];
	},
	setItem: function(key, value) {
		localStorageCache[key] = value;
		// Async save to chrome.storage.local (fire and forget)
		chrome.storage.local.set({[key]: value}).catch(e => console.error('Error saving to storage:', e));
	},
	removeItem: function(key) {
		delete localStorageCache[key];
		chrome.storage.local.remove(key).catch(e => console.error('Error removing from storage:', e));
	},
	clear: function() {
		localStorageCache = {};
		chrome.storage.local.clear().catch(e => console.error('Error clearing storage:', e));
	}
};

// Make bracket notation work
Object.defineProperty(localStorage, '__proto__', {
	get: function() { return localStorageCache; },
	set: function(obj) { 
		for (let key in obj) {
			if (obj.hasOwnProperty(key)) {
				this.setItem(key, obj[key]);
			}
		}
	}
});

// Proxy to enable localStorage["key"] = value syntax
var localStorageProxy = new Proxy(localStorage, {
	get: function(target, prop) {
		if (prop in target) {
			return typeof target[prop] === 'function' ? target[prop].bind(target) : target[prop];
		}
		return localStorageCache[prop];
	},
	set: function(target, prop, value) {
		if (prop in target && typeof target[prop] === 'function') {
			return false;
		}
		localStorageCache[prop] = value;
		chrome.storage.local.set({[prop]: value}).catch(e => console.error('Error saving to storage:', e));
		return true;
	}
});

// Replace global reference
localStorage = localStorageProxy;

// Listen for changes in chrome.storage.local and update cache
chrome.storage.onChanged.addListener(function(changes, areaName) {
	if (areaName === 'local') {
		for (let key in changes) {
			localStorageCache[key] = changes[key].newValue;
		}
	}
});

// ----- Supporting Functions

function enabled(tab, dpcloakindex) {
	var dpdomaincheck = domainCheck(extractDomainFromURL(tab.url));
	var dpcloakindex = dpcloakindex || cloakedTabs.indexOf(tab.windowId+"|"+tab.id);
	if ((localStorage["enable"] == "true" || dpdomaincheck == '1') && dpdomaincheck != '0' && (localStorage["global"] == "true" || (localStorage["global"] == "false" && (dpcloakindex != -1 || localStorage["newPages"] == "Cloak" || dpdomaincheck == '1')))) return 'true';
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
	if (binarySearch(haystack, needle) != -1) return '1';
	if (needle.indexOf('www.') == 0) {
		if (binarySearch(haystack, needle.substring(4)) != -1) return '1';
	}
	for (var i in haystack) {
		if (haystack[i].indexOf("*") == -1 && haystack[i].indexOf("?") == -1) continue;
		if (new RegExp('^(?:www\\.|^)(?:'+haystack[i].replace(/\./g, '\\.').replace(/^\[/, '\\[').replace(/\]$/, '\\]').replace(/\?/g, '.').replace(/\*/g, '[^.]+')+')').test(needle)) return '1';
	}
	return false;
}
function binarySearch(list, item) {
    var min = 0;
    var max = list.length - 1;
    var guess;
	var bitwise = (max <= 2147483647) ? true : false;
	if (bitwise) {
		while (min <= max) {
			guess = (min + max) >> 1;
			if (list[guess] === item) { return guess; }
			else {
				if (list[guess] < item) { min = guess + 1; }
				else { max = guess - 1; }
			}
		}
	} else {
		while (min <= max) {
			guess = Math.floor((min + max) / 2);
			if (list[guess] === item) { return guess; }
			else {
				if (list[guess] < item) { min = guess + 1; }
				else { max = guess - 1; }
			}
		}
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
		return url;
	}
	if (url.indexOf(":") > 0) url = url.substr(0, url.indexOf(":"));
	return url;
}
function domainHandler(domain,action) {
	try {
		// Initialize local storage
		if (typeof(localStorage['whiteList'])=='undefined') localStorage['whiteList'] = JSON.stringify([]);
		if (typeof(localStorage['blackList'])=='undefined') localStorage['blackList'] = JSON.stringify([]);
		var tempWhitelist = JSON.parse(localStorage['whiteList']);
		var tempBlacklist = JSON.parse(localStorage['blackList']);
		
		// Remove domain from whitelist and blacklist
		var pos = tempWhitelist.indexOf(domain);
		if (pos>-1) tempWhitelist.splice(pos,1);
		pos = tempBlacklist.indexOf(domain);
		if (pos>-1) tempBlacklist.splice(pos,1);
		
		switch(action) {
			case 0:	// Whitelist
				tempWhitelist.push(domain);
				break;
			case 1:	// Blacklist
				tempBlacklist.push(domain);
				break;
			case 2:	// Remove
				break;
		}
		
		localStorage['blackList'] = JSON.stringify(tempBlacklist);
		localStorage['whiteList'] = JSON.stringify(tempWhitelist);
		blackList = tempBlacklist.sort();
		whiteList = tempWhitelist.sort();
		return true;
	} catch(e) {
		console.error('Error in domainHandler:', e);
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
	if (localStorage["hotkey"].indexOf('+') != -1) {
		localStorage["hotkey"] = localStorage["hotkey"].replace(/\+$/, "APLUSA").replace(/\+/g, " ").replace(/APLUSA/, "+");
	}
	// delete old option if exists
	if (optionExists("globalEnable"))
		delete localStorage["globalEnable"];
	// delete old option if exists
	if (optionExists("style"))
		delete localStorage["style"];
	// set SFW Level to SFW (for new change in v0.46.3)
	if (localStorage["sfwmode"] == "true")
		localStorage["sfwmode"] = "SFW";
	if (!optionExists("blackList")) localStorage['blackList'] = JSON.stringify([]);
	if (!optionExists("whiteList")) localStorage['whiteList'] = JSON.stringify([]);
}

// Called by clicking on the context menu item
function newCloak(info, tab) {
	// Enable cloaking (in case its been disabled) and open the link in a new tab
	localStorage["enable"] = "true";
	// If it's an image, load the "src" attribute
	if (info.mediaType) chrome.tabs.create({'url': info.srcUrl}, function(tab){ cloakedTabs.push(tab.windowId+"|"+tab.id);recursiveCloak('true', localStorage["global"], tab.id); });
	// Else, it's a normal link, so load the linkUrl.
	else chrome.tabs.create({'url': info.linkUrl}, function(tab){ cloakedTabs.push(tab.windowId+"|"+tab.id);recursiveCloak('true', localStorage["global"], tab.id); });
}
// Initialize context menus safely
var menusInitialized = false;
function initializeContextMenus() {
	if (menusInitialized) return;
	
	try {
		// Remove all existing menus first to avoid duplicates
		chrome.contextMenus.removeAll(function() {
			if (chrome.runtime.lastError) {
				console.error('Error removing menus:', chrome.runtime.lastError);
				return;
			}
			
			// Create context menus without onclick handlers (MV3 style)
			chrome.contextMenus.create({"id": "whitelistdomain", "title": chrome.i18n.getMessage("whitelistdomain"), "contexts": ['action']}, function() {
				if (chrome.runtime.lastError) return; // Silently ignore if already exists
			});
			chrome.contextMenus.create({"id": "blacklistdomain", "title": chrome.i18n.getMessage("blacklistdomain"), "contexts": ['action']}, function() {
				if (chrome.runtime.lastError) return;
			});
			chrome.contextMenus.create({"id": "removelist", "title": chrome.i18n.getMessage("removelist"), "contexts": ['action']}, function() {
				if (chrome.runtime.lastError) return;
			});
			
			// Add context menu item that shows only if you right-click on links/images
			if (localStorage["showContext"] == 'true' && !contextLoaded) {
				chrome.contextMenus.create({"id": "opensafely", "title": chrome.i18n.getMessage("opensafely"), "contexts": ['link', 'image']}, function() {
					if (chrome.runtime.lastError) return;
				});
				contextLoaded = true;
			}
			
			menusInitialized = true;
		});
	} catch(e) {
		console.error('Error initializing context menus:', e);
	}
}

// Handle context menu clicks
function handleContextMenuClick(info, tab) {
	if (tab.url.substring(0, 4) != 'http') return;
	
	switch(info.menuItemId) {
		case 'whitelistdomain':
			domainHandler(extractDomainFromURL(tab.url), 0);
			if (localStorage["enable"] == "true") magician('false', tab.id);
			break;
		case 'blacklistdomain':
			domainHandler(extractDomainFromURL(tab.url), 1);
			if (localStorage["enable"] == "true") magician('true', tab.id);
			break;
		case 'removelist':
			domainHandler(extractDomainFromURL(tab.url), 2);
			if (localStorage["enable"] == "true")  {
				var flag = 'false';
				if (localStorage['newPages'] == 'Cloak' || localStorage['global'] == 'true') flag = 'true';
				magician(flag, tab.id);
			}
			break;
		case 'opensafely':
			newCloak(info, tab);
			break;
	}
}
// ----- Main Functions
function checkChrome(url) {
	if (url.substring(0, 6) == 'chrome') return true;
	return false;
}
function hotkeyChange() {
	chrome.windows.getAll({"populate":true}, function(windows) {
		windows.map(function(window) {
			window.tabs.map(function(tab) {
				if (!checkChrome(tab.url)) chrome.scripting.executeScript({target: {tabId: tab.id}, func: function(enableToggle, hotkey, paranoidhotkey) {
					if (typeof hotkeySet === 'function') hotkeySet(enableToggle, hotkey, paranoidhotkey);
				}, args: [localStorage["enableToggle"], localStorage["hotkey"], localStorage["paranoidhotkey"]]}).catch(() => {});
			});
		});
	});
}
function optionsSaveTrigger(prevglob, newglob) {
	var enable = localStorage["enable"];
	var global = newglob;
	if (prevglob == 'true' && newglob == 'false') {
		global = 'true';
		enable = 'false';
	}
	if (global == 'false') {
		for (var i=cloakedTabs.length-1; i>=0; --i) {
			magician(enable, parseInt(cloakedTabs[i].split("|")[1]));
		}
		if (enable == 'false') cloakedTabs = [];
	} else recursiveCloak(enable, global);
}
function recursiveCloak(enable, global, tabId) {
	if (global == 'true') {
		chrome.windows.getAll({"populate":true}, function(windows) {
			windows.map(function(window) {
				window.tabs.map(function(tab) {
					if (!checkChrome(tab.url)) {
						var enabletemp = enable;
						var dpdomaincheck = domainCheck(extractDomainFromURL(tab.url));
						// Ensure whitelisted or blacklisted tabs stay as they are
						if (enabletemp == 'true' && dpdomaincheck == '0') enabletemp = 'false';
						else if (enabletemp == 'false' && dpdomaincheck == '1') enabletemp = 'true';
						magician(enabletemp, tab.id);
						var dpTabId = tab.windowId+"|"+tab.id;
						var dpcloakindex = cloakedTabs.indexOf(dpTabId);
						var dpuncloakindex = uncloakedTabs.indexOf(dpTabId);
						if (enabletemp == 'false') {
							if (dpuncloakindex == -1) uncloakedTabs.push(dpTabId);
							if (dpcloakindex != -1) cloakedTabs.splice(dpcloakindex, 1);
						} else {
							if (dpcloakindex == -1) cloakedTabs.push(dpTabId);
							if (dpuncloakindex != -1) uncloakedTabs.splice(dpuncloakindex, 1);
						}
					}
				});
			});
		});
	} else {
		if (tabId) magician(enable, tabId);
	}
}
function magician(enable, tabId) {
	// Send simple message to content script to apply or remove cloak
	// The content script will handle getting all settings and applying them correctly
	if (enable == 'true') {
		chrome.tabs.sendMessage(tabId, {action: 'applyCloak'}).catch(() => {
			// Silently ignore errors (e.g., tab closed, restricted page)
		});
	} else {
		chrome.tabs.sendMessage(tabId, {action: 'removeCloak'}).catch(() => {
			// Silently ignore errors
		});
	}
	if (localStorage["showIcon"] == 'true') {
		try {
			if (enable == 'true') chrome.action.setIcon({path: "/img/addressicon/"+dpicon+".png", tabId: tabId});
			else chrome.action.setIcon({path: "/img/addressicon/"+dpicon+"-disabled.png", tabId: tabId});
			chrome.action.setTitle({title: dptitle, tabId: tabId});
		} catch(e) {
			// Silently ignore icon errors
		}
		// Note: chrome.action.show/hide don't exist in MV3
	}
}
function dpHandle(tab) {
	if (checkChrome(tab.url)) return;
	if (localStorage["global"] == "true" && domainCheck(extractDomainFromURL(tab.url)) != 1) {
		if (localStorage["enable"] == "true") {
			recursiveCloak('false', 'true');
			localStorage["enable"] = "false";
		} else {
			recursiveCloak('true', 'true');
			localStorage["enable"] = "true";
		}
	} else {
		var dpTabId = tab.windowId+"|"+tab.id;
		var dpcloakindex = cloakedTabs.indexOf(dpTabId);
		var dpuncloakindex = uncloakedTabs.indexOf(dpTabId);
		localStorage["enable"] = "true";
		if (dpcloakindex != -1) {
			magician('false', tab.id);
			if (dpuncloakindex == -1) uncloakedTabs.push(dpTabId);
			cloakedTabs.splice(dpcloakindex, 1);
		} else {
			magician('true', tab.id);
			cloakedTabs.push(dpTabId);
			if (dpuncloakindex != -1) uncloakedTabs.splice(dpuncloakindex, 1);
		}
	}
}
function setDPIcon() {
	dpicon = localStorage["iconType"];
	dptitle = localStorage["iconTitle"];
	chrome.windows.getAll({"populate":true}, function(windows) {
		windows.map(function(window) {
			window.tabs.map(function(tab) {
			try {
				if (cloakedTabs.indexOf(tab.windowId+"|"+tab.id) != -1) chrome.action.setIcon({path: "/img/addressicon/"+dpicon+".png", tabId: tab.id});
				else chrome.action.setIcon({path: "/img/addressicon/"+dpicon+"-disabled.png", tabId: tab.id});
				chrome.action.setTitle({title: dptitle, tabId: tab.id});
			} catch(e) {
				// Silently ignore icon errors
			}
			// Note: chrome.action.show/hide don't exist in MV3
			});
		});
	});
}
function initLists() {
	// Initialize lists if they don't exist or are undefined
	if (!localStorage['blackList'] || localStorage['blackList'] === 'undefined') {
		localStorage['blackList'] = JSON.stringify([]);
	}
	if (!localStorage['whiteList'] || localStorage['whiteList'] === 'undefined') {
		localStorage['whiteList'] = JSON.stringify([]);
	}
	
	try {
		blackList = JSON.parse(localStorage['blackList']).sort();
		whiteList = JSON.parse(localStorage['whiteList']).sort();
	} catch(e) {
		console.error('[BG] Error parsing lists, resetting:', e);
		localStorage['blackList'] = JSON.stringify([]);
		localStorage['whiteList'] = JSON.stringify([]);
		blackList = [];
		whiteList = [];
	}
}
// ----- Request library to support content script communication
chrome.tabs.onUpdated.addListener(function(tabid, changeinfo, tab) {
	if (changeinfo.status == "loading") {
		var dpTabId = tab.windowId+"|"+tabid;
		var dpcloakindex = cloakedTabs.indexOf(dpTabId);
		var enable = enabled(tab, dpcloakindex);
		if (localStorage["showIcon"] == "true") {
			try {
				if (enable == "true") chrome.action.setIcon({path: "/img/addressicon/"+dpicon+".png", tabId: tabid});
				else chrome.action.setIcon({path: "/img/addressicon/"+dpicon+"-disabled.png", tabId: tabid});
				chrome.action.setTitle({title: dptitle, tabId: tabid});
			} catch(e) {
				// Silently ignore icon errors
			}
			// Note: chrome.action.show/hide don't exist in MV3
		}
		if (checkChrome(tab.url)) return;
		var dpuncloakindex = uncloakedTabs.indexOf(dpTabId);
		if (enable == "true") {
			magician('true', tabid);
			if (localStorage["global"] == "false" && localStorage["enable"] == "false") localStorage["enable"] = "true";
			if (dpcloakindex == -1) cloakedTabs.push(dpTabId);
			if (dpuncloakindex != -1) uncloakedTabs.splice(dpuncloakindex, 1);
		} else {
			if (localStorage["enableStickiness"] == "true") {
				if (tab.openerTabId) {
					if (cloakedTabs.indexOf(tab.windowId+"|"+tab.openerTabId) != -1 && dpuncloakindex == -1) {
						if (domainCheck(extractDomainFromURL(tab.url)) != '0') {
							magician('true', tabid);
							cloakedTabs.push(dpTabId);
							return;
						}
					}
					if (dpuncloakindex == -1) uncloakedTabs.push(dpTabId);
					if (dpcloakindex != -1) cloakedTabs.splice(dpcloakindex, 1);
				} else {
					chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
						if (tabs[0].windowId == tab.windowId && cloakedTabs.indexOf(tabs[0].windowId+"|"+tabs[0].id) != -1 && dpuncloakindex == -1) {
							if (domainCheck(extractDomainFromURL(tab.url)) != '0') {
								magician('true', tabid);
								cloakedTabs.push(dpTabId);
								return;
							}
						}
						if (dpuncloakindex == -1) uncloakedTabs.push(dpTabId);
						if (dpcloakindex != -1) cloakedTabs.splice(dpcloakindex, 1);
					});
				}
			}
		}
	}
});	
chrome.tabs.onRemoved.addListener(function(tabid, windowInfo) {
	var dpTabId = windowInfo.windowId+"|"+tabid;
	var dpcloakindex = cloakedTabs.indexOf(dpTabId);
	var dpuncloakindex = uncloakedTabs.indexOf(dpTabId);
	if (dpcloakindex != -1) cloakedTabs.splice(dpcloakindex, 1);
	if (dpuncloakindex != -1) uncloakedTabs.splice(dpuncloakindex, 1);
});
var requestDispatchTable = {
	"get-enabled": function(request, sender, sendResponse) {
		var dpTabId = sender.tab.windowId+"|"+sender.tab.id;
		var dpcloakindex = cloakedTabs.indexOf(dpTabId);
		var enable = enabled(sender.tab, dpcloakindex);
		if (enable == 'true' && dpcloakindex == -1) cloakedTabs.push(dpTabId);
		sendResponse({enable: enable, background: localStorage["s_bg"], favicon: localStorage["disableFavicons"], hidePageTitles: localStorage["hidePageTitles"], pageTitleText: localStorage["pageTitleText"], enableToggle: localStorage["enableToggle"], hotkey: localStorage["hotkey"], paranoidhotkey: localStorage["paranoidhotkey"]});
	},
	"toggle": function(request, sender, sendResponse) {
		if (localStorage["savedsfwmode"] != "") {
			localStorage["sfwmode"] = localStorage["savedsfwmode"];
			localStorage["savedsfwmode"] = "";
			if (localStorage["global"] == "true") recursiveCloak('true', 'true');
			else {
				magician('true', sender.tab.id);
				var dpTabId = sender.tab.windowId+"|"+sender.tab.id;
				var dpuncloakindex = uncloakedTabs.indexOf(dpTabId);
				if (dpuncloakindex != -1) uncloakedTabs.splice(dpuncloakindex, 1);
				if (cloakedTabs.indexOf(dpTabId) == -1) cloakedTabs.push(dpTabId);
			}
			localStorage["enable"] = "true";
		} else {
			dpHandle(sender.tab);
		}
	},
	"toggleparanoid": function(request, sender, sendResponse) {
		if (localStorage["savedsfwmode"] == "") {
			localStorage["savedsfwmode"] = localStorage["sfwmode"];
			localStorage["sfwmode"] = "Paranoid";
			if (localStorage["global"] == "true") recursiveCloak('true', 'true');
			else {
				magician('true', sender.tab.id);
				var dpTabId = sender.tab.windowId+"|"+sender.tab.id;
				var dpuncloakindex = uncloakedTabs.indexOf(dpTabId);
				if (dpuncloakindex != -1) uncloakedTabs.splice(dpuncloakindex, 1);
				if (cloakedTabs.indexOf(dpTabId) == -1) cloakedTabs.push(dpTabId);
			}
			localStorage["enable"] = "true";
		} else {
			localStorage["sfwmode"] = localStorage["savedsfwmode"];
			localStorage["savedsfwmode"] = "";
			dpHandle(sender.tab);
		}
	},
	"get-settings": function(request, sender, sendResponse) {
		var enable, fontface;
		if (localStorage["font"] == '-Custom-') {
			if (localStorage["customfont"]) fontface = localStorage["customfont"];
			else fontface = 'Arial';
		} else fontface = localStorage["font"];
		if (localStorage["global"] == "false") enable = 'true';
		else enable = enabled(sender.tab);
		sendResponse({enable: enable, sfwmode: localStorage["sfwmode"], font: fontface, fontsize: localStorage["fontsize"], underline: localStorage["showUnderline"], background: localStorage["s_bg"], text: localStorage["s_text"], table: localStorage["s_table"], link: localStorage["s_link"], bold: localStorage["removeBold"], opacity1: localStorage["opacity1"], opacity2: localStorage["opacity2"], collapseimage: localStorage["collapseimage"], maxheight: localStorage["maxheight"], maxwidth: localStorage["maxwidth"], customcss: localStorage["customcss"], favicon: localStorage["disableFavicons"]});
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
		var success = domainHandler(request.domain, request.type);
		sendResponse({success: success});
	},
	"initLists": function(request, sender, sendResponse) {
		initLists();
		sendResponse({success: true});
	},
	"ping": function(request, sender, sendResponse) {
		sendResponse({pong: true});
	}
}
// ===== REGISTER MESSAGE LISTENER FIRST (CRITICAL) =====
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
	// Handle both old reqtype format and new action format
	var action = request.reqtype || request.action;
	if (action in requestDispatchTable) {
		requestDispatchTable[action](request, sender, sendResponse);
	} else {
		sendResponse({});
	}
	// Return true to indicate we will send a response asynchronously
	return true;
});

// Register context menu click handler
chrome.contextMenus.onClicked.addListener(handleContextMenuClick);

// ----- If action icon is clicked, either enable or disable the cloak
chrome.action.onClicked.addListener(function(tab) {
	dpHandle(tab);
});

// ===== INITIALIZE EXTENSION (AFTER LISTENERS) =====
var extensionInitialized = false;
async function initializeExtension() {
	if (extensionInitialized) return;
	extensionInitialized = true;
	
	try {
		// Initialize storage first (CRITICAL for MV3 service workers)
		await initializeStorage();
		
		setDefaultOptions();
		initLists();
		setDPIcon();
		initializeContextMenus();
		
		if ((!optionExists("version") || localStorage["version"] != version) && localStorage["showUpdateNotifications"] == 'true') {
			localStorage["version"] = version;
		}
	} catch(e) {
		console.error('Error initializing extension:', e);
		extensionInitialized = false; // Allow retry on error
	}
}

// Service worker initialization
chrome.runtime.onInstalled.addListener(function() {
	initializeExtension();
});

// Execute on startup (if not already initialized by onInstalled)
initializeExtension();

chrome.runtime.onUpdateAvailable.addListener(function (details) {
	// an update is available, but wait until user restarts their browser as to not disrupt their current session and cloaked tabs.
});