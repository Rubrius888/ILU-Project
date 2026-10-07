const PLANS_STORAGE_KEY = 'ilu-se4-plans-v1';

let savedPlans = {
  development: null,
  developmentHistory: {},
  developmentSettings: { maxConcurrentTrainings: 2 },
  rotation: null,
  rotationHistory: {},
  rotationSettings: {
    durationWorkingDays: 5,
    maxConcurrentChains: 2
  }
};

function planMonthKey(year, month) {
  return `${Number(year)}-${String(Number(month) + 1).padStart(2, '0')}`;
}

function currentMonthDate() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function getRotationViewDate() {
  if (!(window.rotationPlanViewDate instanceof Date)) {
    window.rotationPlanViewDate = currentMonthDate();
  }
  return window.rotationPlanViewDate;
}

function getRotationSnapshot(year, month) {
  return savedPlans.rotationHistory?.[planMonthKey(year, month)] || null;
}

function getRotationSettings() {
  const settings = savedPlans.rotationSettings || {};
  return {
    durationWorkingDays: Math.max(
      1,
      Number.parseInt(settings.durationWorkingDays, 10) || 5
    ),
    maxConcurrentChains: Math.max(
      1,
      Number.parseInt(settings.maxConcurrentChains, 10) || 2
    )
  };
}

function getDevelopmentViewDate() {
  if (!(window.developmentPlanViewDate instanceof Date)) {
    window.developmentPlanViewDate = currentMonthDate();
  }
  return window.developmentPlanViewDate;
}

function getDevelopmentSnapshot(year, month) {
  return savedPlans.developmentHistory?.[planMonthKey(year, month)] || null;
}

function savePlans() {
  try {
    localStorage.setItem(PLANS_STORAGE_KEY, JSON.stringify(savedPlans));
  } catch (error) {
    console.error('Не удалось сохранить планинги:', error);
  }
}

function loadPlans() {
  try {
    const raw = localStorage.getItem(PLANS_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return;

    const history = parsed.developmentHistory &&
      typeof parsed.developmentHistory === 'object'
      ? { ...parsed.developmentHistory }
      : {};
    let migrated = false;

    // Backward-compatible migration of the old single-development format.
    if (parsed.development?.year !== undefined && parsed.development?.month !== undefined) {
      const legacyKey = planMonthKey(parsed.development.year, parsed.development.month);
      if (!history[legacyKey]) {
        history[legacyKey] = parsed.development;
        migrated = true;
      }
    }

    const rotationHistory = parsed.rotationHistory &&
      typeof parsed.rotationHistory === 'object'
      ? { ...parsed.rotationHistory }
      : {};

    // Backward-compatible migration of the old single-rotation format.
    if (parsed.rotation?.year !== undefined && parsed.rotation?.month !== undefined) {
      const legacyRotationKey = planMonthKey(parsed.rotation.year, parsed.rotation.month);
      if (!rotationHistory[legacyRotationKey]) {
        rotationHistory[legacyRotationKey] = parsed.rotation;
        migrated = true;
      }
    }

    const legacyRotationLimit = Number.parseInt(
      parsed.rotationSettings?.maxConcurrentChains ??
      parsed.rotation?.rotationsPerDay,
      10
    );
    savedPlans = {
      development: parsed.development || null,
      developmentHistory: history,
      developmentSettings: {
        maxConcurrentTrainings: Math.max(
          1,
          Number.parseInt(parsed.developmentSettings?.maxConcurrentTrainings, 10) || 2
        )
      },
      rotation: parsed.rotation || null,
      rotationHistory,
      rotationSettings: {
        durationWorkingDays: Math.max(
          1,
          Number.parseInt(parsed.rotationSettings?.durationWorkingDays, 10) || 5
        ),
        maxConcurrentChains: Math.max(1, legacyRotationLimit || 2)
      }
    };
    window.developmentSettings = { ...savedPlans.developmentSettings };
    window.rotationSettings = getRotationSettings();
    if (migrated) savePlans();
  } catch (error) {
    console.error('Не удалось загрузить планинги:', error);
  }
}

function capturePlan(type, tableId) {
  const table = document.getElementById(tableId);
  if (!table || !table.tHead || !table.tBodies[0]) return;

  const headers = Array.from(
    table.tHead.rows[0]?.cells || [],
    cell => cell.innerText
  );
  const rows = Array.from(
    table.tBodies[0].rows,
    row => Array.from(row.cells, cell => cell.textContent)
  );

  if (type === 'development') {
    const viewDate = getDevelopmentViewDate();
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const key = planMonthKey(year, month);
    const previous = getDevelopmentSnapshot(year, month);
    const generationMeta = window.lastDevelopmentGenerationMeta;
    const meta = generationMeta?.year === year && generationMeta?.month === month
      ? generationMeta
      : (previous || {});

    const snapshot = {
      year,
      month,
      posts: [...posts],
      operators: [...operators],
      headers,
      rows,
      generationStatus: meta.generationStatus || 'manual',
      stopReason: meta.stopReason || null,
      generationSettings: meta.generationSettings
        ? { ...meta.generationSettings }
        : (previous?.generationSettings ? { ...previous.generationSettings } : undefined),
      acceptedCount: meta.acceptedCount,
      logicalCount: meta.logicalCount
    };

    savedPlans.developmentHistory[key] = snapshot;
    savedPlans.development = snapshot;
    savePlans();
    return;
  }

  if (type === 'rotation') {
    const viewDate = getRotationViewDate();
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const key = planMonthKey(year, month);
    const previous = getRotationSnapshot(year, month);
    const generationMeta = window.lastRotationGenerationMeta;
    const generatedForMonth = generationMeta?.year === year && generationMeta?.month === month;
    const meta = generatedForMonth ? generationMeta : (previous || {});
    const settings = getRotationSettings();
    const snapshot = {
      year,
      month,
      generatedAt: meta.generatedAt || previous?.generatedAt || null,
      posts: [...posts],
      operators: [...operators],
      headers,
      rows,
      chains: generatedForMonth ? (meta.chains || []) : [],
      needs: generatedForMonth ? (meta.needs || []) : (previous?.needs || []),
      durationWorkingDays: meta.durationWorkingDays || previous?.durationWorkingDays || settings.durationWorkingDays,
      maxConcurrentChains: meta.maxConcurrentChains || previous?.maxConcurrentChains || settings.maxConcurrentChains
    };
    savedPlans.rotationHistory[key] = snapshot;
    savedPlans.rotation = snapshot;
    savePlans();
    return;
  }

  const now = new Date();
  savedPlans[type] = {
    year: now.getFullYear(),
    month: now.getMonth(),
    posts: [...posts],
    operators: [...operators],
    headers,
    rows
  };
  savePlans();
}

function renderDevelopmentStatus(plan) {
  const status = document.getElementById('developmentPlanStatus');
  if (!status) return;
  status.textContent = '';
  status.style.display = 'none';
}

function showMissingDevelopmentPlan(year, month) {
  const table = document.getElementById('devCalendarTable');
  if (!table || !table.tHead || !table.tBodies[0]) return;
  table.tHead.innerHTML = '';
  table.tBodies[0].innerHTML = `<tr><td style="text-align:center;color:#94a3b8;padding:40px;">План развития за ${String(month + 1).padStart(2, '0')}.${year} не сохранён</td></tr>`;
  renderDevelopmentStatus(null);
}

function showMissingRotationPlan(year, month) {
  const table = document.getElementById('rotCalendarTable');
  if (!table || !table.tHead || !table.tBodies[0]) return;
  table.tHead.innerHTML = '';
  table.tBodies[0].innerHTML = `<tr><td style="text-align:center;color:#94a3b8;padding:40px;">План ротации за ${String(month + 1).padStart(2, '0')}.${year} не сохранён</td></tr>`;
}

function restorePlan(type, tableId, color, explicitPlan = null) {
  let plan = explicitPlan;
  if (type === 'development') {
    const date = getDevelopmentViewDate();
    plan = plan || getDevelopmentSnapshot(date.getFullYear(), date.getMonth());
  } else if (type === 'rotation') {
    const date = getRotationViewDate();
    plan = plan || getRotationSnapshot(date.getFullYear(), date.getMonth()) || savedPlans.rotation;
  } else {
    plan = plan || savedPlans[type];
  }

  if (!plan) {
    if (type === 'development') {
      const date = getDevelopmentViewDate();
      showMissingDevelopmentPlan(date.getFullYear(), date.getMonth());
    } else if (type === 'rotation') {
      const date = getRotationViewDate();
      showMissingRotationPlan(date.getFullYear(), date.getMonth());
    }
    return;
  }

  const table = document.getElementById(tableId);
  if (!table || !table.tHead || !table.tBodies[0]) return;
  table.tHead.innerHTML = '';
  table.tBodies[0].innerHTML = '';

  const rotationChainCells = {};
  if (type === 'rotation' && Array.isArray(plan.chains)) {
    for (const chain of plan.chains) {
      const startDay = Number(chain.startDay);
      const endDay = Number(chain.endDay);
      for (const participant of chain.participants || []) {
        const postIndex = (plan.posts || posts).indexOf(participant.toPost);
        if (postIndex < 0) continue;
        for (let day = startDay; day <= endDay; day++) {
          rotationChainCells[`${postIndex}:${day}`] = chain.id;
        }
      }
    }
  }

  const planHeaders = Array.isArray(plan.headers) ? plan.headers : [];
  const planRows = Array.isArray(plan.rows) ? plan.rows : [];
  if (planHeaders.length > 0) {
    const headerRow = table.tHead.insertRow();
    planHeaders.forEach((text, index) => {
      const th = document.createElement('th');
      th.textContent = text;
      th.style.whiteSpace = 'pre-line';
      if (index > 0) {
        const day = new Date(plan.year, plan.month, index).getDay();
        if (day === 0 || day === 6) th.style.backgroundColor = '#cbd5e1';
      }
      headerRow.appendChild(th);
    });
  }

  planRows.forEach((values, rowIndex) => {
    const row = table.tBodies[0].insertRow();
    values.forEach((value, columnIndex) => {
      const cell = row.insertCell();
      cell.textContent = value;

      const isDevelopmentDurationCell =
        type === 'development' && columnIndex === values.length - 1;
      if (isDevelopmentDurationCell) {
        cell.dataset.post = rowIndex;
        cell.dataset.duration = 'true';
        cell.style.cursor = 'pointer';
        cell.style.fontWeight = '600';
        cell.onclick = event => editDevelopmentDuration(event);
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
        const chainId = rotationChainCells[`${rowIndex}:${columnIndex - 1}`];
        if (chainId) {
          cell.dataset.chainId = String(chainId);
          cell.title = `Цепочка ${chainId}`;
        }
      } else {
        cell.textContent = '+';
        cell.style.color = '#94a3b8';
        cell.style.fontSize = '16px';
      }
      cell.style.cursor = 'pointer';
      if (operator && operator !== '+') {
        cell.onclick = event => type === 'rotation'
          ? editRotationCell(event)
          : editCalendarCell(event);
      } else {
        cell.onclick = event => type === 'rotation'
          ? addRotationOp(event)
          : addCalendarTraining(event);
      }
    });
  });

  if (type === 'development') renderDevelopmentStatus(plan);
}

function updateDevelopmentMonthLabel() {
  const date = getDevelopmentViewDate();
  const label = document.getElementById('developmentPlanMonthLabel');
  if (label) {
    label.textContent = date.toLocaleDateString('ru-RU', {
      month: 'long',
      year: 'numeric'
    });
  }

  const previous = document.getElementById('developmentPreviousMonth');
  const next = document.getElementById('developmentNextMonth');
  const current = currentMonthDate();
  const nextDate = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  if (previous) previous.disabled = false;
  if (next) {
    next.disabled = !getDevelopmentSnapshot(nextDate.getFullYear(), nextDate.getMonth()) &&
      !(nextDate.getFullYear() === current.getFullYear() && nextDate.getMonth() === current.getMonth());
  }
  const currentButton = document.getElementById('developmentCurrentMonth');
  if (currentButton) {
    currentButton.disabled = date.getFullYear() === current.getFullYear() &&
      date.getMonth() === current.getMonth();
  }
}

function setDevelopmentPlanMonth(year, month) {
  window.developmentPlanViewDate = new Date(year, month, 1);
  updateDevelopmentMonthLabel();
  const plan = getDevelopmentSnapshot(year, month);
  if (plan) restorePlan('development', 'devCalendarTable', '#2563eb', plan);
  else showMissingDevelopmentPlan(year, month);
}

function changeDevelopmentMonth(delta) {
  const date = getDevelopmentViewDate();
  setDevelopmentPlanMonth(date.getFullYear(), date.getMonth() + delta);
}

function showCurrentDevelopmentMonth() {
  const date = currentMonthDate();
  setDevelopmentPlanMonth(date.getFullYear(), date.getMonth());
}

function rotationMonthTitle(date = getRotationViewDate()) {
  return date.toLocaleDateString('ru-RU', {
    month: 'long',
    year: 'numeric'
  });
}

function updateRotationMonthLabel() {
  const date = getRotationViewDate();
  const label = document.getElementById('rotationPlanMonthLabel');
  if (label) {
    label.textContent = rotationMonthTitle(date);
  }
  const current = currentMonthDate();
  const currentButton = document.getElementById('rotationCurrentMonth');
  if (currentButton) {
    currentButton.disabled = date.getFullYear() === current.getFullYear() &&
      date.getMonth() === current.getMonth();
  }
}

function setRotationPlanMonth(year, month) {
  window.rotationPlanViewDate = new Date(year, month, 1);
  updateRotationMonthLabel();
  const plan = getRotationSnapshot(year, month);
  if (plan) restorePlan('rotation', 'rotCalendarTable', '#16a34a', plan);
  else showMissingRotationPlan(year, month);
}

function changeRotationMonth(delta) {
  const date = getRotationViewDate();
  setRotationPlanMonth(date.getFullYear(), date.getMonth() + delta);
}

function showCurrentRotationMonth() {
  const date = currentMonthDate();
  setRotationPlanMonth(date.getFullYear(), date.getMonth());
}

function developmentMonthTitle(date = getDevelopmentViewDate()) {
  return date.toLocaleDateString('ru-RU', {
    month: 'long',
    year: 'numeric'
  });
}

function closeDevelopmentPlanDialog(overlay) {
  if (!overlay) return;
  document.removeEventListener('keydown', overlay.__escapeHandler);
  overlay.remove();
}

function createDevelopmentPlanDialog(titleText, buildContent) {
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position:fixed;inset:0;z-index:10000;display:flex;align-items:center;
    justify-content:center;padding:16px;background:rgba(15,23,42,.48);
  `;
  const modal = document.createElement('div');
  modal.style.cssText = `
    width:min(460px,calc(100vw - 32px));max-height:calc(100vh - 32px);
    overflow-y:auto;box-sizing:border-box;padding:22px;border-radius:12px;
    background:#fff;box-shadow:0 20px 60px rgba(0,0,0,.28);font-family:Arial,sans-serif;
  `;
  const header = document.createElement('div');
  header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;';
  const title = document.createElement('h3');
  title.textContent = titleText;
  title.style.cssText = 'margin:0;color:#0f172a;';
  const close = document.createElement('button');
  close.type = 'button';
  close.textContent = '×';
  close.setAttribute('aria-label', 'Закрыть');
  close.style.cssText = 'border:0;background:transparent;color:#64748b;font-size:24px;line-height:1;cursor:pointer;';
  header.append(title, close);
  modal.appendChild(header);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  const closeDialog = () => closeDevelopmentPlanDialog(overlay);
  close.onclick = closeDialog;
  overlay.addEventListener('click', event => {
    if (event.target === overlay) closeDialog();
  });
  overlay.__escapeHandler = event => {
    if (event.key === 'Escape') closeDialog();
  };
  document.addEventListener('keydown', overlay.__escapeHandler);
  buildContent(modal, closeDialog);
  return { overlay, modal, close: closeDialog };
}

function planButton(text, primary = false) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = text;
  button.style.cssText = primary
    ? 'padding:9px 16px;border:0;border-radius:6px;background:#2563eb;color:#fff;cursor:pointer;'
    : 'padding:9px 16px;border:1px solid #cbd5e1;border-radius:6px;background:#fff;color:#1e293b;cursor:pointer;';
  return button;
}

function addPlanModalSection(modal, caption) {
  const section = document.createElement('div');
  section.style.cssText = 'margin:12px 0 8px;color:#64748b;font-size:11px;font-weight:700;text-transform:uppercase;';
  section.textContent = caption;
  modal.appendChild(section);
}

function openDevelopmentSettingsDialog() {
  const date = getDevelopmentViewDate();
  const plan = getDevelopmentSnapshot(date.getFullYear(), date.getMonth());
  const currentLimit = savedPlans.developmentSettings.maxConcurrentTrainings;

  createDevelopmentPlanDialog('Настройки плана развития', (modal, close) => {
    addPlanModalSection(modal, 'Параметры генерации');
    const label = document.createElement('label');
    label.textContent = 'Максимальное количество одновременных обучений';
    label.style.cssText = 'display:block;margin-bottom:6px;color:#334155;font-size:13px;font-weight:600;';
    const input = document.createElement('input');
    input.type = 'number';
    input.min = '1';
    input.step = '1';
    input.value = String(currentLimit);
    input.style.cssText = 'width:100%;box-sizing:border-box;padding:9px;border:1px solid #cbd5e1;border-radius:6px;';
    const error = document.createElement('div');
    error.style.cssText = 'display:none;margin-top:5px;color:#dc2626;font-size:12px;';
    modal.append(label, input, error);

    addPlanModalSection(modal, `Текущий план — ${developmentMonthTitle(date)}`);
    const info = document.createElement('div');
    info.style.cssText = 'display:grid;gap:7px;color:#334155;font-size:13px;';
    const snapshotLimit = plan?.generationSettings?.maxConcurrentTrainings;
    const statusText = plan?.generationStatus === 'calendar-capacity-reached'
      ? 'Остановлен по календарной ёмкости'
      : plan?.generationStatus === 'completed'
        ? 'План сформирован полностью'
        : 'Статус генерации не указан';
    info.innerHTML = `
      <div><b>Создан с лимитом:</b> ${snapshotLimit ? `${snapshotLimit} одновременных обучения` : 'не указан'}</div>
      <div><b>Статус:</b> ${statusText}</div>
    `;
    if (plan?.stopReason) {
      const reason = plan.stopReason;
      const stop = document.createElement('div');
      stop.style.cssText = 'display:grid;gap:4px;padding:8px;border-radius:6px;background:#fff7ed;color:#9a3412;';
      stop.innerHTML = `
        <div><b>Причина остановки:</b> ${reason.operator} → ${reason.post}</div>
        <div><b>Требовалось:</b> ${reason.requiredDays} учебных дней</div>
        <div><b>Доступно:</b> ${reason.availableDays} учебных дней</div>
      `;
      info.appendChild(stop);
    }
    modal.appendChild(info);

    const footer = document.createElement('div');
    footer.style.cssText = 'display:flex;justify-content:flex-end;gap:8px;margin-top:20px;';
    const cancel = planButton('Отмена');
    const save = planButton('Сохранить', true);
    cancel.onclick = close;
    save.onclick = () => {
      const value = Number(input.value);
      if (!Number.isInteger(value) || value < 1) {
        error.textContent = 'Введите целое число не меньше 1.';
        error.style.display = 'block';
        return;
      }
      savedPlans.developmentSettings.maxConcurrentTrainings = value;
      window.developmentSettings = { ...savedPlans.developmentSettings };
      savePlans();
      close();
    };
    footer.append(cancel, save);
    modal.appendChild(footer);
  });
}

function runDevelopmentGeneration(closeDialog) {
  closeDialog();
  window.generateDevelopmentPlan();
}

function openRegenerationDialog(closeParent) {
  if (closeParent) closeParent();
  const date = getDevelopmentViewDate();
  createDevelopmentPlanDialog('Повторная генерация плана', (modal, close) => {
    const text = document.createElement('p');
    text.style.cssText = 'margin:0;color:#334155;line-height:1.5;';
    text.textContent = `План развития за ${developmentMonthTitle(date)} уже был сгенерирован. При повторной генерации текущий план за этот месяц будет заменён.`;
    modal.appendChild(text);
    const footer = document.createElement('div');
    footer.style.cssText = 'display:flex;justify-content:flex-end;gap:8px;margin-top:20px;';
    const cancel = planButton('Отмена');
    const confirm = planButton('Сгенерировать повторно', true);
    cancel.onclick = close;
    confirm.onclick = () => runDevelopmentGeneration(close);
    footer.append(cancel, confirm);
    modal.appendChild(footer);
  });
}

function openDevelopmentGenerationDialog() {
  const date = getDevelopmentViewDate();
  const existing = getDevelopmentSnapshot(date.getFullYear(), date.getMonth());
  const currentLimit = savedPlans.developmentSettings.maxConcurrentTrainings;
  createDevelopmentPlanDialog('Генерация плана', (modal, close) => {
    const info = document.createElement('div');
    info.style.cssText = 'display:grid;gap:9px;color:#334155;font-size:13px;';
    info.innerHTML = `
      <div><b>Месяц:</b> ${developmentMonthTitle(date)}</div>
      <div><b>Максимум одновременных обучений:</b> ${currentLimit}</div>
      <div style="color:#64748b;line-height:1.45;">План будет сформирован с учётом текущей ILU-матрицы и календарных ограничений.</div>
    `;
    modal.appendChild(info);
    const footer = document.createElement('div');
    footer.style.cssText = 'display:flex;justify-content:flex-end;gap:8px;margin-top:20px;';
    const cancel = planButton('Отмена');
    const generate = planButton('Сгенерировать', true);
    cancel.onclick = close;
    generate.onclick = () => {
      if (existing) openRegenerationDialog(close);
      else runDevelopmentGeneration(close);
    };
    footer.append(cancel, generate);
    modal.appendChild(footer);
  });
}

function openRotationSettingsDialog() {
  const current = getRotationSettings();
  createDevelopmentPlanDialog('Настройки плана ротации', (modal, close) => {
    addPlanModalSection(modal, 'Параметры ротации');
    const durationLabel = document.createElement('label');
    durationLabel.textContent = 'Длительность ротации, рабочих дней';
    durationLabel.style.cssText = 'display:block;margin-bottom:6px;color:#334155;font-size:13px;font-weight:600;';
    const durationInput = document.createElement('input');
    durationInput.type = 'number';
    durationInput.min = '1';
    durationInput.step = '1';
    durationInput.value = String(current.durationWorkingDays);
    durationInput.style.cssText = 'width:100%;box-sizing:border-box;padding:9px;border:1px solid #cbd5e1;border-radius:6px;margin-bottom:5px;';
    const durationDescription = document.createElement('div');
    durationDescription.textContent = 'Количество рабочих дней, в течение которых операторы выполняют работу на назначенных постах в рамках одной ротационной цепочки. Все участники цепочки ротируются одновременно на одинаковый срок. Учитываются только рабочие дни с понедельника по пятницу. После завершения блока операторы возвращаются на исходные посты';
    durationDescription.style.cssText = 'margin-bottom:12px;color:#64748b;font-size:12px;line-height:1.45;';

    const chainsLabel = document.createElement('label');
    chainsLabel.textContent = 'Максимальное количество одновременных цепочек';
    chainsLabel.style.cssText = 'display:block;margin-bottom:6px;color:#334155;font-size:13px;font-weight:600;';
    const chainsInput = document.createElement('input');
    chainsInput.type = 'number';
    chainsInput.min = '1';
    chainsInput.step = '1';
    chainsInput.value = String(current.maxConcurrentChains);
    chainsInput.style.cssText = 'width:100%;box-sizing:border-box;padding:9px;border:1px solid #cbd5e1;border-radius:6px;margin-bottom:5px;';
    const chainsDescription = document.createElement('div');
    chainsDescription.textContent = 'Максимальное количество независимых ротационных цепочек, которые могут выполняться одновременно. Одна цепочка считается одной единицей независимо от количества участвующих операторов. Одновременно выполняемые цепочки не могут использовать одних и тех же операторов или посты. Чем больше значение, тем больше ротаций может проходить параллельно при соблюдении безопасного покрытия линии';
    chainsDescription.style.cssText = 'color:#64748b;font-size:12px;line-height:1.45;';
    const error = document.createElement('div');
    error.style.cssText = 'display:none;margin-top:7px;color:#dc2626;font-size:12px;';
    modal.append(durationLabel, durationInput, durationDescription, chainsLabel, chainsInput, chainsDescription, error);

    const footer = document.createElement('div');
    footer.style.cssText = 'display:flex;justify-content:flex-end;gap:8px;margin-top:20px;';
    const cancel = planButton('Отмена');
    const save = planButton('Сохранить', true);
    cancel.onclick = close;
    save.onclick = () => {
      const duration = Number(durationInput.value);
      const maxChains = Number(chainsInput.value);
      if (!Number.isInteger(duration) || duration < 1 ||
        !Number.isInteger(maxChains) || maxChains < 1) {
        error.textContent = 'Введите целые числа не меньше 1.';
        error.style.display = 'block';
        return;
      }
      savedPlans.rotationSettings = {
        durationWorkingDays: duration,
        maxConcurrentChains: maxChains
      };
      window.rotationSettings = getRotationSettings();
      savePlans();
      close();
    };
    footer.append(cancel, save);
    modal.appendChild(footer);
  });
}

function runRotationGeneration(closeDialog) {
  closeDialog();
  window.generateRotationPlan();
}

function openRotationRegenerationDialog(closeParent) {
  if (closeParent) closeParent();
  createDevelopmentPlanDialog('Повторная генерация плана ротации', (modal, close) => {
    const text = document.createElement('p');
    text.style.cssText = 'margin:0;color:#334155;line-height:1.5;';
    text.textContent = 'На выбранный месяц уже существует план ротации. Повторная генерация заменит текущий план на новый. Продолжить?';
    modal.appendChild(text);
    const footer = document.createElement('div');
    footer.style.cssText = 'display:flex;justify-content:flex-end;gap:8px;margin-top:20px;';
    const cancel = planButton('Отмена');
    const confirm = planButton('Сгенерировать повторно', true);
    cancel.onclick = close;
    confirm.onclick = () => runRotationGeneration(close);
    footer.append(cancel, confirm);
    modal.appendChild(footer);
  });
}

function openRotationGenerationDialog() {
  const date = getRotationViewDate();
  const existing = getRotationSnapshot(date.getFullYear(), date.getMonth());
  const current = getRotationSettings();
  createDevelopmentPlanDialog('Генерация плана ротации', (modal, close) => {
    const info = document.createElement('div');
    info.style.cssText = 'display:grid;gap:9px;color:#334155;font-size:13px;';
    info.innerHTML = `
      <div><b>Месяц:</b> ${rotationMonthTitle(date)}</div>
      <div><b>Длительность ротации:</b> ${current.durationWorkingDays} рабочих дней</div>
      <div><b>Максимум одновременных цепочек:</b> ${current.maxConcurrentChains}</div>
      <div style="color:#64748b;line-height:1.45;">План будет сформирован с учётом текущей ILU-матрицы, доступности операторов и календарных ограничений.</div>
    `;
    modal.appendChild(info);
    const footer = document.createElement('div');
    footer.style.cssText = 'display:flex;justify-content:flex-end;gap:8px;margin-top:20px;';
    const cancel = planButton('Отмена');
    const generate = planButton('Сгенерировать', true);
    cancel.onclick = close;
    generate.onclick = () => {
      if (existing) openRotationRegenerationDialog(close);
      else runRotationGeneration(close);
    };
    footer.append(cancel, generate);
    modal.appendChild(footer);
  });
}

function wrapPlanGenerator(type, functionName, tableId, color) {
  const originalFunction = window[functionName];
  if (typeof originalFunction !== 'function') return;
  window[functionName] = function () {
    const result = originalFunction.apply(this, arguments);
    capturePlan(type, tableId);
    restorePlan(type, tableId, color);
    return result;
  };
}

function wrapPlanChange(type, functionName, tableId, color) {
  const originalFunction = window[functionName];
  if (typeof originalFunction !== 'function') return;
  window[functionName] = function () {
    if (type === 'rotation') window.lastRotationGenerationMeta = null;
    const result = originalFunction.apply(this, arguments);
    capturePlan(type, tableId);
    restorePlan(type, tableId, color);
    return result;
  };
}

loadPlans();
savedPlans.developmentSettings = {
  maxConcurrentTrainings: Math.max(
    1,
    Number.parseInt(savedPlans.developmentSettings?.maxConcurrentTrainings, 10) || 2
  )
};
window.developmentSettings = { ...savedPlans.developmentSettings };
window.developmentPlanViewDate = currentMonthDate();
window.rotationSettings = getRotationSettings();
window.rotationPlanViewDate = currentMonthDate();

wrapPlanGenerator('development', 'generateDevelopmentPlan', 'devCalendarTable', '#2563eb');
wrapPlanGenerator('rotation', 'generateRotationPlan', 'rotCalendarTable', '#16a34a');
wrapPlanChange('development', 'placeCalendarOp', 'devCalendarTable', '#2563eb');
wrapPlanChange('development', 'deleteCalendarTraining', 'devCalendarTable', '#2563eb');
wrapPlanChange('rotation', 'placeRotationOp', 'rotCalendarTable', '#16a34a');
wrapPlanChange('rotation', 'deleteRotationOp', 'rotCalendarTable', '#16a34a');

setTimeout(() => {
  updateDevelopmentMonthLabel();
  updateRotationMonthLabel();
  restorePlan('development', 'devCalendarTable', '#2563eb');
  restorePlan('rotation', 'rotCalendarTable', '#16a34a');
}, 0);
