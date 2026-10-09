// ======================== ВЫПАДАЮЩИЙ СПИСОК ========================

function showInlineSelect(
  cell,
  currentValue,
  options,
  callback
) {
  const oldSelect = document.querySelector('.inline-select');

  if (oldSelect) {
    if (typeof oldSelect.__close === 'function') {
      oldSelect.__close();
    } else {
      oldSelect.remove();
    }
  }

  const wrapper = document.createElement('div');

  wrapper.className = 'inline-select';

  wrapper.style.cssText = `
    position: fixed;
    z-index: 9999;
    width: 180px;
    font-size: 13px;
    border: 2px solid #3b82f6;
    border-radius: 6px;
    background: white;
    outline: none;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    box-sizing: border-box;
  `;

  const select = document.createElement('select');

  select.style.cssText = `
    width: 100%;
    padding: 8px;
    border: none;
    font-size: 13px;
    background: white;
    outline: none;
    box-sizing: border-box;
  `;

  select.size = Math.min(options.length, 6);

  options.forEach(option => {
    const optionElement =
      document.createElement('option');

    optionElement.value = option.value;
    optionElement.textContent = option.label;

    if (option.value === currentValue) {
      optionElement.selected = true;
    }

    select.appendChild(optionElement);
  });

  wrapper.appendChild(select);
  document.body.appendChild(wrapper);

  let closed = false;

  const removeListeners = () => {
    document.removeEventListener('click', closeHandler);
    window.removeEventListener('resize', reposition);
    window.removeEventListener('scroll', reposition, true);
  };

  const close = () => {
    if (closed) return;
    closed = true;
    removeListeners();
    wrapper.remove();
  };

  // Позволяет корректно закрыть список при открытии другого списка,
  // переключении вкладки или повторной отрисовке интерфейса.
  wrapper.__close = close;

  const getVisibleBounds = () => {
    const matrixContainer = cell.closest('.matrix-container');
    const containerRect = matrixContainer?.getBoundingClientRect();

    return {
      left: Math.max(5, containerRect?.left ?? 0),
      top: Math.max(5, containerRect?.top ?? 0),
      right: Math.min(
        window.innerWidth - 5,
        containerRect?.right ?? window.innerWidth - 5
      ),
      bottom: Math.min(
        window.innerHeight - 5,
        containerRect?.bottom ?? window.innerHeight - 5
      )
    };
  };

  const reposition = () => {
    if (closed || !cell.isConnected) {
      close();
      return;
    }

    const cellRect = cell.getBoundingClientRect();
    const bounds = getVisibleBounds();
    const cellVisible =
      cellRect.right > bounds.left &&
      cellRect.left < bounds.right &&
      cellRect.bottom > bounds.top &&
      cellRect.top < bounds.bottom;

    if (!cellVisible || bounds.right <= bounds.left || bounds.bottom <= bounds.top) {
      close();
      return;
    }

    const availableWidth = Math.max(1, bounds.right - bounds.left);
    wrapper.style.width = `${Math.min(180, availableWidth)}px`;
    const naturalRect = wrapper.getBoundingClientRect();

    const measuredHeight = naturalRect.height;
    const spaceBelow = Math.max(0, bounds.bottom - cellRect.bottom - 2);
    const spaceAbove = Math.max(0, cellRect.top - bounds.top - 2);
    const opensBelow =
      measuredHeight <= spaceBelow || spaceBelow >= spaceAbove;
    const availableHeight = opensBelow ? spaceBelow : spaceAbove;

    if (measuredHeight > availableHeight) {
      wrapper.style.maxHeight = `${Math.max(1, availableHeight)}px`;
      wrapper.style.overflowY = 'auto';
      select.style.maxHeight = `${Math.max(1, availableHeight - 4)}px`;
      select.style.overflowY = 'auto';
    } else {
      wrapper.style.maxHeight = '';
      wrapper.style.overflowY = '';
      select.style.maxHeight = '';
      select.style.overflowY = '';
    }

    const popupRect = wrapper.getBoundingClientRect();
    const left = Math.min(
      Math.max(bounds.left, cellRect.left),
      Math.max(bounds.left, bounds.right - popupRect.width)
    );
    const preferredTop = opensBelow
      ? cellRect.bottom + 2
      : cellRect.top - popupRect.height - 2;
    const top = Math.min(
      Math.max(bounds.top, preferredTop),
      Math.max(bounds.top, bounds.bottom - popupRect.height)
    );

    wrapper.style.left = `${left}px`;
    wrapper.style.top = `${top}px`;
  };

  const closeHandler = event => {
    if (!wrapper.contains(event.target)) {
      close();
    }
  };

  select.onchange = () => {
    const value = select.value;
    close();
    setTimeout(() => callback(value), 0);
  };

  select.onkeydown = event => {
    if (event.key === 'Escape') {
      close();
    }
  };

  reposition();

  window.addEventListener('resize', reposition);
  window.addEventListener('scroll', reposition, true);
  setTimeout(() => {
    if (closed) return;
    document.addEventListener('click', closeHandler);
  }, 0);

  setTimeout(() => {
    if (!closed) select.focus();
  }, 50);
}

// ======================== МОДАЛЬНОЕ ОКНО ========================

function showCenteredSelect(
  titleText,
  currentValue,
  options,
  callback
) {
  const oldSelect = document.querySelector('.inline-select');

  if (oldSelect) {
    if (typeof oldSelect.__close === 'function') {
      oldSelect.__close();
    } else {
      oldSelect.remove();
    }
  }

  const wrapper = document.createElement('div');

  wrapper.className = 'inline-select';

  wrapper.style.cssText = `
    position: fixed;
    z-index: 9999;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 250px;
    background: white;
    border-radius: 12px;
    box-shadow: 0 8px 30px rgba(0,0,0,0.2);
    padding: 12px;
  `;

  const title = document.createElement('div');

  title.textContent = titleText;

  title.style.cssText = `
    font-weight: 700;
    font-size: 14px;
    margin-bottom: 8px;
    color: #0f172a;
  `;

  wrapper.appendChild(title);

  options.forEach(option => {
    const button = document.createElement('div');
    const isActive =
      option.value === currentValue;

    button.textContent = option.label;

    button.style.cssText = `
      padding: 10px 14px;
      margin: 4px 0;
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      background: ${isActive ? '#e0f2fe' : '#f8fafc'};
      color: ${isActive ? '#0369a1' : '#1e293b'};
    `;

    button.onmouseenter = () => {
      if (!isActive) {
        button.style.background = '#f1f5f9';
      }
    };

    button.onmouseleave = () => {
      if (!isActive) {
        button.style.background = '#f8fafc';
      }
    };

    button.onclick = () => {
      callback(option.value);
      wrapper.remove();
    };

    wrapper.appendChild(button);
  });

  const cancelButton =
    document.createElement('button');

  cancelButton.textContent = 'Отмена';

  cancelButton.style.cssText = `
    width: 100%;
    margin-top: 8px;
    padding: 8px;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    background: white;
    cursor: pointer;
    font-size: 13px;
  `;

  cancelButton.onclick = () => {
    wrapper.remove();
  };

  wrapper.appendChild(cancelButton);

  const escapeHandler = event => {
    if (event.key === 'Escape') {
      wrapper.remove();

      document.removeEventListener(
        'keydown',
        escapeHandler
      );
    }
  };

  document.addEventListener(
    'keydown',
    escapeHandler
  );

  document.body.appendChild(wrapper);
}

// ======================== КОНТЕКСТНОЕ МЕНЮ ========================

function hideMenu() {
  if (currentMenu) {
    const menu = currentMenu;
    currentMenu = null;

    if (typeof menu.__cleanup === 'function') {
      menu.__cleanup();
    }

    menu.remove();
  }
}

function positionContextMenu(menu, anchor) {
  const gap = 4;
  const viewportPadding = 8;
  const matrixContainer = anchor.closest('.matrix-container');
  const preferredWidth = menu.getBoundingClientRect().width;

  const getVisibleBounds = () => {
    const containerRect = matrixContainer?.getBoundingClientRect();

    return {
      left: Math.max(viewportPadding, containerRect?.left ?? 0),
      top: Math.max(viewportPadding, containerRect?.top ?? 0),
      right: Math.min(
        window.innerWidth - viewportPadding,
        containerRect?.right ?? window.innerWidth - viewportPadding
      ),
      bottom: Math.min(
        window.innerHeight - viewportPadding,
        containerRect?.bottom ?? window.innerHeight - viewportPadding
      )
    };
  };

  const closeIfCurrent = () => {
    if (currentMenu === menu) {
      hideMenu();
    } else if (typeof menu.__cleanup === 'function') {
      menu.__cleanup();
      menu.remove();
    }
  };

  const reposition = () => {
    if (!anchor.isConnected || !menu.isConnected) {
      closeIfCurrent();
      return;
    }

    const anchorRect = anchor.getBoundingClientRect();
    const bounds = getVisibleBounds();
    const anchorVisible =
      anchorRect.right > bounds.left &&
      anchorRect.left < bounds.right &&
      anchorRect.bottom > bounds.top &&
      anchorRect.top < bounds.bottom;

    if (
      !anchorVisible ||
      bounds.right <= bounds.left ||
      bounds.bottom <= bounds.top
    ) {
      closeIfCurrent();
      return;
    }

    const availableWidth = Math.max(1, bounds.right - bounds.left);
    menu.style.width = `${Math.min(preferredWidth, availableWidth)}px`;
    menu.style.minWidth = `${Math.min(preferredWidth, availableWidth)}px`;
    menu.style.maxHeight = '';
    menu.style.overflowY = '';
    menu.style.boxSizing = 'border-box';

    const naturalRect = menu.getBoundingClientRect();
    const spaceBelow = Math.max(0, bounds.bottom - anchorRect.bottom - gap);
    const spaceAbove = Math.max(0, anchorRect.top - bounds.top - gap);
    const opensBelow =
      naturalRect.height <= spaceBelow || spaceBelow >= spaceAbove;
    const availableHeight = opensBelow ? spaceBelow : spaceAbove;

    if (naturalRect.height > availableHeight) {
      menu.style.maxHeight = `${Math.max(1, availableHeight)}px`;
      menu.style.overflowY = 'auto';
    }

    const menuRect = menu.getBoundingClientRect();
    const left = Math.min(
      Math.max(bounds.left, anchorRect.left),
      Math.max(bounds.left, bounds.right - menuRect.width)
    );
    const preferredTop = opensBelow
      ? anchorRect.bottom + gap
      : anchorRect.top - menuRect.height - gap;
    const top = Math.min(
      Math.max(bounds.top, preferredTop),
      Math.max(bounds.top, bounds.bottom - menuRect.height)
    );

    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
  };

  menu.__cleanup = () => {
    window.removeEventListener('resize', reposition);
    window.removeEventListener('scroll', reposition, true);
  };

  reposition();
  window.addEventListener('resize', reposition);
  window.addEventListener('scroll', reposition, true);
}

function showOperatorMenu(event, name, index) {
  event.stopPropagation();
  hideMenu();

  const anchor = event.currentTarget || event.target;

  const menu = document.createElement('div');

  menu.className = 'context-menu';

  const operatorIndex = Number.isInteger(index)
    ? index
    : operators.indexOf(name);
  const canMoveLeft = operatorIndex > 0;
  const canMoveRight =
    operatorIndex !== -1 && operatorIndex < operators.length - 1;

  menu.innerHTML = `
    <div class="${canMoveLeft ? '' : 'disabled'}"
      ${canMoveLeft ? `onclick="moveOperator(${operatorIndex}, -1);hideMenu();"` : 'aria-disabled="true"'}>
      ◀ Переместить влево
    </div>

    <div class="${canMoveRight ? '' : 'disabled'}"
      ${canMoveRight ? `onclick="moveOperator(${operatorIndex}, 1);hideMenu();"` : 'aria-disabled="true"'}>
      ▶ Переместить вправо
    </div>

    <div onclick="editOperator('${name}');hideMenu();">
      ✏️ Редактировать
    </div>

    <div
      class="danger"
      onclick="deleteOperator('${name}');hideMenu();"
    >
      🗑️ Удалить
    </div>
  `;

  menu.style.position = 'fixed';

  document.body.appendChild(menu);
  currentMenu = menu;
  positionContextMenu(menu, anchor);
}

function showPostMenu(event, name, index) {
  event.stopPropagation();
  hideMenu();

  const anchor = event.currentTarget || event.target;

  const menu = document.createElement('div');

  menu.className = 'context-menu';

  const postIndex = Number.isInteger(index)
    ? index
    : posts.indexOf(name);
  const canMoveUp = postIndex > 0;
  const canMoveDown =
    postIndex !== -1 && postIndex < posts.length - 1;

  menu.innerHTML = `
    <div class="${canMoveUp ? '' : 'disabled'}"
      ${canMoveUp ? `onclick="movePost(${postIndex}, -1);hideMenu();"` : 'aria-disabled="true"'}>
      ▲ Переместить вверх
    </div>

    <div class="${canMoveDown ? '' : 'disabled'}"
      ${canMoveDown ? `onclick="movePost(${postIndex}, 1);hideMenu();"` : 'aria-disabled="true"'}>
      ▼ Переместить вниз
    </div>

    <div onclick="editPost('${name}');hideMenu();">
      ✏️ Редактировать
    </div>

    <div
      class="danger"
      onclick="deletePost('${name}');hideMenu();"
    >
      🗑️ Удалить
    </div>
  `;

  menu.style.position = 'fixed';

  document.body.appendChild(menu);
  currentMenu = menu;
  positionContextMenu(menu, anchor);
}

document.addEventListener('click', event => {
  if (
    currentMenu &&
    !currentMenu.contains(event.target)
  ) {
    hideMenu();
  }
});

// ======================== ВКЛАДКИ ========================

function openTab(event, id) {
    // Закрываем открытые всплывающие окна выбора
  document.querySelectorAll('.inline-select').forEach(el => {
    if (typeof el.__close === 'function') {
      el.__close();
    } else {
      el.remove();
    }
  });
  
  document
    .querySelectorAll('.tab')
    .forEach(tab => {
      tab.classList.remove('active');
    });

  document
    .querySelectorAll('.tab-content')
    .forEach(content => {
      content.classList.remove('active');
    });

  event.currentTarget.classList.add('active');

  const selectedTab =
    document.getElementById(id);

  if (selectedTab) {
    selectedTab.classList.add('active');
  }

  if (
    id === 'stats' &&
    typeof renderStatsDashboard === 'function'
  ) {
    renderStatsDashboard();
  }
}

// ======================== КАЛЕНДАРЬ ========================

function updateDateBar() {
  const now = new Date();
  const year = now.getFullYear();

  const month = now.toLocaleString(
    'ru-RU',
    { month: 'long' }
  );

  const startOfYear =
    new Date(now.getFullYear(), 0, 1);

  const days = Math.floor(
    (now - startOfYear) /
    (1000 * 60 * 60 * 24)
  );

  const weekNumber = Math.ceil(
    (days + startOfYear.getDay() + 1) / 7
  );

  const dateString = now.toLocaleString(
    'ru-RU',
    {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }
  );

  document.getElementById('dateBar').innerHTML =
    `<div>📅 Год: <span>${year}</span></div>` +
    `<div>📅 Месяц: <span>${month}</span></div>` +
    `<div>📅 Неделя: <span>№${weekNumber}</span></div>` +
    `<div>📅 Дата: <span>${dateString}</span></div>`;
}

// ======================== ИНФОРМАЦИОННЫЕ КАРТОЧКИ ========================

const INFO_CARDS_COLLAPSED_KEY =
  'ilu-se4-info-cards-collapsed';

function setInfoCardsCollapsed(collapsed) {
  const container = document.getElementById('matrixInfo');
  const button = document.getElementById('toggleInfoCardsButton');

  if (!container || !button) {
    return;
  }

  const isCollapsed = Boolean(collapsed);

  container.classList.toggle(
    'info-cards-collapsed',
    isCollapsed
  );

  button.setAttribute(
    'aria-expanded',
    String(!isCollapsed)
  );

  button.textContent = isCollapsed
    ? '▾ Развернуть инфокарты'
    : '▴ Свернуть инфокарты';

  button.title = isCollapsed
    ? 'Развернуть информационные карточки'
    : 'Свернуть информационные карточки';
}

function toggleInfoCards() {
  const container = document.getElementById('matrixInfo');

  if (!container) {
    return;
  }

  const collapsed =
    !container.classList.contains('info-cards-collapsed');

  setInfoCardsCollapsed(collapsed);

  try {
    localStorage.setItem(
      INFO_CARDS_COLLAPSED_KEY,
      collapsed ? '1' : '0'
    );
  } catch (error) {
    // Режим без localStorage не должен ломать интерфейс.
  }
}

function restoreInfoCardsState() {
  let collapsed = false;

  try {
    collapsed =
      localStorage.getItem(INFO_CARDS_COLLAPSED_KEY) === '1';
  } catch (error) {
    collapsed = false;
  }

  setInfoCardsCollapsed(collapsed);
}

// ======================== СИНХРОНИЗАЦИЯ ФИЛЬТРОВ ========================

function updateInfoCard() {
  const department =
    document.getElementById('filterDepartment').value;

  const workshop =
    document.getElementById('filterWorkshop').value;

  const section =
    document.getElementById('filterSection').value;

  const shift =
    document.getElementById('filterShift').value;

  filterState.department = department;
  filterState.workshop = workshop;
  filterState.section = section;
  filterState.shift = shift;

  document.getElementById('infoDepartment')
    .textContent = department;

  document.getElementById('infoWorkshop')
    .textContent = workshop;

  document.getElementById('infoSection')
    .textContent = section;

  document.getElementById('infoShift')
    .textContent = shift;

  document.getElementById('infoWorkshopChief')
    .textContent = workshopChief || '—';

  document.getElementById('infoSectionChief')
    .textContent = sectionChief || '—';

  saveState();
}

document
  .getElementById('filterDepartment')
  .addEventListener(
    'change',
    updateInfoCard
  );

document
  .getElementById('filterWorkshop')
  .addEventListener(
    'change',
    updateInfoCard
  );

document
  .getElementById('filterSection')
  .addEventListener(
    'change',
    updateInfoCard
  );

document
  .getElementById('filterShift')
  .addEventListener(
    'change',
    updateInfoCard
  );
