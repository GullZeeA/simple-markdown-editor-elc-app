const { contextBridge } = require('electron/renderer');
const { marked } = require('marked');
const { ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('versions', {
  node: () => process.versions.node,
  chrome: () => process.versions.chrome,
  electron: () => process.versions.electron,
  currentDir: process.env.PWD
});

contextBridge.exposeInMainWorld('nodeDeps', {
  ndMarked: marked
});

contextBridge.exposeInMainWorld('elcMods', {
  sendToMain: msg => ipcRenderer.send(msg),
  invokeAtMain: (args) => {
    return new Promise((resolve, reject) => {
      ipcRenderer.invoke(...args)
        .then((rsp) => resolve(rsp))
        .catch((err) => reject(err));
    });
  },
});