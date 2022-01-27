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

const { AccountsService, GObject, St, Clutter, GLib } = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Main = imports.ui.main;
const Util = imports.misc.util;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;

const { Avatar, UserWidgetLabel } = imports.ui.userWidget;


const _ = ExtensionUtils.gettext;
const Me = ExtensionUtils.getCurrentExtension();

const settings = ExtensionUtils.getSettings('org.gnome.shell.extensions.avatar');


//Creates temporary iconMenuItem variable
var iconMenuItem = null;


function openUserAccount() {
    Util.spawn(['/bin/bash', '-c', "gnome-control-center user-accounts"]);
}

function updateExtensionAppearence() {
    //Creates new PopupMenuItem
    this.iconMenuItem = new PopupMenu.PopupMenuItem('');
    this.iconMenuItem.connect('button-press-event', openUserAccount);
    var orientation = Clutter.Orientation.VERTICAL;


    //Get values from gschema for horizontalmode and usedefaultvalues
    let horizontalmode = settings.get_boolean('horizontal-mode');

    if (horizontalmode) {
        orientation = Clutter.Orientation.HORIZONTAL;
    }

    //Adds a box where we are going to store picture and avatar
    this.iconMenuItem.add_child(
        new St.BoxLayout({
            x_expand: true,
            y_expand: true,
            vertical: true,
            style_class: "user-box",
        })
    );

    iconMenuItem = this.iconMenuItem;

    //Adds item to menu
    Main.panel.statusArea.aggregateMenu.menu.addMenuItem(this.iconMenuItem, 0);
    this.systemMenu = Main.panel.statusArea['aggregateMenu']._system;

    var userManager = AccountsService.UserManager.get_default();
    var user = userManager.get_user(GLib.get_user_name());
    var avatar = new UserWidget(user, orientation, settings.get_boolean('show-name'), settings.get_boolean('name-style-dark'));
    avatar._updateUser();
    this.iconMenuItem.actor.get_last_child().add_child(avatar);
}

function resetAfeterChange() {
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
    updateExtensionAppearence();
}

class Extension {
    constructor(uuid) {
        this._uuid = uuid;
    }

    enable() {
        settings.connect('changed::horizontal-mode', resetAfeterChange);
        settings.connect('changed::show-name', resetAfeterChange);
        settings.connect('changed::name-style-dark', resetAfeterChange);
        updateExtensionAppearence();
    }

    disable() {

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
}


function init(meta) {
    return new Extension(meta.uuid);
}


var UserWidget = GObject.registerClass(
    class UserWidget extends St.BoxLayout {
        _init(user, orientation = Clutter.Orientation.HORIZONTAL, useLabel = false, useDark = false) {
            // If user is null, that implies a username-based login authorization.
            this._user = user;

            let vertical = orientation == Clutter.Orientation.VERTICAL;
            let xAlign = vertical ? Clutter.ActorAlign.CENTER : Clutter.ActorAlign.START;
            let styleClass = vertical ? 'user-widget vertical' : 'user-widget horizontal';

            if(useDark){
                styleClass += ' dark';
            }

            super._init({
                styleClass,
                vertical,
                xAlign,
            });

            this.connect('destroy', this._onDestroy.bind(this));

            this._avatar = new Avatar(user);
            this._avatar.x_align = Clutter.ActorAlign.CENTER;
            this.add_child(this._avatar);

            this._userLoadedId = 0;
            this._userChangedId = 0;
            if (user) {
                log('label');
                log(useLabel);
                if (useLabel) {
                    this._label = new UserWidgetLabel(user);
                    this.add_child(this._label);

                    this._label.bind_property('label-actor', this, 'label-actor', GObject.BindingFlags.SYNC_CREATE);
                }

                this._userLoadedId = this._user.connect('notify::is-loaded', this._updateUser.bind(this));
                this._userChangedId = this._user.connect('changed', this._updateUser.bind(this));
            } else {
                this._label = new St.Label({
                    style_class: 'user-widget-label',
                    text: 'Empty User',
                    opacity: 0,
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
