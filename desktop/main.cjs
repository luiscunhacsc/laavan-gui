'use strict';
const {app, BrowserWindow, Menu, dialog, session} = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const {startServer} = require('./server.cjs');

app.setName('Forma');
if (process.platform === 'win32') app.setAppUserModelId('org.forma.sem');
const smokeFile = process.env.FORMA_SMOKE_REPORT;
if (smokeFile) {
  const profile = process.env.FORMA_SMOKE_PROFILE || path.join(path.dirname(smokeFile), 'profile');
  fs.mkdirSync(profile, {recursive:true});
  app.setPath('userData', profile);
  app.setPath('sessionData', profile);
}
const locked = app.requestSingleInstanceLock();
let mainWindow, localServer, origin, quitting = false;

function createWindow() {
  mainWindow = new BrowserWindow({title:'Forma SEM Studio', width:1440, height:940, minWidth:640, minHeight:600,
    show:false, backgroundColor:'#0f172a', icon:path.join(__dirname, 'icon.png'),
    webPreferences:{preload:path.join(__dirname, 'preload.cjs'), nodeIntegration:false, contextIsolation:true, sandbox:true}});
  mainWindow.webContents.setWindowOpenHandler(() => ({action:'deny'}));
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (new URL(url).origin !== origin) event.preventDefault();
  });
  mainWindow.once('ready-to-show', () => { if (!smokeFile) mainWindow.show(); });
  mainWindow.on('closed', () => { mainWindow = undefined; });
  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    if (!quitting && !smokeFile) dialog.showErrorBox('Forma could not continue', `The application window stopped (${details.reason}). Reopen Forma to restore your autosaved workspace.`);
  });
  void mainWindow.loadURL(origin + '/');
  return mainWindow;
}

async function runSmoke(window) {
  const errors = [];
  window.webContents.on('console-message', details => { if (details.level === 'error') errors.push(details.message); });
  const probe = async code => window.webContents.executeJavaScript(code, true);
  const until = async code => {
    const deadline = Date.now() + 90000;
    while (Date.now() < deadline) {
      if (window.isDestroyed()) throw new Error('Window closed during smoke test');
      const value = await probe(code).catch(() => null);
      if (value) return value;
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    throw new Error('Renderer/runtime did not become ready: ' + JSON.stringify(await probe('document.body.innerText').catch(() => errors)));
  };
  await until(`document.querySelectorAll('.diagram-svg [data-node]').length > 0 && !document.querySelector('.r-status.busy')`);
  const initial = await probe(`({title:document.title, nodes:document.querySelectorAll('.diagram-svg [data-node]').length, runtime:document.querySelector('.r-status').textContent, bundled:window.formaDesktop?.bundled, node:typeof window.require, offline:document.body.innerText.includes('Offline ready')})`);
  if (!initial.bundled || initial.node !== 'undefined' || !initial.offline) throw new Error('Desktop isolation/offline check failed');
  for (const theme of ['light', 'dark']) {
    const selected = await probe(`document.querySelector('.theme-toggle button[aria-label="${theme === 'light' ? 'Light' : 'Dark'}"]').click(); document.documentElement.dataset.theme`);
    if (selected !== theme) throw new Error('Theme switch failed');
  }
  await probe(`document.querySelector('.workspace-bar nav button').click()`);
  await until(`document.querySelectorAll('.data-examples > button').length === 3`);
  await probe(`document.querySelectorAll('.data-examples > button')[2].click()`);
  await until(`document.querySelector('[role="grid"]') && !document.querySelector('.run-analysis')?.disabled`);
  await probe(`document.querySelector('.run-analysis').click()`);
  await until(`document.querySelectorAll('.fit-card').length > 0 && !document.querySelector('.stop-analysis')`);
  const fitted = await probe(`({cards:document.querySelectorAll('.fit-card').length, text:document.querySelector('.results-workspace').innerText})`);
  if (/analysis failed|could not|error:/i.test(fitted.text)) throw new Error(fitted.text);
  // Reload the real packaged app, retaining IndexedDB/localStorage.
  await new Promise(resolve => setTimeout(resolve, 1600));
  const reloaded = new Promise(resolve => window.webContents.once('did-finish-load', resolve));
  window.webContents.reload();
  await reloaded;
  await until(`document.querySelectorAll('.fit-card').length > 0 && !document.querySelector('.project-loading')`);
  const restored = await probe(`({theme:document.documentElement.dataset.theme, cards:document.querySelectorAll('.fit-card').length, data:document.querySelector('.dataset-chip')?.innerText})`);
  if (restored.theme !== 'dark' || restored.cards !== fitted.cards) throw new Error('Workspace/theme restoration failed');
  await fs.promises.mkdir(path.dirname(smokeFile), {recursive:true});
  await fs.promises.writeFile(smokeFile, JSON.stringify({passed:true, platform:process.platform, arch:process.arch,
    electron:process.versions.electron, initial, restored, errors, checks:['packaged Chromium window', 'sandboxed renderer without Node', 'offline startup', 'bundled R/lavaan model compilation', 'light/dark switching', 'bundled sample import', 'lavaan fit and results', 'IndexedDB and theme restoration after reload']}, null, 2));
  app.quit();
}

if (!locked) app.quit();
else {
  app.on('second-instance', () => { if (mainWindow) { if (mainWindow.isMinimized()) mainWindow.restore(); mainWindow.show(); mainWindow.focus(); } else if (origin) createWindow(); });
  app.whenReady().then(async () => {
    const started = await startServer(path.join(__dirname, 'web'), smokeFile ? 0 : 18765);
    localServer = started.server; origin = started.origin;
    const ses = session.defaultSession;
    // Application assets are bundled. Preserve projects/preferences, but never run a stale service worker after an update.
    await ses.clearStorageData({storages:['serviceworkers', 'cachestorage']});
    ses.setPermissionRequestHandler((_contents, permission, callback, details) => callback(permission === 'clipboard-sanitized-write' && details.requestingUrl?.startsWith(origin + '/')));
    ses.setPermissionCheckHandler((_contents, permission, requestingOrigin) => permission === 'clipboard-sanitized-write' && requestingOrigin === origin);
    ses.webRequest.onBeforeRequest((details, callback) => {
      const url = new URL(details.url);
      callback({cancel:!(['data:', 'blob:'].includes(url.protocol) || url.origin === origin)});
    });
    Menu.setApplicationMenu(Menu.buildFromTemplate([
      ...(process.platform === 'darwin' ? [{role:'appMenu'}] : []),
      {label:'File', submenu:[{role:'close'}, {role:'quit'}]},
      {label:'Edit', submenu:[{role:'undo'}, {role:'redo'}, {type:'separator'}, {role:'cut'}, {role:'copy'}, {role:'paste'}, {role:'selectAll'}]},
      {label:'View', submenu:[{role:'reload'}, {type:'separator'}, {role:'resetZoom'}, {role:'zoomIn'}, {role:'zoomOut'}, {role:'togglefullscreen'}]},
      {label:'Help', submenu:[{label:'About Forma', click:() => dialog.showMessageBox({type:'info', title:'Forma SEM Studio', message:`Forma ${app.getVersion()}`, detail:'Standalone SEM, CFA and path analysis. Chromium, R, lavaan, import readers and fonts are bundled. Your projects stay on this computer.'})}]}
    ]));
    const window = createWindow();
    if (smokeFile) await runSmoke(window);
  }).catch(async error => {
    const message = error.code === 'EADDRINUSE' ? 'Forma needs local port 18765. Close the application using that port, then reopen Forma.' : String(error.stack || error);
    if (smokeFile) {
      await fs.promises.mkdir(path.dirname(smokeFile), {recursive:true});
      await fs.promises.writeFile(smokeFile, JSON.stringify({passed:false, error:message}, null, 2));
    } else dialog.showErrorBox('Forma could not start', message);
    app.exit(1);
  });
  app.on('activate', () => { if (origin && !BrowserWindow.getAllWindows().length) createWindow(); });
  app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
  app.on('before-quit', () => { quitting = true; localServer?.close(); });
}
