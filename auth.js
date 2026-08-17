import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4?bundle';

const SUPABASE_URL = 'https://jptxomplvexsfyynmxju.supabase.co';
const SUPABASE_KEY = 'sb_publishable_IiBMmoxgFSC2z_cAifv5Ow_kSXj3wWF';

const APP_URL = 'https://soletra-hero-arcade.vercel.app/';

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);

let currentUser = null;
let currentProfile = null;
let mode = 'login';

document.body.insertAdjacentHTML('afterbegin', `
<section id="authShell" class="auth-shell" aria-live="polite">
  <div class="auth-card">

    <div class="auth-brand">
      <div class="auth-logo">🧩</div>
      <div>
        <h1>Soletra Hero Arcade</h1>
        <p>Sua conta protege seu acesso e seu progresso neste aparelho.</p>
      </div>
    </div>

    <div id="authTabs" class="auth-tabs">
      <button class="auth-tab active" data-mode="login">Entrar</button>
      <button class="auth-tab" data-mode="signup">Criar conta</button>
    </div>

    <form id="authForm" class="auth-form">

      <label id="authNameLabel" class="auth-label" hidden>
        Nome completo
        <input
          id="authName"
          class="auth-input"
          autocomplete="name"
        >
      </label>

      <label class="auth-label">
        E-mail
        <input
          id="authEmail"
          class="auth-input"
          type="email"
          autocomplete="email"
          required
        >
      </label>

      <label class="auth-label">
        Senha
        <input
          id="authPassword"
          class="auth-input"
          type="password"
          minlength="8"
          autocomplete="current-password"
          required
        >
      </label>

      <button
        id="authSubmit"
        class="auth-button"
        type="submit"
      >
        Entrar
      </button>

      <button
        id="authForgot"
        class="auth-link"
        type="button"
      >
        Esqueci minha senha
      </button>

      <div id="authStatus" class="auth-status"></div>

      <p class="auth-help">
        Ao continuar, você concorda com o tratamento dos dados necessário para operar o serviço.
      </p>

    </form>

    <form id="resetForm" class="auth-form" hidden>

      <h2>Definir nova senha</h2>

      <label class="auth-label">
        Nova senha
        <input
          id="resetPassword"
          class="auth-input"
          type="password"
          minlength="8"
          required
        >
      </label>

      <button
        class="auth-button"
        type="submit"
      >
        Salvar nova senha
      </button>

      <div id="resetStatus" class="auth-status"></div>

    </form>

  </div>
</section>

<aside id="authAccount" class="auth-account" hidden>

  <div>
    <strong id="authAccountName"></strong>
    <small id="authAccountEmail"></small>
  </div>

  <span id="authRole" class="auth-role"></span>

  <span class="auth-account-spacer"></span>

  <button id="authAdminBtn" hidden>
    Usuários
  </button>

  <button id="authLogout">
    Sair
  </button>

</aside>

<section id="authAdmin" class="auth-admin" hidden>

  <div class="auth-admin-card">

    <div class="auth-admin-head">

      <div>
        <h2>Usuários cadastrados</h2>
        <small>Gerencie acessos às plataformas.</small>
      </div>

      <button
        id="authAdminClose"
        class="auth-button secondary"
      >
        Fechar
      </button>

    </div>

    <div id="authAdminStatus" class="auth-status"></div>

    <div id="authUsers" class="auth-users"></div>

  </div>

</section>
`);

const $ = id => document.getElementById(id);

const shell = $('authShell');
const form = $('authForm');
const status = $('authStatus');
const account = $('authAccount');
const admin = $('authAdmin');

function message(el, text, type = '') {
  el.textContent = text || '';
  el.className = 'auth-status' + (type ? ' ' + type : '');
}

function friendly(error) {

  const m = String(
    error?.message ||
    error ||
    'Erro inesperado.'
  );

  if (/invalid login/i.test(m)) {
    return 'E-mail ou senha incorretos.';
  }

  if (
    /already registered/i.test(m) ||
    /already been registered/i.test(m) ||
    /user already exists/i.test(m)
  ) {
    return 'Este e-mail já possui uma conta.';
  }

  if (/email rate limit/i.test(m)) {
    return 'Muitos e-mails foram solicitados. Aguarde alguns minutos.';
  }

  if (/password should/i.test(m)) {
    return 'A senha precisa ter pelo menos 8 caracteres.';
  }

  if (/fetch|network/i.test(m)) {
    return 'Não foi possível conectar ao servidor. Verifique a internet e tente novamente.';
  }

  return m;
}

function setMode(next) {

  mode = next;

  const signup = mode === 'signup';

  $('authNameLabel').hidden = !signup;
  $('authName').required = signup;

  $('authPassword').autocomplete =
    signup ? 'new-password' : 'current-password';

  $('authSubmit').textContent =
    signup ? 'Cadastrar' : 'Entrar';

  $('authForgot').hidden = signup;

  document
    .querySelectorAll('.auth-tab')
    .forEach(button => {
      button.classList.toggle(
        'active',
        button.dataset.mode === mode
      );
    });

  message(status, '');
}

document
  .querySelectorAll('.auth-tab')
  .forEach(button => {
    button.onclick = () => setMode(button.dataset.mode);
  });

form.onsubmit = async event => {

  event.preventDefault();

  const button = $('authSubmit');

  button.disabled = true;

  message(status, 'Conectando...');

  try {

    const email =
      $('authEmail')
        .value
        .trim()
        .toLowerCase();

    const password =
      $('authPassword').value;

    if (mode === 'signup') {

      const full_name =
        $('authName')
          .value
          .trim();

      if (full_name.length < 3) {
        throw new Error(
          'Digite seu nome completo.'
        );
      }

      const {
        data,
        error
      } = await supabase.auth.signUp({

        email,

        password,

        options: {

          data: {
            full_name
          },

          emailRedirectTo: APP_URL

        }

      });

      if (error) {
        throw error;
      }

      if (!data.session) {

        message(
          status,
          'Cadastro realizado! Abra o e-mail de confirmação e clique no link para liberar sua conta.',
          'success'
        );

        return;
      }

      message(
        status,
        'Conta criada com sucesso!',
        'success'
      );

    } else {

      const {
        error
      } = await supabase.auth.signInWithPassword({

        email,

        password

      });

      if (error) {
        throw error;
      }

    }

  } catch (error) {

    console.error(
      'Erro de autenticação:',
      error
    );

    message(
      status,
      friendly(error),
      'error'
    );

  } finally {

    button.disabled = false;

  }

};

$('authForgot').onclick = async () => {

  const email =
    $('authEmail')
      .value
      .trim()
      .toLowerCase();

  if (!email) {

    message(
      status,
      'Digite seu e-mail primeiro.',
      'error'
    );

    return;
  }

  message(
    status,
    'Enviando...'
  );

  const {
    error
  } = await supabase.auth.resetPasswordForEmail(
    email,
    {
      redirectTo: APP_URL
    }
  );

  message(
    status,
    error
      ? friendly(error)
      : 'Enviamos o link de recuperação para seu e-mail.',
    error
      ? 'error'
      : 'success'
  );

};

$('resetForm').onsubmit = async event => {

  event.preventDefault();

  const password =
    $('resetPassword').value;

  message(
    $('resetStatus'),
    'Salvando...'
  );

  const {
    error
  } = await supabase.auth.updateUser({
    password
  });

  if (error) {

    message(
      $('resetStatus'),
      friendly(error),
      'error'
    );

    return;
  }

  message(
    $('resetStatus'),
    'Senha alterada. Você já pode continuar.',
    'success'
  );

  setTimeout(() => {

    shell.hidden = true;
    account.hidden = false;

  }, 900);

};

$('authLogout').onclick = async () => {

  await supabase.auth.signOut();

};

$('authAdminClose').onclick = () => {

  admin.hidden = true;

};

$('authAdminBtn').onclick = loadUsers;

async function loadProfile(user) {

  const {
    data,
    error
  } = await supabase
    .from('profiles')
    .select(
      'id,full_name,email,role,is_active,last_sign_in_at'
    )
    .eq('id', user.id)
    .single();

  if (error) {
    throw error;
  }

  return data;
}

async function enter(user) {

  try {

    currentUser = user;

    currentProfile =
      await loadProfile(user);

    if (!currentProfile.is_active) {

      await supabase.auth.signOut();

      throw new Error(
        'Esta conta está desativada. Fale com o administrador.'
      );

    }

    window.AuthSession = {
      user,
      profile: currentProfile,
      supabase
    };

    $('authAccountName').textContent =
      currentProfile.full_name ||
      user.email;

    $('authAccountEmail').textContent =
      user.email;

    $('authRole').textContent =
      currentProfile.role === 'master'
        ? 'Master'
        : currentProfile.role === 'admin'
          ? 'Administrador'
          : 'Usuário';

    $('authAdminBtn').hidden =
      !['admin', 'master']
        .includes(currentProfile.role);

    shell.hidden = true;
    account.hidden = false;

    document.dispatchEvent(
      new CustomEvent(
        'app-auth-ready',
        {
          detail: window.AuthSession
        }
      )
    );

  } catch (error) {

    account.hidden = true;
    shell.hidden = false;

    message(
      status,
      friendly(error),
      'error'
    );

  }

}

function leave() {

  currentUser = null;
  currentProfile = null;

  window.AuthSession = null;

  account.hidden = true;
  admin.hidden = true;

  shell.hidden = false;

  $('resetForm').hidden = true;

  form.hidden = false;

  $('authTabs').hidden = false;

  setMode('login');

}

async function loadUsers() {

  admin.hidden = false;

  $('authUsers').innerHTML =
    '<div class="auth-empty">Carregando usuários...</div>';

  message(
    $('authAdminStatus'),
    ''
  );

  const {
    data,
    error
  } = await supabase
    .from('profiles')
    .select(
      'id,full_name,email,role,is_active,last_sign_in_at,created_at'
    )
    .order(
      'created_at',
      {
        ascending: false
      }
    );

  if (error) {

    message(
      $('authAdminStatus'),
      friendly(error),
      'error'
    );

    return;
  }

  $('authUsers').innerHTML =
    data.length
      ? ''
      : '<div class="auth-empty">Nenhum usuário encontrado.</div>';

  for (const user of data) {

    const row =
      document.createElement('article');

    row.className = 'auth-user';

    const canRole =
      currentProfile.role === 'master';

    row.innerHTML = `

      <div>

        <div class="auth-user-name"></div>

        <div class="auth-user-email"></div>

      </div>

      <select
        class="auth-select"
        aria-label="Permissão"
        ${canRole ? '' : 'disabled'}
      >

        <option value="user">
          Usuário
        </option>

        <option value="admin">
          Admin
        </option>

        <option value="master">
          Master
        </option>

      </select>

      <span
        class="auth-user-state ${user.is_active ? '' : 'off'}"
      >
        ${user.is_active
          ? 'Conta ativa'
          : 'Conta desativada'}
      </span>

      <button class="auth-button secondary">
        ${user.is_active
          ? 'Desativar'
          : 'Ativar'}
      </button>

    `;

    row.querySelector(
      '.auth-user-name'
    ).textContent =
      user.full_name ||
      'Sem nome';

    row.querySelector(
      '.auth-user-email'
    ).textContent =
      user.email;

    const select =
      row.querySelector('select');

    select.value =
      user.role;

    select.onchange = async () => {

      if (
        !confirm(
          `Alterar ${user.email} para ${select.options[select.selectedIndex].text}?`
        )
      ) {

        select.value =
          user.role;

        return;
      }

      const success =
        await manage(
          user.id,
          select.value,
          null
        );

      if (success) {
        user.role =
          select.value;
      }

    };

    row.querySelector(
      'button'
    ).onclick = async () => {

      const success =
        await manage(
          user.id,
          null,
          !user.is_active
        );

      if (success) {

        user.is_active =
          !user.is_active;

        loadUsers();

      }

    };

    $('authUsers')
      .appendChild(row);

  }

}

async function manage(
  id,
  role,
  active
) {

  message(
    $('authAdminStatus'),
    'Salvando...'
  );

  const {
    error
  } = await supabase.rpc(
    'admin_manage_profile',
    {
      target_user: id,
      new_role: role,
      new_active: active
    }
  );

  if (error) {

    message(
      $('authAdminStatus'),
      friendly(error),
      'error'
    );

    await loadUsers();

    return false;
  }

  message(
    $('authAdminStatus'),
    'Alteração salva.',
    'success'
  );

  return true;
}

supabase.auth.onAuthStateChange(
  (event, session) => {

    if (
      event === 'PASSWORD_RECOVERY'
    ) {

      $('authTabs').hidden = true;

      form.hidden = true;

      $('resetForm').hidden = false;

      shell.hidden = false;

      return;
    }

    if (session?.user) {

      enter(session.user);

    } else {

      leave();

    }

  }
);

const {
  data: {
    session
  }
} = await supabase.auth.getSession();

if (session?.user) {

  enter(session.user);

} else {

  leave();

}
