const XLSX = require('xlsx');
const fs = require('fs');

const cache = {};

function readCachedExcel(filePath) {
  const stats = fs.statSync(filePath);
  const mtime = stats.mtimeMs;

  if (!cache[filePath] || cache[filePath].mtime !== mtime) {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
    cache[filePath] = { data: sheetData, mtime };
  }
  return cache[filePath].data;
}

function writeCachedExcel(filePath, data) {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Feuille1');
  XLSX.writeFile(wb, filePath);

  const stats = fs.statSync(filePath);
  cache[filePath] = { data, mtime: stats.mtimeMs };
}

function invalidateCache(filePath) {
  delete cache[filePath];
}

module.exports = {
  readCachedExcel,
  writeCachedExcel,
  invalidateCache
};
