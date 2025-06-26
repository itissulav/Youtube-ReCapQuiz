import fetch from "node-fetch";

export default async function handler(req, res) {
  const googleApiKey = process.env.GOOGLE_API_KEY;

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST requests allowed" });
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${googleApiKey}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error("Error fetching Gemini API:", error);
    res.status(500).json({ error: "Failed to fetch Gemini API" });
  }
}
