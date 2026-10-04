// ======================== ОТРИСОВКА ТАБЛИЦЫ ========================
function renderMatrix() {
  // Получаем ссылки на заголовок и тело таблицы
  const thead = document.querySelector('#iluTable thead');
  const tbody = document.querySelector('#iluTable tbody');
  const matrixTableContainer = document.getElementById('matrixTableContainer');
  const emptyMatrixState = document.getElementById('emptyMatrixState');
  const emptyMatrixHint = document.getElementById('emptyMatrixHint');
  const matrixAddActions = document.getElementById('matrixAddActions');

  const matrixIsEmpty = posts.length === 0 || operators.length === 0;

  if (matrixTableContainer) {
    matrixTableContainer.hidden = matrixIsEmpty;
  }

  if (emptyMatrixState) {
    emptyMatrixState.hidden = !matrixIsEmpty;
  }

  if (matrixAddActions) {
    matrixAddActions.hidden = matrixIsEmpty;
  }

  if (emptyMatrixHint && matrixIsEmpty) {
    if (posts.length === 0 && operators.length === 0) {
      emptyMatrixHint.textContent =
        'Добавьте первый пост и первого оператора, чтобы начать работу.';
    } else if (posts.length === 0) {
      emptyMatrixHint.textContent =
        'Сначала добавьте хотя бы один пост.';
    } else {
      emptyMatrixHint.textContent =
        'Сначала добавьте хотя бы одного оператора.';
    }
  }

  if (matrixIsEmpty) {
    thead.innerHTML = '';
    tbody.innerHTML = '';
    window._polyData = {
      percent2L: 0,
      percent3L: 0,
      percentOps2L: 0,
      percentOps3L: 0,
      total2L: 0,
      total3L: 0
    };
    updateStatsCard();
    saveState();
    return;
  }

  // ----- АКТИВНОСТЬ ОПЕРАТОРОВ -----
  // Вычисляем, активен ли каждый оператор (стоит или обучается на любом посту)
  let operatorActive = new Array(operators.length).fill(false);
  for (let c = 0; c < operators.length; c++) {
    for (let r = 0; r < posts.length; r++) {
      if (attendanceData[r][c] === '○' || attendanceData[r][c] === '△') {
        operatorActive[c] = true;
        break;
      }
    }
  }

  // ----- ЗАГОЛОВОК 0: ДОЛЖНОСТИ -----
  thead.innerHTML = '<tr><th></th><th></th><th></th><th></th>' + operators.map((o, idx) => {
    const role = operatorRoles[idx];
    // При клике на должность вызываем выбор из списка
    return `<th colspan="2" data-operator-index="${idx}" style="cursor:pointer;font-size:11px;color:#64748b;" onclick="cycleOperatorRole(${idx})">${role}</th>`;
  }).join('') + '</tr>';

  // ----- ЗАГОЛОВОК 1: ФАМИЛИИ ОПЕРАТОРОВ + СТОЛБЦЫ СПРАВА -----
  const trNames = document.createElement('tr');
  trNames.innerHTML = '<th>Пост</th><th>Сл.</th><th>Эрг.</th><th>Срок обучения до I</th>' + operators.map((o, idx) => {
    return `<th colspan="2" data-operator-index="${idx}" style="cursor:pointer;" onclick="showOperatorMenu(event, '${o}')">${o}</th>`;
  }).join('')
    + '<th rowspan="2" style="vertical-align:middle;"><span style="writing-mode:sideways-lr;">Покрытие U</span></th>'
    + '<th rowspan="2" style="vertical-align:middle;"><span style="writing-mode:sideways-lr;">Поливал. 3L</span></th>'
    + '<th rowspan="2" style="vertical-align:middle;"><span style="writing-mode:sideways-lr;">Поливал. 2L</span></th>';
  thead.appendChild(trNames);

  // ----- ЗАГОЛОВОК 2: ПОДЗАГОЛОВКИ «СТАТУС» И «УРОВЕНЬ» -----
  const trSub = document.createElement('tr');
  trSub.innerHTML = '<th></th><th></th><th></th><th></th>' + operators.map((o, idx) => {
    // Если оператор активен, подкрашиваем ячейку серым
    const bg = operatorActive[idx] ? 'background:#cbd5e1;' : '';
    return `<th data-operator-index="${idx}" style="${bg}"><span style="writing-mode:sideways-lr;">Статус</span></th><th data-operator-index="${idx}" style="${bg}"><span style="writing-mode:sideways-lr;">Уровень</span></th>`;
  }).join('');
  thead.appendChild(trSub);

  // ----- ТЕЛО ТАБЛИЦЫ -----
  tbody.innerHTML = '';
  for (let r = 0; r < posts.length; r++) {
    const tr = document.createElement('tr');
    tr.dataset.postIndex = r;
    const postName = posts[r];

    // Активна ли строка поста (есть ли на нём кто-то)
    let rowActive = false;
    for (let c = 0; c < operators.length; c++) {
      if (attendanceData[r][c] === '○' || attendanceData[r][c] === '△') rowActive = true;
    }
    const postBg = rowActive ? 'background:#e2e8f0;' : '';
    tr.innerHTML = `<td style="cursor:pointer;${postBg}" onclick="showPostMenu(event, '${postName}')">${postName}</td>`;

    // ----- СТОЛБЕЦ «СЛОЖНОСТЬ» -----
    const tdDiff = document.createElement('td');
    const diff = difficulty[r];
    tdDiff.className = 'cell';
    tdDiff.style.minWidth = '45px'; tdDiff.style.fontWeight = '700'; tdDiff.style.fontSize = '14px'; tdDiff.style.color = '#1e293b';
    if (diff === 'A') { tdDiff.textContent = 'A'; tdDiff.style.backgroundColor = '#fecaca'; }
    else if (diff === 'B') { tdDiff.textContent = 'B'; tdDiff.style.backgroundColor = '#fef08a'; }
    else { tdDiff.textContent = 'C'; tdDiff.style.backgroundColor = '#bbf7d0'; }
    tdDiff.onclick = () => cycleDifficulty(r);
    tr.appendChild(tdDiff);

    // ----- СТОЛБЕЦ «ЭРГОНОМИКА» -----
    const tdErgo = document.createElement('td');
    const ergo = ergonomics[r];
    tdErgo.className = 'cell';
    tdErgo.style.minWidth = '45px'; tdErgo.style.fontWeight = '700'; tdErgo.style.fontSize = '14px'; tdErgo.style.color = '#1e293b';
    if (ergo === 'red') { tdErgo.textContent = 'К'; tdErgo.style.backgroundColor = '#fecaca'; }
    else if (ergo === 'yellow') { tdErgo.textContent = 'Ж'; tdErgo.style.backgroundColor = '#fef08a'; }
    else { tdErgo.textContent = 'З'; tdErgo.style.backgroundColor = '#bbf7d0'; }
    tdErgo.onclick = () => cycleErgonomics(r);
    tr.appendChild(tdErgo);

       // Ячейка срока обучения
    const tdDays = document.createElement('td');
    tdDays.textContent = trainingDays[r];
    tdDays.className = 'cell';
    tdDays.onclick = () => cycleTrainingDays(r);
    tr.appendChild(tdDays);

    // ----- ЯЧЕЙКИ ОПЕРАТОРОВ: СТАТУС НА ПОСТУ И УРОВЕНЬ ILU -----
    for (let c = 0; c < operators.length; c++) {
      // Статус на посту
      const tdPost = document.createElement('td');

      tdPost.dataset.operatorIndex = c;

      const postStatus = attendanceData[r][c];

      tdPost.className = 'cell';

      if (postStatus === '○') {
        tdPost.classList.add('status-ya');

        tdPost.innerHTML =
          '<span class="status-marker status-marker-present" aria-label="Стоит на посту"></span>';
      } else if (postStatus === '△') {
        tdPost.classList.add('status-ob');

        tdPost.innerHTML =
          '<span class="status-marker status-marker-training" aria-label="Обучается"></span>';
      }
            
            // Проверяем давность стояния на посту (только если знает пост)
      try {
        const currentLevel = data[r][c];
        if (currentLevel && currentLevel !== '') {
          const ageColor = getPlacementAgeColor(operators[c], posts[r]);
          if (ageColor === 'red') {
            tdPost.style.animation = 'blink-red 1s infinite';
          } else if (ageColor === 'yellow') {
            tdPost.style.animation = 'blink-yellow 1s infinite';
          }
        }
      } catch(e) {
        // ничего не делаем
      }
      tdPost.onclick = () => cyclePostStatus(r, c);
      tr.appendChild(tdPost);

      // Уровень ILU
      const tdLvl = document.createElement('td');
      tdLvl.dataset.operatorIndex = c;
      const lvl = data[r][c];
      tdLvl.textContent = lvl || '';
      tdLvl.className = 'cell';
      if (lvl === 'Iкр') { tdLvl.classList.add('level-I'); tdLvl.style.color = '#ef4444'; tdLvl.style.fontWeight = '900'; }
      if (lvl === 'I') tdLvl.classList.add('level-I');
      if (lvl === 'Lкр') { tdLvl.classList.add('level-L'); tdLvl.style.color = '#ef4444'; tdLvl.style.fontWeight = '900'; }
      if (lvl === 'L') tdLvl.classList.add('level-L');
      if (lvl === 'U') tdLvl.classList.add('level-U');
      tdLvl.onclick = () => cycleLevel(r, c);
      tr.appendChild(tdLvl);
    }

    // ----- СТОЛБЕЦ «ПОКРЫТИЕ U» -----
    const tdCover = document.createElement('td');
    let uCount = 0;
    for (let c = 0; c < operators.length; c++) {
      // Считаем U у всех кроме НУ
      if (operatorRoles[c] !== 'НУ' && data[r][c] === 'U') uCount++;
    }
    tdCover.textContent = uCount > 0 ? uCount : '';
    tdCover.style.fontWeight = '700';
    tdCover.style.textAlign = 'center';
    tdCover.style.verticalAlign = 'middle';
    if (uCount > 0) {
      tdCover.style.backgroundColor = '#bbf7d0';
      tdCover.style.color = '#166534';
    }
    tr.appendChild(tdCover);

    // ----- СТОЛБЕЦ «ПОЛИВАЛ. 3L» -----
    const tdPoly3 = document.createElement('td');
    let countL3 = 0;
    for (let c = 0; c < operators.length; c++) {
      if (operatorRoles[c] === 'НУ' || operatorRoles[c] === 'СО') continue;
      const lvl = data[r][c];
      if (lvl === 'L' || lvl === 'U') countL3++;
    }
    tdPoly3.textContent = countL3 >= 3 ? `(${countL3})` : '';
    tdPoly3.style.fontWeight = '700';
    tdPoly3.style.textAlign = 'center';
    if (countL3 >= 3) {
      tdPoly3.style.backgroundColor = '#bbf7d0';
      tdPoly3.style.color = '#166534';
    }
    tr.appendChild(tdPoly3);

    // ----- СТОЛБЕЦ «ПОЛИВАЛ. 2L» -----
    const tdPoly2 = document.createElement('td');
    tdPoly2.textContent = countL3 >= 2 ? `(${countL3})` : '';
    tdPoly2.style.fontWeight = '700';
    tdPoly2.style.textAlign = 'center';
    if (countL3 >= 2) {
      tdPoly2.style.backgroundColor = '#bbf7d0';
      tdPoly2.style.color = '#166534';
    }
    tr.appendChild(tdPoly2);

    // Добавляем готовую строку в тело таблицы
    tbody.appendChild(tr);
  }

  // ----- ФУТЕР: РАСЧЁТ ПРОЦЕНТОВ ДЛЯ СТОЛБЦОВ СПРАВА -----
  const totalPosts = posts.length;

  // Процент покрытия U (хотя бы один форматор)
  let coveredPosts = 0;
  for (let r = 0; r < posts.length; r++) {
    for (let c = 0; c < operators.length; c++) {
      if (operatorRoles[c] !== 'НУ' && data[r][c] === 'U') {
        coveredPosts++;
        break;
      }
    }
  }
  const percentU = totalPosts > 0 ? Math.round((coveredPosts / totalPosts) * 100) : 0;

  // Процент постов с 3+ L/Lкр/U и с 2+ L/Lкр/U
  let posts3L = 0, posts2L = 0;
  for (let r = 0; r < posts.length; r++) {
    let countL = 0;
    for (let c = 0; c < operators.length; c++) {
      if (operatorRoles[c] === 'НУ' || operatorRoles[c] === 'СО') continue;
      const lvl = data[r][c];
      if (lvl === 'L' || lvl === 'U') countL++;
    }
    if (countL >= 3) posts3L++;
    if (countL >= 2) posts2L++;
  }
  const percent3L = totalPosts > 0 ? Math.round((posts3L / totalPosts) * 100) : 0;
  const percent2L = totalPosts > 0 ? Math.round((posts2L / totalPosts) * 100) : 0;

  // Процент операторов с 3L и 2L (исключая НУ и СО)
  let ops3L = 0, ops2L = 0;
  const totalOpsForPoly = operators.filter((_, i) => operatorRoles[i] !== 'НУ' && operatorRoles[i] !== 'СО').length;
  for (let c = 0; c < operators.length; c++) {
    if (operatorRoles[c] === 'НУ' || operatorRoles[c] === 'СО') continue;
    let count = 0;
    for (let r = 0; r < posts.length; r++) {
      const lvl = data[r][c];
    if (lvl === 'L' || lvl === 'U') count++;
    }
    if (count >= 3) ops3L++;
    if (count >= 2) ops2L++;
  }
  const percentOps3L = totalOpsForPoly > 0 ? Math.round((ops3L / totalOpsForPoly) * 100) : 0;
  const percentOps2L = totalOpsForPoly > 0 ? Math.round((ops2L / totalOpsForPoly) * 100) : 0;

  // Общая поливалентность = среднее между постами и операторами
  const total3L = Math.round((percent3L + percentOps3L) / 2);
  const total2L = Math.round((percent2L + percentOps2L) / 2);

    // ----- СТРОКА «СТАТУС ЯВКИ» -----
  const trFooter = document.createElement('tr');
  trFooter.innerHTML = '<td style="font-weight:700;">Статус явки</td><td></td><td></td><td></td>' + operators.map((o, idx) => {
    const att = operatorAttendance[idx];
    let color = '#16a34a';
    if (att === 'Н') color = '#ef4444';
    if (att === 'Б') color = '#ef4444';
    if (att === 'О') color = '#9333ea';
    if (att === 'С') color = '#ea580c';
    if (att === 'У') { color = '#64748b'; }
    const label = att === 'Я' ? 'Явка' : att === 'Н' ? 'Неявка' : att === 'Б' ? 'Больничный' : att === 'О' ? 'Отпуск' : att === 'С' ? 'В др. секторе' : 'Уволен';
    return `<td colspan="2" data-operator-index="${idx}" style="color:${color};cursor:pointer;font-weight:700;font-size:12px;" onclick="cycleOperatorAttendance(${idx})">${label}</td>`;
  }).join('')
    + `<td style="font-weight:700;font-size:14px;color:#166534;">${percentU}%</td>`
    + `<td style="font-weight:700;font-size:14px;color:#166534;">${percent3L}%</td>`
    + `<td style="font-weight:700;font-size:14px;color:#166534;">${percent2L}%</td>`;
  tbody.appendChild(trFooter);

  // ----- СТРОКА «ПОЛИВАЛЕНТНОСТЬ 3L» -----
  const trPoly3 = document.createElement('tr');
  trPoly3.innerHTML = '<td style="font-weight:700;">Поливалентность 3L</td><td></td><td></td><td></td>' + operators.map((o, idx) => {
    const count = getOperatorPolyvalence(idx);
    const isYes = count >= 3;
    const bg = isYes ? '#bbf7d0' : 'transparent';
    return `<td colspan="2" data-operator-index="${idx}" style="background:${bg};font-weight:700;font-size:12px;">(${count})</td>`;
  }).join('')
    + `<td></td><td style="font-weight:700;font-size:14px;color:#166534;">${total3L}%</td><td></td>`;
  tbody.appendChild(trPoly3);

  // ----- СТРОКА «ПОЛИВАЛЕНТНОСТЬ 2L» -----
  const trPoly2 = document.createElement('tr');
  trPoly2.innerHTML = '<td style="font-weight:700;">Поливалентность 2L</td><td></td><td></td><td></td>' + operators.map((o, idx) => {
    const count = getOperatorPolyvalence(idx);
    const isYes = count >= 2;
    const bg = isYes ? '#bbf7d0' : 'transparent';
    return `<td colspan="2" data-operator-index="${idx}" style="background:${bg};font-weight:700;font-size:12px;">(${count})</td>`;
  }).join('')
    + `<td></td><td></td><td style="font-weight:700;font-size:14px;color:#166534;">${total2L}%</td>`;
  tbody.appendChild(trPoly2);

  setupMatrixHoverHighlight();

  // Сохраняем для доступа из updateStatsCard
  window._polyData = { percent2L, percent3L, percentOps2L, percentOps3L, total2L, total3L };

  // Обновляем статистику в карточках
  updateStatsCard();
  saveState();
}

function setupMatrixHoverHighlight() {
  const table = document.getElementById('iluTable');
  if (!table || table.dataset.hoverBound === 'true') return;

  table.dataset.hoverBound = 'true';

  const clearHighlight = () => {
    table.querySelectorAll('.matrix-hover-row, .matrix-hover-column')
      .forEach(element => {
        element.classList.remove('matrix-hover-row');
        element.classList.remove('matrix-hover-column');
      });
  };

  table.addEventListener('mouseover', event => {
    const cell = event.target.closest('td, th');
    if (!cell || !table.contains(cell)) return;

    clearHighlight();

    const row = cell.closest('tr[data-post-index]');
    if (row) {
      row.classList.add('matrix-hover-row');
    }

    const operatorIndex = cell.dataset.operatorIndex;
    if (operatorIndex === undefined) return;

    table
      .querySelectorAll(`[data-operator-index="${operatorIndex}"]`)
      .forEach(element => {
        element.classList.add('matrix-hover-column');
      });
  });

  table.addEventListener('mouseleave', clearHighlight);
}

// ======================== ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ ========================

// Подсчёт количества постов с уровнем L/Lкр/U для конкретного оператора
function getOperatorPolyvalence(idx) {
  // НУ и СО не учитываются в поливалентности
  if (operatorRoles[idx] === 'НУ' || operatorRoles[idx] === 'СО') return 0;
  let countLU = 0;
  for (let r = 0; r < posts.length; r++) {
    const lvl = data[r][idx];
      if (lvl === 'L' || lvl === 'U') countLU++;
  }
  return countLU;
}
