import { useState } from "react";
import { ArrowUpRight, LoaderCircle, Pill, Search, ShieldCheck } from "lucide-react";

export default function Home() {
  const [query, setQuery] = useState("");
  const [brandPrice, setBrandPrice] = useState("");
  const [brandPackSize, setBrandPackSize] = useState("");
  const [results, setResults] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSearch(event) {
    event.preventDefault();
    const medicine = query.trim();
    if (!medicine) return;
    setLoading(true);
    setError("");
    setResults([]);
    try {
      const search = new URLSearchParams({ name: medicine });
      if (brandPrice) search.set("brandPrice", brandPrice);
      if (brandPackSize) search.set("brandPackSize", brandPackSize);
      const response = await fetch(`/api/medicine?${search.toString()}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not find this ingredient.");
      setResults(data.results || []);
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page-shell">
      <header className="topbar">
        <a className="brand" href="#home" aria-label="Dawai Sahi home">
          <span className="brand-mark"><Pill size={22} strokeWidth={2.4} /></span>
          <span className="brand-name">dawai<span>sahi</span></span>
        </a>
        <span className="top-note"><ShieldCheck size={16} /> Ingredient information</span>
      </header>

      <section className="hero" id="home">
        <div className="eyebrow"><span className="eyebrow-dot" /> MEDICINE, MADE CLEAR</div>
        <h1>Know what’s<br />inside your <span>medicine.</span></h1>
        <p className="hero-copy">Find the generic composition of an Indian brand and compare its price with the PMBJP / Jan Aushadhi option.</p>

        <form className="search-card" onSubmit={handleSearch}>
          <label htmlFor="medicine-search">Enter an Indian brand or medicine name</label>
          <div className="search-row">
            <Search size={20} className="search-icon" />
            <input id="medicine-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Try Dolo 650" autoComplete="off" />
            <button type="submit" disabled={loading || !query.trim()}>{loading ? <LoaderCircle className="spin" size={18} /> : <>Look up <ArrowUpRight size={17} /></>}</button>
          </div>
          <div className="price-input"><label htmlFor="brand-price">Branded pack price (₹, optional)</label><input id="brand-price" type="number" min="0" step="0.01" value={brandPrice} onChange={(event) => setBrandPrice(event.target.value)} placeholder="Enter MRP or price" /><label htmlFor="brand-pack">Pack size</label><input id="brand-pack" value={brandPackSize} onChange={(event) => setBrandPackSize(event.target.value)} placeholder="e.g. 10 tablets" /></div>
          <p className="search-hint">Enter the branded pack price and size. Savings are shown only when the PMBJP pack size matches. PMBJP prices need the current official product list imported into the app.</p>
        </form>

        {error && <div className="message error" role="alert">{error}</div>}
        {results.length > 0 && <section aria-live="polite" className="matches">
          {results.map((result, index) => <article className="result-card" key={`${result.brandName}-${result.genericName}-${index}`}>
            <div className="result-heading"><div className="result-icon"><Pill size={20} /></div><div><span className="result-label">BRANDED MEDICINE MATCH</span><h2>{result.brandName}</h2></div><span className="source-tag">Eka Care</span></div>
            <div className="detail-row"><span>Molecule / generic name</span><strong>{result.genericName}</strong></div>
            {result.manufacturer && <div className="detail-row"><span>Manufacturer</span><span>{result.manufacturer}</span></div>}
            <div className="price-compare">
              <div className="price-tile"><span>Branded price</span><strong>{result.brandedPrice ? `₹${Number(result.brandedPrice).toFixed(2)}` : "Add pack price"}</strong><small>{result.brandedPrice ? "User-entered pack price" : "Enter the pack price above"}</small></div>
              <div className="price-arrow">→</div>
              <div className="price-tile janaushadhi"><span>{result.janAushadhi?.label || "Pradhan Mantri Bhartiya Janaushadhi Pariyojana (PMBJP) / Jan Aushadhi Kendra"}</span><strong>{result.janAushadhi ? `₹${result.janAushadhi.price.toFixed(2)}` : "No verified match"}</strong><small>{result.janAushadhi ? `${result.janAushadhi.name}${result.janAushadhi.packSize ? ` · ${result.janAushadhi.packSize}` : ""}` : "Import current PMBI product list to compare"}</small></div>
            </div>
            {result.brandedPrice && result.janAushadhi?.comparablePack && <div className="savings">Difference: ₹{Math.abs(result.brandedPrice - result.janAushadhi.price).toFixed(2)} per compared pack{result.brandedPrice >= result.janAushadhi.price ? " less at the PMBJP listed price" : " (listed PMBJP price is higher for these pack prices)"}.</div>}
            <p className="result-disclaimer">Confirm the same ingredients, strength, dosage form, and pack size with a pharmacist. PMBJP list price does not confirm stock at a nearby Kendra.</p>
          </article>)}
        </section>}

        <div className="examples"><span>POPULAR SEARCHES</span>{["Paracetamol", "Ibuprofen", "Cetirizine"].map((item) => <button key={item} type="button" onClick={() => setQuery(item)}>{item}<ArrowUpRight size={13} /></button>)}</div>
      </section>

      <section className="how-section">
        <div className="section-kicker">HOW IT WORKS</div>
        <div className="steps">
          <article><span className="step-no">01</span><h3>Enter a medicine</h3><p>Search its generic ingredient or a familiar brand name.</p></article>
          <article><span className="step-no">02</span><h3>Find the ingredient</h3><p>Brand lookups point to a matching active ingredient when available.</p></article>
          <article><span className="step-no">03</span><h3>Compare listed prices</h3><p>Compare branded pack price with a matching PMBJP product where available.</p></article>
        </div>
      </section>

      <footer><span>DAWAI SAHI <span className="footer-dot">·</span> CLEARER MEDICINE INFO</span><span>Information only. Ask a pharmacist before changing medicines.</span></footer>
    </main>
  );
}
