'use strict';

const GObject = imports.gi.GObject;
const Gtk = imports.gi.Gtk;
const Lang = imports.lang;
const Gio = imports.gi.Gio;
const Gdk = imports.gi.Gdk;

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


        let prefsButtons = [
            this.getSwitch('horizontal-mode', 'Enable horizontal mode:'),
            this.getSwitch('show-name', 'Show user name:'),
            this.getSwitch('show-system-name', 'Show user system name:'),
            this.getSpinButton('system-name-position', 'System name position:'),
            this.getSwitch('name-style-dark', 'User name dark style:'),
            this.getSwitch('avatar-shadow', 'Add shadow to avatar:'),
            this.getSwitch('avatar-shadow-user-name', 'Add shadow to user name:'),
            this.getSwitch('show-buttons', 'Add system buttons:'),
            this.getSpinButton('buttons-position', 'Buttons position:'),
            this.getSpinButton('buttons-icon-size', 'Buttons icon size:'),
            this.getSwitch('show-media-center', 'Add media center:'),
            this.getSpinButton(
                'set-custom-panel-menu-width',
                'Set custom panel menu width\n\n(set to 0 to use Your default value, needs restart gnome shell ALT+F2 -> r):', 0, 2000
            ),
            this.getSwitch('custom-buttons-background', 'Use custom buttons background color:'),
            this.getColorPicker('buttons-background', 'Buttons background color:'),
        ];

        let i = 1;


        for (const prefsButtonsKey in prefsButtons) {
            this.attach(prefsButtons[prefsButtonsKey].gtkLabel, 0, i, 1, 1);
            this.attach(prefsButtons[prefsButtonsKey].toggle, 1, i, 1, 1);
            i++;
        }
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

        let func = function (w) {
            this.settings.set_boolean($key, !value);
            value = !value;
        };

        toggle.connect('state-set', func.bind(this));

        return { toggle, gtkLabel };
    },
    getSpinButton: function ($key, $text, $rangeFrom = 1, $rangeTo = 400) {
        let toggle = new Gtk.SpinButton({ halign: Gtk.Align.END });
        toggle.set_sensitive(true);
        toggle.set_range($rangeFrom, $rangeTo);
        toggle.set_value(this.settings.get_int($key));
        toggle.set_increments(1, 2);

        let settings = this.settings;

        let func = function (w) {
            settings.set_int($key, w.get_value_as_int());
        };

        toggle.connect('value-changed', func.bind(this));
        //Creates labels;
        let gtkLabel = new Gtk.Label({
            label: $text,
            hexpand: true,
            halign: Gtk.Align.START
        });
        return { toggle, gtkLabel };
    },
    getColorPicker: function ($key, $text) {
        let toggle = new Gtk.ColorButton();

        let settings = this.settings;

        let func = function (w) {
            settings.set_string($key, w.get_rgba().to_string());
        };

        const settingSignalHandler = () => {
            const rgba = new Gdk.RGBA();
            rgba.parse(settings.get_string($key));
            toggle.rgba = rgba;
        };

        settings.connect('changed::' + $key, settingSignalHandler);

        // Initialize the button with the state in the settings.
        settingSignalHandler();

        toggle.connect('color-set', func.bind(this));
        //Creates labels;
        let gtkLabel = new Gtk.Label({
            label: $text,
            hexpand: true,
            halign: Gtk.Align.START
        });
        return { toggle, gtkLabel };
    }

});

function buildPrefsWidget() {
    let widget = new AvatarSettings();

    return widget;
}
