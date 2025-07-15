const XLSX = require('xlsx');
const fs = require('fs').promises; // Use promise-based fs for better performance
const fsSync = require('fs'); // Keep sync version for compatibility
const path = require('path');
const { app } = require('electron');
const { format, parse } = require('date-fns');
const PizZip = require('pizzip');
const { calculateCongeDuration } = require('./conge-utils');

// Performance optimization: Cache layer
const cache = {
  data: null,
  lastModified: null,
  filePath: null
};

// Performance optimization: Batch operations queue
const batchQueue = [];
let batchTimeout = null;

// Utility: get output folder
function getOutputFolder() {
  return app.isPackaged
    ? path.join(app.getPath('documents'), 'CongeDocs')
    : path.join(__dirname, '../data/decisions_conge');
}

// Template path
function getTemplatePath() {
  return path.join(__dirname, '../data/templates/FORMULAIRE-conge.docx');
}

// Yearly rollover
function rotateSoldByYear(sheetData, currentYear) {
  sheetData.forEach(emp => {
    const lastUpdated = parseInt(emp.LAST_UPDATED_YEAR || 0);
    if (lastUpdated < currentYear) {
      emp['SOLDE_Y-2'] = 0;
      emp['SOLDE_Y-1'] = parseInt(emp['SOLDE_Y'] || 0);
      emp['SOLDE_Y'] = 0;
      emp['LAST_UPDATED_YEAR'] = currentYear;
    }
    emp['SOLDE'] = parseInt(emp['SOLDE_Y'] || 0) + parseInt(emp['SOLDE_Y-1'] || 0);
  });
}

// Performance optimized Excel reader with caching
async function readExcel(filePath, ns) {
  try {
    // Check cache validity
    const stats = await fs.stat(filePath);
    const fileModified = stats.mtime.getTime();
    
    if (cache.data && cache.filePath === filePath && cache.lastModified === fileModified) {
      // Return from cache
      return cache.data.find(emp => String(emp.NS).trim() === String(ns).trim()) || null;
    }

    // Read file asynchronously if possible
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet);

    const currentYear = new Date().getFullYear();
    let dataChanged = false;
    
    // Only rotate if needed
    data.forEach(emp => {
      const lastUpdated = parseInt(emp.LAST_UPDATED_YEAR || 0);
      if (lastUpdated < currentYear) {
        emp['SOLDE_Y-2'] = 0;
        emp['SOLDE_Y-1'] = parseInt(emp['SOLDE_Y'] || 0);
        emp['SOLDE_Y'] = 0;
        emp['LAST_UPDATED_YEAR'] = currentYear;
        dataChanged = true;
      }
      emp['SOLDE'] = parseInt(emp['SOLDE_Y'] || 0) + parseInt(emp['SOLDE_Y-1'] || 0);
    });

    // Only write if data changed
    if (dataChanged) {
      await saveExcelData(filePath, data);
    }

    // Update cache
    cache.data = data;
    cache.lastModified = fileModified;
    cache.filePath = filePath;

    return data.find(emp => String(emp.NS).trim() === String(ns).trim()) || null;
  } catch (error) {
    console.error('Error reading Excel file:', error);
    throw error;
  }
}

// Optimized Excel writer
async function saveExcelData(filePath, data) {
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(workbook, sheet, 'Sheet1');
  XLSX.writeFile(workbook, filePath);
  
  // Update cache
  const stats = await fs.stat(filePath);
  cache.data = data;
  cache.lastModified = stats.mtime.getTime();
  cache.filePath = filePath;
}

// Update Excel after congé request
const writeExcel = async (filePath, ns, duration, from, to) => {
  try {
    duration = Number(duration);
    if (isNaN(duration) || duration <= 0) return { success: false, reason: 'invalid-duration' };

    // Use cached data if available
    let data;
    const stats = await fs.stat(filePath);
    const fileModified = stats.mtime.getTime();
    
    if (cache.data && cache.filePath === filePath && cache.lastModified === fileModified) {
      data = [...cache.data]; // Clone to avoid mutations
    } else {
      const workbook = XLSX.readFile(filePath);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      data = XLSX.utils.sheet_to_json(sheet);
    }

    const index = data.findIndex(emp => String(emp.NS).trim() === String(ns).trim());
    if (index === -1) return { success: false, reason: 'not-found' };

    const emp = data[index];
    let soldeY = parseInt(emp['SOLDE_Y'] || 0);
    let soldeY_1 = parseInt(emp['SOLDE_Y-1'] || 0);
    let remaining = duration;

    if (soldeY + soldeY_1 < remaining) return { success: false, reason: 'not-enough-sold' };

    const requestKey = `${from.trim()}_${to.trim()}`;
    if ((emp['HISTORY'] || '').includes(requestKey)) return { success: false, reason: 'duplicate' };

    if (soldeY >= remaining) {
      soldeY -= remaining;
    } else {
      remaining -= soldeY;
      soldeY = 0;
      soldeY_1 = Math.max(0, soldeY_1 - remaining);
    }

    emp['SOLDE_Y'] = soldeY;
    emp['SOLDE_Y-1'] = soldeY_1;
    emp['SOLDE'] = soldeY + soldeY_1;
    emp['HISTORY'] = emp['HISTORY'] ? emp['HISTORY'] + `|${requestKey}` : requestKey;

    data[index] = emp;
    await saveExcelData(filePath, data);

    return { success: true };
  } catch (error) {
    console.error('writeExcel: Exception:', error);
    return { success: false, reason: 'exception' };
  }
};

// Add employee
async function addEmployee(filePath, employee) {
  try {
    // Use cached data if available
    let data;
    const stats = await fs.stat(filePath);
    const fileModified = stats.mtime.getTime();
    
    if (cache.data && cache.filePath === filePath && cache.lastModified === fileModified) {
      data = [...cache.data]; // Clone to avoid mutations
    } else {
      const workbook = XLSX.readFile(filePath);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      data = XLSX.utils.sheet_to_json(sheet);
    }

    employee['SOLDE_Y-2'] = 0;
    employee['SOLDE_Y-1'] = 0;
    employee['SOLDE_Y'] = parseInt(employee['SOLDE'] || 0);
    employee['SOLDE'] = employee['SOLDE'];
    employee['LAST_UPDATED_YEAR'] = new Date().getFullYear();

    data.push(employee);
    await saveExcelData(filePath, data);
  } catch (error) {
    console.error('Error adding employee:', error);
    throw error;
  }
}

// Delete employee
async function deleteEmployee(filePath, nsToDelete) {
  try {
    // Use cached data if available
    let data;
    const stats = await fs.stat(filePath);
    const fileModified = stats.mtime.getTime();
    
    if (cache.data && cache.filePath === filePath && cache.lastModified === fileModified) {
      data = [...cache.data]; // Clone to avoid mutations
    } else {
      const workbook = XLSX.readFile(filePath);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      data = XLSX.utils.sheet_to_json(sheet);
    }

    const filtered = data.filter(emp => String(emp.NS || '').trim() !== String(nsToDelete).trim());
    await saveExcelData(filePath, filtered);
  } catch (error) {
    console.error('Error deleting employee:', error);
    throw error;
  }
}

// Generate Word doc
function generateWordDoc(agent, from, to, duration) {
  const templatePath = getTemplatePath();
  const outputFolder = getOutputFolder();
  if (!fsSync.existsSync(outputFolder)) fsSync.mkdirSync(outputFolder, { recursive: true });

  const content = fsSync.readFileSync(templatePath, 'binary');
  const zip = new PizZip(content);

  const today = format(new Date(), 'dd/MM/yyyy');

  // ✅ FIXED: parse dates correctly in local time
  const fromDate = typeof from === 'string' ? parse(from, 'yyyy-MM-dd', new Date()) : from;
  const toDate = typeof to === 'string' ? parse(to, 'yyyy-MM-dd', new Date()) : to;

  const fromFormatted = format(fromDate, 'dd/MM/yyyy');
  const toFormatted = format(toDate, 'dd/MM/yyyy');

  const escapeXml = (unsafe) =>
    String(unsafe || '').replace(/[<>&'"]/g, c => {
      switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case '\'': return '&apos;';
        case '"': return '&quot;';
      }
    });

  const rightAligned = (text) => `
    <w:p>
      <w:pPr><w:jc w:val="right"/></w:pPr>
      <w:r><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r>
    </w:p>`;

  const emptyLine = `<w:p><w:r><w:t xml:space="preserve"></w:t></w:r></w:p>`;

  const paragraph = (text) => `
    <w:p><w:r><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r></w:p>`;

  const boldLabelLine = (label, value) => `
    <w:p>
      <w:r><w:rPr><w:b/><w:sz w:val="26"/></w:rPr><w:t xml:space="preserve">${escapeXml(label)} :</w:t></w:r>
      <w:r><w:rPr><w:sz w:val="26"/></w:rPr><w:t xml:space="preserve"> ${escapeXml(value)}</w:t></w:r>
    </w:p>`;

   const paragraphsXml = [
    `
    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:b/>
          <w:sz w:val="36"/>
        </w:rPr>
        <w:t xml:space="preserve">DECISION DE CONGE</w:t>
      </w:r>
    </w:p>`,

    emptyLine,
    emptyLine,

    paragraph(`Vu l’article 40 du Dahir n°1.11.10 du 14 rabii I 1432(18/02/2011) portant promulgation de la Loi n° 50.05 modifiant et complétant le Dahir n° 1.58.008 du 4 chaabane 1377 (24/02/1958) portant statut de la Fonction Publique ;`),

    emptyLine,

    paragraph(`Vu la demande de l’intéressé(e) :`),

    emptyLine,
    emptyLine,

    paragraph(`Article :`),

    boldLabelLine(`Mr, Mme, Melle`, `${agent.PRENOM || ''} ${agent.NOM || ''}`),
    boldLabelLine(`D.O.T.I`, agent.NS || ''),
    boldLabelLine(`Cadre`, agent.CADRE || ''),
    boldLabelLine(`Grade`, agent.GRADE || ''),
    boldLabelLine(`Fonction`, agent.FONCTION || ''),

    emptyLine,

    paragraph(`Bénéficiera d’un congé administratif à compter du :`),

    rightAligned(`${fromFormatted} AU ${toFormatted}`),

    emptyLine,

    rightAligned(`Casablanca, le : ${today}`)
  ].join('');

  const newDocumentXml = `
    <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
                xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
      <w:body>
        ${paragraphsXml}
        <w:sectPr>
          <w:headerReference w:type="default" r:id="rId8"/>
          <w:footerReference w:type="default" r:id="rId9"/>
          <w:pgSz w:w="11906" w:h="16838"/>
          <w:pgMar w:top="1560" w:right="1800" w:bottom="1701" w:left="1800" w:header="568" w:footer="1444"/>
          <w:cols w:space="708"/>
          <w:docGrid w:linePitch="360"/>
        </w:sectPr>
      </w:body>
    </w:document>`;

  zip.file('word/document.xml', newDocumentXml.trim());

  const buffer = zip.generate({ type: 'nodebuffer' });
  const filename = `decision_conge_${agent.NOM}_${agent.PRENOM}_${agent.NS}_${format(fromDate, 'yyyy-MM-dd')}_${format(toDate, 'yyyy-MM-dd')}.docx`;
  const savePath = path.join(outputFolder, filename);
  fsSync.writeFileSync(savePath, buffer);

  console.log(`📄 Document saved to: ${savePath}`);
  return savePath;
}

// Rotate sold for all employees
async function rotateAllSold(filePath) {
  return new Promise((resolve, reject) => {
    try {
      const workbook = XLSX.readFile(filePath);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(sheet);

      const currentYear = new Date().getFullYear();
      rotateSoldByYear(data, currentYear);

      const newSheet = XLSX.utils.json_to_sheet(data);
      workbook.Sheets[workbook.SheetNames[0]] = newSheet;
      XLSX.writeFile(workbook, filePath);

      console.log('✅ Sold rotation complete.');
      resolve();
    } catch (err) {
      console.error('❌ Failed to rotate sold:', err);
      reject(err);
    }
  });
}

// Bulk update - Optimized for better performance
async function writeBulkExcel(filePath, nsList, from, to) {
  try {
    // Use cached data if available
    let data;
    const stats = await fs.stat(filePath);
    const fileModified = stats.mtime.getTime();
    
    if (cache.data && cache.filePath === filePath && cache.lastModified === fileModified) {
      data = [...cache.data]; // Clone to avoid mutations
    } else {
      const workbook = XLSX.readFile(filePath);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      data = XLSX.utils.sheet_to_json(sheet);
    }

    const updatedAgents = [];
    const failedAgents = [];

    const { duration, adjustedFrom, adjustedTo } = calculateCongeDuration(from, to);
    const requestKey = `${format(adjustedFrom, 'yyyy-MM-dd')}_${format(adjustedTo, 'yyyy-MM-dd')}`;

    // Batch process employees for better performance
    for (const ns of nsList) {
      const index = data.findIndex(emp => String(emp.NS).trim() === String(ns).trim());
      if (index === -1) continue;

      const emp = data[index];
      let soldeY = parseInt(emp['SOLDE_Y'] || 0);
      let soldeY_1 = parseInt(emp['SOLDE_Y-1'] || 0);
      let remaining = duration;

      if (soldeY + soldeY_1 < remaining) {
        failedAgents.push({ ...emp, reason: 'not-enough-sold' });
        continue;
      }

      if ((emp['HISTORY'] || '').includes(requestKey)) {
        failedAgents.push({ ...emp, reason: 'duplicate' });
        continue;
      }

      if (soldeY >= remaining) {
        soldeY -= remaining;
      } else {
        remaining -= soldeY;
        soldeY = 0;
        soldeY_1 = Math.max(0, soldeY_1 - remaining);
      }

      emp['SOLDE_Y'] = soldeY;
      emp['SOLDE_Y-1'] = soldeY_1;
      emp['SOLDE'] = soldeY + soldeY_1;
      emp['HISTORY'] = emp['HISTORY'] ? emp['HISTORY'] + `|${requestKey}` : requestKey;

      data[index] = emp;
      updatedAgents.push(emp);
    }

    // Save once after all updates
    await saveExcelData(filePath, data);

    // Generate Word documents in parallel for better performance
    const documentPromises = updatedAgents.map(emp => 
      Promise.resolve().then(() => generateWordDoc(emp, adjustedFrom, adjustedTo, duration))
    );
    
    await Promise.all(documentPromises);

    return { success: true, updatedAgents, failedAgents };
  } catch (error) {
    console.error('Bulk update error:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  readExcel,
  writeExcel,
  addEmployee,
  deleteEmployee,
  generateWordDoc,
  rotateAllSold,
  writeBulkExcel
};
