// The only frontend file that knows URLs. Everything else calls these functions.

async function request(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    // FastAPI validation errors (422) come back as a list of {msg} objects.
    const detail = Array.isArray(body.detail) ? body.detail.map((d) => d.msg).join("; ") : body.detail;
    throw new Error(detail || `Request failed (${response.status})`);
  }
  return body;
}

export const api = {
  levels: () => request("/api/levels"),
  round: (levelId, roundIndex) => request(`/api/levels/${levelId}/rounds/${roundIndex}`),
  attempt: (levelId, payload) =>
    request(`/api/levels/${levelId}/attempt`, { method: "POST", body: JSON.stringify(payload) }),
  quips: (kind) => request(`/api/levels/quips/${kind}`),
  customers: () => request("/api/customers"),
  quote: (payload) => request("/api/discounts/quote", { method: "POST", body: JSON.stringify(payload) }),
};
