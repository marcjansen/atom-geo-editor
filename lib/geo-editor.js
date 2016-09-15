'use babel';

import GeoEditorView from './geo-editor-view';
import { CompositeDisposable } from 'atom';

export default {

  geoEditorView: null,
  modalPanel: null,
  subscriptions: null,

  activate(state) {
    this.geoEditorView = new GeoEditorView(state.geoEditorViewState);
    this.modalPanel = atom.workspace.addRightPanel({
      item: this.geoEditorView.getElement(),
      visible: false
    });

    // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    this.subscriptions = new CompositeDisposable();

    // Register command that toggles this view
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'geo-editor:toggle': () => this.toggle()
    }));
  },

  deactivate() {
    this.modalPanel.destroy();
    this.subscriptions.dispose();
    this.geoEditorView.destroy();
  },

  serialize() {
    return {
      geoEditorViewState: this.geoEditorView.serialize()
    };
  },

  toggle() {
    var returnVal;
    if (this.modalPanel.isVisible()) {
        returnVal = this.modalPanel.hide()
    } else {
        returnVal = this.modalPanel.show();
        this.geoEditorView.updateMap();
    }
    return returnVal;
  }

};
