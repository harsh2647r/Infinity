import { ShoppingBag, Trash2, Printer, ChevronUp, ChevronDown, CheckCircle, Sparkles } from "lucide-react";

export default function PrescriptionBasket({
  basket = [],
  onRemoveItem,
  onClearBasket,
  onOpenPrintSlip,
  isExpanded,
  setIsExpanded
}) {
  if (basket.length === 0) return null;

  const totalBranded = basket.reduce((acc, item) => acc + item.brandedPrice, 0);
  const totalJan = basket.reduce((acc, item) => acc + item.janAushadhi.price, 0);
  const totalDavaIndia = basket.reduce(
    (acc, item) => acc + (item.davaIndia?.price || item.janAushadhi.price * 1.2),
    0
  );

  const totalSavings = Math.max(0, totalBranded - totalJan);
  const savingsPercent = totalBranded > 0 ? Math.round((totalSavings / totalBranded) * 100) : 0;
  const annualSavings = totalSavings * 12;

  const davaSavings = Math.max(0, totalBranded - totalDavaIndia);
  const davaSavingsPercent = totalBranded > 0 ? Math.round((davaSavings / totalBranded) * 100) : 0;

  return (
    <aside className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-emerald-900/10 shadow-[0_-8px_30px_rgba(0,0,0,0.12)] transition-all duration-300">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* Toggle Bar */}
        <div className="py-3 flex items-center justify-between gap-4 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
          <div className="flex items-center gap-3">
            <div className="relative p-2 bg-emerald-800 text-white rounded-xl shadow-sm">
              <ShoppingBag size={20} />
              <span className="absolute -top-1.5 -right-1.5 bg-amber-400 text-emerald-950 font-black text-[10px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">
                {basket.length}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm text-gray-900">Prescription Basket</span>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <Sparkles size={11} /> Save {savingsPercent}%
                </span>
              </div>
              <p className="text-xs text-gray-500">
                {basket.length} {basket.length === 1 ? "medicine" : "medicines"} · Jan Aushadhi:{" "}
                <strong className="text-emerald-700">₹{totalJan.toFixed(0)}</strong> · Dava India:{" "}
                <strong className="text-blue-700">₹{totalDavaIndia.toFixed(0)}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Headline saving snippet */}
            <div className="text-right">
              <div className="text-xs text-gray-500 hidden sm:block">
                Branded: <span className="line-through">₹{totalBranded.toFixed(0)}</span> → <strong className="text-emerald-800 text-sm">₹{totalJan.toFixed(0)}</strong>
              </div>
              <div className="text-xs sm:text-sm font-black text-emerald-700">
                Save ₹{totalSavings.toFixed(0)}
              </div>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenPrintSlip();
              }}
              className="px-3 sm:px-4 py-2 bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 hover:bg-emerald-900 transition-colors shadow-sm cursor-pointer"
            >
              <Printer size={15} />
              <span className="hidden sm:inline">Print Slip</span>
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label={isExpanded ? "Collapse basket" : "Expand basket"}
            >
              {isExpanded ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
            </button>
          </div>
        </div>

        {/* Expanded Drawer Details */}
        {isExpanded && (
          <div className="border-t border-gray-100 py-4 max-h-72 overflow-y-auto space-y-3">
            {/* 3-Way Spend Comparison Tile */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs p-3 bg-gray-50 rounded-xl border border-gray-200">
              <div className="p-2 bg-white rounded-lg border border-gray-200">
                <span className="text-[10px] text-gray-400 uppercase font-bold block">Commercial Branded</span>
                <strong className="text-sm font-black text-gray-900">₹{totalBranded.toFixed(2)}</strong>
              </div>
              <div className="p-2 bg-emerald-50 rounded-lg border border-emerald-200">
                <span className="text-[10px] text-emerald-800 uppercase font-bold block">🏛️ PMBJP Jan Aushadhi</span>
                <strong className="text-sm font-black text-emerald-800">₹{totalJan.toFixed(2)}</strong>
                <span className="text-[10px] font-bold text-emerald-600 block">Save ₹{totalSavings.toFixed(0)}</span>
              </div>
              <div className="p-2 bg-blue-50 rounded-lg border border-blue-200">
                <span className="text-[10px] text-blue-800 uppercase font-bold block">🏥 Dava India</span>
                <strong className="text-sm font-black text-blue-900">₹{totalDavaIndia.toFixed(2)}</strong>
                <span className="text-[10px] font-bold text-blue-600 block">Save ₹{davaSavings.toFixed(0)}</span>
              </div>
            </div>

            {/* Annual projection banner */}
            <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 text-emerald-900">
                <CheckCircle size={16} className="text-emerald-600 shrink-0" />
                <span>
                  Switching this prescription saves approximately <strong>₹{annualSavings.toFixed(0)} every year</strong>!
                </span>
              </div>
              <button
                onClick={onClearBasket}
                className="text-gray-500 hover:text-red-600 text-[11px] font-semibold underline cursor-pointer"
              >
                Clear all medicines
              </button>
            </div>

            {/* List of Medicines */}
            <div className="space-y-2">
              {basket.map((item, idx) => (
                <div
                  key={`${item.id}-${idx}`}
                  className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl border border-gray-200/70 text-xs"
                >
                  <div className="min-w-0 pr-3">
                    <strong className="block text-gray-900 truncate font-bold">{item.brandName}</strong>
                    <span className="text-gray-500 block truncate text-[11px]">
                      {item.genericName} · {item.strength}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <span className="text-gray-400 line-through text-[10px] block">₹{item.brandedPrice.toFixed(0)}</span>
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="text-emerald-800 font-bold" title="Jan Aushadhi">₹{item.janAushadhi.price.toFixed(0)}</span>
                        <span className="text-gray-300">/</span>
                        <span className="text-blue-800 font-bold" title="Dava India">
                          ₹{(item.davaIndia?.price || item.janAushadhi.price * 1.2).toFixed(0)}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => onRemoveItem(idx)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      title="Remove medicine"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
