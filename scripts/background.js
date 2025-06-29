/**
 * Ask Gemini 2.5 API to generate a quiz.
 */
async function askGemini2_5(videoTitle, videoUrl, timeStamp) {
  const prompt = `
You are an AI designed to generate quiz questions based on YouTube video content.

Your task is to create a quiz based on the video title and URL given below. The user has watched the video till the time stamp in seconds. Use the captions (or transcript) available until that point.

For timestamps:
- Up to 5 minutes: 7 questions
- Up to 15 minutes: at least 15
- Up to 30 minutes: at least 25
- Over 30: proportionally more

Do NOT say "according to the video". Focus only on the *knowledge* a student would retain.

Video Title: "${videoTitle}"  
YouTube URL: ${videoUrl}  
Timestamp: ${timeStamp} seconds

Return ONLY a valid JSON in this format:

{
  "quizTitle": "string",
  "questions": [
    {
      "question": "string",
      "options": ["A.", "B.", "C.", "D."],
      "answer": "A", 
      "explanation": "string"
    },
    ...
  ]
}
`;


  const body = {
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }]
      }
    ]
  };
  const proxyUrl = "https://youtube-recap-quiz-proxy.vercel.app/api/google-proxy";

  try {
    const response = await fetch(proxyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`Gemini API Error: ${response.status} - ${response.statusText}`);
    }

    const data = await response.json();
    console.log("Gemini 2.5 response:", data);

    return data.candidates?.[0]?.content?.parts?.[0]?.text || "No quiz generated.";
  } catch (error) {
    console.error("Gemini API call failed:", error);
    throw error;
  }
}

let videoTitle = "";
let videoUrl = "";
let videoTimestamp = 0;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "finalizeVideoData") {
    videoTimestamp = message.data.timestamp;
    videoUrl = message.data.url;
    videoTitle = message.data.videoTitle;
    console.log("Button Clicked!");
    console.log(videoUrl);
    console.log(videoTitle);
    console.log(videoTimestamp);

    askGemini2_5(videoTitle, videoUrl, videoTimestamp)
      .then((quiz) => {
        sendResponse({ quiz });
      })
      .catch((err) => {
        console.error("Gemini Error:", err);
        sendResponse({ quiz: "Failed to generate quiz." });
      });
    return true; // async response
  }
});
