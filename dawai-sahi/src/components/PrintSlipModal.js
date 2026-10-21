import { Printer, X, Pill, AlertTriangle, CheckCircle2 } from "lucide-react";

export default function PrintSlipModal({ basket = [], onClose }) {
  const totalBranded = basket.reduce((acc, item) => acc + item.brandedPrice, 0);
  const totalJan = basket.reduce((acc, item) => acc + item.janAushadhi.price, 0);
  const totalDavaIndia = basket.reduce(
    (acc, item) => acc + (item.davaIndia?.price || item.janAushadhi.price * 1.2),
    0
  );

  const totalSavings = Math.max(0, totalBranded - totalJan);
  const savingsPercent = totalBranded > 0 ? Math.round((totalSavings / totalBranded) * 100) : 0;

  const davaSavings = Math.max(0, totalBranded - totalDavaIndia);
  const davaSavingsPercent = totalBranded > 0 ? Math.round((davaSavings / totalBranded) * 100) : 0;

  function handlePrint() {
    window.print();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-gray-200 overflow-hidden">
        {/* Modal Controls (Hidden in print) */}
        <div className="no-print flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50/80">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg">
              <Printer size={18} />
            </span>
            <span className="font-bold text-gray-900 text-sm">Printable Generic Substitution Slip</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-emerald-900 transition-colors shadow-sm cursor-pointer"
            >
              <Printer size={15} /> Print Now
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Printable Prescription Body */}
        <div className="p-8 overflow-y-auto print-area space-y-6 text-gray-900">
          {/* Header */}
          <div className="border-b-2 border-emerald-900 pb-4 flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 text-emerald-900">
                <Pill size={24} className="stroke-[2.5]" />
                <h1 className="text-xl font-extrabold tracking-tight">DAWAI SAHI · GENERIC SUBSTITUTION SLIP</h1>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Verified Bioequivalent Formulations (Jan Aushadhi &amp; Dava India Generic Chains)
              </p>
            </div>
            <div className="text-right text-xs text-gray-600">
              <p>Date: {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
              <p className="font-semibold text-emerald-900 mt-0.5">PMBJP Helpline: 1800-180-8080</p>
            </div>
          </div>

          {/* Pharmacist Instructions Box */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-950 flex items-start gap-2.5">
            <CheckCircle2 size={16} className="text-emerald-700 shrink-0 mt-0.5" />
            <div>
              <strong className="block text-emerald-900 font-bold mb-0.5">Dear Pharmacist / Jan Aushadhi / Dava India Operator:</strong>
              Please dispense the equivalent generic formulation for the prescribed medicines listed below matching active molecule and strength.
            </div>
          </div>

          {/* Medicine Comparison Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-gray-200 rounded-lg overflow-hidden">
              <thead className="bg-gray-100 text-gray-700 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-2.5 border-b">#</th>
                  <th className="p-2.5 border-b">Prescribed Brand</th>
                  <th className="p-2.5 border-b">Active Molecule &amp; Strength</th>
                  <th className="p-2.5 border-b">🏛️ Jan Aushadhi (PMBJP)</th>
                  <th className="p-2.5 border-b">🏥 Dava India</th>
                  <th className="p-2.5 border-b text-right">Branded MRP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {basket.map((item, idx) => (
                  <tr key={item.id || idx} className="hover:bg-gray-50/50">
                    <td className="p-2.5 font-bold text-gray-500">{idx + 1}</td>
                    <td className="p-2.5 font-bold text-gray-900">
                      {item.brandName}
                      <span className="block font-normal text-[10px] text-gray-500">
                        {item.packSize || item.dosageForm}
                      </span>
                    </td>
                    <td className="p-2.5 text-gray-800">
                      <strong>{item.genericName}</strong>
                      <span className="block text-[11px] text-emerald-800 font-semibold">{item.strength}</span>
                    </td>
                    <td className="p-2.5">
                      <span className="font-mono text-[10px] text-emerald-900 bg-emerald-50 px-1 py-0.5 rounded border border-emerald-200 block w-max">
                        {item.janAushadhi.drugCode || "PMBJP"}
                      </span>
                      <strong className="text-emerald-800 text-xs block mt-0.5">
                        ₹{item.janAushadhi.price.toFixed(2)}
                      </strong>
                    </td>
                    <td className="p-2.5">
                      <span className="font-mono text-[10px] text-blue-900 bg-blue-50 px-1 py-0.5 rounded border border-blue-200 block w-max">
                        {item.davaIndia?.productCode || "DI-GEN"}
                      </span>
                      <strong className="text-blue-800 text-xs block mt-0.5">
                        ₹{(item.davaIndia?.price || item.janAushadhi.price * 1.2).toFixed(2)}
                      </strong>
                    </td>
                    <td className="p-2.5 text-right text-gray-400 line-through">
                      ₹{item.brandedPrice.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Savings Summary Banner */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs uppercase tracking-wider font-bold text-gray-500">Total Patient Spend &amp; Savings</span>
              <div className="text-xl font-black text-emerald-800 mt-0.5">
                Save ₹{totalSavings.toFixed(0)} ({savingsPercent}%) <span className="text-xs font-normal text-gray-500">at Jan Aushadhi</span>
              </div>
              <div className="text-sm font-bold text-blue-800 mt-0.5">
                Save ₹{davaSavings.toFixed(0)} ({davaSavingsPercent}%) <span className="text-xs font-normal text-gray-500">at Dava India</span>
              </div>
            </div>
            <div className="text-right text-xs space-y-1">
              <div className="text-gray-500">Commercial Branded: <span className="line-through font-bold">₹{totalBranded.toFixed(2)}</span></div>
              <div className="font-bold text-emerald-900">PMBJP Bill: ₹{totalJan.toFixed(2)}</div>
              <div className="font-bold text-blue-900">Dava India Bill: ₹{totalDavaIndia.toFixed(2)}</div>
            </div>
          </div>

          {/* Legal / Medical Note */}
          <div className="border-t border-gray-200 pt-3 flex items-start gap-2 text-[10px] text-gray-500 leading-tight">
            <AlertTriangle size={14} className="shrink-0 text-amber-600 mt-0.5" />
            <p>
              <strong>Notice:</strong> This document is an informational substitution guide. Pharmacists must exercise professional judgment to ensure strength, salt bioavailability, and dosing form compatibility prior to dispensing.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
