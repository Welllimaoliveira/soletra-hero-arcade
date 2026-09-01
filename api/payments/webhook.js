const { createHmac, timingSafeEqual } = require("node:crypto");
const { getSupabaseAdmin, getMercadoPagoToken, readJsonBody } = require("../_lib");

// POST /api/payments/webhook - chamado pelo Mercado Pago quando uma
// assinatura ou pagamento muda de status. Regra de ouro: nunca confiar no
// conteúdo da notificação (ela só avisa "algo mudou no recurso X") -
// buscamos o estado real na API do Mercado Pago antes de gravar no banco.

function verifySignature(req, dataId) {
  const secret = (process.env.MERCADOPAGO_WEBHOOK_SECRET || "").trim();
  if (!secret) return true; // ainda não configurado no painel do Mercado Pago; não bloqueia, mas fica sem verificação.
  const signatureHeader = String(req.headers["x-signature"] || "");
  const requestId = String(req.headers["x-request-id"] || "");
  const parts = Object.fromEntries(signatureHeader.split(",").map((piece) => piece.trim().split("=", 2)));
  const ts = parts.ts;
  const v1 = parts.v1;
  if (!ts || !v1) return false;
  const manifest = `id:${String(dataId).toLowerCase()};request-id:${requestId};ts:${ts};`;
  const expected = createHmac("sha256", secret).update(manifest).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(v1));
  } catch {
    return false;
  }
}

async function mpFetch(path, token) {
  const response = await fetch(`https://api.mercadopago.com${path}`, { headers: { Authorization: `Bearer ${token}` } });
  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, data };
}

module.exports = async (req, res) => {
  if (req.method !== "POST") { res.status(405).json({ error: "Método não permitido." }); return; }
  const token = getMercadoPagoToken();
  if (!token) { res.status(503).json({ error: "Assinatura não configurada." }); return; }

  const body = await readJsonBody(req);
  const url = new URL(req.url, `https://${req.headers.host || "localhost"}`);
  const type = body?.type || body?.topic || url.searchParams.get("type") || url.searchParams.get("topic");
  const dataId = body?.data?.id || url.searchParams.get("data.id") || url.searchParams.get("id");
  if (!type || !dataId) { res.status(200).json({ ok: true }); return; } // notificação não reconhecida; 200 pro MP não insistir.

  if (!verifySignature(req, String(dataId))) {
    console.warn("Webhook Mercado Pago: assinatura inválida, ignorando notificação.");
    res.status(401).json({ error: "Assinatura inválida." });
    return;
  }

  const admin = getSupabaseAdmin();

  try {
    if (type === "preapproval") {
      const { ok, data } = await mpFetch(`/preapproval/${dataId}`, token);
      if (!ok) { res.status(502).json({ error: "Falha ao consultar assinatura no Mercado Pago." }); return; }

      const [userId, planCode] = String(data.external_reference || "").split(":");
      const statusMap = { authorized: "active", paused: "paused", cancelled: "cancelled", pending: "pending" };
      const status = statusMap[data.status] || "pending";

      const { data: existing } = await admin
        .from("subscriptions")
        .select("id,current_period_end")
        .eq("provider_subscription_id", dataId)
        .maybeSingle();

      const nextPeriodEnd = data?.auto_recurring?.next_payment_date
        ? new Date(data.auto_recurring.next_payment_date).toISOString()
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      await admin.from("subscriptions").upsert(
        {
          user_id: userId || undefined,
          provider: "mercado_pago",
          provider_subscription_id: String(dataId),
          status,
          plan_code: planCode || undefined,
          current_period_end: status === "active" ? nextPeriodEnd : existing?.current_period_end,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "provider_subscription_id" }
      );
    }

    if (type === "payment") {
      const { ok, data } = await mpFetch(`/v1/payments/${dataId}`, token);
      if (!ok) { res.status(502).json({ error: "Falha ao consultar pagamento no Mercado Pago." }); return; }
      const [userId] = String(data.external_reference || "").split(":");
      if (userId) {
        await admin.from("payments").upsert(
          {
            user_id: userId,
            provider: "mercado_pago",
            provider_payment_id: String(dataId),
            amount_cents: Math.round((data.transaction_amount || 0) * 100),
            currency: data.currency_id || "BRL",
            status: data.status || "pending",
            raw_status: data,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "provider_payment_id" }
        );
      }
    }

    res.status(200).json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Falha ao processar webhook." });
  }
};
