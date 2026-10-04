// ======================== ВЫПАДАЮЩИЙ СПИСОК (inline) ========================
function showInlineSelect(cell, currentValue, options, callback) {
  const oldSelect = document.querySelector('.inline-select');
  if (oldSelect) oldSelect.remove();
  const wrapper = document.createElement('div');
  wrapper.className = 'inline-select';
  wrapper.style.cssText = `
    position: fixed; z-index: 9999; width: 180px;
    font-size: 13px; border: 2px solid #3b82f6; border-radius: 6px;
    background: white; outline: none; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  `;
  const select = document.createElement('select');
  select.style.cssText = 'width: 100%; padding: 8px; border: none; font-size: 13px; background: white; outline: none;';
  select.size = Math.min(options.length, 6);
  options.forEach(opt => {
    const optionEl = document.createElement('option');
    optionEl.value = opt.value;
    optionEl.textContent = opt.label;
    if (opt.value === currentValue) optionEl.selected = true;
    select.appendChild(optionEl);
  });
   select.onchange = () => {
    const val = select.value;
    wrapper.remove();
    document.removeEventListener('click', closeHandler);
    setTimeout(() => callback(val), 0);
  };
  const closeHandler = (e) => {
    if (!wrapper.contains(e.target)) { wrapper.remove(); document.removeEventListener('click', closeHandler); }
  };
  setTimeout(() => document.addEventListener('click', closeHandler), 0);
  select.onkeydown = (e) => {
    if (e.key === 'Escape') { wrapper.remove(); document.removeEventListener('click', closeHandler); }
  };
  wrapper.appendChild(select);
  document.body.appendChild(wrapper);
  const rect = cell.getBoundingClientRect();
  let left = rect.left, top = rect.bottom + 2;
  const wrapperHeight = select.size * 24 + 20;
  if (left + 180 > window.innerWidth) left = window.innerWidth - 180 - 5;
  if (left < 5) left = 5;
  if (top + wrapperHeight > window.innerHeight) top = rect.top - wrapperHeight - 2;
  if (top < 5) top = 5;
  wrapper.style.left = left + 'px';
  wrapper.style.top = top + 'px';
  setTimeout(() => select.focus(), 50);
}

// ======================== МОДАЛЬНОЕ ОКНО (по центру) ========================
function showCenteredSelect(titleText, currentValue, options, callback) {
  const oldSelect = document.querySelector('.inline-select');
  if (oldSelect) oldSelect.remove();
  const wrapper = document.createElement('div');
  wrapper.className = 'inline-select';
  wrapper.style.cssText = `
    position: fixed; z-index: 9999; top: 50%; left: 50%; transform: translate(-50%, -50%);
    width: 250px; background: white; border-radius: 12px;
    box-shadow: 0 8px 30px rgba(0,0,0,0.2); padding: 12px;
  `;
  const title = document.createElement('div');
  title.textContent = titleText;
  title.style.cssText = 'font-weight:700; font-size:14px; margin-bottom:8px; color:#0f172a;';
  wrapper.appendChild(title);
  options.forEach(opt => {
    const btn = document.createElement('div');
    btn.textContent = opt.label;
    const isActive = opt.value === currentValue;
    btn.style.cssText = `
      padding: 10px 14px; margin: 4px 0; border-radius: 8px; cursor: pointer;
      font-size: 14px; font-weight: 500;
      background: ${isActive ? '#e0f2fe' : '#f8fafc'};
      color: ${isActive ? '#0369a1' : '#1e293b'};
    `;
    btn.onmouseenter = () => { if (!isActive) btn.style.background = '#f1f5f9'; };
    btn.onmouseleave = () => { if (!isActive) btn.style.background = '#f8fafc'; };
    btn.onclick = () => { callback(opt.value); wrapper.remove(); };
    wrapper.appendChild(btn);
  });
  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Отмена';
  cancelBtn.style.cssText = 'width: 100%; margin-top: 8px; padding: 8px; border: 1px solid #cbd5e1; border-radius: 8px; background: white; cursor: pointer; font-size: 13px;';
  cancelBtn.onclick = () => wrapper.remove();
  wrapper.appendChild(cancelBtn);
  const escHandler = (e) => {
    if (e.key === 'Escape') { wrapper.remove(); document.removeEventListener('keydown', escHandler); }
  };
  document.addEventListener('keydown', escHandler);
  document.body.appendChild(wrapper);
}

// ======================== КОНТЕКСТНОЕ МЕНЮ ========================
function hideMenu() { if (currentMenu) { currentMenu.remove(); currentMenu = null; } }
function showOperatorMenu(event, name) {
  event.stopPropagation(); hideMenu();
  const menu = document.createElement('div'); menu.className = 'context-menu';
  menu.innerHTML = `
    <div onclick="editOperator('${name}');hideMenu();">✏️ Редактировать</div>
    <div class="danger" onclick="deleteOperator('${name}');hideMenu();">🗑️ Удалить</div>
  `;
  menu.style.left = event.clientX + 'px'; menu.style.top = event.clientY + 'px';
  document.body.appendChild(menu); currentMenu = menu;
  setTimeout(() => document.addEventListener('click', hideMenu, { once: true }), 0);
}
function showPostMenu(event, name) {
  event.stopPropagation(); hideMenu();
  const menu = document.createElement('div'); menu.className = 'context-menu';
  menu.innerHTML = `
    <div onclick="editPost('${name}');hideMenu();">✏️ Редактировать</div>
    <div class="danger" onclick="deletePost('${name}');hideMenu();">🗑️ Удалить</div>
  `;
  menu.style.left = event.clientX + 'px'; menu.style.top = event.clientY + 'px';
  document.body.appendChild(menu); currentMenu = menu;
  setTimeout(() => document.addEventListener('click', hideMenu, { once: true }), 0);
}
document.addEventListener('click', function(e) {
  if (currentMenu && !currentMenu.contains(e.target)) { hideMenu(); }
});

// ======================== ВКЛАДКИ ========================
function openTab(evt, id) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  evt.currentTarget.classList.add('active');
  document.getElementById(id).classList.add('active');
}

// ======================== КАЛЕНДАРЬ ========================
function updateDateBar() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.toLocaleString('ru-RU', { month: 'long' });
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const days = Math.floor((now - startOfYear) / (1000 * 60 * 60 * 24));
  const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);
  const dateStr = now.toLocaleString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  document.getElementById('dateBar').innerHTML =
    `<div>📅 Год: <span>${year}</span></div>` +
    `<div>📅 Месяц: <span>${month}</span></div>` +
    `<div>📅 Неделя: <span>№${weekNumber}</span></div>` +
    `<div>📅 Дата: <span>${dateStr}</span></div>`;
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
document.getElementById('filterDepartment').addEventListener('change', updateInfoCard);
document.getElementById('filterWorkshop').addEventListener('change', updateInfoCard);
document.getElementById('filterSection').addEventListener('change', updateInfoCard);
document.getElementById('filterShift').addEventListener('change', updateInfoCard);