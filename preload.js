const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  readAgent: (ns) => {
    console.log('Preload: readAgent called with NS:', ns);
    return ipcRenderer.invoke('read-agent', ns);
  },
  updateConge: (payload) => {
    console.log('Preload: updateConge called with:', payload);
    return ipcRenderer.invoke('update-conge', payload);
  },
  addEmployee: (employee) => {
    console.log('Preload: addEmployee called:', employee);
    return ipcRenderer.invoke('add-employee', employee);
  },
  deleteEmployee: (ncin) => {
    console.log('Preload: deleteEmployee called for NS:', ncin);
    return ipcRenderer.invoke('delete-employee', ncin);
  },
  getAllEmployees: (params) => {
    console.log('Preload: getAllEmployees called with params:', params);
    return ipcRenderer.invoke('get-all-employees', params);
  },
});
