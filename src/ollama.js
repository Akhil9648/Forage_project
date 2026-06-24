import dotenv from 'dotenv';
dotenv.config();

const OLLAMA_API_URL = process.env.OLLAMA_API_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5-coder';

/**
 * Sends a chat query to Ollama
 * @param {Array<{role: string, content: string}>} messages 
 * @returns {Promise<string>}
 */
export async function queryOllama(messages) {
  try {
    const response = await fetch(`${OLLAMA_API_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: messages,
        stream: false
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama HTTP Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.message.content;
  } catch (error) {
    console.error('Error querying Ollama:', error.message);
    return `[LLM Offline Fallback] I could not reach Ollama at ${OLLAMA_API_URL}. Please ensure it is running (run 'ollama run ${OLLAMA_MODEL}' in your terminal). Error details: ${error.message}`;
  }
}
