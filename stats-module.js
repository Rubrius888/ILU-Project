// ======================== СТАТИСТИКА УЧАСТКА ========================

const STATS_HISTORY_LIMIT = 365;

function getStatsDateKey(date = new Date()) {
  const pad = value => String(value).padStart(2, '0');

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function getStatsPercent(value) {
  const number = Number(value);
  return Number.isFinite(number)
    ? Math.max(0, Math.min(100, number))
    : 0;
}

function hasValidationDate(record) {
  if (!record || typeof record !== 'object') {
    return false;
  }

  const validDate = String(record.validDate || '').trim();

  return Boolean(validDate) && validDate !== '—';
}

function findTrainingCell(record) {
  const row = posts.indexOf(record?.post);
  const column = operators.indexOf(record?.op);

  if (row < 0 || column < 0) {
    return null;
  }

  return {
    row,
    column,
    currentLevel: data[row]?.[column] || null
  };
}

function isValidatedTransition(record, fromLevel, toLevel) {
  if (
    !hasValidationDate(record) ||
    record.status !== 'Завершено'
  ) {
    return false;
  }

  const cell = findTrainingCell(record);

  if (!cell) {
    return false;
  }

  if (operatorRoles[cell.column] === 'ДС') {
    return false;
  }

  // Ручная запись может хранить уже конечный уровень: I или L.
  if (
    record.level === toLevel &&
    cell.currentLevel === toLevel
  ) {
    return true;
  }

  // Автоматическая запись из △ хранит исходный уровень Iкр или Lкр.
  return (
    record.level === fromLevel &&
    cell.currentLevel === toLevel
  );
}

function calculateValidationStats() {
  const records = Array.isArray(trainingRecords)
    ? trainingRecords
    : [];

  return {
    validatedI: records.filter(record =>
      isValidatedTransition(record, 'Iкр', 'I')
    ).length,

    validatedL: records.filter(record =>
      isValidatedTransition(record, 'Lкр', 'L')
    ).length
  };
}

function calculateOperatorRating() {
  return operators
    .map((operator, index) => {
      const counts = {
        I: 0,
        L: 0,
        U: 0
      };

      // НУ в рейтинг не включается.
      if (
        operatorRoles[index] === 'НУ' ||
        operatorRoles[index] === 'ДС'
      ) {
        return null;
      }

      for (let row = 0; row < posts.length; row++) {
        const level = data[row]?.[index];

        if (
          Object.prototype.hasOwnProperty.call(
            counts,
            level
          )
        ) {
          counts[level]++;
        }
      }

      return {
        operator,
        role: operatorRoles[index],
        ...counts,

        // I = 1 балл, L = 2 балла, U = 3 балла
        score:
          counts.I +
          counts.L * 2 +
          counts.U * 3
      };
    })
    .filter(Boolean)
    .sort((a, b) =>
      b.score - a.score ||
      b.U - a.U ||
      b.L - a.L ||
      a.operator.localeCompare(b.operator, 'ru')
    );
}

function calculatePostCoverageRating() {
  return posts
    .map((post, row) => {
      const counts = {
        I: 0,
        L: 0,
        U: 0
      };

      for (
        let column = 0;
        column < operators.length;
        column++
      ) {
        // НУ не участвует в покрытии постов
        if (
          operatorRoles[column] === 'НУ' ||
          operatorRoles[column] === 'ДС'
        ) {
          continue;
        }

        const level = data[row]?.[column];

        if (
          Object.prototype.hasOwnProperty.call(
            counts,
            level
          )
        ) {
          counts[level]++;
        }
      }

      return {
        post,
        ...counts,
        score:
          counts.I +
          counts.L * 2 +
          counts.U * 3
      };
    })
    .sort((a, b) =>
      b.score - a.score ||
      b.U - a.U ||
      b.L - a.L ||
      a.post.localeCompare(b.post, 'ru')
    );
}

function calculateAttendanceRating() {
  const totals = new Map();

  getStatsHistoryForPeriod().forEach(snapshot => {
    if (!Array.isArray(snapshot.attendanceByOperator)) {
      return;
    }

    snapshot.attendanceByOperator.forEach(item => {
      if (
        !item ||
        item.role === 'НУ' ||
        item.role === 'ДС' ||
        !item.operator
      ) {
        return;
      }

      if (!totals.has(item.operator)) {
        totals.set(item.operator, {
          operator: item.operator,
          present: 0,
          total: 0
        });
      }

      const result = totals.get(item.operator);
      result.total++;

      if (item.status === 'Я') {
        result.present++;
      }
    });
  });

  return Array.from(totals.values())
    .map(item => ({
      ...item,
      percent: item.total > 0
        ? Math.round(
            (item.present / item.total) * 100
          )
        : 0
    }))
    .sort((a, b) =>
      b.percent - a.percent ||
      b.present - a.present ||
      a.operator.localeCompare(b.operator, 'ru')
    );
}

function calculateStatsSnapshot() {
  const totalPosts = posts.length;

  let filledPosts = 0;
  let trainingPosts = 0;
  let coveredByU = 0;

  const levels = {
    I: 0,
    'Iкр': 0,
    L: 0,
    'Lкр': 0,
    U: 0
  };

  for (let r = 0; r < posts.length; r++) {
    let hasOperator = false;
    let hasTraining = false;
    let hasU = false;

    for (let c = 0; c < operators.length; c++) {
      const status = attendanceData[r]?.[c];
      const level = data[r]?.[c];
      const isExternalOperator = operatorRoles[c] === 'ДС';

      if (status === '○' || status === '△') {
        hasOperator = true;
      }

      if (
        !isExternalOperator &&
        (
          status === '△' ||
          (
            status === '○' &&
            (level === 'Iкр' || level === 'Lкр')
          )
        )
      ) {
        hasTraining = true;
      }

      if (
        operatorRoles[c] !== 'НУ' &&
        operatorRoles[c] !== 'ДС' &&
        level === 'U'
      ) {
        hasU = true;
      }

      if (
        operatorRoles[c] !== 'НУ' &&
        operatorRoles[c] !== 'ДС' &&
        Object.prototype.hasOwnProperty.call(levels, level)
      ) {
        levels[level]++;
      }
    }

    if (hasOperator) {
      filledPosts++;
    }

    if (hasTraining) {
      trainingPosts++;
    }

    if (hasU) {
      coveredByU++;
    }
  }

  let present = 0;
  let absent = 0;

  for (let c = 0; c < operators.length; c++) {
    if (
      operatorRoles[c] === 'НУ' ||
      operatorRoles[c] === 'ДС'
    ) {
      continue;
    }

    if (operatorAttendance[c] === 'Я') {
      present++;
    } else {
      absent++;
    }
  }

  const poly = window._polyData || {};
  const validations = calculateValidationStats();

  return {
    date: getStatsDateKey(),
    totalPosts,
    filledPosts,
    emptyPosts: totalPosts - filledPosts,
    trainingPosts,

    totalOps: operators.filter(
      (_, index) =>
        operatorRoles[index] !== 'НУ' &&
        operatorRoles[index] !== 'ДС'
    ).length,

    present,
    absent,

    coverageU: totalPosts > 0
      ? Math.round((coveredByU / totalPosts) * 100)
      : 0,

    // Сохраняем раздельные показатели, чтобы статистика могла
    // показывать поливалентность операторов, постов и среднее значение.
    polyvalenceOperator2L: getStatsPercent(poly.percentOps2L),
    polyvalenceOperator3L: getStatsPercent(poly.percentOps3L),
    polyvalencePost2L: getStatsPercent(poly.percent2L),
    polyvalencePost3L: getStatsPercent(poly.percent3L),
    polyvalenceAverage2L: getStatsPercent(poly.total2L),
    polyvalenceAverage3L: getStatsPercent(poly.total3L),

    // Старые имена оставляем для совместимости с сохранёнными данными.
    polyvalence2L: getStatsPercent(poly.total2L),
    polyvalence3L: getStatsPercent(poly.total3L),

    validatedI: validations.validatedI,
    validatedL: validations.validatedL,
    attendanceByOperator: operators.map(
    (operator, index) => ({
    operator,
    role: operatorRoles[index],
    status: operatorAttendance[index] || ''
  })
),

    levels
  };
}

function recordStatsSnapshot() {
  if (!Array.isArray(statsHistory)) {
    statsHistory = [];
  }

  const snapshot = calculateStatsSnapshot();

  const existingIndex = statsHistory.findIndex(
    item => item && item.date === snapshot.date
  );

  if (existingIndex >= 0) {
    statsHistory[existingIndex] = snapshot;
  } else {
    statsHistory.push(snapshot);
  }

  statsHistory = statsHistory
    .filter(item =>
      item &&
      typeof item.date === 'string'
    )
    .sort((a, b) =>
      a.date.localeCompare(b.date)
    )
    .slice(-STATS_HISTORY_LIMIT);
}

function saveStatsSnapshot() {
  recordStatsSnapshot();
  saveState();
  renderStatsDashboard();
}

function setStatsText(id, value) {
  const element = document.getElementById(id);

  if (element) {
    element.textContent = value;
  }
}

function escapeStatsHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function getSelectedStatsPeriod() {
  const select = document.getElementById('statsPeriodSelect');
  return select?.value || '30';
}

function getStatsDateRange() {
  return {
    from: document.getElementById('statsDateFrom')?.value || '',
    to: document.getElementById('statsDateTo')?.value || ''
  };
}

function syncStatsDateRangeInputs() {
  const from = document.getElementById('statsDateFrom');
  const to = document.getElementById('statsDateTo');

  if (!from || !to) {
    return;
  }

  to.min = from.value || '';
  from.max = to.value || '';
}

function toggleStatsDateFilter() {
  const panel = document.getElementById('statsDateFilterPanel');
  const button = document.getElementById('statsDateFilterButton');

  if (!panel) {
    return;
  }

  panel.hidden = !panel.hidden;

  if (button) {
    button.setAttribute('aria-expanded', String(!panel.hidden));
  }

  if (!panel.hidden) {
    syncStatsDateRangeInputs();
  }
}

function applyStatsDateRange() {
  const { from, to } = getStatsDateRange();

  if (from && to && from > to) {
    alert('Дата «до» не может быть раньше даты «от».');
    return;
  }

  renderStatsDashboard();
  closeStatsDateFilter();
}

function resetStatsDateRange() {
  const from = document.getElementById('statsDateFrom');
  const to = document.getElementById('statsDateTo');

  if (from) from.value = '';
  if (to) to.value = '';

  syncStatsDateRangeInputs();
  renderStatsDashboard();
  closeStatsDateFilter();
}

function closeStatsDateFilter() {
  const panel = document.getElementById('statsDateFilterPanel');
  const button = document.getElementById('statsDateFilterButton');

  if (panel) panel.hidden = true;
  if (button) button.setAttribute('aria-expanded', 'false');
}

function getStatsHistoryForPeriod() {
  const history = Array.isArray(statsHistory)
    ? statsHistory
    : [];

  const { from, to } = getStatsDateRange();

  if (from || to) {
    return history.filter(item =>
      (!from || item.date >= from) &&
      (!to || item.date <= to)
    );
  }

  const period = getSelectedStatsPeriod();

  if (period === 'all') {
    return history.slice();
  }

  if (period === 'year') {
    const currentYear = String(new Date().getFullYear());

    return history.filter(item =>
      item.date.startsWith(`${currentYear}-`)
    );
  }

  const snapshotCount = Number(period);

  if (!Number.isFinite(snapshotCount)) {
    return history.slice();
  }

  return history.slice(-Math.max(1, snapshotCount));
}

function renderPolyvalenceChart() {
  const charts = [
    {
      id: 'polyvalenceOperator2LChart',
      key: 'polyvalenceOperator2L',
      label: '2L — операторы',
      color: '#2563eb'
    },
    {
      id: 'polyvalenceOperator3LChart',
      key: 'polyvalenceOperator3L',
      label: '3L — операторы',
      color: '#16a34a'
    },
    {
      id: 'polyvalencePost2LChart',
      key: 'polyvalencePost2L',
      label: '2L — посты',
      color: '#d97706'
    },
    {
      id: 'polyvalencePost3LChart',
      key: 'polyvalencePost3L',
      label: '3L — посты',
      color: '#0891b2'
    },
    {
      id: 'polyvalenceAverage2LChart',
      key: 'polyvalenceAverage2L',
      label: 'Среднее 2L',
      color: '#7c3aed'
    },
    {
      id: 'polyvalenceAverage3LChart',
      key: 'polyvalenceAverage3L',
      label: 'Среднее 3L',
      color: '#dc2626'
    }
  ];

  const history = getPolyvalenceChartHistory();

  const getMetricValue = (item, key) => {
    const value = Number(item?.[key]);

    if (Number.isFinite(value)) {
      return getStatsPercent(value);
    }

    // Старые снимки содержат только средние 2L/3L.
    if (key === 'polyvalenceAverage2L') {
      return getStatsPercent(item?.polyvalence2L);
    }

    if (key === 'polyvalenceAverage3L') {
      return getStatsPercent(item?.polyvalence3L);
    }

    return null;
  };

  charts.forEach(({ id, key, label, color }) => {
    const container = document.getElementById(id);

    if (!container) {
      return;
    }

    if (history.length === 0) {
      container.innerHTML =
        '<div class="stats-chart-empty">' +
        'Снимки появятся после накопления статистики.' +
        '</div>';
      return;
    }

    const values = history.map(item =>
      getMetricValue(item, key)
    );

    if (!values.some(value => value !== null)) {
      container.innerHTML =
        '<div class="stats-chart-empty">' +
        'Данные появятся после следующего снимка.' +
        '</div>';
      return;
    }

    const isAverageChart = Boolean(
      container.closest('.stats-polyvalence-average')
    );
    const width = Math.max(
      360,
      Math.round(
        container.clientWidth ||
          (isAverageChart ? 680 : 360)
      )
    );
    const height = isAverageChart ? 230 : 180;
    const left = 36;
    const right = 10;
    const top = 12;
    const bottom = 30;
    const chartWidth = width - left - right;
    const chartHeight = height - top - bottom;

    const x = index =>
      history.length === 1
        ? left + chartWidth / 2
        : left +
          (index / (history.length - 1)) *
            chartWidth;

    const y = value =>
      top +
      chartHeight -
      (getStatsPercent(value) / 100) *
        chartHeight;

    let path = '';
    let segment = '';

    values.forEach((value, index) => {
      if (value === null) {
        path += segment;
        segment = '';
        return;
      }

      segment += `${segment ? 'L' : 'M'} ` +
        `${x(index).toFixed(1)} ${y(value).toFixed(1)} `;
    });

    path += segment;

    const circles = values
      .map((value, index) => value === null
        ? ''
        : `<circle
            cx="${x(index).toFixed(1)}"
            cy="${y(value).toFixed(1)}"
            r="3.5"
            fill="${color}"
          ><title>${history[index].date}: ${value}%</title></circle>`
      )
      .join('');

    const grid = [0, 25, 50, 75, 100]
      .map(value => {
        const lineY = y(value).toFixed(1);

        return `
          <line
            x1="${left}"
            y1="${lineY}"
            x2="${width - right}"
            y2="${lineY}"
            class="chart-grid-line"
          ></line>
          <text
            x="2"
            y="${Number(lineY) + 4}"
            class="chart-axis-label"
          >${value}%</text>
        `;
      })
      .join('');

    const firstDate = history[0].date.slice(5);
    const lastDate = history[history.length - 1].date.slice(5);

    container.innerHTML = `
      <svg
        class="stats-line-chart stats-mini-line-chart"
        viewBox="0 0 ${width} ${height}"
        role="img"
        aria-label="Динамика показателя ${label}"
      >
        ${grid}
        <line
          x1="${left}"
          y1="${top + chartHeight}"
          x2="${width - right}"
          y2="${top + chartHeight}"
          class="chart-axis-line"
        ></line>
        <path
          d="${path}"
          class="chart-line"
          stroke="${color}"
        ></path>
        ${circles}
        <text
          x="${left}"
          y="${height - 8}"
          class="chart-axis-label"
        >${firstDate}</text>
        <text
          x="${width - right}"
          y="${height - 8}"
          text-anchor="end"
          class="chart-axis-label"
        >${lastDate}</text>
      </svg>
    `;
  });
}

// Для новых раздельных графиков добавляем точки за 04.10 и 05.10,
// если за эти даты ещё нет соответствующих показателей. Значения берутся
// из текущего состояния матрицы и используются только при отрисовке графика.
function getPolyvalenceChartHistory() {
  const history = getStatsHistoryForPeriod()
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date));

  const year = new Date().getFullYear();
  const poly = window._polyData || {};
  const today = history.find(item =>
    item.date === getStatsDateKey()
  ) || {};

  const currentValue = (polyKey, snapshotKey, legacyKey) => {
    const fromMatrix = Number(poly[polyKey]);

    if (Number.isFinite(fromMatrix)) {
      return getStatsPercent(fromMatrix);
    }

    const fromSnapshot = Number(today[snapshotKey]);

    if (Number.isFinite(fromSnapshot)) {
      return getStatsPercent(fromSnapshot);
    }

    return getStatsPercent(today[legacyKey]);
  };

  const current = {
    polyvalenceOperator2L: currentValue(
      'percentOps2L',
      'polyvalenceOperator2L'
    ),
    polyvalenceOperator3L: currentValue(
      'percentOps3L',
      'polyvalenceOperator3L'
    ),
    polyvalencePost2L: currentValue(
      'percent2L',
      'polyvalencePost2L'
    ),
    polyvalencePost3L: currentValue(
      'percent3L',
      'polyvalencePost3L'
    ),
    polyvalenceAverage2L: currentValue(
      'total2L',
      'polyvalenceAverage2L',
      'polyvalence2L'
    ),
    polyvalenceAverage3L: currentValue(
      'total3L',
      'polyvalenceAverage3L',
      'polyvalence3L'
    )
  };

  const demoRows = [
    {
      date: `${year}-10-04`,
      ...current
    },
    {
      date: `${year}-10-05`,
      ...current
    }
  ];

  const { from, to } = getStatsDateRange();
  const isInSelectedRange = date =>
    (!from || date >= from) &&
    (!to || date <= to);

  const byDate = new Map(
    history.map(item => [item.date, { ...item }])
  );

  demoRows
    .filter(demo => isInSelectedRange(demo.date))
    .forEach(demo => {
    const row = byDate.get(demo.date) || { date: demo.date };

    Object.entries(demo).forEach(([key, value]) => {
      if (
        key !== 'date' &&
        (row[key] === undefined || row[key] === null)
      ) {
        row[key] = value;
      }
    });

    byDate.set(demo.date, row);
    });

  const chartLimit = from || to
    ? Number.MAX_SAFE_INTEGER
    : Number.isFinite(Number(getSelectedStatsPeriod()))
      ? Math.max(1, Number(getSelectedStatsPeriod()))
      : 365;

  return Array.from(byDate.values())
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-chartLimit);
}

function renderLevelsChart() {
  const container =
    document.getElementById('levelsChart');

  if (!container) {
    return;
  }

  const snapshot = calculateStatsSnapshot();

  const levels = [
    ['I', '#fef08a'],
    ['Iкр', '#fde68a'],
    ['L', '#fdba74'],
    ['Lкр', '#fb923c'],
    ['U', '#fca5a5']
  ];

  const max = Math.max(
    1,
    ...levels.map(
      ([level]) => snapshot.levels[level] || 0
    )
  );

  container.innerHTML = levels
    .map(([level, color]) => {
      const value = snapshot.levels[level] || 0;
      const width = Math.max(
        2,
        Math.round((value / max) * 100)
      );

      return `
        <div class="level-bar-row">
          <span class="level-bar-label">${level}</span>

          <div class="level-bar-track">
            <span
              class="level-bar-fill"
              style="
                width:${width}%;
                background:${color};
              "
            ></span>
          </div>

          <strong class="level-bar-value">${value}</strong>
        </div>
      `;
    })
    .join('');
}

function renderAttendanceHistoryTable() {
  const tbody = document.querySelector(
    '#statsAttendanceTable tbody'
  );

  if (!tbody) {
    return;
  }

  const history = getStatsHistoryForPeriod()
    .slice()
    .sort((a, b) =>
      b.date.localeCompare(a.date)
    );

  if (history.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td
          colspan="5"
          class="stats-table-empty"
        >
          За выбранный период снимков явки пока нет.
        </td>
      </tr>
    `;

    return;
  }

  tbody.innerHTML = history.map(item => {
    const total = Number(item.totalOps) || 0;
    const present = Number(item.present) || 0;
    const absent = Number(item.absent) || 0;

    const percent = total > 0
      ? Math.round((present / total) * 100)
      : 0;

    return `
      <tr>
        <td>${escapeStatsHtml(item.date)}</td>
        <td>${present}</td>
        <td>${absent}</td>
        <td>${total}</td>
        <td class="stats-attendance-percent">
          ${percent}%
        </td>
      </tr>
    `;
  }).join('');
}

function getStatsRiskRows() {
  return posts
    .map((post, row) => {
      let hasOperator = false;
      let hasOwnOperator = false;
      let hasExternalOperator = false;
      let hasTraining = false;
      let hasU = false;
      let hasIkr = false;

      for (
        let col = 0;
        col < operators.length;
        col++
      ) {
        const status = attendanceData[row]?.[col];
        const level = data[row]?.[col];
        const isExternalOperator = operatorRoles[col] === 'ДС';

        if (status === '○' || status === '△') {
          hasOperator = true;

          if (isExternalOperator) {
            hasExternalOperator = true;
          } else {
            hasOwnOperator = true;
          }
        }

        if (
          !isExternalOperator &&
          level === 'Iкр'
        ) {
          hasIkr = true;
        }

        if (!isExternalOperator && status === '△') {
          hasTraining = true;
        }

        if (
          operatorRoles[col] !== 'НУ' &&
          operatorRoles[col] !== 'ДС' &&
          level === 'U'
        ) {
          hasU = true;
        }
      }

      if (
        hasOperator &&
        hasU &&
        !hasTraining &&
        !hasIkr
      ) {
        return null;
      }

      return {
        post,

        status: !hasOperator
        ? 'Незаполнен'
        : (hasTraining || hasIkr)
          ? 'Есть обучение'
          : hasExternalOperator && !hasOwnOperator
            ? 'Закрыт оператором ДС'
          : 'Нет U',

        u: hasU ? 'Да' : 'Нет',
        training: (hasTraining || hasIkr) ? 'Да' : 'Нет',
      };
    })
    .filter(Boolean);
}

function renderStatsRiskTable() {
  const tbody =
    document.querySelector(
      '#statsRiskTable tbody'
    );

  if (!tbody) {
    return;
  }

  const rows = getStatsRiskRows();

  if (rows.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td
          colspan="4"
          class="stats-table-empty"
        >Критичных постов нет.</td>
      </tr>
    `;

    return;
  }

  tbody.innerHTML = rows
    .map(row => `
      <tr>
        <td>${escapeStatsHtml(row.post)}</td>

        <td>
          <span class="stats-risk-status">
            ${escapeStatsHtml(row.status)}
          </span>
        </td>

        <td
          class="${row.u === 'Нет'
            ? 'stats-danger-text'
            : ''}"
        >${escapeStatsHtml(row.u)}</td>

        <td>${escapeStatsHtml(row.training)}</td>
      </tr>
    `)
    .join('');
}

function renderOperatorRatingChart() {
  const container =
    document.getElementById('statsRatingChart');

  if (!container) {
    return;
  }

  const rows = calculateOperatorRating();

  if (rows.length === 0) {
    container.innerHTML =
      '<div class="stats-chart-empty">' +
      'Нет операторов для рейтинга.' +
      '</div>';

    return;
  }

  const maxScore = Math.max(
    1,
    ...rows.map(row => row.score)
  );

  container.innerHTML = rows.map((row, index) => {
    const width = row.score > 0
      ? Math.max(
          3,
          Math.round((row.score / maxScore) * 100)
        )
      : 2;

    // Автоматический цвет для каждого оператора
    const hue = Math.round(
      (index * 137.508) % 360
    );

    const color = `hsl(${hue} 72% 52%)`;

    return `
      <div class="rating-bar-row">
        <div
          class="rating-bar-name"
          title="${escapeStatsHtml(row.operator)}"
        >
          <span class="rating-bar-place">
            ${index + 1}
          </span>

          <span>
            ${escapeStatsHtml(row.operator)}
          </span>
        </div>

        <div class="rating-bar-track">
          <span
            class="rating-bar-fill"
            style="
              width:${width}%;
              background:${color};
            "
          ></span>

          <strong class="rating-bar-score">
            ${row.score}
          </strong>
        </div>
      </div>
    `;
  }).join('');
}

function renderPostCoverageChart() {
  const container =
    document.getElementById(
      'statsPostCoverageChart'
    );

  if (!container) {
    return;
  }

  const rows = calculatePostCoverageRating();

  if (rows.length === 0) {
    container.innerHTML =
      '<div class="stats-chart-empty">' +
      'Нет постов для рейтинга.' +
      '</div>';

    return;
  }

  const maxScore = Math.max(
    1,
    ...rows.map(row => row.score)
  );

  container.innerHTML = rows.map((row, index) => {
    const width = row.score > 0
      ? Math.max(
          3,
          Math.round(
            (row.score / maxScore) * 100
          )
        )
      : 2;

    const hue = Math.round(
      (index * 137.508 + 45) % 360
    );

    const color =
      `hsl(${hue} 72% 52%)`;

    return `
      <div class="rating-bar-row">
        <div
          class="rating-bar-name"
          title="${escapeStatsHtml(row.post)}"
        >
          <span class="rating-bar-place">
            ${index + 1}
          </span>

          <span>
            ${escapeStatsHtml(row.post)}
          </span>
        </div>

        <div class="rating-bar-track">
          <span
            class="rating-bar-fill"
            style="
              width:${width}%;
              background:${color};
            "
          ></span>

          <strong class="rating-bar-score">
            ${row.score}
          </strong>
        </div>
      </div>
    `;
  }).join('');
}

function renderAttendanceRatingChart() {
  const container =
    document.getElementById(
      'statsAttendanceRatingChart'
    );

  if (!container) {
    return;
  }

  const rows = calculateAttendanceRating();

  if (rows.length === 0) {
    container.innerHTML =
      '<div class="stats-chart-empty">' +
      'История посещаемости пока не накоплена.' +
      '</div>';

    return;
  }

  container.innerHTML = rows.map((row, index) => {
    const width = Math.max(3, row.percent);

    const hue = Math.round(
      (index * 137.508 + 90) % 360
    );

    const color =
      `hsl(${hue} 62% 48%)`;

    return `
      <div class="rating-bar-row">
        <div
          class="rating-bar-name"
          title="${escapeStatsHtml(row.operator)}"
        >
          <span class="rating-bar-place">
            ${index + 1}
          </span>

          <span>
            ${escapeStatsHtml(row.operator)}
          </span>
        </div>

        <div class="rating-bar-track">
          <span
            class="rating-bar-fill"
            style="
              width:${width}%;
              background:${color};
            "
          ></span>

          <strong class="rating-bar-score">
            ${row.percent}%
            (${row.present}/${row.total})
          </strong>
        </div>
      </div>
    `;
  }).join('');
}

function renderStatsDashboard() {
  const snapshot = calculateStatsSnapshot();

  setStatsText(
    'statsTabTotalOps',
    snapshot.totalOps
  );

  setStatsText(
    'statsTabAttendance',
    `Явка: ${snapshot.present}, отсутствует: ${snapshot.absent}`
  );

  setStatsText(
    'statsTabFilledPosts',
    `${snapshot.filledPosts} / ${snapshot.totalPosts}`
  );

  setStatsText(
    'statsTabEmptyPosts',
    `Незаполнено: ${snapshot.emptyPosts}`
  );

  setStatsText(
    'statsTabCoverageU',
    `${snapshot.coverageU}%`
  );

  setStatsText(
    'statsTab2L',
    `${snapshot.polyvalence2L}%`
  );

  setStatsText(
    'statsTab3L',
    `${snapshot.polyvalence3L}%`
  );

  setStatsText(
    'statsTabTraining',
    snapshot.trainingPosts
  );

  setStatsText(
    'statsTabValidatedI',
    snapshot.validatedI
  );

  setStatsText(
    'statsTabValidatedL',
    snapshot.validatedL
  );

  const emptyPosts =
    document.getElementById(
      'statsTabEmptyPosts'
    );

  if (emptyPosts) {
    emptyPosts.classList.toggle(
      'stats-danger-text',
      snapshot.emptyPosts > 0
    );
  }

  const status =
    document.getElementById(
      'statsHistoryStatus'
    );

  if (status) {
    const periodHistory =
  getStatsHistoryForPeriod();

const count = periodHistory.length;

    const periodSelect =
      document.getElementById('statsPeriodSelect');
    const { from, to } = getStatsDateRange();

    const periodLabel = from || to
      ? `${from || 'начало'} — ${to || 'конец'}`
      : periodSelect
        ? periodSelect.options[
            periodSelect.selectedIndex
          ].textContent
        : 'выбранный период';

status.textContent = count > 0
  ? `Снимков за период «${periodLabel}»: ${count}. Последний: ${periodHistory[count - 1].date}`
  : `За период «${periodLabel}» снимков пока нет.`;
  }

  renderPolyvalenceChart();
  renderLevelsChart();
  renderAttendanceHistoryTable();
  renderStatsRiskTable();
  renderOperatorRatingChart();
  renderPostCoverageChart();
  renderAttendanceRatingChart();
}
