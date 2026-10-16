const { postJson, splitList } = require('./http');

const GROQ_URL        = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_MODELS = 'openai/gpt-oss-120b,qwen/qwen3.8-27b';

function parseArguments(raw) {
  try {
    return JSON.parse(raw) || {};
  } catch {
    return {};
  }
}

function toOpenAiMessages(system, messages) {
  return [
    { role: 'system', content: system },
    ...messages.flatMap(m => {
      if (m.role === 'user') return [{ role: 'user', content: m.text }];
      if (m.role === 'tool') {
        return m.results.map(r => ({ role: 'tool', tool_call_id: r.id, content: JSON.stringify(r.result) }));
      }
      return [{
        role:    'assistant',
        content: m.text || null,
        ...(m.toolCalls?.length && {
          tool_calls: m.toolCalls.map(c => ({
            id:       c.id,
            type:     'function',
            function: { name: c.name, arguments: JSON.stringify(c.args) },
          })),
        }),
      }];
    }),
  ];
}

module.exports = {
  name: 'groq',
  isConfigured: () => Boolean(process.env.GROQ_API_KEY),
  models:       () => splitList(process.env.GROQ_MODELS, DEFAULT_MODELS),

  async call(model, { system, messages, tools }) {
    const result = await postJson(
      GROQ_URL,
      { Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
      {
        model,
        messages:    toOpenAiMessages(system, messages),
        tools:       tools.map(t => ({ type: 'function', function: t })),
        tool_choice: 'auto',
      }
    );
    if (!result.ok) return result;

    const message = result.data.choices?.[0]?.message;

    return {
      ok:        true,
      text:      (message?.content || '').trim(),
      toolCalls: (message?.tool_calls || []).map(c => ({
        id:   c.id,
        name: c.function.name,
        args: parseArguments(c.function.arguments),
      })),
    };
  },
};
