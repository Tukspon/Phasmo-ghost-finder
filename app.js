// 状態
const state = {
  evidence: {},     // { emf5: 'confirmed' | 'excluded' }
  sanityBand: null, // null | 'low' | 'normal' | 'high'
  speedBand: null,  // null | 'slow' | 'normal' | 'fast' | 'veryfast'
};

// ハント正気度の帯（%）
const SANITY_BANDS = {
  low:    { min: 0,  max: 44  },
  normal: { min: 45, max: 55  },
  high:   { min: 56, max: 100 },
};

// 速度の帯（m/s）
const SPEED_BANDS = {
  slow:     { min: 0.0, max: 1.49 },
  normal:   { min: 1.5, max: 1.99 },
  fast:     { min: 2.0, max: 2.69 },
  veryfast: { min: 2.7, max: 5.0  },
};

let DATA = null;

function init(){
  // data.js（<script>タグで先に読み込み済み）から直接データを取得
  DATA = GHOST_DATA;

  buildEvidenceGrid();
  bindControls();
  render();
}

function buildEvidenceGrid(){
  const grid = document.getElementById('evidenceGrid');
  grid.innerHTML = '';
  DATA.evidenceTypes.forEach(ev => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'evidence-chip';
    btn.textContent = ev.ja;
    btn.dataset.key = ev.key;
    btn.dataset.state = 'none';
    btn.addEventListener('click', () => cycleEvidence(ev.key, btn));
    grid.appendChild(btn);
  });
}

function cycleEvidence(key, btn){
  const order = ['none', 'confirmed', 'excluded'];
  const current = state.evidence[key] || 'none';
  const next = order[(order.indexOf(current) + 1) % order.length];
  if (next === 'none') delete state.evidence[key];
  else state.evidence[key] = next;
  btn.dataset.state = next;
  render();
}

function bindControls(){
  bindBandGroup('sanityGrid', 'sanityBand');
  bindBandGroup('speedGrid', 'speedBand');

  document.getElementById('resetBtn').addEventListener('click', () => {
    state.evidence = {};
    state.sanityBand = null;
    state.speedBand = null;
    document.querySelectorAll('.evidence-chip').forEach(b => b.dataset.state = 'none');
    document.querySelectorAll('.band-btn').forEach(b => b.classList.remove('is-selected'));
    render();
  });
}

// トグル式のボタングループ（同じものをもう一度押すと選択解除）
function bindBandGroup(containerId, stateKey){
  const container = document.getElementById(containerId);
  container.querySelectorAll('.band-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const band = btn.dataset.band;
      const isSame = state[stateKey] === band;
      state[stateKey] = isSame ? null : band;

      container.querySelectorAll('.band-btn').forEach(b =>
        b.classList.toggle('is-selected', !isSame && b === btn)
      );
      render();
    });
  });
}

function matchesGhost(ghost){
  // 証拠フィルタ: 確定した証拠は全て持っている必要があり、除外した証拠は持っていてはいけない
  for (const [key, mode] of Object.entries(state.evidence)){
    const has = ghost.evidence.includes(key);
    if (mode === 'confirmed' && !has) return false;
    if (mode === 'excluded' && has) return false;
  }

  // ハント正気度フィルタ: ゴーストの閾値が選んだ帯に収まっているか
  if (state.sanityBand){
    const band = SANITY_BANDS[state.sanityBand];
    if (ghost.huntSanity < band.min || ghost.huntSanity > band.max) return false;
  }

  // 速度フィルタ: ゴーストの速度域(min〜max)が選んだ帯と重なっているか
  if (state.speedBand){
    const band = SPEED_BANDS[state.speedBand];
    const overlaps = ghost.speedMin <= band.max && ghost.speedMax >= band.min;
    if (!overlaps) return false;
  }

  return true;
}

function evidenceLabel(key){
  return DATA.evidenceTypes.find(e => e.key === key)?.ja || key;
}

function render(){
  const matches = DATA.ghosts.filter(matchesGhost);
  document.getElementById('matchCount').textContent = matches.length;

  const container = document.getElementById('results');
  container.innerHTML = '';

  if (matches.length === 0){
    container.innerHTML = `
      <div class="empty-state">
        <span class="glyph">—</span>
        条件に一致するゴーストがいません。<br>証拠や数値を見直してみてください。
      </div>`;
    return;
  }

  matches.forEach(g => {
    const card = document.createElement('article');
    card.className = 'ghost-card';

    const speedText = g.speedMin === g.speedMax
      ? `${g.speedMin.toFixed(2)} m/s`
      : `${g.speedMin.toFixed(2)}–${g.speedMax.toFixed(2)} m/s`;

    card.innerHTML = `
      <div class="ghost-card-head">
        <span class="ghost-name-ja">${g.ja}</span>
        <span class="ghost-name-en">${g.en}</span>
      </div>
      <div class="ghost-stats">
        <span>ハント正気度 <b>${g.huntSanity}%</b>${g.sanityNote ? ` <span style="opacity:.75">（${g.sanityNote}）</span>` : ''}</span>
        <span>速度 <b>${speedText}</b></span>
      </div>
      <div class="ghost-evidence">
        ${g.evidence.map(e => `<span class="evidence-tag">${evidenceLabel(e)}</span>`).join('')}
      </div>
      <p class="ghost-tip">${g.tips}</p>
    `;
    container.appendChild(card);
  });
}

init();
