
const restoredState = loadState();

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
}

// ======================== ОТРИСОВКА ТАБЛИЦЫ ========================
function renderMatrix() {
  // Получаем ссылки на заголовок и тело таблицы
  const thead = document.querySelector('#iluTable thead');
  const tbody = document.querySelector('#iluTable tbody');

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
    return `<th colspan="2" style="cursor:pointer;font-size:11px;color:#64748b;" onclick="cycleOperatorRole(${idx})">${role}</th>`;
  }).join('') + '</tr>';

  // ----- ЗАГОЛОВОК 1: ФАМИЛИИ ОПЕРАТОРОВ + СТОЛБЦЫ СПРАВА -----
  const trNames = document.createElement('tr');
  trNames.innerHTML = '<th>Пост</th><th>Сл.</th><th>Эрг.</th><th>Срок обучения до I</th>' + operators.map((o, idx) => {
    return `<th colspan="2" style="cursor:pointer;" onclick="showOperatorMenu(event, '${o}')">${o}</th>`;
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
    return `<th style="${bg}"><span style="writing-mode:sideways-lr;">Статус</span></th><th style="${bg}"><span style="writing-mode:sideways-lr;">Уровень</span></th>`;
  }).join('');
  thead.appendChild(trSub);

  // ----- ТЕЛО ТАБЛИЦЫ -----
  tbody.innerHTML = '';
  for (let r = 0; r < posts.length; r++) {
    const tr = document.createElement('tr');
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
      // Статус на посту (○ стоит, △ обучается, пусто)
      const tdPost = document.createElement('td');
      const postStatus = attendanceData[r][c];
      tdPost.textContent = postStatus;
      tdPost.className = 'cell';
      if (postStatus === '○') tdPost.classList.add('status-ya');
      if (postStatus === '△') tdPost.classList.add('status-ob');
            
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
    return `<td colspan="2" style="color:${color};cursor:pointer;font-weight:700;font-size:12px;" onclick="cycleOperatorAttendance(${idx})">${label}</td>`;
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
    return `<td colspan="2" style="background:${bg};font-weight:700;font-size:12px;">(${count})</td>`;
  }).join('')
    + `<td></td><td style="font-weight:700;font-size:14px;color:#166534;">${total3L}%</td><td></td>`;
  tbody.appendChild(trPoly3);

  // ----- СТРОКА «ПОЛИВАЛЕНТНОСТЬ 2L» -----
  const trPoly2 = document.createElement('tr');
  trPoly2.innerHTML = '<td style="font-weight:700;">Поливалентность 2L</td><td></td><td></td><td></td>' + operators.map((o, idx) => {
    const count = getOperatorPolyvalence(idx);
    const isYes = count >= 2;
    const bg = isYes ? '#bbf7d0' : 'transparent';
    return `<td colspan="2" style="background:${bg};font-weight:700;font-size:12px;">(${count})</td>`;
  }).join('')
    + `<td></td><td></td><td style="font-weight:700;font-size:14px;color:#166534;">${total2L}%</td>`;
  tbody.appendChild(trPoly2);

  // Сохраняем для доступа из updateStatsCard
  window._polyData = { percent2L, percent3L, percentOps2L, percentOps3L, total2L, total3L };

  // Обновляем статистику в карточках
  updateStatsCard();
  saveState();
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

// ======================== ЛОГИКА ВЗАИМОДЕЙСТВИЯ ========================

//Функции по комбинации расстановок
function isActivePlacement(status) {
  return status === '○' || status === '△';
}

function effectivePlacementLevel(level, status) {
  // Обычный I при постановке на пост становится Lкр.
  return status === '○' && level === 'I'
    ? 'Lкр'
    : level;
}

function isQualifiedPlacementLevel(level) {
  // Lкр считается уровнем L.
  return (
    level === 'L' ||
    level === 'Lкр' ||
    level === 'U'
  );
}

function canSharePost(firstLevel, secondLevel) {
  return (
    firstLevel === 'Iкр' &&
    isQualifiedPlacementLevel(secondLevel)
  ) || (
    secondLevel === 'Iкр' &&
    isQualifiedPlacementLevel(firstLevel)
  );
}

function applyPostPlacementRule(row, col, newStatus) {
  const newLevel = effectivePlacementLevel(
    data[row][col],
    newStatus
  );

  const newIsQualified =
    isQualifiedPlacementLevel(newLevel);

  for (
    let otherCol = 0;
    otherCol < operators.length;
    otherCol++
  ) {
    if (otherCol === col) continue;

    const oldStatus =
      attendanceData[row][otherCol];

    if (!isActivePlacement(oldStatus)) {
      continue;
    }

    const oldLevel = effectivePlacementLevel(
      data[row][otherCol],
      oldStatus
    );

    // Разрешённые пары:
    // Iкр + U
    // Iкр + L
    // Iкр + Lкр
    if (canSharePost(newLevel, oldLevel)) {
      continue;
    }

    // Если ставим новый U/L/Lкр,
    // старый U/L/Lкр автоматически снимается.
    if (
      newIsQualified &&
      isQualifiedPlacementLevel(oldLevel)
    ) {
      attendanceData[row][otherCol] = '';

      const today =
        new Date().toLocaleDateString('ru-RU');

      placementLog = placementLog.filter(entry =>
        !(
          entry.date === today &&
          entry.opName === operators[otherCol] &&
          entry.postName === posts[row]
        )
      );

      continue;
    }

    alert(
      `На посте «${posts[row]}» нельзя одновременно ` +
      `поставить операторов с уровнями ` +
      `${newLevel} и ${oldLevel}.\n` +
      `Разрешена только комбинация Iкр + U ` +
      `или Iкр + L.`
    );

    return false;
  }

  return true;
}











// Изменение статуса оператора на конкретном посту (○ стоит, △ обучается, пусто)
function cyclePostStatus(row, col) {
  const td = document.querySelector(
    `#iluTable tbody tr:nth-child(${row + 1}) ` +
    `td:nth-child(${5 + col * 2})`
  );

  if (!td) return;

  const cur = attendanceData[row][col];
  const currentLevel = data[row][col];

  const allOptions = [
    { value: '', label: '— Пусто' },
    { value: '○', label: '○ Стоит на посту' },
    { value: '△', label: '△ Обучается' }
  ];

  const options = allOptions.filter(option => {
    if (option.value === '') {
      return true;
    }

    if (option.value === '○') {
      return currentLevel !== null &&
        currentLevel !== '';
    }

    if (option.value === '△') {
      return currentLevel === 'Iкр';
    }

    return true;
  });

  showInlineSelect(
    td,
    cur,
    options,
    newVal => {
      // Снятие оператора с поста.
      if (newVal === '') {
        attendanceData[row][col] = '';
        renderMatrix();
        return;
      }

      if (isActivePlacement(newVal)) {
        const today =
          new Date().toLocaleDateString('ru-RU');

        const oldPosts = [];

        // Проверяем, не стоит ли оператор
        // уже на другом посту.
        for (
          let otherRow = 0;
          otherRow < posts.length;
          otherRow++
        ) {
          if (otherRow === row) continue;

          if (
            isActivePlacement(
              attendanceData[otherRow][col]
            )
          ) {
            oldPosts.push(posts[otherRow]);
          }
        }

        // Сначала проверяем совместимость уровней
        // на новом посту.
        if (!applyPostPlacementRule(row, col, newVal)) {
          return;
        }

        // После успешной проверки убираем оператора
        // со старого поста.
        if (oldPosts.length > 0) {
          for (
            let otherRow = 0;
            otherRow < posts.length;
            otherRow++
          ) {
            if (otherRow === row) continue;

            if (
              isActivePlacement(
                attendanceData[otherRow][col]
              )
            ) {
              const oldPost = posts[otherRow];

              attendanceData[otherRow][col] = '';

              placementLog = placementLog.filter(entry =>
                !(
                  entry.date === today &&
                  entry.opName === operators[col] &&
                  entry.postName === oldPost
                )
              );
            }
          }
        }

        if (operatorRoles[col] !== 'НУ') {
          operatorAttendance[col] = 'Я';
        }
      }

      attendanceData[row][col] = newVal;

      // I при постановке становится Lкр.
      if (
        newVal === '○' &&
        data[row][col] === 'I'
      ) {
        data[row][col] = 'Lкр';
      }

      if (newVal === '○') {
        logPlacement(
          operators[col],
          posts[row]
          );
}

      renderMatrix();

      if (newVal === '△') {
         openAutomaticTrainingForm(row, col);
}
    }
  );
}

// Изменение уровня ILU оператора на посту
function cycleLevel(row, col) {
  const td = document.querySelector(`#iluTable tbody tr:nth-child(${row + 1}) td:nth-child(${5 + col * 2})`);
  if (!td) return;
  const cur = data[row][col];
  const role = operatorRoles[col];
  const allOptions = [
    { value: '', label: '— Пусто' },
    { value: 'Iкр', label: 'Iкр — Новичок (красный)' },
    { value: 'I', label: 'I — Новичок' },
    { value: 'Lкр', label: 'Lкр — Опытный (красный)' },
    { value: 'L', label: 'L — Опытный' },
    { value: 'U', label: 'U — Мастер-форматор' }
  ];
  // U доступен только НУ, СО и Ф
  const options = allOptions.filter(opt => {
    if (opt.value === 'U' && role !== 'НУ' && role !== 'СО' && role !== 'Ф') return false;
    return true;
  });
  showInlineSelect(td, cur, options, (newVal) => {
    data[row][col] = newVal;
    renderMatrix();
  });
}

// Изменение статуса явки оператора (модальное окно в центре)
function cycleOperatorAttendance(idx) {
  // НУ не участвует в явке
  if (operatorRoles[idx] === 'НУ') return;
  const cur = operatorAttendance[idx];
  const options = [
    { value: 'Я', label: 'Явка' },
    { value: 'Н', label: 'Неявка' },
    { value: 'Б', label: 'Больничный' },
    { value: 'О', label: 'Отпуск' },
    { value: 'С', label: 'В другом секторе' },
    { value: 'У', label: 'Увольнение' }
  ];
  showCenteredSelect('Статус явки', cur, options, (newVal) => {
    operatorAttendance[idx] = newVal;
    // Если не явка — снимаем оператора со всех постов
    if (newVal !== 'Я') {
      for (let r = 0; r < posts.length; r++) attendanceData[r][idx] = '';
    }
    renderMatrix();
  });
}

// Изменение должности оператора (модальное окно в центре)
function cycleOperatorRole(idx) {
  const cur = operatorRoles[idx];
  const options = [
    { value: 'НУ', label: 'НУ — Начальник участка' },
    { value: 'СО', label: 'СО — Старший оператор' },
    { value: 'О', label: 'О — Оператор' },
    { value: 'Ф', label: 'Ф — Форматор' }
  ];
  showCenteredSelect('Должность', cur, options, (newVal) => {
    operatorRoles[idx] = newVal;
    renderMatrix();
  });
}

// Изменение эргономики поста (выпадающий список)
function cycleErgonomics(row) {
  const td = document.querySelector(`#iluTable tbody tr:nth-child(${row + 1}) td:nth-child(3)`);
  if (!td) return;
  const cur = ergonomics[row];
  const options = [
    { value: 'red', label: 'К — Красная' },
    { value: 'yellow', label: 'Ж — Жёлтая' },
    { value: 'green', label: 'З — Зелёная' }
  ];
  showInlineSelect(td, cur, options, (newVal) => {
    ergonomics[row] = newVal;
    renderMatrix();
  });
}

// Изменение срока обучения поста (выпадающий список)
function cycleTrainingDays(row) {
  const cur = trainingDays[row];
  const newVal = prompt('Введите срок обучения (дни):', cur);
  if (newVal !== null && newVal.trim() !== '' && !isNaN(newVal) && parseInt(newVal) > 0) {
    trainingDays[row] = parseInt(newVal);
    renderMatrix();
  }
}

// Изменение сложности поста (выпадающий список)
function cycleDifficulty(row) {
  const td = document.querySelector(`#iluTable tbody tr:nth-child(${row + 1}) td:nth-child(2)`);
  if (!td) return;
  const cur = difficulty[row];
  const options = [
    { value: 'A', label: 'A — Сложный' },
    { value: 'B', label: 'B — Средний' },
    { value: 'C', label: 'C — Лёгкий' }
  ];
  showInlineSelect(td, cur, options, (newVal) => {
    difficulty[row] = newVal;
    renderMatrix();
  });
}

// Добавление нового оператора
function addOperator() {
  const name = prompt('Введите фамилию оператора:');
  if (!name || name.trim() === '') return;
  operators.push(name.trim());
  operatorAttendance.push('Я');
  operatorRoles.push('О');
  // Расширяем матрицы
  for (let r = 0; r < posts.length; r++) {
    data[r].push(null);
    attendanceData[r].push('');
  }
  renderMatrix();
}

// Добавление нового поста
function addPost() {
  const name = prompt('Введите название поста:');
  if (!name || name.trim() === '') return;
  posts.push(name.trim());
  data.push(new Array(operators.length).fill(null));
  attendanceData.push(new Array(operators.length).fill(''));
  difficulty.push('C');
  ergonomics.push('green');
  trainingDays.push(5); // по умолчанию 5 дней
  renderMatrix();
}

// Удаление оператора
function deleteOperator(name) {
  if (!confirm(`Удалить оператора «${name}»?`)) return;
  const idx = operators.indexOf(name);
  if (idx === -1) return;
  operators.splice(idx, 1);
  operatorAttendance.splice(idx, 1);
  operatorRoles.splice(idx, 1);
  for (let r = 0; r < posts.length; r++) {
    data[r].splice(idx, 1);
    attendanceData[r].splice(idx, 1);
  }
  renderMatrix();
}

// Удаление поста
function deletePost(name) {
  if (!confirm(`Удалить пост «${name}»?`)) return;
  const idx = posts.indexOf(name);
  if (idx === -1) return;
  posts.splice(idx, 1);
  data.splice(idx, 1);
  attendanceData.splice(idx, 1);
  difficulty.splice(idx, 1);
  ergonomics.splice(idx, 1);
  trainingDays.splice(idx, 1);
  renderMatrix();
}

// Редактирование фамилии оператора
function editOperator(oldName) {
  const idx = operators.indexOf(oldName);
  if (idx === -1) return;
  const newName = prompt('Введите новую фамилию оператора:', oldName);
  if (newName && newName.trim() !== '' && newName.trim() !== oldName) {
    operators[idx] = newName.trim();
    renderMatrix();
  }
}

// Редактирование названия поста
function editPost(oldName) {
  const idx = posts.indexOf(oldName);
  if (idx === -1) return;
  const newName = prompt('Введите новое название поста:', oldName);
  if (newName && newName.trim() !== '' && newName.trim() !== oldName) {
    posts[idx] = newName.trim();
    renderMatrix();
  }
}

// Редактирование ФИО начальника цеха или участка
function editChief(type) {
  const id =
    type === 'workshop'
      ? 'infoWorkshopChief'
      : 'infoSectionChief';

  const label =
    type === 'workshop'
      ? 'Начальник цеха'
      : 'Начальник участка';

  const current =
    document.getElementById(id).textContent;

  const newValue = prompt(
    `Введите ФИО ${label}:`,
    current === '—' ? '' : current
  );

  if (newValue !== null) {
    const value = newValue.trim();

    if (type === 'workshop') {
      workshopChief = value;
    } else {
      sectionChief = value;
    }

    document.getElementById(id).textContent =
      value || '—';

    saveState();
  }
}

// ======================== СТАТИСТИКА В КАРТОЧКАХ ========================
function updateStatsCard() {
  // Статистика по постам
  const totalPosts = posts.length;
  let filledPosts = 0, trainingPosts = 0;
  for (let r = 0; r < posts.length; r++) {
    let hasOperator = false, hasTraining = false;
    for (let c = 0; c < operators.length; c++) {
      if (attendanceData[r][c] === '○') hasOperator = true;
      if (attendanceData[r][c] === '△') { hasOperator = true; hasTraining = true; }
    }
    if (hasOperator) filledPosts++;
    if (hasTraining) trainingPosts++;
  }
  document.getElementById('statsTotalPosts').textContent = totalPosts;
  document.getElementById('statsFilledPosts').textContent = filledPosts;
  document.getElementById('statsTrainingPosts').textContent = trainingPosts;

  // Статистика по операторам (исключая НУ)
  const totalOps = operators.filter((_, i) => operatorRoles[i] !== 'НУ').length;
  let present = 0, vacation = 0, sick = 0, absent = 0, fired = 0, otherSector = 0;
  for (let c = 0; c < operators.length; c++) {
    if (operatorRoles[c] === 'НУ') continue;
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

// ======================== ПЕРВИЧНЫЙ ЗАПУСК ========================
restoreSavedFilters();
updateDateBar();
updateInfoCard();
renderMatrix();
renderTrainingTable();
renderPlacementLog();