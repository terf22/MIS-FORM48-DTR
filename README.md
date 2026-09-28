# 🏫 Mangusu Integrated School — CSC Form 48 Daily Time Record (DTR) Portal

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/React-19.0-61dafb.svg?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178c6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.2-646cff.svg?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8.svg?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![DepEd & CSC Compliant](https://img.shields.io/badge/Compliance-CSC%20Form%2048-emerald.svg)](https://www.csc.gov.ph/)

An automated, DepEd and Civil Service Commission (CSC) compliant **Daily Time Record (DTR) and Biometrics Attendance Management System** customized for **Mangusu Integrated School**.

Designed to replace manual paper logbooks and fragmented spreadsheets with a modern, tamper-resistant digital timekeeping, leave processing, and batch CSC Form 48 generation platform.

---

## 🌟 Key Features

### 📋 1. Standard CSC Form 48 Generation & Batch Printing
* **Exact CSC Form 48 Layout**: Standard legal Philippine government format with official school header, employee details, and morning/afternoon in-and-out columns.
* **Dual-Slip Printable Form**: Standard 2-copies per page layout ready for direct printing or high-resolution PDF download.
* **Automatic Undertime & Tardiness Computation**: Accurately calculates minutes of tardiness and undertime based on official prescribed school hours.
* **School Head / Principal Certification Block**: Formal signature line for the School Principal / In-Charge certifying the accuracy of daily time records.

### ⏱️ 2. Biometric Kiosk Mode & Real-Time Attendance
* **School Gate / Faculty Room Kiosk**: High-contrast, easy-to-use digital terminal for faculty and non-teaching staff check-in/check-out.
* **Four-Punch Tracking**: AM Arrival, AM Departure, PM Arrival, and PM Departure with duplicate punch prevention.
* **Quick ID & PIN Authentication**: Fast personnel identification with quick search and confirmation sound/feedback.
* **Overtime & Compensatory Time-Off (CTO)**: Support for tracking authorized weekend or after-hours service.

### 👥 3. Personnel & Faculty Management
* **Comprehensive Faculty Directory**: Profiles with DepEd Employee ID, Plantilla Position, Department (Elementary, JHS, SHS, Admin Staff), and Employment Status.
* **Custom Official Working Hours**: Set regular teaching loads, administrative schedules, or shifting hours per employee.
* **Conflict & Anomaly Detection**: Flags overlapping logs, missed punches, and weekend logs requiring justification.

### 📝 4. Leave & Official Business (OB) Management
* **Civil Service Leave Types**: Sick Leave, Vacation Leave, Mandatory Forced Leave, Special Privilege Leave (SPL), Maternity/Paternity Leave, and Solo Parent Leave.
* **Official Business (OB) Passes**: Track official travel orders, seminars, and division meetings with automatic time credit.
* **Leave Ledger & Balances**: Visual balance tracker and approval workflow.

### 📊 5. Analytics & Administrative Reporting
* **Monthly Attendance Summary**: Real-time rate of attendance, tardiness trends, and absenteeism heatmaps.
* **One-Click Excel / CSV Export**: Generate division-ready attendance summaries for payroll (Form 7).
* **Backup & Restore**: Offline JSON snapshot creation and full database import/export for disaster recovery.

### 🌐 6. Multi-Language Support
* Built-in dynamic localization supporting **English**, **Filipino (Tagalog)**, **Cebuano (Bisaya)**, and **Ilokano**.

---

## 🛠️ Tech Stack

* **Frontend Framework**: [React 19](https://react.dev/)
* **Language**: [TypeScript](https://www.typescriptlang.org/) (Strict typing)
* **Build Tool**: [Vite](https://vitejs.dev/) (Rapid HMR & optimized production bundling)
* **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
* **Icons**: [Lucide React](https://lucide.dev/)
* **Charts & Analytics**: [Recharts](https://recharts.org/)
* **PDF & Printing**: [jsPDF](https://github.com/parallax/jsPDF) & [html2canvas](https://html2canvas.hertzen.com/)
* **Spreadsheet Processing**: [XLSX (SheetJS)](https://sheetjs.com/)

---

## 🚀 Quick Start (Local Setup)

### Prerequisites
* **Node.js**: version `18.0.0` or higher (Node 20+ recommended)
* **Package Manager**: `npm`, `pnpm`, `yarn`, or `bun`

### 1. Clone the repository
```bash
git clone https://github.com/<your-username>/mangusu-is-csc-form-48-dtr.git
cd mangusu-is-csc-form-48-dtr
```

### 2. Install dependencies
```bash
npm install
```

### 3. Start development server
```bash
npm run dev
```
Open your browser and navigate to `http://localhost:3000`.

### 4. Build for production
```bash
npm run build
```
The optimized production bundle will be generated in the `dist/` directory.

### 5. Preview production build
```bash
npm run preview
```

---

## 📤 How to Publish to Your GitHub Account

Follow these quick steps in your terminal to publish this codebase to your own GitHub profile or organization:

### Step 1: Create a new repository on GitHub
1. Log in to [GitHub](https://github.com).
2. Click the **+** (New) icon in the top right corner and select **New repository**.
3. Set the repository name to `mangusu-is-csc-form-48-dtr` (or your preferred name).
4. Choose **Public** or **Private**.
5. **Do NOT** initialize with a README, .gitignore, or license (these are already configured in this repository).
6. Click **Create repository**.

### Step 2: Initialize Git and Push from Local Directory
Run the following commands in the project root directory:

```bash
# 1. Initialize local git repository
git init

# 2. Add all project files
git add .

# 3. Create your initial commit
git commit -m "feat: initial commit for Mangusu Integrated School CSC Form 48 DTR Portal"

# 4. Set default branch to main
git branch -M main

# 5. Link your GitHub remote repository (replace with your actual GitHub repository URL)
git remote add origin https://github.com/<YOUR-USERNAME>/mangusu-is-csc-form-48-dtr.git

# 6. Push code to GitHub
git push -u origin main
```

---

## 🌐 Deployment Options

### Option A: GitHub Pages (Automated via GitHub Actions)
A pre-configured GitHub Actions workflow (`.github/workflows/deploy-pages.yml`) is included in this repository.
1. In your GitHub repository, go to **Settings** > **Pages**.
2. Under **Build and deployment** > **Source**, select **GitHub Actions**.
3. Push changes to the `main` branch. GitHub Actions will automatically build and publish your site.

### Option B: Vercel
1. Install the Vercel CLI: `npm i -g vercel` or link your repository on [vercel.com](https://vercel.com).
2. Framework Preset: **Vite**
3. Build Command: `npm run build`
4. Output Directory: `dist`

### Option C: Netlify
1. Connect repository on [netlify.com](https://www.netlify.com).
2. Build Command: `npm run build`
3. Publish Directory: `dist`

---

## 📁 Project Structure

```text
├── .github/
│   ├── ISSUE_TEMPLATE/        # Standard GitHub issue templates
│   └── workflows/
│       ├── ci.yml             # Continuous integration (typecheck & build)
│       └── deploy-pages.yml   # Automatic GitHub Pages deployment
├── assets/                    # Static branding and icons
├── src/
│   ├── components/            # Modular React components
│   │   ├── AttendanceClock.tsx
│   │   ├── CSCForm48Modal.tsx # Standard CSC Form 48 printable viewer
│   │   ├── DailyLogTable.tsx
│   │   ├── FacultyList.tsx
│   │   ├── KioskMode.tsx      # Terminal attendance screen
│   │   ├── LeaveManagement.tsx
│   │   ├── Navbar.tsx
│   │   ├── Reports.tsx        # Statistical and analytical reports
│   │   └── SettingsModal.tsx
│   ├── data/                  # Mock data, schedules, and seed records
│   ├── types.ts               # Core TypeScript definitions & models
│   ├── utils/                 # DTR calculations, PDF export, Excel helpers
│   ├── App.tsx                # Main application orchestrator
│   ├── index.css              # Tailwind CSS styles & print rules
│   └── main.tsx               # React application entry point
├── .env.example               # Example environment variables
├── .gitignore                 # Standard git exclusions
├── index.html                 # Application HTML entry point & SEO metadata
├── LICENSE                    # MIT Open Source License
├── package.json               # Dependencies and build scripts
├── README.md                  # Project documentation
├── tsconfig.json              # TypeScript configuration
└── vite.config.ts             # Vite build configuration
```

---

## 🏛️ Government Compliance & Specifications

* **Civil Service Commission (CSC)**: Memorandum Circular No. 21, s. 1991 (Prescribed Daily Time Record Form 48).
* **Department of Education (DepEd)**: DepEd Order No. 23, s. 2021 & relevant CSC omnibus rules on attendance, undertime, and leave administration.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE) — free for use, modification, and deployment by Mangusu Integrated School and educational institutions.
