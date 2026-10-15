const { AppError } = require('../middleware/errorHandler');

const GEMINI_BASE_URL    = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_MODEL      = 'gemini-flash-latest';
const FALLBACK_MODEL     = 'gemini-3.1-flash-lite';
const REQUEST_TIMEOUT_MS = 25000;

const isRetryable = (status) => status === 429 || status >= 500;

async function requestModel(model, body) {
  try {
    return await fetch(`${GEMINI_BASE_URL}/${model}:generateContent`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
      body,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    return { ok: false, status: 504 };
  }
}

async function generateContent({ systemInstruction, contents, tools }) {
  if (!process.env.GEMINI_API_KEY) {
    throw new AppError('The booking assistant is not configured.', 503);
  }

  const models = [
    process.env.GEMINI_MODEL          || DEFAULT_MODEL,
    process.env.GEMINI_FALLBACK_MODEL || FALLBACK_MODEL,
  ];
  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: systemInstruction }] },
    contents,
    tools,
  });

  let response;
  for (const model of models) {
    response = await requestModel(model, body);
    if (response.ok || !isRetryable(response.status)) break;
  }

  if (response.ok) return response.json();
  if (response.status === 429) {
    throw new AppError('The assistant is busy right now. Please try again in a moment.', 429);
  }
  throw new AppError('The assistant is unavailable right now.', 502);
}

module.exports = { generateContent };
