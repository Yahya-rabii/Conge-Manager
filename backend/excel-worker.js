// excel-worker.js

const { parentPort, workerData } = require('worker_threads');

(async () => {
  try {
    // Lazy-load modules for faster worker startup
    const XLSX = require('xlsx');
    const fs = require('fs').promises;
    const { action, filePath, data } = workerData;

    if (action === 'write') {
      const workbook = XLSX.utils.book_new();
      const sheet = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(workbook, sheet, 'Sheet1');
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      await fs.writeFile(filePath, buffer);
      parentPort.postMessage({ success: true });

    } else if (action === 'read') {
      const buffer = await fs.readFile(filePath);
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      // Use raw: true for faster conversion if you don't need type parsing
      const json = XLSX.utils.sheet_to_json(sheet, { raw: true });
      parentPort.postMessage({ success: true, data: json });

    } else {
      throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    parentPort.postMessage({ success: false, error: error.message });
  } finally {
    // Ensure worker exits after task
    process.exit();
  }
})();
