const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('node:path');
const fs = require('fs');
const windows = new Set();
const openedFiles = new Map();

const updateUserInterface = (filePath, targetWindow, isEdited) => {
  const title = 'Simple Markdown Editor';

  if (filePath === null) {
    // invoked from keyup event on ui textarea
    if (isEdited) {
      // file is opened and it is now edited
      // add (Edited) in the title if is does not already exist there
      let currentTitle = targetWindow.title;
      if (currentTitle.search('Edited') < 0) {
        currentTitle = currentTitle.replace(title, `(Edited) - ${title}`);
        targetWindow.setTitle(currentTitle);
      }
    } else {
      // file is opened but is not edited
      // if (Edited) is found in the title remove it.
      let currentTitle = targetWindow.title;
      if (currentTitle.search('Edited') > 0) {
        currentTitle = currentTitle.split('(Edited) - ').join('');
        targetWindow.setTitle(currentTitle);
      }
    }
  } else {
    // invoked from open file dialog
    if (filePath) { targetWindow.setTitle(`${path.basename(filePath)} - ${title}`); }
  }
};

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
          updateUserInterface(file, targetWindow, null);
          targetWindow.setRepresentedFilename(file); // macOS specific, others no effect
          startWatchingFile(targetWindow, file);
          resolve({ file, content});
        }
      })
      .catch((err) => reject(err));
  });
};

const saveHtml = async (content) => {
  const targetWindow = BrowserWindow.getFocusedWindow();
  const file = dialog.showSaveDialog(targetWindow, {
    title: 'Save HTML',
    defaultPath: app.getPath('documents'),
    filters: [
      { name: 'HTML Files', extensions: ['html', 'htm'] }
    ]
  });
  return new Promise((resolve, reject) => {
    file
      .then((rsp) => {
        if (rsp.canceled) { resolve({ status: true, msg: 'user-closed-dialog' }); }
        try {
          fs.writeFileSync(rsp.filePath, content);
          resolve({ status: true, msg: 'ok' });
        }
        catch { resolve({ status: false, msg: 'could-not-write-file' }); }
      })
      .catch(err => { reject({ status: false, msg: 'could-not-open-dialog' }) });
  });
};

const saveFile = async (filePath, content) => {
  const targetWindow = BrowserWindow.getFocusedWindow();
  return new Promise((resolve, reject) => {
    if (filePath) {
      try {
        fs.writeFileSync(filePath,content);
        resolve({ status: 'file-edits-saved', filePath: null });
      } catch {
        reject("could not save changes in the existing file");
      }

    } else {
      const file = dialog.showSaveDialog(targetWindow, {
        title: 'Save Markdown',
        defaultPath: app.getPath('documents'),
        filters: [
          { name: 'Markdown Files', extensions: ['md', 'markdown'] }
        ]
      });
      file
        .then((rsp) => {
          if (!rsp.canceled) {
            fs.writeFileSync(rsp.filePath, content);
            resolve({ status: 'new-file-saved', filePath: rsp.filePath });
          } else {
            reject({status: 'user-closed-dialog', filePath: null});
          }
        })
        .catch((err) => { reject('could not save changes in the new file') });
    }
  });
};

const startWatchingFile = (targetWindow, file) => {
  stopWatchingFile(targetWindow);
  const watcher = fs.watchFile(file, (event) => {
    if (event === 'change') {
      const content = fs.readFileSync(file);
      // find equivalent: send file content to renderer
      // targetWindow.webContents.send('file-opened', file, content);
    }
  });
  openedFiles.set(targetWindow, watcher);
};

const stopWatchingFile = (targetWindow) => {
  if (openedFiles.has(targetWindow)) {
    openedFiles.get(targetWindow).stop();
    openedFiles.delete(targetWindow);
  }
};

ipcMain.on('create-new-window', (event) => {
  createWindow();
});

ipcMain.handle('getFileFromUser', async (event) => {
  const result = await getFileFromUser();
  return result;
});

ipcMain.handle('updateUserInterface', async (event, isEdited) => {
  return new Promise((resolve, reject) => {
    try {
      const targetWindow = BrowserWindow.getFocusedWindow();
      updateUserInterface(null, targetWindow, isEdited)
      resolve("ok");
    } catch (error) {
      reject(error);
    }
  });
});

ipcMain.handle('saveHtml', async (event, content) => {
  const result = await saveHtml(content);
  return result; 
});

ipcMain.handle('saveFile', async (event, filePath, content) => {
  const result = await saveFile(filePath, content);
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
  newWindow.on('closed', () => {
    windows.delete(newWindow);
    stopWatchingFile(newWindow);
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


/*
 * Features not supported by Linux
 * clicking on a file in recent files does not fire the open-file
 * event.

app.on('will-finish-launching', () => {
  app.on('open-file', (event, file) => {
  });
});

 *
 */