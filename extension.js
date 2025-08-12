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

import GLib from 'gi://GLib';
import St from 'gi://St';
import AccountsService from 'gi://AccountsService';
import Clutter from 'gi://Clutter';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import { Extension, gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js';

import { UserWidget } from './src/UserWidget.js';
import { TopImage } from './src/TopImage.js';

import {
    QuickSettingsGrid,
    QuickSettingsBox,
    QuickSettingsActor,
} from './src/gnome.js';

import * as Mpris from 'resource:///org/gnome/shell/ui/mpris.js';


//Creates temporary iconMenuItem variable
let iconMenuItem = null;

let mediaSectionMenuItem = null;
let mediaMenuItem = null;

let topImageMenuItem = null;

let calendarMpris = Main.panel.statusArea.dateMenu._messageList._mediaSection;

let menuOpenHandlerId = null;

function resetAfterChange(object) {
    //Disconnects systemMenu

    let menu = getSystemMenu();

    let systemMenu = menu._system;
    if (object._menuOpenStateChangedId) {
        systemMenu.menu.disconnect(object._menuOpenStateChangedId);
        object._menuOpenStateChangedId = 0;
    }
    //Destroys iconMenuItem (basically removes the option from the menu)
    if (iconMenuItem) {
        iconMenuItem.destroy();
        QuickSettingsBox.remove_child(iconMenuItem);
    }

    Main.panel.statusArea.dateMenu._messageList._dndButton.show();
    Main.panel.statusArea.dateMenu._messageList._dndButton.label_actor.show();

    if (mediaMenuItem) {
        mediaMenuItem.destroy();
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
    return Main.panel.statusArea.quickSettings;
}

export default class Avatar extends Extension {

    enable() {
        this.settings = this.getSettings('org.gnome.shell.extensions.avatar');

        let _that = this;

        let changedElements = [
            'changed::horizontal-mode',
            'changed::show-avatar-on-top',
            'changed::add-outline-class',
            'changed::detached-mode',
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
                resetAfterChange(_that);
                _that.updateExtensionAppearance();
            });
        }

        this.updateExtensionAppearance();
    }

    disable() {
        let _that = this;

        resetAfterChange(_that);
        this.settings = null;
    }


    updateExtensionAppearance() {

        const itemMenuIconClass = this.settings.get_boolean('add-outline-class') ? "popup-menu-content quick-settings avatar-separated" : "margin-top-10"

        iconMenuItem = new St.BoxLayout({
            vertical: true,
            style_class: itemMenuIconClass
        });

        const methods = [
            { name: 'addAvatar', number: this.settings.get_int('order-avatar') },
            //{ name: 'addMpris', number: this.settings.get_int('order-mpris') },
            { name: 'addTopImage', number: this.settings.get_int('order-top-image') }
        ];

        methods.sort((a, b) => a.number - b.number);

        methods.forEach(method => {
            const methodName = method.name;
            this[methodName](iconMenuItem);
        });

        let panelWidth = this.settings.get_int('set-custom-panel-menu-width');

        if (panelWidth > 0) {
            let menu = getSystemMenu();
            menu.actor.width = this.settings.get_int('set-custom-panel-menu-width');
        }


        QuickSettingsBox.add_child(iconMenuItem)

        const detachedMode = this.settings.get_boolean('detached-mode');

        this.boxBackupClass = QuickSettingsBox.style_class;

        this.actorBackupClass = QuickSettingsActor.style_class;

        if (detachedMode) {
            QuickSettingsBox.style_class = "";
            QuickSettingsActor.style_class = " " + QuickSettingsActor.style_class;

            this.gridBackupClass = QuickSettingsGrid.style_class;
            QuickSettingsGrid.style_class = QuickSettingsGrid.style_class + " popup-menu-content quick-settings";

            let quickSettingsModal = QuickSettingsBox.first_child;

            const top = this.settings.get_boolean('show-avatar-on-top');

            if (top) {
                QuickSettingsBox.remove_child(quickSettingsModal);
                QuickSettingsBox.add_child(iconMenuItem);
                QuickSettingsBox.add_child(quickSettingsModal);
            } else {
                QuickSettingsBox.add_child(iconMenuItem);
                QuickSettingsBox.add_child(quickSettingsModal);
            }
        } else {
            QuickSettingsBox.style_class = this.boxBackupClass;
            QuickSettingsActor.style_class = this.actorBackupClass;
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
        let isEmpty = mediaMenuItem?._players.size;

        if (isEmpty === 0)
            mediaSectionMenuItem?.hide();
        else
            mediaSectionMenuItem?.show();
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

            this._mediaSection = Main.panel.statusArea.dateMenu._messageList._mediaSection;

            let mediaBox = new St.BoxLayout({
                vertical: true,
                style_class: "media-box margin-bottom-10"
            });

            mediaBox.add_child(this._mediaSection);

            iconMenuItem.add_child(mediaBox);

            menuOpenHandlerId = menu.connect('open-state-changed', this._mprisHideOnEmpty);

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
