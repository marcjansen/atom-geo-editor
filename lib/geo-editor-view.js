'use babel';

import ol from './ol.js';

const DEBUG = false;

const debug = function () {
  if (DEBUG) {
    console.log.apply(console, arguments);
  }
};

const makeDom = function (strHtml) {
  const div = document.createElement('div');
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
    const div = document.createElement('div');
    const ul = document.createElement('ul');
    const ctrls = this.createInteractionControls();
    ctrls.forEach((ctrl) => {
      ul.appendChild(ctrl);
    });
    div.appendChild(ul);
    this.ctrlsDiv = div;
    this.element.appendChild(div);
    this.interactionEventsBound = false;
  }

  handleRadioClick(evt) {
    const whatWasClicked = evt.target.id;
    this.disableAllInteractions();
    this.unselectAllFeatures();
    if (whatWasClicked === 'select') {
      debug('enable interaction select');
      this.interactions.select.setActive(true);
    } else if (whatWasClicked === 'modify') {
      debug('enable interaction select');
      this.interactions.select.setActive(true);
      debug('enable interaction modify');
      this.interactions.modify.setActive(true);
    } else if (whatWasClicked === 'translate') {
      debug('enable interaction select');
      this.interactions.select.setActive(true);
      debug('enable interaction translate');
      this.interactions.translate.setActive(true);
    } else if (whatWasClicked === 'draw') {
      const type = document.getElementById('geom-type').value;
      debug('enable interaction draw for ' + type);
      this.interactions.draw[type].setActive(true);
    }
  }

  unselectAllFeatures() {
    debug('deselecting all features');
    this.interactions.select.getFeatures().clear();
  }

  disableAllInteractions() {
    const interactions = this.interactions;
    Object.keys(interactions).forEach((type) => {
      if (type === 'draw') {
        Object.keys(interactions.draw).forEach((geomType) => {
          const drawInteraction = interactions.draw[geomType];
          debug('disable interaction: draw for ' + geomType);
          drawInteraction.setActive(false);
        });
      } else {
        const interaction = interactions[type];
        debug('disable interaction: ' + type);
        interaction.setActive(false);
      }
    });
  }

  createInteractionControls() {
    const interactions = this.interactions;
    const ctrls = [];
    const none = [
      '<li>',
      '  <label>',
      '    <input type="radio" name="edit" id="none" checked />',
      '    view only',
      '  </label>',
      '</li>',
    ];
    ctrls.push(makeDom(none.join('')));
    Object.keys(interactions).forEach((type) => {
      let parts;
      if (type !== 'draw') {
        parts = [
          '<li>',
          '  <label>',
          '    <input type="radio" name="edit" id="' + type + '" />',
          '    ' + type,
          '  </label>',
          '</li>',
        ];
      } else {
        parts = [
          '<li>',
          '  <label>',
          '    <input type="radio" name="edit" id="' + type + '" />',
          '    ' + type,
          '  </label>',
          '  <select id="geom-type">',
        ];

        // SELECT
        Object.keys(interactions.draw).forEach((geomType, i) => {
          const sel = ((i === 0) ? ' selected' : '');
          parts.push('    <option value="' + geomType + '"' + sel + '>');
          parts.push(geomType);
          parts.push('    </option>');
        });

        parts.push('  </select>');
        parts.push('</li>');
      }
      ctrls.push(makeDom(parts.join('')));
    });
    ctrls.push(
      makeDom([
        '<li>',
        '  <input type="button" id="del" value="delete selected" disabled/>',
        '</li>',
      ].join(''))
    );
    return ctrls;
  }

  updateMap() {
    debug('updating map');
    this.editor = atom.workspace.getActiveTextEditor();
    const geoJson = this.editor.getText();
    const features = (new ol.format.GeoJSON()).readFeatures(geoJson);
    this.vectorSource.clear();
    this.vectorSource.addFeatures(features);
    const extent = this.vectorSource.getExtent();
    const projextent = ol.proj.transformExtent(
            extent, 'EPSG:4326', this.map.getView().getProjection()
        );
    this.map.updateSize();
    this.map.getView().fit(projextent, this.map.getSize());

    if (!this.interactionEventsBound) {
      debug('bind DOM event handlers for interaction enabling/disabling');
      const radioClickHandler = this.handleRadioClick.bind(this);
      const geomTypeChangeHandler = this.handleGeomTypeChange.bind(this);
      const delBtnClickedHandler = this.handleDeleteButtonClick.bind(this);
      document.getElementById('none').addEventListener('click', radioClickHandler);
      document.getElementById('draw').addEventListener('click', radioClickHandler);
      document.getElementById('modify').addEventListener('click', radioClickHandler);
      document.getElementById('translate').addEventListener('click', radioClickHandler);
      document.getElementById('select').addEventListener('click', radioClickHandler);
      document.getElementById('geom-type').addEventListener('change', geomTypeChangeHandler);
      document.getElementById('del').addEventListener('click', delBtnClickedHandler);
      this.interactionEventsBound = true;
    }
  }

  handleGeomTypeChange() {
    const draw = document.getElementById('draw');
    if (draw.checked) {
      debug('geometry type changed while draw was active');
            // emulate a click on the draw radio
      this.handleRadioClick({ target: draw });
    }
  }

  handleDeleteButtonClick() {
    const selectedForDeletion = this.interactions.select.getFeatures();
    const cnt = selectedForDeletion.getLength();
    const plural = cnt > 1 ? 's' : '';
    if (cnt > 0 && confirm('Delete ' + cnt + ' feature' + plural + '?')) {
      debug('deleting ' + cnt + ' feature' + plural);
      const vectorSource = this.vectorSource;
      selectedForDeletion.forEach((selected) => {
        vectorSource.removeFeature(selected);
      });
      this.unselectAllFeatures();
      this.writeBackToEditor();
    }
  }

  setupLayers() {
    debug('setting up layers');
    this.bgLayer = new ol.layer.Tile({
      source: new ol.source.OSM(),
      opacity: 0.5,
    });
    this.vectorSource = new ol.source.Vector({
      features: [],
    });
    this.vectorLayer = new ol.layer.Vector({
      source: this.vectorSource,
    });

    return [this.bgLayer, this.vectorLayer];
  }

  onSelectionChange() {
    const delBtn = document.getElementById('del');
    if (this.interactions.select.getFeatures().getLength() > 0) {
      debug('enabling delete button');
      delBtn.removeAttribute('disabled');
    } else {
      debug('disabling delete button');
      delBtn.setAttribute('disabled', 'disabled');
    }
  }

  setupInteractions() {
    debug('create all interactions');
    const writeBackToEditor = this.writeBackToEditor.bind(this);
    const selectionChanged = this.onSelectionChange.bind(this);
    const interactions = {
      draw: {
        'Point': null,
        'LineString': null,
        'Polygon': null,
        'MultiPoint': null,
        'MultiLineString': null,
        'MultiPolygon': null,
      },
      select: null,
      modify: null,
      translate: null,
    };
    const createdInteractions = [];
    const source = this.vectorSource;

    // Draw interactions for the different geometry types
    Object.keys(interactions.draw).forEach((key) => {
      const draw = new ol.interaction.Draw({
        source,
        type: key,
      });
      draw.on('drawend', writeBackToEditor);
      draw.setActive(false);
      interactions.draw[key] = draw;
      createdInteractions.push(draw);
    });

    // select interaction
    const select = new ol.interaction.Select({
      layers: [this.vectorLayer],
    });
    select.on('select', selectionChanged);
    select.setActive(false);
    interactions.select = select;
    createdInteractions.push(select);

    // modify interaction
    const modify = new ol.interaction.Modify({
      features: select.getFeatures(),
    });
    modify.on('modifyend', writeBackToEditor);
    modify.setActive(false);
    interactions.modify = modify;
    createdInteractions.push(modify);

    // translate interaction
    const translate = new ol.interaction.Translate({
      features: select.getFeatures(),
    });
    translate.on('translateend', writeBackToEditor);
    translate.setActive(false);
    interactions.translate = translate;
    createdInteractions.push(translate);

    this.interactions = interactions;

    return createdInteractions;
  }

  drawMap() {
    debug('drawing map');
    const layers = this.setupLayers();
    const interactions = this.setupInteractions();
    this.map = new ol.Map({
      layers,
      target: this.mapDiv,
      interactions: ol.interaction.defaults().extend(interactions),
      view: new ol.View({
        projection: 'EPSG:4326',
        center: [0, 0],
        zoom: 2,
      }),
    });
  }

  writeBackToEditor() {
    debug('writing back to target editor');
    const features = this.vectorSource.getFeatures();
    const gjson = (new ol.format.GeoJSON()).writeFeatures(features);
    const editor = atom.workspace.getActiveTextEditor();
    const formatted = JSON.stringify(JSON.parse(gjson), null, '  ');
    editor.setText(formatted);
  }

}
