// Robust fuzzy search engine for Indian medicines and molecules

function normalize(str = "") {
  return str
    .toLowerCase()
    .replace(/\b(?:ip|usp|bp|tablet|tablets|tab|capsule|capsules|cap|syrup|syr|suspension|susp|gel|cream|drops|oint|ointment|injection|inj|er|sr|cr|mr|od|ds)\b/gi, "")
    .replace(/([a-zA-Z])(\d)/g, "$1 $2")
    .replace(/(\d)([a-zA-Z])/g, "$1 $2")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function levenshteinDistance(a, b) {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  let row = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    let prev = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const val = Math.min(row[j] + 1, prev + 1, row[j - 1] + cost);
      row[j - 1] = prev;
      prev = val;
    }
    row[n] = prev;
  }
  return row[n];
}

function stringSimilarity(s1, s2) {
  if (s1 === s2) return 1.0;
  const maxLen = Math.max(s1.length, s2.length);
  if (maxLen === 0) return 1.0;
  const dist = levenshteinDistance(s1, s2);
  return 1 - dist / maxLen;
}

function extractNumbers(str = "") {
  return str.match(/\d+(?:\.\d+)?/g) || [];
}

/**
 * Score a medicine candidate against a search query
 */
export function scoreMedicine(query, medicine) {
  const cleanQuery = normalize(query);
  if (!cleanQuery) return { score: 0, matchedTerm: "" };

  const queryTokens = cleanQuery.split(" ").filter(Boolean);
  const queryNumbers = extractNumbers(query);

  let bestScore = 0;
  let matchedTerm = "";
  let exactWordMatch = false;

  // 1. Check primary brand names first
  for (let bIdx = 0; bIdx < medicine.brandNames.length; bIdx++) {
    const brand = medicine.brandNames[bIdx];
    const cleanBrand = normalize(brand);
    const brandTokens = cleanBrand.split(" ").filter(Boolean);

    // Exact brand match
    if (cleanQuery === cleanBrand) {
      return { score: 1.0, matchedTerm: brand, exactWordMatch: true };
    }

    // Whole word match at start (e.g. "dolo" in "dolo 650")
    if (cleanBrand.startsWith(cleanQuery + " ") || brandTokens[0] === cleanQuery) {
      const score = bIdx === 0 ? 0.995 : 0.985;
      if (score > bestScore) {
        bestScore = score;
        matchedTerm = brand;
        exactWordMatch = true;
      }
    } else if (cleanBrand.startsWith(cleanQuery)) {
      // Partial prefix (e.g. "dolo" in "dolopar")
      const score = 0.88 - (cleanBrand.length - cleanQuery.length) * 0.005;
      if (score > bestScore) {
        bestScore = score;
        matchedTerm = brand;
      }
    } else if (brandTokens.includes(cleanQuery)) {
      const score = 0.92;
      if (score > bestScore) {
        bestScore = score;
        matchedTerm = brand;
        exactWordMatch = true;
      }
    }
  }

  // 2. Check generic molecule
  const cleanGeneric = normalize(medicine.genericMolecule);
  const genericTokens = cleanGeneric.split(" ").filter(Boolean);

  if (cleanQuery === cleanGeneric) {
    if (1.0 > bestScore) {
      bestScore = 1.0;
      matchedTerm = medicine.genericMolecule;
      exactWordMatch = true;
    }
  } else if (cleanGeneric.startsWith(cleanQuery)) {
    const score = 0.96 - (cleanGeneric.length - cleanQuery.length) * 0.005;
    if (score > bestScore) {
      bestScore = score;
      matchedTerm = medicine.genericMolecule;
      exactWordMatch = true;
    }
  } else if (genericTokens.includes(cleanQuery)) {
    const score = 0.94;
    if (score > bestScore) {
      bestScore = score;
      matchedTerm = medicine.genericMolecule;
      exactWordMatch = true;
    }
  }

  // 3. Fallback to broad fuzzy token / Levenshtein matching
  const allTargets = [
    ...medicine.brandNames,
    medicine.genericMolecule,
    `${medicine.genericMolecule} ${medicine.strength}`,
    medicine.category,
    medicine.janAushadhi?.name || "",
    medicine.davaIndia?.name || ""
  ].filter(Boolean);

  for (const target of allTargets) {
    const cleanTarget = normalize(target);
    if (!cleanTarget) continue;

    const targetTokens = cleanTarget.split(" ").filter(Boolean);

    // Substring match
    if (cleanTarget.includes(cleanQuery)) {
      const score = 0.85 - (cleanTarget.length - cleanQuery.length) * 0.005;
      if (score > bestScore) {
        bestScore = Math.max(score, 0.75);
        matchedTerm = target;
      }
    }

    // Token fuzzy matching
    let tokenScoreSum = 0;
    for (const qTok of queryTokens) {
      let maxSim = 0;
      for (const tTok of targetTokens) {
        if (tTok === qTok) {
          maxSim = 1.0;
          break;
        } else if (tTok.startsWith(qTok)) {
          maxSim = Math.max(maxSim, 0.90);
        } else {
          const sim = stringSimilarity(qTok, tTok);
          if (sim > maxSim) maxSim = sim;
        }
      }
      tokenScoreSum += maxSim;
    }

    // Single-target conciseness bonus (e.g. "Paracetamol" over "Tramadol + Paracetamol" for "paracetmol")
    const lengthPenalty = Math.max(0, targetTokens.length - queryTokens.length) * 0.02;
    const tokenScore = Math.max(0, (tokenScoreSum / queryTokens.length) * 0.90 - lengthPenalty);
    if (tokenScore > bestScore) {
      bestScore = tokenScore;
      matchedTerm = target;
    }

    // Single-word typo check (e.g. "paracetmol" vs "paracetamol", "augmntin" vs "augmentin")
    for (const tTok of targetTokens) {
      const sim = stringSimilarity(cleanQuery, tTok);
      if (sim >= 0.72) {
        const typoScore = sim * 0.92 - (targetTokens.length > 1 ? 0.03 : 0);
        if (typoScore > bestScore) {
          bestScore = typoScore;
          matchedTerm = target;
        }
      }
    }
  }

  // Dosage / Strength bonus
  if (queryNumbers.length > 0 && bestScore > 0.4) {
    const medNumbers = extractNumbers(medicine.strength);
    const hasNumberMatch = queryNumbers.some((num) => medNumbers.includes(num));
    if (hasNumberMatch) {
      bestScore = Math.min(1.0, bestScore + 0.15);
    }
  }

  return { score: bestScore, matchedTerm, exactWordMatch };
}

/**
 * Searches medicine database using fuzzy scoring
 */
export function searchMedicines(query, database = [], limit = 10) {
  if (!query || !query.trim()) return [];

  const scored = [];
  for (const med of database) {
    const { score, matchedTerm, exactWordMatch } = scoreMedicine(query, med);
    if (score >= 0.40) {
      const savingsAmount = Math.max(0, med.brandedMrp - med.janAushadhi.price);
      const savingsPercent = Math.round((savingsAmount / med.brandedMrp) * 100);

      scored.push({
        ...med,
        score,
        matchedTerm,
        exactWordMatch,
        savings: {
          amount: Number(savingsAmount.toFixed(2)),
          percent: savingsPercent,
          headline: `₹${med.brandedMrp.toFixed(0)} → ₹${med.janAushadhi.price.toFixed(0)}`,
          savingText: `Save ₹${savingsAmount.toFixed(0)} (${savingsPercent}%)`
        }
      });
    }
  }

  // Sort prioritizing exact word matches, then score descending, then savings percentage
  scored.sort((a, b) => {
    if (a.exactWordMatch && !b.exactWordMatch) return -1;
    if (!a.exactWordMatch && b.exactWordMatch) return 1;
    if (Math.abs(b.score - a.score) > 0.01) {
      return b.score - a.score;
    }
    return b.savings.percent - a.savings.percent;
  });

  return scored.slice(0, limit);
}
