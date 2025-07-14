const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const XLSX = require('xlsx');

const {
  readExcel,
  writeExcel,
  generateWordDoc,
  addEmployee,
  deleteEmployee,
  rotateAllSold,
  writeBulkExcel
} = require('./backend/conge.service');

function getDataFilePath() {
  const basePath = app.isPackaged
    ? path.dirname(process.execPath)
    : __dirname;
  const filePath = path.join(basePath, 'data', 'db', 'employes.xlsx');
  console.log('Using Excel data file:', filePath);
  return filePath;
}

let mainWindow;
let splash;

function createWindow() {
  splash = new BrowserWindow({
    width: 300,
    height: 300,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
  });

  splash.loadFile(path.join(__dirname, 'loading.html'));

  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    show: false, // Hide until Angular is ready
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'dist/frontend/browser/index.html'));

  // Show mainWindow and close splash when Angular's DOM is ready
  mainWindow.webContents.once('dom-ready', () => {
    if (splash) {
      splash.close();
    }
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  return mainWindow;
}

app.whenReady().then(() => {
  const filePath = getDataFilePath();

  createWindow();

  rotateAllSold(filePath)
    .then(() => console.log('Sold rotation done.'))
    .catch(err => console.error('Rotation failed:', err));
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC handlers remain unchanged
ipcMain.handle('read-agent', async (_, ns) => {
  try {
    console.log('IPC read-agent for NS:', ns);
    const filePath = getDataFilePath();
    return await readExcel(filePath, ns);
  } catch (err) {
    console.error('Erreur dans read-agent :', err);
    throw err;
  }
});

ipcMain.handle('update-conge', async (_, payload) => {
  try {
    console.log('IPC update-conge received payload:', payload);
    const filePath = getDataFilePath();

    const result = writeExcel(filePath, payload.ns, payload.duration, payload.from, payload.to);

    if (!result.success) {
      console.warn('update-conge failed:', result.reason);
      return result;
    }

    const updatedAgent = await readExcel(filePath, payload.ns);

    if (!updatedAgent) {
      console.error('update-conge: Could not find updated employee after write');
      return { success: false, reason: 'not-found-after-update' };
    }

    const docPath = generateWordDoc(updatedAgent, payload.from, payload.to, payload.duration);

    console.log('update-conge: Word doc generated at:', docPath);

    return { success: true, documentPath: docPath };

  } catch (err) {
    console.error('update-conge exception:', err);
    return { success: false, reason: 'exception' };
  }
});

ipcMain.handle('add-employee', async (_, employee) => {
  try {
    console.log('IPC add-employee:', employee);
    const filePath = getDataFilePath();
    addEmployee(filePath, employee);
    return true;
  } catch (err) {
    console.error('Erreur dans add-employee :', err);
    throw err;
  }
});

ipcMain.handle('delete-employee', async (_, ns) => {
  try {
    console.log('IPC delete-employee for NS:', ns);
    const filePath = getDataFilePath();
    deleteEmployee(filePath, ns);
    return true;
  } catch (err) {
    console.error('Erreur dans delete-employee :', err);
    throw err;
  }
});

ipcMain.handle('get-all-employees', async (_, params) => {
  try {
    const { page = 1, pageSize = 10, query = '' } = params || {};
    const filePath = getDataFilePath();
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    let data = XLSX.utils.sheet_to_json(sheet);

    if (query && query.length > 0) {
      const q = query.trim().toLowerCase();
      data = data.filter(emp =>
        String(emp.NS || '').toLowerCase().includes(q) ||
        String(emp.NCIN || '').toLowerCase().includes(q)
      );
    }

    const total = data.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const paginated = data.slice(start, end);

    return { total, data: paginated };
  } catch (err) {
    console.error('Erreur dans get-all-employees:', err);
    throw err;
  }
});

ipcMain.handle('bulk-update-conge', async (_, payload) => {
  const filePath = getDataFilePath();
  return await writeBulkExcel(filePath, payload.nsList, payload.from, payload.to);
});
