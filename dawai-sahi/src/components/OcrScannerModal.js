import { useState, useRef, useEffect } from "react";
import {
  Camera,
  Upload,
  X,
  LoaderCircle,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Search,
  ArrowRight,
  Zap,
  RefreshCw,
  Sliders,
  Type,
  FlipHorizontal,
  FileText
} from "lucide-react";
import { createWorker } from "tesseract.js";
import { preprocessPrescriptionImage, extractMedicinesFromOcr } from "../lib/handwritingPreprocessor";
import medicinesDb from "../data/medicines-db.json";
import { searchMedicines } from "../lib/fuzzySearch";

export default function OcrScannerModal({ onScanComplete, onClose }) {
  const [imagePreview, setImagePreview] = useState(null);
  const [ocrStatus, setOcrStatus] = useState("idle"); // idle, processing, done, error
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("");
  const [rawOcrText, setRawOcrText] = useState("");
  const [matchedMedicines, setMatchedMedicines] = useState([]);
  const [searchHint, setSearchHint] = useState("");
  const [useCameraStream, setUseCameraStream] = useState(false);
  const [facingMode, setFacingMode] = useState("environment"); // "environment" or "user"
  const [selectedDosage, setSelectedDosage] = useState(null);

  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Common Indian prescription dosages for 1-tap rapid resolution
  const commonDosages = [
    { label: "650 mg", value: "650", clue: "Dolo / Calpol / Paracetamol" },
    { label: "625 mg", value: "625", clue: "Augmentin / Clavam / Amoxyclav" },
    { label: "500 mg", value: "500", clue: "Azithral / Glycomet / Shelcal" },
    { label: "40 mg", value: "40", clue: "Pan 40 / Telma 40 / Pantocid" },
    { label: "20 mg", value: "20", clue: "Atorva 20 / Omez 20 / Rosuvas" },
    { label: "10 mg", value: "10", clue: "Montair LC / Cetirizine / Amlodipine" },
    { label: "5 mg", value: "5", clue: "Amlong 5 / Levocet 5 / Ramipril" }
  ];

  // Quick 1-tap doctor handwriting examples
  const quickPrescriptionClues = [
    { label: "Dolo 650", query: "Dolo 650", sub: "Paracetamol 650mg" },
    { label: "Augmentin 625", query: "Augmentin 625", sub: "Amoxicillin + Clavulanate" },
    { label: "Pan D", query: "Pan D", sub: "Pantoprazole + Domperidone" },
    { label: "Telma 40", query: "Telma 40", sub: "Telmisartan 40mg" },
    { label: "Glycomet 500", query: "Glycomet 500", sub: "Metformin 500mg" },
    { label: "Atorva 20", query: "Atorva 20", sub: "Atorvastatin 20mg" }
  ];

  // Stop camera stream on unmount
  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, []);

  function startCameraStream(preferredMode = facingMode) {
    stopCameraStream();
    setUseCameraStream(true);
    setImagePreview(null);
    setMatchedMedicines([]);
    setRawOcrText("");

    const constraints = {
      video: {
        facingMode: { ideal: preferredMode },
        width: { ideal: 1920, min: 1280 },
        height: { ideal: 1080, min: 720 }
      }
    };

    navigator.mediaDevices
      ?.getUserMedia(constraints)
      .then((stream) => {
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      })
      .catch((err) => {
        console.warn("Primary camera stream error, trying fallback:", err);
        // Fallback without resolution constraints
        navigator.mediaDevices
          ?.getUserMedia({ video: { facingMode: preferredMode } })
          .then((fallbackStream) => {
            streamRef.current = fallbackStream;
            if (videoRef.current) {
              videoRef.current.srcObject = fallbackStream;
              videoRef.current.play();
            }
          })
          .catch((finalErr) => {
            console.warn("All camera permissions failed:", finalErr);
            setUseCameraStream(false);
            fileInputRef.current?.click();
          });
      });
  }

  function toggleCameraFlip() {
    const nextMode = facingMode === "environment" ? "user" : "environment";
    setFacingMode(nextMode);
    startCameraStream(nextMode);
  }

  function stopCameraStream() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }

  function captureFromStream() {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.95);

    stopCameraStream();
    setUseCameraStream(false);
    setImagePreview(dataUrl);
    runOcrPipeline(dataUrl);
  }

  async function runOcrPipeline(imageSource) {
    setOcrStatus("processing");
    setProgress(25);
    setStatusText("Analyzing script with Google Gemini Vision AI...");

    // 1. Primary: High-accuracy multimodal prescription analysis via Gemini Vision
    try {
      const geminiRes = await fetch("/api/gemini-ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: imageSource })
      });

      if (geminiRes.ok) {
        const geminiData = await geminiRes.json();
        if (geminiData.medicines && geminiData.medicines.length > 0) {
          setProgress(100);
          setMatchedMedicines(geminiData.medicines);
          setRawOcrText(geminiData.rawText || "");
          setStatusText(`Gemini Vision AI detected ${geminiData.medicines.length} medicine formulation${geminiData.medicines.length > 1 ? "s" : ""}!`);
          setOcrStatus("done");
          return;
        } else if (geminiData.rawText) {
          setRawOcrText(geminiData.rawText);
        }
      }
    } catch (geminiErr) {
      console.warn("Gemini Vision endpoint fallback to local OCR:", geminiErr);
    }

    // 2. Secondary Fallback: Local client-side contrast preprocessor + Tesseract
    setProgress(40);
    setStatusText("Optimizing lighting & local OCR scanner...");

    try {
      let processedImage = imageSource;
      if (typeof window !== "undefined") {
        await new Promise((resolve) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => {
            try {
              processedImage = preprocessPrescriptionImage(img, { enhance: true });
            } catch (err) {
              console.warn("Canvas preprocessor error:", err);
            }
            resolve();
          };
          img.onerror = () => resolve();
          img.src = imageSource;
        });
      }

      setProgress(60);
      setStatusText("Scanning characters with on-device reader...");

      const worker = await createWorker("eng", 1, {
        logger: (m) => {
          if (m && m.status === "recognizing text") {
            const p = Math.round(60 + (m.progress || 0) * 30);
            setProgress(Math.min(90, p));
          }
        }
      });

      await worker.setParameters({
        tessedit_pageseg_mode: "3"
      });

      const recognizePromise = worker.recognize(processedImage);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("OCR timeout")), 12000)
      );

      const ret = await Promise.race([recognizePromise, timeoutPromise]);
      await worker.terminate();

      setProgress(95);
      setStatusText("Cross-referencing medicine formulations...");

      const text = ret.data?.text || "";
      setRawOcrText(text.trim());

      const matches = extractMedicinesFromOcr(text, medicinesDb);

      if (matches.length > 0) {
        setMatchedMedicines(matches);
        setStatusText(`Found ${matches.length} matching formulation${matches.length > 1 ? "s" : ""}!`);
      } else {
        const fuzzyFallbacks = searchMedicines(text, medicinesDb, 4);
        setMatchedMedicines(fuzzyFallbacks);
        if (fuzzyFallbacks.length > 0) {
          setStatusText(`Found ${fuzzyFallbacks.length} probable match${fuzzyFallbacks.length > 1 ? "es" : ""}!`);
        } else {
          setStatusText("Could not isolate clear name. Tap a dosage clue or type below:");
        }
      }

      setProgress(100);
      setOcrStatus("done");
    } catch (err) {
      console.warn("OCR execution error or fallback:", err);
      setOcrStatus("done");
      setStatusText("Scanning complete. Tap a dosage clue or type what you see:");
    }
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const url = event.target?.result;
      setImagePreview(url);
      runOcrPipeline(url);
    };
    reader.readAsDataURL(file);
  }

  // Real-time typing search: update results as user types!
  function handleLiveSearch(val) {
    setSearchHint(val);
    if (!val.trim()) {
      if (rawOcrText) {
        const matches = extractMedicinesFromOcr(rawOcrText, medicinesDb);
        setMatchedMedicines(matches);
      }
      return;
    }
    const matches = searchMedicines(val, medicinesDb, 4);
    setMatchedMedicines(matches);
    setOcrStatus("done");
  }

  // 1-Tap dosage filter
  function handleDosageSelect(dosageVal) {
    setSelectedDosage(dosageVal);
    const matches = extractMedicinesFromOcr(dosageVal, medicinesDb);
    setMatchedMedicines(matches);
    setOcrStatus("done");
    setStatusText(`Showing medicines matching ${dosageVal} mg:`);
  }

  function handleQuickClue(query) {
    const matches = searchMedicines(query, medicinesDb, 3);
    setMatchedMedicines(matches);
    setOcrStatus("done");
    setStatusText(`Matched "${query}"!`);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[92vh] flex flex-col shadow-2xl border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-3.5 sm:p-4 border-b border-gray-100 bg-emerald-950 text-white">
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-emerald-800 rounded-xl">
              <Camera size={20} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm">
                  Handwriting &amp; Strip Camera Scanner
                </h3>
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-400/30 flex items-center gap-1">
                  <Sparkles size={10} className="text-emerald-300" />
                  Gemini Vision AI
                </span>
              </div>
              <p className="text-[11px] text-emerald-200/80">
                Google Gemini Multimodal AI for doctor prescriptions &amp; strips
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              stopCameraStream();
              onClose();
            }}
            className="p-1.5 text-emerald-200 hover:text-white rounded-lg hover:bg-emerald-900 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs text-gray-700">
          {/* Live Camera Viewfinder OR Photo Upload Area */}
          {useCameraStream ? (
            <div className="relative rounded-2xl overflow-hidden bg-black text-center border-2 border-emerald-600 shadow-inner">
              <video ref={videoRef} className="w-full h-64 object-cover" playsInline muted />

              {/* Target alignment frame */}
              <div className="absolute inset-5 border-2 border-dashed border-emerald-400/90 rounded-xl pointer-events-none flex flex-col items-center justify-between p-2">
                <span className="bg-emerald-950/80 text-emerald-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-700/50 backdrop-blur-xs">
                  Center Medicine Name or Prescription Line Here
                </span>
                <span className="text-[9px] text-white/80 bg-black/50 px-2 py-0.5 rounded">
                  Hold camera steady with good lighting
                </span>
              </div>

              {/* Bottom camera controls */}
              <div className="absolute bottom-3 inset-x-0 flex items-center justify-center gap-2 px-3">
                <button
                  type="button"
                  onClick={toggleCameraFlip}
                  className="p-2.5 bg-black/60 hover:bg-black/80 text-white rounded-full backdrop-blur-xs cursor-pointer border border-white/20"
                  title="Switch Front/Back Camera"
                >
                  <FlipHorizontal size={16} />
                </button>

                <button
                  type="button"
                  onClick={captureFromStream}
                  className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs rounded-full shadow-lg flex items-center gap-2 cursor-pointer transition-transform active:scale-95"
                >
                  <Camera size={16} /> Scan This Photo
                </button>

                <button
                  type="button"
                  onClick={() => {
                    stopCameraStream();
                    setUseCameraStream(false);
                  }}
                  className="px-3 py-2 bg-white/80 hover:bg-white text-gray-800 text-xs rounded-full font-bold cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-emerald-300 hover:border-emerald-600 rounded-2xl p-4 text-center cursor-pointer transition-all bg-emerald-50/20 hover:bg-emerald-50/60 flex flex-col items-center justify-center gap-2 group"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {imagePreview ? (
                  <div className="w-full max-h-40 overflow-hidden rounded-xl border border-emerald-200 bg-black/5 flex items-center justify-center">
                    <img src={imagePreview} alt="Captured strip" className="object-contain max-h-40 mx-auto" />
                  </div>
                ) : (
                  <>
                    <div className="p-3 bg-white rounded-full shadow-sm text-emerald-800 border border-emerald-200 group-hover:scale-105 transition-transform">
                      <Camera size={26} />
                    </div>
                    <div>
                      <strong className="block text-gray-900 text-sm font-bold">
                        Take Photo of Handwritten Script or Medicine Strip
                      </strong>
                      <span className="text-gray-500 text-[11px] block mt-0.5">
                        Tap here to open phone camera or upload a saved photo
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Viewfinder & File re-select actions */}
              <div className="flex items-center justify-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => startCameraStream("environment")}
                  className="text-xs font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1.5 cursor-pointer bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg border border-emerald-200 transition-colors"
                >
                  <Camera size={14} />
                  <span>Open Live Camera Viewfinder</span>
                </button>

                {imagePreview && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs font-bold text-gray-600 hover:text-gray-900 flex items-center gap-1.5 cursor-pointer bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <Upload size={14} />
                    <span>Upload Different Photo</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Processing Indicator with Real-Time Progress Bar */}
          {ocrStatus === "processing" && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between font-bold text-emerald-950 text-xs">
                <span className="flex items-center gap-2">
                  <LoaderCircle size={15} className="spin text-emerald-700" />
                  {statusText}
                </span>
                <span className="font-mono text-emerald-800">{progress}%</span>
              </div>
              <div className="w-full bg-emerald-200/80 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-700 h-full transition-all duration-300 rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* 1-TAP DOSAGE FILTER BUTTONS (Solves blurry/cursive doctor scripts instantly) */}
          <div className="bg-gray-50/80 rounded-xl p-2.5 border border-gray-200/80 space-y-1.5">
            <span className="text-[10px] font-extrabold text-gray-600 uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1 text-emerald-900 font-black">
                <Zap size={11} className="text-emerald-700 fill-emerald-700" />
                Dosage Clue Filter (Tap to find instantly):
              </span>
              <span className="text-[9px] text-gray-400 font-normal">Common Indian Dosages</span>
            </span>
            <div className="flex flex-wrap gap-1.5">
              {commonDosages.map((d) => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => handleDosageSelect(d.value)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-extrabold border transition-all cursor-pointer ${
                    selectedDosage === d.value
                      ? "bg-emerald-800 text-white border-emerald-900 shadow-xs"
                      : "bg-white text-gray-800 hover:text-emerald-900 hover:bg-emerald-50 border-gray-200"
                  }`}
                  title={d.clue}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* RECOGNIZED MEDICINES (1-Click Select & Compare) */}
          {matchedMedicines.length > 0 && (
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-emerald-700" />
                  Detected Medicines (Tap to View Savings):
                </span>
                <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  {matchedMedicines.length} found
                </span>
              </div>

              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {matchedMedicines.map((med) => (
                  <div
                    key={med.id}
                    onClick={() => onScanComplete(med.brandNames[0])}
                    className="p-3 bg-gradient-to-r from-emerald-50/90 to-white hover:from-emerald-100/90 hover:to-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-3 cursor-pointer transition-all shadow-2xs hover:shadow-xs group"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-emerald-950 text-sm font-black group-hover:text-emerald-900">
                          {med.brandNames[0]}
                        </strong>
                        <span className="text-[10px] font-bold text-emerald-800 bg-white px-1.5 py-0.2 rounded border border-emerald-200">
                          {med.strength}
                        </span>
                        {med.ocrConfidence && (
                          <span className="text-[9px] font-black text-emerald-800 bg-emerald-100/80 px-1.5 py-0.2 rounded-full">
                            {med.ocrConfidence}% match
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-gray-600 block mt-0.5">
                        {med.genericMolecule} · {med.dosageForm}
                      </span>
                      {med.ocrClue && (
                        <span className="text-[10px] text-emerald-700 font-medium block mt-0.5 italic">
                          ↳ {med.ocrClue}
                        </span>
                      )}
                    </div>

                    <div className="text-right shrink-0 flex items-center gap-2">
                      <div>
                        <span className="text-xs font-black text-emerald-800 block">
                          ₹{med.brandedMrp} → ₹{med.janAushadhi?.price || med.davaIndia?.price}
                        </span>
                        <span className="text-[10px] font-bold text-emerald-600 block">
                          Save {med.savings?.percent || 75}%
                        </span>
                      </div>
                      <ArrowRight size={15} className="text-emerald-700 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Raw Text Read Preview */}
          {rawOcrText && (
            <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-200 text-[10px] text-gray-600">
              <strong className="block text-gray-800 font-bold mb-0.5 flex items-center gap-1">
                <FileText size={11} className="text-gray-500" />
                Raw Text Detected by Camera OCR:
              </strong>
              <p className="truncate font-mono bg-white p-1.5 rounded border border-gray-100 text-gray-700">
                &ldquo;{rawOcrText}&rdquo;
              </p>
            </div>
          )}

          {/* Real-Time Live Search (Type 1-2 letters from the script) */}
          <div className="pt-2 border-t border-gray-100 space-y-1.5">
            <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wide block">
              Can&apos;t scan clearly? Type 2 letters you see on prescription:
            </span>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchHint}
                onChange={(e) => handleLiveSearch(e.target.value)}
                placeholder="e.g. 'do', 'pan', 'aug', 'tel', '650'..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gray-300 bg-white focus:outline-none focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700 shadow-2xs"
              />
            </div>
          </div>

          {/* Common Prescribed Medicines (1-Tap Test) */}
          <div className="pt-2 border-t border-gray-100 space-y-1.5">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
              Top Prescribed Medicines (1-Tap Test):
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {quickPrescriptionClues.map((clue) => (
                <button
                  key={clue.label}
                  type="button"
                  onClick={() => handleQuickClue(clue.query)}
                  className="p-1.5 bg-gray-50 hover:bg-emerald-50 border border-gray-200 hover:border-emerald-300 rounded-lg text-left transition-colors cursor-pointer"
                >
                  <strong className="block text-gray-900 text-[11px] font-bold">{clue.label}</strong>
                  <span className="text-[9px] text-gray-400 block truncate">{clue.sub}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
