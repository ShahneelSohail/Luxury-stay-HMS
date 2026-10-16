const { AppError } = require('../../middleware/errorHandler');
const gemini = require('./gemini');
const groq   = require('./groq');

const PROVIDERS     = { gemini, groq };
const DEFAULT_ORDER = 'groq,gemini';
const PASSES        = 2;
const PASS_DELAY_MS = 1500;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const activeProviders = (preferred) =>
  (process.env.LLM_PROVIDERS || DEFAULT_ORDER)
    .split(',')
    .map(name => PROVIDERS[name.trim()])
    .filter(provider => provider?.isConfigured())
    .sort((a, b) => (b.name === preferred) - (a.name === preferred));

/**
 * Sends the conversation to the first provider/model that answers, trying every configured
 * provider and model in order, then a second pass, before giving up.
 * `session` carries the provider that last answered, so later steps of one conversation try it first.
 * Returns { text, toolCalls: [{ id, name, args }], raw }.
 */
async function chat({ system, messages, tools, session }) {
  const providers = activeProviders(session.preferred);
  if (!providers.length) throw new AppError('The booking assistant is not configured.', 503);

  let lastStatus;
  for (let pass = 0; pass < PASSES; pass++) {
    if (pass > 0) await sleep(PASS_DELAY_MS);

    for (const provider of providers) {
      for (const model of provider.models()) {
        const result = await provider.call(model, { system, messages, tools });
        if (result.ok) {
          session.preferred = provider.name;
          return result;
        }

        lastStatus = result.status;
        console.error(`[LLM] ${provider.name}/${model} responded ${result.status}`);
      }
    }
  }

  if (lastStatus === 429) {
    throw new AppError('The assistant is busy right now. Please try again in a moment.', 429);
  }
  throw new AppError('The assistant is unavailable right now.', 502);
}

module.exports = { chat };
