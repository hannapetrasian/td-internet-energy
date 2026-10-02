// Тексты игры. Формулировки согласованы, не менять без Ханны.

export const SCALES = [
  { q: 'Как ты отвечаешь в Slack?', left: 'Отвечаю «ок»', right: 'Абзац и три эмодзи' },
  { q: 'Что у тебя с почтой?', left: 'Inbox Zero', right: '4 812 непрочитанных' },
  { q: 'Голосовые сообщения', left: 'Норм, слушаю на 2x', right: 'Это преступление' },
  { q: 'Сколько вкладок открыто прямо сейчас?', left: 'Одна', right: '47, и все нужны' },
  { q: 'Новая программа. Что первое?', left: 'Читаю инструкцию', right: 'Жму все кнопки' },
];

export const WHOIS = [
  'Курс, который я могу вести, но которого нет ни в одном каталоге',
  'Олимпийский вид спорта, в котором у меня было бы золото',
];

export const MANUAL = [
  { key: 'good', label: 'Со мной хорошо работается, если…' },
  { key: 'ask',  label: 'Меня можно смело спрашивать про…' },
  { key: 'dnd',  label: 'Мой сигнал «сейчас не трогать» —' },
];

export const CATS = [
  { id: 'smirk',  file: 'emoji_u1f63c.svg',           emoji: '😼', label: 'INTERESTING...' },
  { id: 'grin',   file: 'emoji_u1f638.svg',           emoji: '😸', label: 'CONFIDENCE: UNREASONABLE' },
  { id: 'joy',    file: 'emoji_u1f639.svg',           emoji: '😹', label: 'NO REGRETS' },
  { id: 'scream', file: 'emoji_u1f640.svg',           emoji: '🙀', label: 'WHAT?!' },
  { id: 'cry',    file: 'emoji_u1f63f.svg',           emoji: '😿', label: "IT'S FINE..." },
  { id: 'pout',   file: 'emoji_u1f63e.svg',           emoji: '😾', label: "LET'S CIRCLE BACK" },
  { id: 'love',   file: 'emoji_u1f63b.svg',           emoji: '😻', label: 'TEAM SUPPORT' },
  { id: 'smile',  file: 'emoji_u1f63a.svg',           emoji: '😺', label: 'GOOD VIBES ONLY' },
  { id: 'kiss',   file: 'emoji_u1f63d.svg',           emoji: '😽', label: 'BE SERIOUS PLS' },
  { id: 'face',   file: 'emoji_u1f431.svg',           emoji: '🐱', label: 'STATUS: QUESTIONABLE' },
  { id: 'run',    file: 'emoji_u1f408.svg',           emoji: '🐈', label: 'ROCKET MODE' },
  { id: 'black',  file: 'emoji_u1f408_200d_2b1b.svg', emoji: '🐈‍⬛', label: 'CHAOS LEVEL: 87%' },
];

export const CAT_BY_ID = Object.fromEntries(CATS.map((c) => [c.id, c]));

export const MAX_PLAYERS = 5;

// Доминирующий акцент и акцент-сюрприз по фазам (раздел 3 спеки).
export const PHASE_ACCENT = {
  lobby:        ['cobalt', 'yellow'],
  scales:       ['lavender', 'lime'],
  whois_input:  ['cobalt', 'coral'],
  whois_vote:   ['cobalt', 'coral'],
  whois_reveal: ['coral', 'yellow'],
  manual_input: ['lime', 'cobalt'],
  gallery:      ['yellow', 'coral'],
  end:          ['yellow', 'coral'],
};

export const TEXT = {
  title: 'T&D INTERNET ENERGY',
  lobby: {
    tagline: 'same team, new level',
    inGame: 'В ИГРЕ',
    start: 'Начать',
    needTwo: 'Нужно хотя бы двое',
    create: 'Создать комнату',
    restoreLabel: 'Введи код комнаты, чтобы вернуться в режим ведущего',
    restore: 'Вернуться',
    pickCat: 'ВЫБЕРИ КОТА',
    nameLabel: 'Как тебя зовут',
    join: 'В игру',
    joined: 'ТЫ В ИГРЕ',
    lookUp: 'Смотри на большой экран',
    noPeek: 'не подглядывать',
    taken: 'TAKEN',
    gameOn: 'Игра уже идет. Заходи, догонишь',
  },
  scales: {
    answered: 'ОТВЕТИЛИ',
    show: 'Показать',
    next: 'Дальше',
    done: 'Готово',
    gotIt: 'GOT IT',
    noRight: 'правильных ответов нет',
    wait: 'Жди остальных и смотри на экран',
  },
  whois: {
    title: 'КТО ЭТО?',
    rules: ['Два вопроса.', 'Отвечай честно и коротко.', 'Потом все угадывают, кто что написал.'],
    send: 'Отправить',
    sent: 'SENT',
    answered: 'ОТВЕТИЛИ',
    answer: 'ОТВЕТ',
    whose: 'ЧЕЙ ЭТО ОТВЕТ?',
    vote: 'Голосую',
    voted: 'VOTED',
    votedCount: 'ПРОГОЛОСОВАЛИ',
    reveal: 'Раскрыть',
    yours: 'это твой ответ. сиди спокойно',
    author: 'АВТОР',
    tell: (name) => `${name}, 30 секунд: расскажи, откуда это`,
    guessed: 'Угадано!',
    nope: 'Мимо',
    undetectable: 'UNDETECTABLE',
    nobodyGuessed: 'Никто не угадал',
    guessedBy: (n) => `Угадали: ${n}`,
    yourXp: 'ТВОЙ XP',
    keepCalm: 'be serious pls',
  },
  manual: {
    title: 'ИНСТРУКЦИЯ ПО РАБОТЕ СО МНОЙ',
    tagline: 'честно, но дружелюбно',
    wrote: 'НАПИСАЛИ',
    save: 'Сохранить',
    saved: 'SAVED',
  },
  gallery: {
    approved: 'STATUS: APPROVED',
    stays: 'Галерея команды останется по ссылке',
    open: 'Открыть галерею',
    pageTitle: 'ИНСТРУКЦИЯ ПО РАБОТЕ СО МНОЙ',
    pageTag: 'TEAM T&D',
    empty: 'Пока пусто. Карточки появятся после игры.',
    sureWhyNot: 'sure, why not',
  },
  end: {
    title: 'SOMEHOW WE DID IT',
    chaos: 'CHAOS LEVEL',
    gallery: 'Галерея',
    goodIdea: 'this seemed like a good idea',
  },
  offline: 'Нет связи, переподключаюсь',
  next: 'Дальше',
};
