
'use strict';

import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import Gdk from 'gi://Gdk';

import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class AvatarPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings('org.gnome.shell.extensions.avatar');
        window.set_title(`Avatar ${this.metadata.version}`);

        const page = new Adw.PreferencesPage();
        window.add(page);

        const generalGroup = this.getGeneralGroup(settings);
        page.add(generalGroup);

        const avatarGroup = this.getAvatarGroup(settings);
        page.add(avatarGroup);

        const mprisGroup = this.getMprisGroup(settings);
        page.add(mprisGroup);

        const buttonsGroup = this.getButtonsGroup(settings);
        page.add(buttonsGroup);

        const topImageGroup = this.getTopImageGroup(settings, window);
        page.add(topImageGroup);
    }

    getGeneralGroup(settings) {
        const group = new Adw.PreferencesGroup({
            title: 'General Options'
        });

        group.add(this.getSwitch(settings, 'horizontal-mode', 'Enable horizontal mode'));
        group.add(this.getSwitch(settings, 'detached-mode', 'Detached mode', 'of not working please restart gnome shell ALT+F2 -> r'));
        group.add(this.getSwitch(settings, 'show-avatar-on-top', 'Show avatar box on the top', 'only for detached mode'));
        group.add(this.getSwitch(settings, 'add-outline-class', 'Add outline class', 'use this option for detached mode'));
        group.add(this.getSpinButton(settings, 'set-custom-panel-menu-width', 'Set custom panel menu width', 0, 2000, 'set to 0 to use Your default value, needs restart gnome shell ALT+F2 -> r'));
        group.add(this.getSpinButton(settings, 'order-avatar', 'Set Order for Avatar', 0, 100, 'default 0'));
        group.add(this.getSpinButton(settings, 'order-mpris', 'Set Order for Media center', 0, 100, 'default 1'));
        group.add(this.getSpinButton(settings, 'order-top-image', 'Set Order for Top image', 0, 100, 'default 2'));

        return group;
    }

    getAvatarGroup(settings) {
        const group = new Adw.PreferencesGroup({
            title: 'Avatar'
        });

        group.add(this.getSwitch(settings, 'show-name', 'Show user name'));
        group.add(this.getSwitch(settings, 'show-system-name', 'Show user system name'));
        group.add(this.getSpinButton(settings, 'system-name-position', 'System name position'));
        group.add(this.getSwitch(settings, 'name-style-dark', 'User name dark style'));
        group.add(this.getSwitch(settings, 'avatar-shadow', 'Add shadow to avatar'));
        group.add(this.getSwitch(settings, 'avatar-shadow-user-name', 'Add shadow to user name'));
        group.add(this.getSpinButton(settings, 'avatar-icon-size', 'Avatar size', 0, 400, 'default 0'));

        return group;
    }

    getMprisGroup(settings) {
        const group = new Adw.PreferencesGroup({
            title: 'Media center'
        });

        group.add(this.getSwitch(settings, 'show-media-center', 'Add media center'));

        return group;
    }

    getButtonsGroup(settings) {
        const group = new Adw.PreferencesGroup({
            title: 'System buttons'
        });

        group.add(this.getSwitch(settings, 'show-buttons', 'Add system buttons'));
        group.add(this.getSpinButton(settings, 'buttons-position', 'Buttons position'));
        group.add(this.getSpinButton(settings, 'buttons-icon-size', 'Buttons icon size'));
        group.add(this.getSwitch(settings, 'dnd-use-icon', 'DND button use icon'));
        group.add(this.getEntry(settings, 'dnd-icon-name', 'DND icon name', 'Default: notifications-symbolic'));
        group.add(this.getEntry(settings, 'dnd-icon-name-disabled', 'DND disabled icon name', 'Default: notifications-disabled-symbolic'));
        group.add(this.getSwitch(settings, 'custom-buttons-background', 'Use custom buttons background color'));
        group.add(this.getColorPicker(settings, 'buttons-background', 'Buttons background color'));

        return group;
    }

    getTopImageGroup(settings, window) {
        const group = new Adw.PreferencesGroup({
            title: 'Top Image'
        });

        group.add(this.getSwitch(settings, 'show-top-image', 'Add Top image'));
        group.add(this.getSpinButton(settings, 'top-image-size-width', 'Top image width size', 1, 1000));
        group.add(this.getSpinButton(settings, 'top-image-size-height', 'Top image height size', 1, 1000));
        group.add(this.getFileChooserButton(settings, 'top-image', 'Image', window));

        return group;
    }

    getSwitch(settings, key, title, subtitle = null) {
        const row = new Adw.ActionRow({
            title: title,
            subtitle: subtitle
        });

        const toggle = new Gtk.Switch({
            active: settings.get_boolean(key),
            halign: Gtk.Align.END,
            valign: Gtk.Align.CENTER,
        });

        settings.bind(key, toggle, 'active', 3);

        row.add_suffix(toggle);
        row.activatable_widget = toggle;

        return row;
    }

    getSpinButton(settings, key, title, rangeFrom = 1, rangeTo = 400, subtitle = null) {
        const row = new Adw.ActionRow({
            title: title,
            subtitle: subtitle,
        });

        const spinButton = new Gtk.SpinButton({
            adjustment: new Gtk.Adjustment({
                lower: rangeFrom,
                upper: rangeTo,
                step_increment: 1
            }),
            halign: Gtk.Align.END,
            valign: Gtk.Align.CENTER,
        });

        spinButton.set_value(settings.get_int(key));
        spinButton.connect('value-changed', () => {
            settings.set_int(key, spinButton.get_value_as_int());
        });

        row.add_suffix(spinButton);
        row.activatable_widget = spinButton;

        return row;
    }

    getColorPicker(settings, key, title) {
        const row = new Adw.ActionRow({
            title: title,
        });

        const colorButton = new Gtk.ColorButton({
            halign: Gtk.Align.END,
            valign: Gtk.Align.CENTER,
        });

        const rgba = new Gdk.RGBA();
        rgba.parse(settings.get_string(key));
        colorButton.set_rgba(rgba);

        colorButton.connect('color-set', () => {
            settings.set_string(key, colorButton.get_rgba().to_string());
        });

        row.add_suffix(colorButton);
        row.activatable_widget = colorButton;

        return row;
    }

    getFileChooserButton(settings, key, title, window) {
        const row = new Adw.ActionRow({
            title: title,
        });

        const fileChooserButton = new Gtk.Button({
            label: 'Browse',
            halign: Gtk.Align.END,
            valign: Gtk.Align.CENTER,
        });

        const fileDialog = new Gtk.FileChooserDialog({
            title: 'Select an image',
            action: Gtk.FileChooserAction.OPEN,
            transient_for: window,
            modal: true,
        });
        fileDialog.add_button('Cancel', Gtk.ResponseType.CANCEL);
        fileDialog.add_button('Open', Gtk.ResponseType.ACCEPT);

        fileChooserButton.connect('clicked', () => {
            fileDialog.show();
        });

        fileDialog.connect('response', (dialog, response) => {
            if (response === Gtk.ResponseType.ACCEPT) {
                const file = fileDialog.get_file();
                settings.set_string(key, file.get_path());
            }
            fileDialog.hide();
        });

        row.add_suffix(fileChooserButton);
        row.activatable_widget = fileChooserButton;

        return row;
    }

    getEntry(settings, key, title, subtitle = null) {
        const row = new Adw.ActionRow({
            title: title,
            subtitle: subtitle,
        });

        const entry = new Gtk.Entry({
            text: settings.get_string(key),
            halign: Gtk.Align.END,
            valign: Gtk.Align.CENTER,
        });

        settings.bind(key, entry, 'text', 1);

        row.add_suffix(entry);
        row.activatable_widget = entry;

        return row;
    }
}
