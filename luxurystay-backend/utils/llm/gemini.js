const crypto = require('crypto');
const { postJson, splitList } = require('./http');

const BASE_URL       = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_MODELS = 'gemini-flash-lite-latest,gemini-3.5-flash-lite,gemini-3.1-flash-lite';

const toGeminiSchema = (node) => {
  if (Array.isArray(node)) return node.map(toGeminiSchema);
  if (node && typeof node === 'object') {
    return Object.fromEntries(Object.entries(node).map(([key, value]) => [
      key,
      key === 'type' && typeof value === 'string' ? value.toUpperCase() : toGeminiSchema(value),
    ]));
  }
  return node;
};

function toContents(messages) {
  return messages.map(m => {
    if (m.role === 'user') return { role: 'user', parts: [{ text: m.text }] };
    if (m.role === 'tool') {
      return {
        role: 'user',
        parts: m.results.map(r => ({ functionResponse: { name: r.name, response: r.result } })),
      };
    }
    if (m.raw?.provider === 'gemini') return m.raw.content;
    return {
      role: 'model',
      parts: [
        ...(m.text ? [{ text: m.text }] : []),
        ...(m.toolCalls || []).map(c => ({ functionCall: { name: c.name, args: c.args } })),
      ],
    };
  });
}

module.exports = {
  name: 'gemini',
  isConfigured: () => Boolean(process.env.GEMINI_API_KEY),
  models:       () => splitList(process.env.GEMINI_MODELS, DEFAULT_MODELS),

  async call(model, { system, messages, tools }) {
    const result = await postJson(
      `${BASE_URL}/${model}:generateContent`,
      { 'x-goog-api-key': process.env.GEMINI_API_KEY },
      {
        systemInstruction: { parts: [{ text: system }] },
        contents: toContents(messages),
        tools: [{ functionDeclarations: tools.map(t => ({ ...t, parameters: toGeminiSchema(t.parameters) })) }],
      }
    );
    if (!result.ok) return result;

    const content = result.data.candidates?.[0]?.content;
    const parts   = content?.parts || [];

    return {
      ok:        true,
      text:      parts.map(p => p.text || '').join('').trim(),
      toolCalls: parts.filter(p => p.functionCall).map(p => ({
        id:   crypto.randomUUID(),
        name: p.functionCall.name,
        args: p.functionCall.args || {},
      })),
      raw: { provider: 'gemini', content },
    };
  },
};
