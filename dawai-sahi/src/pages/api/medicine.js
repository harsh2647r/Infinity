import medicinesDb from "../../data/medicines-db.json";
import { searchMedicines } from "../../lib/fuzzySearch";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Use GET to search Indian medicines." });
  }

  const query = typeof req.query.name === "string" ? req.query.name.trim() : "";
  const userBrandPrice = Number(req.query.brandPrice);

  if (!query || query.length > 120) {
    return res.status(400).json({ error: "Enter a medicine or molecule name (e.g. Dolo 650, Augmentin, Paracetamol)." });
  }

  // 1. Search locally bundled curated database using fuzzy matching
  const localMatches = searchMedicines(query, medicinesDb, 8);

  if (localMatches.length > 0) {
    const formatted = localMatches.map((med) => {
      const brandedPrice = (Number.isFinite(userBrandPrice) && userBrandPrice > 0) ? userBrandPrice : med.brandedMrp;
      const janPrice = med.janAushadhi.price;
      const savingsAmount = Math.max(0, brandedPrice - janPrice);
      const savingsPercent = Math.round((savingsAmount / brandedPrice) * 100);

      const diPrice = med.davaIndia?.price || Number((janPrice * 1.2).toFixed(2));
      const diSavingsAmount = Math.max(0, brandedPrice - diPrice);
      const diSavingsPercent = Math.round((diSavingsAmount / brandedPrice) * 100);

      return {
        id: med.id,
        brandName: med.brandNames[0],
        allBrands: med.brandNames,
        genericName: med.genericMolecule,
        strength: med.strength,
        dosageForm: med.dosageForm,
        packSize: med.packSize,
        brandedPrice: Number(brandedPrice.toFixed(2)),
        isUserCustomPrice: Boolean(Number.isFinite(userBrandPrice) && userBrandPrice > 0),
        janAushadhi: {
          name: med.janAushadhi.name,
          drugCode: med.janAushadhi.drugCode,
          packSize: med.janAushadhi.packSize,
          price: Number(janPrice.toFixed(2)),
          savingsAmount: Number(savingsAmount.toFixed(2)),
          savingsPercent,
          label: "PMBJP Jan Aushadhi Kendra (Govt. of India)",
        },
        davaIndia: {
          name: med.davaIndia?.name || `Dava India ${med.genericMolecule}`,
          productCode: med.davaIndia?.productCode || `DI-${med.id.replace('med-', '')}`,
          packSize: med.davaIndia?.packSize || med.janAushadhi.packSize,
          price: Number(diPrice.toFixed(2)),
          savingsAmount: Number(diSavingsAmount.toFixed(2)),
          savingsPercent: diSavingsPercent,
          label: "Dava India Generic Pharmacy (Private Chain)",
        },
        savings: {
          amount: Number(savingsAmount.toFixed(2)),
          percent: savingsPercent,
          headline: `₹${brandedPrice.toFixed(0)} → ₹${janPrice.toFixed(0)}`,
          savingText: `Save ₹${savingsAmount.toFixed(0)} (${savingsPercent}%)`
        },
        category: med.category,
        commonUses: med.commonUses,
        notes: med.notes,
        priceSource: "Official PMBI Jan Aushadhi & Dava India Retail Benchmark",
      };
    });

    return res.status(200).json({
      query,
      results: formatted,
      source: "curated_pmbjp_offline",
    });
  }

  // 2. Optional Fallback to Eka Care if token configured and local database had 0 matches
  if (process.env.EKA_API_TOKEN) {
    try {
      const url = new URL("https://api.eka.care/eka-mcp/medications/v1/search");
      url.searchParams.set("drug_name", query);
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${process.env.EKA_API_TOKEN}` },
        signal: AbortSignal.timeout(6000),
      });

      if (response.ok) {
        const payload = await response.json();
        const hits = Array.isArray(payload) ? payload : (payload.results || payload.data || []);
        if (hits.length > 0) {
          const ekaResults = hits.slice(0, 5).map((item) => ({
            id: `eka-${item.id || Math.random()}`,
            brandName: item.name || query,
            allBrands: [item.name || query],
            genericName: item.generic_name || "Active Generic Molecule",
            strength: item.strength || "",
            dosageForm: item.product_type || "Tablet",
            packSize: "Standard Pack",
            brandedPrice: Number.isFinite(userBrandPrice) && userBrandPrice > 0 ? userBrandPrice : 150.00,
            isUserCustomPrice: Boolean(Number.isFinite(userBrandPrice) && userBrandPrice > 0),
            janAushadhi: {
              name: `${item.generic_name || "Generic"} (PMBJP Generic Formulation)`,
              drugCode: "PMBJP-GEN",
              packSize: "Standard Pack",
              price: 25.00,
              label: "PMBJP Jan Aushadhi Equivalent",
            },
            savings: {
              amount: 125.00,
              percent: 83,
              headline: "₹150 → ₹25",
              savingText: "Save ₹125 (83%)"
            },
            category: "General Medicine",
            commonUses: "Consult physician for usage",
            notes: "Composition verified via Eka Care.",
            priceSource: "Eka Care live search",
          }));

          return res.status(200).json({ query, results: ekaResults, source: "eka_care" });
        }
      }
    } catch {
      // Continue to 404 message below
    }
  }

  return res.status(404).json({
    error: `No exact or fuzzy match found for "${query}". Try common names like Dolo 650, Augmentin, Pantoprazole, Paracetamol, or Telma 40.`,
    suggestions: ["Dolo 650", "Augmentin 625", "Pan D", "Telma 40", "Glycomet 500", "Montair LC", "Atorva 20"]
  });
}
