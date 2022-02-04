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
const PanelMenu = imports.ui.panelMenu;
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
    _init(user, orientation = Clutter.Orientation.HORIZONTAL, useLabel = false, useDark = false, addShadow = false) {
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


        const file = Gio.File.new_for_uri('resource:///org/gnome/shell/theme/no-notifications.svg');
        let icon = new St.Icon({
            gicon: new Gio.FileIcon({file}), iconSize: 20,
        });

        this._dndSwitch = new DoNotDisturbSwitch();
        this._dndButton = new St.Button({
            style_class: 'dnd-button',
            can_focus: true,
            toggle_mode: true,
            child: this._dndSwitch,
            label_actor: icon,
            x_align: Clutter.ActorAlign.END,
            y_align: Clutter.ActorAlign.CENTER,
        });

        let notificationBox = new St.BoxLayout({
            vertical: false, x_align: Clutter.ActorAlign.CENTER, style_class: "user-box-notification",
        });

        notificationBox.add_child(icon);
        notificationBox.add_child(this._dndButton);

        this._dndSwitch.bind_property('state', this._dndButton, 'checked', GObject.BindingFlags.BIDIRECTIONAL | GObject.BindingFlags.SYNC_CREATE);

        if (vertical) {
            this.add_child(notificationBox);

        } else {
            this.add_child(notificationBox);
        }

        this.add_child(this._avatar);


        this._userLoadedId = 0;
        this._userChangedId = 0;
        if (user) {
            if (useLabel) {

                let labelBox = new St.BoxLayout({
                    vertical: vertical, x_align: Clutter.ActorAlign.START, style_class: "user-box-label-box",
                });



                let systemClass = vertical ? 'user-widget-system-label vertical' : 'user-widget-system-label horizontal';

                let userSystemLabelWidget = new St.Label({
                    style_class: systemClass, text: GLib.get_os_info('NAME'),
                });
                userSystemLabelWidget.x_align = vertical ? Clutter.ActorAlign.CENTER : Clutter.ActorAlign.START;
                userSystemLabelWidget.y_align = vertical ? Clutter.ActorAlign.CENTER : Clutter.ActorAlign.START;

                labelBox.add_child(userSystemLabelWidget);

                this.add_child(labelBox);

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

const UserWidgetAvatarLabel = GObject.registerClass(class UserWidgetAvatarLabel extends St.BoxLayout {
    _init(user) {
        // If user is null, that implies a username-based login authorization.
        this._user = user;

        this.connect('destroy', this._onDestroy.bind(this));

        let userNameLabelWidget = new UserWidgetLabel(user);
        userNameLabelWidget.bind_property('label-actor', this, 'label-actor', GObject.BindingFlags.SYNC_CREATE);

        this._avatarLabel = userNameLabelWidget;

        this.add_child(this._avatarLabel);

        this._userLoadedId = 0;
        this._userChangedId = 0;
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
});

const UserWidgetAvatar = GObject.registerClass(class UserWidgetAvatar extends St.BoxLayout {
    _init(user) {
        // If user is null, that implies a username-based login authorization.
        this._user = user;

        this.connect('destroy', this._onDestroy.bind(this));

        this._avatar = new Avatar(user);

        this.add_child(this._avatar);

        this._userLoadedId = 0;
        this._userChangedId = 0;
        if (user) {
            this._userLoadedId = this._user.connect('notify::is-loaded', this._updateUser.bind(this));
            this._userChangedId = this._user.connect('changed', this._updateUser.bind(this));
        }

        this._updateUser();
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
        this.updateExtensionAppearance();
    }

    disable() {
        resetAfterChange();
        this.settings = null;
    }

    openUserAccount() {
        Util.spawn(['/bin/bash', '-c', "gnome-control-center user-accounts"]);
    }

    updateExtensionAppearance() {
        //Creates new PopupMenuItem
        this.iconMenuItem = new PopupMenu.PopupMenuItem('');
        this.iconMenuItem.connect('button-press-event', this.openUserAccount);
        let orientation = Clutter.Orientation.VERTICAL;


        let horizontalmode = this.settings.get_boolean('horizontal-mode');

        if (horizontalmode) {
            orientation = Clutter.Orientation.HORIZONTAL;
        }

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
        var avatar = new UserWidget(user, orientation, this.settings.get_boolean('show-name'), this.settings.get_boolean('name-style-dark'), this.settings.get_boolean('avatar-shadow'));
        avatar._updateUser();

        this.iconMenuItem.actor.get_last_child().add_child(avatar);
    }

    setHorizontalStyle(){
        let orientation = Clutter.Orientation.HORIZONTAL;
    }
    setVerticalStyle(){
        let orientation = Clutter.Orientation.VERTICAL;
    }
}


function init(meta) {
    return new Extension(meta.uuid);
}
