(function () {
	var theme_detector = document.createElement('script');
	theme_detector.setAttribute('src', 'https://cdn.themesinfo.com/detector.js');

	if (document.documentElement.outerHTML.match(/<(img|link|script) [^>]+wp-content/i)) {
		chrome.runtime.sendMessage({action: 'is_wp'});
	} else {
		chrome.runtime.sendMessage({action: 'is_nowp'});
	}

	if (document.head.appendChild(theme_detector)) {
		if (typeof extension_check_wp !== 'undefined') {
			var status = extension_check_wp().toString();

			if (typeof status == 'is_wp') {
				chrome.runtime.sendMessage({action: 'is_wp'});
			}
		}
	}
}());
