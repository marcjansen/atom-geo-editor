# Source of the example data

The bundeslaender dataset showing the German federal states is originally from [arcgis.com](http://www.arcgis.com/home/item.html?id=ae25571c60d94ce5b7fcbf74e27c00e0) which links to its source over at the [Bundesamt für Kartographie und Geodäsie (BKG)](http://www.geodatenzentrum.de/geodaten/gdz_rahmen.gdz_div?gdz_spr=deu&gdz_akt_zeile=5&gdz_anz_zeile=4&gdz_user_id=0).

Turned into [GeoJSON](http://geojson.org/) using [ogr2ogr](http://www.gdal.org/ogr2ogr.html). The simplified variant was created by passing  `-simplify 0.01` as argument.
