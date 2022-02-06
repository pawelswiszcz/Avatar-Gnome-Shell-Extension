/* extension.js
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

/* exported init */

const {AccountsService, GObject, St, Clutter, GLib, Gio} = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Main = imports.ui.main;
const Util = imports.misc.util;
const PopupMenu = imports.ui.popupMenu;

const {Avatar, UserWidgetLabel} = imports.ui.userWidget;


const _ = ExtensionUtils.gettext;
const Me = ExtensionUtils.getCurrentExtension();


//Creates temporary iconMenuItem variable
let iconMenuItem = null;


const DoNotDisturbSwitch = GObject.registerClass(class DoNotDisturbSwitch extends PopupMenu.Switch {
    _init() {
        this._settings = new Gio.Settings({
            schema_id: 'org.gnome.desktop.notifications',
        });

        super._init(this._settings.get_boolean('show-banners'));

        this._settings.bind('show-banners', this, 'state', Gio.SettingsBindFlags.BOOLEAN);

        this.connect('destroy', () => {
            this._settings.run_dispose();
            this._settings = null;
        });
    }
});
const UserWidget = GObject.registerClass(class UserWidget extends St.BoxLayout {
    _init(
        user,
        orientation = Clutter.Orientation.HORIZONTAL,
        useLabel = false,
        useDark = false,
        addShadow = false,
        addShadowUserName = false,
        addSystemName = false,
        addSystemButtons = false,
        systemNamePosition = 1,
        systemButtonsPosition = 1,
        systemButtonsIconSize = 1
    ) {
        // If user is null, that implies a username-based login authorization.
        this._user = user;

        let vertical = orientation === Clutter.Orientation.VERTICAL;
        let xAlign = vertical ? Clutter.ActorAlign.CENTER : Clutter.ActorAlign.START;
        let styleClass = vertical ? 'user-widget vertical' : 'user-widget horizontal';

        if (useDark) {
            styleClass += ' dark';
        }

        if (addShadow) {
            styleClass += ' shadow';
        }

        super._init({
            styleClass, vertical, xAlign,
        });

        this.connect('destroy', this._onDestroy.bind(this));

        this._avatar = new Avatar(user);
        this._avatar.x_align = Clutter.ActorAlign.CENTER;


        this.add_child(this._avatar);

        this._userLoadedId = 0;
        this._userChangedId = 0;
        if (user) {
            if (useLabel) {
                this._label = new UserWidgetLabel(user);
                this._label.bind_property('label-actor', this, 'label-actor', GObject.BindingFlags.SYNC_CREATE);

                let systemClass = vertical ? 'user-widget-system-label vertical' : 'user-widget-system-label horizontal';
                if (addShadowUserName) {
                    systemClass += ' shadow';
                }

                let labelBox = new St.BoxLayout({
                    vertical: true,
                    y_align: Clutter.ActorAlign.CENTER,
                    x_align: Clutter.ActorAlign.CENTER,
                    style_class: systemClass
                });


                let userSystemLabelWidget = new St.Label({
                    text: GLib.get_user_name() + '@' + GLib.get_host_name() + '\n' + GLib.get_os_info('NAME'),
                });

                labelBox.add_child(this._label);

                if (addSystemName) {
                    userSystemLabelWidget.style = "margin-left:" + systemNamePosition + "px";
                    labelBox.add_child(userSystemLabelWidget);
                }

                this.add_child(labelBox);
            }

            if (addSystemButtons) {

                let buttonClass = vertical ? 'user-box-notification vertical' : 'user-box-notification horizontal';

                let notificationBox = new St.BoxLayout({
                    vertical: false,
                    x_align: Clutter.ActorAlign.END,
                    style_class: buttonClass,
                });

                notificationBox.style = "margin-left:" + systemButtonsPosition + "px";

                let dndSwitch = new DoNotDisturbSwitch();
                let dndButton = new St.Button({
                    style_class: 'dnd-button',
                    can_focus: true,
                    toggle_mode: true,
                    child: dndSwitch,
                    x_align: Clutter.ActorAlign.CENTER,
                    y_align: Clutter.ActorAlign.CENTER,
                });

                dndSwitch.bind_property('state', dndButton, 'checked',
                    GObject.BindingFlags.BIDIRECTIONAL | GObject.BindingFlags.SYNC_CREATE
                );


                notificationBox.add_child(dndButton);
                notificationBox.add_child(this.getSystemButton(systemButtonsIconSize));
                notificationBox.add_child(this.getSuspendButton(systemButtonsIconSize));
                notificationBox.add_child(this.getPowerButton(systemButtonsIconSize));

                this.add_child(notificationBox);
            }

            this._userLoadedId = this._user.connect('notify::is-loaded', this._updateUser.bind(this));
            this._userChangedId = this._user.connect('changed', this._updateUser.bind(this));
        } else {
            this._label = new St.Label({
                style_class: 'user-widget-label', text: 'Empty User', opacity: 0,
            });
            this.add_child(this._label);
        }

        this._updateUser();
    }

    getSystemButton(systemButtonsIconSize) {
        let systemButton = new St.Button({
            style_class: 'bttn system-button',
            reactive: true,
            can_focus: true,
            track_hover: true,
            x_align: Clutter.ActorAlign.CENTER,
            y_align: Clutter.ActorAlign.CENTER,
        });
        systemButton.set_child(this.getSystemIcon(systemButtonsIconSize));
        systemButton.connect('button-press-event', this.openUserAccount);

        return systemButton;
    }

    getPowerButton(systemButtonsIconSize) {
        let powerButton = new St.Button({
            style_class: 'bttn system-power-button',
            reactive: true,
            can_focus: true,
            track_hover: true,
            x_align: Clutter.ActorAlign.CENTER,
            y_align: Clutter.ActorAlign.CENTER,
        });
        powerButton.set_child(this.getPowerOffIcon(systemButtonsIconSize));
        powerButton.connect('button-press-event', this.closeSystem);

        return powerButton;
    }

    getSuspendButton(systemButtonsIconSize) {
        let suspendButton = new St.Button({
            style_class: 'bttn system-power-button',
            reactive: true,
            can_focus: true,
            track_hover: true,
            x_align: Clutter.ActorAlign.CENTER,
            y_align: Clutter.ActorAlign.CENTER,
        });
        suspendButton.set_child(this.getSuspendIcon(systemButtonsIconSize));
        suspendButton.connect('button-press-event', this.suspendSystem);

        return suspendButton;
    }

    openUserAccount() {
        Util.spawn(['/bin/bash', '-c', "gnome-control-center user-accounts"]);
    }

    closeSystem() {
        Util.spawn(['/bin/bash', '-c', "gnome-session-quit --power-off"]);
    }

    suspendSystem() {
        Util.spawn(['/bin/bash', '-c', "systemctl suspend"]);
    }

    getNotificationIcon(systemButtonsIconSize) {
        return new St.Icon({
            icon_name: 'preferences-system-notifications-symbolic', iconSize: systemButtonsIconSize,
        });
    }

    getPowerOffIcon(systemButtonsIconSize) {
        return new St.Icon({
            icon_name: 'system-shutdown-symbolic', iconSize: systemButtonsIconSize,
        });
    }

    getSystemIcon(systemButtonsIconSize) {
        return new St.Icon({
            icon_name: 'preferences-system-symbolic', iconSize: systemButtonsIconSize,
        });
    }

    getSuspendIcon(systemButtonsIconSize) {
        return new St.Icon({
            icon_name: 'media-playback-pause-symbolic', iconSize: systemButtonsIconSize,
        });
    }

    _onDestroy() {
        if (this._userLoadedId != 0) {
            this._user.disconnect(this._userLoadedId);
            this._userLoadedId = 0;
        }

        if (this._userChangedId != 0) {
            this._user.disconnect(this._userChangedId);
            this._userChangedId = 0;
        }
    }

    _updateUser() {
        this._avatar.update();
    }
});

function resetAfterChange() {
    //Disconnects systemMenu
    this.systemMenu = Main.panel.statusArea['aggregateMenu']._system;
    if (this._menuOpenStateChangedId) {
        this.systemMenu.menu.disconnect(this._menuOpenStateChangedId);
        this._menuOpenStateChangedId = 0;
    }
    //Destroys iconMenuItem (basically removes the option from the menu)
    if (iconMenuItem) {
        iconMenuItem.destroy();
    }
}

class Extension {
    constructor(uuid) {
        this._uuid = uuid;
    }

    enable() {
        this.settings = ExtensionUtils.getSettings('org.gnome.shell.extensions.avatar');

        let _that = this;
        this.settings.connect('changed::horizontal-mode', function () {
            resetAfterChange();
            _that.updateExtensionAppearance();
        });
        this.settings.connect('changed::show-name', function () {
            resetAfterChange();
            _that.updateExtensionAppearance();
        });
        this.settings.connect('changed::name-style-dark', function () {
            resetAfterChange();
            _that.updateExtensionAppearance();
        });
        this.settings.connect('changed::avatar-shadow', function () {
            resetAfterChange();
            _that.updateExtensionAppearance();
        });
        this.settings.connect('changed::avatar-shadow-user-name', function () {
            resetAfterChange();
            _that.updateExtensionAppearance();
        });
        this.settings.connect('changed::show-system-name', function () {
            resetAfterChange();
            _that.updateExtensionAppearance();
        });
        this.settings.connect('changed::show-buttons', function () {
            resetAfterChange();
            _that.updateExtensionAppearance();
        });

        this.settings.connect('changed::system-name-position', function () {
            resetAfterChange();
            _that.updateExtensionAppearance();
        });
        this.settings.connect('changed::buttons-position', function () {
            resetAfterChange();
            _that.updateExtensionAppearance();
        });
        this.settings.connect('changed::buttons-icon-size', function () {
            resetAfterChange();
            _that.updateExtensionAppearance();
        });

        this.updateExtensionAppearance();
    }

    disable() {
        resetAfterChange();
        this.settings = null;
    }


    updateExtensionAppearance() {
        //Creates new PopupMenuItem
        this.iconMenuItem = new PopupMenu.PopupMenuItem('');
        //this.iconMenuItem.connect('button-press-event', this.openUserAccount);

        let horizontalMode = this.settings.get_boolean('horizontal-mode');


        //Adds a box where we are going to store picture and avatar
        this.iconMenuItem.add_child(new St.BoxLayout({
            x_expand: true, y_expand: true, vertical: true, style_class: "user-box",
        }));

        iconMenuItem = this.iconMenuItem;

        //Adds item to menu
        Main.panel.statusArea.aggregateMenu.menu.addMenuItem(this.iconMenuItem, 0);
        this.systemMenu = Main.panel.statusArea['aggregateMenu']._system;

        var userManager = AccountsService.UserManager.get_default();
        var user = userManager.get_user(GLib.get_user_name());

        if (horizontalMode) {
            let avatar = this.setHorizontalStyle(user);
            this.iconMenuItem.actor.get_last_child().add_child(avatar);
        } else {
            let avatar = this.setVerticalStyle(user);
            this.iconMenuItem.actor.get_last_child().add_child(avatar);
        }
    }

    setHorizontalStyle(user) {
        let orientation = Clutter.Orientation.HORIZONTAL;

        const avatar = new UserWidget(
            user,
            orientation,
            this.settings.get_boolean('show-name'),
            this.settings.get_boolean('name-style-dark'),
            this.settings.get_boolean('avatar-shadow'),
            this.settings.get_boolean('avatar-shadow-user-name'),
            this.settings.get_boolean('show-system-name'),
            this.settings.get_boolean('show-buttons'),
            this.settings.get_int('system-name-position'),
            this.settings.get_int('buttons-position'),
            this.settings.get_int('buttons-icon-size'),
        );

        avatar._updateUser();

        return avatar;
    }

    setVerticalStyle(user) {
        let orientation = Clutter.Orientation.VERTICAL;

        const avatar = new UserWidget(
            user,
            orientation,
            this.settings.get_boolean('show-name'),
            this.settings.get_boolean('name-style-dark'),
            this.settings.get_boolean('avatar-shadow'),
            this.settings.get_boolean('avatar-shadow-user-name'),
            this.settings.get_boolean('show-system-name'),
            this.settings.get_boolean('show-buttons'),
            this.settings.get_int('system-name-position'),
            this.settings.get_int('buttons-position'),
            this.settings.get_int('buttons-icon-size'),
        );

        avatar._updateUser();

        return avatar;
    }
}


function init(meta) {
    return new Extension(meta.uuid);
}
