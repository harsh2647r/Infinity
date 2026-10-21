import { useState, useEffect } from "react";
import { MapPin, Search, Phone, Clock, ExternalLink, Navigation, Building2, LoaderCircle } from "lucide-react";

export default function KendraLocator({ initialCity = "" }) {
  const [query, setQuery] = useState(initialCity);
  const [kendras, setKendras] = useState([]);
  const [loading, setLoading] = useState(false);
  const [helpline, setHelpline] = useState("1800-180-8080");

  useEffect(() => {
    fetchKendras(initialCity);
  }, [initialCity]);

  async function fetchKendras(searchTerm = "") {
    setLoading(true);
    try {
      const url = searchTerm ? `/api/kendras?q=${encodeURIComponent(searchTerm)}` : "/api/kendras";
      const res = await fetch(url);
      const data = await res.json();
      setKendras(data.kendras || []);
      if (data.helpline) setHelpline(data.helpline);
    } catch {
      // Fallback empty
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(e) {
    e.preventDefault();
    fetchKendras(query);
  }

  return (
    <section className="my-10 p-6 rounded-2xl bg-white border border-emerald-900/10 shadow-sm space-y-6">
      {/* Title & Helpline Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-5">
        <div>
          <div className="flex items-center gap-2 text-emerald-800 font-extrabold text-sm tracking-wide uppercase">
            <Building2 size={18} />
            <span>Jan Aushadhi Kendra Locator</span>
          </div>
          <h3 className="text-xl font-black text-gray-900 mt-1">
            Find Your Nearest PMBJP Store
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Over 10,000+ government-authorized generic medicine pharmacies across India.
          </p>
        </div>

        <div className="bg-emerald-50 border border-emerald-200/80 rounded-xl px-4 py-2.5 flex items-center gap-3">
          <Phone size={18} className="text-emerald-700 shrink-0" />
          <div className="text-xs">
            <span className="text-gray-500 block text-[10px] font-semibold uppercase">National PMBJP Helpline</span>
            <strong className="text-emerald-950 font-black">{helpline}</strong>
          </div>
        </div>
      </div>

      {/* Search Input */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <MapPin size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by city (e.g. Delhi, Mumbai, Bengaluru, Pune) or 6-digit Pincode..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50/50 text-xs sm:text-sm text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2.5 bg-emerald-800 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 hover:bg-emerald-900 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
        >
          {loading ? <LoaderCircle size={16} className="spin" /> : <Search size={16} />}
          <span>Search</span>
        </button>
      </form>

      {/* Popular City Filter Pills */}
      <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-gray-500">
        <span className="font-semibold text-gray-400 mr-1">Popular Cities:</span>
        {["New Delhi", "Mumbai", "Bengaluru", "Hyderabad", "Chennai", "Kolkata", "Pune", "Ahmedabad", "Jaipur"].map(
          (city) => (
            <button
              key={city}
              type="button"
              onClick={() => {
                setQuery(city);
                fetchKendras(city);
              }}
              className="px-2.5 py-1 rounded-full border border-gray-200 bg-gray-50 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-800 transition-colors cursor-pointer"
            >
              {city}
            </button>
          )
        )}
      </div>

      {/* Results Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
        {kendras.length > 0 ? (
          kendras.map((kendra) => (
            <article
              key={kendra.storeId}
              className="p-4 rounded-xl border border-gray-200 bg-gradient-to-br from-white to-gray-50/40 hover:border-emerald-300 transition-all shadow-sm space-y-2.5"
            >
              <div className="flex justify-between items-start gap-2">
                <div>
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded-full">
                    {kendra.storeId}
                  </span>
                  <h4 className="font-extrabold text-gray-900 text-sm mt-1.5">{kendra.storeName}</h4>
                </div>
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  Open Today
                </span>
              </div>

              <p className="text-xs text-gray-600 leading-relaxed">
                {kendra.address}
                {kendra.landmark && <span className="block text-gray-400 text-[11px] mt-0.5">Landmark: {kendra.landmark}</span>}
              </p>

              <div className="pt-2 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
                <div className="flex items-center gap-1.5 text-gray-700 font-medium">
                  <Clock size={13} className="text-gray-400" />
                  <span>{kendra.operatingHours}</span>
                </div>
                <div className="flex items-center gap-1.5 text-gray-700 font-medium">
                  <Phone size={13} className="text-gray-400" />
                  <span>{kendra.contactPhone}</span>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${kendra.storeName} ${kendra.address} ${kendra.city}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 hover:text-emerald-950 hover:underline"
                >
                  <Navigation size={13} />
                  <span>Open Directions</span>
                  <ExternalLink size={11} />
                </a>
              </div>
            </article>
          ))
        ) : (
          <div className="col-span-full py-8 text-center text-gray-500 text-xs">
            No Kendras found for &ldquo;{query}&rdquo;. Try another city name or pincode.
          </div>
        )}
      </div>
    </section>
  );
}
