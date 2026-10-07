/* ===== Configurações do app =====
   Preferências salvas neste aparelho (localStorage), lidas pelos outros
   módulos via window.AppSettings.get(chave). Cobre: falar a palavra depois
   de acertar, destacar as letras certas na bandeja antes de começar cada
   palavra, som dos botões, e tema claro/escuro. Um botão de engrenagem fica
   fixo no canto da tela em qualquer lugar do app. */
(() => {
  const KEY = 'soletra_settings_v1';
  const DEFAULTS = { speakAfterCorrect: true, highlightBeforeStart: false, buttonSounds: true, theme: 'light' };

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? Object.assign({}, DEFAULTS, JSON.parse(raw)) : Object.assign({}, DEFAULTS);
    } catch (e) { return Object.assign({}, DEFAULTS); }
  }
  const settings = load();

  function save() { try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch (e) {} }
  // 'auto' segue o claro/escuro do celular; 'light'/'dark' são fixos.
  const darkQuery = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  function resolvedTheme(value) { return value === 'auto' ? (darkQuery && darkQuery.matches ? 'dark' : 'light') : value; }
  function applyTheme() { document.documentElement.setAttribute('data-theme', resolvedTheme(settings.theme)); }
  if (darkQuery && darkQuery.addEventListener) darkQuery.addEventListener('change', () => { if (settings.theme === 'auto') applyTheme(); });

  function get(key) { return settings[key]; }
  function set(key, value) {
    settings[key] = value;
    save();
    if (key === 'theme') applyTheme();
    document.dispatchEvent(new CustomEvent('app-settings-changed', { detail: { key, value } }));
    renderPanel();
  }

  window.AppSettings = { get, set, all: () => Object.assign({}, settings) };
  applyTheme();

  let panelEl = null;
  let pendingTheme = settings.theme; // escolha ainda não aplicada (só vale depois de tocar em Aplicar)
  const THEME_NAMES = { light: 'Claro', dark: 'Escuro', auto: 'Automático' };

  function renderPanel() {
    if (!panelEl) return;
    const check = (id, on) => { const el = document.getElementById(id); if (el) el.checked = !!on; };
    check('setSpeakAfter', settings.speakAfterCorrect);
    check('setHighlight', settings.highlightBeforeStart);
    check('setSounds', settings.buttonSounds);
    [['setThemeLight', 'light'], ['setThemeDark', 'dark'], ['setThemeAuto', 'auto']].forEach(([id, value]) => {
      const btn = document.getElementById(id);
      if (btn) btn.classList.toggle('active', pendingTheme === value);
    });
    const apply = document.getElementById('setThemeApply');
    if (apply) apply.disabled = pendingTheme === settings.theme && document.documentElement.getAttribute('data-theme') === resolvedTheme(settings.theme);
  }

  function setStatus(text, ok) {
    const el = document.getElementById('setThemeStatus');
    if (el) { el.textContent = text; el.className = 'settings-status' + (ok ? ' ok' : ''); }
  }

  function ensureUI() {
    const gear = document.createElement('button');
    gear.id = 'settingsGearBtn';
    gear.className = 'settings-gear';
    gear.type = 'button';
    gear.setAttribute('aria-label', 'Configurações');
    gear.textContent = '⚙️';
    document.body.appendChild(gear);

    const panel = document.createElement('div');
    panel.id = 'settingsPanel';
    panel.className = 'settings-panel';
    panel.hidden = true;
    panel.innerHTML =
      '<div class="settings-card">' +
      '<div class="settings-head"><b>⚙️ Configurações</b><button id="settingsCloseBtn" type="button" class="icon-btn">×</button></div>' +
      '<label class="settings-row"><span>🔊 Falar a palavra depois de acertar</span><input type="checkbox" id="setSpeakAfter"></label>' +
      '<label class="settings-row"><span>✨ Destacar as letras certas antes de começar</span><input type="checkbox" id="setHighlight"></label>' +
      '<label class="settings-row"><span>🔘 Som dos botões e do jogo</span><input type="checkbox" id="setSounds"></label>' +
      '<div class="settings-row"><span>🌓 Tema</span><div class="settings-theme-toggle"><button id="setThemeLight" type="button" class="theme-btn">☀️ Claro</button><button id="setThemeDark" type="button" class="theme-btn">🌙 Escuro</button><button id="setThemeAuto" type="button" class="theme-btn">🔄 Auto</button></div></div>' +
      '<button id="setThemeApply" type="button" class="primary wide settings-apply">✅ Aplicar tema</button>' +
      '<div id="setThemeStatus" class="settings-status" role="status"></div>' +
      '</div>';
    document.body.appendChild(panel);
    panelEl = panel;

    gear.onclick = () => { pendingTheme = settings.theme; setStatus(''); panel.hidden = false; renderPanel(); };
    panel.addEventListener('click', (event) => { if (event.target === panel) panel.hidden = true; });
    document.getElementById('settingsCloseBtn').onclick = () => { panel.hidden = true; };
    document.getElementById('setSpeakAfter').onchange = (event) => set('speakAfterCorrect', event.target.checked);
    document.getElementById('setHighlight').onchange = (event) => set('highlightBeforeStart', event.target.checked);
    document.getElementById('setSounds').onchange = (event) => set('buttonSounds', event.target.checked);
    const pick = (value) => () => { pendingTheme = value; setStatus('Toque em Aplicar pra mudar o tema.'); renderPanel(); };
    document.getElementById('setThemeLight').onclick = pick('light');
    document.getElementById('setThemeDark').onclick = pick('dark');
    document.getElementById('setThemeAuto').onclick = pick('auto');
    document.getElementById('setThemeApply').onclick = () => {
      set('theme', pendingTheme);
      applyTheme(); // reaplica de novo por garantia (não depende do evento ter chegado)
      setStatus('✅ Tema ' + THEME_NAMES[pendingTheme] + ' aplicado!', true);
    };
    renderPanel();
  }

  // Ativa/desativa o som do jogo (função global "sound", usada em toda a
  // gameplay pra feedback de acerto/erro/vitória) segundo a preferência -
  // sem precisar mexer em cada chamada espalhada pelo código.
  function gateSound() {
    if (typeof sound !== 'function' || sound.__settingsGated) return;
    const base = sound;
    window.sound = function (kind) { if (get('buttonSounds')) base(kind); };
    window.sound.__settingsGated = true;
  }

  function init() {
    ensureUI();
    gateSound();
    // "sound" só existe depois que o script principal roda; se este script
    // carregar antes por algum motivo, tenta de novo em seguida.
    if (typeof sound !== 'function') setTimeout(gateSound, 0);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
