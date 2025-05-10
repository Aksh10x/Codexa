const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

async function fetchFollowUpResponse(conversation) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: conversation
      }),
    }
  );

  const data = await res.json();
  console.log("Gemini API Response:", data);
  return data;
}

export default fetchFollowUpResponse;