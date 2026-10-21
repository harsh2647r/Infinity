/**
 * Intelligent Image Preprocessor & Multi-Stage Medicine Extractor
 * Optimized for real-world phone camera photos of medicine strips, boxes, and handwritten scripts.
 */

// Common medical stopwords in Indian prescriptions
const MEDICAL_STOPWORDS = new Set([
  "rx", "tab", "tab.", "tabs", "tablet", "tablets",
  "cap", "cap.", "caps", "capsule", "capsules",
  "syp", "syp.", "syrup", "inj", "inj.", "injection",
  "oint", "ointment", "gel", "cream", "drops", "eye", "ear",
  "1-0-1", "1-0-0", "0-1-0", "0-0-1", "1-1-1", "1-0-1-1", "0-0-0-1",
  "od", "bd", "tds", "qid", "hs", "sos", "stat", "po", "prn", "pc", "ac",
  "bbf", "abf", "daily", "times", "day", "days", "night", "morning",
  "afternoon", "evening", "meal", "meals", "food", "water", "take",
  "dr", "dr.", "doctor", "patient", "name", "age", "gender", "sex", "date",
  "sig", "sign", "wt", "bp", "temp", "pulse", "hospital", "clinic",
  "mg", "mcg", "ml", "gm", "iu"
]);

function levenshteinDistance(s1, s2) {
  if (!s1) return s2 ? s2.length : 0;
  if (!s2) return s1.length;
  const a = s1.toLowerCase();
  const b = s2.toLowerCase();
  const d = [];
  for (let i = 0; i <= a.length; i++) d[i] = [i];
  for (let j = 0; j <= b.length; j++) d[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1,
        d[i][j - 1] + 1,
        d[i - 1][j - 1] + cost
      );
    }
  }
  return d[a.length][b.length];
}

function stringSimilarity(s1, s2) {
  if (!s1 || !s2) return 0;
  const a = s1.toLowerCase().trim();
  const b = s2.toLowerCase().trim();
  if (a === b) return 1;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  const dist = levenshteinDistance(a, b);
  return 1 - dist / maxLen;
}

/**
 * Preprocesses an image on HTML5 canvas:
 * 1. Resizes to 1400px max (preserves 35px+ letter height for cursive scripts)
 * 2. Enhances contrast using dynamic range stretching and ink sharpening
 * 3. Suppresses paper texture and shadow to make ink strokes stand out clearly
 */
export function preprocessPrescriptionImage(imageElement, options = {}) {
  const { enhance = true } = options;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });

  const width = imageElement.naturalWidth || imageElement.width || 800;
  const height = imageElement.naturalHeight || imageElement.height || 600;

  // Max dimension 1400px keeps handwriting strokes clear and legible for Tesseract
  const maxDim = 1400;
  let scale = 1;
  if (width > maxDim || height > maxDim) {
    scale = Math.min(maxDim / width, maxDim / height);
  }

  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);

  ctx.drawImage(imageElement, 0, 0, canvas.width, canvas.height);

  if (!enhance) {
    return canvas.toDataURL("image/jpeg", 0.92);
  }

  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;

  // 1. Find min and max luminance for auto-exposure dynamic range stretching
  let minLum = 255;
  let maxLum = 0;

  for (let i = 0; i < data.length; i += 8) {
    const lum = (data[i] * 77 + data[i + 1] * 150 + data[i + 2] * 29) >> 8;
    if (lum < minLum) minLum = lum;
    if (lum > maxLum) maxLum = lum;
  }

  const range = Math.max(maxLum - minLum, 40);

  // 2. Apply dynamic contrast stretching and clean paper thresholding
  for (let i = 0; i < data.length; i += 4) {
    const lum = (data[i] * 77 + data[i + 1] * 150 + data[i + 2] * 29) >> 8;

    // Normalize between 0 and 255 based on actual image light range
    let stretched = Math.round(((lum - minLum) / range) * 255);
    stretched = Math.max(0, Math.min(255, stretched));

    // Contrast boost: whiten paper background (> 175) and darken pen ink (< 135)
    let adjusted = stretched;
    if (stretched > 175) {
      adjusted = Math.min(255, stretched + 35);
    } else if (stretched < 135) {
      adjusted = Math.max(0, stretched - 30);
    }

    data[i] = adjusted;
    data[i + 1] = adjusted;
    data[i + 2] = adjusted;
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas.toDataURL("image/jpeg", 0.92);
}

/**
 * Extracts verified Indian medicines from noisy OCR text using multi-word n-grams,
 * medical stopword filtering, OCR character normalization, and fuzzy Levenshtein matching.
 */
export function extractMedicinesFromOcr(rawText = "", database = []) {
  if (!rawText || !database || database.length === 0) return [];

  // 1. Extract all dosage numbers found in the text (e.g. 650, 625, 500, 40, 20, 10, 5)
  const numbersFound = (rawText.match(/\b\d+(\.\d+)?\b/g) || []).map((n) => n.trim());

  // 2. Clean raw text into distinct words & filter out punctuation and medical stopwords
  const rawTokens = rawText
    .replace(/[-_/\\|:;,~*+?!()[\]{}<>"]/g, " ")
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);

  const cleanTokens = rawTokens.filter((t) => !MEDICAL_STOPWORDS.has(t));

  // 3. Build 1-token, 2-token, and 3-token candidate phrases
  const candidatePhrases = [];
  for (let i = 0; i < cleanTokens.length; i++) {
    candidatePhrases.push(cleanTokens[i]);
    if (i + 1 < cleanTokens.length) {
      candidatePhrases.push(`${cleanTokens[i]} ${cleanTokens[i + 1]}`);
    }
    if (i + 2 < cleanTokens.length) {
      candidatePhrases.push(`${cleanTokens[i]} ${cleanTokens[i + 1]} ${cleanTokens[i + 2]}`);
    }
  }

  // Also build OCR-normalized candidate phrases (where '1' is replaced by 'l', '0' by 'o', etc.)
  const normalizedPhrases = candidatePhrases.map((phrase) => {
    return phrase
      .replace(/1/g, "l")
      .replace(/0/g, "o")
      .replace(/5(?=[a-z])/g, "s");
  });

  const allCandidatePhrases = Array.from(new Set([...candidatePhrases, ...normalizedPhrases]));

  const scoredMap = new Map();

  for (const med of database) {
    let bestScore = 0;
    let bestClue = "";

    // Check strength and brand names against extracted numbers
    const medNumbers = (med.strength + " " + med.brandNames.join(" ")).match(/\b\d+(\.\d+)?\b/g) || [];
    const hasDosageMatch = numbersFound.some((n) => medNumbers.includes(n));

    // A. Check Brand Names
    for (const brand of med.brandNames) {
      const bLower = brand.toLowerCase().replace(/[-_/\\|:;,]/g, " ").trim();
      const bMainWord = bLower.split(/\s+/)[0]; // e.g. "dolo" from "dolo 650"

      for (const phrase of allCandidatePhrases) {
        // Exact brand match
        if (bLower === phrase) {
          const score = 1.0 + (hasDosageMatch ? 0.2 : 0);
          if (score > bestScore) {
            bestScore = score;
            bestClue = `Exact brand match: ${brand}`;
          }
          continue;
        }

        // Main word match (e.g. "dolo" === "dolo" or "pan" === "pan")
        if (bMainWord === phrase && phrase.length >= 3) {
          const score = 0.85 + (hasDosageMatch ? 0.25 : 0);
          if (score > bestScore) {
            bestScore = score;
            bestClue = `Brand root "${bMainWord}"` + (hasDosageMatch ? ` with ${numbersFound.join("/")}mg` : "");
          }
          continue;
        }

        // Fuzzy similarity against full brand or main word
        if (phrase.length >= 3) {
          const simFull = stringSimilarity(phrase, bLower);
          const simMain = stringSimilarity(phrase, bMainWord);
          const sim = Math.max(simFull, simMain);

          if (sim >= 0.70) {
            const score = sim * 0.9 + (hasDosageMatch ? 0.25 : 0);
            if (score > bestScore) {
              bestScore = score;
              bestClue = `Fuzzy brand "${phrase}" ≈ "${brand}" (${Math.round(sim * 100)}%)`;
            }
          }
        }
      }
    }

    // B. Check Generic Molecule
    const genLower = med.genericMolecule.toLowerCase().replace(/[-_/\\|:;,]/g, " ").trim();
    const genWords = genLower.split(/\s+/).filter((w) => w.length >= 4);

    for (const phrase of allCandidatePhrases) {
      if (phrase.length >= 4) {
        for (const gw of genWords) {
          const sim = stringSimilarity(phrase, gw);
          if (sim >= 0.75) {
            const score = sim * 0.85 + (hasDosageMatch ? 0.2 : 0);
            if (score > bestScore) {
              bestScore = score;
              bestClue = `Molecule "${phrase}" ≈ "${gw}"`;
            }
          }
        }
      }
    }

    // C. Fallback: If dosage matched a unique high-value dosage (e.g. 650, 625)
    if (bestScore === 0 && hasDosageMatch) {
      if (numbersFound.includes("650") && medNumbers.includes("650")) {
        bestScore = 0.75;
        bestClue = "Dosage match: 650mg";
      } else if (numbersFound.includes("625") && medNumbers.includes("625")) {
        bestScore = 0.75;
        bestClue = "Dosage match: 625mg";
      }
    }

    if (bestScore >= 0.70) {
      scoredMap.set(med.id, {
        med,
        score: bestScore,
        clue: bestClue
      });
    }
  }

  return Array.from(scoredMap.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((item) => ({
      ...item.med,
      ocrConfidence: Math.min(100, Math.round(item.score * 100)),
      ocrClue: item.clue
    }));
}
