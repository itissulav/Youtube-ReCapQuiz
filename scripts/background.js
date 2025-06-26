const API_KEY = "Your API Key";
console.log("Background script loaded and running");

async function askGemini2_5(videoTitle, videoUrl, timeStamp) {
  const prompt = `
You are an AI designed to generate quiz questions based on the YouTube video content.

Your task is to create a quiz based on the video title and URL given below. The user has watched the video till the time stamp seconds. See the transcripts or captions if transcripts are not available and according to the captions till the timestamp generate a quiz.
For time stamps that are longer than 15 minutes, make sure that there are sufficient number of quiz questions. The quiz should cover every topic that has been taught till the timestamp of the video. for time stamps till 5 mins make 7 questions. till 15 make 15 atleast. till 30 make 25 atleast. and so on. but the limit is 50 questions, even if time stamp is 3hrs.
Phrase the question in simplest terms such that a person who watched the video 30 mins ago can understand it. Also make the explanations simple as well.
Do **not** use phrases like "according to the video" or "the video says." Focus purely on the knowledge that a student might have absorbed by this point.

Video Title: "${videoTitle}"  
YouTube URL: ${videoUrl}  
Timestamp: ${timeStamp} seconds

Your response **must** follow this strict JSON structure:
{
  "quizTitle": "string",
  "questions": [
    {
      "question": "string",
      "options": ["A.", "B.", "C.", "D."],
      "answer": "A", // the correct option
      "explanation": "string"
    },
    ...
  ]
}

Make sure all fields are correctly filled. Do not return anything outside the JSON format.`;

  const body = {
    contents: [
      {
        role: "user",
        parts: [
          { text: prompt }
        ]
      }
    ]
  };

  // Replace this URL with your actual Vercel deployment URL
  const proxyUrl = "https://your-vercel-project.vercel.app/api/google-proxy";

  const response = await fetch(proxyUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
  }

  const data = await response.json();
  console.log("Gemini 2.5 response via proxy:", data);

  return data.candidates?.[0]?.content?.parts?.[0]?.text || "No response from Gemini";
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
