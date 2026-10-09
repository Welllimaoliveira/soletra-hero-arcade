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

  // S(pt, en, resposta, ...erradas) - monta a frase; as opções são embaralhadas na hora de jogar.
  const S = (pt, en, answer, ...wrong) => ({ pt, en, answer, options: [answer, ...wrong] });

  const LEVELS = [
    { id: 0, icon: '🌱', name: 'Fácil', desc: 'Frases bem curtas', sentences: [
      S('O gato é preto.', 'The cat is ___.', 'black', 'white', 'red', 'green'),
      S('Eu tenho um irmão.', 'I have a ___.', 'brother', 'sister', 'friend', 'mother'),
      S('Ela está feliz.', 'She is ___.', 'happy', 'sad', 'angry', 'tired'),
      S('Nós vamos à escola.', 'We go to ___.', 'school', 'home', 'park', 'store'),
      S('Ele gosta de futebol.', 'He likes ___.', 'soccer', 'tennis', 'swimming', 'basketball'),
      S('Eu como uma maçã.', 'I eat an ___.', 'apple', 'banana', 'orange', 'bread'),
      S('O sol é amarelo.', 'The sun is ___.', 'yellow', 'blue', 'purple', 'pink'),
      S('Minha mãe é professora.', 'My mother is a ___.', 'teacher', 'doctor', 'nurse', 'cook'),
      S('O cachorro está dormindo.', 'The dog is ___.', 'sleeping', 'eating', 'running', 'jumping'),
      S('Eu bebo água.', 'I drink ___.', 'water', 'milk', 'juice', 'tea'),
    ]},
    { id: 1, icon: '🌿', name: 'Médio', desc: 'Frases um pouco maiores', sentences: [
      S('Eu moro perto do parque.', 'I live near the ___.', 'park', 'beach', 'mountain', 'river'),
      S('Ela está com sede.', 'She is ___.', 'thirsty', 'hungry', 'sleepy', 'scared'),
      S('Nós assistimos um filme ontem.', 'We watched a ___ yesterday.', 'movie', 'book', 'game', 'show'),
      S('O pássaro está voando alto.', 'The bird is flying ___.', 'high', 'low', 'fast', 'slow'),
      S('Eu preciso de ajuda com a lição.', 'I need help with my ___.', 'homework', 'toy', 'shoes', 'lunch'),
      S('Ela ganhou a corrida.', 'She won the ___.', 'race', 'game', 'prize', 'medal'),
      S('Meu pai dirige um carro azul.', 'My father drives a blue ___.', 'car', 'bike', 'boat', 'truck'),
      S('Está chovendo lá fora.', 'It is ___ outside.', 'raining', 'sunny', 'snowing', 'windy'),
      S('Minha irmã tem dez anos.', 'My sister is ten years ___.', 'old', 'young', 'tall', 'big'),
      S('Nós jogamos bola no parque.', 'We play ___ in the park.', 'ball', 'bread', 'shoes', 'table'),
      S('Eu vejo uma estrela no céu.', 'I see a star in the ___.', 'sky', 'sea', 'room', 'tree'),
      S('O livro está em cima da mesa.', 'The book is on the ___.', 'table', 'door', 'moon', 'cloud'),
      S('Ela escova os dentes de manhã.', 'She brushes her ___ in the morning.', 'teeth', 'eyes', 'ears', 'nose'),
      S('Eu quero um copo de leite.', 'I want a glass of ___.', 'milk', 'bread', 'rice', 'meat'),
      S('Hoje é meu aniversário.', 'Today is my ___.', 'birthday', 'shoes', 'window', 'pencil'),
    ]},
    { id: 2, icon: '🚀', name: 'Difícil', desc: 'Verbos e comparações', sentences: [
      S('Eles estão jogando futebol agora.', 'They are ___ soccer now.', 'playing', 'play', 'plays', 'played'),
      S('Ela foi ao mercado ontem.', 'She ___ to the market yesterday.', 'went', 'go', 'goes', 'going'),
      S('Eu sou mais alto que meu irmão.', 'I am ___ than my brother.', 'taller', 'tall', 'tallest', 'more tall'),
      S('Nós sempre comemos juntos.', 'We always ___ together.', 'eat', 'eats', 'eating', 'ate'),
      S('Ele não gosta de chuva.', 'He ___ like rain.', "doesn't", "don't", "isn't", 'not'),
      S('Há muitos livros na biblioteca.', 'There ___ many books in the library.', 'are', 'is', 'am', 'be'),
      S('Ela sempre chega cedo.', 'She always ___ early.', 'arrives', 'arrive', 'arriving', 'arrived'),
      S('Eu comprei um presente para você.', 'I bought a gift ___ you.', 'for', 'at', 'in', 'on'),
      S('O filme começa às oito.', 'The movie starts ___ eight.', 'at', 'in', 'on', 'by'),
      S('Ele é o menino mais rápido da escola.', 'He is the ___ boy in the school.', 'fastest', 'fast', 'faster', 'more fast'),
      S('Vocês já terminaram a lição?', 'Have you ___ your homework?', 'finished', 'finish', 'finishing', 'finishes'),
      S('Eu estava dormindo quando você ligou.', 'I was ___ when you called.', 'sleeping', 'sleep', 'slept', 'sleeps'),
      S('Ela tem dois gatos e eu tenho um cachorro.', 'She has two cats and I have ___ dog.', 'a', 'an', 'two', 'many'),
      S('Nós vamos viajar amanhã.', 'We are going to ___ tomorrow.', 'travel', 'traveled', 'traveling', 'travels'),
      S('Ele corre rápido.', 'He runs ___.', 'fast', 'fastly', 'fastest', 'speed'),
      S('Eu não tenho nenhum dinheiro.', 'I do not have ___ money.', 'any', 'many', 'a', 'few'),
      S('A casa dela é maior que a minha.', 'Her house is ___ than mine.', 'bigger', 'big', 'biggest', 'more big'),
      S('Quantas maçãs você quer?', 'How ___ apples do you want?', 'many', 'much', 'more', 'few'),
      S('Estou com muito sono.', 'I am very ___.', 'sleepy', 'sleep', 'sleeping', 'slept'),
      S('Ontem choveu o dia todo.', 'It ___ all day yesterday.', 'rained', 'rain', 'rains', 'raining'),
    ]},
    { id: 3, icon: '🔥', name: 'Super difícil', desc: 'Expressões e tempos verbais', sentences: [
      S('Se eu tivesse tempo, eu viajaria mais.', 'If I ___ time, I would travel more.', 'had', 'have', 'has', 'will have'),
      S('Ela mora aqui desde 2020.', 'She has lived here ___ 2020.', 'since', 'for', 'from', 'during'),
      S('O bolo foi feito pela minha avó.', 'The cake was ___ by my grandmother.', 'made', 'make', 'making', 'makes'),
      S('Eu desisti de fumar.', 'I gave ___ smoking.', 'up', 'in', 'out', 'off'),
      S('Preciso me acostumar com o frio.', 'I need to get used ___ the cold.', 'to', 'with', 'at', 'for'),
      S('Ele disse que estava cansado.', 'He said that he ___ tired.', 'was', 'is', 'will be', 'has been'),
      S('Quanto mais você estuda, mais aprende.', 'The more you study, the more you ___.', 'learn', 'learned', 'learning', 'learns'),
      S('Apesar da chuva, nós saímos.', '___ the rain, we went out.', 'Despite', 'Because', 'Unless', 'While'),
      S('Eu gostaria de saber onde ele mora.', 'I would like to know where he ___.', 'lives', 'live', 'living', 'is live'),
      S('Ela é a mulher cujo filho é médico.', 'She is the woman ___ son is a doctor.', 'whose', 'who', 'which', 'whom'),
      S('Eu mal consigo ouvir você.', 'I can ___ hear you.', 'hardly', 'hard', 'harder', 'hardest'),
      S('Vou ligar para você assim que chegar.', 'I will call you as soon as I ___.', 'arrive', 'will arrive', 'arrived', 'arriving'),
      S('Ele deveria ter estudado mais.', 'He should have ___ more.', 'studied', 'study', 'studies', 'studying'),
      S('Mal posso esperar para te encontrar.', 'I can not wait to ___ you.', 'meet', 'met', 'meeting', 'meets'),
      S('Ela me perguntou se eu estava com fome.', 'She asked me ___ I was hungry.', 'if', 'that', 'what', 'who'),
      S('Eu prefiro chá a café.', 'I prefer tea ___ coffee.', 'to', 'than', 'from', 'over'),
      S('Chegamos tarde por causa do trânsito.', 'We arrived late ___ the traffic.', 'because of', 'because', 'although', 'instead'),
      S('Quem quebrou a janela?', 'Who ___ the window?', 'broke', 'break', 'broken', 'breaks'),
      S('É a melhor pizza que já comi.', 'It is the best pizza I have ever ___.', 'eaten', 'eat', 'ate', 'eating'),
      S('Ele fala como se soubesse tudo.', 'He talks as if he ___ everything.', 'knew', 'knows', 'know', 'known'),
      S('Eu estou acostumado a acordar cedo.', 'I am used to ___ up early.', 'waking', 'wake', 'woke', 'woken'),
      S('Nem ela nem eu fomos à festa.', 'Neither she ___ I went to the party.', 'nor', 'or', 'and', 'but'),
      S('Isso soa interessante.', 'That ___ interesting.', 'sounds', 'hears', 'listens', 'speaks'),
      S('Cuidado com o degrau!', 'Watch ___ for the step!', 'out', 'on', 'at', 'in'),
      S('Você se importa se eu abrir a janela?', 'Do you mind if I ___ the window?', 'open', 'opening', 'to open', 'opens'),
      S('Ele trabalha aqui há cinco anos.', 'He has worked here ___ five years.', 'for', 'since', 'during', 'in'),
      S('Seria melhor se você ficasse em casa.', 'It would be better if you ___ at home.', 'stayed', 'stay', 'will stay', 'staying'),
      S('Ela é tão alta quanto o pai.', 'She is as tall ___ her father.', 'as', 'than', 'like', 'so'),
      S('A professora mandou todos ficarem quietos.', 'The teacher told everyone to keep ___.', 'quiet', 'quietly', 'quietness', 'quietest'),
      S('Quanto tempo vai demorar?', 'How ___ will it take?', 'long', 'far', 'tall', 'wide'),
    ]},
  ];

  let state = { level: 0, round: [], index: 0, stars: 0, correct: 0, locked: false, solved: [], orders: [] };

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
    <div class="word-nav pc-nav"><button id="pcPrevBtn" class="secondary">← Frase anterior</button><span id="pcCounter" class="word-counter">Frase 1 de 10</span><button id="pcNextBtn" class="secondary">Próxima frase →</button></div>
  </div>

  <div id="pcResult" class="pc-result hidden">
    <div class="big">🏆</div>
    <h2>Muito bem!</h2>
    <p id="pcResultText"></p>
    <button id="pcPlayAgainBtn" class="primary wide">🔁 Jogar de novo</button>
    <button id="pcHomeBtn" class="secondary wide">⌂ Voltar ao início</button>
  </div>
</section>`);
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
    $id('pcPrevBtn').onclick = () => { if (state.index > 0) { state.index--; loadSentence(); } };
    $id('pcNextBtn').onclick = () => { if (state.solved[state.index]) { state.index++; loadSentence(); } };
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
    $id('pcLevelGrid').innerHTML = LEVELS.map((l, i) => `<button class="pc-level-card" data-pc-level="${i}"><span class="pc-badge">${l.icon}</span><span><b>${l.name}</b><small>${l.desc} · ${l.sentences.length} frases</small></span></button>`).join('');
    document.querySelectorAll('[data-pc-level]').forEach((b) => { b.onclick = () => startLevel(+b.dataset.pcLevel); });
  }

  function startLevel(levelIdx) {
    state.level = levelIdx;
    state.round = shuffle(LEVELS[levelIdx].sentences);
    state.index = 0; state.stars = 0; state.correct = 0; state.locked = false; state.solved = []; state.orders = [];
    $id('pcLevels').classList.add('hidden');
    $id('pcResult').classList.add('hidden');
    $id('pcPlay').classList.remove('hidden');
    loadSentence();
  }

  function updateNav() {
    const total = state.round.length, last = state.index >= total - 1;
    $id('pcPrevBtn').disabled = state.index <= 0;
    $id('pcNextBtn').disabled = !state.solved[state.index];
    $id('pcNextBtn').textContent = last ? '🏁 Ver resultado' : 'Próxima frase →';
    $id('pcCounter').textContent = `Frase ${state.index + 1} de ${total}`;
  }

  function loadSentence() {
    if (state.index >= state.round.length) { finishLevel(); return; }
    const s = state.round[state.index];
    const done = !!state.solved[state.index];
    state.locked = done;
    $id('pcProgressFill').style.width = Math.round((state.index / state.round.length) * 100) + '%';
    $id('pcStarsPill').textContent = '⭐ ' + state.stars;
    $id('pcPtText').textContent = s.pt;
    const parts = s.en.split('___');
    $id('pcEnText').innerHTML = `${esc(parts[0])}<span class="pc-blank${done ? ' filled' : ''}" id="pcBlank">${done ? esc(s.answer) : '?'}</span>${esc(parts[1] || '')}`;
    $id('pcFeedback').textContent = ''; $id('pcFeedback').className = 'pc-feedback';
    if (!state.orders[state.index]) state.orders[state.index] = shuffle(s.options);
    $id('pcOptions').innerHTML = state.orders[state.index].map((o) => `<button class="pc-opt${done && o === s.answer ? ' correct' : ''}" data-pc-opt="${esc(o)}"${done ? ' disabled' : ''}>${esc(o)}</button>`).join('');
    if (done) { $id('pcFeedback').textContent = '✅ Isso aí! ' + s.pt.replace(/\.$/, '') + ' = "' + s.en.replace('___', s.answer) + '"'; $id('pcFeedback').className = 'pc-feedback ok'; }
    document.querySelectorAll('[data-pc-opt]').forEach((b) => { b.onclick = () => answer(b.dataset.pcOpt, b, s); });
    updateNav();
    if (!done) setTimeout(() => speak(s.en.replace('___', '...')), 300);
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
      if (typeof AppSettings === 'undefined' || AppSettings.get('speakAfterCorrect') !== false) speak(s.en.replace('___', s.answer));
      state.solved[state.index] = true;
      updateNav();
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
