const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getState: () => ipcRenderer.invoke('get-state'),
  activate: (config) => ipcRenderer.invoke('activate', config),
  update: (config) => ipcRenderer.invoke('update', config),
  deactivate: () => ipcRenderer.invoke('deactivate'),
  onStateUpdated: (callback) => {
    ipcRenderer.on('state-updated', (event, state) => callback(state));
  },
  removeStateListener: () => {
    ipcRenderer.removeAllListeners('state-updated');
  }
});

