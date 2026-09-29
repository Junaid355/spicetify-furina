/**
 * Furina Music — Desktop Windows Application Host (Electron)
 * Provides Windows system tray, global media keys, notifications and frameless theater mode.
 */
const { app, BrowserWindow, globalShortcut, Tray, Menu, ipcMain, Notification } = require('electron');
const path = require('path');

let mainWindow = null;
let tray = null;
const isDev = process.env.NODE_ENV === 'development';
const SERVER_URL = 'http://localhost:3000';

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 900,
    minHeight: 620,
    backgroundColor: '#060d1b',
    title: 'Furina Music — Fontaine Opera & Lossless Player',
    icon: path.join(__dirname, '../public/icons/app-icon.jpg'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, 'preload.js')
    },
    frame: true,
    show: false
  });

  mainWindow.loadURL(SERVER_URL);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (Notification.isSupported()) {
      new Notification({
        title: 'Furina Music',
        body: 'Fontaine Opera Epiclese engine initialized.',
        icon: path.join(__dirname, '../public/icons/app-icon.jpg')
      }).show();
    }
  });

  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
    return false;
  });

  createSystemTray();
  registerGlobalMediaKeys();
}

function createSystemTray() {
  const iconPath = path.join(__dirname, '../public/icons/app-icon.jpg');
  tray = new Tray(iconPath);
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Furina Music', enabled: false },
    { type: 'separator' },
    { label: 'Play / Pause', click: () => sendWebKey('Space') },
    { label: 'Next Track', click: () => sendWebKey('KeyN') },
    { label: 'Previous Track', click: () => sendWebKey('KeyP') },
    { type: 'separator' },
    { label: 'Show Window', click: () => mainWindow.show() },
    { label: 'Quit', click: () => { app.isQuitting = true; app.quit(); } }
  ]);

  tray.setToolTip('Furina Music — Fontaine Opera Player');
  tray.setContextMenu(contextMenu);
  tray.on('double-click', () => {
    mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
  });
}

function registerGlobalMediaKeys() {
  globalShortcut.register('MediaPlayPause', () => sendWebKey('Space'));
  globalShortcut.register('MediaNextTrack', () => sendWebKey('KeyN'));
  globalShortcut.register('MediaPreviousTrack', () => sendWebKey('KeyP'));
}

function sendWebKey(code) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.executeJavaScript(`
      window.dispatchEvent(new KeyboardEvent('keydown', { code: '${code}' }));
    `);
  }
}

app.whenReady().then(createWindow);

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
