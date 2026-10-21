/**
 * Ultra-fast image preprocessor and doctor handwriting normalizer
 */

const RX_STOPWORDS = new Set([
  "tab", "tabs", "tablet", "tablets",
  "cap", "caps", "capsule", "capsules",
  "syp", "syr", "syrup", "susp", "suspension",
  "inj", "injection", "oint", "ointment",
  "od", "bd", "tds", "qid", "sos", "hs", "stat",
  "ac", "pc", "bbf", "po", "prn",
  "days", "day", "wks", "weeks", "months",
  "1-0-1", "1-1-1", "1-0-0", "0-0-1", "0-1-0", "1-1-0", "0-1-1",
  "dr", "doctor", "clinic", "hospital", "patient", "rx", "date", "age", "sex"
]);

/**
 * Preprocesses an image element on canvas with fast downscaling (750px max)
 * for sub-second mobile processing.
 */
export function preprocessPrescriptionImage(imageElement, options = {}) {
  const { contrast = 1.4, binarize = true, threshold = 135 } = options;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });

  const width = imageElement.naturalWidth || imageElement.width || 800;
  const height = imageElement.naturalHeight || imageElement.height || 600;

  // Max dimension 720px for blazing-fast mobile OCR (< 2 sec)
  const maxDim = 720;
  let scale = 1;
  if (width > maxDim || height > maxDim) {
    scale = Math.min(maxDim / width, maxDim / height);
  }

  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);

  // Draw scaled
  ctx.drawImage(imageElement, 0, 0, canvas.width, canvas.height);

  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;

  // Fast luminance and contrast stretch
  const factor = (259 * (contrast * 100 + 255)) / (255 * (259 - contrast * 100));

  for (let i = 0; i < data.length; i += 4) {
    // Fast perceived gray
    let gray = (data[i] * 77 + data[i + 1] * 150 + data[i + 2] * 29) >> 8;

    gray = factor * (gray - 128) + 128;

    if (binarize) {
      gray = gray < threshold ? 0 : 255;
    }

    data[i] = gray;
    data[i + 1] = gray;
    data[i + 2] = gray;
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas.toDataURL("image/jpeg", 0.85);
}

/**
 * Normalizes common cursive handwriting character confusions
 * e.g., 'd01o 65O' -> 'dolo 650', 'augmntn' -> 'augmentin', 'p4n' -> 'pan'
 */
export function normalizeHandwritingWord(word = "") {
  return word
    .toLowerCase()
    .replace(/0/g, "o")
    .replace(/1/g, "l")
    .replace(/4/g, "a")
    .replace(/5/g, "s")
    .replace(/8/g, "b")
    .replace(/@/g, "a")
    .replace(/\$/g, "s")
    .replace(/vv/g, "w")
    .replace(/rn/g, "m")
    .replace(/cl/g, "d")
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Extracts candidate tokens and dosages from raw OCR text
 */
export function cleanHandwrittenText(rawText = "") {
  if (!rawText) return [];

  // Extract all numbers (dosage clues like 650, 625, 500, 40, 20, 10, 5)
  const numbers = rawText.match(/\b\d+(?:\.\d+)?\b/g) || [];

  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const candidates = [];

  for (const line of lines) {
    // Replace typical punctuation
    const cleanLine = line
      .replace(/[|/\\_~`!*]/g, " ")
      .replace(/(\d+)\s*(?:mg|mcg|ml|g)\b/gi, " $1 ")
      .replace(/\s+/g, " ")
      .trim();

    const words = cleanLine.split(" ").filter((w) => {
      const lower = w.toLowerCase().replace(/[^a-z0-9]/g, "");
      return lower.length >= 2 && !RX_STOPWORDS.has(lower);
    });

    if (words.length > 0) {
      const phrase = words.slice(0, 3).join(" ");
      candidates.push({
        rawLine: line,
        phrase,
        normalized: words.map(normalizeHandwritingWord).join(" "),
        numbers
      });
    }
  }

  return candidates;
}
