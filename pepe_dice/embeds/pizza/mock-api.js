// Static-site stand-in for the FastAPI backend in ebright09/pepe-fundamentals-assignment-1.
// It answers the same six /api/* routes in the browser, porting features/discounts/rules.py
// and features/levels/service.py. Money is kept in integer cents so rounding matches Decimal.
(() => {
  const TIER_RATES = { standard: 5, gold: 10, strategic: 15 }; // percent
  const OVERDUE_CUTOFF_DAYS = 30;
  const MAX_DISCOUNT = 2500000; // cents
  const BASE_COINS = 100, BOSS_MULTIPLIER = 3, EXACT_MULTIPLIER = 2, MAX_COMBO_BONUS = 5, CHOICE_COUNT = 4;

  const toCents = (s) => {
    const [whole, frac = ""] = String(s).replace(/[$,\s]/g, "").split(".");
    if (!/^-?\d*$/.test(whole) || !/^\d*$/.test(frac) || (whole === "" && frac === "")) return NaN;
    const neg = whole.startsWith("-");
    const f = (frac + "000").slice(0, 3);
    let c = Math.abs(parseInt(whole || "0", 10)) * 100 + parseInt(f.slice(0, 2), 10) + (Number(f[2]) >= 5 ? 1 : 0);
    return neg ? -c : c;
  };
  const str = (c) => `${c < 0 ? "-" : ""}${Math.floor(Math.abs(c) / 100)}.${String(Math.abs(c) % 100).padStart(2, "0")}`;
  const money = (c) => "$" + Number(str(c)).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const pctOf = (cents, pct) => Math.floor((cents * pct + 50) / 100); // ROUND_HALF_UP for non-negative

  class RuleError extends Error {}

  function calculateDiscount({ amount, tier, days_overdue = 0, exception_approved = false, approved_by = null }) {
    const amt = toCents(amount);
    if (Number.isNaN(amt)) throw new RuleError("That's not a number. That's a feeling.");
    if (amt < 0) throw new RuleError("Invoice amount cannot be negative.");
    if (!(tier in TIER_RATES)) throw new RuleError(`Unknown tier: '${tier}'`);
    let rate = TIER_RATES[tier];
    const trail = [`Tier '${tier}' earns ${rate}%.`];
    let zeroed = false;
    if (days_overdue > OVERDUE_CUTOFF_DAYS) {
      if (exception_approved) {
        trail.push(`${days_overdue} days overdue, but an exception was approved by ${approved_by || "someone (unnamed)"}. Rate kept.`);
      } else {
        rate = 0;
        zeroed = true;
        trail.push(`${days_overdue} days overdue (> ${OVERDUE_CUTOFF_DAYS}) and no approved exception. Rate set to 0%.`);
      }
    } else if (days_overdue > 0) {
      trail.push(`${days_overdue} days overdue is within the ${OVERDUE_CUTOFF_DAYS}-day limit. No penalty.`);
    }
    const raw = pctOf(amt, rate);
    const capped = raw > MAX_DISCOUNT;
    const discount = capped ? MAX_DISCOUNT : raw;
    trail.push(`${rate}% of ${money(amt)} = ${money(raw)}.`);
    if (capped) trail.push(`Capped at ${money(MAX_DISCOUNT)}. Nobody gets more than that. Nobody.`);
    return {
      amount: str(amt),
      rate_applied: rate === 0 ? "0" : (rate / 100).toFixed(2),
      discount: str(discount),
      net_amount: str(amt - discount),
      capped,
      zeroed_for_overdue: zeroed,
      audit_trail: trail,
    };
  }

  // Deterministic shuffle seeded by invoice id (the Python version seeds random.Random the same way).
  function seededShuffle(list, seed) {
    let h = 2166136261;
    for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
    const rnd = () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909)) >>> 0) / 4294967296;
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  }

  let dataPromise;
  const load = () =>
    (dataPromise ||= Promise.all(["customers.json", "levels.json", "pepe_quips.json"].map((f) => fetchReal(f).then((r) => r.json()))).then(
      ([customers, levels, quips]) => ({ customers, levels, quips })
    ));

  const truth = (customer, invoice) =>
    calculateDiscount({ ...invoice, tier: customer.tier, exception_approved: !!invoice.exception_approved, approved_by: invoice.approved_by || null });

  function findInvoice(data, id) {
    for (const c of data.customers) for (const i of c.invoices) if (i.id === id) return [c, i];
    return null;
  }

  function loadRound(data, levelId, roundIndex) {
    const level = data.levels.find((l) => l.id === levelId);
    if (!level || roundIndex < 0 || roundIndex >= level.invoices.length) throw new NotFound(`No round ${roundIndex} in level ${levelId}.`);
    const found = findInvoice(data, level.invoices[roundIndex]);
    if (!found) throw new NotFound(`Level ${levelId} points at a missing invoice.`);
    return [level, ...found];
  }

  function buildChoices(customer, invoice) {
    const correct = toCents(truth(customer, invoice).discount);
    const amt = toCents(invoice.amount);
    const rate = TIER_RATES[customer.tier];
    const traps = [pctOf(amt, rate), 0, pctOf(amt, rate + 5), pctOf(amt, Math.max(rate - 5, 2)), pctOf(amt, 25)];
    const choices = [correct];
    for (const t of traps) if (!choices.includes(t) && choices.length < CHOICE_COUNT) choices.push(t);
    return seededShuffle(choices, invoice.id).map(str);
  }

  const pick = (list) => list[Math.floor(Math.random() * list.length)];

  class NotFound extends Error {}
  class BadRequest extends Error {}

  async function route(method, path, body) {
    const data = await load();
    let m;
    if (method === "GET" && path === "/api/levels")
      return data.levels.map((l) => ({ id: l.id, name: l.name, subtitle: l.subtitle, boss: l.boss, intro: l.intro, invoice_ids: l.invoices, rounds: l.invoices.length }));
    if (method === "GET" && path === "/api/customers")
      return data.customers.map((c) => ({ ...c, invoices: c.invoices.map((i) => ({ exception_approved: false, approved_by: null, ...i, customer_id: c.id })) }));
    if (method === "GET" && (m = path.match(/^\/api\/levels\/quips\/(\w+)$/))) {
      if (!data.quips[m[1]]) throw new NotFound("Pepe has no words for that.");
      return data.quips[m[1]];
    }
    if (method === "GET" && (m = path.match(/^\/api\/levels\/(\d+)\/rounds\/(\d+)$/))) {
      const [level, customer, invoice] = loadRound(data, +m[1], +m[2]);
      return {
        level_id: level.id,
        round_index: +m[2],
        round_count: level.invoices.length,
        customer: { name: customer.name, tier: customer.tier, emoji: customer.emoji, bio: customer.bio },
        invoice: {
          id: invoice.id,
          description: invoice.description,
          amount: str(toCents(invoice.amount)),
          days_overdue: invoice.days_overdue,
          exception_approved: !!invoice.exception_approved,
          approved_by: invoice.approved_by || null,
        },
        choices: buildChoices(customer, invoice),
      };
    }
    if (method === "POST" && (m = path.match(/^\/api\/levels\/(\d+)\/attempt$/))) {
      const guess = toCents(body.guess ?? "");
      if (Number.isNaN(guess)) throw new BadRequest("That's not a number. That's a feeling.");
      const roundIndex = body.round_index || 0;
      const combo = Math.max(body.combo || 0, 0);
      const [level, customer, invoice] = loadRound(data, +m[1], roundIndex);
      const result = truth(customer, invoice);
      const correct = guess === toCents(result.discount);
      const last = roundIndex === level.invoices.length - 1;
      const kind = !correct ? "lose" : level.boss && last ? "boss_win" : (combo + 1) % 3 === 0 ? "streak" : "win";
      let coins = 0;
      if (correct) {
        coins = BASE_COINS * (1 + Math.min(combo, MAX_COMBO_BONUS));
        if (body.exact) coins *= EXACT_MULTIPLIER;
        if (level.boss) coins *= BOSS_MULTIPLIER;
      }
      return {
        correct,
        correct_discount: result.discount,
        coins,
        quip: pick(data.quips[kind]),
        level_cleared: correct && last,
        boss_defeated: correct && last && level.boss,
        result,
      };
    }
    if (method === "POST" && path === "/api/discounts/quote") {
      try {
        return calculateDiscount(body);
      } catch (e) {
        if (e instanceof RuleError) throw new BadRequest(e.message);
        throw e;
      }
    }
    throw new NotFound("Not Found");
  }

  const json = (status, obj) => new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json" } });
  const fetchReal = window.fetch.bind(window);

  window.fetch = async (input, init = {}) => {
    const url = typeof input === "string" ? input : input.url;
    const path = new URL(url, location.href).pathname.replace(/^.*(?=\/api\/)/, "");
    if (!path.startsWith("/api/")) return fetchReal(input, init);
    const method = (init.method || "GET").toUpperCase();
    try {
      const body = init.body ? JSON.parse(init.body) : {};
      return json(200, await route(method, path, body));
    } catch (e) {
      if (e instanceof NotFound) return json(404, { detail: e.message });
      if (e instanceof BadRequest || e instanceof SyntaxError) return json(400, { detail: e.message });
      return json(500, { detail: String(e) });
    }
  };
})();
