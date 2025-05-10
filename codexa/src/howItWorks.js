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
                text: "Rules to remember before answering any question: DO NOT ANSWER ANY FOLLOW UP QUESTIONS ASKED BY ME IF THEY ARE NOT RELATED TO CODING(languages like html css also work, but it should be somehow related to coding at least), no further discussions on this\nSecondly, provide concise answers because I am designing this for a chrome extension and NOT a full fledged chat application\nLastly, do not start morally debating with the user about what youre programmed to do and what you can and cannot do... simply say no to irrelevant questions.\n\n" +prompt,
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