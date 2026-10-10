// ======================== ЛОГИКА ВЗАИМОДЕЙСТВИЯ ========================

function hasStartedCriticalTraining(row, col) {
  if (!Array.isArray(trainingRecords)) {
    return false;
  }

  const level = data[row]?.[col];

  if (level !== 'Iкр' && level !== 'Lкр') {
    return false;
  }

  return trainingRecords.some(record =>
    record.post === posts[row] &&
    record.op === operators[col] &&
    record.level === level &&
    record.status === 'В процессе'
  );
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
      if (
        (currentLevel === 'Iкр' || currentLevel === 'Lкр') &&
        (
          cur !== '△' ||
          !hasStartedCriticalTraining(row, col)
        )
      ) {
        return false;
      }

      return currentLevel !== null &&
        currentLevel !== '';
    }

    if (option.value === '△') {
      return (
        (currentLevel === 'Iкр' || currentLevel === 'Lкр') &&
        operatorRoles[col] !== 'ДС'
      );
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

        const trainingRecordsChanged =
          typeof clearActiveTrainingRecordsForPlacement === 'function' &&
          clearActiveTrainingRecordsForPlacement(row, col);

        // Статус обучения удалён из матрицы — сразу обновляем журнал
        // обучения, не затрагивая историческую запись расстановки.
        if (
          trainingRecordsChanged &&
          typeof renderTrainingTable === 'function'
        ) {
          renderTrainingTable();
        }

        renderMatrix();
        return;
      }

      if (
        newVal === '○' &&
        (data[row][col] === 'Iкр' ||
          data[row][col] === 'Lкр') &&
        (
          attendanceData[row][col] !== '△' ||
          !hasStartedCriticalTraining(row, col)
        )
      ) {
        alert(
          'Сначала поставьте оператору △ «Обучается» ' +
          'и сохраните запись «В процессе» в журнале обучения.'
        );
        return;
      }

      const isCirclePlacement = newVal === '○';
      const shouldPromoteIToLcr =
        isCirclePlacement && data[row][col] === 'I';
      const placementSnapshot = isCirclePlacement
        ? {
            attendanceData: attendanceData.map(item =>
              Array.isArray(item) ? item.slice() : item
            ),
            operatorAttendance: Array.isArray(operatorAttendance)
              ? operatorAttendance.slice()
              : operatorAttendance,
            data: data.map(item =>
              Array.isArray(item) ? item.slice() : item
            ),
            trainingRecords: Array.isArray(trainingRecords)
              ? trainingRecords.slice()
              : trainingRecords,
            placementLog: Array.isArray(placementLog)
              ? placementLog.slice()
              : placementLog
          }
        : null;

      const restoreCirclePlacement = () => {
        if (!placementSnapshot) return;

        attendanceData = placementSnapshot.attendanceData.map(item =>
          Array.isArray(item) ? item.slice() : item
        );
        operatorAttendance = Array.isArray(
          placementSnapshot.operatorAttendance
        )
          ? placementSnapshot.operatorAttendance.slice()
          : placementSnapshot.operatorAttendance;
        data = placementSnapshot.data.map(item =>
          Array.isArray(item) ? item.slice() : item
        );
        trainingRecords = Array.isArray(
          placementSnapshot.trainingRecords
        )
          ? placementSnapshot.trainingRecords.slice()
          : placementSnapshot.trainingRecords;
        placementLog = Array.isArray(placementSnapshot.placementLog)
          ? placementSnapshot.placementLog.slice()
          : placementSnapshot.placementLog;

        if (typeof renderTrainingTable === 'function') {
          renderTrainingTable();
        }
        renderMatrix();
      };

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

        if (
          operatorRoles[col] !== 'НУ' &&
          operatorRoles[col] !== 'ДС'
        ) {
          operatorAttendance[col] = 'Я';
        }
      }

      attendanceData[row][col] = newVal;

      if (isCirclePlacement) {
        logPlacement(
          operators[col],
          posts[row],
          '',
          {
            onConfirm: () => {
              // I при подтверждённой постановке становится Lкр.
              if (shouldPromoteIToLcr) {
                data[row][col] = 'Lкр';

                if (
                  operatorRoles[col] !== 'ДС' &&
                  typeof createAutomaticLcrTrainingRecord === 'function'
                ) {
                  createAutomaticLcrTrainingRecord(row, col);
                }
              }

              renderMatrix();
            },
            onCancel: restoreCirclePlacement
          }
        );
        return;
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
    if (
      (newVal === 'Iкр' || newVal === 'Lкр') &&
      attendanceData[row][col] === '○'
    ) {
      alert(
        'Нельзя поставить Iкр или Lкр оператору, ' +
        'который уже стоит на посту. Сначала поставьте △.'
      );
      return;
    }

    // Очистка уровня означает, что оператор больше не закреплён
    // за этим постом. Убираем статус постановки и незавершённое
    // обучение, а историческую запись расстановки сохраняем для
    // ручного удаления из журнала.
    if (newVal === '') {
      attendanceData[row][col] = '';

      if (Array.isArray(trainingRecords)) {
        trainingRecords = trainingRecords.filter(record =>
          !(
            record.post === posts[row] &&
            record.op === operators[col] &&
            record.status !== 'Завершено'
          )
        );
      }
    }

    const remainsOnPost =
      attendanceData[row][col] === '○';

    const shouldStartLcrTraining =
      cur === 'Iкр' &&
      newVal === 'I' &&
      remainsOnPost;

    data[row][col] = shouldStartLcrTraining
      ? 'Lкр'
      : newVal;

    if (
      shouldStartLcrTraining &&
      operatorRoles[col] !== 'ДС' &&
      typeof createAutomaticLcrTrainingRecord === 'function'
    ) {
      createAutomaticLcrTrainingRecord(row, col);
    }

    if (
      newVal === '' &&
      typeof renderTrainingTable === 'function'
    ) {
      renderTrainingTable();
    }

    renderMatrix();
  });
}

// Изменение статуса явки оператора (модальное окно в центре)
function cycleOperatorAttendance(idx) {
  // НУ и оператор из другого сектора не участвуют в явке.
  if (
    operatorRoles[idx] === 'НУ' ||
    operatorRoles[idx] === 'ДС'
  ) return;
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
    { value: 'Ф', label: 'Ф — Форматор' },
    { value: 'ДС', label: 'ДС — Оператор из другого сектора' }
  ];
  showCenteredSelect('Должность', cur, options, (newVal) => {
    operatorRoles[idx] = newVal;

    if (newVal === 'ДС') {
      // Внешний оператор остаётся видимым и может закрывать
      // известный ему пост, но в явке участка не участвует.
      operatorAttendance[idx] = 'С';
    } else if (cur === 'ДС' && operatorAttendance[idx] === 'С') {
      operatorAttendance[idx] = 'Я';
    }

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

// Перемещение поста вместе со всеми пост-ориентированными данными.
// Проверяем структуру до изменения, чтобы не получить частично переставленное
// состояние при повреждённых или несовместимых данных.
function movePost(index, direction) {
  const targetIndex = index + direction;
  const postCount = posts.length;
  const operatorCount = operators.length;

  const validIndex = Number.isInteger(index) &&
    Number.isInteger(targetIndex) &&
    index >= 0 && targetIndex >= 0 &&
    index < postCount && targetIndex < postCount;

  const validStructure =
    Array.isArray(difficulty) && difficulty.length === postCount &&
    Array.isArray(ergonomics) && ergonomics.length === postCount &&
    Array.isArray(trainingDays) && trainingDays.length === postCount &&
    Array.isArray(data) && data.length === postCount &&
    Array.isArray(attendanceData) && attendanceData.length === postCount &&
    data.every(row => Array.isArray(row) && row.length === operatorCount) &&
    attendanceData.every(row =>
      Array.isArray(row) && row.length === operatorCount
    );

  if (!validIndex || !validStructure) {
    console.error('Перемещение поста отменено: некорректная структура матрицы.');
    return false;
  }

  const reorder = (items) => {
    const next = items.slice();
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    return next;
  };

  // Все новые массивы формируем до публикации результата в глобальное состояние.
  const nextPosts = reorder(posts);
  const nextDifficulty = reorder(difficulty);
  const nextErgonomics = reorder(ergonomics);
  const nextTrainingDays = reorder(trainingDays);
  const nextData = reorder(data.map(row => row.slice()));
  const nextAttendanceData = reorder(
    attendanceData.map(row => row.slice())
  );

  posts = nextPosts;
  difficulty = nextDifficulty;
  ergonomics = nextErgonomics;
  trainingDays = nextTrainingDays;
  data = nextData;
  attendanceData = nextAttendanceData;

  // renderMatrix() использует штатный saveState() после отрисовки.
  renderMatrix();
  return true;
}

// Перемещение оператора вместе с операторскими атрибутами и колонкой матрицы.
function moveOperator(index, direction) {
  const targetIndex = index + direction;
  const postCount = posts.length;
  const operatorCount = operators.length;

  const validIndex = Number.isInteger(index) &&
    Number.isInteger(targetIndex) &&
    index >= 0 && targetIndex >= 0 &&
    index < operatorCount && targetIndex < operatorCount;

  const validStructure =
    Array.isArray(operatorAttendance) &&
    operatorAttendance.length === operatorCount &&
    Array.isArray(operatorRoles) &&
    operatorRoles.length === operatorCount &&
    Array.isArray(data) && data.length === postCount &&
    Array.isArray(attendanceData) && attendanceData.length === postCount &&
    data.every(row => Array.isArray(row) && row.length === operatorCount) &&
    attendanceData.every(row =>
      Array.isArray(row) && row.length === operatorCount
    );

  if (!validIndex || !validStructure) {
    console.error('Перемещение оператора отменено: некорректная структура матрицы.');
    return false;
  }

  const reorder = (items) => {
    const next = items.slice();
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    return next;
  };

  const reorderColumns = (matrix) => matrix.map(row => reorder(row));

  const nextOperators = reorder(operators);
  const nextOperatorAttendance = reorder(operatorAttendance);
  const nextOperatorRoles = reorder(operatorRoles);
  const nextData = reorderColumns(data.map(row => row.slice()));
  const nextAttendanceData = reorderColumns(
    attendanceData.map(row => row.slice())
  );

  operators = nextOperators;
  operatorAttendance = nextOperatorAttendance;
  operatorRoles = nextOperatorRoles;
  data = nextData;
  attendanceData = nextAttendanceData;

  // renderMatrix() использует штатный saveState() после отрисовки.
  renderMatrix();
  return true;
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
