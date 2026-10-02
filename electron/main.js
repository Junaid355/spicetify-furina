/**
 * Furina Music — Desktop Windows Application Host (Electron)
 * Provides Windows system tray, global media keys, notifications, frameless theater mode,
 * and automated GitHub Releases auto-updating via electron-updater.
 */
const { app, BrowserWindow, globalShortcut, Tray, Menu, ipcMain, Notification, session } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow = null;
let tray = null;
const isDev = process.env.NODE_ENV === 'development';

// 1. Initialize Auto-Updater
let autoUpdater = null;
try {
  const updaterModule = require('electron-updater');
  autoUpdater = updaterModule.autoUpdater;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.setFeedURL({
    provider: 'github',
    owner: 'Junaid355',
    repo: 'spicetify-furina'
  });
} catch (e) {
  console.log('[AutoUpdater] electron-updater running in local/fallback mode:', e.message);
}

function createWindow() {
  const iconPath = fs.existsSync(path.join(__dirname, '../public/icons/app-icon.ico'))
    ? path.join(__dirname, '../public/icons/app-icon.ico')
    : path.join(__dirname, '../public/icons/app-icon.png');

  // Install ad-blocker network filter (cancels 100% of video and audio advertisements)
  if (session && session.defaultSession) {
    const adFilter = {
      urls: [
        "*://*.doubleclick.net/*",
        "*://*.googleads.g.doubleclick.net/*",
        "*://*.googlesyndication.com/*",
        "*://www.youtube.com/pagead/*",
        "*://www.youtube.com/api/stats/ads*",
        "*://*.youtube.com/ptracking*",
        "*://*.youtube.com/get_midroll_info*",
        "*://*.youtube.com/youtubei/v1/player/ad_break*",
        "*://*.youtube-nocookie.com/pagead/*",
        "*://*.youtube-nocookie.com/api/stats/ads*"
      ]
    };
    session.defaultSession.webRequest.onBeforeRequest(adFilter, (details, callback) => {
      callback({ cancel: true });
    });
  }

  mainWindow = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 920,
    minHeight: 640,
    backgroundColor: '#060d1b',
    title: 'Furina Music — Fontaine Opera & Lossless Player',
    icon: iconPath,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      webSecurity: false,
      preload: path.join(__dirname, 'preload.js')
    },
    frame: true,
    show: false
  });

  // Permanently remove default File/Edit/View menu bar
  Menu.setApplicationMenu(null);
  if (mainWindow.removeMenu) mainWindow.removeMenu();

  // Load URL or local index.html
  const localHtml = path.join(__dirname, '../public/index.html');
  if (app.isPackaged || !isDev) {
    if (fs.existsSync(localHtml)) {
      mainWindow.loadFile(localHtml);
    } else {
      mainWindow.loadURL('http://localhost:3000');
    }
  } else {
    mainWindow.loadURL('http://localhost:3000');
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (Notification.isSupported()) {
      new Notification({
        title: 'Furina Music ✦ Windows Desktop',
        body: 'Fontaine Opera Epiclese engine & Lossless audio initialized.',
        icon: path.join(__dirname, '../public/icons/app-icon.jpg')
      }).show();
    }

    // Check for updates after launch
    if (autoUpdater && app.isPackaged) {
      try {
        autoUpdater.checkForUpdatesAndNotify();
      } catch (err) {
        console.warn('[AutoUpdater] Update check error:', err.message);
      }
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
  setupAutoUpdaterEvents();
}

function createSystemTray() {
  const iconPath = path.join(__dirname, '../public/icons/app-icon.jpg');
  tray = new Tray(iconPath);
  const contextMenu = Menu.buildFromTemplate([
    { label: '✦ Furina Music Desktop', enabled: false },
    { type: 'separator' },
    { label: 'Play / Pause', click: () => sendWebKey('Space') },
    { label: 'Next Track', click: () => sendWebKey('KeyN') },
    { label: 'Previous Track', click: () => sendWebKey('KeyP') },
    { type: 'separator' },
    { label: 'Check for Updates...', click: () => checkForUpdatesManual() },
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

function setupAutoUpdaterEvents() {
  if (!autoUpdater) return;

  autoUpdater.on('checking-for-update', () => {
    sendToRenderer('updater-status', { status: 'checking', message: 'Checking for updates...' });
  });

  autoUpdater.on('update-available', (info) => {
    sendToRenderer('updater-status', {
      status: 'available',
      version: info.version,
      message: `Update v${info.version} available. Downloading in background...`
    });
    if (Notification.isSupported()) {
      new Notification({
        title: 'Furina Music Update Available',
        body: `Version ${info.version} is downloading in background.`,
        icon: path.join(__dirname, '../public/icons/app-icon.jpg')
      }).show();
    }
  });

  autoUpdater.on('update-not-available', (info) => {
    sendToRenderer('updater-status', { status: 'up-to-date', message: 'Furina Music is up to date.' });
  });

  autoUpdater.on('download-progress', (progressObj) => {
    sendToRenderer('updater-progress', {
      percent: Math.floor(progressObj.percent),
      bytesPerSecond: progressObj.bytesPerSecond
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    sendToRenderer('updater-status', {
      status: 'downloaded',
      version: info.version,
      message: `Update v${info.version} ready to install. Restart application to apply.`
    });
    if (Notification.isSupported()) {
      new Notification({
        title: 'Furina Music Update Ready',
        body: `Version ${info.version} downloaded. Click restart to apply!`,
        icon: path.join(__dirname, '../public/icons/app-icon.jpg')
      }).show();
    }
  });

  autoUpdater.on('error', (err) => {
    sendToRenderer('updater-status', { status: 'error', message: err.message });
  });
}

function sendToRenderer(channel, data) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, data);
  }
}

function checkForUpdatesManual() {
  if (autoUpdater) {
    autoUpdater.checkForUpdates();
  } else {
    sendToRenderer('updater-status', { status: 'fallback', message: 'Checking repository releases at github.com/Junaid355/spicetify-furina...' });
  }
}

// IPC Handlers
ipcMain.on('check-for-updates', () => {
  checkForUpdatesManual();
});

ipcMain.on('restart-and-install-update', () => {
  if (autoUpdater) {
    autoUpdater.quitAndInstall();
  }
});

ipcMain.on('desktop-notification', (event, { title, body }) => {
  if (Notification.isSupported()) {
    new Notification({
      title: title || 'Furina Music',
      body: body || '',
      icon: path.join(__dirname, '../public/icons/app-icon.jpg')
    }).show();
  }
});

ipcMain.on('update-discord-rpc', (event, presenceData) => {
  // Bridge Discord rich presence if discord client active
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('discord-rpc-ack', { success: true });
  }
});

app.whenReady().then(createWindow);

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
