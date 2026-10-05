// Тексты игры. Формулировки согласованы, не менять без Ханны.

export const SCALES = [
  { q: 'Будильник', left: 'Встаю с первого', right: 'Пять раз «еще 5 минут»' },
  { q: 'Свободная суббота', left: 'Выставка, кафе, город', right: 'Лес, горы, без связи' },
  { q: 'Еда в путешествии', left: 'Ищу знакомое', right: 'Самое странное местное' },
  { q: 'Машина времени', left: 'В прошлое', right: 'В будущее' },
  { q: 'Чемодан в отпуск', left: 'За неделю, по списку', right: 'За час до выезда' },
];

export const WHOIS = [
  'Песня, которую я знаю наизусть целиком',
  'Могу 30 минут без остановки рассказывать про…',
];

export const MANUAL = [
  { key: 'good', label: 'Больше всего в работе меня заряжает…' },
  { key: 'dnd',  label: 'Лайфхак по общению со мной:' },
  { key: 'ask',  label: 'Меня можно смело спрашивать про…' },
];

export const CATS = [
  // Фото-коты из коллажа Ханны (assets/cats/photo_*.png). Подпись уже нарисована на стикере (baked),
  // поэтому отдельный лейбл под котом не показываем. label нужен для alt и списка.
  { id: 'smirk',  file: 'photo_smirk.png',  emoji: '😼', label: 'INTERESTING...', baked: true },
  { id: 'grin',   file: 'photo_grin.png',   emoji: '😸', label: 'TEAM LEARNING MODE: ON', baked: true },
  { id: 'joy',    file: 'photo_joy.png',    emoji: '😹', label: 'STRETCH & LEARN', baked: true },
  { id: 'scream', file: 'photo_scream.png', emoji: '🙀', label: 'WAIT... WHAT?', baked: true },
  { id: 'cry',    file: 'photo_cry.png',    emoji: '😿', label: 'MONDAY ENERGY', baked: true },
  { id: 'pout',   file: 'photo_pout.png',   emoji: '😾', label: 'THINK OUTSIDE THE BOX', baked: true },
  { id: 'love',   file: 'photo_love.png',   emoji: '😻', label: 'HIGH FIVE!', baked: true },
  { id: 'smile',  file: 'photo_smile.png',  emoji: '😺', label: 'GOOD VIBES', baked: true },
  { id: 'kiss',   file: 'photo_kiss.png',   emoji: '😽', label: 'TEAM POWER', baked: true },
  { id: 'face',   file: 'photo_face.png',   emoji: '🐱', label: 'YOU GOT THIS', baked: true },
  { id: 'run',    file: 'photo_run.png',    emoji: '🐈', label: "LET'S GO!", baked: true },
  { id: 'black',  file: 'photo_black.png',  emoji: '🐈‍⬛', label: 'TO THE NEXT LEVEL', baked: true },
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
  brand: 'T&D TEAM ENERGY',          // мелкая подпись сверху на всех экранах
  title: 'СВОИ КОТЫ',                // название игры, большой заголовок лобби
  titleLines: ['СВОИ', 'КОТЫ'],      // то же, построчно для лобби ведущего
  lobby: {
    tagline: '',   // рукописной фразы в лобби нет
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
    yours: 'это твой ответ. жди, пока угадают',
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
    tagline: '',   // рукописной фразы на этом экране нет
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
    sureWhyNot: 'шпаргалка по команде',
  },
  end: {
    title: 'ТЕПЕРЬ ТОЧНО СВОИ',
    // Титулы в финале: каждому свой, без мест и очков. Порядок сдвигается по коду комнаты.
    titles: ['T&D LEGEND', 'EMERGING LOVE', 'CHIEF VIBE OFFICER', 'HEAD OF GOOD IDEAS', 'TEAM ENERGY SOURCE', 'OFFICIALLY ONE OF US', 'CERTIFIED TEAMMATE', 'LEARNING MODE: ON'],
    thanks: 'Спасибо, командушка',
    gallery: 'Галерея',
    goodIdea: 'спасибо, командушка',
  },
  offline: 'Нет связи, переподключаюсь',
  next: 'Дальше',
};
