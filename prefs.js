'use strict';

const GObject = imports.gi.GObject;
const Gtk = imports.gi.Gtk;
const Lang = imports.lang;
const Gio = imports.gi.Gio;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();


function init() {
}

const AvatarSettings = new GObject.Class({
    Name: 'AvatarPrefs',
    Extends: Gtk.Grid,
    _init: function (params) {

        // Copy the same GSettings code from `extension.js`
        this.settings = ExtensionUtils.getSettings('org.gnome.shell.extensions.avatar');


        //Give grid's characteristics
        this.parent(params);
        this.set_row_spacing(8);
        this.margin_start = 72;
        this.margin_end = 72;
        this.margin = 72;
        this.margin_top = 32;
        this.margin_bottom = 32;

        let $gtkSwitchHmode = this.getSwitch('horizontal-mode', 'Enable horizontal mode:');

        this.attach($gtkSwitchHmode.gtkLabel, 0, 1, 1, 1);
        this.attach($gtkSwitchHmode.toggle, 1, 1, 1, 1);

        let $gtkSwitchUserName = this.getSwitch('show-name', 'Show user name:');

        this.attach($gtkSwitchUserName.gtkLabel, 0, 2, 1, 1);
        this.attach($gtkSwitchUserName.toggle, 1, 2, 1, 1);

        let $gtkSwitchUserSystemName = this.getSwitch('show-system-name', 'Show user system name:');

        this.attach($gtkSwitchUserSystemName.gtkLabel, 0, 3, 1, 1);
        this.attach($gtkSwitchUserSystemName.toggle, 1, 3, 1, 1);

        let $gtkSwitchShowDarkStyle = this.getSwitch('name-style-dark', 'User name dark style:');

        this.attach($gtkSwitchShowDarkStyle.gtkLabel, 0, 4, 1, 1);
        this.attach($gtkSwitchShowDarkStyle.toggle, 1, 4, 1, 1);

        let $gtkSwitchShowShadowStyle = this.getSwitch('avatar-shadow', 'Add shadow to avatar:');

        this.attach($gtkSwitchShowShadowStyle.gtkLabel, 0, 5, 1, 1);
        this.attach($gtkSwitchShowShadowStyle.toggle, 1, 5, 1, 1);

        let $gtkSwitchShowUserNameShadowStyle = this.getSwitch('avatar-shadow-user-name', 'Add shadow to user name:');

        this.attach($gtkSwitchShowUserNameShadowStyle.gtkLabel, 0, 6, 1, 1);
        this.attach($gtkSwitchShowUserNameShadowStyle.toggle, 1, 6, 1, 1);

        let $gtkSwitchShowSystemButtons = this.getSwitch('show-buttons', 'Add system buttons:');

        this.attach($gtkSwitchShowSystemButtons.gtkLabel, 0, 7, 1, 1);
        this.attach($gtkSwitchShowSystemButtons.toggle, 1, 7, 1, 1);
    },

    getSwitch: function ($key, $text) {
        //Create temp vars
        let gtkLabel = null;
        let toggle = null;

        //Get values from gschema for horizontalmode and usedefaultvalues
        let value = this.settings.get_boolean($key);

        //Create horizontal mode and default values toggleable switches
        toggle = new Gtk.Switch({ halign: Gtk.Align.END });

        //Set it's state to gschemas' default
        toggle.set_state(value);

        //Creates labels;
        gtkLabel = new Gtk.Label({
            label: $text,
            hexpand: true,
            halign: Gtk.Align.START
        });

        /*Connects the change of state of the switch with the change of
        gschemas' value*/

        let func =  function (w) {
            this.settings.set_boolean($key, !value);
            value = !value;
        };

        toggle.connect('state-set', func.bind(this));

        return { toggle, gtkLabel };
    },

});

function buildPrefsWidget() {
    let widget = new AvatarSettings();

    return widget;
}
