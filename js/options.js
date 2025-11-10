// (c) Andrew
// Icon by dunedhel: http://dunedhel.deviantart.com/
// Supporting functions by AdThwart - T. Joseph
// Version is now available from manifest directly
var version = "0.47.0.1";
// Background page is no longer available in MV3, use messaging instead
var bkg = null;
var error = false;
var oldglobalstate = false;
var settingnames = [];
// Normalize user input to a hostname (lowercase, no port, no path)
function extractHostnameFromInput(input) {
	try {
		if (!input) return '';
		var raw = String(input).trim();
		if (!raw) return '';
		var lower = raw.toLowerCase();
		if (/^[a-z]+:\/\//.test(lower) || /^\/\//.test(lower)) {
			var withProto = lower.startsWith('//') ? ('http:' + lower) : lower;
			var u = new URL(withProto);
			return u.hostname || '';
		}
		lower = lower.replace(/^[a-z]+:\/\//, '');
		var atIndex = lower.indexOf('@');
		if (atIndex !== -1) lower = lower.slice(atIndex + 1);
		var slashIndex = lower.indexOf('/');
		if (slashIndex !== -1) lower = lower.slice(0, slashIndex);
		if (/^\[[0-9a-f:.]+\]/i.test(lower)) {
			var end = lower.indexOf(']');
			return end !== -1 ? lower.slice(0, end + 1) : '';
		}
		var colonIndex = lower.indexOf(':');
		if (colonIndex !== -1) lower = lower.slice(0, colonIndex);
		return lower;
	} catch(e) {
		return '';
	}
}
document.addEventListener('DOMContentLoaded', function () {
	$("#tabs").tabs();
	$("#o1").slider({min: 0, max: 1, step: 0.05, slide: function(event, ui) { $("#opacity1").val(ui.value); opacitytest(); }, stop: function(event, ui) { 
		if (ui.value == 0) $("#collapseimageblock").show();
		else $("#collapseimageblock").hide();
		saveOptions();
	}});
	$("#o2").slider({min: 0, max: 1, step: 0.05, slide: function(event, ui) { $("#opacity2").val(ui.value); opacitytest(); }, stop: function(event, ui) { saveOptions(); }});
	loadOptions();
	colorPickLoad("s_bg");
	colorPickLoad("s_text");
	colorPickLoad("s_link");
	colorPickLoad("s_table");
	$(".i18_save, .i18_savecolours").click(saveOptions);
	$(".i18_revertcolours").click(revertColours);
	$(".i18_addwhitelist").click(function() { addList(0); });
	$(".i18_addblacklist").click(function() { addList(1); });
	$(".i18_dpoptions").click(function() { location.href='options.html'; });
	$(".i18_clear").click(function() {
		if ($(this).parent().find('strong').hasClass('i18_whitelist')) {
			listclear(0);
		} else {
			listclear(1);
		}
	});
	$("#enable, #enableToggle, #enableStickiness, #disableFavicons, #hidePageTitles, #showUnderline, #collapseimage, #removeBold, #showContext, #showIcon, #showUpdateNotifications").change(saveOptions);
	$("#iconTitle, #customcss").blur(saveOptions);
	$("#s_bg, #s_text, #s_link, #s_table").keyup(updateDemo);
	// Update demo when relevant options change
	$("#disableFavicons, #hidePageTitles, #showUnderline, #removeBold, #sfwmode").change(updateDemo);
	$("#pageTitleText, #fontsize").keyup(updateDemo);
	$("#global").change(function() {
		saveOptions();
	});
	$("#opacity1").blur(function() {
		intValidate(this, 0.05);
		if (this.value == 0) $("#collapseimageblock").show();
		else $("#collapseimageblock").hide();
		opacitytest();
	});
	$("#opacity2").blur(function() {
		intValidate(this, 0.5);
		opacitytest();
	});
	$("#maxwidth, #maxheight").blur(function() {
		intValidate(this);
	});
	$("#pageTitleText").blur(pageTitleValidation);
	$("#font").change(function() {
		//if ($(this).val() == '-Unchanged-') $("#fontsize").parent().parent().hide();
		//else $("#fontsize").parent().parent().show();
		updateDemo();
	});
	// Hotkey
	var listener;
	var listener2;
	var keysettings = {
		is_solitary    : true,
		is_unordered    : true,
		is_exclusive    : true,
		prevent_repeat  : true, 
		is_sequence  : false,
		is_counting  : false
	};
	listener = new window.keypress.Listener($("#hotkey"), keysettings);
	listener.register_many(combos);
	listener2 = new window.keypress.Listener($("#paranoidhotkey"), keysettings);
	listener2.register_many(combos);
	$("#hotkeyrecord").click(function() {
		$("#hotkeyrecord").val(chrome.i18n.getMessage("hotkey_set"));
		$("#hotkey").removeAttr('disabled').select().focus();
	});
	$("#paranoidhotkeyrecord").click(function() {
		$("#paranoidhotkeyrecord").val(chrome.i18n.getMessage("hotkey_set"));
		$("#paranoidhotkey").removeAttr('disabled').select().focus();
	});
	//
	$("#iconType").change(function() {
        var val = $(this).val();
        // Handle null, undefined, or empty string
        if (!val || val === 'null' || val === 'undefined') {
            val = 'coffee';
        }
        $("#sampleicon").attr('src', '../img/addressicon/'+ val +'.png');
    });
	$("#fontsize").change(fontsizeValidation);
	$("#newPages, #sfwmode, #font, #iconType").change(saveOptions);
	$("#s_preset").change(function() {
		stylePreset($(this).val());
	});
	$("#settingsall").click(settingsall);
	$("#importsettings").click(settingsImport);
	$("#savetxt").click(downloadtxt);
	$(".i18_close").click(closeOptions);
});
function keyhandle(keypressed) {
	keypressed = keypressed.toUpperCase();
	if ($("#hotkey").attr('disabled')) {
		if (keypressed != $("#hotkey").val()) {
			$("#paranoidhotkey").val(keypressed).attr('disabled', 'true');
			$("#paranoidhotkeyrecord").val(chrome.i18n.getMessage("hotkey_record"));
			saveOptions();
		}
	} else {
		if (keypressed != $("#paranoidhotkey").val()) {
			$("#hotkey").val(keypressed).attr('disabled', 'true');
			$("#hotkeyrecord").val(chrome.i18n.getMessage("hotkey_record"));
			saveOptions();
		}
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