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

const { AccountsService, GObject, St, Clutter, GLib, Gio, Atk, Shell } = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Main = imports.ui.main;
const Util = imports.misc.util;
const PopupMenu = imports.ui.popupMenu;


const _ = ExtensionUtils.gettext;
const Me = ExtensionUtils.getCurrentExtension();

const Config = imports.misc.config;
const shellVersion = parseFloat(Config.PACKAGE_VERSION);

const { UserWidget } = Me.imports.src.UserWidget;
const { TopImage } = Me.imports.src.TopImage;
const Mpris = imports.ui.mpris;

//Creates temporary iconMenuItem variable
let iconMenuItem = null;

let mediaSectionMenuItem = null;
let mediaMenuItem = null;

let topImageMenuItem = null;

let calendarMpris = Main.panel.statusArea.dateMenu._messageList._mediaSection;

let menuOpenHandlerId = null;

const {
    QuickSettingsGrid,
    QuickSettingsBox,
    QuickSettingsActor,
    QuickSettingsShutdownMenuBox
} = Me.imports.src.gnome



function resetAfterChange() {
    //Disconnects systemMenu

    let menu = getSystemMenu();

    let systemMenu = menu._system;
    if (this._menuOpenStateChangedId) {
        systemMenu.menu.disconnect(this._menuOpenStateChangedId);
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

    if (mediaSectionMenuItem) {
        mediaSectionMenuItem.destroy();
    }


    if (menuOpenHandlerId) {
        menu.disconnect(menuOpenHandlerId);
        menuOpenHandlerId = null;
    }

    iconMenuItem = null
    mediaSectionMenuItem = null;
    topImageMenuItem = null;
    mediaMenuItem = null;

}

function getSystemMenu() {
    if (shellVersion >= 43) {
        return Main.panel.statusArea['quickSettings'].menu;
    }
    return Main.panel.statusArea['aggregateMenu'].menu;
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
            'changed::show-avatar-on-top',
            'changed::show-name',
            'changed::name-style-dark',
            'changed::avatar-shadow',
            'changed::avatar-shadow-user-name',
            'changed::avatar-icon-size',
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
            'changed::top-image-size-height',
            'changed::dnd-icon-name',
            'changed::dnd-icon-name-disabled',
        ];

        for (const i in changedElements) {
            this.settings.connect(changedElements[i], function () {
                resetAfterChange();
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

        let top = this.settings.get_boolean('show-avatar-on-top');

        let itemMenuIconClass = "popup-menu-content quick-settings avatar-separated"

        iconMenuItem = new St.BoxLayout({
            vertical: true,
            style_class: itemMenuIconClass
        });

        const methods = [
            { name: 'addAvatar', number: this.settings.get_int('order-avatar') },
            { name: 'addMpris', number: this.settings.get_int('order-mpris') },
            { name: 'addTopImage', number: this.settings.get_int('order-top-image') }
        ];

        methods.sort((a, b) => a.number - b.number);

        methods.forEach(method => {
            const methodName = method.name;
            this[methodName](iconMenuItem);
        });

        let panelWidth = this.settings.get_int('set-custom-panel-menu-width');

        if (panelWidth > 0) {
            menu.actor.width = this.settings.get_int('set-custom-panel-menu-width');
        }

        QuickSettingsBox.add_child(iconMenuItem)

        this.boxBackupClass = QuickSettingsBox.style_class
        QuickSettingsBox.style_class = ""

        this.actorBackupClass = QuickSettingsActor.style_class
        QuickSettingsActor.style_class =
            " "
            + QuickSettingsActor.style_class

        this.gridBackupClass = QuickSettingsGrid.style_class
        QuickSettingsGrid.style_class =
            QuickSettingsGrid.style_class
            + " popup-menu-content quick-settings"

        let quickSettingsModal = QuickSettingsBox.first_child

        if (top) {
            QuickSettingsBox.remove_child(quickSettingsModal)
            QuickSettingsBox.add_child(iconMenuItem)
            QuickSettingsBox.add_child(quickSettingsModal)
        } else {
            QuickSettingsBox.add_child(iconMenuItem)
            QuickSettingsBox.add_child(quickSettingsModal)
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
            this.settings.get_boolean('dnd-use-icon'),
            this.settings.get_int('avatar-icon-size')
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
            this.settings.get_boolean('dnd-use-icon'),
            this.settings.get_int('avatar-icon-size')
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

    addAvatar(iconMenuItem) {
        let horizontalMode = this.settings.get_boolean('horizontal-mode');

        let userManager = AccountsService.UserManager.get_default();
        let user = userManager.get_user(GLib.get_user_name());

        if (horizontalMode) {
            let avatar = this.setHorizontalStyle(user);

            let avatarBox = new St.BoxLayout({
                vertical: true,
                style_class: "avatar-box margin-bottom-10"
            });

            avatarBox.add_child(avatar);
            iconMenuItem.add_child(avatarBox);

        } else {
            let avatar = this.setVerticalStyle(user);
            iconMenuItem.add_child(avatar);
        }
    }
    addMpris(iconMenuItem) {

        if (this.settings.get_boolean('show-media-center')) {

            let menu = getSystemMenu();

            this._mediaSection = new Mpris.MediaSection();

            let mediaBox = new St.BoxLayout({
                vertical: true,
                style_class: "media-box margin-bottom-10"
            });

            mediaBox.add_child(this._mediaSection);

            iconMenuItem.add_child(mediaBox);

            menuOpenHandlerId = menu.connect('open-state-changed', this._mprisHideOnEmpty);

            calendarMpris._shouldShow = () => false;
            calendarMpris.hide();
        } else {
            calendarMpris._shouldShow = () => true;
            calendarMpris.show();
        }
    }
    addTopImage(iconMenuItem) {

        if (this.settings.get_boolean('show-top-image')) {

            this._topImageSection = new TopImage(this.settings.get_string('top-image'),
                {
                    width: this.settings.get_int('top-image-size-width'),
                    height: this.settings.get_int('top-image-size-height')
                }
            );

            let imageBox = new St.BoxLayout({
                vertical: true,
                style_class: "image-box margin-bottom-10"
            });

            imageBox.add_child(this._topImageSection);


            iconMenuItem.add_child(imageBox);
        }
    }
}

function init(meta) {
    return new Extension(meta.uuid);
}

