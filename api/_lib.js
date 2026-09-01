// Helpers compartilhados pelas rotas serverless de pagamento (/api/payments/*).
// Este projeto é um site estático (sem framework) - a Vercel trata qualquer
// arquivo dentro de /api como função serverless Node isolada, então cada
// rota importa este módulo em vez de repetir a lógica.
const { createClient } = require("@supabase/supabase-js");

// Plano único: R$20/mês por e-mail cadastrado, sem limite de leituras/jogos
// (diferente do Fluxo Insight, aqui não é "por uso" - é acesso ao app).
const PLAN = { code: "soletra_familia", label: "Soletra Hero Arcade - Acesso Família", amount: 20 };

function getSupabaseAdmin() {
  const url = (process.env.SUPABASE_URL || "").trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  if (!url || !key) throw new Error("Supabase não configurado no servidor (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function authenticatedUser(req) {
  const header = req.headers["authorization"] || req.headers["Authorization"] || "";
  const token = String(header).replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.auth.getUser(token);
  return error ? null : data.user;
}

function getMercadoPagoToken() {
  return (process.env.MERCADOPAGO_ACCESS_TOKEN || "").trim() || undefined;
}

// Contas admin/master (mesmo papel usado no painel de usuários do auth.js)
// nunca pagam - útil pra você mesmo testar e pra contas de administração.
async function isExemptRole(admin, userId) {
  const { data } = await admin.from("profiles").select("role").eq("id", userId).maybeSingle();
  return data?.role === "admin" || data?.role === "master";
}

// Lê o corpo JSON de um request de função serverless da Vercel (o runtime
// Node "clássico" não faz isso sozinho como o Next.js faz).
async function readJsonBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  return await new Promise((resolve) => {
    let raw = "";
    req.on("data", (chunk) => { raw += chunk; });
    req.on("end", () => {
      try { resolve(raw ? JSON.parse(raw) : {}); } catch { resolve({}); }
    });
    req.on("error", () => resolve({}));
  });
}

module.exports = { PLAN, getSupabaseAdmin, authenticatedUser, getMercadoPagoToken, isExemptRole, readJsonBody };
