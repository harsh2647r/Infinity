import { useState, useEffect, useRef } from "react";
import Head from "next/head";
import {
  Pill,
  Search,
  Camera,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Plus,
  Check,
  MapPin,
  FileText,
  Printer,
  ShoppingBag,
  ExternalLink,
  ChevronRight,
  LoaderCircle,
  HelpCircle,
  Info,
  Layers,
  TrendingDown
} from "lucide-react";
import PrescriptionBasket from "../components/PrescriptionBasket";
import PrintSlipModal from "../components/PrintSlipModal";
import KendraLocator from "../components/KendraLocator";
import OcrScannerModal from "../components/OcrScannerModal";
import MedicalDisclaimer from "../components/MedicalDisclaimer";
import medicinesDb from "../data/medicines-db.json";
import { searchMedicines } from "../lib/fuzzySearch";

export default function Home() {
  const [query, setQuery] = useState("");
  const [userBrandPrice, setUserBrandPrice] = useState("");
  const [showPriceOverride, setShowPriceOverride] = useState(false);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("search"); // "search" | "kendras"
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [addedItemIds, setAddedItemIds] = useState(new Set());

  // Multi-medicine Prescription Basket
  const [basket, setBasket] = useState([]);
  const [isBasketExpanded, setIsBasketExpanded] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // OCR Modal
  const [isOcrModalOpen, setIsOcrModalOpen] = useState(false);

  const searchContainerRef = useRef(null);

  // Quick popular search chips
  const popularSearches = [
    { name: "Dolo 650", tag: "₹34 → ₹9" },
    { name: "Augmentin 625", tag: "₹228 → ₹58" },
    { name: "Pan D", tag: "₹240 → ₹28" },
    { name: "Telma 40", tag: "₹135 → ₹17" },
    { name: "Atorva 20", tag: "₹240 → ₹28" },
    { name: "Montair LC", tag: "₹185 → ₹26" },
    { name: "Shelcal 500", tag: "₹138 → ₹18" },
    { name: "Allegra 120", tag: "₹195 → ₹28" }
  ];

  // Confetti helper
  function fireConfetti() {
    if (typeof window !== "undefined") {
      import("canvas-confetti")
        .then((confettiModule) => {
          const confetti = confettiModule.default;
          confetti({
            particleCount: 45,
            spread: 55,
            origin: { y: 0.8 },
            colors: ["#1e6257", "#16a34a", "#f59e0b", "#10b981"]
          });
        })
        .catch(() => {});
    }
  }

  // Handle live suggestions
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length >= 2) {
      const matches = searchMedicines(trimmed, medicinesDb, 5);
      setSuggestions(matches);
    } else {
      setSuggestions([]);
    }
  }, [query]);

  // Close suggestions on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleSearch(searchTerm = query) {
    const term = searchTerm.trim();
    if (!term) return;

    setLoading(true);
    setError("");
    setShowSuggestions(false);
    setActiveTab("search");

    try {
      const params = new URLSearchParams({ name: term });
      if (userBrandPrice) params.set("brandPrice", userBrandPrice);

      const response = await fetch(`/api/medicine?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "No matching medicine found.");
      }

      setResults(data.results || []);
    } catch (err) {
      setError(err.message || "Failed to search medicines.");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  function handleAddMedicineToBasket(medicine) {
    setBasket((prev) => [...prev, medicine]);
    setAddedItemIds((prev) => new Set(prev).add(medicine.id));
    fireConfetti();
  }

  function handleRemoveFromBasket(index) {
    setBasket((prev) => prev.filter((_, idx) => idx !== index));
  }

  function handleClearBasket() {
    setBasket([]);
    setAddedItemIds(new Set());
  }

  return (
    <>
      <Head>
        <title>Dawai Sahi · Make Medicine Costs Visible Before Paid</title>
        <meta
          name="description"
          content="Find generic bioequivalent Indian medicines and compare prices with official Jan Aushadhi (PMBJP) products. Save up to 88% on prescriptions."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main className="page-shell">
        {/* Navigation Bar */}
        <header className="topbar no-print">
          <a href="/" className="brand" aria-label="Dawai Sahi home">
            <span className="brand-mark">
              <Pill size={22} className="stroke-[2.5]" />
            </span>
            <span className="brand-name">
              dawai<span>sahi</span>
            </span>
          </a>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab(activeTab === "kendras" ? "search" : "kendras")}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "kendras"
                  ? "bg-emerald-800 text-white shadow-sm"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <MapPin size={14} />
              <span>{activeTab === "kendras" ? "Back to Search" : "Jan Aushadhi Stores"}</span>
            </button>

            {basket.length > 0 && (
              <button
                onClick={() => setIsPrintModalOpen(true)}
                className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-amber-400 hover:bg-amber-500 text-emerald-950 transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
              >
                <Printer size={14} />
                <span>Print Slip ({basket.length})</span>
              </button>
            )}

            <div className="hidden md:flex items-center gap-1.5 text-xs text-gray-500 border-l border-gray-200 pl-3">
              <ShieldCheck size={16} className="text-emerald-700" />
              <span>Official PMBJP Benchmark</span>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="hero no-print">
          <div className="eyebrow">
            <span className="eyebrow-dot" />
            <span>PHARMACY PRICE TRANSPARENCY</span>
          </div>

          <h1>
            Make the cost of medicine<br />
            <span>visible before it is paid.</span>
          </h1>

          <p className="hero-copy">
            Identical generic molecules exist for a fraction of the price at <strong>Jan Aushadhi Kendras</strong>.
            Search any brand name or active molecule to uncover the headline savings.
          </p>

          {/* Search Card */}
          <div className="mt-8 text-left p-5 rounded-2xl bg-white border border-gray-200 shadow-[0_12px_40px_rgba(23,59,55,0.06)]" ref={searchContainerRef}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSearch();
              }}
            >
              <label htmlFor="medicine-search" className="block text-xs font-bold text-emerald-950 mb-2">
                Enter an Indian brand name, molecule, or typo (e.g. &ldquo;Dolo 650&rdquo;, &ldquo;Augmentin&rdquo;, &ldquo;Paracetamol&rdquo;)
              </label>

              <div className="relative flex items-center gap-2 p-1.5 pl-3.5 rounded-xl border border-gray-300 focus-within:border-emerald-700 focus-within:ring-2 focus-within:ring-emerald-700/20 bg-white">
                <Search size={18} className="text-gray-400 shrink-0" />
                <input
                  id="medicine-search"
                  type="text"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  placeholder="Try 'dolo', 'pan 40', 'augmntin', 'telma'..."
                  autoComplete="off"
                  className="w-full text-sm text-gray-900 bg-transparent outline-none placeholder:text-gray-400"
                />

                {/* Scan strip button */}
                <button
                  type="button"
                  onClick={() => setIsOcrModalOpen(true)}
                  className="p-2 text-gray-500 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer shrink-0"
                  title="Scan printed strip or box"
                >
                  <Camera size={18} />
                </button>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={loading || !query.trim()}
                  className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50 cursor-pointer shrink-0"
                >
                  {loading ? <LoaderCircle size={16} className="spin" /> : <>Compare <ArrowRight size={15} /></>}
                </button>

                {/* Live Suggestions Autocomplete Dropdown */}
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden z-30 divide-y divide-gray-100">
                    {suggestions.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => {
                          setQuery(item.brandNames[0]);
                          handleSearch(item.brandNames[0]);
                        }}
                        className="p-3 hover:bg-emerald-50/70 cursor-pointer flex items-center justify-between transition-colors"
                      >
                        <div>
                          <div className="font-bold text-sm text-gray-900">{item.brandNames[0]}</div>
                          <div className="text-xs text-gray-500">
                            {item.genericMolecule} · {item.strength}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            {item.savings.headline}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Optional Custom Price Toggle */}
              <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                <button
                  type="button"
                  onClick={() => setShowPriceOverride(!showPriceOverride)}
                  className="hover:text-emerald-800 underline font-medium cursor-pointer"
                >
                  {showPriceOverride ? "− Hide custom price input" : "+ Have your printed receipt price? (Optional)"}
                </button>
                <span className="text-[11px] text-gray-400">120+ Curated Indian Formulations</span>
              </div>

              {showPriceOverride && (
                <div className="mt-3 p-3 bg-gray-50 rounded-xl border border-gray-200 flex flex-wrap items-center gap-3 text-xs">
                  <label htmlFor="custom-price" className="font-semibold text-gray-700">
                    Your Printed Branded Price (₹):
                  </label>
                  <input
                    id="custom-price"
                    type="number"
                    min="0"
                    step="0.5"
                    value={userBrandPrice}
                    onChange={(e) => setUserBrandPrice(e.target.value)}
                    placeholder="e.g. 240.00"
                    className="px-3 py-1.5 rounded-lg border border-gray-300 text-xs w-28 bg-white focus:outline-none focus:border-emerald-700"
                  />
                  <span className="text-gray-400 text-[11px]">Leave blank to use typical market MRP</span>
                </div>
              )}
            </form>

            {/* Popular Searches Pills */}
            <div className="mt-4 pt-3 border-t border-gray-100 flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Popular:</span>
              {popularSearches.map((chip) => (
                <button
                  key={chip.name}
                  type="button"
                  onClick={() => {
                    setQuery(chip.name);
                    handleSearch(chip.name);
                  }}
                  className="px-2.5 py-1 rounded-full text-xs bg-gray-50 hover:bg-emerald-50 border border-gray-200 hover:border-emerald-300 text-gray-700 hover:text-emerald-900 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <span>{chip.name}</span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-white px-1.5 py-0.2 rounded border border-emerald-200">
                    {chip.tag}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Tab Switcher: Search Results vs Kendra Locator */}
        {activeTab === "kendras" ? (
          <KendraLocator />
        ) : (
          <>
            {/* Error Message */}
            {error && (
              <div className="max-w-2xl mx-auto my-6 p-4 rounded-xl border border-red-200 bg-red-50 text-red-900 text-xs space-y-2">
                <p className="font-bold">{error}</p>
                <div className="flex items-center gap-2 flex-wrap text-[11px]">
                  <span>Try searching for:</span>
                  {["Dolo 650", "Augmentin 625", "Pan D", "Telma 40", "Metformin"].map((s) => (
                    <button
                      key={s}
                      onClick={() => {
                        setQuery(s);
                        handleSearch(s);
                      }}
                      className="underline font-semibold text-red-800 cursor-pointer"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* HEADLINE RESULTS LIST */}
            {results.length > 0 && (
              <section className="max-w-2xl mx-auto my-8 space-y-5">
                <div className="flex items-center justify-between text-xs text-gray-500 px-1">
                  <span>
                    Found <strong>{results.length}</strong> matching formulation{results.length > 1 ? "s" : ""}
                  </span>
                  <span className="text-emerald-800 font-semibold flex items-center gap-1">
                    <Sparkles size={13} /> Official PMBJP Pricing Benchmark
                  </span>
                </div>

                {results.map((result) => {
                  const isAdded = addedItemIds.has(result.id);
                  return (
                    <article
                      key={result.id}
                      className="p-6 rounded-2xl bg-white border border-gray-200 shadow-sm hover:shadow-md transition-all space-y-5"
                    >
                      {/* Card Header & Category */}
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                            {result.category}
                          </span>
                          <h2 className="text-xl font-black text-gray-900 mt-1.5 flex items-center gap-2">
                            {result.brandName}
                            <span className="text-xs font-semibold text-gray-400 font-mono">
                              ({result.strength})
                            </span>
                          </h2>
                          {result.allBrands?.length > 1 && (
                            <p className="text-xs text-gray-500 mt-0.5">
                              Also sold as: {result.allBrands.slice(1).join(", ")}
                            </p>
                          )}
                        </div>

                        {/* Add to Prescription Button */}
                        <button
                          onClick={() => handleAddMedicineToBasket(result)}
                          className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm ${
                            isAdded
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                              : "bg-emerald-800 hover:bg-emerald-900 text-white"
                          }`}
                        >
                          {isAdded ? (
                            <>
                              <Check size={15} /> Added to Rx
                            </>
                          ) : (
                            <>
                              <Plus size={15} /> Add to Rx
                            </>
                          )}
                        </button>
                      </div>

                      {/* 3-WAY HEADLINE COMPARISON: Commercial vs Jan Aushadhi vs Dava India */}
                      <div className="space-y-3">
                        <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-900 to-emerald-950 text-white shadow-inner flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-emerald-300 tracking-wider">
                              Headline Generic Comparison
                            </span>
                            <div className="text-3xl font-black tracking-tight mt-0.5 flex items-baseline gap-2">
                              <span>₹{result.brandedPrice.toFixed(0)}</span>
                              <span className="text-emerald-400 text-2xl font-light">→</span>
                              <span className="text-amber-300">₹{result.janAushadhi.price.toFixed(0)}</span>
                            </div>
                            <span className="text-xs text-emerald-200/80 mt-0.5 block">
                              Pack size: {result.packSize || result.dosageForm}
                            </span>
                          </div>

                          <div className="sm:text-right">
                            <span className="inline-block px-3 py-1 bg-amber-400 text-emerald-950 font-black text-xs rounded-full shadow-sm">
                              SAVE UP TO {result.savings.percent}% (₹{result.savings.amount.toFixed(0)})
                            </span>
                            <span className="block text-[11px] text-emerald-200/80 mt-1">
                              Identical active molecule &amp; strength
                            </span>
                          </div>
                        </div>

                        {/* 3-Way Price Columns */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                          {/* Column 1: Branded */}
                          <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 flex flex-col justify-between">
                            <div>
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">
                                  🏢 Commercial Branded
                                </span>
                              </div>
                              <div className="text-xl font-black text-gray-900 mt-1">
                                ₹{result.brandedPrice.toFixed(2)}
                              </div>
                              <span className="text-[11px] text-gray-500 block mt-0.5">
                                Apollo / MedPlus / Local Chemist
                              </span>
                            </div>
                            <span className="text-[10px] text-gray-400 mt-2 block border-t border-gray-200 pt-1.5">
                              Standard Market MRP
                            </span>
                          </div>

                          {/* Column 2: Jan Aushadhi (Govt) */}
                          <div className="p-3.5 rounded-xl bg-emerald-50/70 border-2 border-emerald-600/40 flex flex-col justify-between relative overflow-hidden">
                            <span className="absolute top-0 right-0 bg-emerald-700 text-white text-[9px] font-black px-2 py-0.5 rounded-bl">
                              Lowest Price
                            </span>
                            <div>
                              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wide block">
                                🏛️ Jan Aushadhi (PMBJP)
                              </span>
                              <div className="text-xl font-black text-emerald-950 mt-1">
                                ₹{result.janAushadhi.price.toFixed(2)}
                              </div>
                              <span className="text-[11px] font-bold text-emerald-700 block mt-0.5">
                                Save {result.savings.percent}% (₹{result.savings.amount.toFixed(0)})
                              </span>
                            </div>
                            <div className="mt-2 border-t border-emerald-200/60 pt-1.5 flex items-center justify-between text-[10px] text-emerald-900">
                              <span>Code: <strong>{result.janAushadhi.drugCode}</strong></span>
                              <span className="font-semibold text-emerald-700">Govt. Kendra</span>
                            </div>
                          </div>

                          {/* Column 3: Dava India (Generic Chain) */}
                          <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-200 flex flex-col justify-between">
                            <div>
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wide">
                                  🏥 Dava India
                                </span>
                                <span className="text-[9px] font-bold text-blue-700 bg-blue-100 px-1.5 py-0.2 rounded">
                                  Retail Generic
                                </span>
                              </div>
                              <div className="text-xl font-black text-blue-950 mt-1">
                                ₹{result.davaIndia?.price ? result.davaIndia.price.toFixed(2) : (result.janAushadhi.price * 1.2).toFixed(2)}
                              </div>
                              <span className="text-[11px] font-bold text-blue-700 block mt-0.5">
                                Save {result.davaIndia?.savingsPercent || Math.round(((result.brandedPrice - result.janAushadhi.price * 1.2) / result.brandedPrice) * 100)}%
                              </span>
                            </div>
                            <div className="mt-2 border-t border-blue-200/60 pt-1.5 flex items-center justify-between text-[10px] text-blue-900">
                              <span>Code: <strong>{result.davaIndia?.productCode || "DI-GEN"}</strong></span>
                              <span className="font-semibold text-blue-700">2,000+ Stores</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Molecule Active Ingredient Summary */}
                      <div className="p-3 rounded-xl bg-gray-50 border border-gray-200/80 space-y-1 text-xs">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide block">
                          Bioequivalent Generic Formulation
                        </span>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <strong className="text-gray-900 font-bold text-sm">
                            {result.genericName}
                          </strong>
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-semibold text-[11px]">
                            {result.strength} · {result.dosageForm}
                          </span>
                        </div>
                      </div>

                      {/* Common uses & Clinical Note */}
                      {result.commonUses && (
                        <div className="text-xs text-gray-600 bg-gray-50/50 p-2.5 rounded-lg border border-gray-100 flex items-start gap-2">
                          <Info size={14} className="text-gray-400 shrink-0 mt-0.5" />
                          <span>
                            <strong>Indication:</strong> {result.commonUses}. {result.notes}
                          </span>
                        </div>
                      )}
                    </article>
                  );
                })}
              </section>
            )}

            {/* How It Works Explainer */}
            <section className="max-w-3xl mx-auto my-16 pt-10 border-t border-gray-200 no-print">
              <div className="text-center">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-800">
                  HOW IT WORKS
                </span>
                <h3 className="text-2xl font-black text-gray-900 mt-1">
                  Cut your pharmacy bill in three steps
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                <article className="p-5 rounded-xl bg-white border border-gray-200 shadow-2xs space-y-2">
                  <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-black text-xs flex items-center justify-center">
                    01
                  </span>
                  <h4 className="font-extrabold text-sm text-gray-900">Type or Scan Medicine</h4>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Enter the brand name written on your prescription or use the camera scanner on printed packaging.
                  </p>
                </article>

                <article className="p-5 rounded-xl bg-white border border-gray-200 shadow-2xs space-y-2">
                  <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-black text-xs flex items-center justify-center">
                    02
                  </span>
                  <h4 className="font-extrabold text-sm text-gray-900">See the Saving Headline</h4>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    View the identical bioequivalent generic molecule and government-regulated PMBJP price.
                  </p>
                </article>

                <article className="p-5 rounded-xl bg-white border border-gray-200 shadow-2xs space-y-2">
                  <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-black text-xs flex items-center justify-center">
                    03
                  </span>
                  <h4 className="font-extrabold text-sm text-gray-900">Print Slip &amp; Purchase</h4>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Generate a clean counter slip to hand across to your pharmacist or visit your nearest Kendra.
                  </p>
                </article>
              </div>
            </section>
          </>
        )}

        {/* Regulatory & Medical Disclaimer */}
        <MedicalDisclaimer />

        {/* Footer */}
        <footer className="mt-12 pt-6 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-400 no-print">
          <div>
            <strong>DAWAI SAHI</strong> · Pharmacological Price Transparency Project
          </div>
          <div>
            Data sourced from official PMBI (Jan Aushadhi) &amp; NPPA price ceiling catalogs.
          </div>
        </footer>

        {/* Multi-Medicine Prescription Basket */}
        <PrescriptionBasket
          basket={basket}
          onRemoveItem={handleRemoveFromBasket}
          onClearBasket={handleClearBasket}
          onOpenPrintSlip={() => setIsPrintModalOpen(true)}
          isExpanded={isBasketExpanded}
          setIsExpanded={setIsBasketExpanded}
        />

        {/* Printable Prescription Slip Modal */}
        {isPrintModalOpen && (
          <PrintSlipModal
            basket={basket}
            onClose={() => setIsPrintModalOpen(false)}
          />
        )}

        {/* Camera / Box Strip OCR Modal */}
        {isOcrModalOpen && (
          <OcrScannerModal
            onScanComplete={(extractedTerm) => {
              setIsOcrModalOpen(false);
              setQuery(extractedTerm);
              handleSearch(extractedTerm);
            }}
            onClose={() => setIsOcrModalOpen(false)}
          />
        )}
      </main>
    </>
  );
}
