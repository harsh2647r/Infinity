import { AlertTriangle, ShieldCheck } from "lucide-react";

export default function MedicalDisclaimer({ compact = false }) {
  if (compact) {
    return (
      <div className="flex items-center gap-2 text-xs text-amber-800 bg-amber-50/90 border border-amber-200/80 rounded-lg p-2.5">
        <AlertTriangle size={15} className="shrink-0 text-amber-600" />
        <span>
          <strong>Disclaimer:</strong> Molecule & price comparison only, not medical advice. Confirm any brand substitution with your doctor or pharmacist.
        </span>
      </div>
    );
  }

  return (
    <aside className="my-6 p-4 rounded-xl border border-amber-200 bg-amber-50/70 text-amber-950 text-xs leading-relaxed shadow-sm">
      <div className="flex items-start gap-3">
        <div className="p-1.5 bg-amber-100 rounded-lg text-amber-800 shrink-0 mt-0.5">
          <AlertTriangle size={18} />
        </div>
        <div className="space-y-1">
          <h4 className="font-bold text-amber-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
            Official Regulatory & Medical Disclaimer
          </h4>
          <p className="text-amber-900/90">
            <strong>Dawai Sahi</strong> provides molecule equivalence and price benchmarks published by the <strong>Pradhan Mantri Bhartiya Janaushadhi Pariyojana (PMBJP)</strong> and the <strong>National Pharmaceutical Pricing Authority (NPPA)</strong>.
          </p>
          <p className="text-amber-800/80">
            This tool does <strong>not</strong> make clinical substitution decisions. Certain extended-release formulations, narrow-therapeutic-index drugs, or specific salt forms require physician guidance. <strong>Always present your prescription and verify equivalence with your doctor or licensed pharmacist.</strong>
          </p>
        </div>
      </div>
    </aside>
  );
}
