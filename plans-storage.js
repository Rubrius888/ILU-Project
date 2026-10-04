const PLANS_STORAGE_KEY = 'ilu-se4-plans-v1';

let savedPlans = {
  development: null,
  rotation: null
};

function savePlans() {
  try {
    localStorage.setItem(
      PLANS_STORAGE_KEY,
      JSON.stringify(savedPlans)
    );
  } catch (error) {
    console.error('Не удалось сохранить планинги:', error);
  }
}

function loadPlans() {
  try {
    const raw = localStorage.getItem(PLANS_STORAGE_KEY);

    if (!raw) return;

    const parsed = JSON.parse(raw);

    if (!parsed || typeof parsed !== 'object') {
      return;
    }

    savedPlans = {
      development: parsed.development || null,
      rotation: parsed.rotation || null
    };
  } catch (error) {
    console.error('Не удалось загрузить планинги:', error);
  }
}

function capturePlan(type, tableId) {
  const table = document.getElementById(tableId);

  if (!table || !table.tHead || !table.tBodies[0]) {
    return;
  }

  const headers = Array.from(
    table.tHead.rows[0]?.cells || [],
    cell => cell.innerText
  );

  const rows = Array.from(
    table.tBodies[0].rows,
    row => Array.from(row.cells, cell => cell.textContent)
  );

  const now = new Date();

  savedPlans[type] = {
    year: now.getFullYear(),
    month: now.getMonth(),
    posts: [...posts],
    operators: [...operators],
    headers,
    rows,
    rotationsPerDay:
      document.getElementById('rotationsPerDay')?.value || 1
  };

  savePlans();
}

function restorePlan(type, tableId, color) {
  const plan = savedPlans[type];

  if (!plan) return;

  const table = document.getElementById(tableId);

  if (!table || !table.tHead || !table.tBodies[0]) {
    return;
  }

  table.tHead.innerHTML = '';
  table.tBodies[0].innerHTML = '';

  if (plan.headers.length > 0) {
    const headerRow = table.tHead.insertRow();

    plan.headers.forEach((text, index) => {
      const th = document.createElement('th');

      th.textContent = text;
      th.style.whiteSpace = 'pre-line';

      if (index > 0) {
        const day = new Date(
          plan.year,
          plan.month,
          index
        ).getDay();

        if (day === 0 || day === 6) {
          th.style.backgroundColor = '#cbd5e1';
        }
      }

      headerRow.appendChild(th);
    });
  }

  plan.rows.forEach((values, rowIndex) => {
    const row = table.tBodies[0].insertRow();

    values.forEach((value, columnIndex) => {
      const cell = row.insertCell();

      cell.textContent = value;

      // Последняя колонка планинга развития — срок обучения,
      // а не ячейка календаря и не место для оператора.
      const isDevelopmentDurationCell =
        type === 'development' &&
        columnIndex === values.length - 1;

      if (isDevelopmentDurationCell) {
        cell.dataset.post = rowIndex;
        cell.dataset.duration = 'true';
        cell.style.cursor = 'pointer';
        cell.style.fontWeight = '600';
        cell.onclick = function (event) {
          editDevelopmentDuration(event);
        };
        return;
      }

      if (columnIndex === 0) {
        cell.style.fontWeight = '600';
        return;
      }

      cell.dataset.post = rowIndex;
      cell.dataset.day = columnIndex - 1;

      const operator = String(value || '').trim();

      if (operator && operator !== '+') {
        cell.dataset.op = operator;
        cell.style.color = color;
        cell.style.fontWeight = '600';
      } else {
        cell.textContent = '+';
        cell.style.color = '#94a3b8';
        cell.style.fontSize = '16px';
      }

      /*
       * Восстановление обработчиков после загрузки сохранённого плана.
       */
      cell.style.cursor = 'pointer';

      if (operator && operator !== '+') {
        cell.onclick = function (event) {
          if (type === 'rotation') {
            editRotationCell(event);
          } else {
            editCalendarCell(event);
          }
        };
      } else {
        cell.onclick = function (event) {
          if (type === 'rotation') {
            addRotationOp(event);
          } else {
            addCalendarTraining(event);
          }
        };
      }
    });
  });

  if (
    type === 'rotation' &&
    document.getElementById('rotationsPerDay')
  ) {
    document.getElementById('rotationsPerDay').value =
      plan.rotationsPerDay || 1;
  }
}

function wrapPlanGenerator(
  type,
  functionName,
  tableId,
  color
) {
  const originalFunction = window[functionName];

  if (typeof originalFunction !== 'function') {
    return;
  }

  window[functionName] = function () {
    const result =
      originalFunction.apply(this, arguments);

    capturePlan(type, tableId);
    restorePlan(type, tableId, color);

    return result;
  };
}

/*
 * Сохраняем ручные изменения планинга:
 * добавление и удаление операторов.
 */
function wrapPlanChange(
  type,
  functionName,
  tableId,
  color
) {
  const originalFunction = window[functionName];

  if (typeof originalFunction !== 'function') {
    return;
  }

  window[functionName] = function () {
    const result =
      originalFunction.apply(this, arguments);

    capturePlan(type, tableId);
    restorePlan(type, tableId, color);

    return result;
  };
}

loadPlans();

wrapPlanGenerator(
  'development',
  'generateDevelopmentPlan',
  'devCalendarTable',
  '#2563eb'
);

wrapPlanGenerator(
  'rotation',
  'generateRotationPlan',
  'rotCalendarTable',
  '#16a34a'
);

wrapPlanChange(
  'development',
  'placeCalendarOp',
  'devCalendarTable',
  '#2563eb'
);

wrapPlanChange(
  'development',
  'deleteCalendarTraining',
  'devCalendarTable',
  '#2563eb'
);

wrapPlanChange(
  'rotation',
  'placeRotationOp',
  'rotCalendarTable',
  '#16a34a'
);

wrapPlanChange(
  'rotation',
  'deleteRotationOp',
  'rotCalendarTable',
  '#16a34a'
);

setTimeout(() => {
  restorePlan(
    'development',
    'devCalendarTable',
    '#2563eb'
  );

  restorePlan(
    'rotation',
    'rotCalendarTable',
    '#16a34a'
  );
}, 0);
