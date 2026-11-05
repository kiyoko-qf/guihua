(function () {
  'use strict';

  const D = window.CASE_DATA;
  const KEY = 'guihua.case.v1';
  const EV_ALL = Object.keys(D.evidence);
  const app = document.getElementById('app');
  const modalRoot = document.getElementById('modal-root');
  const toastEl = document.getElementById('toast');

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
  const txt = (s) => esc(s).replace(/\n/g, '<br>');

  function fresh() {
    return {
      screen: 'title',
      collected: [],
      loc: D.locations[0].id,
      refuted: [],
      timeline: [],
      timelineSolved: false,
      mistakes: 0,
      motive: null,
    };
  }

  let S = fresh();
  let pending = {};
  let flash = {};
  let wrongClaim = {};
  let motiveMsg = '';
  let timelineMsg = '';
  let devMode = false;
  let lastScreen = null;

  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      if (saved && saved.v === 1 && saved.state) S = Object.assign(fresh(), saved.state);
    }
  } catch (e) { /* 隐私模式 */ }

  const params = new URLSearchParams(location.search);
  if (params.get('fresh')) {
    try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
    S = fresh();
  }
  const devParam = params.get('dev');
  if (devParam) { devMode = true; S = devBuild(devParam); }

  function persist() {
    if (devMode) return;
    try { localStorage.setItem(KEY, JSON.stringify({ v: 1, state: S })); } catch (e) { /* ignore */ }
  }

  function devBuild(name) {
    const s = fresh();
    const all = EV_ALL.slice();
    if (name === 'investigate') { s.screen = 'investigate'; s.collected = all.slice(0, 7); }
    if (name === 'intro') { s.screen = 'intro'; }
    if (name === 'deduce') { s.screen = 'deduce'; s.collected = all; }
    if (name === 'timeline') { s.screen = 'timeline'; s.collected = all; s.refuted = D.claims.map((c) => c.id); }
    if (name === 'motive') { s.screen = 'motive'; s.collected = all; s.refuted = D.claims.map((c) => c.id); s.timeline = D.timeline.correct.slice(); s.timelineSolved = true; }
    if (name === 'ending') { s.screen = 'ending'; s.collected = all; s.refuted = D.claims.map((c) => c.id); s.timelineSolved = true; }
    if (name === 'review') { s.screen = 'review'; s.collected = all; s.refuted = D.claims.map((c) => c.id); s.timelineSolved = true; }
    return s;
  }

  /* ---------------- 通用 ---------------- */

  let toastTimer = null;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2200);
  }

  function hud(chapter) {
    const pct = Math.round((S.collected.length / EV_ALL.length) * 100);
    return `<header class="hud">
      <div class="hud-title"><a href="../index.html" class="hud-back">‹ 封面</a><span>桂花糕案</span></div>
      <div class="hud-right">
        <span>${esc(chapter)}</span>
        <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
        <span>线索 ${S.collected.length}/${EV_ALL.length}</span>
      </div>
    </header>`;
  }

  function moonArt() {
    return `<svg viewBox="0 0 420 420" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="月亮与桂花枝">
      <defs>
        <radialGradient id="moonG" cx="38%" cy="34%" r="72%">
          <stop offset="0%" stop-color="#FDF6E4"/>
          <stop offset="62%" stop-color="#F0D9A9"/>
          <stop offset="100%" stop-color="#DFBE82"/>
        </radialGradient>
      </defs>
      <circle cx="250" cy="168" r="104" fill="url(#moonG)" opacity="0.94"/>
      <circle cx="250" cy="168" r="104" stroke="#C08A2E" stroke-opacity="0.22"/>
      <path d="M46 374C88 330 114 300 142 258C160 231 170 207 174 184" stroke="#A8772A" stroke-width="1.6" stroke-linecap="round" opacity="0.75"/>
      <path d="M108 322C138 331 160 322 178 300" stroke="#A8772A" stroke-width="1.3" stroke-linecap="round" opacity="0.6"/>
      <path d="M152 248C178 243 198 229 210 207" stroke="#A8772A" stroke-width="1.2" stroke-linecap="round" opacity="0.55"/>
      <ellipse cx="118" cy="298" rx="15" ry="5.5" fill="#B0802C" opacity="0.5" transform="rotate(-30 118 298)"/>
      <ellipse cx="150" cy="332" rx="13" ry="5" fill="#B0802C" opacity="0.45" transform="rotate(24 150 332)"/>
      <ellipse cx="182" cy="292" rx="14" ry="5" fill="#B0802C" opacity="0.45" transform="rotate(-18 182 292)"/>
      <ellipse cx="206" cy="214" rx="12" ry="4.5" fill="#B0802C" opacity="0.4" transform="rotate(-42 206 214)"/>
      <g fill="#D9AC5B" opacity="0.9">
        <circle cx="174" cy="180" r="3.4"/><circle cx="180" cy="174" r="3.4"/><circle cx="168" cy="174" r="3.4"/><circle cx="174" cy="168" r="3.4"/>
      </g>
      <g fill="#D9AC5B" opacity="0.85">
        <circle cx="210" cy="203" r="3"/><circle cx="215" cy="198" r="3"/><circle cx="205" cy="198" r="3"/><circle cx="210" cy="193" r="3"/>
      </g>
      <g fill="#D9AC5B" opacity="0.8">
        <circle cx="142" cy="252" r="2.6"/><circle cx="147" cy="248" r="2.6"/><circle cx="137" cy="248" r="2.6"/><circle cx="142" cy="244" r="2.6"/>
      </g>
    </svg>`;
  }

  /* ---------------- 各屏 ---------------- */

  function titleScreen() {
    const hasSave = S.screen !== 'title';
    return `<section class="title-screen">
      <div>
        <p class="kicker">中秋夜 · 一个家庭的小谜题</p>
        <h1>桂花糕、旧车票<br>和一只打翻的盘子</h1>
        <p class="sub">纯文字本格推理 · ${esc(D.length)} · 无恐怖</p>
        <div class="title-actions">
          <button class="btn primary lg" data-act="start">${hasSave ? '继续调查' : '开始调查'}</button>
          ${hasSave ? '<button class="btn ghost" data-act="restart">重新开始</button>' : ''}
        </div>
        <p class="title-note">进度自动保存在本机浏览器 · v${esc(D.version)}</p>
      </div>
      <div class="moon-art"><div class="halo"></div>${moonArt()}</div>
    </section>`;
  }

  function introScreen() {
    const paras = D.intro.map((p, i) =>
      `<p class="para" style="animation-delay:${i * 90}ms">${txt(p)}</p>`).join('');
    return `${hud('序')}
    <section class="screen narrow intro">
      <p class="chapter-kicker">序 · 中秋夜</p>
      <h2>${esc(D.title)}</h2>
      ${paras}
      <div style="margin-top:38px">
        <button class="btn primary" data-act="investigate">走进这个家</button>
      </div>
    </section>`;
  }

  function investigateScreen() {
    if (!D.locations.some((l) => l.id === S.loc)) S.loc = D.locations[0].id;
    const loc = D.locations.find((l) => l.id === S.loc);
    const locs = D.locations.map((l) => {
      const done = l.evidence.some((id) => S.collected.includes(id));
      return `<button class="loc ${l.id === S.loc ? 'active' : ''} ${done ? 'done' : ''}"
        data-act="open-loc" data-id="${l.id}">
        <span class="num">${esc(l.index)}</span>${esc(l.name)}
      </button>`;
    }).join('');
    const cards = loc.evidence.filter((id) => S.collected.includes(id)).map((id) => {
      const ev = D.evidence[id];
      return `<article class="ev">
        <span class="ev-id">${id}</span>
        <h3>${esc(ev.title)}</h3>
        <p>${txt(ev.text)}</p>
      </article>`;
    }).join('');
    const full = S.collected.length === EV_ALL.length;
    return `${hud('第一章 · 现场')}
    <section class="screen">
      <div class="investigate">
        <aside class="locs">${locs}</aside>
        <div class="loc-panel">
          <div class="panel-title">
            <h2>${esc(loc.name)}</h2>
            <span class="count">${loc.evidence.length} 条记录</span>
          </div>
          <p class="narration">${esc(loc.text)}</p>
          ${cards || '<p class="narration">（这里还没有记录）</p>'}
        </div>
      </div>
    </section>
    <div class="dock">
      <div class="dock-left">
        <button class="btn ghost" data-act="open-book">线索簿 ${S.collected.length}/${EV_ALL.length}</button>
      </div>
      <button class="btn primary" data-act="to-deduce" ${full ? '' : 'disabled'}>去推理</button>
    </div>`;
  }

  function claimCard(c) {
    if (S.refuted.includes(c.id)) {
      return `<article class="claim refuted">
        <div class="claim-head"><span class="claim-who">${esc(c.who)}的说法 · 已推翻</span></div>
        <q>${esc(c.quote)}</q>
        <div class="claim-why">${esc(c.why)}</div>
      </article>`;
    }
    const sel = pending[c.id] || [];
    const chips = c.pool.map((id) => `<button class="chip ${sel.includes(id) ? 'on' : ''}"
      data-act="pick-ev" data-claim="${c.id}" data-ev="${id}">${id} · ${esc(D.evidence[id].title)}</button>`).join('');
    const hint = (wrongClaim[c.id] || 0) >= 2
      ? `<p class="claim-ask" style="margin-top:12px;color:var(--gold)">提示：${esc(c.hint)}</p>` : '';
    return `<article class="claim">
      <div class="claim-head"><span class="claim-who">${esc(c.who)}的说法</span></div>
      <q>${esc(c.quote)}</q>
      <p class="claim-ask">${esc(c.ask)}</p>
      <div class="chips">${chips}</div>
      <div class="claim-foot">
        <button class="btn primary" data-act="submit-claim" data-claim="${c.id}" ${sel.length === 2 ? '' : 'disabled'}>提交（${sel.length}/2）</button>
        ${flash[c.id] ? `<span class="claim-msg">${esc(flash[c.id])}</span>` : ''}
      </div>
      ${hint}
    </article>`;
  }

  function deduceScreen() {
    const allRefuted = S.refuted.length >= D.claims.length;
    return `${hud('第二章 · 三种说法')}
    <section class="screen narrow">
      <p class="chapter-kicker">第二章</p>
      <h2>三种说法</h2>
      <p class="narration">每个人都在猜。挑两条最能推翻他的物证——注意，有些证据看着像，其实是在帮他说话。</p>
      ${D.claims.map(claimCard).join('')}
      <div style="margin-top:30px;display:flex;justify-content:flex-end">
        <button class="btn primary" data-act="to-timeline" ${allRefuted ? '' : 'disabled'}>还原那个下午</button>
      </div>
    </section>`;
  }

  function timelineScreen() {
    const slots = [];
    for (let i = 0; i < D.timeline.items.length; i++) {
      const id = S.timeline[i];
      if (id) {
        const it = D.timeline.items.find((x) => x.id === id);
        slots.push(`<li class="slot filled"><span class="n">第 ${i + 1} 步</span><span>${esc(it.text)}</span><span class="t">${S.timelineSolved ? esc(it.time) : ''}</span></li>`);
      } else {
        slots.push(`<li class="slot"><span class="n">第 ${i + 1} 步</span><span>把一件事放进这里</span><span class="t">—</span></li>`);
      }
    }
    const pool = (D.timeline.poolOrder || D.timeline.items.map((it) => it.id))
      .filter((id) => !S.timeline.includes(id))
      .map((id) => D.timeline.items.find((it) => it.id === id))
      .filter(Boolean)
      .map((it) => `<button class="tl-item" data-act="tl-pick" data-id="${it.id}"><span>${esc(it.text)}</span></button>`).join('');
    const done = S.timelineSolved;
    return `${hud('第三章 · 还原')}
    <section class="screen narrow">
      <p class="chapter-kicker">第三章</p>
      <h2>还原那个下午</h2>
      <p class="narration">${done ? '顺序对了。时间对上了，那个下午就回来了。' : '把五件事按发生的先后排好。时间点藏在线索里。'}</p>
      <ol class="slots">${slots.join('')}</ol>
      ${done ? '' : `<div class="tl-pool">${pool}</div>
        ${timelineMsg ? `<p class="claim-msg" style="margin-top:14px">${esc(timelineMsg)}</p>` : ''}
        <div style="margin-top:24px;display:flex;gap:12px;justify-content:flex-end">
          <button class="btn ghost" data-act="tl-undo" ${S.timeline.length ? '' : 'disabled'}>撤回一步</button>
          <button class="btn primary" data-act="tl-check" ${S.timeline.length === D.timeline.items.length ? '' : 'disabled'}>核对顺序</button>
        </div>`}
      ${done ? `<p class="claim-why" style="margin-top:20px">${esc(D.timeline.why)}</p>
        <div style="margin-top:26px;display:flex;justify-content:flex-end">
          <button class="btn primary" data-act="to-motive">最后一问</button>
        </div>` : ''}
    </section>`;
  }

  function motiveScreen() {
    const options = D.motive.options.map((o) => `<button class="option" data-act="pick-motive" data-id="${o.id}">${esc(o.text)}</button>`).join('');
    return `${hud('第四章 · 那句话')}
    <section class="screen narrow">
      <p class="chapter-kicker">第四章</p>
      <h2>那句话</h2>
      <p class="motive-q">${esc(D.motive.question)}</p>
      ${options}
      ${motiveMsg ? `<p class="claim-msg" style="margin-top:14px">${esc(motiveMsg)}</p>` : ''}
    </section>`;
  }

  function rating() {
    if (S.mistakes === 0) return '评价 · 明察秋毫';
    if (S.mistakes <= 2) return '评价 · 心细如发';
    return '评价 · 你终究看见了真相';
  }

  function endingScreen() {
    return `<div class="ending-screen">
      <div class="end-moon"></div>
      <div class="ending-inner">
        <p class="ending-kicker">终章</p>
        <h1>${esc(D.ending.title)}</h1>
        ${D.ending.paragraphs.map((p) => `<p>${txt(p)}</p>`).join('')}
        <div class="ending-rule"></div>
        <p class="rating">${esc(rating())}</p>
        <div class="ending-actions">
          <button class="btn primary" data-act="to-review">看看推理链</button>
          <button class="btn ghost" data-act="restart">再玩一次</button>
        </div>
      </div>
    </div>`;
  }

  function mapDiagram() {
    const rows = [
      { ids: 'E4 · E5 · E6', label: '含桂花版是准备好的', y: 50, xid: 'X1' },
      { ids: 'E1 · E8 · E9 · E14', label: '打翻、重装、送到赵爷爷家', y: 115, xid: 'X2' },
      { ids: 'E10 · E11', label: '无桂花版和旧车票', y: 180, xid: 'X3' },
      { ids: 'E12', label: '她看了一眼豆豆', y: 245, xid: 'X4' },
    ];
    return `<svg class="map" viewBox="0 0 760 300" role="img" aria-label="物证地图">
      ${rows.map((r) => `
        <text x="24" y="${r.y - 7}" class="map-ids">${r.ids}</text>
        <text x="24" y="${r.y + 14}" class="map-label">${r.label}</text>
        <path d="M300 ${r.y} H400" class="map-line"/>
        <circle cx="420" cy="${r.y}" r="17" class="map-x"/>
        <text x="420" y="${r.y + 4}" class="map-xtext">${r.xid}</text>
        <path d="M437 ${r.y} C 520 ${r.y}, 545 150, 598 150" class="map-line"/>
      `).join('')}
      <rect x="600" y="118" width="146" height="64" rx="2" class="map-p"/>
      <text x="673" y="146" class="map-ptext">真相</text>
      <text x="673" y="164" class="map-ptext2">没有人糊涂，也没有人偷窃</text>
    </svg>`;
  }

  function reviewScreen() {
    return `${hud('复盘')}
    <section class="screen narrow">
      <p class="chapter-kicker">复盘</p>
      <h2>完整推理</h2>
      <div>${D.review.facts.map((f) => `<div class="fact"><span class="fact-id">${f.id}</span><p>${esc(f.text)}</p></div>`).join('')}</div>
      <h2 style="margin-top:42px;font-size:22px">物证地图</h2>
      ${mapDiagram()}
      ${D.review.chains.map((c) => `<div class="chain"><b>${c.left}</b><span>${esc(c.right)} · ${esc(c.note)}</span></div>`).join('')}
      <p class="conclusion">${esc(D.review.conclusion)}</p>
      <div style="margin-top:30px;display:flex;gap:12px">
        <button class="btn ghost" data-act="back-ending">回到结局</button>
        <button class="btn primary" data-act="restart">再玩一次</button>
      </div>
      <p class="footer-note">本故事纯属虚构 · v${esc(D.version)}</p>
    </section>`;
  }

  function render() {
    document.title = D.title;
    document.body.dataset.screen = S.screen;
    const map = {
      title: titleScreen,
      intro: introScreen,
      investigate: investigateScreen,
      deduce: deduceScreen,
      timeline: timelineScreen,
      motive: motiveScreen,
      ending: endingScreen,
      review: reviewScreen,
    };
    app.innerHTML = (map[S.screen] || titleScreen)();
    if (S.screen !== lastScreen) { window.scrollTo(0, 0); lastScreen = S.screen; }
  }

  /* ---------------- 弹层 ---------------- */

  function openBook() {
    const list = S.collected.slice().sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)));
    modalRoot.innerHTML = `<div class="modal-back" data-close="1">
      <div class="modal" role="dialog" aria-modal="true" aria-label="线索簿">
        <h2>线索簿 · ${list.length}/${EV_ALL.length}</h2>
        ${list.map((id) => `<article class="ev"><span class="ev-id">${id}</span><h3>${esc(D.evidence[id].title)}</h3><p>${txt(D.evidence[id].text)}</p></article>`).join('')}
        <button class="btn ghost modal-close" data-act="close-modal">合上</button>
      </div>
    </div>`;
  }

  function closeModal() { modalRoot.innerHTML = ''; }

  /* ---------------- 交互 ---------------- */

  function collectAt(locId) {
    const loc = D.locations.find((l) => l.id === locId);
    if (!loc) return [];
    const added = loc.evidence.filter((id) => !S.collected.includes(id));
    if (added.length) {
      S.collected = S.collected.concat(added);
      toast(`记录线索：${added.join('、')}`);
    }
    return added;
  }

  function actStart() {
    if (S.screen === 'title') {
      S.screen = 'intro';
    }
    persist();
    render();
  }

  function actInvestigate() {
    S.screen = 'investigate';
    if (!D.locations.some((l) => l.id === S.loc)) S.loc = D.locations[0].id;
    collectAt(S.loc);
    persist();
    render();
  }

  function actOpenLoc(id) {
    S.loc = id;
    collectAt(id);
    persist();
    render();
  }

  function actPickEv(claimId, evId) {
    const sel = pending[claimId] || [];
    const i = sel.indexOf(evId);
    if (i >= 0) sel.splice(i, 1);
    else {
      sel.push(evId);
      if (sel.length > 2) sel.shift();
    }
    pending[claimId] = sel;
    render();
  }

  function actSubmitClaim(claimId) {
    const sel = pending[claimId] || [];
    if (sel.length !== 2) return;
    const c = D.claims.find((x) => x.id === claimId);
    const ok = sel.every((e) => c.refute.includes(e));
    if (ok) {
      if (!S.refuted.includes(claimId)) S.refuted.push(claimId);
      delete flash[claimId];
      toast('说得通。');
    } else {
      S.mistakes += 1;
      wrongClaim[claimId] = (wrongClaim[claimId] || 0) + 1;
      flash[claimId] = '这两条不太能推翻他。它们是在反驳，还是在支持？';
    }
    persist();
    render();
  }

  function actTlPick(id) {
    if (S.timeline.includes(id)) return;
    S.timeline.push(id);
    timelineMsg = '';
    persist();
    render();
  }

  function actTlUndo() {
    S.timeline.pop();
    timelineMsg = '';
    persist();
    render();
  }

  function actTlCheck() {
    const ok = S.timeline.length === D.timeline.correct.length &&
      S.timeline.every((id, i) => id === D.timeline.correct[i]);
    if (ok) {
      S.timelineSolved = true;
      timelineMsg = '';
      toast('顺序对了。');
    } else {
      S.mistakes += 1;
      timelineMsg = '顺序不对。再想想：小票上的时间、豆豆被看见的时间、电话接通的时间。';
    }
    persist();
    render();
  }

  function actPickMotive(id) {
    if (id === D.motive.correct) {
      S.motive = id;
      S.screen = 'ending';
      persist();
      render();
      return;
    }
    S.mistakes += 1;
    motiveMsg = '再想想。她不是忘了，也不是舍不得。';
    persist();
    render();
  }

  function actRestart() {
    S = fresh();
    pending = {};
    flash = {};
    wrongClaim = {};
    motiveMsg = '';
    timelineMsg = '';
    devMode = false;
    persist();
    render();
    toast('重新开始。');
  }

  /* ---------------- 事件 ---------------- */

  document.addEventListener('click', (e) => {
    if (e.target.classList && e.target.classList.contains('modal-back')) {
      closeModal();
      return;
    }
    const el = e.target.closest('[data-act]');
    if (!el) return;
    const act = el.dataset.act;
    if (act === 'start') return actStart();
    if (act === 'restart') return actRestart();
    if (act === 'investigate') return actInvestigate();
    if (act === 'open-loc') return actOpenLoc(el.dataset.id);
    if (act === 'open-book') return openBook();
    if (act === 'close-modal') return closeModal();
    if (act === 'to-deduce') { S.screen = 'deduce'; persist(); return render(); }
    if (act === 'pick-ev') return actPickEv(el.dataset.claim, el.dataset.ev);
    if (act === 'submit-claim') return actSubmitClaim(el.dataset.claim);
    if (act === 'to-timeline') { S.screen = 'timeline'; persist(); return render(); }
    if (act === 'tl-pick') return actTlPick(el.dataset.id);
    if (act === 'tl-undo') return actTlUndo();
    if (act === 'tl-check') return actTlCheck();
    if (act === 'to-motive') { S.screen = 'motive'; persist(); return render(); }
    if (act === 'pick-motive') return actPickMotive(el.dataset.id);
    if (act === 'to-review') { S.screen = 'review'; persist(); return render(); }
    if (act === 'back-ending') { S.screen = 'ending'; persist(); return render(); }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });

  (function petals() {
    const root = document.getElementById('petals');
    if (!root) return;
    for (let i = 0; i < 14; i++) {
      const p = document.createElement('i');
      p.className = 'petal';
      p.style.left = (Math.random() * 100).toFixed(2) + 'vw';
      const size = 6 + Math.random() * 5;
      p.style.width = size + 'px';
      p.style.height = size + 'px';
      p.style.animationDuration = (14 + Math.random() * 10).toFixed(1) + 's';
      p.style.animationDelay = (-Math.random() * 20).toFixed(1) + 's';
      p.style.opacity = (0.25 + Math.random() * 0.3).toFixed(2);
      root.appendChild(p);
    }
  })();

  render();
})();
