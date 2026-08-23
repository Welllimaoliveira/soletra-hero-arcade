(() => {
  const $id = id => document.getElementById(id);
  const LEVELS = [
    {id:'vogais',name:'1 · Vogais',sets:[['A','E','I','O','U']]},
    {id:'simples',name:'2 · Sílabas simples',sets:[['BA','BE','BI','BO','BU'],['JA','JE','JI','JO','JU'],['LA','LE','LI','LO','LU'],['MA','ME','MI','MO','MU']]},
    {id:'digrafos',name:'3 · Dígrafos',sets:[['CHA','CHE','CHI','CHO','CHU'],['NHA','NHE','NHI','NHO','NHU']]},
    {id:'encontros',name:'4 · Encontros consonantais',sets:[['TRA','TRE','TRI','TRO','TRU'],['PRA','PRE','PRI','PRO','PRU']]}
  ];
  // Cada palavra é [sílaba a completar, modelo com "_" no lugar dela, palavra
  // inteira, nível em que ela é ensinada (0=vogais,1=sílabas simples,
  // 2=dígrafos,3=encontros consonantais - mesmos índices de LEVELS acima)].
  // A fase de palavras usa o BANCO CUMULATIVO até o nível atual (ver
  // availableWords), não só a sílaba praticada no som - por isso os níveis
  // mais avançados automaticamente têm mais palavras disponíveis, sem
  // precisar achar uma palavra rara pra cada família de sílaba isoladamente.
  const WORDS = {
    animais:[
      ['A','_BELHA','ABELHA',0],['O','_VELHA','OVELHA',0],['U','_RSO','URSO',0],['E','_LEFANTE','ELEFANTE',0],
      ['I','_GUANA','IGUANA',0],['A','_RARA','ARARA',0],['O','_NÇA','ONÇA',0],['U','_RUBU','URUBU',0],
      ['JA','_CARÉ','JACARÉ',1],['JA','_GUAR','JAGUAR',1],['BO','_RBOLETA','BORBOLETA',1],['LO','_BO','LOBO',1],
      ['MA','_CACO','MACACO',1],['MA','_RIMBONDO','MARIMBONDO',1],['BA','_LEIA','BALEIA',1],['BU','_RRO','BURRO',1],
      ['LA','_GARTO','LAGARTO',1],['JI','_BOIA','JIBOIA',1],['LE','_ÃO','LEÃO',1],
      ['NHO','NI_','NINHO',2],['NHA','GALI_','GALINHA',2],['NHA','ARA_','ARANHA',2],['CHI','_NCHILA','CHINCHILA',2],
      ['NHO','MI_CA','MINHOCA',2],['NHA','PIRA_','PIRANHA',2],['CHO','CA_RRO','CACHORRO',2],
      ['TRA','_ÇA','TRAÇA',3],['TRU','_TA','TRUTA',3],['TRO','PO_','POTRO',3],['TRA','_IRA','TRAIRA',3],
    ],
    frutas:[
      ['U','_VA','UVA',0],['A','_BACAXI','ABACAXI',0],['A','_MEIXA','AMEIXA',0],['A','_CEROLA','ACEROLA',0],
      ['A','_ÇAÍ','AÇAÍ',0],['A','_MORA','AMORA',0],['O','C_CO','COCO',0],['O','M_RANGO','MORANGO',0],['I','L_MÃO','LIMÃO',0],
      ['BA','_NANA','BANANA',1],['JA','_CA','JACA',1],['LI','_MÃO','LIMÃO',1],['MA','_ÇÃ','MAÇÃ',1],['LA','_RANJA','LARANJA',1],
      ['ME','_LANCIA','MELANCIA',1],['MI','_RTILO','MIRTILO',1],['LI','_CHIA','LICHIA',1],
      ['NHA','PI_','PINHA',2],['NHA','CASTA_','CASTANHA',2],['CHI','LI_A','LICHIA',2],
    ],
    veiculos:[
      ['A','_VIÃO','AVIÃO',0],['I','_ATE','IATE',0],['A','_MBULÂNCIA','AMBULÂNCIA',0],['E','_SCAVADEIRA','ESCAVADEIRA',0],
      ['A','_UTOMÓVEL','AUTOMÓVEL',0],['U','_TILITÁRIO','UTILITÁRIO',0],
      ['JI','_PE','JIPE',1],['BI','_CICLETA','BICICLETA',1],['BO','_TE','BOTE',1],['MO','_TO','MOTO',1],['LA','_NCHA','LANCHA',1],
      ['NHO','CARRI_','CARRINHO',2],['CHA','_RRETE','CHARRETE',2],['NHO','BARQUI_','BARQUINHO',2],['CHO','GUIN_','GUINCHO',2],
      ['TRA','_TOR','TRATOR',3],['TRE','_M','TREM',3],['TRI','_CICLO','TRICICLO',3],
    ],
    escola:[
      ['E','_SCOLA','ESCOLA',0],['A','_LUNO','ALUNO',0],['E','_STOJO','ESTOJO',0],['A','_PONTADOR','APONTADOR',0],
      ['U','_NIFORME','UNIFORME',0],['A','_TIVIDADE','ATIVIDADE',0],
      ['JA','_NELA','JANELA',1],['LI','_VRO','LIVRO',1],['BO','_RRACHA','BORRACHA',1],['MA','_PA','MAPA',1],
      ['ME','_SA','MESA',1],['LO','_USA','LOUSA',1],
      ['CHA','_VE','CHAVE',2],['CHI','MO_LA','MOCHILA',2],['NHA','CANETI_','CANETINHA',2],
      ['PRO','_FESSORA','PROFESSORA',3],['TRA','_BALHO','TRABALHO',3],['TRI','_ÂNGULO','TRIÂNGULO',3],
    ],
    profissoes:[
      ['A','_DVOGADO','ADVOGADO',0],['E','_NFERMEIRO','ENFERMEIRO',0],['A','_STRONAUTA','ASTRONAUTA',0],
      ['O','_PERÁRIO','OPERÁRIO',0],['A','_TLETA','ATLETA',0],
      ['JU','_IZ','JUIZ',1],['ME','_DICO','MÉDICO',1],['BA','_RBEIRO','BARBEIRO',1],['BO','_MBEIRO','BOMBEIRO',1],
      ['MA','_RINHEIRO','MARINHEIRO',1],['JA','_RDINEIRO','JARDINEIRO',1],
      ['NHE','COZI_IRO','COZINHEIRO',2],['CHE','_FE','CHEFE',2],
      ['PRO','_FESSOR','PROFESSOR',3],['PRI','_NCESA','PRINCESA',3],['TRA','_BALHADOR','TRABALHADOR',3],['PRO','_GRAMADOR','PROGRAMADOR',3],
    ],
  };
  const THEME_LABELS = {animais:'🐊 Animais',frutas:'🍌 Frutas',veiculos:'🚜 Veículos',escola:'📚 Escola',profissoes:'👩‍⚕️ Profissões'};
  // Quantas palavras no máximo entram em uma rodada por nível - cresce com a
  // dificuldade (pedido do usuário: ~10 no iniciante, ~15 no médio, até 25 no
  // difícil). Como o banco é cumulativo, a maioria dos temas já fica perto
  // disso naturalmente; o corte só evita rodadas longas demais nos temas com
  // banco maior.
  const ROUND_SIZE_BY_LEVEL = [10, 14, 18, 25];
  let state={level:0,theme:'animais',set:0,phase:'sound',selected:null,matches:new Set(),word:0,words:[],answers:0,errors:0,started:Date.now(),childId:null};

  function inject(){
    const start=$id('startBtn'); if(!start||$id('literacyLaunch'))return;
    start.insertAdjacentHTML('afterend','<button id="literacyLaunch" class="literacy-launch"><span>🔊</span><span><b>Trilha de Alfabetização</b><small>Sons, sílabas e palavras por tema</small></span></button>');
    document.querySelector('.app').insertAdjacentHTML('beforeend',`<section id="literacyScreen" class="screen literacy-screen hidden"><div class="topbar"><button id="literacyBack" class="icon-btn">←</button><div class="logo">Trilha de Alfabetização</div><div style="flex:1"></div><button id="familyBtn" class="icon-btn">👨‍👩‍👧</button></div><div class="literacy-hero"><h2 id="learningTitle">Ouça e associe</h2><p id="learningSubtitle">Toque no áudio e depois na sílaba correta.</p></div><div id="learningSetup" class="card"><h3 class="section-title">Escolha a etapa</h3><div id="learningLevels" class="literacy-grid"></div><h3 class="section-title" style="margin-top:14px">Tema das palavras</h3><div id="learningThemes" class="literacy-grid"></div><button id="learningStart" class="primary wide" style="margin-top:14px">Começar atividade</button></div><div id="learningGame" class="card hidden"><div id="soundPhase"><div id="soundList" class="syllable-audio-list"></div><p class="tiny" style="text-align:center">Agora escolha a sílaba que corresponde ao som</p><div id="syllableList" class="syllable-answer-list"></div></div><div id="wordPhase" class="hidden"><div id="fillWord" class="fill-word"></div><div id="wordChoices" class="syllable-answer-list"></div></div><div id="learningFeedback" class="learning-feedback"></div></div></section><div id="familyModal" class="modal hidden"><div class="modal-card"><div class="modal-head"><h2>👨‍👩‍👧 Família e evolução</h2><button id="familyClose" class="icon-btn">✕</button></div><p class="tiny">Cada responsável pode cadastrar até duas crianças. Use apenas apelido ou primeiro nome.</p><div class="row"><input id="childName" class="field" maxlength="40" placeholder="Nome da criança"><button id="childAdd" class="secondary">Adicionar</button></div><h3>Meus perfis</h3><div id="childList" class="child-grid"></div><h3>Ranking da plataforma</h3><div id="rankList" class="rank-list"></div><div id="familyStatus" class="tiny"></div></div></div>`);
    bind(); renderSetup(); enhanceBlast();
  }
  function bind(){
    $id('literacyLaunch').onclick=()=>{openLiteracyScreen();renderSetup();scrollTo(0,0)};
    $id('literacyBack').onclick=()=>{closeLiteracyScreen()};
    $id('learningStart').onclick=startLearning;
    $id('familyBtn').onclick=openFamily;$id('familyClose').onclick=()=> $id('familyModal').classList.add('hidden');$id('childAdd').onclick=addChild;
  }
  function openLiteracyScreen(){document.querySelectorAll('.screen').forEach(screen=>screen.classList.toggle('hidden',screen.id!=='literacyScreen'))}
  function closeLiteracyScreen(){document.querySelectorAll('.screen').forEach(screen=>screen.classList.toggle('hidden',screen.id!=='homeScreen'));if(typeof renderHome==='function')renderHome();scrollTo(0,0)}
  function renderSetup(){
    $id('learningSetup').classList.remove('hidden');$id('learningGame').classList.add('hidden');
    $id('learningLevels').innerHTML=LEVELS.map((l,i)=>`<button class="literacy-option ${state.level===i?'active':''}" data-level="${i}">${l.name}<small style="display:block">${l.sets.flat().join(' · ')}</small></button>`).join('');
    $id('learningThemes').innerHTML=Object.keys(WORDS).map(t=>`<button class="literacy-option ${state.theme===t?'active':''}" data-theme="${t}">${THEME_LABELS[t]}</button>`).join('');
    document.querySelectorAll('[data-level]').forEach(b=>b.onclick=()=>{state.level=+b.dataset.level;state.set=0;renderSetup()});document.querySelectorAll('[data-theme]').forEach(b=>b.onclick=()=>{state.theme=b.dataset.theme;renderSetup()});
  }
  function currentSyllables(){return LEVELS[state.level].sets[state.set%LEVELS[state.level].sets.length]}
  function startLearning(){Object.assign(state,{phase:'sound',selected:null,matches:new Set(),word:0,answers:0,errors:0,started:Date.now()});$id('learningSetup').classList.add('hidden');$id('learningGame').classList.remove('hidden');$id('soundPhase').classList.remove('hidden');$id('wordPhase').classList.add('hidden');$id('learningTitle').textContent='1. Ouça e associe';$id('learningSubtitle').textContent='Complete todas as combinações para avançar.';renderSounds()}
  function shuffled(a){return [...a].sort(()=>Math.random()-.5)}
  function speak(s){try{if(window.AndroidTTS?.speak){window.AndroidTTS.speak(s,'pt-BR');return}}catch(_){}try{if(!('speechSynthesis'in window))throw new Error();window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(s);u.lang='pt-BR';u.rate=.72;window.speechSynthesis.speak(u)}catch(_){feedback(`Som: ${s}`,true)}}
  function renderSounds(){const ss=currentSyllables();$id('soundList').innerHTML=ss.map((s,i)=>`<button class="sound-token ${state.matches.has(s)?'correct':''}" data-sound="${s}">🔊 <span>${i+1}</span></button>`).join('');$id('syllableList').innerHTML=shuffled(ss).map(s=>`<button class="syllable-token ${state.matches.has(s)?'correct':''}" data-syllable="${s}">${s}</button>`).join('');document.querySelectorAll('[data-sound]').forEach(b=>b.onclick=()=>{if(state.matches.has(b.dataset.sound))return;state.selected=b.dataset.sound;document.querySelectorAll('.sound-token').forEach(x=>x.classList.toggle('active',x===b));speak(state.selected)});document.querySelectorAll('[data-syllable]').forEach(b=>b.onclick=()=>matchSyllable(b))}
  function feedback(text,ok){const e=$id('learningFeedback');e.textContent=text;e.className='learning-feedback '+(ok?'ok':'bad')}
  function matchSyllable(btn){if(!state.selected){feedback('Primeiro toque em um áudio 🔊',false);return}state.answers++;if(btn.dataset.syllable===state.selected){state.matches.add(state.selected);feedback('Muito bem! Combinação correta. ✅',true);state.selected=null;renderSounds();if(state.matches.size===currentSyllables().length)setTimeout(startWords,650)}else{state.errors++;btn.classList.add('wrong');feedback('Esse som é diferente. Ouça novamente.',false);speak(state.selected);setTimeout(()=>btn.classList.remove('wrong'),500)}}
  // Banco cumulativo: no nível 3 (encontros) a criança já viu vogais,
  // sílabas simples e dígrafos, então todas essas palavras continuam valendo
  // - é isso que faz o total de palavras crescer nos níveis mais difíceis,
  // em vez de ficar preso às 5 sílabas praticadas no round de som.
  function availableWords(){return WORDS[state.theme].filter(w=>w[3]<=state.level)}

  function historyKey(){return `soletra-literacy-history:${state.theme}:${state.level}`}
  function loadHistory(){try{const raw=JSON.parse(localStorage.getItem(historyKey())||'[]');return Array.isArray(raw)?raw:[]}catch(_){return []}}
  function pushHistory(usedWords){const hist=loadHistory();hist.push(usedWords);while(hist.length>2)hist.shift();try{localStorage.setItem(historyKey(),JSON.stringify(hist))}catch(_){}}

  function startWords(){
    const pool=availableWords();
    // Não repete o conjunto de palavras das duas últimas jogadas deste mesmo
    // tema+nível - só volta a repetir a partir da 3ª jogada, como pedido.
    const recentlyUsed=new Set(loadHistory().flat());
    const fresh=pool.filter(w=>!recentlyUsed.has(w[2]));
    const useable=fresh.length>=Math.min(3,pool.length)?fresh:pool;
    state.words=shuffled(useable).slice(0,ROUND_SIZE_BY_LEVEL[state.level]||pool.length);
    $id('soundPhase').classList.add('hidden');$id('wordPhase').classList.remove('hidden');
    $id('wordPhase').innerHTML='<div id="fillWord" class="fill-word"></div><div id="wordChoices" class="syllable-answer-list"></div>';
    $id('learningTitle').textContent='2. Complete as palavras';
    $id('learningSubtitle').textContent=`Tema: ${THEME_LABELS[state.theme]||state.theme}. Use as sílabas que você acabou de ouvir.`;
    state.word=0;
    if(!state.words.length){feedback('Sons concluídos! Esta família ainda não possui palavra no tema escolhido.',true);setTimeout(finish,700);return}
    renderWord();
  }
  function renderWord(){const w=state.words[state.word];if(!w){finish();return}$id('fillWord').textContent=w[1];const choices=shuffled([...new Set([w[0],...currentSyllables()])]).slice(0,5);$id('wordChoices').innerHTML=choices.map(s=>`<button class="syllable-token" data-word-answer="${s}">${s}</button>`).join('');document.querySelectorAll('[data-word-answer]').forEach(b=>b.onclick=()=>answerWord(b,w));speak(w[2]);setTimeout(()=>{const btn=[...document.querySelectorAll('[data-word-answer]')].find(b=>b.dataset.wordAnswer===w[0]);if(btn){btn.classList.add('intro-flash');setTimeout(()=>btn.classList.remove('intro-flash'),900)}},700)}
  function answerWord(btn,w){state.answers++;if(btn.dataset.wordAnswer===w[0]){btn.classList.add('correct');feedback(`${w[2]}! Você acertou. 🌟`,true);speak(w[2]);state.word++;setTimeout(renderWord,850)}else{state.errors++;btn.classList.add('wrong');feedback('Tente outra sílaba.',false);setTimeout(()=>btn.classList.remove('wrong'),500)}}
  async function finish(){const score=Math.max(10,state.answers*10-state.errors*3),accuracy=Math.round((state.answers-state.errors)/Math.max(1,state.answers)*100);feedback(`Trilha concluída: ${score} pontos · ${accuracy}% de precisão! 🏆`,true);if(state.words&&state.words.length)pushHistory(state.words.map(w=>w[2]));$id('wordPhase').innerHTML=`<div class="fill-word">🏆</div><h3 style="text-align:center">Trilha concluída!</h3><p style="text-align:center">${score} pontos · ${accuracy}% de precisão</p><button id="learningAgain" class="primary wide">Próxima trilha</button>`;$id('learningAgain').onclick=()=>{state.set++;renderSetup()};await saveProgress(score,accuracy)}
  async function saveProgress(score,accuracy){const api=window.AuthSession;if(!api?.user)return;try{await api.supabase.from('learning_attempts').insert({account_id:api.user.id,child_id:state.childId||null,module:'literacy',subject:`${LEVELS[state.level].id}:${state.theme}`,score,accuracy,errors:state.errors,duration_seconds:Math.round((Date.now()-state.started)/1000)});}catch(e){console.warn('Progresso pendente',e)}}
  async function openFamily(){$id('familyModal').classList.remove('hidden');await renderFamily()}
  async function renderFamily(){const api=window.AuthSession,box=$id('childList');if(!api?.user){box.innerHTML='<p>Entre na conta para sincronizar os perfis.</p>';return}const {data,error}=await api.supabase.from('child_profiles').select('id,display_name,created_at').order('created_at');if(error){box.innerHTML='<p>Execute a migração de perfis infantis no Supabase.</p>';return}box.innerHTML=(data||[]).map(c=>`<button class="child-card ${state.childId===c.id?'active':''}" data-child="${c.id}"><b>🧒 ${c.display_name}</b><span class="progress-chip">${state.childId===c.id?'Em uso':'Usar perfil'}</span></button>`).join('')||'<p class="tiny">Nenhuma criança cadastrada.</p>';document.querySelectorAll('[data-child]').forEach(b=>b.onclick=()=>{state.childId=b.dataset.child;localStorage.setItem('soletra-child-id',state.childId);renderFamily()});const {data:r}=await api.supabase.rpc('education_leaderboard',{result_limit:25});$id('rankList').innerHTML=(r||[]).map((x,i)=>`<div class="rank-row ${x.account_id===api.user.id?'me':''}"><strong>${i+1}º</strong><span>${x.display_name}<small style="display:block">Melhor: ${x.best_subject||'começando'} · dificuldade: ${x.difficulty_subject||'em análise'}</small></span><b>${x.total_score} pts</b></div>`).join('')||'<p class="tiny">O ranking aparecerá após as primeiras atividades.</p>'}
  async function addChild(){const api=window.AuthSession,name=$id('childName').value.trim();if(!api?.user||!name)return;const {error}=await api.supabase.from('child_profiles').insert({account_id:api.user.id,display_name:name});$id('familyStatus').textContent=error?(error.message.includes('limit')?'Limite de duas crianças atingido.':error.message):'Perfil criado.';if(!error){$id('childName').value='';await renderFamily()}}
  function enhanceBlast(){
    if(typeof blastMoveDrag!=='function')return;
    const oldEnd=blastEndDrag;
    blastMoveDrag=function(e){const d=blastGame.drag;if(!d||!blastGame.running||blastGame.paused)return;positionBlastFloatingPiece(e.clientX,e.clientY-58);const board=$id('blastCanvas'),rect=board.getBoundingClientRect(),lift=58,inside=e.clientX>=rect.left&&e.clientX<=rect.right&&e.clientY-lift>=rect.top&&e.clientY-lift<=rect.bottom;if(inside){const scaleX=board.width/rect.width,scaleY=board.height/rect.height,cell=board.width/BLAST_SIZE;const px=(e.clientX-rect.left)*scaleX,py=(e.clientY-lift-rect.top)*scaleY;d.col=Math.round(px/cell-d.piece.shape[0].length/2);d.row=Math.round(py/cell-d.piece.shape.length/2);d.valid=blastCanPlace(d.piece.shape,d.row,d.col)}else d.valid=false;drawBlastBoard();const box=document.querySelector('.blast-board-box');box?.classList.toggle('drop-ok',!!d.valid);box?.classList.toggle('drop-bad',!d.valid);e.preventDefault()};
    blastEndDrag=function(){const valid=!!blastGame.drag?.valid;oldEnd();const box=document.querySelector('.blast-board-box');box?.classList.remove('drop-ok','drop-bad');if(!valid&&blastGame.running){box?.animate([{transform:'translateX(-5px)'},{transform:'translateX(5px)'},{transform:'translateX(0)'}],{duration:260});sound('bad')}};
  }
  state.childId=localStorage.getItem('soletra-child-id');
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',inject);else inject();
  document.addEventListener('app-auth-ready',()=>renderFamily());
})();
