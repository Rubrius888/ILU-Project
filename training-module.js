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
    ? 'Iкр'
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

      if (data[postIndex]?.[index] === 'U') {
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

function deleteTrainingRecord(index) {
  if (!confirm('Удалить запись об обучении?')) return;
  trainingRecords.splice(index, 1);
  renderTrainingTable();
}

function renderTrainingTable() {
  const tbody = document.querySelector('#trainingTable tbody');
  if (!tbody) return;

  saveState();

  if (trainingRecords.length === 0) {
    tbody.innerHTML = '<tr><td colspan="14" style="text-align:center;color:#94a3b8;padding:40px;">Нет записей. Нажмите «+ Добавить запись»</td></tr>';
    return;
  }

  tbody.innerHTML = trainingRecords.map((r, i) => `
    <tr>
      <td>${r.year}</td>
      <td>${r.month}</td>
      <td>${r.startWeek}</td>
      <td>${r.endWeek}</td>
      <td>${r.post}</td>
      <td>${r.op}</td>
      <td>${r.level}</td>
      <td>${r.status}</td>
      <td>${r.formator}</td>
      <td>${r.startDate}</td>
      <td style="cursor:pointer;color:#2563eb;" onclick="editTrainingField(${i}, 'validDate')">${r.validDate}</td>
      <td>${r.duration}</td>
      <td style="cursor:pointer;color:#2563eb;" onclick="editTrainingField(${i}, 'comment')">${r.comment}</td>
      <td><span style="cursor:pointer;color:#ef4444;" onclick="deleteTrainingRecord(${i})">✕</span></td>
    </tr>
  `).join('');
}

function editTrainingField(index, field) {
  const record = trainingRecords[index];
  let label, current;

  if (field === 'validDate') {
    label = 'Дата валидации (ДД.ММ.ГГГГ)';
    current = record.validDate;
  } else if (field === 'comment') {
    label = 'Комментарий';
    current = record.comment;
  } else return;

  const newVal = prompt(label + ':', current === '—' ? '' : current);
  if (newVal !== null) {
    if (field === 'validDate') {
      record.validDate = newVal.trim() || '—';
    } else if (field === 'comment') {
      record.comment = newVal.trim() || '—';
    }
    renderTrainingTable();
  }
}