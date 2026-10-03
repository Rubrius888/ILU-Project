// ======================== ДАННЫЕ ========================

// Список рабочих постов на участке (14 постов)
let posts = [
  "Пост 5 Установка панорамной крыши на кузов справа",
  "Пост 10 Установка панорамной крыши на кузов слева",
  "Пост 25 Установка трубок кондиционера",
  "Пост 35 Установка потолка справа",
  "Пост 40 Установка потолка слева",
  "Пост 50 Установка амортизатора слева",
  "Пост 55 Установка амортизатора справа",
  "Пост 70 Установка стёкол слева",
  "Пост 75 Установка стёкол справа",
  "Пост 95 Подсборка торпеды",
  "Пост 97 Распаковка торпеды",
  "Пост 105 Подсборка потолка",
  "Пост 115 Подсборка стёкол",
  "Пост ПН мастики"
];

// Список операторов на участке (19 человек)
let operators = [
  "Красноусов И.", "Коваленко Ю.", "Абашин А.", "Фролова М.", "Харитонов В.",
  "Вишняков А.", "Исаев Г.", "Куликов К.", "Цуканов И.", "Романов А.",
  "Бортников С.", "Копин А.", "Ордин А.", "Грачёв Д.", "Нуралиев А.",
  "Кожемякин Д.", "Самбуров И.", "Фролова А.", "Сайидов Р."
];

// Сложность каждого поста: A (красный), B (жёлтый), C (зелёный). По умолчанию C.
let difficulty = ['B', 'B', 'A', 'B', 'A', 'B', 'B', 'B', 'B', 'C', 'C', 'B', 'C', 'C'];

// Эргономика каждого поста: red, yellow, green. По умолчанию green.
let ergonomics = ['yellow', 'yellow', 'yellow', 'red', 'red', 'yellow', 'yellow', 'green', 'green', 'green', 'yellow', 'green', 'yellow', 'green'];

// Срок обучения до I (дни) для каждого поста
let trainingDays = [5, 5, 8, 5, 8, 5, 5, 5, 5, 5, 3, 5, 3, 3];

// Статус оператора на каждом посту: '' (пусто), '○' (стоит), '△' (обучается).
// Таблица размером посты × операторы. Изначально все пустые.
let attendanceData = Array.from({ length: posts.length }, () => new Array(operators.length).fill(''));

// Статус явки каждого оператора на сегодня: Я, Н, Б, О, С, У.
// Изначально у всех «Явка».
let operatorAttendance = new Array(19).fill('Я');

// Должности операторов: НУ (начальник участка), СО (старший оператор), О (оператор), Ф (форматор).
// Первый — НУ, второй — СО, остальные — О.
let operatorRoles = ['НУ', 'СО', 'Ф', 'Ф', 'Ф', 'О', 'О', 'О', 'О', 'О', 'О', 'О', 'О', 'О', 'О', 'О', 'О', 'О', 'О'];

// Уровни владения постом (матрица ILU): null, 'Iкр', 'I', 'Lкр', 'L', 'U'.
// Таблица посты × операторы. Изначально все пустые.
let data = [
  // Пост 5 — Красноусов(0), Коваленко(1), Абашин(2), Фролова(3), Харитонов(4), Вишняков(5), Исаев(6), Куликов(7), Цуканов(8), Романов(9), Бортников(10), Копин(11), Ордин(12), Грачёв(13), Нуралиев(14), Кожемякин(15), Самбуров(16), ФроловаА(17), Сайидов(18)
  [null, null, 'U', null, 'U', null, null, null, 'L', null, 'L', null, null, null, null, null, null, null, null],
  // Пост 10
  [null, null, 'L', null, 'U', 'L', null, null, null, null, 'L', null, null, null, null, null, null, null, null],
  // Пост 25
  [null, null, 'U', null, null, null, null, 'L', null, 'L', null, null, null, null, null, null, null, null, null],
  // Пост 35
  [null, 'U', null, null, null, null, null, 'L', 'L', null, null, null, null, null, null, null, null, null, null],
  // Пост 40
  [null, 'U', null, null, 'U', null, null, 'Iкр', null, null, null, null, null, 'L', null, null, null, null, null],
  // Пост 50
  [null, null, null, null, 'U', null, null, 'L', null, 'L', null, null, null, 'L', null, 'L', null, null, null],
  // Пост 55
  [null, null, null, null, 'U', null, null, 'L', 'L', 'L', null, null, null, null, null, null, null, null, null],
  // Пост 70
  [null, 'U', null, 'U', null, 'L', null, null, 'L', 'I', null, null, 'L', null, null, null, null, null, null],
  // Пост 75
  [null, 'U', null, null, null, 'L', null, null, 'L', null, null, null, 'Iкр', null, null, null, 'L', null, null],
  // Пост 95
  [null, 'U', 'U', null, null, null, null, null, null, null, null, 'L', null, null, 'L', null, null, null, null],
  // Пост 97
  [null, 'U', 'U', null, null, null, null, null, null, null, null, 'L', null, null, 'L', null, null, null, 'Iкр'],
  // Пост 105
  [null, 'U', null, 'U', null, null, 'L', null, null, null, null, null, null, null, null, null, null, 'L', null],
  // Пост 115
  [null, 'U', 'L', null, null, 'L', 'L', null, null, null, null, null, null, null, null, null, null, null, null],
  // Пост ПН мастики
  [null, 'U', null, null, null, 'L', null, 'L', 'L', 'L', null, null, null, null, null, null, null, null, null]
];

// Журнал обучений
let trainingRecords = [];

// Журнал расстановки
let placementLog = [];
// Тестовые записи за прошлый месяц (апрель 2026)
(function() {
  const testLog = [];
  const ops = [...operators];
  const pts = [...posts];
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // май = 4, апрель = 3
  const daysInApril = new Date(year, month - 1, 0).getDate();

  // Для каждого буднего дня апреля ставим 1-2 операторов на случайные посты
  for (let d = 1; d <= daysInApril; d++) {
    const date = new Date(year, month - 1, d);
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) continue;
    const dateStr = d + '.' + (month) + '.' + year;

    // 1-2 ротации в день
    const count = 1 + Math.floor(Math.random() * 2);
    const used = new Set();
    for (let i = 0; i < count; i++) {
      const op = ops[Math.floor(Math.random() * ops.length)];
      if (used.has(op)) continue;
      used.add(op);
      const pt = pts[Math.floor(Math.random() * pts.length)];
      testLog.push({ date: dateStr, opName: op, postName: pt });
    }
  }
  placementLog = testLog;
  // Отобразим сразу
  setTimeout(renderPlacementLog, 100);
})();

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
}

// ======================== ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ ========================

// Постановка в журнал расставноввки
function logPlacement(opName, postName) {
  const now = new Date();
  const date = now.toLocaleDateString('ru-RU');
  placementLog.push({ date, opName, postName });
  renderPlacementLog();
}

// Отрисовка журнала расстановки
function renderPlacementLog() {
  const tbody = document.querySelector('#placementLogTable tbody');
  if (!tbody) return;

  if (placementLog.length === 0) {
    tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:#94a3b8;padding:40px;">Журнал пуст. Поставьте оператора на пост в Матрице ILU.</td></tr>';
    return;
  }

  tbody.innerHTML = placementLog.map(entry => `
    <tr>
      <td>${entry.date}</td>
      <td>${entry.opName}</td>
      <td>${entry.postName}</td>
    </tr>
  `).join('');
}

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

// Изменение статуса оператора на конкретном посту (○ стоит, △ обучается, пусто)
function cyclePostStatus(row, col) {
  const td = document.querySelector(`#iluTable tbody tr:nth-child(${row + 1}) td:nth-child(${5 + col * 2})`);
  if (!td) return;
  const cur = attendanceData[row][col];
  const currentLevel = data[row][col];

  const allOptions = [
    { value: '', label: '— Пусто' },
    { value: '○', label: '○ Стоит на посту' },
    { value: '△', label: '△ Обучается' }
  ];

  const options = allOptions.filter(opt => {
    if (opt.value === '') return true;
    if (opt.value === '○') return currentLevel !== null && currentLevel !== '';
    if (opt.value === '△') return currentLevel === 'Iкр';
    return true;
  });

  showInlineSelect(td, cur, options, (newVal) => {
    if (newVal === '○') {
      // Проверяем, не стоит ли уже оператор на другом посту сегодня
      const today = new Date().toLocaleDateString('ru-RU');
            let alreadyOnPost = null;
      for (let r2 = 0; r2 < posts.length; r2++) {
        if (r2 === row) continue;
        if (attendanceData[r2][col] === '○') {
          alreadyOnPost = posts[r2];
          break;
        }
      }

      if (alreadyOnPost) {
        const choice = confirm(
          `Оператор ${operators[col]} уже стоит на посту «${alreadyOnPost}» сегодня.\n` +
          `Нажмите «ОК» — оставить в журнале новый пост «${posts[row]}»\n` +
          `Нажмите «Отмена» — оставить старый пост «${alreadyOnPost}»`
        );
        if (choice) {
          // Оставляем новый пост: удаляем старую запись
          placementLog = placementLog.filter(entry =>
            !(entry.date === today && entry.opName === operators[col] && entry.postName === alreadyOnPost)
          );
          logPlacement(operators[col], posts[row]);
        } else {
          // Оставляем старый пост: не записываем новый
          // и убираем оператора с текущего поста
          attendanceData[row][col] = '';
        }
      } else {
        logPlacement(operators[col], posts[row]);
      }
    }

    if (newVal === '○' || newVal === '△') {
      for (let r = 0; r < posts.length; r++) {
        if (r !== row) attendanceData[r][col] = '';
      }
      if (operatorRoles[col] !== 'НУ') operatorAttendance[col] = 'Я';
    }

    attendanceData[row][col] = newVal;
    if (newVal === '○' && data[row][col] === 'I') {
      data[row][col] = 'Lкр';
    }
    renderMatrix();
  });
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
  const id = type === 'workshop' ? 'infoWorkshopChief' : 'infoSectionChief';
  const label = type === 'workshop' ? 'Начальник цеха' : 'Начальник участка';
  const current = document.getElementById(id).textContent;
  const newValue = prompt(`Введите ФИО ${label}:`, current === '—' ? '' : current);
  if (newValue !== null) {
    document.getElementById(id).textContent = newValue.trim() || '—';
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
let currentMenu = null;
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
  document.getElementById('infoDepartment').textContent = document.getElementById('filterDepartment').value;
  document.getElementById('infoWorkshop').textContent = document.getElementById('filterWorkshop').value;
  document.getElementById('infoSection').textContent = document.getElementById('filterSection').value;
  document.getElementById('infoShift').textContent = document.getElementById('filterShift').value;
}
document.getElementById('filterDepartment').addEventListener('change', updateInfoCard);
document.getElementById('filterWorkshop').addEventListener('change', updateInfoCard);
document.getElementById('filterSection').addEventListener('change', updateInfoCard);
document.getElementById('filterShift').addEventListener('change', updateInfoCard);

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
      if (operatorRoles[c] === 'НУ' || operatorRoles[c] === 'СО') continue;
      const lvl = data[r][c];
      if (lvl === 'L' || lvl === 'U') countLU++;
    }
    postCoverage.push({ index: r, name: posts[r], coverage: countLU });
  }

  // Считаем поливалентность каждого оператора (L/U)
  const opPoly = [];
  for (let c = 0; c < operators.length; c++) {
    if (operatorRoles[c] === 'НУ' || operatorRoles[c] === 'СО') continue;
    let count = 0;
    for (let r = 0; r < posts.length; r++) {
      const lvl = data[r][c];
      if (lvl === 'L' || lvl === 'U') count++;
    }
    opPoly.push({ index: c, name: operators[c], count });
  }

  const virtualCoverage = postCoverage.map(p => p.coverage);

  function findBestPost(opIndex) {
    const quickPosts = [];
    const otherPosts = [];
    for (const p of postCoverage) {
      const lvl = data[p.index][opIndex];
      if (lvl === 'I' || lvl === 'Iкр') quickPosts.push(p);
      else if (lvl === null || lvl === '' || lvl === 'L') otherPosts.push(p);
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
        if (lvl === 'I' || lvl === 'Iкр') { bestOp = o; usedOps.add(o.index); break; }
      }
      if (!bestOp) {
        for (const o of sortedOps) {
          if (usedOps.has(o.index)) continue;
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
          if (lvl === 'I' || lvl === 'Iкр' || lvl === 'L') { bestOp = o; usedOps.add(o.index); break; }
        }
        if (!bestOp) {
          for (const o of sortedOps) {
            if (usedOps.has(o.index)) continue;
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

  // Этап 4: 3L по операторам
  if (planAssignments.length === 0) {
    const opsNeed3L = opPoly.filter(o => o.count < 3);
    if (opsNeed3L.length > 0) {
      for (const o of opsNeed3L) {
        const bestPost = findBestPost(o.index);
        if (bestPost) {
          virtualCoverage[bestPost.index]++;
          planAssignments.push({ postIndex: bestPost.index, opIndex: o.index, stage: '3L операторы' });
        }
      }
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
function editCalendarCell(event) {
  event.stopPropagation();
  hideMenu();

  const td = event.target;
  const opName = td.getAttribute('data-op');
  if (!opName) return;

  const menu = document.createElement('div');
  menu.className = 'context-menu';
  menu.innerHTML = `<div class="danger" onclick="deleteCalendarTraining('${opName}'); hideMenu();">🗑️ Удалить все обучения</div>`;
  menu.style.left = event.clientX + 'px';
  menu.style.top = event.clientY + 'px';
  document.body.appendChild(menu);
  currentMenu = menu;
  setTimeout(() => document.addEventListener('click', hideMenu, { once: true }), 0);
}

function deleteCalendarTraining(opName) {
  if (!confirm(`Удалить все обучения оператора «${opName}» из плана?`)) return;
  const tbody = document.querySelector('#devCalendarTable tbody');
  if (!tbody) return;
  const allTd = tbody.querySelectorAll('td[data-op="' + opName + '"]');
  allTd.forEach(td => {
    td.textContent = '+';
    td.style.color = '#94a3b8';
    td.style.fontSize = '16px';
    td.style.fontWeight = '400';
    td.style.cursor = 'pointer';
    td.onclick = function(e) { addCalendarTraining(e); };
    td.removeAttribute('data-op');
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
  operators.forEach(op => {
    html += `<div onclick="placeCalendarOp('${op}', ${postIndex}, ${dayIndex}); hideMenu();">${op}</div>`;
  });
  menu.innerHTML = html;
  menu.style.left = event.clientX + 'px';
  menu.style.top = event.clientY + 'px';
  document.body.appendChild(menu);
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
  // ... остальное без изменений

  const allTd = row.querySelectorAll('td');
  const year = new Date().getFullYear();
  const month = new Date().getMonth();
  const daysInMonth = window.daysInMonth || 31;
  let placed = 0;

  for (let d = startDay; d < daysInMonth && placed < days; d++) {
    const dayOfWeek = new Date(year, month, d + 1).getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) continue;
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
      if (operatorRoles[c] === 'НУ' || operatorRoles[c] === 'СО') continue;
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
      if (operatorRoles[c] === 'НУ' || operatorRoles[c] === 'СО') continue;
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
function editRotationCell(event) {
  event.stopPropagation();
  hideMenu();

  const td = event.target;
  const opName = td.getAttribute('data-op');
  if (!opName) return;

  const menu = document.createElement('div');
  menu.className = 'context-menu';
  menu.innerHTML = `<div class="danger" onclick="deleteRotationOp('${opName}', ${td.getAttribute('data-post')}); hideMenu();">🗑️ Убрать оператора</div>`;
  menu.style.left = event.clientX + 'px';
  menu.style.top = event.clientY + 'px';
  document.body.appendChild(menu);
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
    if (operatorRoles[idx] === 'НУ' || operatorRoles[idx] === 'СО') return false;
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
  menu.style.left = event.clientX + 'px';
  menu.style.top = event.clientY + 'px';
  document.body.appendChild(menu);
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

// ======================== ЖУРНАЛ ОБУЧЕНИЙ ========================
function addTrainingRecord() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.toLocaleString('ru-RU', { month: 'long' });

  // Выбор оператора
  const opName = prompt('Введите фамилию оператора:');
  if (!opName || !operators.includes(opName.trim())) {
    alert('Оператор не найден');
    return;
  }
  const op = opName.trim();

  // Выбор поста
  let postList = 'Список постов:\n';
  posts.forEach((p, i) => { postList += (i + 1) + '. ' + p + '\n'; });
  const postNum = prompt(postList + '\nВведите номер поста:');
  if (!postNum || isNaN(postNum) || postNum < 1 || postNum > posts.length) {
    alert('Некорректный номер поста');
    return;
  }
  const post = posts[parseInt(postNum) - 1];
  const postIndex = parseInt(postNum) - 1;

  // Уровень
  const level = prompt('Введите уровень (Iкр, I, Lкр, L, U):');
  if (!['Iкр','I','Lкр','L','U'].includes(level)) {
    alert('Некорректный уровень');
    return;
  }

  // Статус
  const status = prompt('Введите статус (План, В процессе, Завершено):');
  if (!status) return;

  // Форматор
  const formator = prompt('Введите фамилию форматора:') || '—';

  // Даты
  const startDate = prompt('Дата начала обучения (ДД.ММ.ГГГГ):', now.toLocaleDateString('ru-RU'));
  const validDate = prompt('Дата валидации (ДД.ММ.ГГГГ, можно оставить пустым):') || '—';

  // Срок
  const duration = prompt('Срок обучения (дней):', trainingDays[postIndex]) || trainingDays[postIndex];

  // Комментарий
  const comment = prompt('Комментарий (больничный, отпуск и т.д.):') || '—';

  // Неделя начала и окончания
  const startWeek = getWeekNumber(new Date(startDate.split('.').reverse().join('-')));
  const endWeek = duration ? startWeek + Math.ceil(parseInt(duration) / 7) - 1 : startWeek;

  trainingRecords.push({
    year, month, startWeek, endWeek, post, op, level, status,
    formator, startDate, validDate, duration, comment
  });

  renderTrainingTable();
}

function getWeekNumber(date) {
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const days = Math.floor((date - startOfYear) / (1000 * 60 * 60 * 24));
  return Math.ceil((days + startOfYear.getDay() + 1) / 7);
}

function deleteTrainingRecord(index) {
  if (!confirm('Удалить запись об обучении?')) return;
  trainingRecords.splice(index, 1);
  renderTrainingTable();
}

function renderTrainingTable() {
  const tbody = document.querySelector('#trainingTable tbody');
  if (!tbody) return;

  if (trainingRecords.length === 0) {
    tbody.innerHTML = '<tr><td colspan="14" style="text-align:center;color:#94a3b8;padding:40px;">Нет записей. Нажмите «+ Добавить запись»</td></tr>';
    return;
  }

  tbody.innerHTML = trainingRecords.map((r, i) => `
    <tr>
      <td>${r.year}</td>
      <td>${r.month}</td>
      <td>${r.startWeek}</td>
      <td>${r.endWeek}</td>
      <td>${r.post}</td>
      <td>${r.op}</td>
      <td>${r.level}</td>
      <td>${r.status}</td>
      <td>${r.formator}</td>
      <td>${r.startDate}</td>
      <td style="cursor:pointer;color:#2563eb;" onclick="editTrainingField(${i}, 'validDate')">${r.validDate}</td>
      <td>${r.duration}</td>
      <td style="cursor:pointer;color:#2563eb;" onclick="editTrainingField(${i}, 'comment')">${r.comment}</td>
      <td><span style="cursor:pointer;color:#ef4444;" onclick="deleteTrainingRecord(${i})">✕</span></td>
    </tr>
  `).join('');
}

function editTrainingField(index, field) {
  const record = trainingRecords[index];
  let label, current;

  if (field === 'validDate') {
    label = 'Дата валидации (ДД.ММ.ГГГГ)';
    current = record.validDate;
  } else if (field === 'comment') {
    label = 'Комментарий';
    current = record.comment;
  } else return;

  const newVal = prompt(label + ':', current === '—' ? '' : current);
  if (newVal !== null) {
    if (field === 'validDate') {
      record.validDate = newVal.trim() || '—';
    } else if (field === 'comment') {
      record.comment = newVal.trim() || '—';
    }
    renderTrainingTable();
  }
}

// ======================== ПЕРВИЧНЫЙ ЗАПУСК ========================
updateDateBar();
updateInfoCard();
renderMatrix();