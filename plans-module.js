// ======================== ПЛАНИРОВАНИЕ РАЗВИТИЯ ========================
function generateDevelopmentPlan() {
  const thead = document.querySelector('#devCalendarTable thead');
  const tbody = document.querySelector('#devCalendarTable tbody');
  if (!thead || !tbody) return;

  // Считаем покрытие L/U для каждого поста (без НУ и СО)
  const postCoverage = [];
  for (let r = 0; r < posts.length; r++) {
    let countLU = 0;
    for (let c = 0; c < operators.length; c++) {
      if (
        operatorRoles[c] === 'НУ' ||
        operatorRoles[c] === 'СО' ||
        operatorRoles[c] === 'ДС'
      ) continue;
      const lvl = data[r][c];
      if (lvl === 'L' || lvl === 'U') countLU++;
    }
    postCoverage.push({ index: r, name: posts[r], coverage: countLU });
  }

  // Считаем поливалентность каждого оператора (L/U)
  const opPoly = [];
  for (let c = 0; c < operators.length; c++) {
    if (
      operatorRoles[c] === 'НУ' ||
      operatorRoles[c] === 'СО' ||
      operatorRoles[c] === 'ДС'
    ) continue;
    let count = 0;
    for (let r = 0; r < posts.length; r++) {
      const lvl = data[r][c];
      if (lvl === 'L' || lvl === 'U') count++;
    }
    opPoly.push({ index: c, name: operators[c], count });
  }

  const virtualCoverage = postCoverage.map(p => p.coverage);

  // В план развития можно добавлять только операторов,
  // которым ещё требуется обучение на этом посту.
  // Lкр уже находится в обучении на L, а L и U уже освоены.
  function isDevelopmentCandidate(level) {
    return (
      level === null ||
      level === '' ||
      level === 'I' ||
      level === 'Iкр'
    );
  }

  function findBestPost(opIndex) {
    const quickPosts = [];
    const otherPosts = [];
    for (const p of postCoverage) {
      const lvl = data[p.index][opIndex];
      if (lvl === 'I' || lvl === 'Iкр') quickPosts.push(p);
      else if (isDevelopmentCandidate(lvl)) otherPosts.push(p);
    }
    quickPosts.sort((a, b) => virtualCoverage[a.index] - virtualCoverage[b.index]);
    otherPosts.sort((a, b) => virtualCoverage[a.index] - virtualCoverage[b.index]);
    return quickPosts[0] || otherPosts[0] || null;
  }

  // Собираем все назначения в массив {postIndex, opIndex}
  const planAssignments = [];

  // Этап 1: 2L по постам
  const postsNeed2L = postCoverage.filter(p => virtualCoverage[p.index] < 2);
  if (postsNeed2L.length > 0) {
    const usedOps = new Set();
    const sortedPosts = [...postsNeed2L].sort((a, b) => virtualCoverage[a.index] - virtualCoverage[b.index]);
    for (const p of sortedPosts) {
      let bestOp = null;
      const sortedOps = [...opPoly].sort((a, b) => a.count - b.count);
      for (const o of sortedOps) {
        if (usedOps.has(o.index)) continue;
        const lvl = data[p.index][o.index];
        if (isDevelopmentCandidate(lvl)) { bestOp = o; usedOps.add(o.index); break; }
      }
      if (!bestOp) {
        for (const o of sortedOps) {
          if (usedOps.has(o.index)) continue;
          const lvl = data[p.index][o.index];
          if (!isDevelopmentCandidate(lvl)) continue;
          bestOp = o; usedOps.add(o.index); break;
        }
      }
      if (bestOp) {
        virtualCoverage[p.index]++;
        planAssignments.push({ postIndex: p.index, opIndex: bestOp.index, stage: '2L посты' });
      }
    }
  }

  // Этап 2: 2L по операторам
  if (planAssignments.length === 0) {
    const opsNeed2L = opPoly.filter(o => o.count < 2);
    if (opsNeed2L.length > 0) {
      for (const o of opsNeed2L) {
        const bestPost = findBestPost(o.index);
        if (bestPost) {
          virtualCoverage[bestPost.index]++;
          planAssignments.push({ postIndex: bestPost.index, opIndex: o.index, stage: '2L операторы' });
        }
      }
    }
  }

  // Этап 3: 3L по постам
  if (planAssignments.length === 0) {
    const postsNeed3L = postCoverage.filter(p => virtualCoverage[p.index] < 3);
    if (postsNeed3L.length > 0) {
      const usedOps = new Set();
      const sortedPosts = [...postsNeed3L].sort((a, b) => virtualCoverage[a.index] - virtualCoverage[b.index]);
      for (const p of sortedPosts) {
        let bestOp = null;
        const sortedOps = [...opPoly].sort((a, b) => a.count - b.count);
        for (const o of sortedOps) {
          if (usedOps.has(o.index)) continue;
          const lvl = data[p.index][o.index];
          if (isDevelopmentCandidate(lvl)) { bestOp = o; usedOps.add(o.index); break; }
        }
        if (!bestOp) {
          for (const o of sortedOps) {
            if (usedOps.has(o.index)) continue;
            const lvl = data[p.index][o.index];
            if (!isDevelopmentCandidate(lvl)) continue;
            bestOp = o; usedOps.add(o.index); break;
          }
        }
        if (bestOp) {
          virtualCoverage[p.index]++;
          planAssignments.push({ postIndex: p.index, opIndex: bestOp.index, stage: '3L посты' });
        }
      }
    }
  }

  // Этап 4: дальнейшее развитие поливалентности операторов
//
// Этот этап запускается только после того, как предыдущие этапы
// не создали назначений. То есть приоритет дефицита покрытия постов
// до 2L / 3L сохраняется.
//
// Логика:
// 1. Сначала берём операторов с минимальной поливалентностью.
// 2. Для каждого оператора сначала стараемся продолжить уже
//    начатое освоение I / Iкр.
// 3. Если таких постов нет — выбираем новый доступный пост.
// 4. Среди подходящих постов выбираем пост с минимальным
//    текущим/виртуальным покрытием L/U.
// 5. За одну генерацию оператор получает только одно новое обучение.

if (planAssignments.length === 0) {
  const sortedOps = [...opPoly].sort((a, b) => {
    if (a.count !== b.count) {
      return a.count - b.count;
    }

    return a.index - b.index;
  });

  const usedOps = new Set();

  for (const o of sortedOps) {
    if (usedOps.has(o.index)) continue;

    const quickPosts = [];
    const otherPosts = [];

    for (const p of postCoverage) {
      const lvl = data[p.index][o.index];

      if (lvl === 'I' || lvl === 'Iкр') {
        quickPosts.push(p);
      } else if (
        lvl === null ||
        lvl === ''
      ) {
        otherPosts.push(p);
      }
    }

    quickPosts.sort((a, b) => {
      const coverageDiff =
        virtualCoverage[a.index] -
        virtualCoverage[b.index];

      if (coverageDiff !== 0) {
        return coverageDiff;
      }

      return a.index - b.index;
    });

    otherPosts.sort((a, b) => {
      const coverageDiff =
        virtualCoverage[a.index] -
        virtualCoverage[b.index];

      if (coverageDiff !== 0) {
        return coverageDiff;
      }

      return a.index - b.index;
    });

    const bestPost =
      quickPosts[0] ||
      otherPosts[0] ||
      null;

    if (!bestPost) {
      continue;
    }

    virtualCoverage[bestPost.index]++;

    planAssignments.push({
      postIndex: bestPost.index,
      opIndex: o.index,
      stage: 'Развитие поливалентности'
    });

    usedOps.add(o.index);
  }
}

  // Если ничего не назначено — участок укомплектован
  if (planAssignments.length === 0) {
    tbody.innerHTML = '<tr><td style="text-align:center;color:#16a34a;padding:40px;">✅ Участок полностью укомплектован</td></tr>';
    thead.innerHTML = '';
    return;
  }

  // Определяем срок обучения для каждого назначения
  const planWithDays = planAssignments.map(a => {
    const lvl = data[a.postIndex][a.opIndex];
    let days = 10;
    if (lvl === 'Iкр' || lvl === null || lvl === '') {
      days = trainingDays[a.postIndex];
    }
    return { ...a, days };
  });

  // Сортируем: сначала те, кто уже учится (Iкр), потом остальные
  planWithDays.sort((a, b) => {
    const lvlA = data[a.postIndex][a.opIndex];
    const lvlB = data[b.postIndex][b.opIndex];
    if (lvlA === 'Iкр' && lvlB !== 'Iкр') return -1;
    if (lvlA !== 'Iкр' && lvlB === 'Iкр') return 1;
    return 0;
  });

  // Строим календарь на текущий месяц
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  window.daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInMonth = window.daysInMonth;

  // Заголовок
  let headerHTML = '<tr><th>Пост</th>';
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    const dayName = date.toLocaleString('ru-RU', { weekday: 'short' });
    headerHTML += `<th>${d}<br>${dayName}</th>`;
  }
  headerHTML += '<th>Срок</th></tr>';
  thead.innerHTML = headerHTML;

  // Распределяем по будням (не более 2 обучений в день)
  const schedule = {};
  const dailyCount = {};

  for (const assign of planWithDays) {
    const opName = operators[assign.opIndex];
    let daysPlaced = 0;
    for (let d = 0; d < daysInMonth && daysPlaced < assign.days; d++) {
      const dayOfWeek = new Date(year, month, d + 1).getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) continue;
      if ((dailyCount[d] || 0) >= 2) continue;
      let busy = false;
      for (const key in schedule) {
        if (schedule[key][d] === opName) { busy = true; break; }
      }
      if (busy) continue;
      if (schedule[assign.postIndex] && schedule[assign.postIndex][d]) continue;
      if (!schedule[assign.postIndex]) schedule[assign.postIndex] = {};
      schedule[assign.postIndex][d] = opName;
      dailyCount[d] = (dailyCount[d] || 0) + 1;
      daysPlaced++;
    }
  }

  // Тело таблицы
  let bodyHTML = '';
  for (const p of postCoverage) {
    bodyHTML += `<tr><td style="text-align:left;font-weight:500;">${p.name}</td>`;
    for (let d = 0; d < daysInMonth; d++) {
      const op = schedule[p.index] && schedule[p.index][d] ? schedule[p.index][d] : '';
      bodyHTML += `<td style="font-size:11px;">${op}</td>`;
    }
    let postDays = '';
    for (const assign of planAssignments) {
      if (assign.postIndex === p.index) {
        const lvl = data[p.index][assign.opIndex];
        if (lvl === 'Iкр' || lvl === null || lvl === '') {
          postDays = trainingDays[p.index];
        } else {
          postDays = 10;
        }
        break;
      }
    }
    bodyHTML += `<td style="font-weight:600;">${postDays}</td></tr>`;
  }
  tbody.innerHTML = bodyHTML;

  // Закрашиваем выходные
  const allCells = tbody.querySelectorAll('td');
  allCells.forEach(td => {
    const colIndex = td.cellIndex;
    if (colIndex === 0 || colIndex > daysInMonth) return;
    const dayOfWeek = new Date(year, month, colIndex).getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      td.style.backgroundColor = '#cbd5e1';
      td.style.color = '#475569';
    }
  });

  const headerCells = thead.querySelectorAll('th');
  headerCells.forEach(th => {
    const colIndex = th.cellIndex;
    if (colIndex === 0 || colIndex > daysInMonth) return;
    const dayOfWeek = new Date(year, month, colIndex).getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      th.style.backgroundColor = '#cbd5e1';
      th.style.color = '#475569';
    }
  });

  // Вешаем обработчики на ячейки
  const allTd = tbody.querySelectorAll('td');
    allTd.forEach(td => {
    // Проходим по строкам и ячейкам, зная правильные индексы
  const rows = tbody.querySelectorAll('tr');
  rows.forEach((row, r) => {
    const cells = row.querySelectorAll('td');
    cells.forEach((td, colIndex) => {
      if (colIndex === 0 || colIndex > daysInMonth) {
        td.setAttribute('data-post', r);
        if (colIndex === daysInMonth + 1) {
          td.setAttribute('data-duration', 'true');
          td.style.cursor = 'pointer';
          td.style.fontWeight = '600';
          td.onclick = function(e) {
            editDevelopmentDuration(e);
          };
        }
        td.setAttribute('data-day', colIndex - 1);
        return;
      }
      const text = td.textContent.trim();
      td.setAttribute('data-post', r);
      td.setAttribute('data-day', colIndex - 1);

      // Сначала удаляем старый data-op
      td.removeAttribute('data-op');

      if (text && text !== '+') {
        td.setAttribute('data-op', text);
        td.style.cursor = 'pointer';
        td.style.color = '#2563eb';
        td.style.fontWeight = '600';
        td.onclick = function(e) { editCalendarCell(e); };
      } else {
        td.textContent = '+';
        td.style.cursor = 'pointer';
        td.style.color = '#94a3b8';
        td.style.fontSize = '16px';
        td.style.fontWeight = '400';
        td.onclick = function(e) { addCalendarTraining(e); };
      }
    });
  });
  });
}

// ======================== РЕДАКТИРОВАНИЕ И УДАЛЕНИЕ ОБУЧЕНИЙ ========================
function editDevelopmentDuration(event) {
  event.stopPropagation();
  hideMenu();

  const td = event.currentTarget || event.target;
  const postIndex = Number(td.getAttribute('data-post'));

  if (!Number.isInteger(postIndex) || !posts[postIndex]) {
    return;
  }

  const currentValue = Number(trainingDays[postIndex]) ||
    Number.parseInt(td.textContent, 10) ||
    1;

  const input = prompt(
    'Введите срок обучения в рабочих днях:',
    String(currentValue)
  );

  if (input === null) {
    return;
  }

  const days = Number(input.trim());

  if (!Number.isInteger(days) || days < 1 || days > 365) {
    alert('Введите целое число рабочих дней от 1 до 365.');
    return;
  }

  trainingDays[postIndex] = days;
  td.textContent = String(days);
  saveState();

  // Сохраняем изменённое значение в сохранённом планинге.
  if (typeof capturePlan === 'function') {
    capturePlan('development', 'devCalendarTable');
    restorePlan(
      'development',
      'devCalendarTable',
      '#2563eb'
    );
  }
}

function editCalendarCell(event) {
  event.stopPropagation();
  hideMenu();

  const td = event.target;
  const opName = td.getAttribute('data-op');
  if (!opName) return;

  const menu = document.createElement('div');
  menu.className = 'context-menu';
  menu.innerHTML = `<div class="danger" onclick="deleteCalendarTraining('${opName}'); hideMenu();">🗑️ Удалить все обучения</div>`;
  document.body.appendChild(menu);
  positionPlanContextMenu(menu, event);
  currentMenu = menu;
  setTimeout(() => document.addEventListener('click', hideMenu, { once: true }), 0);
}

function deleteCalendarTraining(opName) {
  if (!confirm(`Удалить все обучения оператора «${opName}» из плана?`)) return;
  const tbody = document.querySelector('#devCalendarTable tbody');
  if (!tbody) return;
  const allTd = tbody.querySelectorAll('td[data-op="' + opName + '"]');
  const affectedRows = new Set();

  allTd.forEach(td => {
    if (td.parentElement) {
      affectedRows.add(td.parentElement);
    }

    td.textContent = '+';
    td.style.color = '#94a3b8';
    td.style.fontSize = '16px';
    td.style.fontWeight = '400';
    td.style.cursor = 'pointer';
    td.onclick = function(e) { addCalendarTraining(e); };
    td.removeAttribute('data-op');
  });

  // Если в строке больше не осталось операторов,
  // очищаем и срок обучения этой строки.
  affectedRows.forEach(row => {
    const hasOperator = row.querySelector('td[data-op]');
    if (hasOperator) return;

    const durationCell =
      row.querySelector('td[data-duration="true"]') ||
      row.lastElementChild;

    if (durationCell) {
      durationCell.textContent = '';
    }
  });
}

function addCalendarTraining(event) {
  event.stopPropagation();
  hideMenu();

  const td = event.target;
  const postIndex = parseInt(td.getAttribute('data-post'));
  const dayIndex = parseInt(td.getAttribute('data-day'));

  const menu = document.createElement('div');
  menu.className = 'context-menu';
  menu.style.maxHeight = '300px';
  menu.style.overflowY = 'auto';

  let html = '<div style="font-weight:700;padding:8px 12px;color:#0f172a;">Выберите оператора:</div>';
  operators.forEach((op, index) => {
    if (operatorRoles[index] === 'ДС') return;

    html += `<div onclick="placeCalendarOp('${op}', ${postIndex}, ${dayIndex}); hideMenu();">${op}</div>`;
  });
  menu.innerHTML = html;
  document.body.appendChild(menu);
  positionPlanContextMenu(menu, event);
  currentMenu = menu;
  setTimeout(() => document.addEventListener('click', hideMenu, { once: true }), 0);
}

function placeCalendarOp(opName, postIndex, startDay) {
  const tbody = document.querySelector('#devCalendarTable tbody');
  if (!tbody) return;

  const row = tbody.querySelector(`tr:nth-child(${postIndex + 1})`);
  if (!row) return;

  const opIndex = operators.indexOf(opName);
  const postName = posts[postIndex];
  const lvl = data[postIndex][opIndex];

  // Отладка
  console.log('Добавление:', opName, 'на пост', postName, '(индекс', postIndex, ')');
  console.log('Текущий уровень:', lvl);

  // Если оператор уже знает пост на L или выше — нельзя обучать
  if (lvl === 'L' || lvl === 'Lкр' || lvl === 'U') {
    alert(opName + ' уже знает пост «' + postName + '» на уровне ' + lvl + '. Обучение не требуется.');
    return;
  }

  let days = 10;
  if (lvl === 'Iкр' || lvl === null || lvl === '') {
    days = trainingDays[postIndex];
  }

  const allTd = row.querySelectorAll('td');
  const year = new Date().getFullYear();
  const month = new Date().getMonth();
  const daysInMonth = window.daysInMonth || 31;

  // Сначала строим точный список рабочих дней, которые будут заняты.
  // Это позволяет проверить пересечения до изменения таблицы.
  const plannedDays = [];

  for (let d = startDay; d < daysInMonth && plannedDays.length < days; d++) {
    const dayOfWeek = new Date(year, month, d + 1).getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) continue;

    const td = allTd[d + 1];
    if (td && td.textContent === '+') {
      plannedDays.push(d);
    }
  }

  const conflictingCell = Array.from(
    tbody.querySelectorAll('td[data-op]')
  ).find(cell => {
    if (cell.getAttribute('data-op') !== opName) {
      return false;
    }

    const existingDay = Number(cell.getAttribute('data-day'));
    return plannedDays.includes(existingDay);
  });

  if (conflictingCell) {
    alert(
      `${opName} уже обучается на другом посту ` +
      'в выбранный период. Выберите другую дату.'
    );
    return;
  }

  let placed = 0;

  for (const d of plannedDays) {
    const td = allTd[d + 1];

    if (td && td.textContent === '+') {
      td.textContent = opName;
      td.style.color = '#2563eb';
      td.style.fontWeight = '600';
      td.style.fontSize = '12px';
      td.style.cursor = 'pointer';
      td.setAttribute('data-op', opName);
      td.onclick = function(e) { editCalendarCell(e); };
      placed++;
    }
  }

  // Обновляем срок в правом столбце
  const lastCell = row.querySelector('td:last-child');
  if (lastCell) {
    let postDays = 10;
    if (lvl === 'Iкр' || lvl === null || lvl === '') {
      postDays = trainingDays[postIndex];
    }
    lastCell.textContent = postDays;
    lastCell.style.fontWeight = '600';
  }

}

// ======================== ПЛАНИРОВАНИЕ РОТАЦИИ ========================
function getLastPlacementDate(opName, postName) {
  // Ищем последнюю запись в журнале для этого оператора на этом посту
  let lastDate = null;
  for (const entry of placementLog) {
    if (entry.opName === opName && entry.postName === postName) {
      const parts = entry.date.split('.');
      const date = new Date(parts[2], parts[1] - 1, parts[0]);
      if (!lastDate || date > lastDate) lastDate = date;
    }
  }
  return lastDate;
}
  // Ищем срочных операторов
function getWorstAge(opIndex) {
  let worst = null;
  for (let r = 0; r < posts.length; r++) {
    const lvl = data[r][opIndex];
    if (!lvl || lvl === '') continue;
    const age = getPlacementAgeColor(operators[opIndex], posts[r]);
    if (age === 'red') return 'red';
    if (age === 'yellow') worst = 'yellow';
  }
  return worst;
}

function generateRotationPlan() {
  const thead = document.querySelector('#rotCalendarTable thead');
  const tbody = document.querySelector('#rotCalendarTable tbody');
  if (!thead || !tbody) return;

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  window.daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInMonth = window.daysInMonth;
  const rotationsPerDay = parseInt(document.getElementById('rotationsPerDay').value) || 1;

  // Заголовок
  let headerHTML = '<tr><th>Пост</th>';
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    const dayName = date.toLocaleString('ru-RU', { weekday: 'short' });
    headerHTML += `<th>${d}<br>${dayName}</th>`;
  }
  headerHTML += '</tr>';
  thead.innerHTML = headerHTML;

  // Кто знает какой пост
  const qualifiedOps = posts.map((p, r) => {
    const ops = [];
    for (let c = 0; c < operators.length; c++) {
      if (
        operatorRoles[c] === 'НУ' ||
        operatorRoles[c] === 'СО' ||
        operatorRoles[c] === 'ДС'
      ) continue;
      const lvl = data[r][c];
      if (lvl && lvl !== '') ops.push(c);
    }
    return ops;
  });

  const schedule = {};
  const operatorLastDay = {};
  let postQueue = [...Array(posts.length).keys()];
  let queueIndex = 0;

  for (let d = 0; d < daysInMonth; d++) {
    const dayOfWeek = new Date(year, month, d + 1).getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) continue;

    const freeOps = [];
    for (let c = 0; c < operators.length; c++) {
      if (
        operatorRoles[c] === 'НУ' ||
        operatorRoles[c] === 'СО' ||
        operatorRoles[c] === 'ДС'
      ) continue;
      if (!operatorLastDay[c] || operatorLastDay[c] <= d) freeOps.push(c);
    }

    const usedToday = new Set();
    let rotationsToday = 0;
    let attempts = 0;
    const maxAttempts = posts.length * 2;

            while (rotationsToday < rotationsPerDay && attempts < maxAttempts && freeOps.length > 0) {
      attempts++;

      let chosen = null;
      let chosenPost = null;

      // Приоритет 1: мигающие операторы
      for (const op of freeOps) {
        if (usedToday.has(op)) continue;
        for (let r2 = 0; r2 < posts.length; r2++) {
          if (!qualifiedOps[r2].includes(op)) continue;
          if (schedule._usedPosts && schedule._usedPosts[op] && schedule._usedPosts[op].has(r2)) continue;
          const lvl = data[r2][op];
          if (!lvl || lvl === '') continue;
          const age = getPlacementAgeColor(operators[op], posts[r2]);
          if (age === 'red' || age === 'yellow') {
            chosen = op;
            chosenPost = r2;
            break;
          }
        }
        if (chosen !== null) break;
      }

      // Приоритет 2: просроченные по журналу (давно не стоял)
      if (chosen === null) {
        let oldestDate = null;
        for (const op of freeOps) {
          if (usedToday.has(op)) continue;
          for (let r2 = 0; r2 < posts.length; r2++) {
            if (!qualifiedOps[r2].includes(op)) continue;
            if (schedule._usedPosts && schedule._usedPosts[op] && schedule._usedPosts[op].has(r2)) continue;
            const lvl = data[r2][op];
            if (!lvl || lvl === '') continue;
            const lastDate = getLastPlacementDate(operators[op], posts[r2]);
            if (lastDate && (!oldestDate || lastDate < oldestDate)) {
              oldestDate = lastDate;
              chosen = op;
              chosenPost = r2;
            }
          }
        }
      }

      // Приоритет 3: обычная очередь постов
      if (chosen === null) {
        const r = postQueue[queueIndex % postQueue.length];
        queueIndex++;
        const available = freeOps.filter(op => {
          if (usedToday.has(op)) return false;
          if (!qualifiedOps[r].includes(op)) return false;
          for (let prevDay = 0; prevDay < d; prevDay++) {
            if (schedule[prevDay] && schedule[prevDay][r] === operators[op]) return false;
          }
          return true;
        });
        if (available.length > 0) {
          available.sort((a, b) => {
            const lastA = getLastPlacementDate(operators[a], posts[r]);
            const lastB = getLastPlacementDate(operators[b], posts[r]);
            if (!lastA && !lastB) return 0;
            if (!lastA) return -1;
            if (!lastB) return 1;
            return lastA - lastB;
          });
          chosen = available[0];
          chosenPost = r;
        }
      }

      if (chosen !== null && chosenPost !== null) {
        if (!schedule[d]) schedule[d] = {};
        schedule[d][chosenPost] = operators[chosen];
        usedToday.add(chosen);
        operatorLastDay[chosen] = d + 1;
        // Запрещаем этому оператору этот пост до конца месяца
        if (!schedule._usedPosts) schedule._usedPosts = {};
        if (!schedule._usedPosts[chosen]) schedule._usedPosts[chosen] = new Set();
        schedule._usedPosts[chosen].add(chosenPost);
        rotationsToday++;
        freeOps.splice(freeOps.indexOf(chosen), 1);
      }
    }
  }

  // Тело таблицы
  let bodyHTML = '';
  for (let r = 0; r < posts.length; r++) {
    bodyHTML += `<tr><td style="text-align:left;font-weight:500;">${posts[r]}</td>`;
    for (let d = 0; d < daysInMonth; d++) {
      const op = schedule[d] && schedule[d][r] ? schedule[d][r] : '';
      bodyHTML += `<td style="font-size:11px;">${op}</td>`;
    }
    bodyHTML += '</tr>';
  }
  tbody.innerHTML = bodyHTML;

  // Закрашиваем выходные
  const allCells = tbody.querySelectorAll('td');
  allCells.forEach(td => {
    const colIndex = td.cellIndex;
    if (colIndex === 0 || colIndex > daysInMonth) return;
    const dayOfWeek = new Date(year, month, colIndex).getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      td.style.backgroundColor = '#cbd5e1';
      td.style.color = '#475569';
    }
  });

  const headerCells = thead.querySelectorAll('th');
  headerCells.forEach(th => {
    const colIndex = th.cellIndex;
    if (colIndex === 0 || colIndex > daysInMonth) return;
    const dayOfWeek = new Date(year, month, colIndex).getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      th.style.backgroundColor = '#cbd5e1';
      th.style.color = '#475569';
    }
  });

  // Обработчики
  const rows = tbody.querySelectorAll('tr');
  rows.forEach((row, r) => {
    const cells = row.querySelectorAll('td');
    cells.forEach((td, colIndex) => {
      if (colIndex === 0 || colIndex > daysInMonth) {
        td.setAttribute('data-post', r);
        td.setAttribute('data-day', colIndex - 1);
        return;
      }
      const text = td.textContent.trim();
      td.setAttribute('data-post', r);
      td.setAttribute('data-day', colIndex - 1);
      td.removeAttribute('data-op');

      if (text && text !== '+') {
        td.setAttribute('data-op', text);
        td.style.cursor = 'pointer';
        td.style.color = '#16a34a';
        td.style.fontWeight = '600';
        td.onclick = function(e) { editRotationCell(e); };
      } else {
        td.textContent = '+';
        td.style.cursor = 'pointer';
        td.style.color = '#94a3b8';
        td.style.fontSize = '16px';
        td.style.fontWeight = '400';
        td.onclick = function(e) { addRotationOp(e); };
      }
    });
  });
}

// ======================== РЕДАКТИРОВАНИЕ РОТАЦИИ ========================
function positionPlanContextMenu(menu, event) {
  const margin = 8;

  menu.style.position = 'fixed';
  menu.style.left = '0px';
  menu.style.top = '0px';

  const rect = menu.getBoundingClientRect();

  let left = event.clientX;
  let top = event.clientY;

  if (left + rect.width > window.innerWidth - margin) {
    left = window.innerWidth - rect.width - margin;
  }

  if (top + rect.height > window.innerHeight - margin) {
    top = event.clientY - rect.height;
  }

  menu.style.left = `${Math.max(margin, left)}px`;
  menu.style.top = `${Math.max(margin, top)}px`;
}

function editRotationCell(event) {
  event.stopPropagation();
  hideMenu();

  const td = event.target;
  const opName = td.getAttribute('data-op');
  if (!opName) return;

  const menu = document.createElement('div');
  menu.className = 'context-menu';
  menu.innerHTML = `<div class="danger" onclick="deleteRotationOp('${opName}', ${td.getAttribute('data-post')}); hideMenu();">🗑️ Убрать оператора</div>`;
  document.body.appendChild(menu);
  positionPlanContextMenu(menu, event);
  currentMenu = menu;
  setTimeout(() => document.addEventListener('click', hideMenu, { once: true }), 0);
}

function deleteRotationOp(opName, postIndex) {
  const tbody = document.querySelector('#rotCalendarTable tbody');
  if (!tbody) return;

  const row = tbody.querySelector(`tr:nth-child(${postIndex + 1})`);
  if (!row) return;

  const allTd = row.querySelectorAll('td');
  allTd.forEach(td => {
    if (td.getAttribute('data-op') === opName) {
      td.textContent = '+';
      td.style.color = '#94a3b8';
      td.style.fontSize = '16px';
      td.style.fontWeight = '400';
      td.style.cursor = 'pointer';
      td.onclick = function(e) { addRotationOp(e); };
      td.removeAttribute('data-op');
    }
  });
}

function addRotationOp(event) {
  event.stopPropagation();
  hideMenu();

  const td = event.target;
  const postIndex = parseInt(td.getAttribute('data-post'));
  const dayIndex = parseInt(td.getAttribute('data-day'));

  // Фильтруем операторов: только те, кто знает этот пост
  const qualified = operators.filter((op, idx) => {
    if (
      operatorRoles[idx] === 'НУ' ||
      operatorRoles[idx] === 'СО' ||
      operatorRoles[idx] === 'ДС'
    ) return false;
    const lvl = data[postIndex][idx];
    return lvl && lvl !== '';
  });

  if (qualified.length === 0) {
    alert('Нет операторов, знающих этот пост');
    return;
  }

  const menu = document.createElement('div');
  menu.className = 'context-menu';
  menu.style.maxHeight = '300px';
  menu.style.overflowY = 'auto';

  let html = '<div style="font-weight:700;padding:8px 12px;color:#0f172a;">Выберите оператора:</div>';
  qualified.forEach(op => {
    html += `<div onclick="placeRotationOp('${op}', ${postIndex}, ${dayIndex}); hideMenu();">${op}</div>`;
  });
  menu.innerHTML = html;
  document.body.appendChild(menu);
  positionPlanContextMenu(menu, event);
  currentMenu = menu;
  setTimeout(() => document.addEventListener('click', hideMenu, { once: true }), 0);
}

function placeRotationOp(opName, postIndex, dayIndex) {
  const tbody = document.querySelector('#rotCalendarTable tbody');
  if (!tbody) return;

  const row = tbody.querySelector(`tr:nth-child(${postIndex + 1})`);
  if (!row) return;

  const td = row.querySelector(`td:nth-child(${dayIndex + 2})`);
  if (!td) return;

  td.textContent = opName;
  td.style.color = '#16a34a';
  td.style.fontWeight = '600';
  td.style.fontSize = '12px';
  td.style.cursor = 'pointer';
  td.setAttribute('data-op', opName);
  td.onclick = function(e) { editRotationCell(e); };
}
