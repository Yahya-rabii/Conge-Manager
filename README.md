# 🗂️ Congé Manager – Leave Management Desktop App

A desktop application for managing employee leave requests (congés) built using **Electron**, **Angular 17**, and **Node.js**. It reads and updates an Excel file to track employee balances, generates official Word documents for requests, and provides a clean and interactive interface.

---

## 🚀 Features

- 📋 Search employees by NS or NCIN  
- 🧮 Automatic leave balance calculation and yearly rollover  
- 📤 Generate signed Word leave request documents  
- 🧑‍💼 Add or delete employees from the Excel file  
- 🧠 Offline-first, fast desktop experience  
- 📁 Simple data storage in local Excel files  

---

## 🏗️ Tech Stack

- **Frontend:** Angular 17 + TailwindCSS / J-WingCSS  
- **Backend:** Node.js + XLSX + Docxtemplater  
- **Desktop:** Electron  
- **File Format:** Excel (`.xlsx`) for data, Word (`.docx`) for document output  

---

## 📦 Installation & Build

### Clone the repository and install dependencies:

```bash
git clone https://github.com/YOUR_USERNAME/conge-manager.git
cd conge-manager
npm install
````

### Install frontend dependencies, build Angular app, and start Electron for development:

```bash
cd frontend
npm install
npm run build
cd ..
npx electron .
```

---

### Build the executable installer for Windows:

```bash
cd conge-manager
npm install
cd frontend
npm install
npm run build
cd ..
npx electron-builder
```

---

### After building:

Copy the necessary data files into the packaged app folder:

* Copy the entire `data/db/employes.xlsx` file
* Copy the entire `data/templates/FORMULAIRE-conge.docx` file

from the repository's `data/` directory into the `dist/win-unpacked/data/` folder inside your built app directory.

Your final folder structure inside `dist/win-unpacked` should look like this:

```
dist/
└── win-unpacked/
    ├── data/
    │   ├── db/
    │   │   └── employes.xlsx
    │   └── templates/
    │       └── FORMULAIRE-conge.docx
    └── ... (other app files)
```

---

## 📝 Usage

* Launch the app executable.
* Search employees by NS or NCIN.
* Request leave (congé) and generate official documents.
* Add or delete employees as needed.
* Data is stored and updated in the Excel file.

---

## ⚙️ Configuration

* The app expects data files (`employes.xlsx` and `FORMULAIRE-conge.docx`) to be in the `data/db` and `data/templates` folders respectively.
* Customize your data files before building or place updated files after building in the `dist/win-unpacked/data` folder.

---

## 🙌 Contributions

Feel free to fork, open issues, and submit pull requests to improve this project!

---

