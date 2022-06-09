const { Clutter, GLib, GObject, St } = imports.gi;

const Params = imports.misc.params;

var AVATAR_ICON_SIZE = 60;


var Avatar = GObject.registerClass(
class Avatar extends St.Bin {
    _init(user, params) {
        params = Params.parse(params, {
            styleClass: 'user-icon',
            reactive: false,
            iconSize: AVATAR_ICON_SIZE,
        });

        super._init({
            style_class: params.styleClass,
            reactive: params.reactive,
            width: params.iconSize,
            height: params.iconSize,
        });

        this._iconSize = params.iconSize;
        this._user = user;

        this.bind_property('reactive', this, 'track-hover',
            GObject.BindingFlags.SYNC_CREATE);
        this.bind_property('reactive', this, 'can-focus',
            GObject.BindingFlags.SYNC_CREATE);
    }

    setSensitive(sensitive) {
        this.reactive = sensitive;
    }

    update() {
        let iconFile = null;
        if (this._user) {
            iconFile = this._user.get_icon_file();
            if (iconFile && !GLib.file_test(iconFile, GLib.FileTest.EXISTS))
                iconFile = null;
        }

        if (iconFile) {
            this.child = null;
            this.add_style_class_name('user-avatar');
            this.style = `
                background-image: url("${iconFile}");
                background-size: cover;`;
        } else {
            this.style = null;
            this.child = new St.Icon({
                icon_name: 'avatar-default-symbolic',
                icon_size: this._iconSize,
            });
        }
    }
});
