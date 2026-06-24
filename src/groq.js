import dotenv from 'dotenv';
dotenv.config();

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.1-70b-versatile';

/**
 * Sends a chat query to Groq
 * @param {Array<{role: string, content: string}>} messages 
 * @returns {Promise<string>}
 */
export async function queryGroq(messages) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey.includes('your-groq-key')) {
    console.warn('⚠️ GROQ_API_KEY is not configured in environment variables.');
    return `[LLM Offline Fallback] Groq API key is missing. Please set GROQ_API_KEY in your .env file.`;
  }

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: messages,
        temperature: 0.1
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Groq HTTP Error ${response.status}: ${errText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('Error querying Groq:', error.message);
    return `[LLM Offline Fallback] I could not reach the Groq API. Error details: ${error.message}`;
  }
}
