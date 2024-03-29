# Avatar-Gnome-Shell-Extension

Adds an avatar, primary system buttons, mpris media notifications and top image to the top panel.  Supports Gnome 41, 42, 43 & 44

Available on gnome EGO:

[<img src="assets/get-it-on-ego.svg" height="100">](https://extensions.gnome.org/extension/4782/avatar/)

# Changelog
### v 25 
- Gnome 44 support

### v 24 
- Fixed menu is not defined

### v 23
- Fixed order of elements
- Added Detached mode, show avatar box on the top and outline class
- Refactoring
- Drop shell support lower than 43. If You are using gnome shell < 43 use https://github.com/pawelswiszcz/Avatar-Gnome-Shell-Extension/tree/gnome-loe-43 branch

### v 22
- Fixed destroying `mediaSectionMenuItem`

### v 21
- Fixed buttons style for gnome 43. Fixed Mpris `reactive` background

### v 20
- Fixed Mpris media. Using vanilla implementation instead of `Me.imports.src.MediaSection`;

# Screenshots

<img src="assets/avatar-detached.png">

<img src="assets/avatar.png">

<img src="assets/avatar-gnome-43.png">

### Notes

Extension was based on [Big Avatar](https://extensions.gnome.org/extension/3488/big-avatar/) 
Code used https://github.com/qwreey75/quick-settings-tweaks
 
