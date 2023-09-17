var is_wp_tab = {};
var tab_theme_cache = {};

function toolbar_icon(is_w) {
	chrome.browserAction.setIcon({
		path: 'icons/icon' + (is_w ? '' : '-none') + '.png'
	});
}

function delete_cache(tab_id) {
	if (tab_id == 'all') {
		delete is_wp_tab, tab_theme_cache;

		is_wp_tab = {};
		tab_theme_cache = {};
	}

	if (tab_id != '') {
		if (tab_id in tab_theme_cache) {
			delete tab_theme_cache[tab_id];
		}

		if (tab_id in is_wp_tab) {
			delete is_wp_tab[tab_id];
		}
	}
}

chrome.tabs.onUpdated.addListener(function (tab_id, changeInfo, tab) {
	if (changeInfo.status == 'complete') {
		if (tab_id in is_wp_tab) {

		} else {
			detect_wp(tab);
		}
	}

	if (changeInfo.status == 'loading') {
		delete_cache(tab_id);
	}
});

chrome.tabs.onActivated.addListener(function (activeInfo) {
	chrome.tabs.get(activeInfo.tabId, function (tab) {
		detect_wp(tab);
	});
});

chrome.tabs.onRemoved.addListener(function (tab_id, removed) {
	delete_cache(tab_id);
});

chrome.windows.onRemoved.addListener(function (windowId) {
	delete_cache('all');
});

(function () {

	chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
		switch (msg.action) {
			case 'is_wp':

				is_wp_tab[sender.tab.id] = true;

				toolbar_icon(true);

				return true;
				break;
			case 'is_nowp':

				is_wp_tab[sender.tab.id] = false;

				toolbar_icon(false);

				return true;
				break;
			case 'get_url':

				var url = msg.tab_url;
				var tab_id = msg.tab_id;
				var has_wp = 0;

				if (url != '') {
					var current_theme = '';

					if (tab_id in is_wp_tab) {
						if (is_wp_tab[tab_id] == true) {
							has_wp = 1;

							if (msg.tab_id in tab_theme_cache) {
								current_theme = tab_theme_cache[msg.tab_id];
							}
						} else {
							has_wp = 2;
						}
					}

					sendResponse({current_url: url, current_theme: current_theme, has_wp: has_wp});
				}

				return true;
				break;
			case 'save':

				if (msg.content != '') {
					tab_theme_cache[msg.tab_id] = msg.content;
				}

				return true;
				break;
			default:
				break;
		}
	});

})();

function detect_wp(tab) {
	toolbar_icon(false);

	if (!tab || !tab.id || !tab.url) {
		return "no1";
	}

	var has_wp = 0;
	var tab_id = tab.id;

	if (tab.url.startsWith("chrome://") || tab.url.startsWith("chrome-error://") || tab.url.startsWith("https://chrome.google.com")) {
		is_wp_tab[tab_id] = false;
		return "";
	}

	if (tab_id in is_wp_tab) {
		if (is_wp_tab[tab_id] == true) {
			has_wp = 1;
			toolbar_icon(true);
		} else {
			has_wp = 2;
			toolbar_icon(false);
		}
	}

	if (has_wp == 0) {
		chrome.tabs.executeScript(tab.id, {file: "js/content.js"}, function () {
		});
	}
}
