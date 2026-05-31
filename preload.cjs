const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Send IPC requests to the main process
  sendMessage: (message) => ipcRenderer.send('client-to-socket', message),
  interruptGeneration: (data) => ipcRenderer.send('client-to-socket-interrupt', data),
  toolInteract: (data) => ipcRenderer.send('client-to-socket-interact', data),
  connect: () => ipcRenderer.send('client-connect'),
  
  // Register callbacks for events from the main process
  onMessage: (callback) => {
    ipcRenderer.on('socket-to-client', (event, data) => callback(data));
  },
  onDisconnect: (callback) => {
    ipcRenderer.on('socket-to-client-disconnect', (event, reason) => callback(reason));
  },
  onConnected: (callback) => {
    ipcRenderer.on('socket-connected', (event) => callback());
  }
});
