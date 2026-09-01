const { getSupabaseAdmin, authenticatedUser, isExemptRole, getMercadoPagoToken } = require("../_lib");

// GET /api/payments/status - diz se a conta logada pode usar o app: isenta
// (admin/master) ou com assinatura ativa. O paywall do cliente (billing.js)
// só libera o app depois de checar isto aqui - nunca confia em nada salvo
// só no navegador, pra não dar pra "destravar" editando o localStorage.
module.exports = async (req, res) => {
  if (req.method !== "GET") { res.status(405).json({ error: "Método não permitido." }); return; }
  try {
    const user = await authenticatedUser(req);
    if (!user) { res.status(401).json({ error: "Sessão inválida." }); return; }

    // Cobrança ainda não ligada (falta configurar o Access Token do Mercado
    // Pago no servidor) - libera todo mundo em vez de travar o app inteiro
    // numa tela de assinatura que ninguém consegue completar. Assim que o
    // token for configurado, a cobrança passa a valer sozinha, sem precisar
    // mexer neste arquivo de novo.
    if (!getMercadoPagoToken()) {
      res.status(200).json({ allowed: true, exempt: false, active: false, status: null, currentPeriodEnd: null, configured: false });
      return;
    }

    const admin = getSupabaseAdmin();
    const exempt = await isExemptRole(admin, user.id);

    const { data: subscription } = await admin
      .from("subscriptions")
      .select("status,plan_code,current_period_end")
      .eq("user_id", user.id)
      .order("current_period_end", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();

    const active =
      !!subscription &&
      subscription.status === "active" &&
      (!subscription.current_period_end || new Date(subscription.current_period_end) > new Date());

    res.status(200).json({
      allowed: exempt || active,
      exempt,
      active,
      status: subscription?.status || null,
      currentPeriodEnd: subscription?.current_period_end || null,
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Falha ao consultar assinatura." });
  }
};
