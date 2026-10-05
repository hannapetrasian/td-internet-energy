// T&D Internet Energy — роутинг, состояние, подписки, рендер фаз.
// Статика без сборщика. ESM. Firebase подключается динамически, демо-режим без сети.

import { SCALES, WHOIS, MANUAL, CATS, CAT_BY_ID, MAX_PLAYERS, PHASE_ACCENT, TEXT } from './content.js?v=3';

/* ============================================================
   Утилиты
   ============================================================ */

const $ = (sel, root = document) => root.querySelector(sel);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const el = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const pad2 = (n) => String(n).padStart(2, '0');

// Детерминированный «случайный» наклон: один и тот же ключ — один и тот же угол.
function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) / 4294967295;
}
const tiltFor = (key, range = 6) => +((hash(String(key)) * 2 - 1) * range).toFixed(2);
const pick = (key, min, max) => Math.round(min + hash(String(key)) * (max - min));

const CODE_ALPHABET = 'ABCDEFGHJKLMNPRSTUVWXYZ';
const genCode = () => Array.from({ length: 4 }, () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]).join('');
const genId = () => Math.random().toString(36).slice(2, 10);
const isValidCode = (c) => /^[A-HJ-NP-Z]{4}$/.test(c || '');

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

const roomUrl = (code, extra = '') => `${location.origin}${location.pathname}?room=${code}${extra}`;
const shortUrl = (code, extra = '') => `${location.host}${location.pathname}?room=${code}${extra}`;

function sortedPlayers(players) {
  return Object.entries(players || {})
    .map(([id, p]) => ({ id, ...p }))
    .sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0));
}

function setAccent(phase) {
  const [a, s] = PHASE_ACCENT[phase] || PHASE_ACCENT.lobby;
  const root = document.documentElement;
  root.className = root.className.split(' ').filter((c) => !/^(accent|surprise)-/.test(c)).join(' ');
  root.classList.add(`accent-${a}`, `surprise-${s}`);
}

/* ============================================================
   Компоненты (строки HTML)
   ============================================================ */

function catSticker(catId, { size, key = catId, cls = '', pop = null, splash = null, idle = false } = {}) {
  const cat = CAT_BY_ID[catId] || CATS[0];
  const style = `--tilt:${tiltFor('cat:' + key)}deg;${size ? `--size:${size}px;` : ''}${pop !== null ? `--i:${pop};` : ''}`;
  const splashEl = splash ? `<span class="splash ${splash === 'blob' ? 'blob' : ''}" style="--splash-rot:${tiltFor('splash:' + key, 20)}deg"></span>` : '';
  return `<span class="sticker cat ${cls} ${pop !== null ? 'pop' : ''} ${idle ? 'idle' : ''}" style="${style}">${splashEl}<img src="assets/cats/${cat.file}" alt="${cat.emoji}" draggable="false"></span>`;
}

function tag(text, color = '', key = text, extra = '') {
  const v = 1 + Math.floor(hash('brush:' + key) * 3);
  return `<span class="tag ${color} ${extra}" data-v="${v}" style="--tilt:${tiltFor('tag:' + key, 4)}deg"><span class="tag-in">${esc(text)}</span></span>`;
}

function avatar(p, { size, color = '', name = true, label = true, pop = null, key = p.id } = {}) {
  const cat = CAT_BY_ID[p.cat] || CATS[0];
  return `<div class="avatar ${pop !== null ? 'pop' : ''}" style="${pop !== null ? `--i:${pop};` : ''}" data-pid="${esc(p.id)}">
    ${catSticker(p.cat, { size, key })}
    ${label && !cat.baked ? tag(cat.label, color, key + ':label') : ''}
    ${name ? `<div class="name">${esc(p.name)}</div>` : ''}
  </div>`;
}

function doodle(id, style = '', cls = '') {
  return `<svg class="doodle ${cls}" style="${style}" aria-hidden="true"><use href="assets/doodles/sprite.svg#${id}"></use></svg>`;
}

const hand = (text, rot = -3, style = '') => `<span class="hand" style="--rot:${rot}deg;${style}">${esc(text)}</span>`;

function manualCard(p, manual, { rot = 0, key = p.id } = {}) {
  const rows = MANUAL.map((m) => {
    const v = manual?.[m.key];
    return `<div class="row"><div class="k">${esc(m.label)}</div><div class="v ${v ? '' : 'empty'}">${v ? esc(v) : '—'}</div></div>`;
  }).join('');
  return `<div class="card mcard" style="--rot:${rot}deg">
    <span class="tape" style="--tape-color:var(--${hash('tape:' + key) > 0.5 ? 'yellow' : 'lavender'})"></span><span class="tape r"></span>
    <div class="who">${catSticker(p.cat, { key })}<h3 class="display">${esc(p.name)}</h3></div>
    <div class="rows">${rows}</div>
    <div class="status">${tag(TEXT.gallery.approved, 'yellow', key + ':approved')}</div>
  </div>`;
}

/* ============================================================
   Эффекты
   ============================================================ */

function confetti(n = 30) {
  if (reduced()) return;
  const colors = ['#FF5C5C', '#3155FF', '#C8F43D', '#B8A4FF', '#FFD85A'];
  const ox = window.innerWidth / 2, oy = window.innerHeight * 0.4;
  for (let i = 0; i < n; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.background = colors[i % colors.length];
    piece.style.left = `${ox}px`; piece.style.top = `${oy}px`;
    if (i % 3 === 0) piece.style.borderRadius = '50%';
    document.body.appendChild(piece);
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.4;
    const dist = 220 + Math.random() * 420;
    const dur = 550 + Math.random() * 400;
    const vx = Math.cos(angle) * dist, vy = Math.sin(angle) * dist;
    const g = 900;
    const rot = (Math.random() - 0.5) * 720;
    const frames = [];
    for (let s = 0; s <= 6; s++) {
      const t = s / 6, tt = t * (dur / 1000);
      frames.push({ transform: `translate(${vx * t}px, ${vy * t + 0.5 * g * tt * tt}px) rotate(${rot * t}deg)`, opacity: t < 0.75 ? 1 : 1 - (t - 0.75) / 0.25, offset: t });
    }
    piece.animate(frames, { duration: dur, easing: 'linear', fill: 'forwards' }).onfinish = () => piece.remove();
  }
}

function shake(target) {
  if (reduced() || !target) return;
  target.classList.remove('shake');
  void target.offsetWidth;
  target.classList.add('shake');
  setTimeout(() => target.classList.remove('shake'), 650);
}

function countUp(node, from, to, ms = 500) {
  if (!node) return;
  if (reduced() || from === to) { node.textContent = to; return; }
  const start = performance.now();
  const tick = (now) => {
    const t = Math.min(1, (now - start) / ms);
    const e = 1 - Math.pow(1 - t, 3);
    node.textContent = Math.round(from + (to - from) * e);
    if (t < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function flyTag(container, text, color) {
  if (!container) return;
  const t = el(tag(text, color, 'fly' + Math.random(), 'fly-up'));
  t.style.top = '-10px';
  container.appendChild(t);
  setTimeout(() => t.remove(), 1000);
}

/* ============================================================
   Хранилище: Firebase или демо
   ============================================================ */

async function createFirebaseStore() {
  const { firebaseConfig } = await import('./config.js?v=3');
  const [{ initializeApp }, db] = await Promise.all([
    import('https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js'),
    import('https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js'),
  ]);
  const app = initializeApp(firebaseConfig);
  const database = db.getDatabase(app);
  const r = (code, path = '') => db.ref(database, `rooms/${code}${path ? '/' + path : ''}`);
  return {
    subscribe(code, path, cb) { return db.onValue(r(code, path), (snap) => cb(snap.val())); },
    async get(code, path) { return (await db.get(r(code, path))).val(); },
    set(code, path, value) { return db.set(r(code, path), value); },
    update(code, updates) { return db.update(r(code), updates); },
    ts: () => db.serverTimestamp(),
    onConnected(cb) { return db.onValue(db.ref(database, '.info/connected'), (s) => cb(s.val() === true)); },
  };
}

/* ============================================================
   Переходы между фазами (чистая логика, используется ведущим и демо)
   ============================================================ */

export function computeNext(room) {
  const m = room.meta || {};
  const players = sortedPlayers(room.players);
  const step = m.step || 0;
  switch (m.phase) {
    case 'lobby':
      return { 'meta/phase': 'scales', 'meta/step': 0, 'meta/shown': false };
    case 'scales':
      if (!m.shown) return { 'meta/shown': true };
      if (step < SCALES.length - 1) return { 'meta/phase': 'scales', 'meta/step': step + 1, 'meta/shown': false };
      return { 'meta/phase': 'whois_input', 'meta/step': 0, 'meta/shown': null };
    case 'whois_input': {
      const ids = [];
      for (const p of players) {
        const w = room.whois?.[p.id];
        if (w?.a0) ids.push(`${p.id}:0`);
        if (w?.a1) ids.push(`${p.id}:1`);
      }
      if (!ids.length) return { 'meta/phase': 'manual_input', 'meta/step': 0 };
      return { 'meta/phase': 'whois_vote', 'meta/step': 0, 'meta/order': shuffle(ids) };
    }
    case 'whois_vote': {
      const order = m.order || [];
      const answerId = order[step];
      const updates = { 'meta/phase': 'whois_reveal', 'meta/step': step };
      if (answerId) {
        const author = answerId.split(':')[0];
        const votes = room.votes?.[answerId] || {};
        let anyCorrect = false;
        for (const [voter, votedFor] of Object.entries(votes)) {
          if (votedFor === author && room.players?.[voter]) {
            anyCorrect = true;
            updates[`players/${voter}/xp`] = (room.players[voter].xp || 0) + 10;
          }
        }
        if (!anyCorrect && Object.keys(votes).length > 0 && room.players?.[author]) {
          updates[`players/${author}/xp`] = (room.players[author].xp || 0) + 20;
        }
      }
      return updates;
    }
    case 'whois_reveal': {
      const order = m.order || [];
      if (step + 1 < order.length) return { 'meta/phase': 'whois_vote', 'meta/step': step + 1 };
      return { 'meta/phase': 'manual_input', 'meta/step': 0 };
    }
    case 'manual_input':
      return { 'meta/phase': 'gallery', 'meta/step': 0 };
    case 'gallery':
      if (step + 1 <= players.length) return { 'meta/phase': 'gallery', 'meta/step': step + 1 };
      return { 'meta/phase': 'end', 'meta/step': 0 };
    default:
      return null;
  }
}

// Подпись кнопки «Дальше» в зависимости от фазы
function nextLabel(meta) {
  if (meta.phase === 'lobby') return TEXT.lobby.start;
  if (meta.phase === 'scales' && !meta.shown) return TEXT.scales.show;
  if (meta.phase === 'whois_vote') return TEXT.whois.reveal;
  return TEXT.next;
}

// Результаты раскрытия для answerId
function revealStats(room, answerId) {
  const author = answerId.split(':')[0];
  const votes = room.votes?.[answerId] || {};
  const correct = [], wrong = [];
  for (const [voter, votedFor] of Object.entries(votes)) {
    if (!room.players?.[voter]) continue;
    (votedFor === author ? correct : wrong).push(voter);
  }
  return { author, correct, wrong, undetectable: correct.length === 0 && Object.keys(votes).length > 0 };
}

/* ============================================================
   Экран ведущего
   ============================================================ */

function fitHostStage() {
  const stage = $('#host-stage');
  if (!stage) return;
  const s = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
  stage.style.setProperty('--s', s.toFixed(4));
}

function hostTop({ code, mid = '' }) {
  return `<div class="h-top">
    <div class="brand"><span class="label">${TEXT.title}</span></div>
    <div class="mid">${mid}</div>
    <div class="right">${code ? `<span class="room-chip">ROOM ${esc(code)}</span>` : ''}</div>
  </div>`;
}

function hostBottom({ status = '', hint = '', button = '', disabled = false, secondary = '' }) {
  return `<div class="h-bottom">
    <div class="status">${status}${hint ? `<span class="hint">${esc(hint)}</span>` : ''}</div>
    <div class="actions">${secondary}${button ? `<button class="btn next" ${disabled ? 'disabled' : ''}>${esc(button)}</button>` : ''}</div>
  </div>`;
}

function drawQr(canvas, text, size) {
  if (!canvas || !window.QRCode) return;
  window.QRCode.toCanvas(canvas, text, { width: size, margin: 1, color: { dark: '#181818', light: '#FFFDF8' } }, () => {});
}

class Host {
  constructor(store, { demo = false } = {}) {
    this.store = store;
    this.demo = demo;
    this.stage = $('#host-shaker');   // экраны живут внутри «тряски», сцена не трогается
    this.code = null;
    this.room = null;
    this.screenKey = null;
    this.screen = null;
    this.unsub = null;
    this.busy = false;
    window.addEventListener('resize', fitHostStage);
    fitHostStage();
    document.addEventListener('keydown', (e) => {
      if (!this.demo) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); this.store.demoNext?.(); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); this.store.demoPrev?.(); }
    });
  }

  /* --- вход --- */

  async start() {
    if (this.demo) return this.attach(this.store.demoCode);
    const params = new URLSearchParams(location.search);
    const fromUrl = (params.get('room') || '').toUpperCase();
    const last = localStorage.getItem('tdie.host.last');
    const code = isValidCode(fromUrl) ? fromUrl : last;
    if (code && localStorage.getItem(`tdie.host.${code}`)) {
      const meta = await this.store.get(code, 'meta');
      if (meta) return this.attach(code);
    }
    this.renderStart();
  }

  renderStart(error = '') {
    setAccent('lobby');
    const screen = el(`<div class="screen">
      ${hostTop({})}
      <div class="h-main"><div class="h-start"><div class="inner">
        ${doodle('star', 'left:-120px;top:-40px;width:70px;height:70px', 'surprise')}
        <h1 class="display xl">${TEXT.title}</h1>
        ${hand(TEXT.lobby.tagline, -3)}
        <button class="btn create">${esc(TEXT.lobby.create)}</button>
        <div class="restore">
          <div class="label" style="margin-bottom:12px;opacity:.7">${esc(TEXT.lobby.restoreLabel)}</div>
          <div class="row"><input class="input code-input" maxlength="4" autocapitalize="characters" autocomplete="off" spellcheck="false" placeholder="ABCD"><button class="btn secondary restore-btn">${esc(TEXT.lobby.restore)}</button></div>
          <div class="body err" style="color:var(--coral);min-height:1.5em;margin-top:10px">${esc(error)}</div>
        </div>
      </div></div></div>
      ${hostBottom({})}
    </div>`);
    $('.create', screen).onclick = () => this.createRoom();
    const go = () => this.restore($('.code-input', screen).value.trim().toUpperCase());
    $('.restore-btn', screen).onclick = go;
    $('.code-input', screen).addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
    this.swap('start', screen);
  }

  async createRoom() {
    if (this.busy) return;
    this.busy = true;
    try {
      let code = genCode();
      for (let i = 0; i < 5; i++) {
        if (!(await this.store.get(code, 'meta'))) break;
        code = genCode();
      }
      const hostToken = genId() + genId();
      await this.store.set(code, '', { meta: { createdAt: this.store.ts(), hostToken, phase: 'lobby', step: 0 } });
      localStorage.setItem(`tdie.host.${code}`, JSON.stringify({ hostToken, createdAt: Date.now() }));
      localStorage.setItem('tdie.host.last', code);
      await this.attach(code);
    } catch (e) {
      console.error(e);
      this.renderStart('Не удалось создать комнату: ' + (e.message || e));
    } finally { this.busy = false; }
  }

  async restore(code) {
    if (!isValidCode(code)) return this.renderStart('Код: 4 латинские буквы');
    const meta = await this.store.get(code, 'meta');
    if (!meta) return this.renderStart(`Комнаты ${code} нет`);
    localStorage.setItem(`tdie.host.${code}`, JSON.stringify({ hostToken: meta.hostToken || '', createdAt: Date.now() }));
    localStorage.setItem('tdie.host.last', code);
    this.attach(code);
  }

  attach(code) {
    this.code = code;
    if (this.unsub) this.unsub();
    this.unsub = this.store.subscribe(code, '', (room) => {
      if (!room || !room.meta) return this.renderStart(`Комната ${code} удалена`);
      this.room = room;
      this.render();
    });
  }

  /* --- переходы --- */

  async next() {
    if (this.busy || !this.room) return;
    const updates = computeNext(this.room);
    if (!updates) return;
    this.busy = true;
    const btn = $('.btn.next', this.stage);
    if (btn) btn.disabled = true;
    try { await this.store.update(this.code, updates); }
    catch (e) { console.error(e); if (btn) btn.disabled = false; }
    finally { this.busy = false; if (this.room) this.render(); }
  }

  /* --- рендер --- */

  swap(key, screen) {
    const old = this.screen;
    this.screen = screen;
    this.screenKey = key;
    if (old && !reduced()) {
      old.classList.add('leave');
      screen.classList.add('enter');
      setTimeout(() => old.remove(), 320);
      setTimeout(() => screen.classList.remove('enter'), 400);
    } else if (old) {
      old.remove();
    }
    this.stage.appendChild(screen);
    const btn = $('.btn.next', screen);
    if (btn) btn.onclick = () => this.next();
  }

  render() {
    const m = this.room.meta;
    setAccent(m.phase);
    const key = (m.phase === 'whois_vote' || m.phase === 'whois_reveal') ? `whois:${m.step || 0}` : `${m.phase}:${m.step || 0}`;
    if (key !== this.screenKey) {
      const builder = this.screens[m.phase] || this.screens.lobby;
      const { node, update } = builder.call(this, this.room);
      this.update = update;
      this.swap(key, node);
    }
    this.update?.(this.room);
    const btn = $('.btn.next', this.screen);
    if (btn && !this.busy) {
      btn.textContent = nextLabel(m);
      btn.disabled = m.phase === 'lobby' && sortedPlayers(this.room.players).length < 2;
    }
  }

  get screens() {
    return {
      /* ---------- Лобби ---------- */
      lobby(room) {
        const code = this.code;
        const node = el(`<div class="screen">
          ${hostTop({ code, mid: tag('LOBBY', 'surprise', 'lobby-tag') })}
          <div class="h-main"><div class="h-lobby">
            <div class="left">
              <div class="title-wrap">
                <h1 class="display">T&amp;D<br>INTERNET<br>ENERGY</h1>
                ${doodle('oval', 'left:-44px;top:186px;width:410px;height:160px', 'draw')}
                ${hand(TEXT.lobby.tagline, -4)}
                ${doodle('star', 'left:430px;top:-30px;width:72px;height:72px', 'surprise twinkle')}
                ${doodle('heart', 'left:880px;top:214px;width:36px;height:36px', 'accent float')}
              </div>
              <div class="code-wrap">
                <span class="label muted">Код комнаты</span>
                <div class="code">${esc(code)}</div>
                <div class="url">${esc(shortUrl(code))}</div>
              </div>
            </div>
            <div class="right">
              ${[0, 1, 2, 3].map((i) => doodle('paw', `left:${-470 + i * 95}px;top:${300 - i * 22 + (i % 2) * 18}px;width:34px;height:34px;--rot:${18 + i * 6}deg;--i:${i}`, 'fill paw-step')).join('')}
              ${doodle('arrow', 'left:-150px;top:120px;width:160px;height:100px;transform:rotate(-20deg)', 'draw')}
              <div class="card qr-card"><span class="tape tl"></span><span class="tape tr"></span><canvas class="qr" width="280" height="280"></canvas><div class="qr-caption label">Наведи камеру</div></div>
            </div>
            <div class="players"></div>
          </div></div>
          ${hostBottom({ status: tag(`0 / ${MAX_PLAYERS} ${TEXT.lobby.inGame}`, 'surprise', 'lobby-count'), button: TEXT.lobby.start, disabled: true })}
        </div>`);
        drawQr($('.qr', node), roomUrl(code), 280);
        const seen = new Set();
        let first = true;
        const update = (room) => {
          const players = sortedPlayers(room.players);
          const wrap = $('.players', node);
          players.forEach((p, i) => {
            if (seen.has(p.id)) return;
            seen.add(p.id);
            wrap.appendChild(el(avatar(p, { color: 'cobalt', pop: first ? i : 0 })));
          });
          for (const a of wrap.querySelectorAll('.avatar')) if (!room.players?.[a.dataset.pid]) a.remove();
          first = false;
          $('.status', node).innerHTML = tag(`${players.length} / ${MAX_PLAYERS} ${TEXT.lobby.inGame}`, 'surprise', 'lobby-count')
            + (players.length < 2 ? `<span class="hint">${esc(TEXT.lobby.needTwo)}</span>` : '');
        };
        return { node, update };
      },

      /* ---------- Шкалы ---------- */
      scales(room) {
        const step = room.meta.step || 0;
        const sc = SCALES[step];
        const node = el(`<div class="screen">
          ${hostTop({ code: this.code, mid: tag(`ROUND ${pad2(step + 1)} / ${pad2(SCALES.length)}`, 'surprise', 'round' + step) })}
          <div class="h-main"><div class="h-scales">
            <div class="q">
              ${doodle('bolt', 'right:-120px;top:-10px;width:64px;height:96px', 'accent float')}
              <h1 class="display">${esc(sc.q)}</h1>
              ${hand(TEXT.scales.noRight, 2, 'justify-self:start;margin-left:8px')}
            </div>
            <div class="track-wrap">
              ${doodle('sparks', 'right:40px;top:-120px;width:90px;height:90px', 'surprise twinkle')}
              
              <div class="track"></div>
              <div class="ends"><div class="end l">${esc(sc.left)}</div><div class="end r">${esc(sc.right)}</div></div>
            </div>
          </div></div>
          ${hostBottom({ status: tag(`0 / ${MAX_PLAYERS} ${TEXT.scales.answered}`, '', 'ans' + step), button: TEXT.scales.show })}
        </div>`);
        const placed = new Set();
        let shownAt = null;
        const update = (room) => {
          const players = sortedPlayers(room.players);
          const answers = room.scales?.[step] || {};
          const answered = players.filter((p) => answers[p.id] !== undefined);
          $('.status', node).innerHTML = tag(`${answered.length} / ${Math.max(players.length, 1)} ${TEXT.scales.answered}`, room.meta.shown ? 'surprise' : '', 'ans' + step);
          if (!room.meta.shown) return;
          if (shownAt === null) shownAt = performance.now();
          const track = $('.track', node);
          // раскладка: коты стоят на своих значениях, но не наезжают друг на друга.
          // Близкие (ближе ширины стикера) раздвигаем по горизонтали и чередуем две полки.
          const trackW = track.clientWidth || 1680;
          const minGap = 156;
          const sorted = answered.map((p) => ({ p, v: Number(answers[p.id]) })).sort((a, b) => a.v - b.v);
          const xs = sorted.map((it) => (it.v / 100) * trackW);
          for (let pass = 0; pass < 6; pass++) {
            for (let i = 1; i < xs.length; i++) if (xs[i] - xs[i - 1] < minGap) xs[i] = xs[i - 1] + minGap;
            const lo = minGap / 2, hi = trackW - minGap / 2;   // центр стикера не ближе половины ширины к краю
            const over = xs.length ? xs[xs.length - 1] - hi : 0;
            if (over > 0) for (let i = 0; i < xs.length; i++) xs[i] -= over;
            for (let i = xs.length - 2; i >= 0; i--) if (xs[i + 1] - xs[i] < minGap) xs[i] = xs[i + 1] - minGap;
            if (xs.length && xs[0] < lo) { const d = lo - xs[0]; for (let i = 0; i < xs.length; i++) xs[i] += d; }
          }
          let lane = 0;
          const layout = sorted.map((it, i) => {
            const close = i > 0 && xs[i] - xs[i - 1] < minGap + 24;
            lane = close ? (lane ? 0 : 1) : 0;
            return { ...it, x: (xs[i] / trackW) * 100, lane };
          });
          layout.forEach((it, i) => {
            let pin = track.querySelector(`.pin[data-pid="${it.p.id}"]`);
            const late = performance.now() - shownAt > 1500;
            if (!pin) {
              pin = el(`<div class="pin" data-pid="${esc(it.p.id)}" style="--x:50%;--i:${late ? 0 : i};--lane:${it.lane}">${avatar(it.p, { color: 'lavender', label: false, pop: late ? 0 : i })}</div>`);
              track.appendChild(pin);
              placed.add(it.p.id);
              requestAnimationFrame(() => requestAnimationFrame(() => { pin.style.setProperty('--x', `${it.x}%`); }));
            } else {
              pin.style.setProperty('--x', `${it.x}%`);
              pin.style.setProperty('--lane', it.lane);
            }
          });
        };
        return { node, update };
      },

      /* ---------- Кто это: ввод ---------- */
      whois_input(room) {
        const node = el(`<div class="screen">
          ${hostTop({ code: this.code, mid: tag('NEW', 'surprise', 'whois-new') })}
          <div class="h-main"><div class="h-whois-intro">
            <div class="left">
              <h1 class="display xl">${TEXT.whois.title}</h1>
              ${doodle('qmark', 'left:520px;top:-70px;width:90px;height:110px', 'surprise draw')}
              <div class="rules">
                ${TEXT.whois.rules.map((r, i) => `<div class="rule">${tag(pad2(i + 1), 'ink', 'rule' + i)}<span>${esc(r)}</span></div>`).join('')}
              </div>
              ${hand(TEXT.whois.keepCalm, -3, 'margin-top:40px')}
            </div>
            <div class="qs">
              ${doodle('arrow-loop', 'left:-140px;top:-10px;width:150px;height:110px', 'surprise draw')}
              ${WHOIS.map((q, i) => `<div class="card"><span class="label muted">Вопрос ${i + 1}</span>${esc(q)}</div>`).join('')}
            </div>
          </div></div>
          ${hostBottom({ status: tag(`0 / ${MAX_PLAYERS} ${TEXT.whois.answered}`, '', 'wa'), button: TEXT.next })}
        </div>`);
        const update = (room) => {
          const players = sortedPlayers(room.players);
          const done = players.filter((p) => room.whois?.[p.id]?.a0 && room.whois?.[p.id]?.a1).length;
          $('.status', node).innerHTML = tag(`${done} / ${Math.max(players.length, 1)} ${TEXT.whois.answered}`, done >= players.length && players.length ? 'surprise' : '', 'wa');
        };
        return { node, update };
      },

      /* ---------- Кто это: голосование + раскрытие ---------- */
      whois_vote(room) { return this.screens.whois.call(this, room); },
      whois_reveal(room) { return this.screens.whois.call(this, room); },
      whois(room) {
        const step = room.meta.step || 0;
        const order = room.meta.order || [];
        const answerId = order[step] || '';
        const [author, qi] = answerId.split(':');
        const q = WHOIS[Number(qi) || 0];
        const text = room.whois?.[author]?.[`a${qi}`] || '…';
        const node = el(`<div class="screen">
          ${hostTop({ code: this.code, mid: tag(`${TEXT.whois.answer} ${step + 1} / ${order.length}`, 'surprise', 'ans' + step) })}
          <div class="h-main">
            <div class="h-vote">
              <div class="qline">${esc(q)}</div>
              <div class="answer-wrap">
                ${doodle('sparks', 'left:-70px;top:-90px;width:110px;height:110px', 'surprise twinkle')}
                ${doodle('arrow', 'right:-150px;bottom:-40px;width:150px;height:95px;transform:scaleX(-1) rotate(20deg)', 'draw')}
                <div class="card answer-card">
                  <span class="tape" style="left:calc(50% - 55px);transform:rotate(-3deg)"></span>
                  <span class="quote">“</span>
                  <h1 class="display">${esc(text)}</h1>
                  <span class="quote close">”</span>
                </div>
              </div>
              <div class="hand-slot">${hand(TEXT.whois.keepCalm, -3)}</div>
            </div>
          </div>
          ${hostBottom({ status: tag(`0 / 0 ${TEXT.whois.votedCount}`, '', 'vc' + step), button: TEXT.whois.reveal })}
        </div>`);
        let revealed = false;
        const renderReveal = (room, animate) => {
          revealed = true;
          setAccent('whois_reveal');
          const st = revealStats(room, answerId);
          const ap = room.players?.[author] ? { id: author, ...room.players[author] } : { id: author, name: '?', cat: 'face' };
          const voters = [...st.correct.map((id) => ({ id, ok: true })), ...st.wrong.map((id) => ({ id, ok: false }))]
            .map((v) => ({ ...v, p: { id: v.id, ...room.players[v.id] } }));
          const main = $('.h-main', node);
          main.innerHTML = `<div class="h-reveal">
            <div class="answer-mini">
              <div class="muted">${esc(q)}</div>
              <div class="display">“${esc(text)}”</div>
              ${st.undetectable ? `<div>${tag(`${TEXT.whois.undetectable} +20 XP`, 'surprise', 'undet' + step, 'lg')}</div>` : ''}
            </div>
            <div class="author">
              ${doodle('exclaim', 'left:40px;top:-20px;width:120px;height:100px', 'accent twinkle')}
              ${doodle('star', 'right:40px;top:30px;width:64px;height:64px', 'surprise twinkle')}
              <div class="avatar ${animate ? 'pop' : ''}" style="--i:0">${catSticker(ap.cat, { size: 300, key: ap.id, splash: 'burst', idle: true })}${tag(TEXT.whois.author, 'coral', 'author' + step)}</div>
              <h1 class="display">${esc(ap.name)}</h1>
              <div class="tell">${esc(TEXT.whois.tell(ap.name))}</div>
            </div>
            <div class="voters">
              ${voters.map((v, i) => `<div class="avatar ${animate ? 'pop' : ''}" style="--i:${i + 2}">${catSticker(v.p.cat, { size: 120, key: v.p.id })}${tag(v.ok ? '+10 XP' : 'NOPE', v.ok ? 'lime' : 'coral', 'vote' + step + v.id)}<div class="name">${esc(v.p.name || '')}</div></div>`).join('')}
            </div>
          </div>`;
          $('.status', node).innerHTML = hand(TEXT.whois.keepCalm, -3);
          if (animate) confetti();
        };
        const update = (room) => {
          const m = room.meta;
          if (m.phase === 'whois_reveal') {
            if (!revealed) {
              if (reduced()) renderReveal(room, false);
              else { setTimeout(() => { shake(this.stage); setTimeout(() => renderReveal(room, true), 120); }, 80); revealed = true; }
            }
            return;
          }
          const players = sortedPlayers(room.players);
          const voters = players.filter((p) => p.id !== author);
          const votes = room.votes?.[answerId] || {};
          const n = voters.filter((p) => votes[p.id]).length;
          $('.status', node).innerHTML = tag(`${n} / ${voters.length} ${TEXT.whois.votedCount}`, n >= voters.length && voters.length ? 'surprise' : '', 'vc' + step);
        };
        return { node, update };
      },

      /* ---------- Инструкция ---------- */
      manual_input(room) {
        const node = el(`<div class="screen">
          ${hostTop({ code: this.code, mid: tag('FINAL ROUND', 'surprise', 'final') })}
          <div class="h-main"><div class="h-manual">
            <div class="left">
              <h1 class="display">${TEXT.manual.title}</h1>
              ${hand(TEXT.manual.tagline, -3, 'justify-self:start')}
              ${doodle('underline', 'left:4px;top:232px;width:330px;height:34px', 'accent draw')}
              ${doodle('heart', 'left:420px;top:250px;width:54px;height:54px', 'surprise float')}
              ${doodle('sparkle-cluster', 'left:60px;top:330px;width:120px;height:100px', 'surprise twinkle')}
            </div>
            <div class="list">
              ${MANUAL.map((m, i) => `<div class="card">${tag(pad2(i + 1), 'ink', 'm' + i)}<span>${esc(m.label)}</span></div>`).join('')}
            </div>
          </div></div>
          ${hostBottom({ status: tag(`0 / ${MAX_PLAYERS} ${TEXT.manual.wrote}`, '', 'mw'), button: TEXT.next })}
        </div>`);
        const update = (room) => {
          const players = sortedPlayers(room.players);
          const done = players.filter((p) => room.manual?.[p.id]).length;
          $('.status', node).innerHTML = tag(`${done} / ${Math.max(players.length, 1)} ${TEXT.manual.wrote}`, done >= players.length && players.length ? 'surprise' : '', 'mw');
        };
        return { node, update };
      },

      /* ---------- Галерея ---------- */
      gallery(room) {
        const step = room.meta.step || 0;
        const players = sortedPlayers(room.players);
        const isGrid = step >= players.length;
        const code = this.code;
        let main;
        if (isGrid) {
          main = `<div class="h-gallery-grid">${players.map((p) => manualCard(p, room.manual?.[p.id], { rot: tiltFor('gcard' + p.id, 3) })).join('')}</div>`;
        } else {
          const p = players[step];
          main = `<div class="h-gallery-one">${doodle('arrow-down', 'left:220px;top:40px;width:80px;height:130px', 'surprise draw')}${doodle('sparkle-cluster', 'right:200px;top:60px;width:120px;height:100px', 'twinkle')}${p ? manualCard(p, room.manual?.[p.id], { rot: tiltFor('gcard' + p.id, 2) }) : ''}</div>`;
        }
        const node = el(`<div class="screen">
          ${hostTop({ code, mid: tag(isGrid ? 'GALLERY' : `${step + 1} / ${players.length}`, 'surprise', 'g' + step) })}
          <div class="h-main">${main}</div>
          ${hostBottom({ status: `<span class="url-text muted">${esc(shortUrl(code, '&gallery'))}</span>`, button: TEXT.next })}
        </div>`);
        return { node, update: () => {} };
      },

      /* ---------- Финал ---------- */
      end(room) {
        const code = this.code;
        const players = sortedPlayers(room.players).sort((a, b) => (b.xp || 0) - (a.xp || 0));
        const node = el(`<div class="screen">
          ${hostTop({ code, mid: tag('GAME OVER', 'surprise', 'over') })}
          <div class="h-main"><div class="h-end">
            <div class="left">
              <div style="position:relative;display:inline-block">
                <h1 class="display">${TEXT.end.title}</h1>
                ${doodle('crown', 'right:-70px;top:-60px;width:80px;height:70px', 'surprise twinkle')}
                ${doodle('heart', 'right:-150px;top:10px;width:44px;height:44px', 'accent float')}
              </div>
              ${hand(TEXT.end.goodIdea, 2, 'justify-self:start')}
              <div class="table">
                ${players.map((p, i) => `<div class="card trow pop" style="--i:${i}">
                  <div class="rank">${pad2(i + 1)}</div>
                  ${catSticker(p.cat, { size: 96, key: p.id })}
                  <div class="nm">${esc(p.name)}</div>
                  <div class="xp">${p.xp || 0} XP</div>
                  ${tag(`${TEXT.end.chaos}: ${i === 0 ? 100 : pick('chaos' + p.id, 60, 99)}%`, i === 0 ? 'surprise' : 'lavender', 'chaos' + p.id)}
                </div>`).join('')}
              </div>
            </div>
            <div class="right">
              <span class="label">${esc(TEXT.end.gallery)}</span>
              <div class="card qr-card"><canvas class="qr" width="240" height="240"></canvas></div>
              <div class="url">${esc(shortUrl(code, '&gallery'))}</div>
            </div>
          </div></div>
          ${hostBottom({ status: '' })}
        </div>`);
        drawQr($('.qr', node), roomUrl(code, '&gallery'), 240);
        setTimeout(() => confetti(), 300);
        return { node, update: () => {} };
      },
    };
  }
}

/* ============================================================
   Экран участника
   ============================================================ */

function playerTop(mid = '') {
  return `<div class="p-top"><div class="brand"><span class="label">${TEXT.title}</span></div><div class="right">${mid}</div></div>`;
}

class Player {
  constructor(store, code, { demo = false } = {}) {
    this.store = store;
    this.code = code;
    this.demo = demo;
    this.root = $('#player-root');
    this.meta = null;
    this.players = null;
    this.me = this.loadMe();
    this.screenKey = null;
    this.screen = null;
    this.displayedXp = null;
    if (demo) {
      document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight') { e.preventDefault(); this.store.demoNext?.(); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); this.store.demoPrev?.(); }
      });
    }
  }

  loadMe() {
    try { return JSON.parse(localStorage.getItem(`tdie.player.${this.code}`)) || null; } catch { return null; }
  }
  saveMe(me) { this.me = me; localStorage.setItem(`tdie.player.${this.code}`, JSON.stringify(me)); }

  get mine() { return this.me && this.players?.[this.me.playerId] ? { id: this.me.playerId, ...this.players[this.me.playerId] } : null; }

  start() {
    this.store.subscribe(this.code, 'meta', (meta) => { this.meta = meta; this.render(); });
    this.store.subscribe(this.code, 'players', (players) => { this.players = players || {}; this.render(); });
  }

  swap(key, screen) {
    if (this.screen) this.screen.remove();
    this.screen = screen;
    this.screenKey = key;
    this.root.appendChild(screen);
    window.scrollTo(0, 0);
  }

  render() {
    if (!this.meta || this.players === null) {
      if (this.meta === null && this.players !== null) this.renderNoRoom();
      return;
    }
    const m = this.meta;
    setAccent(m.phase);
    const mine = this.mine;
    const key = mine ? `${m.phase}:${m.step || 0}` : 'join';
    if (key !== this.screenKey) {
      const builder = mine ? (this.screens[m.phase] || this.screens.lobby) : this.screens.join;
      const { node, update } = builder.call(this, m);
      this.update = update;
      this.swap(key, node);
    }
    this.update?.(m);
  }

  renderNoRoom() {
    setAccent('lobby');
    this.swap('noroom', el(`<div class="screen">${playerTop()}<div class="p-main"><div class="p-center">
      <h1 class="display">КОМНАТЫ НЕТ</h1><p class="body">Проверь код: ${esc(this.code)}</p></div></div></div>`));
  }

  // Элемент с ролью: верх, середина, низ
  frame({ mid = '', main = '', bottom = '' }) {
    return el(`<div class="screen">${playerTop(mid)}<div class="p-main">${main}</div><div class="p-bottom">${bottom}</div></div>`);
  }

  // Анимированный XP
  xpBlock(xp) {
    return `<div class="p-center" style="gap:6px"><span class="label muted">${TEXT.whois.yourXp}</span><div class="xp-big"><span class="xp-num">${this.displayedXp ?? xp}</span></div></div>`;
  }
  syncXp(node, xp, color = 'lime') {
    const num = $('.xp-num', node);
    if (!num) { this.displayedXp = xp; return; }
    const from = this.displayedXp ?? xp;
    if (from !== xp) {
      countUp(num, from, xp, 500);
      if (xp > from) flyTag(num.parentElement, `+${xp - from} XP`, color);
    }
    this.displayedXp = xp;
  }

  get screens() {
    return {
      /* ---------- Вход ---------- */
      join(meta) {
        const late = meta.phase !== 'lobby';
        const node = this.frame({
          mid: late ? tag('LIVE', 'surprise', 'live') : '',
          main: `
            <h1 class="display">${TEXT.lobby.pickCat}</h1>
            ${late ? `<p class="body" style="margin:0">${esc(TEXT.lobby.gameOn)}</p>` : ''}
            <div class="cat-grid">
              ${CATS.map((c) => `<button type="button" class="cat-tile" data-cat="${c.id}">${catSticker(c.id, { size: 96, key: 'tile' + c.id })}${tag(c.baked ? TEXT.lobby.taken : c.label, 'cobalt', 'tile' + c.id, c.baked ? 'hidden' : '')}</button>`).join('')}
            </div>
            <label class="field"><span class="label">${esc(TEXT.lobby.nameLabel)}</span><input class="input name" maxlength="16" autocomplete="off" enterkeyhint="go" placeholder="Имя"></label>`,
          bottom: `<button class="btn block join" disabled>${esc(TEXT.lobby.join)}</button>`,
        });
        const grid = $('.cat-grid', node), nameInput = $('.name', node), joinBtn = $('.join', node);
        let picked = null;
        const refresh = () => {
          const taken = new Set(Object.values(this.players || {}).map((p) => p.cat));
          for (const t of grid.querySelectorAll('.cat-tile')) {
            const isTaken = taken.has(t.dataset.cat);
            t.classList.toggle('taken', isTaken);
            t.disabled = isTaken;
            const tg = $('.tag', t);
            if (tg) {
              const c = CAT_BY_ID[t.dataset.cat];
              $('.tag-in', tg).textContent = isTaken ? TEXT.lobby.taken : c.label;
              tg.classList.toggle('ink', isTaken);
              tg.classList.toggle('hidden', !!c.baked && !isTaken);
            }
            $('.sticker', t).classList.toggle('taken', isTaken);
            if (isTaken && picked === t.dataset.cat) picked = null;
            t.classList.toggle('picked', picked === t.dataset.cat);
          }
          grid.classList.toggle('has-pick', !!picked);
          joinBtn.disabled = !(picked && nameInput.value.trim());
        };
        grid.addEventListener('click', (e) => {
          const t = e.target.closest('.cat-tile');
          if (!t || t.disabled) return;
          picked = picked === t.dataset.cat ? null : t.dataset.cat;
          refresh();
        });
        nameInput.addEventListener('input', refresh);
        nameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !joinBtn.disabled) joinBtn.click(); });
        joinBtn.onclick = async () => {
          const name = nameInput.value.trim().slice(0, 16);
          const cat = picked;   // фиксируем до await: refresh() сбросит picked, когда кот станет «занят» нами же
          if (!cat || !name) return;
          joinBtn.disabled = true;
          const playerId = this.me?.playerId || genId();
          try {
            await this.store.set(this.code, `players/${playerId}`, { name, cat, joinedAt: this.store.ts(), xp: 0 });
            this.saveMe({ playerId, name, cat });
            this.displayedXp = 0;
            this.render();   // подписка могла сработать раньше, чем сохранился me
          } catch (e) { console.error(e); joinBtn.disabled = false; }
        };
        return { node, update: refresh };
      },

      /* ---------- Лобби: ты в игре ---------- */
      lobby() {
        const me = this.mine;
        const node = this.frame({
          mid: tag('LOBBY', 'surprise', 'lobby'),
          main: `<div class="p-center">
            ${doodle('star', 'right:-6px;top:-10px;width:48px;height:48px', 'surprise twinkle')}
            <h1 class="display">${TEXT.lobby.joined}</h1>
            <p class="body" style="margin:0">${esc(TEXT.lobby.lookUp)}</p>
            <div class="avatar pop" style="margin-top:12px">${catSticker(me.cat, { size: 200, key: me.id, splash: 'burst', idle: true })}${CAT_BY_ID[me.cat].baked ? '' : tag(CAT_BY_ID[me.cat].label, 'cobalt', me.id + ':label')}<div class="name">${esc(me.name)}</div></div>
            ${hand(TEXT.lobby.noPeek, 3, 'margin-top:12px')}
          </div>`,
          bottom: '',
        });
        this.displayedXp = me.xp || 0;
        return { node, update: () => {} };
      },

      /* ---------- Шкалы ---------- */
      scales(meta) {
        const step = meta.step || 0, sc = SCALES[step], me = this.mine;
        const node = this.frame({
          mid: tag(`ROUND ${pad2(step + 1)} / ${pad2(SCALES.length)}`, 'surprise', 'r' + step),
          main: `<h1 class="display sm">${esc(sc.q)}</h1>
            <div class="p-scale">
              <div class="ends"><div class="end l">${esc(sc.left)}</div><div class="end r">${esc(sc.right)}</div></div>
              <input type="range" class="range" min="0" max="100" value="50" aria-label="${esc(sc.q)}">
              <div class="state" style="min-height:60px;display:grid;place-items:center"></div>
            </div>`,
          bottom: `<button class="btn block done">${esc(TEXT.scales.done)}</button>`,
        });
        const range = $('.range', node), btn = $('.done', node), state = $('.state', node);
        const lock = (v) => {
          range.value = v; range.disabled = true; btn.classList.add('hidden');
          state.innerHTML = `${tag(TEXT.scales.gotIt, 'surprise', 'got' + step)}<div class="body muted" style="margin-top:14px;font-size:15px">${esc(TEXT.scales.wait)}</div>`;
          $('.tag', state).classList.add('pop');
        };
        this.store.get(this.code, `scales/${step}/${me.id}`).then((v) => { if (v !== null && v !== undefined) lock(v); });
        btn.onclick = async () => {
          btn.disabled = true;
          const v = Number(range.value);
          try { await this.store.set(this.code, `scales/${step}/${me.id}`, v); lock(v); }
          catch (e) { console.error(e); btn.disabled = false; }
        };
        this.displayedXp = me.xp || 0;
        return { node, update: () => {} };
      },

      /* ---------- Кто это: ввод ---------- */
      whois_input() {
        const me = this.mine;
        const node = this.frame({
          mid: tag('NEW', 'surprise', 'new'),
          main: `<h1 class="display">${TEXT.whois.title}</h1>
            <div class="p-fields">
              ${WHOIS.map((q, i) => `<label class="field"><span class="body" style="font-weight:600">${esc(q)}</span><input class="input a" data-i="${i}" maxlength="80" autocomplete="off" enterkeyhint="next"></label>`).join('')}
              <div class="state"></div>
            </div>`,
          bottom: `<button class="btn block send" disabled>${esc(TEXT.whois.send)}</button>`,
        });
        const inputs = [...node.querySelectorAll('.a')], btn = $('.send', node), state = $('.state', node);
        const check = () => { btn.disabled = !inputs.every((i) => i.value.trim()); };
        inputs.forEach((i) => i.addEventListener('input', check));
        const lock = (w) => {
          inputs.forEach((inp, i) => { inp.value = w[`a${i}`] || ''; inp.disabled = true; });
          btn.classList.add('hidden');
          state.innerHTML = `<div class="p-center">${tag(TEXT.whois.sent, 'surprise', 'sent')}<div class="body muted" style="font-size:15px">${esc(TEXT.scales.wait)}</div></div>`;
          $('.tag', state).classList.add('pop');
        };
        this.store.get(this.code, `whois/${me.id}`).then((w) => { if (w?.a0 && w?.a1) lock(w); });
        btn.onclick = async () => {
          btn.disabled = true;
          const w = { a0: inputs[0].value.trim().slice(0, 80), a1: inputs[1].value.trim().slice(0, 80) };
          try { await this.store.set(this.code, `whois/${me.id}`, w); lock(w); }
          catch (e) { console.error(e); btn.disabled = false; }
        };
        return { node, update: () => {} };
      },

      /* ---------- Кто это: голосование ---------- */
      whois_vote(meta) {
        const step = meta.step || 0, order = meta.order || [], answerId = order[step] || '';
        const [author, qi] = answerId.split(':');
        const me = this.mine;
        const isAuthor = author === me.id;
        const node = this.frame({
          mid: tag(`${TEXT.whois.answer} ${step + 1} / ${order.length}`, 'surprise', 'a' + step),
          main: `<div class="p-q">${esc(WHOIS[Number(qi) || 0])}</div>
            <div class="card p-answer-card"><span class="quote">“</span><div class="display answer-text">…</div></div>
            <div class="vote-area"></div>`,
          bottom: isAuthor ? '' : `<button class="btn block vote" disabled>${esc(TEXT.whois.vote)}</button>`,
        });
        const area = $('.vote-area', node), btn = $('.vote', node);
        this.store.get(this.code, `whois/${author}/a${qi}`).then((t) => { $('.answer-text', node).textContent = t || '…'; });
        if (isAuthor) {
          area.innerHTML = `<div class="p-center" style="margin-top:12px">${catSticker(me.cat, { size: 140, key: me.id, pop: 0 })}${hand(TEXT.whois.yours, -3)}</div>`;
          return { node, update: () => {} };
        }
        let picked = null, voted = null;
        const renderGrid = () => {
          const others = sortedPlayers(this.players).filter((p) => p.id !== me.id);
          area.innerHTML = `<h2 class="display sm" style="margin:4px 0 12px">${TEXT.whois.whose}</h2><div class="vote-grid ${picked ? 'has-pick' : ''}">
            ${others.map((p) => `<button type="button" class="vote-tile ${picked === p.id ? 'picked' : ''}" data-pid="${esc(p.id)}" ${voted ? 'disabled' : ''}>${catSticker(p.cat, { size: 72, key: 'v' + p.id })}<span class="nm">${esc(p.name)}</span></button>`).join('')}
          </div>${voted ? `<div class="p-center" style="margin-top:18px">${tag(TEXT.whois.voted, 'surprise', 'voted' + step)}</div>` : ''}`;
          if (btn) btn.disabled = !picked || !!voted;
        };
        area.addEventListener('click', (e) => {
          const t = e.target.closest('.vote-tile');
          if (!t || voted) return;
          picked = picked === t.dataset.pid ? null : t.dataset.pid;
          renderGrid();
        });
        renderGrid();
        this.store.get(this.code, `votes/${answerId}/${me.id}`).then((v) => { if (v) { voted = v; picked = v; renderGrid(); btn?.classList.add('hidden'); } });
        if (btn) btn.onclick = async () => {
          if (!picked) return;
          btn.disabled = true;
          try { await this.store.set(this.code, `votes/${answerId}/${me.id}`, picked); voted = picked; renderGrid(); btn.classList.add('hidden'); }
          catch (e) { console.error(e); btn.disabled = false; }
        };
        return { node, update: renderGrid };
      },

      /* ---------- Кто это: раскрытие ---------- */
      whois_reveal(meta) {
        const step = meta.step || 0, order = meta.order || [], answerId = order[step] || '';
        const [author] = answerId.split(':');
        const me = this.mine;
        const isAuthor = author === me.id;
        const ap = this.players?.[author] ? { id: author, ...this.players[author] } : { id: author, name: '?', cat: 'face' };
        const node = this.frame({
          mid: tag(`${TEXT.whois.answer} ${step + 1} / ${order.length}`, 'surprise', 'a' + step),
          main: `<div class="p-center" style="margin-top:0">
            <span class="label muted">${TEXT.whois.author}</span>
            <div class="avatar pop" style="--i:0">${catSticker(ap.cat, { size: 160, key: ap.id, splash: 'burst', idle: true })}<div class="name" style="font-family:var(--font-display);font-size:28px;font-weight:400;text-transform:uppercase;max-width:none">${esc(ap.name)}</div></div>
            <div class="result" style="min-height:40px"></div>
            ${this.xpBlock(me.xp || 0)}
          </div>`,
          bottom: '',
        });
        const result = $('.result', node);
        this.store.get(this.code, `votes/${answerId}`).then((votes) => {
          votes = votes || {};
          const correct = Object.entries(votes).filter(([, v]) => v === author).length;
          if (isAuthor) {
            const undet = correct === 0 && Object.keys(votes).length > 0;
            result.innerHTML = undet
              ? `${tag(`${TEXT.whois.undetectable} +20 XP`, 'surprise', 'u' + step, 'pop')}<div class="body" style="margin-top:10px">${esc(TEXT.whois.nobodyGuessed)}</div>`
              : `<div class="body">${esc(TEXT.whois.guessedBy(correct))}</div>`;
          } else {
            const my = votes[me.id];
            if (!my) result.innerHTML = `<div class="body muted">${esc(TEXT.whois.nope)}</div>`;
            else if (my === author) result.innerHTML = `${tag('+10 XP', 'lime', 'ok' + step, 'pop')}<div class="body" style="margin-top:10px">${esc(TEXT.whois.guessed)}</div>`;
            else result.innerHTML = `${tag('NOPE', 'coral', 'no' + step, 'pop')}<div class="body" style="margin-top:10px">${esc(TEXT.whois.nope)}</div>`;
          }
        });
        if (!reduced() && (this.displayedXp ?? 0) < (me.xp || 0)) setTimeout(() => confetti(16), 200);
        const update = () => { const m = this.mine; if (m) this.syncXp(node, m.xp || 0, isAuthor ? 'yellow' : 'lime'); };
        setTimeout(update, 350);
        return { node, update };
      },

      /* ---------- Инструкция ---------- */
      manual_input() {
        const me = this.mine;
        const node = this.frame({
          mid: tag('FINAL ROUND', 'surprise', 'final'),
          main: `<h1 class="display sm">${TEXT.manual.title}</h1>
            ${hand(TEXT.manual.tagline, -2, 'align-self:flex-start')}
            <div class="p-fields">
              ${MANUAL.map((m) => `<label class="field"><span class="body" style="font-weight:600">${esc(m.label)}</span><input class="input f" data-k="${m.key}" maxlength="120" autocomplete="off"></label>`).join('')}
              <div class="state"></div>
            </div>`,
          bottom: `<button class="btn block save" disabled>${esc(TEXT.manual.save)}</button>`,
        });
        const inputs = [...node.querySelectorAll('.f')], btn = $('.save', node), state = $('.state', node);
        const check = () => { btn.disabled = !inputs.every((i) => i.value.trim()); };
        inputs.forEach((i) => i.addEventListener('input', check));
        const lock = (m) => {
          inputs.forEach((inp) => { inp.value = m[inp.dataset.k] || ''; inp.disabled = true; });
          btn.classList.add('hidden');
          state.innerHTML = `<div class="p-center">${tag(TEXT.manual.saved, 'surprise', 'saved')}<div class="body muted" style="font-size:15px">${esc(TEXT.scales.wait)}</div></div>`;
          $('.tag', state).classList.add('pop');
        };
        this.store.get(this.code, `manual/${me.id}`).then((m) => { if (m) lock(m); });
        btn.onclick = async () => {
          btn.disabled = true;
          const m = Object.fromEntries(inputs.map((i) => [i.dataset.k, i.value.trim().slice(0, 120)]));
          try { await this.store.set(this.code, `manual/${me.id}`, m); lock(m); }
          catch (e) { console.error(e); btn.disabled = false; }
        };
        this.displayedXp = me.xp || 0;
        return { node, update: () => {} };
      },

      /* ---------- Галерея ---------- */
      gallery() {
        const me = this.mine;
        const node = this.frame({
          mid: tag('GALLERY', 'surprise', 'gal'),
          main: `<div class="p-gallery"><div class="mcard-slot"></div></div>
            <p class="body" style="margin:8px 0 0;text-align:center">${esc(TEXT.gallery.stays)}</p>`,
          bottom: `<a class="btn block" target="_blank" rel="noopener" href="${esc(roomUrl(this.code, '&gallery'))}">${esc(TEXT.gallery.open)}</a>`,
        });
        this.store.get(this.code, `manual/${me.id}`).then((m) => { $('.mcard-slot', node).innerHTML = manualCard(me, m, { rot: -1.5, key: me.id }); });
        return { node, update: () => {} };
      },

      /* ---------- Финал ---------- */
      end() {
        const me = this.mine;
        const ranked = sortedPlayers(this.players).sort((a, b) => (b.xp || 0) - (a.xp || 0));
        const place = ranked.findIndex((p) => p.id === me.id) + 1;
        const node = this.frame({
          mid: tag('GAME OVER', 'surprise', 'over'),
          main: `<div class="p-center">
            ${doodle('crown', 'right:-4px;top:-58px;width:56px;height:50px', 'surprise')}
            <h1 class="display">${TEXT.end.title}</h1>
            <div class="avatar pop">${catSticker(me.cat, { size: 150, key: me.id, splash: 'blob', idle: true })}${tag(`${TEXT.end.chaos}: ${place === 1 ? 100 : pick('chaos' + me.id, 60, 99)}%`, place === 1 ? 'surprise' : 'lavender', 'chaos' + me.id)}</div>
            <div class="xp-big">${me.xp || 0} XP</div>
            <div class="body">Место ${place} из ${ranked.length}</div>
            ${hand(TEXT.end.goodIdea, -3)}
          </div>`,
          bottom: `<a class="btn block" target="_blank" rel="noopener" href="${esc(roomUrl(this.code, '&gallery'))}">${esc(TEXT.gallery.open)}</a>`,
        });
        setTimeout(() => confetti(), 300);
        return { node, update: () => {} };
      },
    };
  }
}

/* ============================================================
   Галерея по прямой ссылке
   ============================================================ */

async function renderGalleryPage(store, code) {
  setAccent('gallery');
  const root = $('#gallery-root');
  root.innerHTML = `<div class="head"><span class="label">${TEXT.title}</span><h1 class="display">…</h1></div>`;
  const room = await store.get(code, '');
  const players = sortedPlayers(room?.players);
  root.innerHTML = `
    <div class="head">
      <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap"><span class="label">${TEXT.title}</span>${tag(TEXT.gallery.pageTag, 'yellow', 'teamtag')}</div>
      <h1 class="display">${TEXT.gallery.pageTitle}</h1>
      ${hand(TEXT.gallery.sureWhyNot, -3, 'align-self:start')}
    </div>
    ${players.length
      ? `<div class="grid">${players.map((p) => manualCard(p, room.manual?.[p.id], { rot: tiltFor('gp' + p.id, 2) })).join('')}</div>`
      : `<p class="body">${esc(TEXT.gallery.empty)}</p>`}
    <div class="foot">Комната ${esc(code)}</div>`;
}

/* ============================================================
   Пустой адрес
   ============================================================ */

function renderIndex() {
  setAccent('lobby');
  $('#index-root').innerHTML = `<div class="inner">
    ${doodle('star', 'right:-30px;top:-30px;width:56px;height:56px', 'surprise')}
    <h1 class="display">${TEXT.title}</h1>
    ${hand(TEXT.lobby.tagline, -3)}
    <p class="body">Ведущий открывает <code>?host</code>, участники заходят по ссылке или QR с экрана.</p>
    <a class="btn" href="?host">Я ведущий</a>
  </div>`;
}

/* ============================================================
   Сеть
   ============================================================ */

function watchConnection(store) {
  const banner = $('#net-banner');
  let ready = false;
  store.onConnected?.((ok) => {
    if (ok) ready = true;
    banner.textContent = TEXT.offline;
    banner.classList.toggle('hidden', ok || !ready);
  });
}

/* ============================================================
   Роутинг
   ============================================================ */

async function main() {
  const params = new URLSearchParams(location.search);
  const demo = params.has('demo');
  if (params.has('still')) document.documentElement.classList.add('still');
  const isHost = params.has('host');
  const code = (params.get('room') || '').toUpperCase();
  const isGallery = params.has('gallery');

  const show = (name) => {
    for (const s of document.querySelectorAll('[data-screen]')) s.classList.toggle('hidden', s.dataset.screen !== name);
  };

  // Пока грузится SDK, страница не должна быть пустой
  show('index');
  $('#index-root').innerHTML = `<div class="inner"><span class="label">${TEXT.title}</span><p class="body muted">Загружаю…</p></div>`;

  let store;
  try {
    store = demo ? (await import('./demo.js?v=3')).createDemoStore(params) : await createFirebaseStore();
  } catch (e) {
    console.error(e);
    show('index');
    $('#index-root').innerHTML = `<div class="inner"><h1 class="display">ОШИБКА</h1><p class="body">Не удалось подключиться к базе. Проверь <code>config.js</code> и консоль браузера.</p><pre style="white-space:pre-wrap;font-size:13px;text-align:left">${esc(e.message || e)}</pre></div>`;
    return;
  }
  if (!demo) watchConnection(store);

  if (isHost) {
    show('host');
    const host = new Host(store, { demo });
    window.tdie = { host, store };
    await host.start();
  } else if (isGallery && isValidCode(code)) {
    show('gallery');
    await renderGalleryPage(store, code);
  } else if (isValidCode(code)) {
    show('player');
    const player = new Player(store, code, { demo });
    window.tdie = { player, store };
    player.start();
  } else {
    show('index');
    renderIndex();
  }
}

main();
