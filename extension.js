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

const {AccountsService, GObject, St, Clutter, GLib, Gio, Atk} = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Main = imports.ui.main;
const Util = imports.misc.util;
const PopupMenu = imports.ui.popupMenu;
const Mpris = imports.ui.mpris;

const _ = ExtensionUtils.gettext;
const Me = ExtensionUtils.getCurrentExtension();

const {UserWidget} = Me.imports.src.UserWidget;
const {TopImage} = Me.imports.src.TopImage;

//Creates temporary iconMenuItem variable
let iconMenuItem = null;

let mediaSectionMenuItem = null;
let mediaMenuItem = null;

let topImageMenuItem = null;

let calendarMpris = Main.panel.statusArea.dateMenu._messageList._mediaSection;

let menuOpenHandlerId = null;

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

    Main.panel.statusArea.dateMenu._messageList._dndButton.show();
    Main.panel.statusArea.dateMenu._messageList._dndButton.label_actor.show();

    if (mediaMenuItem) {
        mediaMenuItem.destroy();
        calendarMpris._shouldShow = () => true;
        calendarMpris.show();
    }

    if (topImageMenuItem) {
        topImageMenuItem.destroy();
    }

    if (menuOpenHandlerId) {
        Main.panel.statusArea['aggregateMenu'].menu.disconnect(menuOpenHandlerId);
        menuOpenHandlerId = null;
    }

    iconMenuItem = null
    mediaSectionMenuItem = null;
    topImageMenuItem = null;
    mediaMenuItem = null;

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
            'changed::dnd-use-icon',
            'changed::system-name-position',
            'changed::buttons-position',
            'changed::buttons-icon-size',
            'changed::show-media-center',
            'changed::set-custom-panel-menu-width',
            'changed::custom-buttons-background',
            'changed::buttons-background',
            'changed::order-avatar',
            'changed::order-mpris',
            'changed::order-top-image',
            'changed::show-top-image',
            'changed::top-image',
            'changed::top-image-size-width',
            'changed::top-image-size-height'
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

        let horizontalMode = this.settings.get_boolean('horizontal-mode');


        this.iconMenuItem.add_child(new St.BoxLayout({
            x_expand: true, y_expand: true, vertical: true, style_class: "user-box",
        }));

        iconMenuItem = this.iconMenuItem;

        //Adds item to menu
        Main.panel.statusArea.aggregateMenu.menu.addMenuItem(this.iconMenuItem, this.settings.get_int('order-avatar'));
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
            this._mediaSectionMenuItem = new PopupMenu.PopupMenuItem('', {hover: false});
            Main.panel.statusArea.aggregateMenu.menu.addMenuItem(this._mediaSectionMenuItem, this.settings.get_int('order-mpris'));

            this._mediaSection = new Mpris.MediaSection();

            this._mediaSectionMenuItem.add_child(new St.BoxLayout({
                x_expand: true, y_expand: true, vertical: true, style_class: "multimedia-box",
            }));

            this._mediaSectionMenuItem.actor.get_last_child().add_child(this._mediaSection);

            mediaSectionMenuItem = this._mediaSectionMenuItem;
            mediaMenuItem = this._mediaSection;

            menuOpenHandlerId = Main.panel.statusArea['aggregateMenu'].menu.connect('open-state-changed', this._mprisHideOnEmpty);

            calendarMpris._shouldShow = () => false;
            calendarMpris.hide();
        } else {
            calendarMpris._shouldShow = () => true;
            calendarMpris.show();
        }

        if (this.settings.get_boolean('show-top-image')) {
            this._topImageSectionMenuItem = new PopupMenu.PopupMenuItem('', {
                hover: false,
                reactive: false,
                can_focus: false,
            });
            Main.panel.statusArea.aggregateMenu.menu.addMenuItem(this._topImageSectionMenuItem, this.settings.get_int('order-top-image'));

            this._topImageSection = new TopImage(this.settings.get_string('top-image'),
                {
                    width: this.settings.get_int('top-image-size-width'),
                    height: this.settings.get_int('top-image-size-height')
                }
            );

            this._topImageSectionMenuItem.add_child(new St.BoxLayout({
                x_expand: true, y_expand: true, vertical: true, style_class: "top-image-box",
            }));

            this._topImageSectionMenuItem.actor.get_last_child().add_child(this._topImageSection);

            topImageMenuItem = this._topImageSectionMenuItem;
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
            this.settings.get_string('buttons-background'),
            this.settings.get_boolean('dnd-use-icon')
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
            this.settings.get_string('buttons-background'),
            this.settings.get_boolean('dnd-use-icon')
        );

        avatar._updateUser();

        return avatar;
    }

    _mprisHideOnEmpty() {
        let isEmpty = mediaMenuItem._players.size;

        if (isEmpty === 0)
            mediaSectionMenuItem.hide();
        else
            mediaSectionMenuItem.show();
    };
}

function init(meta) {
    return new Extension(meta.uuid);
}

