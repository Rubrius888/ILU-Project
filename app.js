
const restoredState = loadState();
const storedStateExists = Boolean(
  localStorage.getItem('ilu-se4-state-v1')
);

/*
 * Новая установка должна открываться как чистый шаблон.
 * Если сохранённой матрицы нет, не показываем встроенные демонстрационные
 * данные разработчика. На компьютере владельца loadState() вернёт true,
 * поэтому его существующая матрица будет восстановлена без изменений.
 */
if (!restoredState && !storedStateExists) {
  posts = [];
  postIds = [];
  operators = [];
  operatorIds = [];
  validatedCarModels = {};
  processChanges = [];
  rotationApprovals = {};
  rotationComments = {};
  placementFactEvents = [];
  difficulty = [];
  ergonomics = [];
  trainingDays = [];
  attendanceData = [];
  operatorAttendance = [];
  operatorRoles = [];
  data = [];
  trainingRecords = [];
  placementLog = [];
  statsHistory = [];
  placementFilters = {
    dateFrom: '',
    dateTo: '',
    operators: [],
    posts: []
  };
  placementSort = {
    key: 'date',
    direction: 'desc'
  };
  workshopChief = '';
  sectionChief = '';
}

initializePlacementFactTracking();

// После восстановления состояния зафиксировать первичную расстановку
// текущего рабочего дня. Функция сама пропускает пустую матрицу и повторный
// запуск в тот же день.
if (typeof ensureDailyInitialPlacement === 'function') {
  ensureDailyInitialPlacement();
}

if (!restoredState && storedStateExists && storageLoadError) {
  setTimeout(() => {
    alert(
      'Сохранённая база не может быть восстановлена. Данные не перезаписаны. ' +
      'Используйте импорт JSON для восстановления базы.'
    );
  }, 0);
}

//Восстановление фильтров департамент, цех, участок, смена
function restoreSavedFilters() {
  const filters = {
    department: 'filterDepartment',
    workshop: 'filterWorkshop',
    section: 'filterSection',
    shift: 'filterShift'
  };

  Object.entries(filters).forEach(([key, elementId]) => {
    const element = document.getElementById(elementId);
    const savedValue = filterState[key];

    if (!element || !savedValue) return;

    const optionExists = Array.from(element.options)
      .some(option => option.value === savedValue);

    if (optionExists) {
      element.value = savedValue;
    }
  });
  renderOrganizationFilters();
}

// ======================== СТАТИСТИКА В КАРТОЧКАХ ========================
function updateStatsCard() {
  // Статистика по постам
  const totalPosts = posts.length;
  let filledPosts = 0, trainingPosts = 0;
  for (let r = 0; r < posts.length; r++) {
    let hasOperator = false, hasTraining = false;
    for (let c = 0; c < operators.length; c++) {
      const status = attendanceData[r][c];
      const isExternalOperator = operatorRoles[c] === 'ДС';

      // ДС закрывает пост физически, но не участвует
      // в показателях обучения участка.
      if (status === '○' || status === '△') {
        hasOperator = true;
      }

      if (!isExternalOperator && status === '△') {
        hasOperator = true;
        hasTraining = true;
      }

      if (
        !isExternalOperator &&
        status === '○' &&
        (data[r]?.[c] === 'Iкр' || data[r]?.[c] === 'Lкр')
      ) {
        hasTraining = true;
      }
    }
    if (hasOperator) filledPosts++;
    if (hasTraining) trainingPosts++;
  }
  const emptyPosts = totalPosts - filledPosts;
  document.getElementById('statsTotalPosts').textContent = totalPosts;
  document.getElementById('statsFilledPosts').textContent = filledPosts;
  document.getElementById('statsEmptyPosts').textContent = emptyPosts;
  const emptyPostsRow = document.getElementById('statsEmptyPostsRow');

if (emptyPostsRow) {
  emptyPostsRow.classList.toggle('is-danger', emptyPosts > 0);
}
  document.getElementById('statsTrainingPosts').textContent = trainingPosts;

  // Статистика только по собственным операторам участка.
  // НУ и привлечённые операторы из другого сектора не учитываются.
  const totalOps = operators.filter((_, i) =>
    operatorRoles[i] !== 'НУ' &&
    operatorRoles[i] !== 'ДС'
  ).length;
  let present = 0, vacation = 0, sick = 0, absent = 0, fired = 0, otherSector = 0;
  for (let c = 0; c < operators.length; c++) {
    if (
      operatorRoles[c] === 'НУ' ||
      operatorRoles[c] === 'ДС'
    ) continue;
    const att = operatorAttendance[c];
    if (att === 'Я') present++;
    else if (att === 'О') vacation++;
    else if (att === 'Б') sick++;
    else if (att === 'Н') absent++;
    else if (att === 'У') fired++;
    else if (att === 'С') otherSector++;
  }
  document.getElementById('statsTotalOps').textContent = totalOps;
  document.getElementById('statsPresent').textContent = present;
  document.getElementById('statsVacation').textContent = vacation;
  document.getElementById('statsSick').textContent = sick;
  document.getElementById('statsAbsent').textContent = absent;
  document.getElementById('statsFired').textContent = fired;
  document.getElementById('statsOtherSector').textContent = otherSector;
    // Читаем поливалентность из глобальной переменной
  const pd = window._polyData || {};
  document.getElementById('statsTotal2L').textContent = (pd.total2L || 0) + '%';
  document.getElementById('statsTotal3L').textContent = (pd.total3L || 0) + '%';
  document.getElementById('statsPosts2L').textContent = (pd.percent2L || 0) + '%';
  document.getElementById('statsPosts3L').textContent = (pd.percent3L || 0) + '%';
  document.getElementById('statsOps2L').textContent = (pd.percentOps2L || 0) + '%';
  document.getElementById('statsOps3L').textContent = (pd.percentOps3L || 0) + '%';
}

// ======================== ПЕЧАТЬ РАЗДЕЛОВ ========================
// Печать выполняется средствами браузера: Excel/PDF и сторонние библиотеки
// для этого режима не используются. Можно передать один или несколько блоков.
function printSections(sectionIds) {
  const printLog = (stage, details = {}) => console.info(`[ILU print] ${stage}`, details);
  printLog('HANDLER_STARTED');
  printLog('PRINT_SECTIONS_STARTED');
  const ids = Array.isArray(sectionIds) ? sectionIds : [sectionIds];
  const isMatrixPrint = ids.includes('matrix');
  const targets = ids
    .filter(id => !isMatrixPrint || (id !== 'matrix' && id !== 'matrixInfo'))
    .map(id => document.getElementById(id))
    .filter(Boolean);

  if (!targets.length && !isMatrixPrint) return;

  const matrixSection = document.getElementById('matrix');
  const matrixInfo = document.getElementById('matrixInfo');
  const matrixTable = document.getElementById('iluTable');
  let matrixPrintView = null;
  let matrixPrintComposition = null;
  let matrixInfoPrintCopy = null;
  const hiddenMatrixSources = [];
  if (ids.includes('matrix') && matrixSection && matrixTable) {
    matrixPrintView = createMatrixPrintView(matrixTable);
    matrixPrintComposition = document.createElement('div');
    matrixPrintComposition.className = 'matrix-print-composition';
    matrixInfoPrintCopy = matrixInfo?.cloneNode(true) || null;
    matrixInfoPrintCopy?.removeAttribute('id');
    matrixInfoPrintCopy?.classList.add('matrix-print-info-copy', 'print-target');
    matrixPrintComposition.classList.add('print-target');
    matrixPrintComposition.append(matrixInfoPrintCopy, matrixPrintView);
    document.body.appendChild(matrixPrintComposition);
    printLog('COMPOSITION_CREATED');
    [matrixInfo, matrixSection].filter(Boolean).forEach(source => {
      hiddenMatrixSources.push({
        source,
        style: source.getAttribute('style'),
        className: source.className
      });
      source.classList.add('matrix-print-source-hidden');
      source.style.setProperty('display', 'none', 'important');
    });
    printLog('SOURCES_HIDDEN');
  }

  let cleanedUp = false;
  const cleanup = () => {
    if (cleanedUp) return;
    cleanedUp = true;
    printLog('CLEANUP_COMPLETED');
    document.body.classList.remove('is-printing');
    targets.forEach(section => section.classList.remove('print-target'));
    hiddenMatrixSources.forEach(({ source, style, className }) => {
      source.className = className;
      if (style === null) {
        source.style.removeProperty('display');
        source.removeAttribute('style');
      } else source.setAttribute('style', style);
    });
    matrixPrintComposition?.remove();
    window.removeEventListener('afterprint', handleAfterPrint);
    window.removeEventListener('beforeprint', handleBeforePrint);
  };
  const handleBeforePrint = () => {
    printLog('BEFOREPRINT_RECEIVED');
  };

  document.body.classList.add('is-printing');
  targets.forEach(section => section.classList.add('print-target'));
  window.addEventListener('beforeprint', handleBeforePrint);
  const handleAfterPrint = () => {
    printLog('AFTERPRINT_RECEIVED');
    cleanup();
  };
  window.addEventListener('afterprint', handleAfterPrint);

  try {
    if (matrixPrintView && matrixPrintComposition && matrixInfoPrintCopy) {
      printLog('FIT_STARTED');
      const fitResult = fitMatrixPrintComposition(matrixInfoPrintCopy, matrixPrintComposition, matrixPrintView);
      printLog('FIT_COMPLETED', fitResult);
      if (!fitResult.final.fits) {
        console.warn('[ILU print] FIT_OVERFLOW: printing across pages', fitResult.final);
      }
    }
    printLog('BEFORE_WINDOW_PRINT');
    window.print();
    printLog('WINDOW_PRINT_RETURNED');
  } catch (error) {
    printLog('PRINT_ERROR', { error: String(error?.stack || error) });
    cleanup();
  }
}

window.printSections = printSections;

function createMatrixPrintView(sourceTable) {
  const printView = document.createElement('div');
  printView.className = 'matrix-print-view';
  const operatorHeaders = Array.from(
    sourceTable.tHead?.rows[1]?.querySelectorAll('[data-operator-index]') || []
  );
  const operatorCount = operatorHeaders.length;
  const blockSize = 20;

  for (let start = 0; start < operatorCount; start += blockSize) {
    const end = Math.min(start + blockSize, operatorCount);
    const block = document.createElement('section');
    block.className = 'matrix-print-block';
    block.dataset.operatorStart = String(start);
    block.dataset.operatorEnd = String(end - 1);

    const title = document.createElement('h2');
    title.textContent = `Матрица квалификаций — операторы ${start + 1}–${end}`;
    block.appendChild(title);

    const table = sourceTable.cloneNode(true);
    table.removeAttribute('id');
    table.classList.add('matrix-print-table');
    trimMatrixPrintTable(table, start, end, operatorCount, blockSize);
    block.appendChild(table);
    const wrapper = document.createElement('div');
    wrapper.className = 'matrix-print-block-wrapper';
    wrapper.appendChild(block);
    printView.appendChild(wrapper);
  }

  return printView;
}

function fitMatrixPrintComposition(matrixInfo, matrixSection, printView) {
  const pageHeight = 202 * 96 / 25.4;
  const pageWidth = 289 * 96 / 25.4;
  const tolerance = 0.25;
  window.lastMatrixPrintMetrics = null;
  const getBlocks = () => Array.from(printView.querySelectorAll('.matrix-print-block'));
  const getRows = blocks => blocks.map(block =>
    Array.from(block.querySelector('.matrix-print-table')?.rows || []));
  let blocks = getBlocks();
  let rows = getRows(blocks);
  if (!rows.length || !rows[0].length || rows.some(group => group.length !== rows[0].length)) {
    throw new Error('Print tables are missing or have different row counts');
  }

  const measure = () => {
    const composition = matrixSection.getBoundingClientRect();
    const info = matrixInfo.getBoundingClientRect();
    const blockRects = blocks.map(block => block.getBoundingClientRect());
    const tableRects = blocks.map(block => block.querySelector('.matrix-print-table').getBoundingClientRect());
    const rowHeights = rows.map(group => group.map(row => row.getBoundingClientRect().height));
    const bottom = Math.max(composition.bottom, ...tableRects.map(rect => rect.bottom));
    const compositionHeight = bottom - composition.top;
    return {
      infoHeight: info.height, compositionHeight, pageHeight,
      remainingHeight: pageHeight - compositionHeight,
      blocks: blockRects, tables: tableRects, rowHeights,
      measurable: info.height > 0 && Math.abs(composition.width - pageWidth) <= tolerance &&
        tableRects.every(rect => rect.height > 0 && Math.abs(rect.width - pageWidth) <= tolerance) &&
        rowHeights.every(group => group.every(height => height > 0)),
      nonOverlapping: blockRects.every((rect, index) =>
        rect.top >= (index ? Math.max(blockRects[index - 1].bottom, tableRects[index - 1].bottom) : info.bottom)),
      aligned: rowHeights.every(group =>
        group.every((height, i) => Math.abs(height - rowHeights[0][i]) <= tolerance))
    };
  };

  printView.dataset.density = 'normal';
  const initial = measure();
  if (!initial.measurable || !initial.nonOverlapping) {
    throw new Error('Print composition has invalid measurement geometry');
  }

  const needsCompact = initial.remainingHeight < 0;
  if (needsCompact) {
    // Start table layout with compact styles already applied in Edge.
    const compactView = printView.cloneNode(true);
    compactView.dataset.density = 'compact';
    printView.replaceWith(compactView);
    printView = compactView;
    blocks = getBlocks();
    rows = getRows(blocks);
  }

  if (needsCompact && rows.length > 1) {
    const compact = measure();
    const heights = rows[0].map((_, i) => Math.max(...compact.rowHeights.map(group => group[i])));
    rows.forEach(group => group.forEach((row, i) => {
      row.style.setProperty('height', heights[i] + 'px', 'important');
    }));
  }

  const final = needsCompact ? measure() : { ...initial };
  const valid = final.measurable && (!needsCompact || final.aligned) && final.nonOverlapping &&
    Math.abs(initial.infoHeight - final.infoHeight) <= tolerance;
  final.fits = valid && final.remainingHeight >= 0;
  const status = !valid ? 'invalid-geometry' : final.fits ? 'fit' : 'overflow';
  matrixSection.dataset.printFitStatus = status;
  window.lastMatrixPrintMetrics = { status, density: printView.dataset.density, pageHeight, initial, final };
  if (!valid) throw new Error('Print row alignment or composition geometry is invalid');
  return window.lastMatrixPrintMetrics;
}

function trimMatrixPrintTable(table, start, end, operatorCount, blockSize) {
  Array.from(table.rows).forEach(row => {
    Array.from(row.cells).forEach(cell => {
      const operatorIndex = cell.dataset.operatorIndex;
      if (
        operatorIndex !== undefined &&
        (Number(operatorIndex) < start || Number(operatorIndex) >= end)
      ) {
        cell.remove();
      }
    });

    const placeholderCount = blockSize - (end - start);
    if (placeholderCount <= 0) return;

    const summaryCell = Array.from(row.cells).find(cell =>
      cell.cellIndex >= 4 && cell.dataset.operatorIndex === undefined
    );
    const placeholders = Array.from({ length: placeholderCount }, () => {
      const cell = document.createElement(row.cells[0]?.tagName === 'TH' ? 'th' : 'td');
      cell.colSpan = 2;
      cell.className = 'matrix-print-placeholder';
      cell.setAttribute('aria-hidden', 'true');
      return cell;
    });

    placeholders.forEach(cell => {
      if (summaryCell) row.insertBefore(cell, summaryCell);
      else row.appendChild(cell);
    });
  });
}

function collectIluPrintDiagnostics() {
  const composition = document.querySelector('.matrix-print-composition');
  if (!composition) return null;

  const toMm = value => Number((value * 25.4 / 96).toFixed(2));
  const style = element => {
    const computed = getComputedStyle(element);
    return {
      display: computed.display,
      position: computed.position,
      breakInside: computed.breakInside,
      pageBreakInside: computed.pageBreakInside,
      height: computed.height,
      minHeight: computed.minHeight,
      maxHeight: computed.maxHeight,
      marginTop: computed.marginTop,
      marginRight: computed.marginRight,
      marginBottom: computed.marginBottom,
      marginLeft: computed.marginLeft,
      paddingTop: computed.paddingTop,
      paddingRight: computed.paddingRight,
      paddingBottom: computed.paddingBottom,
      paddingLeft: computed.paddingLeft,
      fontSize: computed.fontSize,
      lineHeight: computed.lineHeight
    };
  };
  const measure = (element, name) => {
    if (!element) return null;
    const rect = element.getBoundingClientRect();
    return {
      name,
      x: rect.x,
      y: rect.y,
      widthPx: rect.width,
      heightPx: rect.height,
      widthMm: toMm(rect.width),
      heightMm: toMm(rect.height),
      scrollWidth: element.scrollWidth,
      scrollHeight: element.scrollHeight,
      offsetWidth: element.offsetWidth,
      offsetHeight: element.offsetHeight,
      ...style(element)
    };
  };

  const rows = [];
  composition.querySelectorAll('.matrix-print-block').forEach((block, blockIndex) => {
    rows.push(measure(block.querySelector('h2'), `block-${blockIndex + 1}-title`));
    rows.push(measure(block.querySelector('table'), `block-${blockIndex + 1}-table`));
    block.querySelectorAll('table tr').forEach((row, rowIndex) => {
      rows.push(measure(row, `block-${blockIndex + 1}-row-${rowIndex + 1}`));
    });
    block.querySelectorAll('thead th[data-operator-index]').forEach((cell, index) => {
      rows.push(measure(cell, `block-${blockIndex + 1}-operator-header-${index + 1}`));
    });
  });

  const info = measure(
    composition.querySelector('.matrix-print-info-copy'),
    'information-cards'
  );
  const compositionMetrics = measure(composition, 'composition');
  const pageHeightMm = 210;
  const pageMarginMm = 4;
  const availableHeightMm = pageHeightMm - pageMarginMm * 2;
  const blockMetrics = rows.filter(item => item?.name.endsWith('-table'));
  const blockHeightMm = blockMetrics.reduce((sum, item) => sum + item.heightMm, 0);
  const titleHeightMm = rows
    .filter(item => item?.name.includes('-title'))
    .reduce((sum, item) => sum + item.heightMm, 0);
  const result = {
    page: {
      expectedWidthMm: 297,
      expectedHeightMm: pageHeightMm,
      marginsMm: pageMarginMm,
      availableWidthMm: 289,
      availableHeightMm
    },
    composition: compositionMetrics,
    information: info,
    blockTables: blockMetrics,
    titleHeightMm,
    blockHeightMm,
    measuredSumMm: (info?.heightMm || 0) + titleHeightMm + blockHeightMm,
    remainingMm: availableHeightMm - ((info?.heightMm || 0) + titleHeightMm + blockHeightMm),
    elements: rows
  };

  window.__ILU_PRINT_DIAGNOSTICS__ = result;
  console.table([compositionMetrics, info, ...blockMetrics]);
  console.table(rows);
  console.table([result.page, {
    titleHeightMm,
    blockHeightMm,
    measuredSumMm: result.measuredSumMm,
    remainingMm: result.remainingMm
  }]);
  return result;
}

window.collectIluPrintDiagnostics = collectIluPrintDiagnostics;
window.addEventListener('beforeprint', () => {
  collectIluPrintDiagnostics();
});

// ======================== ПЕРВИЧНЫЙ ЗАПУСК ========================
restoreSavedFilters();
restoreInfoCardsState();
startDateBarRefresh();
updateInfoCard();
if (typeof ensurePrimaryPlacementEvents === 'function') {
  ensurePrimaryPlacementEvents();
}
renderMatrix();
renderTrainingTable();
renderPlacementLog();
