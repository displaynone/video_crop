const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  openVideo: () => ipcRenderer.invoke('dialog:openVideo'),
  saveVideo: (suggestedName) => ipcRenderer.invoke('dialog:saveVideo', suggestedName),
  runExport: (payload) => ipcRenderer.send('ffmpeg:run', payload),
  cancelExport: () => ipcRenderer.send('ffmpeg:cancel'),
  onLog: (callback) => ipcRenderer.on('ffmpeg:log', (_, message) => callback(message)),
  onProgress: (callback) => ipcRenderer.on('ffmpeg:progress', (_, time) => callback(time)),
  onDone: (callback) => ipcRenderer.on('ffmpeg:done', () => callback()),
  onError: (callback) => ipcRenderer.on('ffmpeg:error', (_, message) => callback(message))
});
