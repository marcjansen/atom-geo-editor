'use babel';

import ol from './ol.js'

const makeDom = function(strHtml) {
    var div = document.createElement('div');
    div.innerHTML = strHtml;
    return div.firstChild;
};

export default class GeoEditorView {

    constructor(serializedState) {
        this.element = document.createElement('div');
        this.element.classList.add('geo-editor');
        this.addMapDiv();
        this.drawMap();
        this.addInteractionControls();
    }

    serialize() {}

    destroy() {
      this.element.remove();
    }

    getElement() {
      return this.element;
    }

    addMapDiv() {
        this.mapDiv = document.createElement('div');
        this.mapDiv.classList.add('map');
        this.element.appendChild(this.mapDiv);
    }

    addInteractionControls() {
        var div = document.createElement('div');
        var ul = document.createElement('ul')
        var ctrls = this.createInteractionControls();
        ctrls.forEach(function(ctrl) {
            ul.appendChild(ctrl);
        });
        div.appendChild(ul);
        this.ctrlsDiv = div;
        this.element.appendChild(div);
        this.interactionEventsBound = false;
    }

    handleRadioClick(evt) {
        var whatWasClicked = evt.target.id;
        this.disableAllInteractions();
        this.unselectAllFeatures();
        if (whatWasClicked === 'select') {
            this.interactions.select.setActive(true);
        } else if (whatWasClicked === 'modify') {
            this.interactions.modify.setActive(true);
        } else if (whatWasClicked === 'translate') {
            this.interactions.translate.setActive(true);
        } else if (whatWasClicked === 'draw') {
            var type = document.getElementById('geom-type').value;
            this.interactions.draw[type].setActive(true);
        }
    }

    unselectAllFeatures() {
        this.interactions.select.getFeatures().clear();
    }

    disableAllInteractions() {
        var interactions = this.interactions;
        Object.keys(interactions).forEach(function(type) {
            if (type === 'draw') {
                Object.keys(interactions.draw).forEach(function(geomType) {
                    var drawInteraction = interactions.draw[geomType];
                    drawInteraction.setActive(false);
                });
            } else {
                var interaction = interactions[type];
                interaction.setActive(false);
            }
        });
    }

    createInteractionControls() {
        var interactions = this.interactions;
        var ctrls = [];
        var none = [
            '<li>',
            '  <label>',
            '    <input type="radio" name="edit" id="none" checked />',
            '    view only',
            '  </label>',
            '</li>'
        ];
        ctrls.push(makeDom(none.join('')));
        Object.keys(interactions).forEach(function(type) {
            var parts;
            if (type !== 'draw') {
                parts = [
                    '<li>',
                    '  <label>',
                    '    <input type="radio" name="edit" id="' + type + '" />',
                    '    ' + type,
                    '  </label>',
                    '</li>'
                ];
            } else {
                parts = [
                    '<li>',
                    '  <label>',
                    '    <input type="radio" name="edit" id="' + type + '" />',
                    '    ' + type,
                    '  </label>',
                    '  <select id="geom-type">'
                ];

                // SELECT
                Object.keys(interactions.draw).forEach(function(geomType, i) {
                    var sel = ((i === 0) ? ' selected' : '');
                    parts.push('    <option value="' + geomType + '"' + sel + '>');
                    parts.push(geomType);
                    parts.push('    </option>');
                })

                parts.push('  </select>');
                parts.push('</li>');
            }
            ctrls.push(makeDom(parts.join('')));
        });
        ctrls.push(
            makeDom([
                '<li>',
                '  <input type="button" id="del" value="delete selected" disabled/>',
                '</li>'
            ].join(''))
        );
        return ctrls;
    }

    updateMap() {
        this.editor = atom.workspace.getActiveTextEditor();
        var geoJson = this.editor.getText();
        var features = (new ol.format.GeoJSON()).readFeatures(geoJson);
        this.vectorSource.clear();
        this.vectorSource.addFeatures(features)
        var extent = this.vectorSource.getExtent();
        var projextent = ol.proj.transformExtent(
            extent, 'EPSG:4326', this.map.getView().getProjection()
        );
        this.map.updateSize();
        // debugger;
        this.map.getView().fit(projextent, this.map.getSize());

        if (!this.interactionEventsBound) {
            var radioClickHandler = this.handleRadioClick.bind(this);
            var geomTypeChangeHandler = this.handleGeomTypeChange.bind(this);
            var delBtnClickedHandler = this.handleDeleteButtonClick.bind(this);
            document.getElementById('none').addEventListener('click', radioClickHandler);
            document.getElementById('draw').addEventListener('click', radioClickHandler);
            document.getElementById('modify').addEventListener('click', radioClickHandler);
            document.getElementById('select').addEventListener('click', radioClickHandler);
            document.getElementById('geom-type').addEventListener('change', geomTypeChangeHandler);
            document.getElementById('del').addEventListener('click', delBtnClickedHandler);
            this.interactionEventsBound = true;
        }
    }

    handleGeomTypeChange() {
        var draw = document.getElementById('draw')
        if (draw.checked) {
            // emulate a click on the draw radio
            this.handleRadioClick({target: draw});
        }
    }

    handleDeleteButtonClick() {
        var selectedForDeletion = this.interactions.select.getFeatures();
        var cnt = selectedForDeletion.getLength();
        var plural = cnt > 1 ? 's' : '';
        if (cnt > 0 && confirm('Delete ' + cnt + ' feature' + plural + '?')) {
            var vectorSource = this.vectorSource;
            selectedForDeletion.forEach(function(selected){
                vectorSource.removeFeature(selected);
            });
            this.unselectAllFeatures();
            this.writeBackToEditor();
        }
    }

    setupLayers() {
        this.bgLayer = new ol.layer.Tile({
          source: new ol.source.OSM(),
          opacity: 0.5
        });
        this.vectorSource = new ol.source.Vector({
          features: []
        });
        this.vectorLayer = new ol.layer.Vector({
            source: this.vectorSource
        });

        return [this.bgLayer, this.vectorLayer];
    }

    onSelectionChange() {
        var delBtn = document.getElementById('del');
        if (this.interactions.select.getFeatures().getLength() > 0) {
            delBtn.removeAttribute('disabled');
        } else {
            delBtn.setAttribute('disabled', 'disabled');
        }
    }

    setupInteractions() {
        var writeBackToEditor = this.writeBackToEditor.bind(this);
        var selectionChanged = this.onSelectionChange.bind(this);
        var interactions = {
            draw: {
                'Point': null,
                'LineString': null,
                'Polygon': null,
                'MultiPoint': null,
                'MultiLineString': null,
                'MultiPolygon': null
            },
            select: null,
            modify: null,
            translate: null
        };
        var createdInteractions = [];
        var source = this.vectorSource;

        // Draw interactions for the different geometry types
        Object.keys(interactions.draw).forEach(function(key) {
            var draw = new ol.interaction.Draw({
                source: source,
                type: key
            });
            draw.on('drawend', writeBackToEditor);
            draw.setActive(false);
            interactions.draw[key] = draw;
            createdInteractions.push(draw);
        });

        // select interaction
        var select = new ol.interaction.Select({
            layers: [this.vectorLayer]
        });
        select.on('select', selectionChanged);
        select.setActive(false);
        interactions.select = select;
        createdInteractions.push(select);

        // modify interaction
        var modify = new ol.interaction.Modify({
            features: select.getFeatures()
        });
        modify.on('modifyend', writeBackToEditor);
        modify.setActive(false);
        interactions.modify = modify;
        createdInteractions.push(modify);

        // translate interaction
        var translate = new ol.interaction.Translate({
            features: select.getFeatures()
        });
        translate.on('translateend', writeBackToEditor);
        translate.setActive(false);
        interactions.translate = translate;

        this.interactions = interactions;

        return createdInteractions;
    }

    drawMap() {
      var layers = this.setupLayers();
      var interactions = this.setupInteractions();
      this.map = new ol.Map({
        layers: layers,
        target: this.mapDiv,
        interactions: ol.interaction.defaults().extend(interactions),
        view: new ol.View({
          projection: 'EPSG:4326',
          center: [0, 0],
          zoom: 2
        })
      });
    }

    writeBackToEditor() {
        var features = this.vectorSource.getFeatures()
        var gjson = (new ol.format.GeoJSON()).writeFeatures(features);
        var editor = atom.workspace.getActiveTextEditor();
        var formatted = JSON.stringify(JSON.parse(gjson), null, '  ');
        editor.setText(formatted);
    }

}
