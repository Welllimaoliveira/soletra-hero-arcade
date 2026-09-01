const { PLAN, getSupabaseAdmin, authenticatedUser, getMercadoPagoToken, isExemptRole } = require("../_lib");

// POST /api/payments/subscribe - cria (ou reaproveita) a assinatura
// recorrente no Mercado Pago pro usuário logado e devolve o link de
// checkout (init_point). Nenhuma credencial do Mercado Pago passa pelo
// navegador - tudo roda aqui com o Access Token secreto do servidor.
module.exports = async (req, res) => {
  if (req.method !== "POST") { res.status(405).json({ error: "Método não permitido." }); return; }
  try {
    const token = getMercadoPagoToken();
    if (!token) { res.status(503).json({ error: "Assinatura ainda não configurada no servidor." }); return; }

    const user = await authenticatedUser(req);
    if (!user) { res.status(401).json({ error: "Sessão inválida." }); return; }
    if (!user.email) { res.status(400).json({ error: "Sua conta não tem e-mail confirmado." }); return; }

    const admin = getSupabaseAdmin();
    if (await isExemptRole(admin, user.id)) {
      res.status(400).json({ error: "Sua conta já tem acesso liberado e não precisa assinar." });
      return;
    }

    const appUrl = (process.env.APP_URL || "https://soletra-hero-arcade.vercel.app").trim();

    const mpResponse = await fetch("https://api.mercadopago.com/preapproval", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        reason: PLAN.label,
        external_reference: `${user.id}:${PLAN.code}`,
        payer_email: user.email,
        back_url: `${appUrl}/?assinatura=confirmada`,
        auto_recurring: {
          frequency: 1,
          frequency_type: "months",
          transaction_amount: PLAN.amount,
          currency_id: "BRL",
        },
      }),
    });
    const data = await mpResponse.json().catch(() => ({}));
    if (!mpResponse.ok) { res.status(502).json({ error: data?.message || `Mercado Pago HTTP ${mpResponse.status}` }); return; }

    // Registra como "pending" já aqui; o webhook confirma quando a pessoa
    // autoriza o pagamento no checkout e vira "active".
    await admin.from("subscriptions").upsert(
      {
        user_id: user.id,
        provider: "mercado_pago",
        provider_subscription_id: data.id,
        status: "pending",
        plan_code: PLAN.code,
      },
      { onConflict: "provider_subscription_id" }
    );

    res.status(200).json({ initPoint: data.init_point });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Falha ao criar assinatura." });
  }
};
