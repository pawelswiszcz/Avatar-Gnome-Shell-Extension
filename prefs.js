'use strict';

const GObject = imports.gi.GObject;
const Gtk = imports.gi.Gtk;
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
        const topImagePage = this.getTopImagePage();

        stack.add_titled(generalPage, 'general', 'General Options');
        stack.add_titled(avatarPage, 'avatar', 'Avatar');
        stack.add_titled(mprisPage, 'mpris', 'Media center');
        stack.add_titled(buttonsPage, 'system-buttons', 'System buttons');
        stack.add_titled(topImagePage, 'top-image', 'Top Image');

        this.append(new Gtk.StackSidebar({stack: stack}));
        this.append(stack);


        this.connect('realize', (widget) => {
            const window = this.isGTK4() ? widget.get_root() : widget.get_toplevel();

            // Show the version number in the title bar.
            window.set_title(`Avatar ${Me.metadata.version}`);

        });
    },

    createBox: function () {
        const box = new Gtk.Box();
        return box;
    },

    createGrid: function () {
        const grid = new Gtk.Grid();
        //Give grid's characteristics
        grid.set_row_spacing(10);
        return grid;
    },

    getGeneralPage: function () {

        const page = this.createBox();
        const grid = this.createGrid();

        let prefsButtons = [
            this.getSwitch('horizontal-mode', 'Enable horizontal mode:'),
            this.getSwitch('show-avatar-on-top', 'Show avatar box on the top'),
            this.getSpinButton(
                'set-custom-panel-menu-width', 'Set custom panel menu width:',
                0, 2000, 'set to 0 to use Your default value, needs restart gnome shell ALT+F2 -> r'
            ),
            this.getSpinButton(
                'order-avatar', 'Set Order for Avatar:',
                0, 100, 'default 0'
            ),
            this.getSpinButton(
                'order-mpris', 'Set Order for Media center:',
                0, 100, 'default 1'
            ),
            this.getSpinButton(
                'order-top-image', 'Set Order for Top image:',
                0, 100, 'default 2'
            )
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
            this.getSpinButton('avatar-icon-size', 'Avatar size:', 0, 400, 'default 0'),
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
            this.getSwitch('dnd-use-icon', 'DND button use icon:'),
            this.getEntry('dnd-icon-name', 'DND icon name:', 'Default: notifications-symbolic'),
            this.getEntry('dnd-icon-name-disabled', 'DND disabled icon name:', 'Default: notifications-disabled-symbolic'),
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

    getTopImagePage: function () {
        const page = this.createBox();
        const grid = this.createGrid();

        let prefsButtons = [
            this.getSwitch('show-top-image', 'Add Top image:'),
            this.getSpinButton('top-image-size-width', 'Top image width size:', 1, 1000),
            this.getSpinButton('top-image-size-height', 'Top image height size:', 1, 1000),
            this.getFileChooserButton('top-image', 'Image:')
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
        toggle = new Gtk.Switch({halign: Gtk.Align.END});

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

        return {toggle, gtkLabel};
    },
    getSpinButton: function ($key, $text, $rangeFrom = 1, $rangeTo = 400, $description = null) {
        let toggle = new Gtk.SpinButton({halign: Gtk.Align.END});
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

        return {toggle, gtkLabel};
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

        return {toggle, gtkLabel};
    },

    getFileChooserButton: function ($key, $text, $description = null) {
        //Create temp vars
        let gtkLabel = null;
        let toggle = null;


        //Create horizontal mode and default values toggleable switches
        toggle = new Gtk.Button({halign: Gtk.Align.END});
        toggle.set_label("Browse");

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

        let settings = this.settings;

        let fileEntry = new Gtk.Entry({hexpand: true, margin_start: 20});

        fileEntry.set_text(settings.get_string($key));
        fileEntry.connect('changed', (entry) => {
            settings.set_string($key, entry.get_text());
        });

        gtkLabel.append(fileEntry)

        let showFileChooserDialog = function () {

            let fileChooser = new Gtk.FileChooserDialog({title: $text});
            fileChooser.set_default_response(1);

            let filter = new Gtk.FileFilter();
            filter.add_pixbuf_formats();
            fileChooser.filter = filter;

            fileChooser.add_button("Open", Gtk.ResponseType.ACCEPT);

            fileChooser.connect("response", (dialog, response) => {

                if (response == Gtk.ResponseType.ACCEPT) {

                    let file = dialog.get_file().get_path();
                    if (file.length > 0) {
                        fileEntry.set_text(file);
                    }

                    fileChooser.destroy();
                }
            });

            fileChooser.show();
        };

        toggle.connect('clicked', showFileChooserDialog.bind(this));

        return {toggle, gtkLabel};
    },
    getEntry: function ($key, $text, $description = null) {
        //Create temp vars
        let gtkLabel = null;

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

        let settings = this.settings;

        let toggle = new Gtk.Entry({hexpand: true, margin_start: 20});

        toggle.set_text(settings.get_string($key));
        toggle.connect('changed', (entry) => {
            settings.set_string($key, entry.get_text());
        });


        return {toggle, gtkLabel};
    },


    isGTK4: function () {
        return Gtk.get_major_version() == 4;
    }
});

function buildPrefsWidget() {
    let widget = new AvatarSettings();

    return widget;
}
