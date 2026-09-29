const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronDesktop', {
  isDesktop: true,
  platform: process.platform,
  sendNotification: (title, body) => {
    ipcRenderer.send('desktop-notification', { title, body });
  }
});
