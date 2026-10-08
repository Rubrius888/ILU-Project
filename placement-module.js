// Подсвечиваем тех кто давно не стоял
function getPlacementAgeColor(opName, postName) {
  // Ищем самую позднюю дату в журнале для этого оператора на этом посту
  let lastDate = null;
  for (const entry of placementLog) {
    if (entry.opName === opName && entry.postName === postName) {
      const parts = entry.date.split('.');
      const date = new Date(parts[2], parts[1] - 1, parts[0]);
      if (!lastDate || date > lastDate) lastDate = date;
    }
  }
  if (!lastDate) return null; // никогда не стоял

  const now = new Date();
  const diffDays = Math.floor((now - lastDate) / (1000 * 60 * 60 * 24));

  if (diffDays > 60) return 'red';    // больше 2 месяцев
  if (diffDays > 30) return 'yellow'; // больше 1 месяца
  return null;
}

// Постановка в журнал расставноввки
function createPlacementId() {
  return `placement-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function escapePlacementHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getPlacementReasonText(entry) {
  if (!entry || !entry.reason) return 'Не указана';
  if (entry.reason === 'Другое') {
    return entry.reasonText
      ? `Другое: ${entry.reasonText}`
      : 'Другое';
  }
  return entry.reason;
}

function getPlacementReasonClass(entry) {
  switch (entry?.reason) {
    case 'Ротация': return 'rotation';
    case 'Замена': return 'replacement';
    case 'Первичная расстановка': return 'primary';
    case 'Обучение': return 'production';
    case 'Производственная необходимость':
    case 'Болезнь': return 'sick';
    case 'Другое': return 'other';
    default: return 'unknown';
  }
}

function normalizePlacementLog() {
  if (!Array.isArray(placementLog)) {
    placementLog = [];
    return;
  }
  let changed = false;
  const usedIds = new Set();
  placementLog = placementLog.map((entry, index) => {
    const normalized = { ...entry };
    if (!normalized.id || usedIds.has(normalized.id)) {
      normalized.id = `placement-legacy-${Date.now()}-${index}`;
      changed = true;
    }
    usedIds.add(normalized.id);
    if (
      normalized.reason !== undefined &&
      normalized.reason !== '' &&
      typeof normalized.reason !== 'string'
    ) {
      normalized.reason = String(normalized.reason);
      changed = true;
    }
    return normalized;
  });
  if (changed && typeof saveState === 'function') saveState();
}

function logPlacement(opName, postName, reason = '') {
  const now = new Date();
  const date = now.toLocaleDateString('ru-RU');

  // Автоматическая запись обучения не должна дублироваться при повторном
  // открытии или сохранении одной и той же формы обучения.
  if (
    reason &&
    placementLog.some(entry =>
      entry.date === date &&
      entry.opName === opName &&
      entry.postName === postName &&
      entry.reason === reason
    )
  ) {
    return;
  }

  const entry = {
    id: createPlacementId(),
    date,
    opName,
    postName,
    reason,
    reasonText: '',
    comment: ''
  };
  placementLog.push(entry);
  saveState();
  renderPlacementLog();

  if (reason) {
    return;
  }

  openPlacementEditDialog(entry.id, true);
}

function ensureDailyInitialPlacement() {
  const today = new Date().toLocaleDateString('ru-RU');

  if (placementInitialPlacementDate === today) {
    return false;
  }

  // Если запись за сегодня уже существует, считаем день обработанным.
  // Это также предотвращает восстановление записи, удалённой пользователем.
  if (placementLog.some(entry =>
    entry.date === today &&
    entry.reason === 'Первичная расстановка'
  )) {
    placementInitialPlacementDate = today;
    saveState();
    return false;
  }

  const assignments = [];

  for (let row = 0; row < posts.length; row++) {
    for (let col = 0; col < operators.length; col++) {
      const status = attendanceData?.[row]?.[col];

      if (status === '○' || status === '△') {
        assignments.push({
          opName: operators[col],
          postName: posts[row],
          status
        });
      }
    }
  }

  // Пустая матрица не фиксирует день обработанным.
  if (assignments.length === 0) {
    return false;
  }

  assignments.forEach(({ opName, postName, status }) => {
    placementLog.push({
      id: createPlacementId(),
      date: today,
      opName,
      postName,
      status,
      reason: 'Первичная расстановка',
      reasonText: '',
      comment: ''
    });
  });

  placementInitialPlacementDate = today;
  saveState();
  return true;
}

//Сортировка журнала расстановки
function getPlacementSortValue(entry, key) {
  if (key === 'date') {
    const parts = entry.date.split('.');

    if (parts.length === 3) {
      return new Date(
        Number(parts[2]),
        Number(parts[1]) - 1,
        Number(parts[0])
      ).getTime();
    }

    return 0;
  }

  return String(entry[key] || '')
    .toLocaleLowerCase('ru-RU');
}

function sortPlacementLog(key) {
  if (placementSort.key === key) {
    placementSort.direction =
      placementSort.direction === 'asc'
        ? 'desc'
        : 'asc';
  } else {
    placementSort.key = key;
    placementSort.direction = 'asc';
  }

  renderPlacementLog();
}
function closePlacementFilterMenu(event) {
  if (
    event &&
    placementFilterMenu &&
    placementFilterMenu.contains(event.target)
  ) {
    return;
  }

  if (placementFilterMenu) {
    placementFilterMenu.remove();
    placementFilterMenu = null;
  }
}

function placementDateToIso(value) {
  const parts = String(value || '').split('.');

  if (parts.length !== 3) {
    return '';
  }

  return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
}

function getFilteredPlacementLog() {
  return placementLog.filter(entry => {
    const date = placementDateToIso(entry.date);

    if (
      placementFilters.dateFrom &&
      date < placementFilters.dateFrom
    ) {
      return false;
    }

    if (
      placementFilters.dateTo &&
      date > placementFilters.dateTo
    ) {
      return false;
    }

    if (
      placementFilters.operators.length > 0 &&
      !placementFilters.operators.includes(entry.opName)
    ) {
      return false;
    }

    if (
      placementFilters.posts.length > 0 &&
      !placementFilters.posts.includes(entry.postName)
    ) {
      return false;
    }

    return true;
  });
}

//Поиск в журнале
function openPlacementFilterMenu(event, type) {
  event.stopPropagation();
  closePlacementFilterMenu();

  const menu = document.createElement('div');

  placementFilterMenu = menu;
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

  const title = document.createElement('div');

  title.textContent =
    type === 'date'
      ? 'Фильтр по дате'
      : type === 'operator'
        ? 'Фильтр по оператору'
        : 'Фильтр по посту';

  title.style.cssText = `
    margin-bottom: 10px;
    font-weight: 700;
    color: #0f172a;
  `;

  menu.appendChild(title);

  if (type === 'date') {
    const fromLabel = document.createElement('label');
    fromLabel.textContent = 'Дата от';
    fromLabel.style.display = 'block';

    const fromInput = document.createElement('input');
    fromInput.type = 'date';
    fromInput.value = placementFilters.dateFrom;

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
    toInput.value = placementFilters.dateTo;

    toInput.style.cssText = `
      width: 100%;
      box-sizing: border-box;
      margin: 4px 0 12px;
      padding: 7px;
    `;

    const syncDateRangeLimits = () =>
      syncDateInputRangeLimits(fromInput, toInput);

    fromInput.addEventListener(
      'blur',
      syncDateRangeLimits
    );

    toInput.addEventListener(
      'blur',
      syncDateRangeLimits
    );

    syncDateRangeLimits();

    menu.appendChild(fromLabel);
    menu.appendChild(fromInput);
    menu.appendChild(toLabel);
    menu.appendChild(toInput);

    const buttons = createPlacementFilterButtons(
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

        placementFilters.dateFrom = fromInput.value;
        placementFilters.dateTo = toInput.value;
        closePlacementFilterMenu();
        renderPlacementLog();
      },
      () => {
        placementFilters.dateFrom = '';
        placementFilters.dateTo = '';
        closePlacementFilterMenu();
        renderPlacementLog();
      }
    );

    menu.appendChild(buttons);
  } else {
    const values = [
      ...new Set(
        placementLog.map(entry =>
          type === 'operator'
            ? entry.opName
            : entry.postName
        )
      )
    ].sort((a, b) =>
      a.localeCompare(b, 'ru')
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
    selectAll.checked = true;

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

      const selectedValues =
        type === 'operator'
          ? placementFilters.operators
          : placementFilters.posts;

      checkbox.checked =
        selectedValues.length === 0 ||
        selectedValues.includes(value);

      label.appendChild(checkbox);
      label.appendChild(
        document.createTextNode(` ${value}`)
      );

      valuesContainer.appendChild(label);
      checkboxes.push({ checkbox, label });
    });

    selectAll.addEventListener('change', () => {
      checkboxes.forEach(item => {
        item.checkbox.checked = selectAll.checked;
      });
    });

    search.addEventListener('input', () => {
      const query = search.value.toLocaleLowerCase('ru');

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

    const buttons = createPlacementFilterButtons(
      () => {
        const selected = checkboxes
          .filter(item => item.checkbox.checked)
          .map(item => item.checkbox.value);

        if (type === 'operator') {
          placementFilters.operators = selected;
        } else {
          placementFilters.posts = selected;
        }

        closePlacementFilterMenu();
        renderPlacementLog();
      },
      () => {
        if (type === 'operator') {
          placementFilters.operators = [];
        } else {
          placementFilters.posts = [];
        }

        closePlacementFilterMenu();
        renderPlacementLog();
      }
    );

    menu.appendChild(buttons);
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
      closePlacementFilterMenu,
      { once: true }
    );
  }, 0);
}

function createPlacementFilterButtons(
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

function closePlacementDialog(overlay) {
  if (overlay) overlay.remove();
}

function createPlacementDialog(titleText, buildContent) {
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position:fixed;inset:0;z-index:10000;display:flex;align-items:center;
    justify-content:center;padding:16px;background:rgba(15,23,42,.48);
  `;
  const modal = document.createElement('div');
  modal.style.cssText = `
    width:min(520px,calc(100vw - 32px));max-height:calc(100vh - 32px);
    overflow-y:auto;box-sizing:border-box;padding:22px;border-radius:12px;
    background:#fff;box-shadow:0 20px 60px rgba(0,0,0,.28);font-family:Arial,sans-serif;
  `;
  const header = document.createElement('div');
  header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;';
  const title = document.createElement('h3');
  title.textContent = titleText;
  title.style.cssText = 'margin:0;color:#0f172a;';
  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.textContent = '×';
  closeButton.setAttribute('aria-label', 'Закрыть');
  closeButton.style.cssText = 'border:0;background:transparent;color:#64748b;font-size:24px;line-height:1;cursor:pointer;';
  header.append(title, closeButton);
  modal.appendChild(header);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  const close = () => closePlacementDialog(overlay);
  closeButton.onclick = close;
  let backdropMouseDown = false;
  overlay.addEventListener('mousedown', event => {
    backdropMouseDown = event.button === 0 && event.target === overlay;
  });
  overlay.addEventListener('mouseup', event => {
    const closeByBackdrop = backdropMouseDown &&
      event.button === 0 &&
      event.target === overlay;
    backdropMouseDown = false;
    if (closeByBackdrop) close();
  });
  buildContent(modal, close);
  return { overlay, modal, close };
}

function placementFormLabel(text) {
  const label = document.createElement('label');
  label.textContent = text;
  label.style.cssText = 'display:block;margin:0 0 6px;color:#334155;font-size:13px;font-weight:600;';
  return label;
}

function placementFormInput(type = 'text') {
  const input = document.createElement('input');
  input.type = type;
  input.style.cssText = 'width:100%;box-sizing:border-box;padding:9px;border:1px solid #cbd5e1;border-radius:6px;margin-bottom:12px;';
  return input;
}

function placementFormSelect() {
  const select = document.createElement('select');
  select.style.cssText = 'width:100%;box-sizing:border-box;padding:9px;border:1px solid #cbd5e1;border-radius:6px;margin-bottom:12px;background:#fff;';
  return select;
}

function openPlacementEditDialog(entryId, isNew = false) {
  const entry = placementLog.find(item => item.id === entryId);
  if (!entry) return;

  createPlacementDialog(isNew ? 'Добавление записи расстановки' : 'Редактирование записи расстановки', (modal, close) => {
    const dateLabel = placementFormLabel('Дата');
    const dateInput = placementFormInput('date');
    dateInput.value = placementDateToIso(entry.date);

    const operatorLabel = placementFormLabel('Оператор');
    const operatorInput = placementFormSelect();
    operators.forEach(operator => {
      const option = document.createElement('option');
      option.value = operator;
      option.textContent = operator;
      operatorInput.appendChild(option);
    });
    if (entry.opName && !operators.includes(entry.opName)) {
      const option = document.createElement('option');
      option.value = entry.opName;
      option.textContent = `${entry.opName} (архивная запись)`;
      operatorInput.appendChild(option);
    }
    operatorInput.value = entry.opName;

    const postLabel = placementFormLabel('Пост');
    const postInput = placementFormSelect();
    posts.forEach(post => {
      const option = document.createElement('option');
      option.value = post;
      option.textContent = post;
      postInput.appendChild(option);
    });
    if (entry.postName && !posts.includes(entry.postName)) {
      const option = document.createElement('option');
      option.value = entry.postName;
      option.textContent = `${entry.postName} (архивная запись)`;
      postInput.appendChild(option);
    }
    postInput.value = entry.postName;

    const reasonLabel = placementFormLabel('Причина перестановки');
    const reasonInput = placementFormSelect();
    [
      ['', 'Не указана'],
      ['Ротация', 'Ротация'],
      ['Замена', 'Замена'],
      ['Производственная необходимость', 'Производственная необходимость'],
      ['Обучение', 'Обучение'],
      ['Другое', 'Другое']
    ].forEach(([value, text]) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = text;
      reasonInput.appendChild(option);
    });

    // Старые записи с причиной «Болезнь» сохраняются без изменений.
    // Для их редактирования оставляем отдельный исторический вариант,
    // который не предлагается для новых записей.
    if (entry.reason === 'Болезнь') {
      const legacyOption = document.createElement('option');
      legacyOption.value = 'Болезнь';
      legacyOption.textContent = 'Болезнь (историческая)';
      reasonInput.appendChild(legacyOption);
    }

    reasonInput.value = [
      '', 'Ротация', 'Замена',
      'Производственная необходимость',
      'Обучение', 'Другое', 'Болезнь'
    ].includes(entry.reason) ? (entry.reason || '') : 'Другое';

    const customReasonInput = placementFormInput('text');
    customReasonInput.placeholder = 'Укажите причину';
    const knownReasons = [
      '',
      'Ротация',
      'Замена',
      'Производственная необходимость',
      'Обучение',
      'Другое',
      'Болезнь'
    ];
    customReasonInput.value = entry.reasonText ||
      (entry.reason && !knownReasons.includes(entry.reason) ? entry.reason : '');
    customReasonInput.style.display = reasonInput.value === 'Другое' ? 'block' : 'none';
    reasonInput.addEventListener('change', () => {
      customReasonInput.style.display = reasonInput.value === 'Другое' ? 'block' : 'none';
    });

    const commentLabel = placementFormLabel('Комментарий');
    const commentInput = document.createElement('textarea');
    commentInput.rows = 3;
    commentInput.placeholder = 'Комментарий';
    commentInput.value = entry.comment || '';
    commentInput.style.cssText = 'width:100%;box-sizing:border-box;padding:9px;border:1px solid #cbd5e1;border-radius:6px;margin-bottom:12px;resize:vertical;font-family:inherit;';

    const error = document.createElement('div');
    error.style.cssText = 'display:none;margin:0 0 10px;color:#dc2626;font-size:12px;';
    modal.append(
      dateLabel, dateInput,
      operatorLabel, operatorInput,
      postLabel, postInput,
      reasonLabel, reasonInput, customReasonInput,
      commentLabel, commentInput, error
    );

    const footer = document.createElement('div');
    footer.style.cssText = 'display:flex;justify-content:flex-end;gap:8px;';
    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.textContent = 'Отмена';
    cancel.style.cssText = 'padding:9px 16px;border:1px solid #cbd5e1;border-radius:6px;background:#fff;color:#1e293b;cursor:pointer;';
    const save = document.createElement('button');
    save.type = 'button';
    save.textContent = 'Сохранить';
    save.style.cssText = 'padding:9px 16px;border:0;border-radius:6px;background:#2563eb;color:#fff;cursor:pointer;';
    cancel.onclick = close;
    save.onclick = () => {
      if (!isCompleteDateInputValue(dateInput.value)) {
        error.textContent = 'Укажите корректную дату.';
        error.style.display = 'block';
        return;
      }
      if (!operatorInput.value || !postInput.value) {
        error.textContent = 'Выберите оператора и пост.';
        error.style.display = 'block';
        return;
      }
      if (reasonInput.value === 'Другое' && !customReasonInput.value.trim()) {
        error.textContent = 'Укажите причину в поле «Другое».';
        error.style.display = 'block';
        return;
      }
      const parts = dateInput.value.split('-');
      entry.date = `${parts[2]}.${parts[1]}.${parts[0]}`;
      entry.opName = operatorInput.value;
      entry.postName = postInput.value;
      entry.reason = reasonInput.value;
      entry.reasonText = reasonInput.value === 'Другое'
        ? customReasonInput.value.trim()
        : '';
      entry.comment = commentInput.value.trim();
      saveState();
      renderPlacementLog();
      close();
    };
    footer.append(cancel, save);
    modal.appendChild(footer);
  });
}

function openPlacementDeleteDialog(entryId) {
  const entry = placementLog.find(item => item.id === entryId);
  if (!entry) return;
  createPlacementDialog('Удаление записи', (modal, close) => {
    const text = document.createElement('p');
    text.textContent = 'Удалить выбранную запись из журнала расстановки? Это действие изменит историю фактической работы оператора.';
    text.style.cssText = 'margin:0;color:#334155;line-height:1.5;';
    modal.appendChild(text);
    const footer = document.createElement('div');
    footer.style.cssText = 'display:flex;justify-content:flex-end;gap:8px;margin-top:20px;';
    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.textContent = 'Отмена';
    cancel.style.cssText = 'padding:9px 16px;border:1px solid #cbd5e1;border-radius:6px;background:#fff;color:#1e293b;cursor:pointer;';
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.textContent = 'Удалить';
    remove.style.cssText = 'padding:9px 16px;border:0;border-radius:6px;background:#dc2626;color:#fff;cursor:pointer;';
    let deletionHandled = false;
    const cleanupKeyboard = () => {
      document.removeEventListener('keydown', handleKeyboard, true);
    };
    const finishClose = () => {
      cleanupKeyboard();
      close();
    };
    const handleKeyboard = event => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
        finishClose();
        return;
      }

      if (event.key !== 'Enter') {
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();

      if (event.repeat || deletionHandled) {
        return;
      }

      remove.click();
    };

    document.addEventListener('keydown', handleKeyboard, true);
    cancel.onclick = finishClose;
    remove.onclick = () => {
      if (deletionHandled) return;
      deletionHandled = true;
      placementLog = placementLog.filter(item => item.id !== entryId);
      saveState();
      renderPlacementLog();
      finishClose();
    };
    footer.append(cancel, remove);
    modal.appendChild(footer);
  });
}

function printPlacementLog() {
  const period = document.getElementById('placementPrintPeriod');
  if (period) {
    const from = placementFilters.dateFrom || '';
    const to = placementFilters.dateTo || '';
    period.textContent = from || to
      ? `Выбранный период: ${from || '…'} — ${to || '…'}`
      : 'Выбранный период: все даты';
  }
  const generated = document.getElementById('placementPrintGenerated');
  if (generated) {
    generated.textContent = `Дата формирования: ${new Date().toLocaleDateString('ru-RU')}`;
  }
  if (typeof printSections === 'function') {
    printSections(['placementLog']);
  } else {
    window.print();
  }
}


// Отрисовка журнала расстановки
function renderPlacementLog() {
  // app.js восстанавливает localStorage после загрузки модулей. Поэтому
  // нормализуем записи перед каждым рендером: старые строки гарантированно
  // получат id, который передаётся в обработчики редактирования и удаления.
  normalizePlacementLog();

  const table = document.querySelector(
    '#placementLogTable'
  );

  const tbody = table?.querySelector('tbody');

  if (!table || !tbody) {
    return;
  }

  const headers = table.querySelectorAll(
    'thead th'
  );

  const filterTypes = [
    'date',
    'operator',
    'post'
  ];

  const activeFilters = [
    placementFilters.dateFrom ||
      placementFilters.dateTo,

    placementFilters.operators.length > 0,

    placementFilters.posts.length > 0
  ];

  headers.forEach((header, index) => {
    const type = filterTypes[index];

    if (!type) return;

    header.innerHTML = '';

    const title = document.createElement('span');

    title.textContent =
      type === 'date'
        ? 'Дата'
        : type === 'operator'
          ? 'Оператор'
          : 'Пост';

    const button = document.createElement('button');

    button.type = 'button';
    button.textContent =
      activeFilters[index] ? ' ▼' : ' ⏷';

    button.title = 'Открыть фильтр';

    button.style.cssText = `
      margin-left: 6px;
      padding: 1px 5px;
      border: 1px solid #94a3b8;
      border-radius: 4px;
      background: ${
        activeFilters[index]
          ? '#dbeafe'
          : '#f8fafc'
      };
      color: #1e40af;
      cursor: pointer;
    `;

    button.onclick = event => {
      openPlacementFilterMenu(event, type);
    };

    header.appendChild(title);
    header.appendChild(button);
  });

  const filteredLog =
    getFilteredPlacementLog();

  if (filteredLog.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td
          colspan="4"
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

  const sortedLog = [...filteredLog].sort((a, b) => {
    const left = getPlacementSortValue(a, placementSort.key);
    const right = getPlacementSortValue(b, placementSort.key);
    const comparison = left < right ? -1 : left > right ? 1 : 0;
    return placementSort.direction === 'desc' ? -comparison : comparison;
  });

  tbody.innerHTML = sortedLog.map(entry => `
    <tr>
      <td>${escapePlacementHtml(entry.date)}</td>
      <td>${escapePlacementHtml(entry.opName)}</td>
      <td>${escapePlacementHtml(entry.postName)}</td>
      <td class="placement-reason-cell">
        <div class="placement-reason-layout">
          <div class="placement-reason-content">
            <button
              type="button"
              class="placement-reason-badge placement-reason-${getPlacementReasonClass(entry)}"
              data-placement-action="edit"
              data-placement-id="${escapePlacementHtml(entry.id)}"
            >${escapePlacementHtml(getPlacementReasonText(entry))}</button>
            ${String(entry.comment || '').trim() ? `<div class="placement-comment">${escapePlacementHtml(String(entry.comment).trim())}</div>` : ''}
          </div>
          <button type="button" class="btn-small placement-delete-button" data-placement-action="delete" data-placement-id="${escapePlacementHtml(entry.id)}" title="Удалить запись">🗑</button>
        </div>
      </td>
    </tr>
  `).join('');

  tbody.querySelectorAll('[data-placement-action="edit"]').forEach(button => {
    button.onclick = event => {
      event.preventDefault();
      event.stopPropagation();
      openPlacementEditDialog(button.dataset.placementId);
    };
  });
  tbody.querySelectorAll('[data-placement-action="delete"]').forEach(button => {
    button.onclick = event => {
      event.preventDefault();
      event.stopPropagation();
      openPlacementDeleteDialog(button.dataset.placementId);
    };
  });
}

normalizePlacementLog();
