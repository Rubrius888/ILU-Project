function formatDateForInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function formatInputDateToRu(value) {
  if (!value) return '—';

  const parts = value.split('-');

  if (parts.length !== 3) {
    return '—';
  }

  return `${parts[2]}.${parts[1]}.${parts[0]}`;
}

function calculateTrainingDuration(startValue, endValue) {
  const start = new Date(`${startValue}T00:00:00`);
  const end = new Date(`${endValue}T00:00:00`);

  const difference = Math.round(
    (end - start) / (1000 * 60 * 60 * 24)
  );

  return Math.max(1, difference + 1);
}

function createTrainingOption(value, text) {
  const option = document.createElement('option');
  option.value = String(value);
  option.textContent = text;
  return option;
}

function openTrainingRecordForm(options = {}) {
  const automatic = options.automatic === true;

  const initialRow = Number.isInteger(options.row)
    ? options.row
    : 0;

  const initialCol = Number.isInteger(options.col)
    ? options.col
    : 0;

  const today = new Date();

  const overlay = document.createElement('div');

  overlay.style.cssText = `
    position: fixed;
    inset: 0;
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    background: rgba(15, 23, 42, 0.48);
  `;

  const modal = document.createElement('div');

  modal.style.cssText = `
    width: min(520px, calc(100vw - 32px));
    max-height: calc(100vh - 32px);
    overflow-y: auto;
    box-sizing: border-box;
    padding: 24px;
    border-radius: 12px;
    background: #ffffff;
    box-shadow: 0 20px 60px rgba(0,0,0,.28);
    font-family: Arial, sans-serif;
  `;

  const title = document.createElement('h3');

  title.textContent = automatic
    ? 'Добавление обучения из матрицы'
    : 'Добавление записи обучения';

  title.style.cssText = `
    margin: 0 0 20px;
    color: #0f172a;
  `;

  function createLabel(text) {
    const label = document.createElement('label');

    label.textContent = text;

    label.style.cssText = `
      display: block;
      margin-bottom: 6px;
      color: #334155;
      font-size: 13px;
      font-weight: 600;
    `;

    return label;
  }

  function applyFieldStyle(element) {
    element.style.cssText = `
      width: 100%;
      box-sizing: border-box;
      padding: 9px 10px;
      margin-bottom: 14px;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      color: #0f172a;
      background: #ffffff;
      font-size: 14px;
    `;
  }

  const operatorLabel = createLabel('Оператор');
  const operatorSelect = document.createElement('select');

  operators.forEach((operator, index) => {
    if (operatorRoles[index] === 'ДС') {
      return;
    }

    operatorSelect.appendChild(
      createTrainingOption(index, operator)
    );
  });

  operatorSelect.value = String(initialCol);
  operatorSelect.disabled = automatic;
  applyFieldStyle(operatorSelect);

  const postLabel = createLabel('Пост');
  const postSelect = document.createElement('select');

  posts.forEach((post, index) => {
    postSelect.appendChild(
      createTrainingOption(index, post)
    );
  });

  postSelect.value = String(initialRow);
  postSelect.disabled = automatic;
  applyFieldStyle(postSelect);

  const levelLabel = createLabel('Уровень обучения');
  const levelSelect = document.createElement('select');

  [
    ['Iкр', 'Iкр — обучается на I'],
    ['I', 'I — новичок'],
    ['Lкр', 'Lкр — обучается на L'],
    ['L', 'L — опытный'],
    ['U', 'U — мастер-форматор']
  ].forEach(([value, text]) => {
    levelSelect.appendChild(
      createTrainingOption(value, text)
    );
  });

  levelSelect.value = automatic
    ? (
        ['Iкр', 'Lкр'].includes(
          data[initialRow]?.[initialCol]
        )
          ? data[initialRow][initialCol]
          : 'Iкр'
      )
    : (
        data[initialRow]?.[initialCol] ||
        'Iкр'
      );

  levelSelect.disabled = automatic;
  applyFieldStyle(levelSelect);

  const statusLabel = createLabel('Статус обучения');
  const statusSelect = document.createElement('select');

  [
    ['План', 'План'],
    ['В процессе', 'В процессе'],
    ['Завершено', 'Завершено']
  ].forEach(([value, text]) => {
    statusSelect.appendChild(
      createTrainingOption(value, text)
    );
  });

  statusSelect.value = automatic
    ? 'В процессе'
    : 'План';

  applyFieldStyle(statusSelect);

  const formatorLabel = createLabel(
    'Форматор с уровнем U на выбранном посту'
  );

  const formatorSelect = document.createElement('select');
  applyFieldStyle(formatorSelect);

  const formatorHint = document.createElement('div');

  formatorHint.style.cssText = `
    margin: -7px 0 15px;
    color: #64748b;
    font-size: 12px;
  `;

  const startLabel = createLabel(
    'Дата начала обучения'
  );

  const startInput = document.createElement('input');
  startInput.type = 'date';
  startInput.value = formatDateForInput(today);
  applyFieldStyle(startInput);

  const endLabel = createLabel(
    'Дата окончания обучения'
  );

  const endInput = document.createElement('input');
  endInput.type = 'date';
  applyFieldStyle(endInput);

  const commentLabel = createLabel('Комментарий');

  const commentInput = document.createElement('textarea');

  commentInput.rows = 3;
  commentInput.placeholder =
    'Комментарий к обучению';

  applyFieldStyle(commentInput);
  commentInput.style.resize = 'vertical';

  function getSelectedPostIndex() {
    return parseInt(postSelect.value, 10);
  }

  function getSelectedOperatorIndex() {
    return parseInt(operatorSelect.value, 10);
  }

  function updateDefaultEndDate() {
    const postIndex = getSelectedPostIndex();

    const duration =
      parseInt(trainingDays[postIndex], 10) || 1;

    const startDate = startInput.value
      ? new Date(`${startInput.value}T00:00:00`)
      : new Date();

    const calculatedEndDate = new Date(startDate);

    calculatedEndDate.setDate(
      calculatedEndDate.getDate() + duration - 1
    );

    endInput.value =
      formatDateForInput(calculatedEndDate);

    endInput.min = startInput.value || '';
    startInput.max = endInput.value || '';
  }

  function updateFormatorList() {
    const postIndex = getSelectedPostIndex();
    const operatorIndex =
      getSelectedOperatorIndex();

    formatorSelect.innerHTML = '';

    const emptyOption = createTrainingOption(
      '',
      'Выберите форматора'
    );

    formatorSelect.appendChild(emptyOption);

    const formatorIndexes = [];

    for (
      let index = 0;
      index < operators.length;
      index++
    ) {
      if (index === operatorIndex) {
        continue;
      }

      if (
        operatorRoles[index] !== 'ДС' &&
        data[postIndex]?.[index] === 'U'
      ) {
        formatorIndexes.push(index);

        formatorSelect.appendChild(
          createTrainingOption(
            index,
            operators[index]
          )
        );
      }
    }

    if (formatorIndexes.length === 0) {
      emptyOption.textContent =
        'Нет операторов с уровнем U';

      formatorSelect.disabled = true;

      formatorHint.textContent =
        'На выбранном посту нет операторов с уровнем U.';
    } else {
      formatorSelect.disabled = false;

      formatorHint.textContent =
        'Показаны только операторы с уровнем U на выбранном посту.';
    }
  }

  function updateLevelFromMatrix() {
    if (automatic) return;

    const postIndex = getSelectedPostIndex();
    const operatorIndex =
      getSelectedOperatorIndex();

    const matrixLevel =
      data[postIndex]?.[operatorIndex];

    levelSelect.value = [
      'Iкр',
      'I',
      'Lкр',
      'L',
      'U'
    ].includes(matrixLevel)
      ? matrixLevel
      : 'Iкр';
  }

  postSelect.addEventListener('change', () => {
    updateLevelFromMatrix();
    updateFormatorList();
    updateDefaultEndDate();
  });

  operatorSelect.addEventListener(
    'change',
    () => {
      updateLevelFromMatrix();
      updateFormatorList();
    }
  );

  startInput.addEventListener(
    'change',
    updateDefaultEndDate
  );

  endInput.addEventListener('change', () => {
    endInput.min = startInput.value || '';
    startInput.max = endInput.value || '';
  });

  updateFormatorList();
  updateDefaultEndDate();

  const buttons = document.createElement('div');

  buttons.style.cssText = `
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 6px;
  `;

  const cancelButton =
    document.createElement('button');

  cancelButton.type = 'button';
  cancelButton.textContent = 'Отмена';

  cancelButton.style.cssText = `
    padding: 9px 16px;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    background: #ffffff;
    cursor: pointer;
  `;

  const saveButton =
    document.createElement('button');

  saveButton.type = 'button';
  saveButton.textContent = 'Сохранить обучение';

  saveButton.style.cssText = `
    padding: 9px 16px;
    border: 0;
    border-radius: 6px;
    color: #ffffff;
    background: #2563eb;
    cursor: pointer;
  `;

  cancelButton.onclick = () => {
    overlay.remove();

    /*
     * Если форма была открыта через треугольник,
     * отменяем постановку треугольника.
     */
    if (automatic) {
      attendanceData[initialRow][initialCol] = '';
      renderMatrix();
    }
  };

  saveButton.onclick = () => {
    const postIndex = getSelectedPostIndex();
    const operatorIndex =
      getSelectedOperatorIndex();

    if (
      !Number.isInteger(postIndex) ||
      !posts[postIndex]
    ) {
      alert('Выберите пост.');
      return;
    }

    if (
      !Number.isInteger(operatorIndex) ||
      !operators[operatorIndex]
    ) {
      alert('Выберите оператора.');
      return;
    }

    if (!startInput.value || !endInput.value) {
      alert(
        'Выберите даты начала и окончания обучения.'
      );
      return;
    }

    if (endInput.value < startInput.value) {
      alert(
        'Дата окончания не может быть раньше даты начала.'
      );
      return;
    }

    if (
      !formatorSelect.disabled &&
      !formatorSelect.value
    ) {
      alert('Выберите форматора.');
      return;
    }

    const selectedOperator =
      operators[operatorIndex];

    const selectedPost =
      posts[postIndex];

    const formator = formatorSelect.value
      ? operators[
          parseInt(formatorSelect.value, 10)
        ]
      : '—';

    const startDateObject = new Date(
      `${startInput.value}T00:00:00`
    );

    const endDateObject = new Date(
      `${endInput.value}T00:00:00`
    );

    // Переносим выбранный перспективный уровень
    // в матрицу ILU.
    data[postIndex][operatorIndex] =
      levelSelect.value;

    // Для автоматического обучения через △
    if (automatic) {
      attendanceData[postIndex][operatorIndex] = '△';
    }

    const record = {
      year: startDateObject.getFullYear(),

      month: startDateObject.toLocaleString(
        'ru-RU',
        { month: 'long' }
      ),

      startWeek:
        getWeekNumber(startDateObject),

      endWeek:
        getWeekNumber(endDateObject),

      post: selectedPost,
      op: selectedOperator,
      level: levelSelect.value,
      status: statusSelect.value,
      formator,

      startDate:
        formatInputDateToRu(startInput.value),

      validDate:
        formatInputDateToRu(endInput.value),

      duration: calculateTrainingDuration(
        startInput.value,
        endInput.value
      ),

      comment:
        commentInput.value.trim() || '—',

      autoFromMatrix: automatic
    };

    /*
     * Автоматическую запись обновляем,
     * чтобы повторный выбор треугольника
     * не создавал дубликаты.
     */
    if (automatic) {
      const existingIndex =
        trainingRecords.findIndex(item =>
          item.autoFromMatrix === true &&
          item.post === selectedPost &&
          item.op === selectedOperator
        );

      if (existingIndex >= 0) {
        trainingRecords[existingIndex] = record;
      } else {
        trainingRecords.push(record);
      }
    } else {
      trainingRecords.push(record);
    }

    overlay.remove();

    renderTrainingTable();
    renderMatrix();
  };

  buttons.appendChild(cancelButton);
  buttons.appendChild(saveButton);

  modal.appendChild(title);
  modal.appendChild(operatorLabel);
  modal.appendChild(operatorSelect);
  modal.appendChild(postLabel);
  modal.appendChild(postSelect);
  modal.appendChild(levelLabel);
  modal.appendChild(levelSelect);
  modal.appendChild(statusLabel);
  modal.appendChild(statusSelect);
  modal.appendChild(formatorLabel);
  modal.appendChild(formatorSelect);
  modal.appendChild(formatorHint);
  modal.appendChild(startLabel);
  modal.appendChild(startInput);
  modal.appendChild(endLabel);
  modal.appendChild(endInput);
  modal.appendChild(commentLabel);
  modal.appendChild(commentInput);
  modal.appendChild(buttons);

  overlay.appendChild(modal);
  document.body.appendChild(overlay);
}

/*
 * Эта функция вызывается при выборе △.
 */
function openAutomaticTrainingForm(row, col) {
  openTrainingRecordForm({
    automatic: true,
    row,
    col
  });
}

/*
 * Автоматическая запись обучения для правила I -> Lкр.
 *
 * В отличие от сценария с △ здесь форма не открывается:
 * оператор уже поставлен на пост, поэтому запись сразу попадает
 * в журнал со статусом «В процессе». Дату валидации заполняем
 * расчётной датой окончания обучения, как и в форме добавления записи.
 */
function createAutomaticLcrTrainingRecord(row, col) {
  if (operatorRoles[col] === 'ДС') {
    return;
  }

  const post = posts[row];
  const operator = operators[col];

  if (!post || !operator) {
    return;
  }

  const activeRecordIndex = trainingRecords.findIndex(record =>
    record.autoFromMatrix === true &&
    record.post === post &&
    record.op === operator &&
    record.status !== 'Завершено'
  );

  const startDate = new Date();
  const duration = parseInt(trainingDays[row], 10) || 1;
  const endDate = new Date(startDate);

  endDate.setDate(endDate.getDate() + duration - 1);

  let formator = '—';

  for (let index = 0; index < operators.length; index++) {
    if (
      index !== col &&
      operatorRoles[index] !== 'ДС' &&
      data[row]?.[index] === 'U'
    ) {
      formator = operators[index];
      break;
    }
  }

  const record = {
    year: startDate.getFullYear(),
    month: startDate.toLocaleString('ru-RU', { month: 'long' }),
    startWeek: getWeekNumber(startDate),
    endWeek: getWeekNumber(endDate),
    post,
    op: operator,
    level: 'Lкр',
    status: 'В процессе',
    formator,
    startDate: formatInputDateToRu(formatDateForInput(startDate)),
    validDate: formatInputDateToRu(formatDateForInput(endDate)),
    duration,
    comment: 'Автоматически создано: I → Lкр при постановке на пост',
    autoFromMatrix: true
  };

  if (activeRecordIndex >= 0) {
    trainingRecords[activeRecordIndex] = {
      ...trainingRecords[activeRecordIndex],
      ...record
    };
  } else {
    trainingRecords.push(record);
  }

  saveState();
  renderTrainingTable();
}

// ======================== ЖУРНАЛ ОБУЧЕНИЙ ========================
function addTrainingRecord() {
  openTrainingRecordForm({
    automatic: false
  });
}

function getWeekNumber(date) {
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const days = Math.floor((date - startOfYear) / (1000 * 60 * 60 * 24));
  return Math.ceil((days + startOfYear.getDay() + 1) / 7);
}

function clearTrainingPlacementIfNeeded(record) {
  if (
    !record ||
    !['Iкр', 'Lкр'].includes(record.level)
  ) {
    return false;
  }

  const row = posts.indexOf(record.post);
  const column = operators.indexOf(record.op);

  if (row < 0 || column < 0) {
    return false;
  }

  // Не стираем более новое состояние матрицы, если обучение уже
  // завершили или уровень был изменён после создания записи.
  if (data[row]?.[column] !== record.level) {
    return false;
  }

  data[row][column] = null;

  if (attendanceData[row]?.[column]) {
    attendanceData[row][column] = '';
  }

  return true;
}

function deleteTrainingRecord(index) {
  if (!confirm('Удалить запись об обучении?')) return;

  const record = trainingRecords[index];

  trainingRecords.splice(index, 1);

  // Если это была последняя запись обучения Iкр/Lкр для этой пары,
  // освобождаем соответствующую ячейку матрицы и постановку на пост.
  const hasAnotherTrainingRecord = record &&
    ['Iкр', 'Lкр'].includes(record.level) &&
    trainingRecords.some(item =>
      item.post === record.post &&
      item.op === record.op &&
      item.level === record.level &&
      item.status !== 'Завершено'
    );

  const placementCleared =
    !hasAnotherTrainingRecord &&
    clearTrainingPlacementIfNeeded(record);

  renderTrainingTable();

  if (placementCleared) {
    renderMatrix();
  }
}

function applyTrainingValidation(record) {
  if (
    !record ||
    record.status !== 'Завершено' ||
    !record.validDate ||
    record.validDate === '—'
  ) {
    return false;
  }

  const row = posts.indexOf(record.post);
  const column = operators.indexOf(record.op);

  if (row < 0 || column < 0) {
    return false;
  }

  const targetBySource = {
    'Iкр': 'I',
    'Lкр': 'L'
  };

  const targetLevel = targetBySource[record.level];

  if (!targetLevel) {
    return false;
  }

  record.fromLevel = record.level;
  record.level = targetLevel;
  data[row][column] = targetLevel;

  if (attendanceData[row][column] === '△') {
    attendanceData[row][column] = '○';
  }

  return true;
}

function updateTrainingStatus(index, status) {
  const record = trainingRecords[index];

  if (!record) {
    return;
  }

  record.status = status;

  const validated = applyTrainingValidation(record);

  renderTrainingTable();

  if (validated) {
    renderMatrix();
  }
}

function closeTrainingFilterMenu(event) {
  if (
    event &&
    trainingFilterMenu &&
    trainingFilterMenu.contains(event.target)
  ) {
    return;
  }

  if (trainingFilterMenu) {
    trainingFilterMenu.remove();
    trainingFilterMenu = null;
  }
}

function trainingDateToIso(value) {
  if (!value || value === '—') {
    return '';
  }

  const parts = String(value).split('.');

  if (parts.length !== 3) {
    return '';
  }

  return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
}

function getFilteredTrainingRecords() {
  return trainingRecords
    .map((record, index) => ({
      record,
      originalIndex: index
    }))
    .filter(item => {
      const r = item.record;

      const simpleFilters = [
        ['year', r.year],
        ['month', r.month],
        ['startWeek', r.startWeek],
        ['endWeek', r.endWeek],
        ['post', r.post],
        ['op', r.op],
        ['level', r.level],
        ['status', r.status],
        ['formator', r.formator]
      ];

      for (const [key, value] of simpleFilters) {
        if (
          trainingFilters[key].length > 0 &&
          !trainingFilters[key].includes(String(value ?? ''))
        ) {
          return false;
        }
      }

      const startDate = trainingDateToIso(r.startDate);

      if (
        trainingFilters.startDateFrom &&
        (
          !startDate ||
          startDate < trainingFilters.startDateFrom
        )
      ) {
        return false;
      }

      if (
        trainingFilters.startDateTo &&
        (
          !startDate ||
          startDate > trainingFilters.startDateTo
        )
      ) {
        return false;
      }

      const validDate = trainingDateToIso(r.validDate);

      if (
        trainingFilters.validDateFrom &&
        (
          !validDate ||
          validDate < trainingFilters.validDateFrom
        )
      ) {
        return false;
      }

      if (
        trainingFilters.validDateTo &&
        (
          !validDate ||
          validDate > trainingFilters.validDateTo
        )
      ) {
        return false;
      }

      return true;
    });
}

function createTrainingFilterButtons(
  applyHandler,
  resetHandler
) {
  const container = document.createElement('div');

  container.style.cssText = `
    display: flex;
    justify-content: flex-end;
    gap: 6px;
  `;

  const applyButton = document.createElement('button');
  applyButton.type = 'button';
  applyButton.textContent = 'Применить';
  applyButton.onclick = applyHandler;

  const resetButton = document.createElement('button');
  resetButton.type = 'button';
  resetButton.textContent = 'Сбросить';
  resetButton.onclick = resetHandler;

  [applyButton, resetButton].forEach(button => {
    button.style.cssText = `
      padding: 6px 10px;
      border: 1px solid #cbd5e1;
      border-radius: 5px;
      cursor: pointer;
      background: #f8fafc;
    `;
  });

  container.appendChild(applyButton);
  container.appendChild(resetButton);

  return container;
}

function openTrainingFilterMenu(event, type) {
  event.stopPropagation();
  closeTrainingFilterMenu();

  const menu = document.createElement('div');

  trainingFilterMenu = menu;

  menu.addEventListener('click', event => {
    event.stopPropagation();
  });

  menu.className = 'placement-filter-menu';

  menu.style.cssText = `
    position: fixed;
    z-index: 10001;
    min-width: 260px;
    max-height: 420px;
    overflow-y: auto;
    padding: 12px;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    background: #ffffff;
    box-shadow: 0 8px 24px rgba(0,0,0,.18);
    font-family: Arial, sans-serif;
  `;

  const labels = {
    year: 'Год',
    month: 'Месяц',
    startWeek: 'Неделя начала',
    endWeek: 'Неделя окончания',
    post: 'Пост',
    op: 'Оператор',
    level: 'Уровень',
    status: 'Статус',
    formator: 'Форматор',
    startDate: 'Дата начала обучения',
    validDate: 'Дата валидации'
  };

  const title = document.createElement('div');

  title.textContent = `Фильтр: ${labels[type] || ''}`;

  title.style.cssText = `
    margin-bottom: 10px;
    font-weight: 700;
    color: #0f172a;
  `;

  menu.appendChild(title);

  if (type === 'startDate' || type === 'validDate') {
    const fromKey =
      type === 'startDate'
        ? 'startDateFrom'
        : 'validDateFrom';

    const toKey =
      type === 'startDate'
        ? 'startDateTo'
        : 'validDateTo';

    const fromLabel = document.createElement('label');
    fromLabel.textContent = 'Дата от';
    fromLabel.style.display = 'block';

    const fromInput = document.createElement('input');
    fromInput.type = 'date';
    fromInput.value = trainingFilters[fromKey];

    fromInput.style.cssText = `
      width: 100%;
      box-sizing: border-box;
      margin: 4px 0 10px;
      padding: 7px;
    `;

    const toLabel = document.createElement('label');
    toLabel.textContent = 'Дата до';
    toLabel.style.display = 'block';

    const toInput = document.createElement('input');
    toInput.type = 'date';
    toInput.value = trainingFilters[toKey];

    toInput.style.cssText = `
      width: 100%;
      box-sizing: border-box;
      margin: 4px 0 12px;
      padding: 7px;
    `;

    const syncDateRangeLimits = () => {
      toInput.min = fromInput.value || '';
      fromInput.max = toInput.value || '';
    };

    fromInput.addEventListener(
      'change',
      syncDateRangeLimits
    );

    toInput.addEventListener(
      'change',
      syncDateRangeLimits
    );

    syncDateRangeLimits();

    menu.appendChild(fromLabel);
    menu.appendChild(fromInput);
    menu.appendChild(toLabel);
    menu.appendChild(toInput);

    menu.appendChild(
      createTrainingFilterButtons(
        () => {
          if (
            fromInput.value &&
            toInput.value &&
            toInput.value < fromInput.value
          ) {
            alert(
              'Дата «до» не может быть раньше даты «от».'
            );
            return;
          }

          trainingFilters[fromKey] = fromInput.value;
          trainingFilters[toKey] = toInput.value;

          closeTrainingFilterMenu();
          renderTrainingTable();
        },
        () => {
          trainingFilters[fromKey] = '';
          trainingFilters[toKey] = '';

          closeTrainingFilterMenu();
          renderTrainingTable();
        }
      )
    );
  } else {
    const values = [
      ...new Set(
        trainingRecords.map(record =>
          String(record[type] ?? '')
        )
      )
    ]
      .filter(value => value !== '')
      .sort((a, b) =>
        a.localeCompare(
          b,
          'ru',
          {
            numeric: true,
            sensitivity: 'base'
          }
        )
      );

    const search = document.createElement('input');
    search.type = 'search';
    search.placeholder = 'Поиск...';

    search.style.cssText = `
      width: 100%;
      box-sizing: border-box;
      margin-bottom: 8px;
      padding: 7px;
    `;

    const selectAllLabel = document.createElement('label');

    selectAllLabel.style.display = 'block';
    selectAllLabel.style.marginBottom = '8px';

    const selectAll = document.createElement('input');
    selectAll.type = 'checkbox';
    selectAll.checked = trainingFilters[type].length === 0;

    selectAllLabel.appendChild(selectAll);
    selectAllLabel.appendChild(
      document.createTextNode(' Выбрать всё')
    );

    const valuesContainer = document.createElement('div');

    valuesContainer.style.cssText = `
      max-height: 230px;
      overflow-y: auto;
      margin-bottom: 12px;
    `;

    const checkboxes = [];

    values.forEach(value => {
      const label = document.createElement('label');

      label.style.cssText = `
        display: block;
        padding: 4px 0;
        cursor: pointer;
      `;

      const checkbox = document.createElement('input');

      checkbox.type = 'checkbox';
      checkbox.value = value;

      checkbox.checked =
        trainingFilters[type].length === 0 ||
        trainingFilters[type].includes(value);

      label.appendChild(checkbox);
      label.appendChild(
        document.createTextNode(` ${value}`)
      );

      valuesContainer.appendChild(label);

      checkboxes.push({
        checkbox,
        label
      });
    });

    selectAll.addEventListener('change', () => {
      checkboxes.forEach(item => {
        item.checkbox.checked = selectAll.checked;
      });
    });

    search.addEventListener('input', () => {
      const query =
        search.value.toLocaleLowerCase('ru');

      checkboxes.forEach(item => {
        const visible =
          item.checkbox.value
            .toLocaleLowerCase('ru')
            .includes(query);

        item.label.style.display =
          visible ? 'block' : 'none';
      });
    });

    menu.appendChild(search);
    menu.appendChild(selectAllLabel);
    menu.appendChild(valuesContainer);

    menu.appendChild(
      createTrainingFilterButtons(
        () => {
          const selected = checkboxes
            .filter(item => item.checkbox.checked)
            .map(item => item.checkbox.value);

          trainingFilters[type] =
            selected.length === values.length
              ? []
              : selected;

          closeTrainingFilterMenu();
          renderTrainingTable();
        },
        () => {
          trainingFilters[type] = [];

          closeTrainingFilterMenu();
          renderTrainingTable();
        }
      )
    );
  }

  document.body.appendChild(menu);

  const rect =
    event.currentTarget.getBoundingClientRect();

  let left = rect.left;
  let top = rect.bottom + 5;

  if (left + 280 > window.innerWidth) {
    left = window.innerWidth - 290;
  }

  if (top + 420 > window.innerHeight) {
    top = rect.top - 425;
  }

  menu.style.left = `${Math.max(8, left)}px`;
  menu.style.top = `${Math.max(8, top)}px`;

  setTimeout(() => {
    document.addEventListener(
      'click',
      closeTrainingFilterMenu,
      { once: true }
    );
  }, 0);
}

function renderTrainingTable() {
  const table = document.querySelector('#trainingTable');
  const tbody = table?.querySelector('tbody');

  if (!table || !tbody) {
    return;
  }

  saveState();

  const headers = table.querySelectorAll('thead th');

  const filterTypes = [
    'year',
    'month',
    'startWeek',
    'endWeek',
    'post',
    'op',
    'level',
    'status',
    'formator',
    'startDate',
    'validDate',
    null,
    null,
    null
  ];

  const titles = [
    'Год',
    'Месяц',
    'Неделя начала',
    'Неделя окончания',
    'Пост',
    'Оператор',
    'Уровень',
    'Статус',
    'Форматор',
    'Дата начала обучения',
    'Дата валидации',
    'Срок обучения',
    'Комментарий',
    ''
  ];

  headers.forEach((header, index) => {
    const type = filterTypes[index];

    header.innerHTML = '';

    const title = document.createElement('span');
    title.textContent = titles[index];

    header.appendChild(title);

    if (!type) {
      return;
    }

    let active = false;

    if (type === 'startDate') {
      active =
        Boolean(trainingFilters.startDateFrom) ||
        Boolean(trainingFilters.startDateTo);
    } else if (type === 'validDate') {
      active =
        Boolean(trainingFilters.validDateFrom) ||
        Boolean(trainingFilters.validDateTo);
    } else {
      active = trainingFilters[type].length > 0;
    }

    const button = document.createElement('button');

    button.type = 'button';
    button.textContent = active ? ' ▼' : ' ⏷';
    button.title = 'Открыть фильтр';

    button.style.cssText = `
      margin-left: 6px;
      padding: 1px 5px;
      border: 1px solid #94a3b8;
      border-radius: 4px;
      background: ${
        active
          ? '#dbeafe'
          : '#f8fafc'
      };
      color: #1e40af;
      cursor: pointer;
    `;

    button.onclick = event => {
      openTrainingFilterMenu(event, type);
    };

    header.appendChild(button);
  });

  if (trainingRecords.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td
          colspan="14"
          style="
            text-align:center;
            color:#94a3b8;
            padding:40px;
          "
        >
          Нет записей. Нажмите «+ Добавить запись»
        </td>
      </tr>
    `;

    return;
  }

  const filteredRecords =
    getFilteredTrainingRecords();

  if (filteredRecords.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td
          colspan="14"
          style="
            text-align:center;
            color:#94a3b8;
            padding:40px;
          "
        >
          Нет записей по выбранным фильтрам.
        </td>
      </tr>
    `;

    return;
  }

  tbody.innerHTML = filteredRecords
    .map(item => {
      const r = item.record;
      const i = item.originalIndex;

      return `
        <tr>
          <td>${r.year}</td>
          <td>${r.month}</td>
          <td>${r.startWeek}</td>
          <td>${r.endWeek}</td>
          <td>${r.post}</td>
          <td>${r.op}</td>
          <td>${r.level}</td>

          <td
            style="cursor:pointer;color:#2563eb;"
            onclick="editTrainingField(${i}, 'status')"
          >
            ${r.status}
          </td>

          <td>${r.formator}</td>

          <td>${r.startDate}</td>

          <td
            style="cursor:pointer;color:#2563eb;"
            onclick="editTrainingField(${i}, 'validDate')"
          >
            ${r.validDate}
          </td>

          <td>${r.duration}</td>

          <td
            style="cursor:pointer;color:#2563eb;"
            onclick="editTrainingField(${i}, 'comment')"
          >
            ${r.comment}
          </td>

          <td>
            <span
              style="cursor:pointer;color:#ef4444;"
              onclick="deleteTrainingRecord(${i})"
            >
              ✕
            </span>
          </td>
        </tr>
      `;
    })
    .join('');
}

function editTrainingField(index, field) {
  const record = trainingRecords[index];

  let label;
  let current;

  if (field === 'status') {
    const options = [
      { value: 'План', label: 'План' },
      { value: 'В процессе', label: 'В процессе' },
      { value: 'Завершено', label: 'Завершено' }
    ];

    if (typeof showCenteredSelect === 'function') {
      showCenteredSelect(
        'Статус обучения',
        record.status,
        options,
        value => updateTrainingStatus(index, value)
      );

      return;
    }

    label =
      'Статус обучения (План / В процессе / Завершено)';
    current = record.status;
  } else if (field === 'validDate') {
    label = 'Дата валидации (ДД.ММ.ГГГГ)';
    current = record.validDate;
  } else if (field === 'comment') {
    label = 'Комментарий';
    current = record.comment;
  } else {
    return;
  }

  const newValue = prompt(
    `${label}:`,
    current === '—' ? '' : current
  );

  if (newValue === null) {
    return;
  }

  if (field === 'status') {
    updateTrainingStatus(index, newValue.trim());
    return;
  }

  if (field === 'validDate') {
    record.validDate = newValue.trim() || '—';

    if (record.status === 'Завершено') {
      const validated = applyTrainingValidation(record);

      renderTrainingTable();

      if (validated) {
        renderMatrix();
      }

      return;
    }
  } else if (field === 'comment') {
    record.comment = newValue.trim() || '—';
  }

  renderTrainingTable();
}
