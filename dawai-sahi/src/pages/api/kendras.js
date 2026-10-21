import kendrasDb from "../../data/kendras-db.json";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const query = typeof req.query.q === "string" ? req.query.q.trim().toLowerCase() : "";

  if (!query) {
    // Return popular metro Kendras by default
    return res.status(200).json({
      total: kendrasDb.length,
      kendras: kendrasDb.slice(0, 8),
      helpline: "1800-180-8080 (PMBJP Toll-Free)",
    });
  }

  const filtered = kendrasDb.filter((k) => {
    return (
      k.city.toLowerCase().includes(query) ||
      k.pincode.includes(query) ||
      k.state.toLowerCase().includes(query) ||
      k.storeName.toLowerCase().includes(query) ||
      k.address.toLowerCase().includes(query)
    );
  });

  return res.status(200).json({
    query,
    total: filtered.length,
    kendras: filtered,
    helpline: "1800-180-8080 (PMBJP Toll-Free)",
  });
}
