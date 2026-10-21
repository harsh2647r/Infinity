# Dawai Sahi (दवाई सही)
> **"Make the cost of medicine visible before it is paid."**  
> Problem Statement 3: Pharmacy Retail — *The Prescription You Cannot Read*

---

## 💡 The Problem

A patient is handed a doctor's prescription filled with expensive brand names, takes it to a chemist, and pays whatever they are told. For a large share of those drugs, an identical generic exists at a fraction of the price — the same active molecule, identical strength, but a different name on the box. Government **Jan Aushadhi Kendras (PMBJP)** stock these drugs and publish their prices openly.

However, patients rarely know the molecule, cannot read the handwriting, and are hesitant to argue at the counter. That price gap is paid in hard cash by the people least able to afford it.

---

## ✨ Features Built for Judges

### 1. Headline Savings First (`"₹240 → ₹28"`)
- The headline saving is the product; everything else is detail.
- Prominently showcases the exact price drop, percentage savings (up to 88% cheaper), and per-pack/per-tablet economics.

### 2. Resilient Fuzzy Matching Engine
- Tolerate typos, misspellings, missing dosages, and half-remembered names.
- Try searching:
  - `dolo` or `dollo 650` → matches **Dolo 650 (Paracetamol)**
  - `augmntin` → matches **Augmentin 625 Duo (Amoxicillin + Clavulanate)**
  - `pan 40` or `pan d` → matches **Pan D (Pantoprazole + Domperidone) — ₹240 → ₹28**
  - `glycomt` → matches **Glycomet (Metformin)**
  - `telma 40` → matches **Telma 40 (Telmisartan)**

### 3. Whole Prescription Basket (Total Rx Calculator)
- Patients rarely take just one medicine. Add multiple drugs from a single prescription slip into the basket.
- Real-time aggregate calculation: e.g., **"Branded Total: ₹1,480 → Jan Aushadhi Total: ₹210 · Save ₹1,270 (86%)"**.
- Projects annual savings for chronic medications (e.g., Save ₹15,240/year).

### 4. Printable Counter Slip for Pharmacist
- One-click print sheet formatted specifically for patients to hand across the counter to a local chemist or Jan Aushadhi Kendra operator.
- Lists Prescribed Brand, Generic Molecule, Strength, Jan Aushadhi Drug Code, and official MRP, along with pharmacist substitution instructions.

### 5. Printed Strip & Box OCR Scanner
- Camera & file upload scanner powered by client-side OCR (`tesseract.js`) to read printed brand names directly off foil blister strips and medicine boxes.
- 1-click test samples included directly in the modal for quick live demonstrations.

### 6. Jan Aushadhi Kendra Locator
- Instant search by City or 6-digit Pincode.
- Displays store name, full address, landmark, operating hours, contact phone, and Google Maps directions link.
- Highlights the National PMBJP Toll-Free Helpline: `1800-180-8080`.

### 7. Clear Medical & Regulatory Disclaimer
- Prominently featured on search results, printouts, and footer, complying with NPPA and medical standards: *Price & molecule transparency only, not medical advice. Never substitute medicines without consulting a doctor or pharmacist.*

### 8. 100% Offline Reliability (Zero External API Tokens Required)
- Ships with a curated, high-accuracy database of **120+ top Indian formulations** covering pain/fever, antibiotics, cardiovascular, diabetes, gastrointestinal, respiratory, mental health, vitamins, dermatological, and ophthalmic therapies.
- Zero server setup or external token failures.

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd dawai-sahi
npm install
```

### 2. Run the Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Production Build
```bash
npm run build
npm run start
```

---

## 🛠 Tech Stack

- **Framework**: Next.js (React 19, Turbopack)
- **Styling**: Tailwind CSS & Lucide Icons
- **Fuzzy Search Core**: Custom multi-tier Levenshtein + token n-gram similarity engine
- **OCR Engine**: Tesseract.js
- **Micro-Interactions**: Canvas-confetti for savings celebrations
- **Data Sources**: Official PMBI Jan Aushadhi Product & Price Catalog, NPPA Ceiling Price Benchmarks
