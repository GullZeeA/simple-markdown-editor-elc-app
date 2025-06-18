const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('node:path');
const fs = require('fs');
const windows = new Set();

const getFileFromUser = async () => {
  const targetWindow = BrowserWindow.getFocusedWindow();
  const files = dialog.showOpenDialog(targetWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Text Files', extensions: ['txt'] },
      { name: 'Markdown Files', extensions: ['md', 'markdown'] }
    ]
  });
  return new Promise((resolve, reject) => {
    if (!files) { reject('could-not-open-dialog') }
    files
      .then((rsp) => {
        if (!rsp.canceled) {
          const file = rsp.filePaths[0];
          const content = fs.readFileSync(file).toString();
          resolve(content);
        }
      })
      .catch((err) => reject(err));
  });
};

ipcMain.on('create-new-window', (event) => {
  createWindow();
});

ipcMain.handle('getFileFromUser', async (event) => {
  const result = await getFileFromUser();
  return result;
});

const createWindow = () => {

  let x, y;

  const currentWindow = BrowserWindow.getFocusedWindow();

  if (currentWindow) {
    const [ currentWindowX, currentWindowY ] = currentWindow.getPosition();
    x = currentWindowX + 10;
    y = currentWindowY + 10;
  }
  
  let newWindow = new BrowserWindow({
    x, y,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,
      enableRemoteModule: true
    }
  });

  newWindow.loadFile('./app/index.html');
  newWindow.once('ready-to-show', () => {
    newWindow.show();
    //newWindow.webContents.openDevTools();
  });
  newWindow.on('close', () => {
    windows.delete(newWindow);
    newWindow = null;
  });
  windows.add(newWindow);
  return newWindow;

};

app.on('ready', () => {
    createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform === 'darwin') { return false; }
  app.quit();
});

app.on('activate', (event, hasVisibleWindows) => {
  if (!hasVisibleWindows) { createWindow(); }
});
