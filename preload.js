const { contextBridge, ipcRenderer } = require('electron');

// Performance optimization: Cache for IPC calls
const ipcCache = new Map();
const CACHE_TTL = 30000; // 30 seconds

function getCachedResult(key) {
  const cached = ipcCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  return null;
}

function setCachedResult(key, data) {
  ipcCache.set(key, { data, timestamp: Date.now() });
  
  // Clean old cache entries
  if (ipcCache.size > 100) {
    const oldestKey = ipcCache.keys().next().value;
    ipcCache.delete(oldestKey);
  }
}

contextBridge.exposeInMainWorld('electron', {
  readAgent: async (ns) => {
    console.log('Preload: readAgent called with NS:', ns);
    const cacheKey = `readAgent_${ns}`;
    const cached = getCachedResult(cacheKey);
    
    if (cached) {
      console.log('Returning cached result for readAgent');
      return cached;
    }
    
    const result = await ipcRenderer.invoke('read-agent', ns);
    setCachedResult(cacheKey, result);
    return result;
  },
  updateConge: (payload) => {
    console.log('Preload: updateConge called with:', payload);
    // Clear cache after updates
    Array.from(ipcCache.keys()).forEach(key => {
      if (key.startsWith('getAllEmployees') || key.startsWith('readAgent')) {
        ipcCache.delete(key);
      }
    });
    return ipcRenderer.invoke('update-conge', payload);
  },
  addEmployee: (employee) => {
    console.log('Preload: addEmployee called:', employee);
    // Clear cache after updates
    Array.from(ipcCache.keys()).forEach(key => {
      if (key.startsWith('getAllEmployees')) {
        ipcCache.delete(key);
      }
    });
    return ipcRenderer.invoke('add-employee', employee);
  },
  deleteEmployee: (ncin) => {
    console.log('Preload: deleteEmployee called for NS:', ncin);
    // Clear cache after updates
    Array.from(ipcCache.keys()).forEach(key => {
      if (key.startsWith('getAllEmployees')) {
        ipcCache.delete(key);
      }
    });
    return ipcRenderer.invoke('delete-employee', ncin);
  },
  getAllEmployees: async (params) => {
    console.log('Preload: getAllEmployees called with params:', params);
    const cacheKey = `getAllEmployees_${JSON.stringify(params)}`;
    const cached = getCachedResult(cacheKey);
    
    if (cached) {
      console.log('Returning cached result for getAllEmployees');
      return cached;
    }
    
    const result = await ipcRenderer.invoke('get-all-employees', params);
    setCachedResult(cacheKey, result);
    return result;
  },
  bulkUpdateConge: (payload) => {
    console.log('Preload: bulkUpdateConge called:', payload);
    // Clear cache after bulk updates
    ipcCache.clear();
    return ipcRenderer.invoke('bulk-update-conge', payload);
  }
});
