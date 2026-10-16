const REQUEST_TIMEOUT_MS = 12000;

async function postJson(url, headers, body) {
  try {
    const response = await fetch(url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body:    JSON.stringify(body),
      signal:  AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) return { ok: false, status: response.status };
    return { ok: true, data: await response.json() };
  } catch {
    return { ok: false, status: 504 };
  }
}

const splitList = (value, fallback) =>
  (value || fallback).split(',').map(item => item.trim()).filter(Boolean);

module.exports = { postJson, splitList };
