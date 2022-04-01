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
    Extends: Gtk.Box,
    _init: function (params) {

        this.parent(params);

        // Copy the same GSettings code from `extension.js`
        this.settings = ExtensionUtils.getSettings('org.gnome.shell.extensions.avatar');


        let stack = new Gtk.Stack({
            transition_type: Gtk.StackTransitionType.SLIDE_UP_DOWN,
        });


        const generalPage = this.getGeneralPage();
        const avatarPage = this.getAvatarPage();
        const mprisPage = this.getMprisPage();
        const buttonsPage = this.getButtonsPage();

        stack.add_titled(generalPage, 'general', 'General Options');
        stack.add_titled(avatarPage, 'avatar', 'Avatar');
        stack.add_titled(mprisPage, 'mpris', 'Media center');
        stack.add_titled(buttonsPage, 'system-buttons', 'System buttons');

        this.append(new Gtk.StackSidebar({ stack: stack }));
        this.append(stack);

        
        this.connect('realize', (widget) => {
            const window = this.isGTK4() ? widget.get_root() : widget.get_toplevel();

            // Show the version number in the title bar.
            window.set_title(`Avatar ${Me.metadata.version}`);

        });
    },

    createBox: function () {
        const box = new Gtk.Box();
        box.margin_start = 60;
        box.margin_end = 60;

        return box;
    },

    createGrid: function () {
        const grid = new Gtk.Grid();
        //Give grid's characteristics
        grid.set_row_spacing(8);
        grid.margin_start = 72;
        grid.margin_end = 72;
        grid.margin = 72;
        grid.margin_top = 32;
        grid.margin_bottom = 32;

        return grid;
    },

    getGeneralPage: function () {

        const page = this.createBox();
        const grid = this.createGrid();

        let prefsButtons = [
            this.getSwitch('horizontal-mode', 'Enable horizontal mode:'),
            this.getSpinButton(
                'set-custom-panel-menu-width', 'Set custom panel menu width:',
                0, 2000, 'set to 0 to use Your default value, needs restart gnome shell ALT+F2 -> r'
            ),
        ];

        let i = 1;

        for (const prefsButtonsKey in prefsButtons) {
            grid.attach(prefsButtons[prefsButtonsKey].gtkLabel, 0, i, 1, 1);
            grid.attach(prefsButtons[prefsButtonsKey].toggle, 1, i, 1, 1);
            i++;
        }

        page.append(grid);

        return page;
    },
    getAvatarPage: function () {

        const page = this.createBox();
        const grid = this.createGrid();

        let prefsButtons = [
            this.getSwitch('show-name', 'Show user name:'),
            this.getSwitch('show-system-name', 'Show user system name:'),
            this.getSpinButton('system-name-position', 'System name position:'),
            this.getSwitch('name-style-dark', 'User name dark style:'),
            this.getSwitch('avatar-shadow', 'Add shadow to avatar:'),
            this.getSwitch('avatar-shadow-user-name', 'Add shadow to user name:'),
        ];

        let i = 1;

        for (const prefsButtonsKey in prefsButtons) {
            grid.attach(prefsButtons[prefsButtonsKey].gtkLabel, 0, i, 1, 1);
            grid.attach(prefsButtons[prefsButtonsKey].toggle, 1, i, 1, 1);
            i++;
        }

        page.append(grid);

        return page;
    },
    getMprisPage: function () {

        const page = this.createBox();
        const grid = this.createGrid();

        let prefsButtons = [
            this.getSwitch('show-media-center', 'Add media center:'),
        ];

        let i = 1;

        for (const prefsButtonsKey in prefsButtons) {
            grid.attach(prefsButtons[prefsButtonsKey].gtkLabel, 0, i, 1, 1);
            grid.attach(prefsButtons[prefsButtonsKey].toggle, 1, i, 1, 1);
            i++;
        }

        page.append(grid);

        return page;
    },

    getButtonsPage: function () {

        const page = this.createBox();
        const grid = this.createGrid();

        let prefsButtons = [
            this.getSwitch('show-buttons', 'Add system buttons:'),
            this.getSpinButton('buttons-position', 'Buttons position:'),
            this.getSpinButton('buttons-icon-size', 'Buttons icon size:'),
            this.getSwitch('custom-buttons-background', 'Use custom buttons background color:'),
            this.getColorPicker('buttons-background', 'Buttons background color:'),
        ];

        let i = 1;

        for (const prefsButtonsKey in prefsButtons) {
            grid.attach(prefsButtons[prefsButtonsKey].gtkLabel, 0, i, 1, 1);
            grid.attach(prefsButtons[prefsButtonsKey].toggle, 1, i, 1, 1);
            i++;
        }

        page.append(grid);

        return page;
    },


    getSwitch: function ($key, $text, $description = null) {
        //Create temp vars
        let gtkLabel = null;
        let toggle = null;

        //Get values from gschema for horizontalmode and usedefaultvalues
        let value = this.settings.get_boolean($key);

        //Create horizontal mode and default values toggleable switches
        toggle = new Gtk.Switch({ halign: Gtk.Align.END });

        //Set it's state to gschemas' default
        toggle.set_state(value);

        gtkLabel = new Gtk.Box();
        gtkLabel.margin_start = 20;
        gtkLabel.margin_end = 20;

        //Creates labels;
        let gtkLabelTmp = new Gtk.Label({
            label: $text,
            hexpand: true,
            halign: Gtk.Align.START
        });

        gtkLabel.append(gtkLabelTmp);

        if ($description) {
            //Creates labels;
            let gtkLabel2 = new Gtk.Label({
                hexpand: false,
                xalign: 0,
                halign: Gtk.Align.START,
                valign: Gtk.Align.CENTER
            });
            gtkLabel2.set_markup('<span foreground="grey" size="x-small">' + $description + '</span>');

            gtkLabel.append(gtkLabel2)
        }

        let func = function (w) {
            this.settings.set_boolean($key, !value);
            value = !value;
        };

        toggle.connect('state-set', func.bind(this));

        return { toggle, gtkLabel };
    },
    getSpinButton: function ($key, $text, $rangeFrom = 1, $rangeTo = 400, $description = null) {
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
        let gtkLabelTmp = new Gtk.Label({
            label: $text,
            hexpand: true,
            halign: Gtk.Align.START
        });

        let gtkLabel = new Gtk.Box();
        gtkLabel.margin_start = 20;
        gtkLabel.margin_end = 20;

        gtkLabel.append(gtkLabelTmp);

        if ($description) {
            //Creates labels;
            let gtkLabel2 = new Gtk.Label({
                hexpand: false,
                xalign: 0,
                halign: Gtk.Align.CENTER,
                valign: Gtk.Align.CENTER
            });
            gtkLabel2.set_markup('<span foreground="grey" size="x-small">' + $description + '</span>');

            gtkLabel.append(gtkLabel2)
        }

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
        let gtkLabelTmp = new Gtk.Label({
            label: $text,
            hexpand: true,
            halign: Gtk.Align.START
        });

        let gtkLabel = new Gtk.Box();
        gtkLabel.margin_start = 20;
        gtkLabel.margin_end = 20;
        gtkLabel.append(gtkLabelTmp);

        return { toggle, gtkLabel };
    },
    isGTK4: function () {
        return Gtk.get_major_version() == 4;
    }
});

function buildPrefsWidget() {
    let widget = new AvatarSettings();

    return widget;
}
