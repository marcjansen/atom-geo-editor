# geo-editor package

**Work in progress. Not done by any means.**

The `geo-editor` package wants to enhance atom so that editing of geospatial data becomes more easy.

![A screenshot of the geo-editor package](https://cdn.rawgit.com/marcjansen/atom-geo-editor/v0.2.0/geo-editor.png)

## How do I…

### …show the editor?

Hit `Ctrl-Alt-o` to toggle the view with the map. Do this in an editor of a GeoJSON file.

Alternatively, right-click on a open GeoJSON file in the standard editor and choose `Toggle geo-editor`.

You can also choose `Packages` → `geo-editor` → `Toggle` in the man menu.

### …hide the editor?

See above instructions for showing, which boil down to:

* `Ctrl-Alt-o`
* Right-click on GeoJSON file: `Toggle geo-editor`.
* In main menu: `Packages` → `geo-editor` → `Toggle`.

### …edit something?

Just use the controls in the `geo-editor` window to turn on and off functionality. Any changes that are done to the geometries are directly written back to the editor window.

### …write back my changes?

Just edit and usually any change to the geometry should directly be reflected in the editor you used to open the `geo-editor`.

## Status: Beta

Current features:

* Support GeoJSON
* Adding, deleting, modifying, translating
* Writing changes back

Future tasks:

* Support more formats
* Support Feature atrributes, not only geometry
* Better included into Atom user interface

This is a fun project of mine, I cannot guarantee I will have time to work on future tasks and or bug-fixes.
