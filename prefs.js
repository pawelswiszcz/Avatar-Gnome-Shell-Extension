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
        this.settings = ExtensionUtils.getSettings(
            'org.gnome.shell.extensions.avatar');


        //Give grid's characteristics
        this.parent(params);
        this.set_row_spacing(8);
        this.margin_start = 72;
        this.margin_end = 72;
        this.margin = 72;
        this.margin_top = 32;
        this.margin_bottom = 32;

        this.addSwitch('horizontal-mode', 'Enable horizontal mode:');         
    },

    addSwitch: function ($key, $text) {
        //Create temp vars
        let labeLabel = null;
        let toggle = null;

        //Get values from gschema for horizontalmode and usedefaultvalues
        let value = this.settings.get_boolean($key);

        //Create horizontal mode and default values toggleable switches
        toggle = new Gtk.Switch({ halign: Gtk.Align.END });

        //Set it's state to gschemas' default
        toggle.set_state(value);

        //Creates labels;
        labeLabel = new Gtk.Label({
            label: $text,
            hexpand: true,
            halign: Gtk.Align.START
        });

        /*Connects the change of state of the switch with the change of
        gschemas' value*/
        toggle.connect('state-set', Lang.bind(this, function (w) {
            this.settings.set_boolean($key, !value);
            value = !value;
        }));


        //Adds all widgets to the window
        this.attach(labeLabel, 0, 1, 1, 1);
        this.attach(toggle, 1, 1, 1, 1);
    },

});

function buildPrefsWidget() {
    let widget = new AvatarSettings();

    return widget;
}
