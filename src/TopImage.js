
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import St from 'gi://St';
import {parse} from 'resource:///org/gnome/shell/misc/params.js';
import Clutter from 'gi://Clutter';


export const TopImage = GObject.registerClass(
    class TopImage extends St.Bin {
        _init(imagePath, params) {
            let themeContext = St.ThemeContext.get_for_stage(global.stage);
            params = parse(params, {
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
