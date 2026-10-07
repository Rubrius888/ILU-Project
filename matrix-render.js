// ======================== ОТРИСОВКА ТАБЛИЦЫ ========================

function isOtherSectorOperator(index) {
  return operatorRoles[index] === 'ДС';
}

function renderMatrix() {
  const thead = document.querySelector('#iluTable thead');
  const tbody = document.querySelector('#iluTable tbody');
  const matrixTableContainer =
    document.getElementById('matrixTableContainer');
  const emptyMatrixState =
    document.getElementById('emptyMatrixState');
  const emptyMatrixHint =
    document.getElementById('emptyMatrixHint');
  const matrixAddActions =
    document.getElementById('matrixAddActions');

  const matrixIsEmpty =
    posts.length === 0 ||
    operators.length === 0;

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

    if (typeof recordStatsSnapshot === 'function') {
      recordStatsSnapshot();
    }

    updateStatsCard();
    saveState();

    return;
  }

  // ----- АКТИВНОСТЬ ОПЕРАТОРОВ -----

  const operatorActive =
    new Array(operators.length).fill(false);

  for (let c = 0; c < operators.length; c++) {
    if (isOtherSectorOperator(c)) continue;

    for (let r = 0; r < posts.length; r++) {
      if (
        attendanceData[r][c] === '○' ||
        attendanceData[r][c] === '△'
      ) {
        operatorActive[c] = true;
        break;
      }
    }
  }

  // ----- ЗАГОЛОВОК 0: ДОЛЖНОСТИ -----

  thead.innerHTML =
    '<tr>' +
    '<th></th><th></th><th></th><th></th>' +
    operators.map((operator, index) => {
      const role = operatorRoles[index];

      return `
        <th
          colspan="2"
          data-operator-index="${index}"
          style="cursor:pointer;font-size:11px;color:#64748b;"
          onclick="cycleOperatorRole(${index})"
        >${role}</th>
      `;
    }).join('') +
    '</tr>';

  // ----- ЗАГОЛОВОК 1: ФАМИЛИИ ОПЕРАТОРОВ -----

  const trNames = document.createElement('tr');

  trNames.innerHTML =
    '<th>Пост</th>' +
    '<th>Сл.</th>' +
    '<th>Эрг.</th>' +
    '<th>Срок обучения до I</th>' +

    operators.map((operator, index) => `
      <th
        colspan="2"
        data-operator-index="${index}"
        style="cursor:pointer;"
        onclick="showOperatorMenu(event, '${operator}')"
      >${operator}</th>
    `).join('') +

    '<th rowspan="2" class="matrix-summary-column matrix-cover-column" style="vertical-align:middle;">' +
      '<span style="writing-mode:sideways-lr;">Покрытие U</span>' +
    '</th>' +

    '<th rowspan="2" class="matrix-summary-column matrix-poly3-column" style="vertical-align:middle;">' +
      '<span style="writing-mode:sideways-lr;">Поливал. 3L</span>' +
    '</th>' +

    '<th rowspan="2" class="matrix-summary-column matrix-poly2-column" style="vertical-align:middle;">' +
      '<span style="writing-mode:sideways-lr;">Поливал. 2L</span>' +
    '</th>';

  thead.appendChild(trNames);

  trNames.querySelector('.matrix-cover-column').title =
    'Покрытие U по посту: количество операторов с уровнем U';
  trNames.querySelector('.matrix-poly3-column').title =
    'Поливалентность 3L по посту: количество операторов с уровнем L или U';
  trNames.querySelector('.matrix-poly2-column').title =
    'Поливалентность 2L по посту: количество операторов с уровнем L или U';

  // ----- ЗАГОЛОВОК 2: СТАТУС И УРОВЕНЬ -----

  const trSub = document.createElement('tr');

  trSub.innerHTML =
    '<th></th><th></th><th></th><th></th>' +

    operators.map((operator, index) => {
      const background =
        operatorActive[index]
          ? 'background:#cbd5e1;'
          : '';

      return `
        <th
          data-operator-index="${index}"
          style="${background}"
        >
          <span style="writing-mode:sideways-lr;">Статус</span>
        </th>

        <th
          data-operator-index="${index}"
          style="${background}"
        >
          <span style="writing-mode:sideways-lr;">Уровень</span>
        </th>
      `;
    }).join('');

  thead.appendChild(trSub);

  // ----- ТЕЛО ТАБЛИЦЫ -----

  tbody.innerHTML = '';

  for (let r = 0; r < posts.length; r++) {
    const tr = document.createElement('tr');
    tr.dataset.postIndex = r;

    const postName = posts[r];

    let rowActive = false;
    let rowHasIcr = false;
    let rowHasQualifiedSupport = false;

    for (let c = 0; c < operators.length; c++) {
      if (
        attendanceData[r][c] === '○' ||
        attendanceData[r][c] === '△'
      ) {
        rowActive = true;

        const level = data[r][c];

        if (level === 'Iкр') {
          rowHasIcr = true;
        }

        if (level === 'L' || level === 'U') {
          rowHasQualifiedSupport = true;
        }
      }
    }

    // Iкр без опытного оператора L/U считается критичным постом.
    // I, Lкр и второй Iкр не закрывают обучение на посту.
    if (
      !rowActive ||
      (rowHasIcr && !rowHasQualifiedSupport)
    ) {
      tr.classList.add('matrix-row-alert-red');
    } else if (rowHasIcr) {
      // Iкр вместе с L или U — пост закрыт, но остаётся учебным.
      tr.classList.add('matrix-row-alert-yellow');
    }

    const postBackground =
      rowActive
        ? 'background:#e2e8f0;'
        : '';

    tr.innerHTML = `
      <td
        style="cursor:pointer;${postBackground}"
        onclick="showPostMenu(event, '${postName}')"
      >${postName}</td>
    `;

    // ----- СЛОЖНОСТЬ -----

    const tdDiff = document.createElement('td');
    const diff = difficulty[r];

    tdDiff.className = 'cell';
    tdDiff.style.minWidth = '45px';
    tdDiff.style.fontWeight = '700';
    tdDiff.style.fontSize = '14px';
    tdDiff.style.color = '#1e293b';

    if (diff === 'A') {
      tdDiff.textContent = 'A';
      tdDiff.style.backgroundColor = '#fecaca';
    } else if (diff === 'B') {
      tdDiff.textContent = 'B';
      tdDiff.style.backgroundColor = '#fef08a';
    } else {
      tdDiff.textContent = 'C';
      tdDiff.style.backgroundColor = '#bbf7d0';
    }

    tdDiff.onclick = () => cycleDifficulty(r);
    tr.appendChild(tdDiff);

    // ----- ЭРГОНОМИКА -----

    const tdErgo = document.createElement('td');
    const ergo = ergonomics[r];

    tdErgo.className = 'cell';
    tdErgo.style.minWidth = '45px';
    tdErgo.style.fontWeight = '700';
    tdErgo.style.fontSize = '14px';
    tdErgo.style.color = '#1e293b';

    if (ergo === 'red') {
      tdErgo.textContent = 'К';
      tdErgo.style.backgroundColor = '#fecaca';
    } else if (ergo === 'yellow') {
      tdErgo.textContent = 'Ж';
      tdErgo.style.backgroundColor = '#fef08a';
    } else {
      tdErgo.textContent = 'З';
      tdErgo.style.backgroundColor = '#bbf7d0';
    }

    tdErgo.onclick = () => cycleErgonomics(r);
    tr.appendChild(tdErgo);

    // ----- СРОК ОБУЧЕНИЯ -----

    const tdDays = document.createElement('td');

    tdDays.textContent = trainingDays[r];
    tdDays.className = 'cell';
    tdDays.onclick = () => cycleTrainingDays(r);
    tr.appendChild(tdDays);

    // ----- ЯЧЕЙКИ ОПЕРАТОРОВ -----

    for (let c = 0; c < operators.length; c++) {
      // Статус на посту
      const tdPost = document.createElement('td');
      const postStatus = attendanceData[r][c];

      tdPost.dataset.operatorIndex = c;
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

      tdPost.title =
        `${postName}\n` +
        `${operators[c]}`;

      // Проверяем давность стояния на посту
      try {
        const currentLevel = data[r][c];

        if (currentLevel && currentLevel !== '') {
          const ageColor =
            getPlacementAgeColor(
              operators[c],
              posts[r]
            );

          if (ageColor === 'red') {
            tdPost.style.animation =
              'blink-red 1s infinite';
          } else if (ageColor === 'yellow') {
            tdPost.style.animation =
              'blink-yellow 1s infinite';
          }
        }
      } catch (error) {
        // Ничего не делаем
      }

      tdPost.onclick = () => cyclePostStatus(r, c);
      tr.appendChild(tdPost);

      // Уровень ILU
      const tdLvl = document.createElement('td');
      const level = data[r][c];

      tdLvl.dataset.operatorIndex = c;
      tdLvl.textContent = level || '';
      tdLvl.className = 'cell';
      tdLvl.title =
        `${postName}\n` +
        `${operators[c]}`;

      if (level === 'Iкр') {
        tdLvl.classList.add('level-I');
        tdLvl.style.color = '#ef4444';
        tdLvl.style.fontWeight = '900';
      }

      if (level === 'I') {
        tdLvl.classList.add('level-I');
      }

      if (level === 'Lкр') {
        tdLvl.classList.add('level-L');
        tdLvl.style.color = '#ef4444';
        tdLvl.style.fontWeight = '900';
      }

      if (level === 'L') {
        tdLvl.classList.add('level-L');
      }

      if (level === 'U') {
        tdLvl.classList.add('level-U');
      }

      tdLvl.onclick = () => cycleLevel(r, c);
      tr.appendChild(tdLvl);
    }

    // ----- ПОКРЫТИЕ U -----

    const tdCover = document.createElement('td');
    tdCover.classList.add(
      'matrix-summary-column',
      'matrix-cover-column'
    );
    let uCount = 0;

    for (let c = 0; c < operators.length; c++) {
      if (isOtherSectorOperator(c)) continue;

      if (
        operatorRoles[c] !== 'НУ' &&
        data[r][c] === 'U'
      ) {
        uCount++;
      }
    }

    tdCover.textContent = uCount > 0 ? uCount : '';
    tdCover.title =
      `${postName}\n` +
      `Покрытие U: ${uCount} оператор${
        uCount === 1 ? '' : 'а'
      }`;
    tdCover.style.fontWeight = '700';
    tdCover.style.textAlign = 'center';
    tdCover.style.verticalAlign = 'middle';

    if (uCount > 0) {
      tdCover.style.backgroundColor = '#bbf7d0';
      tdCover.style.color = '#166534';
    }

    tr.appendChild(tdCover);

    // ----- ПОЛИВАЛЕНТНОСТЬ 3L -----

    const tdPoly3 = document.createElement('td');
    tdPoly3.classList.add(
      'matrix-summary-column',
      'matrix-poly3-column'
    );
    let countL3 = 0;

    for (let c = 0; c < operators.length; c++) {
      if (
        operatorRoles[c] === 'НУ' ||
        operatorRoles[c] === 'ДС' ||
        operatorRoles[c] === 'СО'
      ) {
        continue;
      }

      const level = data[r][c];

      if (level === 'L' || level === 'U') {
        countL3++;
      }
    }

    tdPoly3.textContent =
      countL3 >= 3
        ? `(${countL3})`
        : '';
    tdPoly3.title =
      `${postName}\n` +
      `Операторов с L/U: ${countL3}`;

    tdPoly3.style.fontWeight = '700';
    tdPoly3.style.textAlign = 'center';

    if (countL3 >= 3) {
      tdPoly3.style.backgroundColor = '#bbf7d0';
      tdPoly3.style.color = '#166534';
    }

    tr.appendChild(tdPoly3);

    // ----- ПОЛИВАЛЕНТНОСТЬ 2L -----

    const tdPoly2 = document.createElement('td');
    tdPoly2.classList.add(
      'matrix-summary-column',
      'matrix-poly2-column'
    );

    tdPoly2.textContent =
      countL3 >= 2
        ? `(${countL3})`
        : '';
    tdPoly2.title =
      `${postName}\n` +
      `Операторов с L/U: ${countL3}`;

    tdPoly2.style.fontWeight = '700';
    tdPoly2.style.textAlign = 'center';

    if (countL3 >= 2) {
      tdPoly2.style.backgroundColor = '#bbf7d0';
      tdPoly2.style.color = '#166534';
    }

    tr.appendChild(tdPoly2);

    tbody.appendChild(tr);
  }

  // ----- РАСЧЁТ ПРОЦЕНТОВ -----

  const totalPosts = posts.length;

  let coveredPosts = 0;

  for (let r = 0; r < posts.length; r++) {
    for (let c = 0; c < operators.length; c++) {
      if (isOtherSectorOperator(c)) continue;

      if (
        operatorRoles[c] !== 'НУ' &&
        data[r][c] === 'U'
      ) {
        coveredPosts++;
        break;
      }
    }
  }

  const percentU =
    totalPosts > 0
      ? Math.round((coveredPosts / totalPosts) * 100)
      : 0;

  let posts3L = 0;
  let posts2L = 0;

  for (let r = 0; r < posts.length; r++) {
    let countL = 0;

    for (let c = 0; c < operators.length; c++) {
      if (
        operatorRoles[c] === 'НУ' ||
        operatorRoles[c] === 'ДС' ||
        operatorRoles[c] === 'СО'
      ) {
        continue;
      }

      const level = data[r][c];

      if (level === 'L' || level === 'U') {
        countL++;
      }
    }

    if (countL >= 3) posts3L++;
    if (countL >= 2) posts2L++;
  }

  const percent3L =
    totalPosts > 0
      ? Math.round((posts3L / totalPosts) * 100)
      : 0;

  const percent2L =
    totalPosts > 0
      ? Math.round((posts2L / totalPosts) * 100)
      : 0;

  let ops3L = 0;
  let ops2L = 0;

    const totalOpsForPolyvalence =
    operators.filter(
      (_, index) =>
        operatorRoles[index] !== 'НУ' &&
        operatorRoles[index] !== 'ДС' &&
        operatorRoles[index] !== 'СО'
    ).length;

  for (let c = 0; c < operators.length; c++) {
    if (
      operatorRoles[c] === 'НУ' ||
      operatorRoles[c] === 'ДС' ||
      operatorRoles[c] === 'СО'
    ) {
      continue;
    }

    let count = 0;

    for (let r = 0; r < posts.length; r++) {
      const level = data[r][c];

      if (level === 'L' || level === 'U') {
        count++;
      }
    }

    if (count >= 3) ops3L++;
    if (count >= 2) ops2L++;
  }

  const percentOps3L =
    totalOpsForPolyvalence > 0
      ? Math.round((ops3L / totalOpsForPolyvalence) * 100)
      : 0;

  const percentOps2L =
    totalOpsForPolyvalence > 0
      ? Math.round((ops2L / totalOpsForPolyvalence) * 100)
      : 0;

  const total3L =
    Math.round((percent3L + percentOps3L) / 2);

  const total2L =
    Math.round((percent2L + percentOps2L) / 2);

  // ----- СТРОКА «СТАТУС ЯВКИ» -----

  const trFooter = document.createElement('tr');

  trFooter.innerHTML =
    '<td style="font-weight:700;">Статус явки</td>' +
    '<td></td><td></td><td></td>' +

    operators.map((operator, index) => {
      const attendance = operatorAttendance[index];
      const isExternalOperator =
        isOtherSectorOperator(index);

      let color = '#16a34a';

      if (attendance === 'Н') color = '#ef4444';
      if (attendance === 'Б') color = '#ef4444';
      if (attendance === 'О') color = '#9333ea';
      if (attendance === 'С') color = '#ea580c';
      if (attendance === 'У') color = '#64748b';

      if (isExternalOperator) {
        color = '#2563eb';
      }

      const label = isExternalOperator
        ? 'ДС'
        : attendance === 'Я'
          ? 'Явка'
          : attendance === 'Н'
            ? 'Неявка'
            : attendance === 'Б'
              ? 'Больничный'
              : attendance === 'О'
                ? 'Отпуск'
                : attendance === 'С'
                  ? 'В др. секторе'
                  : 'Уволен';

      return `
        <td
          colspan="2"
          data-operator-index="${index}"
          style="
            color:${color};
            cursor:${isExternalOperator ? 'default' : 'pointer'};
            font-weight:700;
            font-size:12px;
          "
          onclick="cycleOperatorAttendance(${index})"
        >${label}</td>
      `;
    }).join('') +

    `<td style="font-weight:700;font-size:14px;color:#166534;">
      ${percentU}%
    </td>` +

    `<td style="font-weight:700;font-size:14px;color:#166534;">
      ${percent3L}%
    </td>` +

    `<td style="font-weight:700;font-size:14px;color:#166534;">
      ${percent2L}%
    </td>`;

  tbody.appendChild(trFooter);

  const footerSummaryStart = 4 + operators.length;
  trFooter.cells[footerSummaryStart].title =
    `Покрытие U по постам: ${percentU}%`;
  trFooter.cells[footerSummaryStart + 1].title =
    `Поливалентность 3L по постам: ${percent3L}%`;
  trFooter.cells[footerSummaryStart + 2].title =
    `Поливалентность 2L по постам: ${percent2L}%`;

  // ----- СТРОКА «ПОЛИВАЛЕНТНОСТЬ 3L» -----

  const trPoly3 = document.createElement('tr');

  trPoly3.innerHTML =
    '<td style="font-weight:700;">Поливалентность 3L</td>' +
    '<td></td><td></td><td></td>' +

    operators.map((operator, index) => {
      const count = getOperatorPolyvalence(index);
      const isEnough = count >= 3;
      const background = isEnough
        ? '#bbf7d0'
        : 'transparent';

      return `
        <td
          colspan="2"
          data-operator-index="${index}"
          style="
            background:${background};
            font-weight:700;
            font-size:12px;
          "
        >(${count})</td>
      `;
    }).join('') +

    `<td style="font-weight:700;font-size:14px;color:#166534;">
      ${percentOps3L}%
    </td>` +

    `<td style="font-weight:700;font-size:14px;color:#166534;">
      ${total3L}%
    </td>` +

    '<td></td>';

  tbody.appendChild(trPoly3);

  trPoly3
    .querySelectorAll('[data-operator-index]')
    .forEach(cell => {
      const index = Number(cell.dataset.operatorIndex);
      const count = getOperatorPolyvalence(index);
      cell.title =
        `${operators[index]}\n` +
        `Поливалентность 3L: ${count} пост${
          count === 1 ? '' : 'ов'
        } с уровнем L/U`;
    });

  trPoly3.cells[footerSummaryStart].title =
    `Поливалентность 3L по операторам: ${percentOps3L}%`;
  trPoly3.cells[footerSummaryStart + 1].title =
    `Средняя поливалентность участка 3L: ${total3L}%`;

  // ----- СТРОКА «ПОЛИВАЛЕНТНОСТЬ 2L» -----

  const trPoly2 = document.createElement('tr');

  trPoly2.innerHTML =
    '<td style="font-weight:700;">Поливалентность 2L</td>' +
    '<td></td><td></td><td></td>' +

    operators.map((operator, index) => {
      const count = getOperatorPolyvalence(index);
      const isEnough = count >= 2;
      const background = isEnough
        ? '#bbf7d0'
        : 'transparent';

      return `
        <td
          colspan="2"
          data-operator-index="${index}"
          style="
            background:${background};
            font-weight:700;
            font-size:12px;
          "
        >(${count})</td>
      `;
    }).join('') +

    `<td style="font-weight:700;font-size:14px;color:#166534;">
      ${percentOps2L}%
    </td>` +
    '<td></td>' +

    `<td style="font-weight:700;font-size:14px;color:#166534;">
      ${total2L}%
    </td>`;

  tbody.appendChild(trPoly2);

  trPoly2
    .querySelectorAll('[data-operator-index]')
    .forEach(cell => {
      const index = Number(cell.dataset.operatorIndex);
      const count = getOperatorPolyvalence(index);
      cell.title =
        `${operators[index]}\n` +
        `Поливалентность 2L: ${count} пост${
          count === 1 ? '' : 'ов'
        } с уровнем L/U`;
    });

  trPoly2.cells[footerSummaryStart].title =
    `Поливалентность 2L по операторам: ${percentOps2L}%`;
  trPoly2.cells[footerSummaryStart + 2].title =
    `Средняя поливалентность участка 2L: ${total2L}%`;

  setupMatrixHoverHighlight();

  // Сохраняем показатели для updateStatsCard
  window._polyData = {
    percent2L,
    percent3L,
    percentOps2L,
    percentOps3L,
    total2L,
    total3L
  };

  if (typeof recordStatsSnapshot === 'function') {
    recordStatsSnapshot();
  }

  updateStatsCard();
  saveState();
}

function setupMatrixHoverHighlight() {
  const table = document.getElementById('iluTable');

  if (
    !table ||
    table.dataset.hoverBound === 'true'
  ) {
    return;
  }

  table.dataset.hoverBound = 'true';

  const clearHighlight = () => {
    table
      .querySelectorAll(
        '.matrix-hover-row, .matrix-hover-column'
      )
      .forEach(element => {
        element.classList.remove('matrix-hover-row');
        element.classList.remove('matrix-hover-column');
      });
  };

  table.addEventListener('mouseover', event => {
    const cell = event.target.closest('td, th');

    if (!cell || !table.contains(cell)) {
      return;
    }

    clearHighlight();

    const row = cell.closest('tr[data-post-index]');

    if (row) {
      row.classList.add('matrix-hover-row');
    }

    const operatorIndex =
      cell.dataset.operatorIndex;

    if (operatorIndex === undefined) {
      return;
    }

    table
      .querySelectorAll(
        `[data-operator-index="${operatorIndex}"]`
      )
      .forEach(element => {
        element.classList.add('matrix-hover-column');
      });
  });

  table.addEventListener(
    'mouseleave',
    clearHighlight
  );
}

// ======================== ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ ========================

function getOperatorPolyvalence(index) {
  // НУ и СО не учитываются в поливалентности
  if (
    operatorRoles[index] === 'НУ' ||
    operatorRoles[index] === 'ДС' ||
    operatorRoles[index] === 'СО'
  ) {
    return 0;
  }

  let countLU = 0;

  for (let r = 0; r < posts.length; r++) {
    const level = data[r][index];

    if (level === 'L' || level === 'U') {
      countLU++;
    }
  }

  return countLU;
}
