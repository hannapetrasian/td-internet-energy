// Демо-режим без сети: ?host&demo, ?room=TEST&demo, ?room=TEST&gallery&demo
// Фиктивная комната с пятью игроками. Стрелка → двигает фазы, ← возвращает.
// Можно открыть сразу нужную фазу: ?host&demo&phase=whois_reveal&step=3

import { computeNext } from './app.js?v=3';
import { SCALES } from './content.js?v=3';

const PLAYERS = {
  p1: { name: 'Наташа', cat: 'grin',   joinedAt: 1, xp: 0 },
  p2: { name: 'Глеб',   cat: 'smirk',  joinedAt: 2, xp: 0 },
  p3: { name: 'Юля',    cat: 'love',   joinedAt: 3, xp: 0 },
  p4: { name: 'Ася',    cat: 'scream', joinedAt: 4, xp: 0 },
  p5: { name: 'Ханна',  cat: 'black',  joinedAt: 5, xp: 0 },
};

const SCALE_VALUES = [
  { p1: 12, p2: 88, p3: 55, p4: 60, p5: 34 },
  { p1: 5,  p2: 97, p3: 70, p4: 20, p5: 91 },
  { p1: 40, p2: 44, p3: 95, p4: 10, p5: 48 },
  { p1: 30, p2: 100, p3: 80, p4: 85, p5: 60 },
  { p1: 15, p2: 90, p3: 50, p4: 92, p5: 75 },
];

const WHOIS_ANSWERS = {
  p1: { a0: 'Как выжить на созвоне без камеры', a1: 'Синхронное молчание' },
  p2: { a0: 'Переговоры с кофемашиной', a1: 'Спринт до закрывающихся дверей метро' },
  p3: { a0: 'Искусство вежливого «нет»', a1: 'Фигурное откладывание' },
  p4: { a0: 'Введение в чужие гугл-доки', a1: 'Прыжки с выводами' },
  p5: { a0: 'Как делать вид, что всё под контролем', a1: 'Метание дедлайнов' },
};

const MANUAL_ANSWERS = {
  p1: { good: 'есть план и чай', ask: 'Rise, шаблоны и как не сойти с ума', dnd: 'наушники и статус «фокус»' },
  p2: { good: 'задача описана одним абзацем', ask: 'таблицы, формулы, автоматизацию', dnd: 'отвечаю односложно' },
  p3: { good: 'можно спорить без обид', ask: 'вебинары и как держать аудиторию', dnd: 'выключенная камера' },
  p4: { good: 'мне говорят контекст, а не только задачу', ask: 'всё, я новенькая и мне всё интересно', dnd: 'пишу «отвечу позже» и правда отвечаю' },
  p5: { good: 'мы договорились о сроках вслух', ask: 'менторство, онбординг, курсы', dnd: 'статус в Slack: «пишу»' },
};

function makeVotes(order) {
  const votes = {};
  const ids = Object.keys(PLAYERS);
  order.forEach((answerId, idx) => {
    const author = answerId.split(':')[0];
    votes[answerId] = {};
    ids.filter((id) => id !== author).forEach((voter, j) => {
      // часть угадывает, часть нет; в одном раунде никто не угадывает
      const others = ids.filter((id) => id !== voter && id !== author);
      const guessRight = idx % 4 !== 3 && (j + idx) % 2 === 0;
      votes[answerId][voter] = guessRight ? author : others[(j + idx) % others.length];
    });
  });
  return votes;
}

const PHASES = ['lobby', 'scales', 'whois_input', 'whois_vote', 'whois_reveal', 'manual_input', 'gallery', 'end'];

export function createDemoStore(params) {
  const code = 'TEST';
  const phase = PHASES.includes(params.get('phase')) ? params.get('phase') : 'lobby';
  const step = Number(params.get('step') || 0);
  const order = ['p3:1', 'p1:0', 'p5:1', 'p2:0', 'p4:1', 'p1:1', 'p5:0', 'p3:0', 'p2:1', 'p4:0'];
  const atOrPast = (ph) => PHASES.indexOf(phase) >= PHASES.indexOf(ph);

  const room = {
    meta: { createdAt: 1, hostToken: 'demo', phase, step, shown: phase === 'scales' ? params.get('shown') !== '0' : null, order: atOrPast('whois_vote') ? order : null },
    players: JSON.parse(JSON.stringify(PLAYERS)),
    scales: {},
    whois: atOrPast('whois_input') ? WHOIS_ANSWERS : {},
    votes: atOrPast('whois_vote') ? makeVotes(order) : {},
    manual: atOrPast('manual_input') ? MANUAL_ANSWERS : {},
  };
  // Шкалы: заполнены все пройденные, текущая — частично, если ещё не показана
  const lastScale = phase === 'scales' ? step : (atOrPast('whois_input') ? SCALES.length - 1 : -1);
  for (let i = 0; i <= lastScale; i++) {
    room.scales[i] = { ...SCALE_VALUES[i] };
    if (phase === 'scales' && i === step && !room.meta.shown) { delete room.scales[i].p4; delete room.scales[i].p2; }
  }
  // XP за уже раскрытые ответы
  if (atOrPast('whois_reveal')) {
    const upto = phase === 'whois_reveal' ? step : (phase === 'whois_vote' ? step - 1 : order.length - 1);
    for (let i = 0; i <= upto; i++) {
      const author = order[i].split(':')[0];
      let any = false;
      for (const [voter, votedFor] of Object.entries(room.votes[order[i]])) if (votedFor === author) { any = true; room.players[voter].xp += 10; }
      if (!any) room.players[author].xp += 20;
    }
  }
  // В голосовании текущего раунда ещё не все проголосовали
  if (phase === 'whois_vote' && room.votes[order[step]]) {
    const v = room.votes[order[step]];
    const voters = Object.keys(v);
    if (voters.length > 1) delete v[voters[voters.length - 1]];
  }

  // Участник демо — Ася (p4), если ещё не вошла. &fresh — экран входа заново.
  if (params.has('fresh')) localStorage.removeItem(`tdie.player.${code}`);
  if (!params.has('host') && !params.has('fresh') && !localStorage.getItem(`tdie.player.${code}`)) {
    localStorage.setItem(`tdie.player.${code}`, JSON.stringify({ playerId: 'p4', name: 'Ася', cat: 'scream' }));
  }

  const subs = [];
  const history = [];
  const getPath = (path) => path.split('/').filter(Boolean).reduce((o, k) => (o == null ? undefined : o[k]), room);
  const setPath = (path, value) => {
    const keys = path.split('/').filter(Boolean);
    if (!keys.length) { Object.assign(room, value); return; }
    let o = room;
    for (const k of keys.slice(0, -1)) { if (o[k] == null || typeof o[k] !== 'object') o[k] = {}; o = o[k]; }
    const last = keys[keys.length - 1];
    if (value === null || value === undefined) delete o[last]; else o[last] = value;
  };
  const clone = (v) => (v === undefined ? null : JSON.parse(JSON.stringify(v)));
  const notify = () => subs.forEach((s) => s.cb(clone(getPath(s.path))));

  const store = {
    demoCode: code,
    subscribe(_code, path, cb) {
      const s = { path, cb };
      subs.push(s);
      setTimeout(() => cb(clone(getPath(path))), 0);
      return () => { const i = subs.indexOf(s); if (i >= 0) subs.splice(i, 1); };
    },
    async get(_code, path) { await new Promise((r) => setTimeout(r, 30)); return clone(getPath(path)); },
    async set(_code, path, value) { setPath(path, value); notify(); },
    async update(_code, updates) { for (const [p, v] of Object.entries(updates)) setPath(p, v); notify(); },
    ts: () => Date.now(),
    onConnected(cb) { cb(true); },
    demoNext() {
      history.push(clone(room));
      const u = computeNext(room);
      if (!u) return;
      // дозаполняем фиктивные ответы, чтобы каждая фаза выглядела «по-живому»
      const ph = u['meta/phase'] || room.meta.phase, st = u['meta/step'] ?? room.meta.step;
      if (ph === 'scales') {
        const shown = u['meta/shown'] === true;
        const vals = SCALE_VALUES[st] || {};
        room.scales[st] = shown ? { ...vals } : Object.fromEntries(Object.entries(vals).slice(0, 3));
      }
      if (ph === 'whois_input') room.whois = WHOIS_ANSWERS;
      if (ph === 'whois_vote') {
        const ord = u['meta/order'] || room.meta.order;
        const all = makeVotes(ord);
        const v = { ...all[ord[st]] };
        const ks = Object.keys(v); if (ks.length > 1) delete v[ks[ks.length - 1]];
        room.votes[ord[st]] = v;
      }
      if (ph === 'manual_input') room.manual = MANUAL_ANSWERS;
      store.update(code, u);
    },
    demoPrev() {
      const prev = history.pop();
      if (!prev) return;
      for (const k of Object.keys(room)) delete room[k];
      Object.assign(room, prev);
      notify();
    },
  };
  return store;
}
