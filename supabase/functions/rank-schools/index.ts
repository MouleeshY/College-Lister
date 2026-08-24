import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const MODEL = "gemini-2.5-flash";
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (request.method !== "POST") return json({ error: "Use POST for a ranking request." }, 405);
  if (!GEMINI_API_KEY) return json({ error: "The Gemini API key is not configured on the edge function." }, 503);

  try {
    const { schools, goal } = await request.json();
    if (!Array.isArray(schools) || schools.length === 0) return json({ error: "No schools provided." }, 400);

    const prompt = `You are helping a prospective PhD applicant compare graduate programs.
Rank every school using the six score fields and the available details. Consider the applicant's priority if provided.
Give one concise rationale per school and a short overall recommendation.
Applicant priority: ${goal || "No additional priority provided."}
Schools JSON:
${JSON.stringify(schools)}

Return only valid JSON in this exact shape:
{"ranking":[{"name":"string","rank":1,"rationale":"string"}],"recommendation":"string"}`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
      }),
    });
    if (!response.ok) return json({ error: "Gemini returned an error. Check the edge-function API key and quota." }, 502);

    const result = await response.json();
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return json({ error: "Gemini returned an empty report." }, 502);
    return json(JSON.parse(text.replace(/^```json\s*|\s*```$/g, "").trim()));
  } catch (error) {
    console.error(error);
    return json({ error: "The ranking report could not be prepared." }, 500);
  }
});