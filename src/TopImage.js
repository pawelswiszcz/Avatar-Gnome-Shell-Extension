const { Clutter, GLib, GObject, St } = imports.gi;

const Params = imports.misc.params;


var TopImage = GObject.registerClass(
    class TopImage extends St.Bin {
        _init(imagePath, params) {
            let themeContext = St.ThemeContext.get_for_stage(global.stage);
            params = Params.parse(params, {
                styleClass: 'top-image-icon',
                reactive: false,
                width: 160,
                height: 160
            });

            super._init({
                style_class: params.styleClass,
                reactive: params.reactive,
                width: params.width,
                height: params.height,
            });

            this._iconSize = params.iconSize;
            this.imagePath = imagePath;
            this.x_align = Clutter.ActorAlign.CENTER;

            this.bind_property('reactive', this, 'track-hover',
                GObject.BindingFlags.SYNC_CREATE);
            this.bind_property('reactive', this, 'can-focus',
                GObject.BindingFlags.SYNC_CREATE);
            this.update();
        }


        setSensitive(sensitive) {
            this.reactive = sensitive;
        }

        update() {
            let iconFile = null;
            if (this.imagePath) {
                iconFile = this.imagePath;
                if (iconFile && !GLib.file_test(iconFile, GLib.FileTest.EXISTS)) {
                    iconFile = null;
                }

            }
            if (iconFile) {
                this.child = null;
                this.add_style_class_name('top-image');
                this.style = `
                    background-image: url("${iconFile}");
                    background-size: cover;
                `;
            } else {

                let noImage = new St.Label({
                    text: 'Please add the Top image in extension properties',
                });
                this.child = noImage;
            }
        }
    });
