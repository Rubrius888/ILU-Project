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

function isCompleteRussianDateValue(value) {
  if (
    typeof value !== 'string' ||
    !/^\d{2}\.\d{2}\.\d{4}$/.test(value)
  ) {
    return false;
  }

  const [day, month, year] = value
    .split('.')
    .map(Number);
  const date = new Date(year, month - 1, day);

  return date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day;
}

function isValidDateInputElement(input, allowEmpty = true) {
  if (!input) {
    return false;
  }

  if (input.validity?.badInput) {
    return false;
  }

  if (!input.value) {
    return allowEmpty;
  }

  return isCompleteDateInputValue(input.value);
}

// Контролируемое поле даты: ручной ввод разбит на сегменты ДД / ММ / ГГГГ,
// а календарь остаётся нативным и синхронизируется с этими сегментами.
function createDateField({ value = '', label = 'Дата' } = {}) {
  const root = document.createElement('div');
  root.style.cssText = `
    position: relative;
    display: flex;
    align-items: center;
    gap: 4px;
    box-sizing: border-box;
    width: 100%;
  `;

  const createSegment = (placeholder, maxLength, width, segmentLabel) => {
    const input = document.createElement('input');
    input.type = 'text';
    input.inputMode = 'numeric';
    input.autocomplete = 'off';
    input.placeholder = placeholder;
    input.dataset.maxLength = String(maxLength);
    input.setAttribute('aria-label', `${label}: ${segmentLabel}`);
    input.style.cssText = `
      width: ${width}px;
      min-width: ${width}px;
      box-sizing: border-box;
      padding: 7px 4px;
      text-align: center;
    `;
    return input;
  };

  const dayInput = createSegment('ДД', 2, 42, 'день');
  const monthInput = createSegment('ММ', 2, 42, 'месяц');
  const yearInput = createSegment('ГГГГ', 4, 64, 'год');
  const calendarInput = document.createElement('input');
  const calendarButton = document.createElement('button');

  calendarInput.type = 'date';
  calendarInput.tabIndex = -1;
  calendarInput.setAttribute('aria-hidden', 'true');
  calendarInput.style.cssText = `
    position: absolute;
    width: 1px;
    height: 1px;
    opacity: 0;
    pointer-events: none;
  `;

  calendarButton.type = 'button';
  calendarButton.textContent = '📅';
  calendarButton.title = 'Выбрать дату в календаре';
  calendarButton.setAttribute('aria-label', `${label}: календарь`);
  calendarButton.style.cssText = `
    width: 36px;
    min-width: 36px;
    height: 32px;
    padding: 0;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    background: #ffffff;
    cursor: pointer;
  `;

  const separator = text => {
    const node = document.createElement('span');
    node.textContent = text;
    node.setAttribute('aria-hidden', 'true');
    node.style.color = '#64748b';
    return node;
  };

  root.append(
    dayInput,
    separator('.'),
    monthInput,
    separator('.'),
    yearInput,
    calendarButton,
    calendarInput
  );

  const listeners = [];

  const notify = () => {
    listeners.forEach(listener => listener());
  };

  const sanitizeSegment = input => {
    const digits = input.value.replace(/\D/g, '');
    const maxLength = Number(input.dataset.maxLength);
    input.dataset.overflow = digits.length > maxLength ? 'true' : 'false';
    input.value = digits.slice(0, maxLength);
  };

  const segments = [dayInput, monthInput, yearInput];

  segments.forEach((input, index) => {
    input.addEventListener('input', () => {
      sanitizeSegment(input);
      const iso = getValue();
      if (iso) calendarInput.value = iso;
      if (
        input.value.length === Number(input.dataset.maxLength) &&
        segments[index + 1]
      ) {
        segments[index + 1].focus();
      }
      notify();
    });
  });

  calendarInput.addEventListener('change', () => {
    setValue(calendarInput.value);
    notify();
  });

  calendarButton.addEventListener('click', () => {
    try {
      if (typeof calendarInput.showPicker === 'function') {
        calendarInput.showPicker();
        return;
      }
      calendarInput.click();
    } catch (error) {
      calendarInput.click();
    }
  });

  function getValue() {
    const day = dayInput.value;
    const month = monthInput.value;
    const year = yearInput.value;

    if (!day && !month && !year) return '';
    if (
      dayInput.dataset.overflow === 'true' ||
      monthInput.dataset.overflow === 'true' ||
      yearInput.dataset.overflow === 'true'
    ) {
      return null;
    }
    if (!/^\d{2}$/.test(day) || !/^\d{2}$/.test(month) || !/^\d{4}$/.test(year)) {
      return null;
    }

    const iso = `${year}-${month}-${day}`;
    return isCompleteDateInputValue(iso) ? iso : null;
  }

  function setValue(iso) {
    const normalized = isCompleteDateInputValue(iso) ? iso : '';
    const [year = '', month = '', day = ''] = normalized.split('-');
    dayInput.value = day;
    monthInput.value = month;
    yearInput.value = year;
    dayInput.dataset.overflow = 'false';
    monthInput.dataset.overflow = 'false';
    yearInput.dataset.overflow = 'false';
    calendarInput.value = normalized;
  }

  function setRange({ min = '', max = '' } = {}) {
    calendarInput.min = isCompleteDateInputValue(min) ? min : '';
    calendarInput.max = isCompleteDateInputValue(max) ? max : '';
  }

  function onChange(listener) {
    if (typeof listener === 'function') listeners.push(listener);
  }

  Object.defineProperty(root, 'value', {
    configurable: true,
    get: getValue,
    set: setValue
  });

  setValue(value);

  return {
    element: root,
    dayInput,
    monthInput,
    yearInput,
    calendarInput,
    calendarButton,
    getValue,
    setValue,
    setRange,
    onChange
  };
}

function isValidDateField(field, allowEmpty = true) {
  if (!field || typeof field.getValue !== 'function') return false;
  const value = field.getValue();
  return value === '' ? allowEmpty : Boolean(value);
}

function syncDateFieldRangeLimits(fromField, toField) {
  if (!fromField || !toField) return;
  const from = fromField.getValue();
  const to = toField.getValue();
  fromField.setRange({ max: to || '' });
  toField.setRange({ min: from || '' });
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

// Дата последней автоматической первичной расстановки.
let placementInitialPlacementDate = '';

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
