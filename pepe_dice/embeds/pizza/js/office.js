// Pepe's Back Office: the plain calculator form over POST /api/discounts/quote.

import { api } from "./api.js";
import { sfx } from "./audio.js";
import { $, esc, fmt } from "./ui.js";

let invoices = new Map();

export async function initOffice() {
  const select = $("office-invoice");
  try {
    const customers = await api.customers();
    for (const c of customers) {
      const group = document.createElement("optgroup");
      group.label = `${c.emoji} ${c.name} (${c.tier})`;
      for (const inv of c.invoices) {
        invoices.set(inv.id, { ...inv, tier: c.tier });
        group.append(new Option(`${inv.id} · ${fmt(inv.amount)} · ${inv.description}`, inv.id));
      }
      select.append(group);
    }
  } catch (err) {
    $("office-out").innerHTML = `<p class="error">Couldn't load customers: ${err.message}</p>`;
  }

  select.addEventListener("change", () => {
    const inv = invoices.get(select.value);
    if (!inv) return;
    $("office-amount").value = inv.amount;
    $("office-tier").value = inv.tier;
    $("office-days").value = inv.days_overdue;
    $("office-approved").checked = inv.exception_approved;
    $("office-approver").value = inv.approved_by || "";
  });

  $("office-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const out = $("office-out");
    try {
      const q = await api.quote({
        amount: $("office-amount").value.replace(/[$,\s]/g, ""),
        tier: $("office-tier").value,
        days_overdue: Number($("office-days").value) || 0,
        exception_approved: $("office-approved").checked,
        approved_by: $("office-approver").value || null,
      });
      sfx.ding();
      out.innerHTML = `
        <div>Discount: <span class="big">${fmt(q.discount)}</span></div>
        <div>Net due: <strong>${fmt(q.net_amount)}</strong> · Rate applied: ${(Number(q.rate_applied) * 100).toFixed(0)}%</div>
        ${q.capped ? '<span class="flag cap">CAPPED AT $25K</span>' : ""}
        ${q.zeroed_for_overdue ? '<span class="flag zero">ZEROED: OVERDUE</span>' : ""}
        <ul class="audit" style="margin-top:12px">${q.audit_trail.map((l) => `<li>${esc(l)}</li>`).join("")}</ul>`;
    } catch (err) {
      sfx.hit();
      out.innerHTML = `<p class="error">✖ ${esc(err.message)}</p>`;
    }
  });
}
