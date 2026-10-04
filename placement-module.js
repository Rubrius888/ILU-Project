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
function logPlacement(opName, postName) {
  const now = new Date();
  const date = now.toLocaleDateString('ru-RU');
  placementLog.push({ date, opName, postName });
  saveState();
  renderPlacementLog();
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

    menu.appendChild(fromLabel);
    menu.appendChild(fromInput);
    menu.appendChild(toLabel);
    menu.appendChild(toInput);

    const buttons = createPlacementFilterButtons(
      () => {
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


// Отрисовка журнала расстановки
function renderPlacementLog() {
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
          colspan="3"
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

  tbody.innerHTML = filteredLog.map(entry => `
    <tr>
      <td>${entry.date}</td>
      <td>${entry.opName}</td>
      <td>${entry.postName}</td>
    </tr>
  `).join('');
}
