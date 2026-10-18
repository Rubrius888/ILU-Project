const { app, BrowserWindow, protocol, session, net } = require('electron');
const path = require('node:path');
const fs = require('node:fs');

protocol.registerSchemesAsPrivileged([
  { scheme: 'ilu', privileges: { standard: true, secure: true, supportFetchAPI: true } }
]);

function createWindow() {
  const window = new BrowserWindow({
    width: 1440,
    height: 1000,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true
    }
  });
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', event => event.preventDefault());
  window.webContents.on('did-fail-load', (_event, code, description, url) => {
    console.error(`[ILU_LOAD_ERROR] ${code} ${description} ${url}`);
  });
  window.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    if (level >= 2) console.error(`[ILU_RENDER_ERROR] ${sourceId}:${line} ${message}`);
  });
  window.webContents.on('render-process-gone', (_event, details) => {
    console.error(`[ILU_RENDER_GONE] ${details.reason}`);
  });
  window.webContents.setZoomFactor(1);
  window.webContents.setVisualZoomLevelLimits(1, 1);
  window.webContents.on('before-input-event', (event, input) => {
    if (!input.control || input.type !== 'keyDown') return;
    if (input.key === '0') { event.preventDefault(); window.webContents.setZoomFactor(1); }
    if (input.key === '+' || input.key === '=') {
      event.preventDefault();
      window.webContents.setZoomFactor(Math.min(3, window.webContents.getZoomFactor() + 0.1));
    }
    if (input.key === '-' || input.key === '_') {
      event.preventDefault();
      window.webContents.setZoomFactor(Math.max(0.5, window.webContents.getZoomFactor() - 0.1));
    }
  });
  window.loadURL('ilu://app/matrix.html').catch(error => console.error('[ILU_LOAD_ERROR]', error));
}

app.whenReady().then(() => {
  protocol.handle('ilu', request => {
    const relative = decodeURIComponent(new URL(request.url).pathname).replace(/^\/+/, '');
    const root = app.getAppPath();
    const file = path.resolve(root, relative);
    if (file !== root && !file.startsWith(`${root}${path.sep}`)) {
      return new Response('Forbidden', { status: 403 });
    }
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
      return new Response('Not found', { status: 404 });
    }
    const mime = {
      '.html': 'text/html; charset=UTF-8', '.js': 'text/javascript; charset=UTF-8',
      '.css': 'text/css; charset=UTF-8', '.png': 'image/png', '.jpg': 'image/jpeg',
      '.svg': 'image/svg+xml', '.ico': 'image/x-icon'
    }[path.extname(file).toLowerCase()] || 'application/octet-stream';
    // net.fetch корректно обслуживает файлы внутри asar; передача Node.js
    // ReadStream в Response ломает загрузку скриптов в некоторых версиях Electron.
    return net.fetch(`file://${file}`);
  });
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
