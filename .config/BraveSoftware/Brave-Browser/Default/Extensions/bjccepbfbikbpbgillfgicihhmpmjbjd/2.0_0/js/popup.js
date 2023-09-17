function get_domain(tab) {
	if (!tab || !tab.id || !tab.url) {
		return "";
	}
	var domain = tab.url
	return domain;
}

document.addEventListener('DOMContentLoaded', function () {
	let loading = document.getElementById("api");
	let no_wp = document.getElementById("js_no_wp");

	chrome.tabs.getSelected(null, function (tab) {
		var tab_url = get_domain(tab);

		loading.style.display = "block";
		no_wp.style.display = "none";

		chrome.extension.sendMessage({action: "get_url", tab_id: tab.id, tab_url: tab_url}, function (response) {
			if (response.has_wp == 2) {
				no_wp.style.display = "block";
				loading.style.display = "none";
			}

			if (response.has_wp != 2) {
				if (response.current_theme == '') {

					document.getElementById("content").style.display = "none";
					no_wp.style.display = "none";

					fetch('https://api.themesinfo.com/v3/details.json', {
						method: 'post',
						headers: {
							'Accept': 'application/json',
							'Content-Type': 'application/json'
						},
						body: JSON.stringify({url: response.current_url})
					})
						.then(res => res.json())
						.then(res => prepare_json(res))
						.catch(error => {
							loading.style.display = "none";
							document.getElementById("js_unavailable").style.display = "block";
						});

					function prepare_json(res) {
						loading.style.display = "none"; // loading

						if (typeof res.data !== 'undefined' && typeof res.data.theme_count !== 'undefined') {
							let tpl = render(res.data);

							if (res.data.theme_count == 0 && res.data.plugin_count == 0) {
								tpl = '<div id="js_no_wp" class="error_alert" style="display:block">This site does not seem to be using WordPress.</div>';
							}

							document.getElementById("content").innerHTML = tpl;

							chrome.extension.sendMessage({
								action: "save",
								tab_id: tab.id,
								tab_url: tab_url,
								content: tpl
							}, function (response) {
							});

							document.getElementById("js_unavailable").style.display = "none";
							document.getElementById("content").style.display = "block";

							// if remote server has error
							if (document.getElementById("js_screenshot")) {
								document.getElementById("js_screenshot").addEventListener('error', function (event) {
									document.getElementById("js_screenshot").src = "https://themesinfo.com/core/tpl/css/img/wordpress-theme-m.png";
								});
							}

						} else {
							document.getElementById("js_unavailable").style.display = "block";
							document.getElementById("content").style.display = "none";
						}


					}


				} else {

					document.getElementById("api").style.display = "none"; // loading
					document.getElementById("content").innerHTML = response.current_theme;

					// if remote server has error
					if (document.getElementById("js_screenshot")) {
						document.getElementById("js_screenshot").addEventListener('error', function (event) {
							document.getElementById("js_screenshot").src = "https://themesinfo.com/core/tpl/css/img/wordpress-theme-m.png";
						});
					}
				}
			}

			return true;
		});
	});
});


function render(data) {

	let tpl = `

${data.theme_count > 0 ? `
<div class="panel" style="margin: 0 -18px;">

<div class="panel-heading" style="background-color:#2E2D2E;padding: 10px 25px;
    border-bottom: 1px solid transparent;"><h3 class="panel-title" style="font-size:13px;color:white;text-shadow:rgba(0, 0, 0, 0.219608) 0 1px 0;margin:0px;">Detected WordPress Theme${data.theme_count > 1 ? 's' : ''} (${data.theme_count}x)<a href="https://themesinfo.com" target="_blank" style="text-align:right;font-size:12px;float:right;color:#c6c6c6;font-weight: normal">Powered by <b>Themesinfo</b>.com</a></h3>
    
    </div>
` : ``}
    
${data.theme.map((theme, i) => `
<!-- themes -->
<div class="starter-template" style="border-radius: 6px;margin:0 10px;padding:0px 10px 0 10px;">

    <p style="text-align:center;margin-bottom: 6px;"><span
                style="font-size:18px;font-weight:bold">${data.theme_count > 1 ? '#' + (i+1) : ''} ${theme.name}</span></p>

    <div style="float:left;margin-bottom:10px;margin-right:10px;overflow: hidden;
    -webkit-box-shadow: 1px 1px 2px 0px rgba(0,0,0,0.2);
    -moz-box-shadow: 1px 1px 2px 0px rgba(0,0,0,0.2);
    box-shadow: 1px 1px 2px 0px rgba(0,0,0,0.2);">
        <div style="overflow: hidden;
    max-width: 100%;
    text-align: center;
    border: 10px solid #fff;">
            <img src="${theme.screenshot}"
                 alt="${theme.name}"
                 title="${theme.name}"
                 style="width:225px;height:177px" class="img-thumbnail" id="js_screenshot">
        </div>
    </div>
    
    <!-- start table -->
    <div class="table-responsive" style="font-size: 13px;float:left;width:360px">
        <form id="form_theme" method="post" action='https://themesinfo.com' target="_blank">

            <input type="hidden" name="uid_t" value="${theme.theme_code}">
            <input type="hidden" name="link_au" value="${theme.author_code}">

            <table class="table" style="font-size: 13px;color:#666;word-break: break-all;white-space: nowrap;">
                <tr>
                    <td style="width: 30%;border-top: none;padding-top: 1px;"><i class="fa fa-picture-o theme_i"
                                                                                 aria-hidden="true"></i> Theme Name:
                    </td>
                    <td style="border-top: none;padding-top: 1px;">

                        ${theme.name}
                        ${theme.theme_name != '' ? `<a href="${theme.theme_url}" title="${theme.name}" target="blank">show more</a>` : ''}
                    </td>
                </tr>

                <tr>
                    <td style="border-top: none;"><i class="fa fa-user-o theme_i" aria-hidden="true"></i> Author:</td>
                    <td style="border-top: none;">
                        ${theme.author}
                        ${theme.author != '' ? `<a href="${theme.author_url}" title="${theme.author}" target="blank">show more</a>` : ''}
                    </td>
                </tr>

                ${theme.usage_count != 0 ? `
                <tr>
                <td style="border-top: none;"><i class="fa fa-globe theme_i" aria-hidden="true"></i> Theme used on:</td>
                <td style="border-top: none;">
                <b>${theme.usage_count}</b> website${theme.usage_count != 0 ? 's' : ''}  ${theme.theme_name != '' ? `<a href="${theme.theme_url}" title="${theme.name}" target="blank">show more</a>` : ''}
                </td>
                </tr>
                ` : ''}

                <tr>
                    <td style="border-top: none;"><i class="fa fa-folder-o theme_i" aria-hidden="true"></i> Theme&nbsp;Folder:
                    </td>
                    <td style="border-top: none;">
                        ${theme.folder}
                        ${theme.folder != '' ? `<a href="${theme.folder_url}" title="${theme.name}" target="blank">show more</a>` : ''}
                    </td>
                </tr>

                <tr>
                    <td style="border-top: none;"><i class="fa fa-clone theme_i" aria-hidden="true"></i> Version:</td>
                    <td style="border-top: none;">${theme.version}</td>
                </tr>

                <tr>
                    <td style="border-top: none;"><i class="fa fa-desktop theme_i" aria-hidden="true"></i> Theme&nbsp;Homepage:
                    </td>
                    <td style="border-top: none;">
                        <button type="submit" name="link_t" class="link_theme" value="${theme.theme_uri_link}"><span
                                    style="word-break:break-all">${theme.theme_uri}</span></button>
                    </td>
                </tr>

                <tr>
                    <td style="border-top: none;"><i class="fa fa-desktop theme_i" aria-hidden="true"></i> Author
                        Homepage:
                    </td>
                    <td style="border-top: none;">
                        <button type="submit" name="link_t" class="link_theme" value="${theme.author_uri_link}"><span
                                    style="word-break:break-all">${theme.author_uri}</span></button>
                    </td>
                </tr>

            </table>
        </form>
    </div>
    <!--/ end table -->
    
    <div style="clear:both"></div>

    ${theme.description != '' ? `<p style="font-size:13px;margin: 5px;margin-bottom: 15px"><b>Description:</b> ${theme.description}</p>` : ''}

</div>
<!--/ themes -->
`.trim()).join('')}
  
  
   <!-- plugin list -->
   <div class="panel" style="">
       
       
       ${data.plugin_count > 0 ? `
		<div class="panel-heading" style="background-color:#2E2D2E;padding: 10px 25px;border-bottom: 1px solid transparent;margin-bottom: 10px">
					<h3 class="panel-title" style="font-size:13px;color:white;text-shadow:rgba(0, 0, 0, 0.219608) 0 1px 0;margin:0px;">
						Detected WordPress Plugin${data.plugin_count > 1 ? 's' : ''} (${data.plugin_count}x)
					</h3>
				</div>
		` : ``}
       
        
       
       
        <div class="row" style="padding: 0px 10px 0px 10px;">
  
${data.plugin.map((plugin, i) => `
<!-- plugins -->
<div class="col-sm-6 col-md-6" style="margin-top: 10px;padding:0 8px">

    <div style="border: 1px solid #eeeeee;">
        <div class="" style="background-color:white;padding:10px;font-size:13px;">

            <div style="float: left;max-width: 20%;">
                
                ${plugin.plugin_link != '' ? `<a href="${plugin.plugin_link}" title="${plugin.title}" target="blank"><img
                src="${plugin.img}"
                style="float:left;margin-right:15px;width:60px" alt="${plugin.title}"
                title="${plugin.title}"></a>` :
		`<img src="${plugin.img}" style="float:left;margin-right:15px;width:60px" alt="${plugin.title}" title="${plugin.title}">`}

            </div>

            ${plugin.type == 'Free' ? '<span style="font-size:10px;color:green;float:right">Free</span>' : ''}
            ${plugin.type == 'Premium' ? '<span style="font-size:10px;color:red;float:right">Premium</span>' : ''}

            <div style="float: left;max-width: 80%;">

                ${plugin.plugin_link != '' ? `<h3 style="font-size:16px;margin-top: 0px;margin-bottom:2px;">
                <a href="${plugin.plugin_link}" title=" ${plugin.title}" target="blank">${plugin.plugin_name}</a>
                </h3>` :
		`<h3 style="font-size:16px;margin-top: 0px;margin-bottom:2px;">${plugin.plugin_name}</h3>`}

                ${plugin.author != '' ? `<div style="font-size:74%;color:#777;margin-bottom: 4px">by ${plugin.author}</div>` : ``}

                <span style="">${plugin.description != '' ? `${plugin.description}` : `Unknown plugin...`}</span>
            </div>

            <div style="clear:both"></div>
        </div>
    </div>
    <div style="clear:both"></div>
</div>

<div style="clear:both"></div>
<!--/ plugins -->
`.trim()).join('')}
  
  
  
  </div>
        </div>
        
  <!--/ plugin list -->
</div>
  
  <span class="server_ok"></span>
	<center style=";margin-top: 12px"><a href="https://themesinfo.com" target="_blank" style="text-align:center;text-shadow: 0 1px 0 #fff;color: #857f78;font-size:12px;font-weight: normal">Powered by <b>Themesinfo</b>.com</a></center>
	`;

	return tpl;
}
