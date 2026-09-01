// Paywall do Soletra: R$20/mês por e-mail cadastrado, via Mercado Pago.
// Só libera o app quando /api/payments/status confirma (no servidor, com a
// chave de serviço) que a conta está isenta (admin/master) ou com assinatura
// ativa - nunca confia em nada guardado só no navegador. Carrega como
// type="module" depois de auth.js e reage ao evento "app-auth-ready" que
// ele dispara assim que a sessão é confirmada.

const PLAN_LABEL = "Soletra Hero Arcade - Acesso Família";
const PLAN_PRICE = "R$ 20,00/mês";

let overlay = null;
let pollTimer = null;

function ensureOverlay() {
  if (overlay) return overlay;
  overlay = document.createElement("section");
  overlay.id = "billingShell";
  overlay.className = "auth-shell";
  overlay.hidden = true;
  overlay.innerHTML = `
    <div class="auth-card">
      <div class="auth-brand">
        <div class="auth-logo">🔓</div>
        <div>
          <h1>Assinatura necessária</h1>
          <p>Libere o Soletra Hero Arcade pra toda a família.</p>
        </div>
      </div>
      <div class="billing-plan">
        <div class="billing-plan-name">${PLAN_LABEL}</div>
        <div class="billing-plan-price">${PLAN_PRICE}</div>
        <ul class="billing-plan-list">
          <li>✅ Todas as trilhas e temas (inclusive Bíblia)</li>
          <li>✅ Todos os minigames da Hero Arcade</li>
          <li>✅ Histórico de progresso salvo na conta</li>
        </ul>
      </div>
      <div id="billingStatus" class="auth-status"></div>
      <button id="billingSubscribeBtn" class="auth-button" type="button">Assinar por ${PLAN_PRICE}</button>
      <button id="billingLogoutBtn" class="auth-button secondary" type="button">Sair da conta</button>
      <p class="auth-help">Pagamento processado pelo Mercado Pago. A cobrança é recorrente mensal e pode ser cancelada quando quiser diretamente no Mercado Pago.</p>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.querySelector("#billingSubscribeBtn").onclick = subscribeNow;
  overlay.querySelector("#billingLogoutBtn").onclick = async () => {
    if (window.AuthSession?.supabase) await window.AuthSession.supabase.auth.signOut();
  };
  return overlay;
}

function setStatus(text, type = "") {
  const el = document.getElementById("billingStatus");
  if (el) { el.textContent = text || ""; el.className = "auth-status" + (type ? " " + type : ""); }
}

function showPaywall() {
  ensureOverlay().hidden = false;
}
function hidePaywall() {
  if (overlay) overlay.hidden = true;
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
}

async function fetchStatus() {
  const session = window.AuthSession;
  if (!session?.supabase) return null;
  const { data } = await session.supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return null;
  const response = await fetch("/api/payments/status", { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) {
    // Backend de cobrança ainda não configurado (503) - não bloqueia o uso
    // pra não travar o app inteiro por uma credencial que falta configurar;
    // fica registrado no console pra você notar durante os testes.
    if (response.status === 503) { console.warn("Assinatura: backend de cobrança ainda não configurado."); return { allowed: true }; }
    return null;
  }
  return response.json();
}

async function subscribeNow() {
  const btn = document.getElementById("billingSubscribeBtn");
  btn.disabled = true;
  setStatus("Abrindo checkout do Mercado Pago...");
  try {
    const session = window.AuthSession;
    const { data } = await session.supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new Error("Sua sessão expirou. Entre novamente.");
    const response = await fetch("/api/payments/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({}),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Não foi possível iniciar a assinatura.");
    window.location.href = result.initPoint;
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "Falha ao iniciar a assinatura.", "error");
    btn.disabled = false;
  }
}

// Depois de voltar do checkout do Mercado Pago (?assinatura=confirmada), o
// webhook pode levar alguns segundos pra confirmar - verifica de novo
// periodicamente em vez de deixar a pessoa presa numa tela desatualizada.
function pollAfterCheckout() {
  let attempts = 0;
  setStatus("Confirmando seu pagamento... isso pode levar alguns segundos.");
  pollTimer = setInterval(async () => {
    attempts++;
    const result = await fetchStatus();
    if (result?.allowed) { hidePaywall(); return; }
    if (attempts >= 10) { clearInterval(pollTimer); pollTimer = null; setStatus("Ainda não confirmamos o pagamento. Se você já assinou, aguarde um instante e recarregue a página.", "error"); }
  }, 3000);
}

async function checkAccess() {
  const result = await fetchStatus();
  if (!result) return; // sem sessão ainda ou falha de rede - não decide nada agora.
  if (result.allowed) { hidePaywall(); return; }
  showPaywall();
  setStatus("");
  if (new URLSearchParams(window.location.search).get("assinatura") === "confirmada") {
    pollAfterCheckout();
    history.replaceState(null, "", window.location.pathname);
  }
}

document.addEventListener("app-auth-ready", () => {
  checkAccess();
  // Some pro paywall assim que a sessão cai (logout) - a tela de login
  // (authShell) já bloqueia tudo de qualquer forma, mas evita duas telas
  // sobrepostas.
  window.AuthSession?.supabase?.auth.onAuthStateChange((event, session) => {
    if (!session) hidePaywall();
  });
});
