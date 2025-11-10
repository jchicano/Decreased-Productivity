// (c) Andrew
// Icon by dunedhel: http://dunedhel.deviantart.com/
// Supporting functions by AdThwart - T. Joseph
var origtitle;
var postloaddelay;
var dphotkeylistener;
var timestamp = Math.round(new Date().getTime()/1000.0);
// Normalize user input to a hostname (lowercase, no port, no path)
function extractHostnameFromInput(input) {
	try {
		if (!input) return '';
		var raw = String(input).trim();
		if (!raw) return '';
		var lower = raw.toLowerCase();
		// Intento estándar con URL si parece una URL
		if (/^[a-z]+:\/\//.test(lower) || /^\/\//.test(lower)) {
			var withProto = lower.startsWith('//') ? ('http:' + lower) : lower;
			var u = new URL(withProto);
			return u.hostname || '';
		}
		// Quitar esquema si el usuario puso algo no estándar
		lower = lower.replace(/^[a-z]+:\/\//, '');
		// Quitar credenciales si existen
		var atIndex = lower.indexOf('@');
		if (atIndex !== -1) lower = lower.slice(atIndex + 1);
		// Cortar por primera '/'
		var slashIndex = lower.indexOf('/');
		if (slashIndex !== -1) lower = lower.slice(0, slashIndex);
		// Si es IPv6 en corchetes, conservar tal cual (sin puerto)
		if (/^\[[0-9a-f:.]+\]/i.test(lower)) {
			var end = lower.indexOf(']');
			return end !== -1 ? lower.slice(0, end + 1) : '';
		}
		// Quitar puerto en dominios/IPv4
		var colonIndex = lower.indexOf(':');
		if (colonIndex !== -1) lower = lower.slice(0, colonIndex);
		return lower;
	} catch(e) {
		return '';
	}
}

// Remove the initial stealth style if present to restore visibility
function removeInitialStealth() {
	try {
		var node = document.querySelector("style[__decreased__='initialstealth"+timestamp+"']");
		if (node && node.parentNode) node.parentNode.removeChild(node);
	} catch(e) {}
}

// Post-load adjustments after cloak injection; ensure page becomes visible
function dpPostLoad(maxheight, maxwidth, sfwmode, removeBold) {
	removeInitialStealth();
	// Optionally enforce max dimensions if configured
	if (maxwidth && parseInt(maxwidth, 10) > 0) {
		try { jQuery('img, video, canvas').css('max-width', parseInt(maxwidth,10)+"px"); } catch(e) {}
	}
	if (maxheight && parseInt(maxheight, 10) > 0) {
		try { jQuery('img, video, canvas').css('max-height', parseInt(maxheight,10)+"px"); } catch(e) {}
	}
    // Enforce anchor color via inline style to beat site !important rules
    try {
        var cfgLink = localStorage && localStorage['s_link'];
        if (cfgLink && typeof cfgLink === 'string') {
            var clr = cfgLink.trim();
            if (clr && !/^#/.test(clr)) clr = '#' + clr;
            document.querySelectorAll('a').forEach(function(a){
                try { a.style.setProperty('color', clr, 'important'); } catch(_e) {}
            });
        }
    } catch(_e) {}
    // Extra hardening for Paranoid: hide nodes with CSS-driven backgrounds and masks
    try {
        if (sfwmode === 'Paranoid') {
            var candidates = document.querySelectorAll('a, div, span, i, header, section, figure, li, button, h1, h2, h3, h4, h5, h6');
            candidates.forEach(function(el){
                try {
                    var cs = window.getComputedStyle(el);
                    // Any non-none background-image is considered visual media (covers CSS vars)
                    var hasBgImg = cs && cs.backgroundImage && cs.backgroundImage !== 'none';
                    var hasMaskImg = cs && ((cs.webkitMaskImage && cs.webkitMaskImage !== 'none') || (cs.maskImage && cs.maskImage !== 'none'));
                    // Consider CSS shorthand with url(...) or var(...)
                    var hasBgShorthandUrl = cs && cs.background && (cs.background.indexOf('url(') !== -1 || cs.background.indexOf('var(') !== -1);
                    var beforeBg = window.getComputedStyle(el, '::before');
                    var afterBg = window.getComputedStyle(el, '::after');
                    var pseudoHasImg = (beforeBg && beforeBg.backgroundImage && beforeBg.backgroundImage.indexOf('url(') !== -1) ||
                                       (afterBg && afterBg.backgroundImage && afterBg.backgroundImage.indexOf('url(') !== -1);
					// Heuristic for CSS-var icons that don't resolve in computed styles: inline style contains var(…) and element is small/empty/icon-like
					var inlineStyle = (el.getAttribute && el.getAttribute('style')) || '';
					var inlineHasVarBg = /background(-image)?\s*:\s*var\(/i.test(inlineStyle);
					var isSmall = (el.clientWidth <= 48 && el.clientHeight <= 48);
					var emptyish = (!el.textContent || el.textContent.trim() === '') && el.children.length === 0;
					var className = (el.className || '').toString().toLowerCase();
					var looksLikeIcon = /\b(icon|image|img|arrow|upload|button)\b/.test(className);

                    if (hasBgImg || hasMaskImg || hasBgShorthandUrl || pseudoHasImg) {
                        el.style.setProperty('display', 'none', 'important');
                        el.style.setProperty('visibility', 'hidden', 'important');
                        el.style.setProperty('opacity', '0', 'important');
                    } else if (inlineHasVarBg && (isSmall || emptyish || looksLikeIcon)) {
                        el.style.setProperty('display', 'none', 'important');
                        el.style.setProperty('visibility', 'hidden', 'important');
                        el.style.setProperty('opacity', '0', 'important');
                    }
                } catch(_e) {}
            });
        }
    } catch(_e) {}
}
function addCloak(sfw, f, fsize, u, bg, text, table, link, bold, o1, o2, collapseimage, customcss) {
	// Inject CSS into page
	var cssinject = document.createElement("style");
	cssinject.setAttribute("__decreased__", "productivity"+timestamp);
	
	var curlocation = document.location.href;
	var boldcss = '';
	var fontType = '';
	
	if (f != 'Serif' && f != 'Monospace' && f != '-Unchanged-') f = '"' + f + '", sans-serif';
	if (f != '-Unchanged-') {
		// Respect removeBold option when styling headings
		var headingWeight = (bold === true || bold === 'true') ? 'normal' : 'bold';
		fontType = 'font-size: ' + fsize + 'px !important; font-family: ' + f + ' !important; h1, h2, h3, h4, h5, h6, h7, h8 { font-size: ' + fsize + 'px !important; font-weight: ' + headingWeight + ' !important; } ';
	}
	
	// Handle both boolean and string values
	if (bold === true || bold === 'true') {
		boldcss = 'font-weight: normal !important; ';
	}
	
	// The code that does the magic
    var magic = 'html, html *, html *[style], body *:before, body *:after { background-color: #' + bg + ' !important; border-color: #' + table + ' !important; border-collapse: collapse !important; color: #' + text + ' !important; stroke: #' + text + ' !important; fill: #' + bg + ' !important; ' + fontType + 'text-decoration: none !important; -webkit-filter: initial !important; box-shadow: none !important; -webkit-box-shadow: none !important; text-shadow: none !important; ' + boldcss + '} ';
    // Enforce link colors across states with high specificity
    magic += ' html body a, html body a:link, html body a:visited, html body a:hover, html body a:active { color: #' + link + ' !important; } ';
	if (curlocation.match(/^https?:\/\/www\.facebook\.com\//i)) {
		magic += 'html, html *:not(.img), body *:not(.img):before, body *:not(.img):after { background-image: none !important; } ';
		magic += '*:after { content: initial !important; }  ';
		if (sfw == 'SFW' || sfw == 'SFW1' || sfw == 'SFW2') magic += 'i.img { opacity: '+o1+' !important; } i.img:hover { opacity: '+o2+' !important; } ';
		else if (o1 == 0 && collapseimage == 'true') magic += 'i.img { display: none !important; } ';
		else if (sfw == 'Paranoid') magic += 'i.img { visibility: hidden !important; opacity: 0 !important; } ';
	} else {
		// Handle both boolean and string values
		if (u === true || u === 'true') {
			magic += 'underline !important; }';
		} else {
			magic += 'none !important; }';
		}
		
		// Convert o1 to number for comparison
		var o1Num = parseFloat(o1);
		
		if (sfw == 'SFW' || sfw == 'SFW1' || sfw == 'SFW2') {
			if (o1Num == 0 && collapseimage == 'true') {
				magic += ' iframe, img, canvas, input[type=image], path, polygon, picture { display: none !important; }';
			} else {
				magic += ' iframe, img, canvas, input[type=image], path, polygon, picture { opacity: '+o1+' !important; } iframe:hover, img:hover, input[type=image]:hover, path:hover, polygon:hover { opacity: '+o2+' !important; }';
			}
		}
		if (sfw == 'SFW') {
			if (o1Num == 0 && collapseimage == 'true') {
				magic += ' object, embed, param, video, audio { display: none !important; }';
			} else {
				magic += ' object, embed, param, video, audio { opacity: '+o1+' !important; } object:hover, embed:hover, param:hover, video:hover, audio:hover { opacity: '+o2+' !important; }';
			}
		}
		if (sfw == 'SFW1') {
			magic += ' object, embed, param, video, audio { display: none !important; opacity: 0 !important; }';
		}
		if (sfw == 'Paranoid') {
			// Hide all visual media and backgrounds in paranoid mode
			magic += ' html, html * { background: none !important; background-image: none !important; -webkit-mask-image: none !important; mask-image: none !important; } *:before, *:after { content: none !important; }';
			// Hide common visual elements including SVG
			magic += ' img, image, svg, svg image, use, symbol, pattern, defs, canvas, input[type=image], path, polygon, object, embed, param, video, audio, picture, source { display: none !important; opacity: 0 !important; }';
			// Hide common logo patterns and empty anchors/spans used as CSS logos
			magic += ' [class*="logo" i], [id*="logo" i] { display: none !important; } a:empty, span:empty { display: none !important; }';
			magic += ' iframe { opacity: 0.05 !important; } iframe:hover { opacity: 0.5 !important; }';
		}
	}
	
	if (customcss) magic += ' ' + customcss;
	cssinject.innerHTML = magic;
	document.documentElement.appendChild(cssinject, null);
	
	if (bold == 'true') {
		jQuery("a:not([__decreased__='link"+timestamp+"'])").addClass('dp'+timestamp+'_link dp'+timestamp+'_unbold').attr('__decreased__', 'link'+timestamp);
		jQuery("body *:not([__decreased__])").addClass('dp'+timestamp+'_text dp'+timestamp+'_unbold').attr('__decreased__', 'element'+timestamp);
	} else {
		jQuery("a:not([__decreased__='link"+timestamp+"'])").addClass('dp'+timestamp+'_link').attr('__decreased__', 'link'+timestamp);
		jQuery("body *:not([__decreased__])").addClass('dp'+timestamp+'_text').attr('__decreased__', 'element'+timestamp);
	}
}
function loadCheckbox(id) {
	// Load from chrome.storage.local first (for MV3), fallback to localStorage
	chrome.storage.local.get([id], function(result) {
		var value;
		if (result[id] !== undefined) {
			value = result[id];
			localStorage[id] = value; // Sync to localStorage
		} else {
			value = localStorage[id];
		}
		
		document.getElementById(id).checked = value == 'true' || value === true;
	});
}

function loadElement(id, defaultValue) {
	// Load from chrome.storage.local first (for MV3), fallback to localStorage
	chrome.storage.local.get([id], function(result) {
		if (result[id] !== undefined && result[id] !== 'undefined') {
			$("#"+id).val(result[id]);
			localStorage[id] = result[id]; // Sync to localStorage
		} else if (typeof localStorage[id] !== 'undefined' && localStorage[id] !== 'undefined') {
			$("#"+id).val(localStorage[id]);
		} else if (defaultValue !== undefined) {
			$("#"+id).val(defaultValue);
			localStorage[id] = defaultValue;
			chrome.storage.local.set({[id]: defaultValue});
		}
	});
}

function saveCheckbox(id) {
	var value = document.getElementById(id).checked;
	localStorage[id] = value;
	// Also save to chrome.storage.local for MV3 service worker
	chrome.storage.local.set({[id]: value});
}

function saveElement(id) {
	var value = $("#"+id).val();
	localStorage[id] = value;
	// Also save to chrome.storage.local for MV3 service worker
	chrome.storage.local.set({[id]: value});
}
function closeOptions() {
	window.open('', '_self', '');window.close();
}
function settingsall() {
	selectAll('settingsexport');
}
function selectAll(id) {
	$("#"+id).select();
}
function i18load() {
	$("#title").html("Decreased Productivity v"+version);
	$(".i18_default").html(chrome.i18n.getMessage("default"));
	$(".i18_enable").html(chrome.i18n.getMessage("enable"));
	$(".i18_enabled").html(chrome.i18n.getMessage("enabled"));
	$(".i18_disabled").html(chrome.i18n.getMessage("disabled"));
	$(".i18_globalmode").html(chrome.i18n.getMessage("globalmode"));
	$(".i18_globalmode2").html(chrome.i18n.getMessage("globalmode2"));
	$(".i18_globalmode3").html(chrome.i18n.getMessage("globalmode3"));
	$(".i18_cloak").html(chrome.i18n.getMessage("cloak"));
	$(".i18_uncloak").html(chrome.i18n.getMessage("uncloak"));
	$(".i18_level").html(chrome.i18n.getMessage("level"));
	$(".i18_paranoid").html(chrome.i18n.getMessage("paranoid"));
	$(".i18_sfw0").html(chrome.i18n.getMessage("sfw0"));
	$(".i18_sfw1").html(chrome.i18n.getMessage("sfw1"));
	$(".i18_sfw2").html(chrome.i18n.getMessage("sfw2"));
	$(".i18_nsfw").html(chrome.i18n.getMessage("nsfw"));
	$(".i18_toggle").html(chrome.i18n.getMessage("toggle"));
	$(".i18_toggle2").html(chrome.i18n.getMessage("toggle2"));
	$(".i18_toggle_hotkey").html(chrome.i18n.getMessage("hotkey"));
	$(".i18_toggle_paranoidhotkey").html(chrome.i18n.getMessage("paranoidhotkey"));
	$(".i18_hotkey_record").val(chrome.i18n.getMessage("hotkey_record"));
	$(".i18_opacity").html(chrome.i18n.getMessage("opacity"));
	$(".i18_collapseimage").html(chrome.i18n.getMessage("collapseimage"));
	$(".i18_opacity2").html(chrome.i18n.getMessage("opacity2"));
	$(".i18_unhovered").html(chrome.i18n.getMessage("unhovered"));
	$(".i18_hovered").html(chrome.i18n.getMessage("hovered"));
	$(".i18_stickiness").html(chrome.i18n.getMessage("stickiness"));
	$(".i18_stickiness2").html(chrome.i18n.getMessage("stickiness2"));
	$(".i18_favicons").html(chrome.i18n.getMessage("favicons"));
	$(".i18_hidetitles").html(chrome.i18n.getMessage("hidetitles"));
	$(".i18_showimages").html(chrome.i18n.getMessage("showimages"));
	$(".i18_showimages2").html(chrome.i18n.getMessage("showimages2"));
	$(".i18_showunderline").html(chrome.i18n.getMessage("showunderline"));
	$(".i18_removebold").html(chrome.i18n.getMessage("removebold"));
	$(".i18_showcontext").html(chrome.i18n.getMessage("showcontext"));
	$(".i18_showcontext2").html(chrome.i18n.getMessage("showcontext2"));
	$(".i18_showicon").html(chrome.i18n.getMessage("showicon"));
	$(".i18_showicon2").html(chrome.i18n.getMessage("showicon2"));
	$(".i18_showicon_type").html(chrome.i18n.getMessage("showicon_type"));
	$(".i18_showicon_type2").html(chrome.i18n.getMessage("showicon_type2"));
	$(".i18_showicon_title").html(chrome.i18n.getMessage("showicon_title"));
	$(".i18_showupdate").html(chrome.i18n.getMessage("showupdate"));
	$(".i18_showupdate2").html(chrome.i18n.getMessage("showupdate2"));
	$(".i18_font").html(chrome.i18n.getMessage("font"));
	$(".i18_customfont").html(chrome.i18n.getMessage("customfont"));
	$(".i18_fontsize").html(chrome.i18n.getMessage("fontsize"));
	$(".i18_color").html(chrome.i18n.getMessage("color"));
	$(".i18_colorpresets").html(chrome.i18n.getMessage("colorpresets"));
	$(".i18_colorpresetselect").html('-- '+chrome.i18n.getMessage("colorpresetselect")+' --');
	$(".i18_colorbackground").html(chrome.i18n.getMessage("colorbackground"));
	$(".i18_colortext").html(chrome.i18n.getMessage("colortext"));
	$(".i18_colorlink").html(chrome.i18n.getMessage("colorlink"));
	$(".i18_colortable").html(chrome.i18n.getMessage("colortable"));
	$(".i18_c1").html(chrome.i18n.getMessage("white")+' - '+chrome.i18n.getMessage("blue"));
	$(".i18_c2").html(chrome.i18n.getMessage("white")+' - '+chrome.i18n.getMessage("gray"));
	$(".i18_c3").html(chrome.i18n.getMessage("gray")+' - '+chrome.i18n.getMessage("blue"));
	$(".i18_c4").html(chrome.i18n.getMessage("lightred")+' - '+chrome.i18n.getMessage("paleblue"));
	$(".i18_c5").html(chrome.i18n.getMessage("darkbrown")+' - '+chrome.i18n.getMessage("offwhite"));
	$(".i18_c6").html(chrome.i18n.getMessage("black")+' - '+chrome.i18n.getMessage("blue"));
	$(".i18_c7").html(chrome.i18n.getMessage("black")+' - '+chrome.i18n.getMessage("green"));
	$(".i18_c8").html(chrome.i18n.getMessage("black")+' - '+chrome.i18n.getMessage("red"));
	$(".i18_c9").html(chrome.i18n.getMessage("black")+' - '+chrome.i18n.getMessage("pink"));
	$(".i18_c10").html(chrome.i18n.getMessage("white")+' - '+chrome.i18n.getMessage("green"));
	$(".i18_demo").html(chrome.i18n.getMessage("demo"));
	$(".i18_test1").html(chrome.i18n.getMessage("test1"));
	$(".i18_test2").html(chrome.i18n.getMessage("test2"));
	$(".i18_savecolours").val(chrome.i18n.getMessage("savecolours"));
	$(".i18_revertcolours").val(chrome.i18n.getMessage("revertcolours"));
	$(".i18_domain").html(chrome.i18n.getMessage("domain"));
	$(".i18_addwhitelist").val("+ "+chrome.i18n.getMessage("whitelist"));
	$(".i18_addblacklist").val("+ "+chrome.i18n.getMessage("blacklist"));
	$(".i18_whitelist").html(chrome.i18n.getMessage("whitelist"));
	$(".i18_blacklist").html(chrome.i18n.getMessage("blacklist"));
	$(".i18_clear").html(chrome.i18n.getMessage("clear"));
	$(".i18_save").val(chrome.i18n.getMessage("save"));
	$(".i18_close").val(chrome.i18n.getMessage("close"));
	$(".i18_people").html(chrome.i18n.getMessage("people"));
	$(".i18_translators").html(chrome.i18n.getMessage("translators"));
	$(".i18_help").html(chrome.i18n.getMessage("help"));
	$(".i18_support").html(chrome.i18n.getMessage("support"));
	$("#customcssdesc").html(chrome.i18n.getMessage("customcss"));
	$(".i18_supportimg").attr({alt: chrome.i18n.getMessage("support"), title:  chrome.i18n.getMessage("support")});
}
function loadOptions() {
	document.title = chrome.i18n.getMessage("dpoptions");
	i18load();
	oldglobalstate = localStorage["global"];
	loadCheckbox("enable");
	loadCheckbox("global");
	loadCheckbox("enableToggle");
	loadElement("hotkey");
	loadElement("paranoidhotkey");
	if ($("#hotkey").val()) $("#hotkey").val($("#hotkey").val().toUpperCase());
	if ($("#paranoidhotkey").val()) $("#paranoidhotkey").val($("#paranoidhotkey").val().toUpperCase());
	loadElement("newPages");
	loadElement("sfwmode");
	loadElement("opacity1");
	loadElement("opacity2");
	loadCheckbox("collapseimage");
	loadCheckbox("showIcon");
	loadElement("iconType");
	loadElement("iconTitle");
	loadCheckbox("disableFavicons");
	loadCheckbox("hidePageTitles");
	loadElement("pageTitleText");
	loadElement("maxwidth");
	loadElement("maxheight");
	loadCheckbox("enableStickiness");
	loadCheckbox("showContext");
	loadCheckbox("showUnderline");
	loadCheckbox("removeBold");
	loadCheckbox("showUpdateNotifications");
	loadElement("font");
	loadElement("customfont");
	loadElement("fontsize");
	loadElement("s_text", "000000");
	loadElement("s_bg", "FFFFFF");
	loadElement("s_table", "cccccc");
	loadElement("s_link", "000099");
	if ($('#global').is(':checked')) $("#newPagesRow").css('display', 'none');
	if ($('#showIcon').is(':checked')) $(".discreeticonrow").show();
	if ($('#enableToggle').is(':checked')) $("#hotkeyrow, #paranoidhotkeyrow").show();
    (function(){
        var type = $('#iconType').val();
        // Handle null, undefined, or empty string
        if (!type || type === 'null' || type === 'undefined') {
            type = 'coffee';
            $('#iconType').val(type);
            try { localStorage['iconType'] = type; } catch(e) {}
        }
        $("#sampleicon").attr('src', '../img/addressicon/'+ type +'.png');
    })();
	if (!$('#hidePageTitles').is(':checked')) $("#pageTitle").css('display', 'none');
	if ($('#opacity1').val() == 0) $("#collapseimageblock").css('display', 'block');
	if ($('#sfwmode').val() == 'SFW' || $('#sfwmode').val() == 'SFW1' || $('#sfwmode').val() == 'SFW2') $("#opacityrow").show();
	if ($('#font').val() == '-Custom-') {
		if ($("#customfont").val()) $("#customfontrow").show();
		else {
			$('#font').val('Arial');
			$("#customfontrow").hide();
		}
	}
	loadElement("customcss");
	listUpdate();
	opacitytest();
	
	// Wait for all async loads to complete before updating demo
	setTimeout(function() {
		updateDemo();
	}, 100);
}
function isValidColor(hex) {
	// Check if hex is defined and not empty
	if (!hex || hex === 'undefined' || hex === 'null') {
		return false;
	}
	var strPattern = /^[0-9a-f]{3,6}$/i; 
	return strPattern.test(hex); 
}

function saveOptions() {
	updateDemo();
	if (!$('#enable').is(':checked') && !$('#global').is(':checked')) {
		$('#enable').prop('checked', true);
	}
	if ($('#global').is(':checked')) $("#newPagesRow").css('display', 'none');
	else $("#newPagesRow").css('display', 'block');
	if ($('#enableToggle').is(':checked')) $("#hotkeyrow, #paranoidhotkeyrow").show();
	else $("#hotkeyrow, #paranoidhotkeyrow").hide();
	if ($('#hidePageTitles').is(':checked')) $("#pageTitle").css('display', 'block');
	else $("#pageTitle").css('display', 'none');
	if ($('#sfwmode').val() == 'SFW' || $('#sfwmode').val() == 'SFW1' || $('#sfwmode').val() == 'SFW2') $("#opacityrow").fadeIn("fast");
	else $("#opacityrow").hide();
	if ($('#font').val() == '-Custom-') $("#customfontrow").show();
	else $("#customfontrow").hide();
	if (!$("#hotkey").val()) $("#hotkey").val('CTRL F12');
	if (!$("#paranoidhotkey").val()) $("#paranoidhotkey").val('ALT P');
	saveCheckbox("enable");
	saveCheckbox("global");
	saveCheckbox("enableToggle");
	saveElement("hotkey");
	saveElement("paranoidhotkey");
	saveElement("opacity1");
	saveElement("opacity2");
	saveCheckbox("collapseimage");
	saveElement("newPages");
	saveElement("sfwmode");
	saveCheckbox("showIcon");
	saveElement("iconType");
	saveElement("iconTitle");
	saveCheckbox("disableFavicons");
	saveCheckbox("hidePageTitles");
	saveElement("pageTitleText");
	saveElement("maxwidth");
	saveElement("maxheight");
	saveCheckbox("enableStickiness");
	saveCheckbox("showContext");
	saveCheckbox("showUnderline");
	saveCheckbox("removeBold");
	saveCheckbox("showUpdateNotifications");
	saveElement("font");
	saveElement("customfont");
	saveElement("fontsize");
	if ($('#showIcon').is(':checked')) {
		$(".discreeticonrow").show();
		chrome.runtime.sendMessage({action: "setDPIcon"});
	} else $(".discreeticonrow").hide();
	// Ensure color values are initialized with defaults if missing
	if (!$('#s_text').val() || !isValidColor($('#s_text').val())) $('#s_text').val('000000');
	if (!$('#s_bg').val() || !isValidColor($('#s_bg').val())) $('#s_bg').val('FFFFFF');
	if (!$('#s_table').val() || !isValidColor($('#s_table').val())) $('#s_table').val('cccccc');
	if (!$('#s_link').val() || !isValidColor($('#s_link').val())) $('#s_link').val('000099');
	
	// Now validate and save
	if (isValidColor($('#s_text').val()) && isValidColor($('#s_bg').val()) && isValidColor($('#s_table').val()) && isValidColor($('#s_link').val())) {
		saveElement("s_text");
		saveElement("s_bg");
		saveElement("s_table");
		saveElement("s_link");
	} else {
		error = true;
	}
	$("#customcss").val($("#customcss").val().replace(/\s*<([^>]+)>\s*/ig, ""));
	saveElement("customcss");
	updateExport();
	
	// Wait a bit for chrome.storage.local to sync, then notify background
	setTimeout(function() {
		// Apply new settings
		chrome.runtime.sendMessage({action: "optionsSaveTrigger", prevglob: oldglobalstate, newglob: localStorage["global"]});
		chrome.runtime.sendMessage({action: "hotkeyChange"});
		oldglobalstate = localStorage["global"];
	}, 200);
	
	// Remove any existing styling
	if (!error) notification(chrome.i18n.getMessage("saved"));
	else notification(chrome.i18n.getMessage("invalidcolour"));
}

function opacitytest() {
	$("#o1").slider("option", "value", $("#opacity1").val());
	$("#o2").slider("option", "value", $("#opacity2").val());
	$(".sampleimage").css({"opacity": $("#opacity1").val()});
	$(".sampleimage").hover(
		function () {
			$(this).css("opacity", $("#opacity2").val());
		}, 
		function () {
			$(this).css("opacity", $("#opacity1").val());
		}
	);
}	

function intValidate(elm, val) {
	if (!is_int(elm.value)) {
		notification(chrome.i18n.getMessage("invalidnumber"));
		elm.value = val;
	}
	else saveOptions();
}

function is_int(value){ 
	if(value != '' && !isNaN(value)) return true;
	else return false;
}	

function pageTitleValidation() {
	if ($.trim($("#pageTitleText").val()) == '') $("#pageTitleText").val('Google Chrome');
	else saveOptions();
}

function fontsizeValidation() {
	if (!is_int($.trim($("#fontsize").val()))) $("#fontsize").val('12');
	updateDemo();
}

function notification(msg) {
	$('#message').html(msg).stop().fadeIn("slow").delay(2000).fadeOut("slow")
}
function truncText(str) {
	if (str.length > 16) return str.substr(0, 16)+'...';
	return str;
}
function updateDemo() {
	// Favicon visibility
	if ($('#disableFavicons').is(':checked')) $("#demo_favicon").attr('style','visibility: hidden');
	else $("#demo_favicon").removeAttr('style');
	
	// Page title
	if ($('#hidePageTitles').is(':checked')) $("#demo_title").text(truncText($("#pageTitleText").val()));	
	else $("#demo_title").text(chrome.i18n.getMessage("demo")+' Page');
	
	// Colors - ensure # prefix for hex colors
	var bgColor = $("#s_bg").val();
	if (bgColor && !bgColor.startsWith('#')) bgColor = '#' + bgColor;
	$("#demo_content").css('backgroundColor', bgColor);
	
	var linkColor = $("#s_link").val();
	if (linkColor && !linkColor.startsWith('#')) linkColor = '#' + linkColor;
	$("#t_link").css('color', linkColor);
	
	var tableColor = $("#s_table").val();
	if (tableColor && !tableColor.startsWith('#')) tableColor = '#' + tableColor;
	$("#test table").css('border', "1px solid " + tableColor);
	
	var textColor = $("#s_text").val();
	if (textColor && !textColor.startsWith('#')) textColor = '#' + textColor;
	$("#t_table, #demo_content h1").css('color', textColor);
	
	// Font
	if ($("#font").val() == '-Custom-' && $("#customfont").val()) {
		$("#t_table, #demo_content h1").css({'font-family': $("#customfont").val(), 'font-size': $("#fontsize").val() + 'px'});
	} else if ($("#font").val() != '-Unchanged-' && $("#font").val() != '-Custom-') {
		$("#t_table, #demo_content h1").css({'font-family': $("#font").val(), 'font-size': $("#fontsize").val() + 'px'});
	} else {	
		$("#t_table, #demo_content h1").css({'font-family': 'Arial, sans-serif', 'font-size': '12px'});
	}
	
	// Bold removal
	if ($('#removeBold').is(':checked')) {
		$("#demo_content h1").css('font-weight', 'normal');
	} else {
		$("#demo_content h1").css('font-weight', 'bold');
	}
	
	// Link underline
	if ($('#showUnderline').is(':checked')) {
		$("#t_link").css('textDecoration', 'underline');
	} else {
		$("#t_link").css('textDecoration', 'none');
	}
	
	// Image opacity based on SFW mode
	if ($("#sfwmode").val() == 'Paranoid') $(".sampleimage").attr('style','visibility: hidden');
	else if ($("#sfwmode").val() == 'NSFW') $(".sampleimage").attr('style','visibility: visible; opacity: 1 !important;').unbind();
	else opacitytest();
}

function stylePreset(s) {
	if (s) {
		var bg='FFFFFF';
		var text='000000';
		var link='000099';
		var table='cccccc';
		// Specific style colours
		switch (s)
		{
			case 'White - Gray':
				text='AAAAAA';
				link='AAAAAA';
				table='AAAAAA';
				break;
			case 'White - Green':
				link='008000';
				break;
			case 'Gray - Blue':
				bg='EEEEEE';
				break;
			case 'Light Red - Pale Blue':
				bg='FFEEE3';
				text='555';
				link='7F75AA';
				break;
			case 'Black - Blue':
				bg='000000';
				text='FFFFFF';
				link='36F';
				table='333333';
				break;
			case 'Dark Brown - Off-White':
				bg='2c2c2c';
				text='e5e9a8';
				link='5cb0cc';
				table='7f7f7f';
				break;
			case 'Black - Green':
				bg='000000';
				text='FFFFFF';
				link='00FF00';
				table='333333';
				break;
			case 'Black - Red':
				bg='000000';
				text='FFFFFF';
				link='FF0000';
				table='333333';
				break;
			case 'Black - Pink':
				bg='000000';
				text='FFFFFF';
				link='FF1CAE';
				table='333333';
				break;
		}
		$('#s_bg').val(bg);
		$('#s_text').val(text);
		$('#s_link').val(link);
		$('#s_table').val(table);
		updateDemo();
	}
}

// <!-- modified from KB SSL Enforcer: https://code.google.com/p/kbsslenforcer/
function addList(type) {
	var domain = $('#url').val();
	var normalized = extractHostnameFromInput(domain);
	if (!normalized) {
		$('#listMsg').html(chrome.i18n.getMessage("invaliddomain")).stop().fadeIn("slow").delay(2000).fadeOut("slow");
		return false;
	}
	// Si cambia tras normalizar, reflejarlo en el input y usarlo
	if (normalized !== String(domain).trim().toLowerCase()) {
		$('#url').val(normalized);
	}
	domain = normalized;
	
	// Check if domain is empty
	if (!domain || domain.trim() === '') {
		$('#listMsg').html(chrome.i18n.getMessage("invaliddomain")).stop().fadeIn("slow").delay(2000).fadeOut("slow");
		return false;
	}
	
	// Validate domain format
	if (!domain.match(/^(?:[\-\w\*\?]+(\.[\-\w\*\?]+)*|((25[0-5]|2[0-4][0-9]|1[0-9]{2}|[0-9]{1,2})\.){3}(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[0-9]{1,2})|\[[A-Fa-f0-9:.]+\])$/)) {
		$('#listMsg').html(chrome.i18n.getMessage("invaliddomain")).stop().fadeIn("slow").delay(2000).fadeOut("slow");
		return false;
	}
	
	// Send message to background to add domain
	chrome.runtime.sendMessage({action: "domainHandler", domain: domain, type: type}, function(response) {
		if (chrome.runtime.lastError) {
			$('#listMsg').html('Error: ' + chrome.runtime.lastError.message).stop().fadeIn("slow").delay(3000).fadeOut("slow");
			return;
		}
		
		// Check if response indicates success
		if (!response || !response.success) {
			$('#listMsg').html('Error adding domain').stop().fadeIn("slow").delay(3000).fadeOut("slow");
			return;
		}
		
		// Wait for background to update localStorage before refreshing list
		$('#url').val('');
		$('#listMsg').html([chrome.i18n.getMessage("whitelisted"),chrome.i18n.getMessage("blacklisted")][type]+' '+domain+'.').stop().fadeIn("slow").delay(2000).fadeOut("slow");
		// Small delay to ensure localStorage is synced
		setTimeout(function() {
			listUpdate();
		}, 100);
		$('#url').focus();
	});
	
	return false;
}
function domainRemover(domain) {
	chrome.runtime.sendMessage({action: "domainHandler", domain: domain, type: 2}, function(response) {
		if (chrome.runtime.lastError) return;
		// Wait for background to update localStorage before refreshing list
		setTimeout(function() {
			listUpdate();
		}, 100);
	});
	return false;
}
function listUpdate() {
	// In MV3, we need to read from chrome.storage.local instead of localStorage
	// because the background service worker uses chrome.storage.local
	chrome.storage.local.get(['whiteList', 'blackList'], function(result) {
		var whiteList = [];
		var blackList = [];
		
		try {
			whiteList = result.whiteList ? JSON.parse(result.whiteList) : [];
			blackList = result.blackList ? JSON.parse(result.blackList) : [];
		} catch(e) {
			console.error('Error parsing lists:', e);
		}
		
		displayLists(whiteList, blackList);
	});
}

function displayLists(whiteList, blackList) {
	
	var whitelistCompiled = '';
	if(whiteList.length==0) whitelistCompiled = '['+chrome.i18n.getMessage("empty")+']';
	else {
		whiteList.sort();
		for(i in whiteList) whitelistCompiled += '<div class="listentry">'+whiteList[i]+' <a href="javascript:;" style="color:#f00;float:right;" rel="'+whiteList[i]+'" class="domainRemover">X</a></div>';
	}
	var blacklistCompiled = '';
	if (blackList.length==0) blacklistCompiled = '['+chrome.i18n.getMessage("empty")+']';
	else {
		blackList.sort();
		for(i in blackList) blacklistCompiled += '<div class="listentry">'+blackList[i]+' <a href="javascript:;" style="color:#f00;float:right;" rel="'+blackList[i]+'" class="domainRemover">X</a></div>';
	}
	$('#whitelist').html(whitelistCompiled);
	$('#blacklist').html(blacklistCompiled);
	$(".domainRemover").unbind('click');
	$(".domainRemover").click(function() { domainRemover($(this).attr('rel'));});
	chrome.runtime.sendMessage({action: "initLists"});
	updateExport();
}
function listclear(type) {
	if (confirm([chrome.i18n.getMessage("removefromwhitelist"),chrome.i18n.getMessage("removefromblacklist")][type]+'?')) {
		var key = ['whiteList','blackList'][type];
		// Update both localStorage and chrome.storage for consistency
		localStorage[key] = JSON.stringify([]);
		chrome.storage.local.set({[key]: JSON.stringify([])}, function() {
			chrome.runtime.sendMessage({action: "initLists"});
			listUpdate();
		});
	}
	return false;
}
// from KB SSL Enforcer: https://code.google.com/p/kbsslenforcer/ -->

function revertColours(s) {
	$('#s_bg').val(localStorage['s_bg']);
	$('#s_text').val(localStorage['s_text']);
	$('#s_link').val(localStorage['s_link']);
	$('#s_table').val(localStorage['s_table']);
	updateDemo();
}

function colorPickLoad(id) {
	$('#'+id).ColorPicker({
		onBeforeShow: function () {
			$(this).ColorPickerSetColor(this.value);
		},
		onChange: function (hsb, hex, rgb) {
			$('#'+id).val(hex);
			updateDemo();
		}
	});
}

function downloadtxt() {
	var textToWrite = $("#settingsexport").val();
	var textFileAsBlob = new Blob([textToWrite], {type:'text/plain'});
	var fileNameToSaveAs = "dp-settings-"+new Date().toJSON()+".txt";
	var downloadLink = document.createElement("a");
	downloadLink.download = fileNameToSaveAs;
	downloadLink.innerHTML = "Download File";
	downloadLink.href = window.webkitURL.createObjectURL(textFileAsBlob);
	downloadLink.click();
	downloadLink.remove();
}
function updateExport() {
	$("#settingsexport").val("");
	settingnames = [];
	
	// Read from chrome.storage.local first (MV3), fallback to localStorage
	chrome.storage.local.get(null, function(allStorage) {
		var storageToUse = Object.keys(allStorage).length > 0 ? allStorage : localStorage;
		
		for (var i in storageToUse) {
			if (storageToUse.hasOwnProperty(i)) {
				if (i != "version") {
					settingnames.push(i);
					var value = storageToUse[i];
					if (typeof value !== 'string') value = String(value);
					$("#settingsexport").val($("#settingsexport").val()+i+"|"+value.replace(/(?:\r\n|\r|\n)/g, ' ')+"\n");
				}
			}
		}
		$("#settingsexport").val($("#settingsexport").val().slice(0,-1));
	});
}
function settingsImport() {
	var error = "";
	var settings = $("#settingsimport").val().split("\n");
	if ($.trim($("#settingsimport").val()) == "") {
		notification(chrome.i18n.getMessage("pastesettings"));
		return false;
	}
	
	var storageUpdates = {};
	
	if (settings.length > 0) {
		$.each(settings, function(i, v) {
			if ($.trim(v) != "") {
				var settingentry = $.trim(v).split("|");
				if (settingnames.indexOf($.trim(settingentry[0])) != -1) {
					var key = $.trim(settingentry[0]);
					var value = $.trim(settingentry[1]);
					
					if (key == 'whiteList' || key == 'blackList') {
						var listarray = value.replace(/(\[|\]|")/g,"").split(",");
						if (listarray.toString() != '') {
							var jsonValue = JSON.stringify(listarray);
							localStorage[key] = jsonValue;
							storageUpdates[key] = jsonValue;
						}
					} else {
						localStorage[key] = value;
						storageUpdates[key] = value;
					}
				} else {
					error += $.trim(settingentry[0])+", ";
				}
			}
		});
		
		// Sync all imported settings to chrome.storage.local
		chrome.storage.local.set(storageUpdates, function() {
			loadOptions();
			listUpdate();
			
			// Notify background to reload settings
			chrome.runtime.sendMessage({action: "optionsSaveTrigger", prevglob: localStorage["global"], newglob: localStorage["global"]});
			
			if (!error) {
				notification(chrome.i18n.getMessage("importsuccessoptions"));
				$("#settingsimport").val("");
			} else {
				notification(chrome.i18n.getMessage("importsuccesscond")+error.slice(0, -2));
			}
		});
	}
}
function removeCss(name) {
	if (typeof(name) === 'undefined') jQuery("style[__decreased__='productivity"+timestamp+"']").remove();
	else jQuery("style[__decreased__='"+name+"']").remove();
	if (typeof(name) === 'undefined') {
		faviconrestore();
		titleRestore();
		jQuery('body').unbind('DOMSubtreeModified.decreasedproductivity'+timestamp);
		jQuery("[__decreased__]").each(function() {
			jQuery(this).removeClass('dp'+timestamp+'_visible dp'+timestamp+'_unbold dp'+timestamp+'_link dp'+timestamp+'_text dp'+timestamp+'_hide').removeAttr("__decreased__");
		});
	}
}
function init() {
	// Ask background if this tab should be cloaked (respects blacklist, whitelist, and tab state)
	chrome.runtime.sendMessage({reqtype: "should-cloak-tab"}, function(shouldCloakResponse) {
		if (shouldCloakResponse && shouldCloakResponse.shouldCloak) {
			// Get settings for applying cloak
            chrome.runtime.sendMessage({reqtype: "get-settings"}, function(response) {
                console.log('[DP] Applying cloak to tab:', window.location.href);
                addCloak(response.sfwmode, response.font, response.fontsize, response.underline, response.background, response.text, response.table, response.link, response.bold, response.opacity1, response.opacity2, response.collapseimage, response.customcss);
                try { dpPostLoad(response.maxheight, response.maxwidth, response.sfwmode, response.bold); } catch(e) { try { removeInitialStealth(); } catch(_) {} }
				jQuery('body').unbind('DOMSubtreeModified.decreasedproductivity'+timestamp);
				jQuery('body').bind('DOMSubtreeModified.decreasedproductivity'+timestamp, function() {
					clearTimeout(postloaddelay);
                    postloaddelay = setTimeout(function(){ try { dpPostLoad(response.maxheight, response.maxwidth, response.sfwmode, response.bold) } catch(e) { try { removeInitialStealth(); } catch(_) {} } }, 500);
				});
			});
		} else {
			// Fallback race protection: if background isn't ready yet, rely on get-enabled snapshot
			chrome.runtime.sendMessage({reqtype: "get-enabled"}, function(enabledResponse) {
				if (enabledResponse && (enabledResponse.enable === 'true' || enabledResponse.enable === true)) {
					// Extra fallback: consult domain status and force if blacklist
					chrome.runtime.sendMessage({action: "get-domain-status"}, function(domainResp) {
						var shouldForce = domainResp && domainResp.result === '1';
                    chrome.runtime.sendMessage({reqtype: "get-settings"}, function(response) {
                        console.log('[DP] Applying cloak via fallback'+(shouldForce?' (blacklist)':'' )+':', window.location.href);
                        addCloak(response.sfwmode, response.font, response.fontsize, response.underline, response.background, response.text, response.table, response.link, response.bold, response.opacity1, response.opacity2, response.collapseimage, response.customcss);
                        try { dpPostLoad(response.maxheight, response.maxwidth, response.sfwmode, response.bold); } catch(e) { try { removeInitialStealth(); } catch(_) {} }
                        jQuery('body').unbind('DOMSubtreeModified.decreasedproductivity'+timestamp);
                        jQuery('body').bind('DOMSubtreeModified.decreasedproductivity'+timestamp, function() {
                            clearTimeout(postloaddelay);
                            postloaddelay = setTimeout(function(){ try { dpPostLoad(response.maxheight, response.maxwidth, response.sfwmode, response.bold) } catch(e) { try { removeInitialStealth(); } catch(_) {} } }, 500);
                        });
                    });
					});
				} else {
					console.log('[DP] Not cloaking tab:', window.location.href, shouldCloakResponse);
				}
			});
		}
	});
}
// Favicon.js - Change favicon dynamically [http://ajaxify.com/run/favicon].
// Copyright (c) 2006 Michael Mahemoff
// Modifications - Andrew Y.
function faviconblank() {
	jQuery(document).ready(function() {
		if (!jQuery("link#decreasedproductivity"+timestamp).length) {
			var link = document.createElement("link");
			link.type = "image/x-icon";
			link.rel = "shortcut icon";
			link.id = "decreasedproductivity"+timestamp;
			link.href = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAAZiS0dEAP8A/wD/oL2nkwAAAAlwSFlzAAALEwAACxMBAJqcGAAAAAd0SU1FB9oFFAADATTAuQQAAAAZdEVYdENvbW1lbnQAQ3JlYXRlZCB3aXRoIEdJTVBXgQ4XAAAAEklEQVQ4y2NgGAWjYBSMAggAAAQQAAGFP6pyAAAAAElFTkSuQmCC'; // transparent png
			faviconclear();
			document.getElementsByTagName("head")[0].appendChild(link);
		}
	});
}
function faviconclear() {
	jQuery("link[rel='shortcut icon'], link[rel='icon']").each(function() {
		jQuery(this).attr('data-rel', jQuery(this).attr('rel')).removeAttr('rel');
	});
}
function faviconrestore() {
	jQuery("link#decreasedproductivity"+timestamp).remove();
	jQuery("link[data-rel='shortcut icon'], link[data-rel='icon']").each(function() {
		jQuery(this).attr('rel', jQuery(this).attr('data-rel')).removeAttr('data-rel');
	});
}
function enforceFaviconBlank() {
    try {
        // Remove or neutralize any site-provided icons
        jQuery("link[rel*='icon'], link[rel='shortcut icon'], link[rel='icon'], link[rel='apple-touch-icon'], link[rel='apple-touch-icon-precomposed'], link[rel='mask-icon']").each(function(){
            try { jQuery(this).attr('data-rel', jQuery(this).attr('rel')).removeAttr('rel'); } catch(_) {}
        });
        // Ensure our blank favicon exists
        faviconblank();
    } catch(e) {}
}
function faviconObserve() {
    try {
        if (window.__dp_faviconObserver) window.__dp_faviconObserver.disconnect();
        var obs = new MutationObserver(function(){ enforceFaviconBlank(); });
        window.__dp_faviconObserver = obs;
        obs.observe(document.querySelector('head') || document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['rel','href'] });
        // Initial enforcement in case icons already present
        enforceFaviconBlank();
    } catch(e) {}
}
// Favicon Blanking Code END
function replaceTitle(text) {
	if (document.title != text) {
		if (document.title && !origtitle) origtitle = document.title;
		document.title=text;
	}
}
function titleBind(text) {
    jQuery('title').unbind('DOMSubtreeModified.decreasedproductivity'+timestamp);
    jQuery('title').bind('DOMSubtreeModified.decreasedproductivity'+timestamp, function() {
        replaceTitle(text);
    });
    // MutationObserver to persist title against SPA updates
    try {
        if (window.__dp_titleObserver) window.__dp_titleObserver.disconnect();
        var observer = new MutationObserver(function(){ replaceTitle(text); });
        window.__dp_titleObserver = observer;
        observer.observe(document.querySelector('head') || document.documentElement, { childList: true, subtree: true });
        // Timed reinforcement in case title changes without DOM mutation (keep alive while active)
        if (window.__dp_titleInterval) clearInterval(window.__dp_titleInterval);
        window.__dp_titleInterval = setInterval(function(){ replaceTitle(text); }, 500);
        // Hook into SPA navigation APIs
        if (!history.__dp_patched) {
            history.__dp_patched = true;
            ['pushState','replaceState'].forEach(function(m){
                var orig = history[m];
                if (typeof orig === 'function') {
                    history[m] = function(){
                        var r = orig.apply(this, arguments);
                        try { replaceTitle(text); } catch(_) {}
                        return r;
                    };
                }
            });
            window.addEventListener('popstate', function(){ try { replaceTitle(text); } catch(_) {} });
        }
    } catch(e) {}
}
function titleRestore() {
	jQuery('title').unbind('DOMSubtreeModified.decreasedproductivity'+timestamp);
	if (origtitle) document.title = origtitle;
}
function hotkeySet(hotkeyenabled, hotkey, paranoidhotkey) {
	if (dphotkeylistener) dphotkeylistener.reset();
	if (hotkeyenabled == 'true' || hotkeyenabled === true) {
		dphotkeylistener = new window.keypress.Listener();
		if (hotkey) {
			dphotkeylistener.simple_combo(hotkey.toLowerCase(), function() {
				chrome.runtime.sendMessage({reqtype: "toggle"});
			});
		}
		if (paranoidhotkey) {
			dphotkeylistener.simple_combo(paranoidhotkey.toLowerCase(), function() {
				chrome.runtime.sendMessage({reqtype: "toggleparanoid"});
			});
		}
		// Native fallback: capture keydown for combos that libraries or browser shortcuts may miss
        try {
            if (window.__dp_hotkeys_handler) window.removeEventListener('keydown', window.__dp_hotkeys_handler, true);
			var normalize = function(s){ return String(s||'').trim().toUpperCase(); };
			var hk = normalize(hotkey);
			var phk = normalize(paranoidhotkey);
            var lastTs = 0;
            var DEBOUNCE_MS = 350;
			var matchCombo = function(evt, combo){
				if (!combo) return false;
				var parts = combo.split(/\s+/);
				var needCtrl = parts.indexOf('CTRL') !== -1;
				var needAlt = parts.indexOf('ALT') !== -1;
				var needShift = parts.indexOf('SHIFT') !== -1;
				var key = parts[parts.length-1];
				var keyOk = false;
				if (/^F\d{1,2}$/.test(key)) keyOk = (evt.key && evt.key.toUpperCase() === key);
				else keyOk = (evt.key && evt.key.toUpperCase() === key);
				return (!!evt.ctrlKey === needCtrl) && (!!evt.altKey === needAlt) && (!!evt.shiftKey === needShift) && keyOk;
			};
			window.__dp_hotkeys_handler = function(e){
				// ignore when typing in inputs
				var t = e.target;
				if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
                var now = Date.now();
                if (now - lastTs < DEBOUNCE_MS) return;
                if (matchCombo(e, hk)) { lastTs = now; e.preventDefault(); e.stopPropagation(); chrome.runtime.sendMessage({reqtype: "toggle"}); return; }
                if (matchCombo(e, phk)) { lastTs = now; e.preventDefault(); e.stopPropagation(); chrome.runtime.sendMessage({reqtype: "toggleparanoid"}); return; }
			};
			window.addEventListener('keydown', window.__dp_hotkeys_handler, true);
		} catch(_e) {}
	}
}
// Listen for messages from background script to apply/remove cloak
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
	if (request.action === 'applyCloak') {
		// Apply cloaking - get settings and force application
		chrome.runtime.sendMessage({reqtype: "get-enabled"}, function(enabledResponse) {
			if (chrome.runtime.lastError) {
				sendResponse({success: false, error: chrome.runtime.lastError.message});
				return;
			}
			
			chrome.runtime.sendMessage({reqtype: "get-settings"}, function(response) {
				if (chrome.runtime.lastError) {
					sendResponse({success: false, error: chrome.runtime.lastError.message});
					return;
				}
				
				// Apply favicon hiding if enabled (handle both boolean and string)
                if (enabledResponse.favicon === true || enabledResponse.favicon === 'true') {
                    faviconblank();
                    faviconObserve();
				} else {
					faviconrestore();
				}
				
				// Apply title replacement if enabled (handle both boolean and string)
                if (enabledResponse.hidePageTitles === true || enabledResponse.hidePageTitles === 'true') {
                    replaceTitle(enabledResponse.pageTitleText);
                    titleBind(enabledResponse.pageTitleText);
				} else {
					titleRestore();
				}
				
				// Apply the cloak styles
				addCloak(response.sfwmode, response.font, response.fontsize, response.underline, response.background, response.text, response.table, response.link, response.bold, response.opacity1, response.opacity2, response.collapseimage, response.customcss);
				dpPostLoad(response.maxheight, response.maxwidth, response.sfwmode, response.bold);
				
				// Bind DOM observer for dynamic content
				jQuery('body').unbind('DOMSubtreeModified.decreasedproductivity'+timestamp);
				jQuery('body').bind('DOMSubtreeModified.decreasedproductivity'+timestamp, function() {
					clearTimeout(postloaddelay);
					postloaddelay = setTimeout(function(){ dpPostLoad(response.maxheight, response.maxwidth, response.sfwmode, response.bold) }, 500);
				});
				
				sendResponse({success: true});
			});
		});
		return true; // Keep channel open for async response
	} else if (request.action === 'removeCloak') {
		// Remove cloaking
		removeCss();
		sendResponse({success: true});
		return true;
	}
	return false;
});

// Initially hide all elements on page (injected code is removed when page is loaded)
chrome.runtime.sendMessage({reqtype: "get-enabled"}, function(response) {
	jQuery(document).ready(function() {
		hotkeySet(response.enableToggle, response.hotkey, response.paranoidhotkey);
	});
	
	// Check if tab should be cloaked (not just global enable)
	chrome.runtime.sendMessage({reqtype: "should-cloak-tab"}, function(shouldCloakResponse) {
		if (shouldCloakResponse && shouldCloakResponse.shouldCloak) {
			console.log('[DP] Applying initial stealth to tab:', window.location.href);
			// Also get favicon and title settings
			chrome.runtime.sendMessage({reqtype: "get-enabled"}, function(enabledResponse) {
				if (enabledResponse.favicon == 'true') faviconblank();
				if (enabledResponse.hidePageTitles == 'true') {
					replaceTitle(enabledResponse.pageTitleText);
					titleBind(enabledResponse.pageTitleText);
				}
			});
			var stealth = document.createElement("style");
			stealth.setAttribute("__decreased__", "initialstealth"+timestamp);
			stealth.innerText += "html, html *, html *[style], body *:before, body *:after { background-color: #" + response.background + " !important; background-image: none !important; background: #" + response.background+ " !important; } html * { visibility: hidden !important; }";
			document.documentElement.appendChild(stealth, null);
			init();
		} else {
			// Fallback race protection: if background isn't ready yet, rely on get-enabled snapshot
            chrome.runtime.sendMessage({reqtype: "get-enabled"}, function(enabledResponse) {
				if (enabledResponse && (enabledResponse.enable === 'true' || enabledResponse.enable === true)) {
					console.log('[DP] Applying initial stealth via fallback:', window.location.href);
					// Also get favicon and title settings
                    if (enabledResponse.favicon == 'true') { faviconblank(); faviconObserve(); }
                    if (enabledResponse.hidePageTitles == 'true') { replaceTitle(enabledResponse.pageTitleText); titleBind(enabledResponse.pageTitleText); }
					var stealth = document.createElement("style");
					stealth.setAttribute("__decreased__", "initialstealth"+timestamp);
					stealth.innerText += "html, html *, html *[style], body *:before, body *:after { background-color: #" + response.background + " !important; background-image: none !important; background: #" + response.background+ " !important; } html * { visibility: hidden !important; }";
					document.documentElement.appendChild(stealth, null);
                    init();
				} else {
					console.log('[DP] Not applying stealth to tab:', window.location.href);
				}
			});
		}
	});
});
