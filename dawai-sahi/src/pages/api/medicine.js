import pmbjpProducts from "../../data/pmbjp-products.json";

const EKA_URL = "https://api.eka.care/eka-mcp/medications/v1/search";

function normalize(value = "") {
  return value.toLowerCase().replace(/\b(ip| usp| bp)\b/g, "").replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}

function ingredientKey(value = "") {
  return normalize(value.replace(/\b\d+(?:\.\d+)?\s*(?:mcg|mg|g|ml|%|iu|units?)\b/gi, "").replace(/[()+]/g, " "));
}

function productMatches(medicine, product) {
  const expected = ingredientKey(medicine.generic_name);
  const actual = ingredientKey(product.genericName || product.composition || "");
  if (!expected || !actual || expected !== actual) return false;
  // A product price is only comparable when strengths are explicitly aligned.
  const medicineStrength = normalize((medicine.name || "").match(/\d+(?:\.\d+)?\s*(?:mcg|mg|g|ml|%|iu|units?)/gi)?.join(" ") || "");
  const janStrength = normalize(product.strength || "");
  return Boolean(medicineStrength && janStrength && medicineStrength === janStrength);
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Use GET to search Indian medicines." });
  }

  const name = typeof req.query.name === "string" ? req.query.name.trim().replace(/\s+/g, " ") : "";
  const brandPrice = Number(req.query.brandPrice);
  const brandPackSize = typeof req.query.brandPackSize === "string" ? req.query.brandPackSize.trim() : "";
  if (!name || name.length > 120) return res.status(400).json({ error: "Enter a medicine name (up to 120 characters)." });
  if (!process.env.EKA_API_TOKEN) return res.status(503).json({ error: "Eka Care is not configured yet. Add EKA_API_TOKEN to the server environment." });

  try {
    const url = new URL(EKA_URL);
    url.searchParams.set("drug_name", name);
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${process.env.EKA_API_TOKEN}` },
      signal: AbortSignal.timeout(15000),
    });
    if (response.status === 403 || response.status === 401) return res.status(502).json({ error: "Eka Care rejected the token. Check EKA_API_TOKEN and API access." });
    if (!response.ok) return res.status(502).json({ error: "Eka Care medicine search is temporarily unavailable." });

    const payload = await response.json();
    const hits = Array.isArray(payload) ? payload : (payload.results || payload.data || []);
    const matches = hits.filter((item) => item?.generic_name).slice(0, 8).map((item) => {
      const matchingPrices = pmbjpProducts.filter((product) => productMatches(item, product));
      const jan = matchingPrices[0] || null;
      return {
        brandName: item.name || name,
        genericName: item.generic_name,
        manufacturer: item.manufacturer_name || null,
        productType: item.product_type || null,
        brandedPrice: Number.isFinite(brandPrice) && brandPrice > 0 ? brandPrice : null,
        janAushadhi: jan ? {
          name: jan.name,
          strength: jan.strength || null,
          packSize: jan.packSize || null,
          price: Number(jan.mrp),
          drugCode: jan.drugCode || null,
          label: "Pradhan Mantri Bhartiya Janaushadhi Pariyojana (PMBJP) / Jan Aushadhi Kendra",
          comparablePack: Boolean(brandPackSize && normalize(brandPackSize) === normalize(jan.packSize || "")),
        } : null,
        priceSource: jan ? "Official PMBI product list (locally imported)" : null,
      };
    });

    if (!matches.length) return res.status(404).json({ error: "No Indian medicine match found. Try the full brand name, including strength (for example, Dolo 650)." });
    return res.status(200).json({ query: name, results: matches });
  } catch (error) {
    const timedOut = error?.name === "TimeoutError" || error?.name === "AbortError";
    return res.status(502).json({ error: timedOut ? "Eka Care took too long to respond. Please try again." : "Could not reach Eka Care. Check the server internet connection and try again." });
  }
}
