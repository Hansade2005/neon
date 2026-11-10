const { app, BrowserWindow, protocol, net } = require('electron');
const path = require('path'); const { pathToFileURL } = require('url');
app.commandLine.appendSwitch('disable-background-timer-throttling'); app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required'); app.commandLine.appendSwitch('ignore-gpu-blocklist');
protocol.registerSchemesAsPrivileged([{ scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } }]);
const ROOT = __dirname; const fs = require('fs');
function log(msg) { try { fs.appendFileSync(path.join(app.getPath('userData'), 'crash.log'), new Date().toISOString() + '  ' + msg + '\n'); } catch (e) {} }
function createWindow() {
  const win = new BrowserWindow({ width: 1280, height: 760, minWidth: 800, minHeight: 480, backgroundColor: '#05070c', icon: path.join(ROOT, 'assets', 'icon.png'), autoHideMenuBar: true, title: 'Neon Overdrive', webPreferences: { backgroundThrottling: false, contextIsolation: true } });
  win.setMenu(null); win.loadURL('app://game/src/index.html');
  win.webContents.on('render-process-gone', (e, d) => { log('render-process-gone ' + JSON.stringify(d)); setTimeout(() => { try { win.reload(); } catch (x) {} }, 500); });
  win.on('unresponsive', () => log('window unresponsive')); win.on('responsive', () => log('window responsive again'));
  win.webContents.on('before-input-event', (e, input) => { if (input.type === 'keyDown' && input.key === 'F11') { win.setFullScreen(!win.isFullScreen()); e.preventDefault(); } });
}
app.whenReady().then(() => { protocol.handle('app', req => { const rel = decodeURIComponent(new URL(req.url).pathname).replace(/^\/+/, ''); const file = path.normalize(path.join(ROOT, rel)); if (!file.startsWith(ROOT)) return new Response('forbidden', { status: 403 }); return net.fetch(pathToFileURL(file).toString()); }); createWindow(); });
app.on('child-process-gone', (e, d) => log('child-process-gone ' + JSON.stringify(d)));
app.on('window-all-closed', () => app.quit());
