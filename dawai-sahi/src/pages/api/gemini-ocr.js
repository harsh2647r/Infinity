import medicinesDb from "../../data/medicines-db.json";
import { searchMedicines } from "../../lib/fuzzySearch";
import { extractMedicinesFromOcr } from "../../lib/handwritingPreprocessor";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb"
    }
  }
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { image } = req.body || {};
  if (!image) {
    return res.status(400).json({ error: "No image provided" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "GEMINI_API_KEY not configured in environment" });
  }

  try {
    let mimeType = "image/jpeg";
    let base64Data = image;

    if (image.includes(";base64,")) {
      const parts = image.split(";base64,");
      mimeType = parts[0].replace("data:", "") || "image/jpeg";
      base64Data = parts[1];
    }

    const prompt = `You are an expert Indian clinical pharmacist analyzing an image of a doctor's handwritten prescription, medical slip, or medicine packaging/strip.
Extract all medicine names (brands or generics) and strengths (e.g. 650mg, 40mg, 625mg, 500mg, 20mg).
Ignore clinic letterhead names, doctor names, patient names, and addresses.
Return strictly a valid JSON object with no markdown formatting:
{
  "rawText": "transcription of medicine names and dosages seen",
  "medicines": [
    {
      "name": "e.g. Dolo 650",
      "strength": "e.g. 650 mg",
      "dosageForm": "e.g. Tablet",
      "instructions": "e.g. 1-0-1"
    }
  ]
}`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`;

    const geminiRes = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                inlineData: {
                  mimeType: mimeType,
                  data: base64Data
                }
              },
              {
                text: prompt
              }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.1
        }
      })
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.warn("Gemini API error, status:", geminiRes.status, errText);
      return res.status(geminiRes.status).json({
        error: "Gemini analysis error",
        details: errText
      });
    }

    const geminiData = await geminiRes.json();
    const candidateText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

    let parsedResult = {};
    try {
      parsedResult = JSON.parse(candidateText);
    } catch {
      const cleaned = candidateText.replace(/```json/g, "").replace(/```/g, "").trim();
      parsedResult = JSON.parse(cleaned);
    }

    const extractedList = parsedResult.medicines || [];
    const rawTranscription = parsedResult.rawText || "";

    const matchedMap = new Map();

    for (const item of extractedList) {
      const queryStr = `${item.name || ""} ${item.strength || ""}`.trim();
      if (!queryStr) continue;

      const matches = extractMedicinesFromOcr(queryStr, medicinesDb);
      if (matches.length > 0) {
        for (const m of matches) {
          if (!matchedMap.has(m.id)) {
            matchedMap.set(m.id, {
              ...m,
              ocrConfidence: 98,
              ocrClue: `Gemini Vision AI: "${item.name}" ${item.strength || ""}`
            });
          }
        }
      } else {
        const fuzzyList = searchMedicines(queryStr, medicinesDb, 2);
        for (const f of fuzzyList) {
          if (!matchedMap.has(f.id)) {
            matchedMap.set(f.id, {
              ...f,
              ocrConfidence: 92,
              ocrClue: `Gemini Vision Match: "${item.name}"`
            });
          }
        }
      }
    }

    if (rawTranscription && matchedMap.size === 0) {
      const textMatches = extractMedicinesFromOcr(rawTranscription, medicinesDb);
      for (const tm of textMatches) {
        if (!matchedMap.has(tm.id)) {
          matchedMap.set(tm.id, {
            ...tm,
            ocrConfidence: 90,
            ocrClue: "Gemini Transcription Clue"
          });
        }
      }
    }

    const finalMatches = Array.from(matchedMap.values()).slice(0, 5);

    return res.status(200).json({
      success: true,
      medicines: finalMatches,
      rawText: rawTranscription || candidateText.slice(0, 150),
      model: "gemini-3.8-flash"
    });
  } catch (error) {
    console.error("Gemini OCR route error:", error);
    return res.status(500).json({
      error: "Internal server error analyzing prescription",
      message: error.message
    });
  }
}
