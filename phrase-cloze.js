/* ===== Complete a Frase: tradução com lacuna =====
   Inspirado num formato de app tipo Duolingo: mostra a frase já
   traduzida em português (com o "certinho" ✅) e a mesma frase em
   inglês com UMA palavra faltando - a criança toca na palavra certa,
   ela preenche a lacuna com destaque, ganha estrela e avança.
   Módulo autocontido (mesmo padrão de literacy.js/comos-lab.js): não
   mexe no jogo principal de soletrar, só injeta sua própria tela.
*/
(() => {
  const $id = (id) => document.getElementById(id);
  const esc = (s) => { const d = document.createElement('div'); d.textContent = s == null ? '' : String(s); return d.innerHTML; };

  const LEVELS = [
    { id: 0, name: 'Nível 1', desc: 'Frases bem curtas', sentences: [
      { pt: 'O gato é preto.', en: 'The cat is ___.', answer: 'black', options: ['black', 'white', 'red', 'green'] },
      { pt: 'Eu tenho um irmão.', en: 'I have a ___.', answer: 'brother', options: ['brother', 'sister', 'friend', 'mother'] },
      { pt: 'Ela está feliz.', en: 'She is ___.', answer: 'happy', options: ['happy', 'sad', 'angry', 'tired'] },
      { pt: 'Nós vamos à escola.', en: 'We go to ___.', answer: 'school', options: ['school', 'home', 'park', 'store'] },
      { pt: 'Ele gosta de futebol.', en: 'He likes ___.', answer: 'soccer', options: ['soccer', 'tennis', 'swimming', 'basketball'] },
      { pt: 'Eu como uma maçã.', en: 'I eat an ___.', answer: 'apple', options: ['apple', 'banana', 'orange', 'bread'] },
      { pt: 'O sol é amarelo.', en: 'The sun is ___.', answer: 'yellow', options: ['yellow', 'blue', 'purple', 'pink'] },
      { pt: 'Minha mãe é professora.', en: 'My mother is a ___.', answer: 'teacher', options: ['teacher', 'doctor', 'nurse', 'cook'] },
    ]},
    { id: 1, name: 'Nível 2', desc: 'Frases um pouco maiores', sentences: [
      { pt: 'Eu moro perto do parque.', en: 'I live near the ___.', answer: 'park', options: ['park', 'beach', 'mountain', 'river'] },
      { pt: 'Ela está com sede.', en: 'She is ___.', answer: 'thirsty', options: ['thirsty', 'hungry', 'sleepy', 'scared'] },
      { pt: 'Nós assistimos um filme ontem.', en: 'We watched a ___ yesterday.', answer: 'movie', options: ['movie', 'book', 'game', 'show'] },
      { pt: 'O pássaro está voando alto.', en: 'The bird is flying ___.', answer: 'high', options: ['high', 'low', 'fast', 'slow'] },
      { pt: 'Eu preciso de ajuda com a lição.', en: 'I need help with my ___.', answer: 'homework', options: ['homework', 'toy', 'shoes', 'lunch'] },
      { pt: 'Ela ganhou a corrida.', en: 'She won the ___.', answer: 'race', options: ['race', 'game', 'prize', 'medal'] },
      { pt: 'Meu pai dirige um carro azul.', en: 'My father drives a blue ___.', answer: 'car', options: ['car', 'bike', 'boat', 'truck'] },
      { pt: 'Está chovendo lá fora.', en: 'It is ___ outside.', answer: 'raining', options: ['raining', 'sunny', 'snowing', 'windy'] },
    ]},
  ];

  let state = { level: 0, round: [], index: 0, stars: 0, correct: 0, locked: false };

  function speak(text) {
    try {
      if (window.AndroidBridge?.speak) { window.AndroidBridge.speak(String(text), 'en-US'); return; }
      if (!('speechSynthesis' in window)) return;
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text.replace('___', ''));
      u.lang = 'en-US'; u.rate = .85;
      speechSynthesis.speak(u);
    } catch (_) {}
  }
  function shuffle(a) { return [...a].sort(() => Math.random() - .5); }

  function inject() {
    if ($id('phraseCloze')) return;
    const anchor = $id('literacyLaunch') || $id('startBtn');
    if (!anchor) return;
    anchor.insertAdjacentHTML('afterend', `<button id="phraseClozeLaunch" class="phrasecloze-launch"><span>🧩</span><span><b>Complete a Frase</b><small>Veja a tradução e complete a lacuna em inglês</small></span></button>`);
    document.querySelector('.app').insertAdjacentHTML('beforeend', `
<section id="phraseCloze" class="screen phrasecloze-screen hidden">
  <div class="topbar"><button id="pcBack" class="icon-btn">←</button><div class="logo">🧩 Complete a Frase</div><div style="flex:1"></div><div class="pill" id="pcStarsPill">⭐ 0</div></div>

  <div id="pcLevels" class="pc-levels">
    <div class="pc-hero"><div class="icon">🧩</div><h2>Complete a Frase</h2><p>Veja a frase em português e escolha a palavra certa em inglês.</p></div>
    <div id="pcLevelGrid" class="pc-level-grid"></div>
  </div>

  <div id="pcPlay" class="pc-play hidden">
    <div class="progress-track"><div id="pcProgressFill" class="progress-fill"></div></div>
    <div class="pc-card">
      <div class="pc-pt"><span class="pc-check">✅</span><span id="pcPtText"></span><button id="pcSpeak" class="icon-btn pc-speak-btn" title="Ouvir">🔊</button></div>
      <div id="pcEnText" class="pc-en"></div>
      <div id="pcOptions" class="pc-options"></div>
      <div id="pcFeedback" class="pc-feedback"></div>
    </div>
  </div>

  <div id="pcResult" class="pc-result hidden">
    <div class="big">🏆</div>
    <h2>Muito bem!</h2>
    <p id="pcResultText"></p>
    <button id="pcPlayAgainBtn" class="primary wide">🔁 Jogar de novo</button>
    <button id="pcHomeBtn" class="secondary wide">⌂ Voltar ao início</button>
  </div>
</section>`);
    const css = document.createElement('style');
    css.textContent = `
    .phrasecloze-launch{width:100%;border:0;border-radius:22px;padding:16px;margin-top:10px;background:linear-gradient(135deg,#FF9A6E,#FF6B5B);color:#fff;box-shadow:0 6px 0 #C2483B;cursor:pointer;display:flex;align-items:center;gap:14px;text-align:left}
    .phrasecloze-launch span:first-child{font-size:44px}.phrasecloze-launch b{font:700 21px 'Fredoka';display:block}.phrasecloze-launch small{font-weight:800}
    .pc-hero{text-align:center;padding:6px 0 14px}.pc-hero .icon{font-size:60px}.pc-hero h2{font-family:'Fredoka';font-size:27px;margin:2px 0;color:var(--coral)}.pc-hero p{margin:0;color:var(--muted);font-weight:700}
    .pc-level-grid{display:grid;gap:10px}
    .pc-level-card{border:3px solid var(--line);background:#fff;border-radius:20px;padding:14px;text-align:left;cursor:pointer;display:flex;align-items:center;gap:12px}
    .pc-level-card b{font-family:'Fredoka';font-size:18px;display:block}.pc-level-card small{color:var(--muted);font-weight:700}
    .pc-level-card .pc-badge{font-size:34px}
    .pc-card{background:#fff;border:3px solid var(--line);border-radius:24px;padding:16px;margin-top:14px}
    .pc-pt{position:relative;background:#EFFBEF;border:2px solid #B7E4BA;border-radius:16px;padding:12px 40px 12px 40px;font-weight:800;font-size:15px;margin-bottom:16px;display:flex;align-items:center;gap:8px}
    .pc-check{position:absolute;left:10px;font-size:18px}
    .pc-speak-btn{position:absolute;right:6px;background:#fff;width:34px;height:34px;padding:0;display:flex;align-items:center;justify-content:center}
    .pc-en{font-family:'Fredoka';font-size:21px;text-align:center;margin-bottom:16px;line-height:1.4}
    .pc-blank{display:inline-block;min-width:70px;border-bottom:4px dashed var(--sky);color:var(--sky);font-weight:700;text-align:center;padding:0 4px}
    .pc-blank.filled{border-bottom-style:solid;border-color:var(--grass);color:#298b3a}
    .pc-options{display:grid;grid-template-columns:1fr 1fr;gap:10px}
    .pc-opt{border:3px solid var(--line);background:#fff;border-radius:18px;padding:14px;font-family:'Fredoka';font-size:17px;font-weight:700;cursor:pointer}
    .pc-opt.correct{border-color:var(--grass);background:#EFFBEF}
    .pc-opt.wrong{border-color:var(--coral);background:#FFF0EE;animation:shake .4s}
    .pc-opt:disabled{cursor:not-allowed;opacity:.55}
    .pc-feedback{min-height:26px;text-align:center;font-weight:800;margin-top:10px}
    .pc-feedback.ok{color:#298b3a}.pc-feedback.bad{color:#C2483B}
    .pc-result{text-align:center;padding-top:30px}.pc-result .big{font-size:70px}
    `;
    document.head.appendChild(css);
    bind();
  }

  // Tela autocontida (mesmo motivo do literacy.js): o showScreen() global
  // só conhece uma lista fixa de telas e não inclui a nossa - se a gente
  // chamasse ele direto, nossa tela ficaria por cima escondida ou as duas
  // apareceriam juntas. Então escondemos/mostramos ".screen" na mão aqui.
  function goHome() { $id('phraseCloze').classList.add('hidden'); showScreen('homeScreen'); renderHome(); }

  function bind() {
    $id('phraseClozeLaunch').onclick = () => { openPhraseCloze(); renderLevels(); };
    $id('pcBack').onclick = goHome;
    $id('pcPlayAgainBtn').onclick = () => startLevel(state.level);
    $id('pcHomeBtn').onclick = goHome;
    $id('pcSpeak').onclick = () => { const s = state.round[state.index]; if (s) speak(s.en.replace('___', s.answer)); };
  }

  window.openPhraseCloze = function openPhraseCloze() {
    inject();
    document.querySelectorAll('.screen').forEach((s) => s.classList.add('hidden'));
    $id('phraseCloze').classList.remove('hidden');
    $id('pcLevels').classList.remove('hidden');
    $id('pcPlay').classList.add('hidden');
    $id('pcResult').classList.add('hidden');
  };

  function renderLevels() {
    $id('pcLevelGrid').innerHTML = LEVELS.map((l, i) => `<button class="pc-level-card" data-pc-level="${i}"><span class="pc-badge">${i === 0 ? '🌱' : '🚀'}</span><span><b>${l.name}</b><small>${l.desc} · ${l.sentences.length} frases</small></span></button>`).join('');
    document.querySelectorAll('[data-pc-level]').forEach((b) => { b.onclick = () => startLevel(+b.dataset.pcLevel); });
  }

  function startLevel(levelIdx) {
    state.level = levelIdx;
    state.round = shuffle(LEVELS[levelIdx].sentences);
    state.index = 0; state.stars = 0; state.correct = 0; state.locked = false;
    $id('pcLevels').classList.add('hidden');
    $id('pcResult').classList.add('hidden');
    $id('pcPlay').classList.remove('hidden');
    loadSentence();
  }

  function loadSentence() {
    if (state.index >= state.round.length) { finishLevel(); return; }
    const s = state.round[state.index];
    state.locked = false;
    $id('pcProgressFill').style.width = Math.round((state.index / state.round.length) * 100) + '%';
    $id('pcStarsPill').textContent = '⭐ ' + state.stars;
    $id('pcPtText').textContent = s.pt;
    const parts = s.en.split('___');
    $id('pcEnText').innerHTML = `${esc(parts[0])}<span class="pc-blank" id="pcBlank">?</span>${esc(parts[1] || '')}`;
    $id('pcFeedback').textContent = ''; $id('pcFeedback').className = 'pc-feedback';
    $id('pcOptions').innerHTML = shuffle(s.options).map((o) => `<button class="pc-opt" data-pc-opt="${esc(o)}">${esc(o)}</button>`).join('');
    document.querySelectorAll('[data-pc-opt]').forEach((b) => { b.onclick = () => answer(b.dataset.pcOpt, b, s); });
    setTimeout(() => speak(s.pt.length > s.en.length ? s.en.replace('___', '...') : s.en.replace('___', '...')), 300);
  }

  function answer(chosen, btn, s) {
    if (state.locked) return;
    if (chosen === s.answer) {
      state.locked = true;
      btn.classList.add('correct');
      $id('pcBlank').textContent = s.answer;
      $id('pcBlank').classList.add('filled');
      document.querySelectorAll('[data-pc-opt]').forEach((b) => { b.disabled = true; });
      state.stars++; state.correct++;
      $id('pcStarsPill').textContent = '⭐ ' + state.stars;
      $id('pcFeedback').textContent = '✅ Isso aí! ' + s.pt.replace(/\.$/, '') + ' = "' + s.en.replace('___', s.answer) + '"';
      $id('pcFeedback').className = 'pc-feedback ok';
      speak(s.en.replace('___', s.answer));
      setTimeout(() => { state.index++; loadSentence(); }, 1600);
    } else {
      btn.classList.add('wrong'); btn.disabled = true;
      setTimeout(() => btn.classList.remove('wrong'), 400);
      $id('pcFeedback').textContent = '🤔 Quase! Tenta de novo.';
      $id('pcFeedback').className = 'pc-feedback bad';
    }
  }

  function finishLevel() {
    $id('pcPlay').classList.add('hidden');
    $id('pcResult').classList.remove('hidden');
    $id('pcResultText').textContent = `Você completou ${state.round.length} frases e ganhou ${state.stars} estrelas!`;
  }

  document.addEventListener('DOMContentLoaded', inject);
  if (document.readyState !== 'loading') inject();
})();
