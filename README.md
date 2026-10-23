# Rentora: Boarding House Utility & Rent Management System

Rentora is a web application built for boarding house managers to automate utility splitting, sub-meter electricity calculations, and rent payment tracking. It replaces manual notebook calculations with automatic rate computation and digital payment records.

---

## 1. Project Purpose

**Target User:** Ate Elena (a 58-year-old boarding house manager handling 10 active rooms manually).  
**The Problem:** Manual sub-meter readings and paper records lead to wrong calculations, lost income when electricity usage is not fully charged, and messy payment records.  
**The Solution:** Rentora calculates room-level utility charges using the master electric bill and individual room readings, issues digital receipts, and tracks payments in real time.

---

## 2. Core Features

- **Custom SVG Branding & Logo:** Integrated vector logo featuring an Emerald Green (`#059669`) badge, sub-meter electric dial arc motif, and Dark Slate (`#0F172A`) stylized 'R'.
- **User Authentication Portal:** Sign in with a username and password, toggle password visibility, register a new tenant account, or reset a forgotten password.
- **Master Electric & Water Rate Calculator:** Computes the exact power rate per kilowatt-hour (kWh) from the main electric bill and sets a fixed water fee per head.
- **Tenants & Rooms Management:** Add, search, and remove room tenant records with base monthly rent and starting sub-meter readings.
- **Sub-Meter Consumption Math & Live Preview:** Calculates exact kWh used (`Current Reading - Previous Reading`), blocks negative readings, and includes an OCR camera scan simulator.
- **Digital Receipts, SMS Reminders & Payment Tracking:** Generates printable statements of account, copies formatted SMS bill reminders, and records Cash, GCash, or Bank payments (supporting both partial and full payments).
- **Dual-Storage Database Architecture:** Connects to a live **PHP + MySQL** backend when available, while seamlessly falling back to browser `localStorage` for offline or static hosting on GitHub Pages.
- **Interactive Memoji Guide:** Features an animated "Ate Elena" guide that tracks mouse movement and displays helpful instructions when pointing at buttons or cards.

---

## 3. How to Run the Project Locally

Because Rentora is built with standard HTML5, Tailwind CSS (via CDN), and Vanilla JavaScript, it does not require complex Node.js build steps to run.

### Option A: Open Directly in Any Web Browser (Fastest)
1. Download or clone this repository to your computer.
2. Locate the `index.html` file in the project folder.
3. Double-click `index.html` to open it in Google Chrome, Microsoft Edge, Mozilla Firefox, or Safari.
4. Make sure you have an active internet connection on the first load so the Tailwind CSS stylesheet (`https://cdn.tailwindcss.com`) can load.

### Option B: Run Using Visual Studio Code (Live Server)
1. Open Visual Studio Code.
2. Click **File > Open Folder** and select the project folder.
3. Install the **Live Server** extension by Ritwick Dey from the VS Code Extensions tab.
4. Right-click `index.html` in the file explorer and click **Open with Live Server**.
5. Your browser will open the site automatically at `http://127.0.0.1:5500/index.html`.

### Option C: Clone via Git Terminal
```bash
git clone https://github.com/your-username/rentora-app.git
cd rentora-app
```