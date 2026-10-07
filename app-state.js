// ======================== ДАННЫЕ ========================

function isCompleteDateInputValue(value) {
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    return false;
  }

  const [year, month, day] = value
    .split('-')
    .map(Number);
  const date = new Date(year, month - 1, day);

  return date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day;
}

function syncDateInputRangeLimits(fromInput, toInput) {
  if (!fromInput || !toInput) {
    return;
  }

  const fromValue = fromInput.value;
  const toValue = toInput.value;

  if (
    (fromValue && !isCompleteDateInputValue(fromValue)) ||
    (toValue && !isCompleteDateInputValue(toValue))
  ) {
    return;
  }

  toInput.min = isCompleteDateInputValue(fromValue)
    ? fromValue
    : '';
  fromInput.max = isCompleteDateInputValue(toValue)
    ? toValue
    : '';
}

// Список рабочих постов на участке (14 постов)
let posts = [
  "Пост 5 Установка панорамной крыши на кузов справа",
  "Пост 10 Установка панорамной крыши на кузов слева",
  "Пост 25 Установка трубок кондиционера",
  "Пост 35 Установка потолка справа",
  "Пост 40 Установка потолка слева",
  "Пост 50 Установка амортизатора слева",
  "Пост 55 Установка амортизатора справа",
  "Пост 70 Установка стёкол слева",
  "Пост 75 Установка стёкол справа",
  "Пост 95 Подсборка торпеды",
  "Пост 97 Распаковка торпеды",
  "Пост 105 Подсборка потолка",
  "Пост 115 Подсборка стёкол",
  "Пост ПН мастики"
];

// Список операторов на участке (19 человек)
let operators = [
  "Красноусов И.", "Коваленко Ю.", "Абашин А.", "Фролова М.", "Харитонов В.",
  "Вишняков А.", "Исаев Г.", "Куликов К.", "Цуканов И.", "Романов А.",
  "Бортников С.", "Копин А.", "Ордин А.", "Грачёв Д.", "Нуралиев А.",
  "Кожемякин Д.", "Самбуров И.", "Фролова А.", "Сайидов Р."
];

// Сложность каждого поста: A (красный), B (жёлтый), C (зелёный). По умолчанию C.
let difficulty = [
  'B', 'B', 'A', 'B', 'A', 'B', 'B',
  'B', 'B', 'C', 'C', 'B', 'C', 'C'
];

// Эргономика каждого поста: red, yellow, green. По умолчанию green.
let ergonomics = [
  'yellow', 'yellow', 'yellow', 'red', 'red',
  'yellow', 'yellow', 'green', 'green', 'green',
  'yellow', 'green', 'yellow', 'green'
];

// Срок обучения до I (дни) для каждого поста
let trainingDays = [
  5, 5, 8, 5, 8, 5, 5,
  5, 5, 5, 3, 5, 3, 3
];

// Статус оператора на каждом посту:
// '' — пусто, '○' — стоит, '△' — обучается.
let attendanceData = Array.from(
  { length: posts.length },
  () => new Array(operators.length).fill('')
);

// Статус явки каждого оператора на сегодня:
// Я, Н, Б, О, С, У.
// Изначально у всех «Явка».
let operatorAttendance = new Array(19).fill('Я');

// Должности операторов:
// НУ — начальник участка,
// СО — старший оператор,
// О — оператор,
// Ф — форматор.
let operatorRoles = [
  'НУ', 'СО',
  'Ф', 'Ф', 'Ф',
  'О', 'О', 'О', 'О', 'О', 'О', 'О', 'О', 'О',
  'О', 'О', 'О', 'О', 'О'
];

// Уровни владения постом:
// null, 'Iкр', 'I', 'Lкр', 'L', 'U'.
// Таблица посты × операторы.
let data = [
  // Пост 5
  [
    null, null, 'U', null, 'U', null, null, null, 'L',
    null, 'L', null, null, null, null, null, null, null, null
  ],

  // Пост 10
  [
    null, null, 'L', null, 'U', 'L', null, null, null,
    null, 'L', null, null, null, null, null, null, null, null
  ],

  // Пост 25
  [
    null, null, 'U', null, null, null, null, 'L', null,
    'L', null, null, null, null, null, null, null, null, null
  ],

  // Пост 35
  [
    null, 'U', null, null, null, null, null, 'L', 'L',
    null, null, null, null, null, null, null, null, null, null
  ],

  // Пост 40
  [
    null, 'U', null, null, 'U', null, null, 'Iкр', null,
    null, null, null, null, 'L', null, null, null, null, null
  ],

  // Пост 50
  [
    null, null, null, null, 'U', null, null, 'L', null,
    'L', null, null, null, 'L', null, 'L', null, null, null
  ],

  // Пост 55
  [
    null, null, null, null, 'U', null, null, 'L', 'L',
    'L', null, null, null, null, null, null, null, null, null
  ],

  // Пост 70
  [
    null, 'U', null, 'U', null, 'L', null, null, 'L',
    'I', null, null, 'L', null, null, null, null, null, null
  ],

  // Пост 75
  [
    null, 'U', null, null, null, 'L', null, null, 'L',
    null, null, null, 'Iкр', null, null, null, 'L', null, null
  ],

  // Пост 95
  [
    null, 'U', 'U', null, null, null, null, null, null,
    null, null, 'L', null, null, 'L', null, null, null, null
  ],

  // Пост 97
  [
    null, 'U', 'U', null, null, null, null, null, null,
    null, null, 'L', null, null, 'L', null, null, null, 'Iкр'
  ],

  // Пост 105
  [
    null, 'U', null, 'U', null, null, 'L', null, null,
    null, null, null, null, null, null, null, 'L', null, null
  ],

  // Пост 115
  [
    null, 'U', 'L', null, null, 'L', 'L', null, null,
    null, null, null, null, null, null, null, null, null, null
  ],

  // Пост ПН мастики
  [
    null, 'U', null, null, null, 'L', null, 'L', 'L',
    'L', null, null, null, null, null, null, null, null, null
  ]
];

// Журнал обучений
let trainingRecords = [];

// Фильтры журнала обучений
let trainingFilters = {
  year: [],
  month: [],
  startWeek: [],
  endWeek: [],
  post: [],
  op: [],
  level: [],
  status: [],
  formator: [],
  startDateFrom: '',
  startDateTo: '',
  validDateFrom: '',
  validDateTo: ''
};

let trainingFilterMenu = null;

// Журнал расстановки
let placementLog = [];

// История ежедневных показателей вкладки «Статистика»
let statsHistory = [];

// Состояние фильтров журнала расстановки
let placementFilters = {
  dateFrom: '',
  dateTo: '',
  operators: [],
  posts: []
};

let placementFilterMenu = null;

// Сортировка расстановки
let placementSort = {
  key: 'date',
  direction: 'desc'
};

// Вызов данных руководителей
let workshopChief = '';
let sectionChief = '';

// Вызов данных департамента, цеха, участка и смены
let filterState = {
  department: '',
  workshop: '',
  section: '',
  shift: ''
};

// Контекстное меню
let currentMenu = null;
