const Main = imports.ui.main;
const Mainloop = imports.mainloop;
const St = imports.gi.St;
const Clutter = imports.gi.Clutter;
const Gio = imports.gi.Gio
const Pango = imports.gi.Pango;
const extension = imports.misc.extensionUtils.getCurrentExtension();
const ExtensionUtils = imports.misc.extensionUtils;
const Format = imports.format;
const Gettext = imports.gettext.domain('applications-overview-tooltip');
const _ = Gettext.gettext;

// options
let LABELSHOWTIME	= 15/100;
let LABELHIDETIME 	= 10/100;
let SLIDETIME		= 15/100;
let HOVERDELAY		= 300;
let HIDEDELAY		= 500;
let TITLE			= true;
let APPDESCRIPTION	= true;
let GROUPAPPCOUNT	= true;
let BORDERS			= false;
let KEYBOARD		= true;

// private variables
let _old_addItem = null;		// used to restore monkey patched function on disable
let _old_searchAddItem = null;	// same but for search results
let _tooltips = null;			// used to disconnect events on disable
let _labelTimeoutId = 0;		// id of timer waiting for start
let _resetHoverTimeoutId = 0;	// id of last (cancellable) timer
let _ttbox = null;				// actor for displaying the tooltip
let _ttlayout = null;
let _ttlabel = null;			// tooltip label
let _ttdetail = null;			// tooltip description label
let _labelShowing = false;		// self explainatory

let _settings;
let _settingsConnectionId;
let _ovhidingConnectionId;

function init() {

	// Translation init
	String.prototype.format = Format.format;
	ExtensionUtils.initTranslations("applications-overview-tooltip");

}


function enable() {

	// Settings access
	_settings = ExtensionUtils.getSettings('org.gnome.shell.extensions.applications-overview-tooltip');
	_applySettings();
	_tooltips = new Array();

	// Enabling tooltips for already loaded icons
	_connectAll(Main.overview._overview._controls._appDisplay);

	// monkeypatching for future app icons
	_old_addItem = imports.ui.iconGrid.IconGrid.prototype.addItem;
	imports.ui.iconGrid.IconGrid.prototype.addItem = function(item, page, index){
		_connect(item);
		// original part of the function I'm overwriting
		_old_addItem.apply(this, arguments);
	};

	// monkeypatching for future app icons in search results
	_old_searchAddItem = imports.ui.search.GridSearchResults.prototype._addItem;
	imports.ui.search.GridSearchResults.prototype._addItem = function(display){
		_connect(display);
		_old_searchAddItem.apply(this, arguments);
	};

	// apply new settings if changed
	_settingsConnectionId = _settings.connect('changed', _applySettings);

	// Hide tooltip if overview is hidden
	_ovhidingConnectionId = Main.overview.connect('hiding', _onLeave);

}


function disable() {

	// Disconnect from events
	if (_ovhidingConnectionId > 0) _settings.disconnect(_ovhidingConnectionId);

	// disconnects settings
	if (_settingsConnectionId > 0) _settings.disconnect(_settingsConnectionId);
	_settings = null;

	// restore the original addItem functions and remove references to them
	imports.ui.iconGrid.IconGrid.prototype.addItem = _old_addItem;
	imports.ui.search.GridSearchResults.prototype._addItem = _old_searchAddItem;
	_old_addItem = null;
	_old_searchAddItem = null;

	// disconnects from all loaded icons
	for (let i = 0; i < _tooltips.length; i++) {
		_tooltips[i].actor.disconnect(_tooltips[i].con_d);
		_tooltips[i].actor.disconnect(_tooltips[i].con_h);
		_tooltips[i].actor.disconnect(_tooltips[i].con_focus_in);
		_tooltips[i].actor.disconnect(_tooltips[i].con_focus_out);
	}
	_tooltips=null;

}


function _applySettings() {

	LABELSHOWTIME = _settings.get_int("labelshowtime")/100 ;
	LABELHIDETIME = _settings.get_int("labelhidetime")/100 ;
	HOVERDELAY = _settings.get_int("hoverdelay") ;
	TITLE = _settings.get_boolean("title") ;
	APPDESCRIPTION = _settings.get_boolean("appdescription") ;
	GROUPAPPCOUNT = _settings.get_boolean("groupappcount") ;
	BORDERS = _settings.get_boolean("borders");
	KEYBOARD = _settings.get_boolean("keyboard");

}


function _connectAll(view) {

	let appIcons = view._orderedItems;
	for (let i in appIcons) {
		let icon = appIcons[i];
		let actor = icon;
		if (actor._delegate.hasOwnProperty('_folder')) {
			_connectAll(icon.view)
		}
		_connect(actor);
	}

}


function _connect(actor) {

	_tooltips.push({
		'actor': actor,
		'con_focus_in': actor.connect('key-focus-in', _onHover),
		'con_focus_out': actor.connect('key-focus-out', _onHover),
		'con_h': actor.connect('notify::hover', _onHover),
		'con_d': actor.connect('destroy', _onDestroy)
	});

}


function _onDestroy(actor){

	// This AppIcon is being destroy, let's forget about it
	// so we don't try to disconnect from it later
	_tooltips = _tooltips.filter( (item) => (item.actor !== actor) );

}


function _onHover(actor){

	// checks if cursor is over the icon
	if (actor.get_hover() || ( KEYBOARD && actor.has_key_focus() )) {
	
		// it is : let's setup a toolip display
		// unless it's already set
		if (_labelTimeoutId == 0) {

			// if the tooltip is already displayed (on another icon)
			// we update it, else we delay it
			if (_labelShowing) {
				_showTooltip(actor);
			} else {
				_labelTimeoutId = Mainloop.timeout_add(HOVERDELAY, function() {
					_showTooltip(actor);
					_labelTimeoutId = 0;
					return false;
				} );
			}

		}

	} else {
	
		// cursor is no more on an icon
		_onLeave();

	}

}


function _onLeave() {

	// unset label display timer if needed
	if (_labelTimeoutId > 0){
		Mainloop.source_remove(_labelTimeoutId);
		_labelTimeoutId = 0;
	}

	if (_labelShowing) {
		_hideTooltip();
		_labelShowing = false;
	}
}


function _showTooltip(actor) {

	let icontext = '';
	let titletext = '';
	let detailtext = '';
	let should_display = false;

	// check if actor is still relevant, it may have been destroyed
	// between hover event and tooltip display (there's a small delay)
	// Skipping this test may lead to segfault
	if (! _tooltips.find( (item) => (item.actor === actor) )) {
		return;
	}

	if (actor._delegate.app){
		//applications overview
		icontext = actor._delegate.app.get_name();

		if (APPDESCRIPTION) {
			let appDescription = actor._delegate.app.get_description();
			if (appDescription){
				detailtext = appDescription;
				should_display = true;
			}
		}

	} else if (actor._delegate.hasOwnProperty('_folder')){
		// folder in the application overview

		icontext = actor._delegate['name'];
		if (GROUPAPPCOUNT) {
			let appCount = actor._delegate.view.getAllItems().length;
			detailtext = Gettext.ngettext( "Group of %d application", "Group of %d applications", appCount ).format(appCount);
			should_display = true;
		}

	} else {
		//app and settings searchs results
		icontext = actor._delegate.metaInfo['name'];

	}

	// Decide wether to show title
	if ( TITLE && icontext ) {
		titletext = icontext;
		should_display = true;
	}

	// If there's something to show ..
	if ( ( titletext || detailtext ) && should_display ) {

		// Create a new tooltip if needed
		if (!_ttbox) {
			let css_class = BORDERS ? 'app-tooltip-borders' : 'app-tooltip';
			_ttbox = new St.Bin({ style_class: css_class });
			_ttlayout = new St.BoxLayout({ vertical: true });
			_ttlabel = new St.Label({ style_class: 'app-tooltip-title', text: titletext });
			_ttdetail = new St.Label({ style_class: 'app-tooltip-detail', text: detailtext });
			_ttlayout.add_child(_ttlabel);
			_ttlayout.add_child(_ttdetail);
			_ttbox.add_actor(_ttlayout);
			
			// we force text wrap on both labels
			_ttlabel.clutter_text.line_wrap = true;
			_ttlabel.clutter_text.line_wrap_mode = Pango.WrapMode.WORD;
			_ttlabel.clutter_text.ellipsize = Pango.EllipsizeMode.NONE;
			_ttdetail.clutter_text.line_wrap = true;
			_ttdetail.clutter_text.line_wrap_mode = Pango.WrapMode.WORD;
			_ttdetail.clutter_text.ellipsize = Pango.EllipsizeMode.NONE;

			Main.uiGroup.add_actor(_ttbox);
		} else {
			_ttlabel.text = titletext;
			_ttdetail.text = detailtext;
		}

		if (!titletext) { _ttlabel.hide() } else { _ttlabel.show() };
		if (!detailtext) { _ttdetail.hide() } else { _ttdetail.show() };

		let [stageX, stageY] = actor.get_transformed_position();
		let [iconWidth, iconHeight] = actor.get_transformed_size();
		let y = stageY + iconHeight + 5;
		let x = stageX - Math.round((_ttbox.get_width() - iconWidth)/2);

		// do not show label move if not in showing mode
		if (_labelShowing) {

			_ttbox.ease({
				x: x,
				y: y,
				opacity: 255,
				duration: SLIDETIME  * 100,
				mode: Clutter.AnimationMode.EASE_OUT_QUAD,
			});

		} else {

			_ttbox.set_position(x, y);
			_ttbox.ease({
				x: x,
				y: y,
				opacity: 255,
				duration: LABELSHOWTIME  * 100,
				mode: Clutter.AnimationMode.EASE_OUT_QUAD,
			});
			_labelShowing = true;

		}

	} else {

		// No tooltip to show : act like we're leaving an icon
		_onLeave();

	}

}


function _hideTooltip() {

	if (_ttbox){
		_ttbox.ease({
			opacity: 0,
			duration: LABELHIDETIME  * 100,
			mode: Clutter.AnimationMode.EASE_OUT_QUAD,
			onComplete: () => {
				_ttlabel = null;
				_ttdetail = null;
				Main.uiGroup.remove_actor(_ttbox);
				_ttbox = null;
			}
		});
	}

}
