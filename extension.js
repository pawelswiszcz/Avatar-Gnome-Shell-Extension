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

const { AccountsService, GObject, St, Clutter, GLib, Gio, Atk } = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Main = imports.ui.main;
const Util = imports.misc.util;
const PopupMenu = imports.ui.popupMenu;
const Mpris = imports.ui.mpris;
const { Avatar, UserWidgetLabel } = imports.ui.userWidget;


const _ = ExtensionUtils.gettext;
const Me = ExtensionUtils.getCurrentExtension();


//Creates temporary iconMenuItem variable
let iconMenuItem = null;

let mediaMenuItem = null;


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

const NotificationBox = GObject.registerClass(
    {
        Properties: {
            'active': GObject.ParamSpec.boolean('active', 'active', 'active',
                GObject.ParamFlags.READWRITE,
                false),
            'sensitive': GObject.ParamSpec.boolean('sensitive', 'sensitive', 'sensitive',
                GObject.ParamFlags.READWRITE,
                true),
        },

    },

    class NotificationBox extends St.BoxLayout {

        _init(buttonClass) {
            super._init({
                vertical: false,
                x_align: Clutter.ActorAlign.CENTER,
                style_class: buttonClass,
                track_hover: true,
                reactive: true,
                can_focus: true,
            });
            /* not used for now*/
            //this.add_style_class_name('system-action-icon');
            /*this.bind_property('hover', this, 'active', GObject.BindingFlags.SYNC_CREATE);
            this.opacity = 200;*/
            // this.add_style_class_name('message-body');
        }

        get active() {
            return this._active;
        }

        set active(active) {
            let activeChanged = active != this.active;
            if (activeChanged) {
                this._active = active;
                if (active) {
                    //this.add_style_class_name('selected');
                    this.opacity = 255;
                    if (this.can_focus) {
                        this.grab_key_focus();
                    }

                } else {
                    this.opacity = 200;
                    //this.remove_style_class_name('selected');
                    // Remove the CSS active state if the user press the button and
                    // while holding moves to another menu item, so we don't paint all items.
                    // The correct behaviour would be to set the new item with the CSS
                    // active state as well, but button-press-event is not triggered,
                    // so we should track it in our own, which would involve some work
                    // in the container
                    //this.remove_style_pseudo_class('active');
                }
                this.notify('active');
            }
        }

    });

const SystemButton = GObject.registerClass(
    {
        Properties: {
            'active': GObject.ParamSpec.boolean('active', 'active', 'active',
                GObject.ParamFlags.READWRITE,
                false),
            'sensitive': GObject.ParamSpec.boolean('sensitive', 'sensitive', 'sensitive',
                GObject.ParamFlags.READWRITE,
                true),
        },

    },

    class SystemButton extends St.Button {

        _init() {
            super._init({
                style_class: 'bttn system-button',
                reactive: true,
                can_focus: true,
                track_hover: true,
                x_align: Clutter.ActorAlign.CENTER,
                y_align: Clutter.ActorAlign.CENTER,
                x_expand: true,
            });
            this.add_style_class_name('popup-menu-item');
            this.bind_property('hover', this, 'active', GObject.BindingFlags.SYNC_CREATE);
            this.opacity = 230;
        }

        get active() {
            return this._active;
        }

        set active(active) {
            let activeChanged = active != this.active;
            if (activeChanged) {
                this._active = active;
                if (active) {
                    this.add_style_class_name('selected');
                    this.opacity = 255;
                    if (this.can_focus) {
                        this.grab_key_focus();
                    }

                } else {
                    this.opacity = 230;
                    this.remove_style_class_name('selected');
                    // Remove the CSS active state if the user press the button and
                    // while holding moves to another menu item, so we don't paint all items.
                    // The correct behaviour would be to set the new item with the CSS
                    // active state as well, but button-press-event is not triggered,
                    // so we should track it in our own, which would involve some work
                    // in the container
                    this.remove_style_pseudo_class('active');
                }
                this.notify('active');
            }
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
        systemButtonsIconSize = 1,
        useSystemButtonsColor = false,
        systemButtonsColor = false
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

                let notificationBox = new NotificationBox(buttonClass);

                let notificationBoxStyle = "margin-left:" + systemButtonsPosition + "px;";

                if (useSystemButtonsColor && systemButtonsColor) {
                    notificationBoxStyle += "background-color:" + systemButtonsColor + ";";
                }

                notificationBox.style = notificationBoxStyle;

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
        let systemButton = new SystemButton();
        systemButton.set_child(this.getSystemIcon(systemButtonsIconSize));
        systemButton.connect('button-press-event', this.openUserAccount);

        return systemButton;
    }

    getPowerButton(systemButtonsIconSize) {
        let powerButton = new SystemButton();
        powerButton.set_child(this.getPowerOffIcon(systemButtonsIconSize));
        powerButton.connect('button-press-event', this.closeSystem);

        return powerButton;
    }

    getSuspendButton(systemButtonsIconSize) {
        let suspendButton = new SystemButton();
        suspendButton.set_child(this.getSuspendIcon(systemButtonsIconSize));
        suspendButton.connect('button-press-event', this.suspendSystem);

        return suspendButton;
    }

    openUserAccount() {
        Util.spawn(["/usr/bin/env bash", '-c', "gnome-control-center user-accounts"]);
    }

    closeSystem() {
        Util.spawn(["/usr/bin/env bash", '-c', "gnome-session-quit --power-off"]);
    }

    suspendSystem() {
        Util.spawn(["/usr/bin/env bash", '-c', "systemctl suspend"]);
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

    if (mediaMenuItem) {
        mediaMenuItem.destroy();
    }

}

class Extension {
    constructor(uuid) {
        this._uuid = uuid;
    }

    enable() {
        this.settings = ExtensionUtils.getSettings('org.gnome.shell.extensions.avatar');

        let _that = this;

        let changedElements = [
            'changed::horizontal-mode',
            'changed::show-name',
            'changed::name-style-dark',
            'changed::avatar-shadow',
            'changed::avatar-shadow-user-name',
            'changed::show-system-name',
            'changed::show-buttons',
            'changed::system-name-position',
            'changed::buttons-position',
            'changed::buttons-icon-size',
            'changed::show-media-center',
            'changed::set-custom-panel-menu-width',
            'changed::custom-buttons-background',
            'changed::buttons-background'
        ];

        for (const i in changedElements) {
            this.settings.connect(changedElements[i], function () {
                resetAfterChange();
                Main.panel.statusArea.aggregateMenu.menu.open();
                _that.updateExtensionAppearance();
            });
        }

        this.updateExtensionAppearance();
    }

    disable() {
        resetAfterChange();
        this.settings = null;
    }


    updateExtensionAppearance() {
        //Creates new PopupMenuItem
        this.iconMenuItem = new PopupMenu.PopupMenuItem('', {
            hover: false,
            reactive: false,
            can_focus: false,
        });
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

        let panelWidth = this.settings.get_int('set-custom-panel-menu-width');

        if (panelWidth > 0) {
            Main.panel.statusArea['aggregateMenu'].menu.actor.width = this.settings.get_int('set-custom-panel-menu-width');
        }

        if (horizontalMode) {
            let avatar = this.setHorizontalStyle(user);
            this.iconMenuItem.actor.get_last_child().add_child(avatar);
        } else {
            let avatar = this.setVerticalStyle(user);
            this.iconMenuItem.actor.get_last_child().add_child(avatar);
        }

        if (this.settings.get_boolean('show-media-center')) {
            this._mediaSectionMenuItem = new PopupMenu.PopupMenuItem('', { hover: false });
            Main.panel.statusArea.aggregateMenu.menu.addMenuItem(this._mediaSectionMenuItem, 1);

            this._mediaSection = new Mpris.MediaSection();

            this._mediaSectionMenuItem.add_child(new St.BoxLayout({
                x_expand: true, y_expand: true, vertical: true, style_class: "multimedia-box",
            }));

            this._mediaSectionMenuItem.actor.get_last_child().add_child(this._mediaSection);

            mediaMenuItem = this._mediaSectionMenuItem;
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
            this.settings.get_boolean('custom-buttons-background'),
            this.settings.get_string('buttons-background')
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
            this.settings.get_boolean('custom-buttons-background'),
            this.settings.get_string('buttons-background')
        );

        avatar._updateUser();

        return avatar;
    }
}


function init(meta) {
    return new Extension(meta.uuid);
}
