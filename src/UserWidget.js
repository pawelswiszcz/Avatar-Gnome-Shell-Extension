const { AccountsService, GObject, St, Clutter, GLib, Gio, Atk } = imports.gi;
const PopupMenu = imports.ui.popupMenu;
const { Avatar, UserWidgetLabel } = imports.ui.userWidget;
const Util = imports.misc.util;

var UserWidget = GObject.registerClass(class UserWidget extends St.BoxLayout {
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
        Util.spawn(['gnome-control-center', 'user-accounts']);
    }

    closeSystem() {
        Util.spawn(['gnome-session-quit', '--power-off']);
    }

    suspendSystem() {
        Util.spawn(['systemctl', 'suspend']);
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


var DoNotDisturbSwitch = GObject.registerClass(class DoNotDisturbSwitch extends PopupMenu.Switch {
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

var NotificationBox = GObject.registerClass(
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

var SystemButton = GObject.registerClass(
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