const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

async function fetchGeminiResponse(prompt) {
    console.log(prompt)
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: "Explain what the following code does in simple terms.\nMake sure to:\n- Break it down step by step\n- Use bullet points where needed\n- Format code snippets using backticks\n- Keep it concise but thorough\n Do not explain extremely obvious things and try to keep it short and sweet \n I need to display this on my web app so for bold headings use two bullet points (**)\n\nHere is the code(if this is not code then return a blank statement):\n"+ prompt,
              },
            ],
          },
        ],
      }),
    }
  );

  const data = await res.json();
  console.log("Gemini API Response:", data);
  return data;
}

export default fetchGeminiResponse;