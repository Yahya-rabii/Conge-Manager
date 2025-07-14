const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const XLSX = require('xlsx');

const {
  readExcel,
  writeExcel,
  generateWordDoc,
  addEmployee,
  deleteEmployee,
  rotateAllSold
} = require('./backend/conge.service');

function getDataFilePath() {
  const basePath = app.isPackaged
    ? path.dirname(process.execPath)
    : __dirname;
  const filePath = path.join(basePath, 'data', 'db', 'employes.xlsx');
  console.log('Using Excel data file:', filePath);
  return filePath;
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.loadFile(path.join(__dirname, 'dist/frontend/browser/index.html'));
  // Optional: Open dev tools
  // win.webContents.openDevTools();

  return win;
}

app.whenReady().then(() => {
  const filePath = getDataFilePath();

  // Create window immediately so app UI is responsive
  createWindow();

  // Rotate sold balances yearly on app start
  rotateAllSold(filePath)
    .then(() => console.log('Sold rotation done.'))
    .catch(err => console.error('Rotation failed:', err));
});

app.on('window-all-closed', () => {
  // On macOS apps generally stay active until user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On macOS re-create window when dock icon is clicked and no windows are open
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC handlers

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

    // 1. Update Excel file and get result
    const result = writeExcel(filePath, payload.ns, payload.duration, payload.from, payload.to);

    if (!result.success) {
      console.warn('update-conge failed:', result.reason);
      return result;
    }

    // 2. Re-read the updated employee data
    const updatedAgent = await readExcel(filePath, payload.ns);

    if (!updatedAgent) {
      console.error('update-conge: Could not find updated employee after write');
      return { success: false, reason: 'not-found-after-update' };
    }

    // 3. Generate Word doc synchronously
    const docPath = generateWordDoc(updatedAgent, payload.from, payload.to, payload.duration);

    console.log('update-conge: Word doc generated at:', docPath);

    // 4. Return success and doc path (optional)
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
