// ======================== ПЛАНИРОВАНИЕ РАЗВИТИЯ ========================
function generateDevelopmentPlan() {
  const thead = document.querySelector('#devCalendarTable thead');
  const tbody = document.querySelector('#devCalendarTable tbody');
  if (!thead || !tbody) return;
  const statusElement = document.getElementById('developmentPlanStatus');
  if (statusElement) {
    statusElement.textContent = '';
    statusElement.style.display = 'none';
  }

  // Развитие строится только для производственных ролей. △ намеренно
  // не читается: это организационный маркер, а не признак занятости.
  const excludedRoles = new Set(['НУ', 'СО', 'ДС']);
  const isEligibleOperator = index => !excludedRoles.has(operatorRoles[index]);
  const isLU = level => level === 'L' || level === 'U';
  const isCandidateLevel = level =>
    level === 'Lкр' || level === 'I' || level === 'Iкр' ||
    level === null || level === '' || level === '0' || level === 0;
  const qualificationPriority = level => {
    if (level === 'Lкр') return 4;
    if (level === 'I') return 3;
    if (level === 'Iкр') return 2;
    if (level === null || level === '' || level === '0' || level === 0) return 1;
    return -1;
  };
  const replacementPriority = level => {
    if (level === 'Lкр') return 4;
    if (level === 'I') return 3;
    if (level === 'L') return 2;
    if (level === 'U') return 1;
    return -1;
  };
  const getLevel = (postIndex, opIndex) => data[postIndex]?.[opIndex] ?? null;
  const getStatus = (postIndex, opIndex) => attendanceData?.[postIndex]?.[opIndex] || '';

  const eligibleOps = [];
  for (let c = 0; c < operators.length; c++) {
    if (!isEligibleOperator(c)) continue;
    let poly = 0;
    for (let r = 0; r < posts.length; r++) {
      if (isLU(getLevel(r, c))) poly++;
    }
    eligibleOps.push({ index: c, name: operators[c], count: poly });
  }

  const postCoverage = posts.map((name, r) => {
    let coverage = 0;
    for (const op of eligibleOps) {
      if (isLU(getLevel(r, op.index))) coverage++;
    }
    return { index: r, name, coverage };
  });
  const virtualCoverage = postCoverage.map(post => post.coverage);
  const virtualPoly = new Map(eligibleOps.map(op => [op.index, op.count]));
  // Для первого развития до L оператор без единого L/U может быть
  // направлен только на разрешённые сочетания сложности и эргономики.
  // Значения берутся из массивов difficulty/ergonomics текущего состояния.
  const firstLAllowedCombinations = new Set([
    'C|green',
    'C|yellow',
    'B|green'
  ]);
  const isFirstLEligible = (opIndex, postIndex) => {
    if ((virtualPoly.get(opIndex) || 0) !== 0) return true;
    const postDifficulty = String(difficulty?.[postIndex] ?? '').trim().toUpperCase();
    const postErgonomics = String(ergonomics?.[postIndex] ?? '').trim().toLowerCase();
    return firstLAllowedCombinations.has(`${postDifficulty}|${postErgonomics}`);
  };

  // Виртуальная расстановка нужна только для проверки безопасного снятия.
  // Реальные attendanceData/data не изменяются.
  let virtualOccupancy = Array.from({ length: operators.length }, (_, opIndex) => {
    const occupied = new Set();
    for (let r = 0; r < posts.length; r++) {
      if (getStatus(r, opIndex) === '○') occupied.add(r);
    }
    return occupied;
  });
  const cloneOccupancy = occupancy => occupancy.map(set => new Set(set));
  const usedOps = new Set();
  const lockedPosts = new Set();
  const planAssignments = [];

  function isFree(opIndex, occupancy = virtualOccupancy) {
    return occupancy[opIndex]?.size === 0;
  }

  function applyMove(occupancy, opIndex, fromPost, toPost) {
    if (fromPost !== null && fromPost !== undefined) occupancy[opIndex].delete(fromPost);
    occupancy[opIndex].add(toPost);
  }

  // Закрывает post после снятия blockedOp. Если единственный L/U уходит,
  // ищется полноценная цепочка замещения до свободного оператора.
  function closeOccupiedPost(postIndex, blockedOp, occupancy, visitedOps, visitedPosts) {
    if (visitedPosts.has(postIndex) || visitedOps.has(blockedOp)) return null;
    visitedPosts.add(postIndex);
    visitedOps.add(blockedOp);

    const blockedLevel = getLevel(postIndex, blockedOp);
    if (!isLU(blockedLevel) || virtualCoverage[postIndex] - 1 >= 1) {
      occupancy[blockedOp].delete(postIndex);
      return occupancy;
    }

    const replacements = eligibleOps
      .filter(op => op.index !== blockedOp && !usedOps.has(op.index))
      .map(op => ({
        ...op,
        level: getLevel(postIndex, op.index),
        occupied: occupancy[op.index]?.size > 0
      }))
      .filter(op => replacementPriority(op.level) > 0)
      .sort((a, b) => {
        const levelDiff = replacementPriority(b.level) - replacementPriority(a.level);
        if (levelDiff) return levelDiff;
        if (a.occupied !== b.occupied) return a.occupied ? 1 : -1;
        if (a.count !== b.count) return a.count - b.count;
        return a.index - b.index;
      });

    for (const replacement of replacements) {
      const nextOccupancy = cloneOccupancy(occupancy);
      const nextVisitedOps = new Set(visitedOps);
      const nextVisitedPosts = new Set(visitedPosts);
      const occupiedPosts = [...(nextOccupancy[replacement.index] || [])];
      if (occupiedPosts.includes(postIndex)) continue;

      let valid = true;
      for (const sourcePost of occupiedPosts) {
        const closed = closeOccupiedPost(
          sourcePost,
          replacement.index,
          nextOccupancy,
          nextVisitedOps,
          nextVisitedPosts
        );
        if (!closed) {
          valid = false;
          break;
        }
      }
      if (!valid) continue;

      const sourceAfterRelease = [...(nextOccupancy[replacement.index] || [])][0];
      applyMove(nextOccupancy, replacement.index, sourceAfterRelease ?? null, postIndex);
      nextOccupancy[blockedOp].delete(postIndex);
      return nextOccupancy;
    }
    return null;
  }

  function releaseForTraining(opIndex, targetPost) {
    const nextOccupancy = cloneOccupancy(virtualOccupancy);
    const occupiedPosts = [...(nextOccupancy[opIndex] || [])]
      .filter(postIndex => postIndex !== targetPost);
    for (const sourcePost of occupiedPosts) {
      const closed = closeOccupiedPost(
        sourcePost,
        opIndex,
        nextOccupancy,
        new Set(),
        new Set()
      );
      if (!closed) return null;
    }
    nextOccupancy[opIndex].delete(targetPost);
    return nextOccupancy;
  }

  function addAssignment(postIndex, opIndex, stage, releaseState, allowLocked = false) {
    if (usedOps.has(opIndex) || (lockedPosts.has(postIndex) && !allowLocked)) return false;
    const nextOccupancy = releaseState || releaseForTraining(opIndex, postIndex);
    if (!nextOccupancy) return false;
    virtualOccupancy = nextOccupancy;
    usedOps.add(opIndex);
    virtualCoverage[postIndex]++;
    virtualPoly.set(opIndex, (virtualPoly.get(opIndex) || 0) + 1);
    planAssignments.push({
      postIndex,
      opIndex,
      stage,
      sourceLevel: getLevel(postIndex, opIndex)
    });
    return true;
  }

  function candidatesForPost(postIndex) {
    return eligibleOps
      .filter(op => !usedOps.has(op.index))
      .map(op => ({
        ...op,
        level: getLevel(postIndex, op.index),
        free: isFree(op.index),
        releaseState: releaseForTraining(op.index, postIndex)
      }))
      .filter(candidate =>
        !lockedPosts.has(postIndex) &&
        isCandidateLevel(candidate.level) &&
        isFirstLEligible(candidate.index, postIndex) &&
        candidate.releaseState
      )
      .sort((a, b) => {
        const qualification = qualificationPriority(b.level) - qualificationPriority(a.level);
        if (qualification) return qualification;
        if (a.free !== b.free) return a.free ? -1 : 1;
        const poly = (virtualPoly.get(a.index) || 0) - (virtualPoly.get(b.index) || 0);
        if (poly) return poly;
        return a.index - b.index;
      });
  }

  // Lкр + ○ на этом же посту — уже начатое обучение, его нужно закончить,
  // а пост до следующей генерации блокируется для новых кандидатов.
  for (const post of postCoverage) {
    const continuation = eligibleOps.find(op =>
      getLevel(post.index, op.index) === 'Lкр' &&
      getStatus(post.index, op.index) === '○'
    );
    if (!continuation) continue;
    lockedPosts.add(post.index);
    if (!usedOps.has(continuation.index)) {
      addAssignment(
        post.index,
        continuation.index,
        'Завершение Lкр',
        releaseForTraining(continuation.index, post.index),
        true
      );
    }
  }

  // Состояние после обязательных continuation-записей. Оно используется
  // только для отката phantom-назначений после календарного STOP.
  const baseVirtualCoverage = [...virtualCoverage];
  const baseVirtualPoly = new Map(virtualPoly);
  const baseVirtualOccupancy = cloneOccupancy(virtualOccupancy);
  const baseUsedOps = new Set(usedOps);
  const basePlanAssignmentCount = planAssignments.length;

  function developPostsTo(targetLevel) {
    const postsToDevelop = postCoverage
      .filter(post => virtualCoverage[post.index] < targetLevel && !lockedPosts.has(post.index))
      .sort((a, b) => {
        const coverageDiff = virtualCoverage[a.index] - virtualCoverage[b.index];
        return coverageDiff || a.index - b.index;
      });

    for (const post of postsToDevelop) {
      while (virtualCoverage[post.index] < targetLevel && !lockedPosts.has(post.index)) {
        const candidate = candidatesForPost(post.index)[0];
        if (!candidate) break;
        if (!addAssignment(post.index, candidate.index, `Посты ${targetLevel}L`, candidate.releaseState)) break;
      }
    }
  }

  function operatorOptions(op, postDemand) {
    return postCoverage
      .filter(post => !lockedPosts.has(post.index))
      .map(post => ({
        post,
        level: getLevel(post.index, op.index),
        free: isFree(op.index),
        releaseState: releaseForTraining(op.index, post.index),
        rarity: postDemand[post.index] || 0
      }))
      .filter(option => isCandidateLevel(option.level) && option.releaseState)
      .filter(option => isFirstLEligible(op.index, option.post.index))
      .map(option => ({ ...option }));
  }

  function developOperatorsTo(targetLevel) {
    // Одна минимальная feasible poly-группа за раз. Уже использованные
    // операторы исключаются до определения группы: второе назначение
    // в этой генерации для них запрещено.
    while (true) {
      const available = eligibleOps
        .filter(op =>
          !usedOps.has(op.index) &&
          (virtualPoly.get(op.index) || 0) < targetLevel &&
          canStillDevelop(op)
        );
      if (!available.length) break;

      const currentPoly = Math.min(
        ...available.map(op => virtualPoly.get(op.index) || 0)
      );
      const group = new Set(
        available
          .filter(op => (virtualPoly.get(op.index) || 0) === currentPoly)
          .map(op => op.index)
      );

      while (group.size) {
        const postDemand = {};
        for (const post of postCoverage) {
          postDemand[post.index] = [...group].filter(opIndex =>
            !lockedPosts.has(post.index) &&
            isCandidateLevel(getLevel(post.index, opIndex)) &&
            isFirstLEligible(opIndex, post.index)
          ).length;
        }

        const possible = [...group]
          .map(opIndex => eligibleOps.find(op => op.index === opIndex))
          .map(op => ({ op, options: operatorOptions(op, postDemand) }))
          .filter(item => item.options.length > 0)
          .sort((a, b) => {
            const scarcity = a.options.length - b.options.length;
            return scarcity || a.op.index - b.op.index;
          });

        // Все оставшиеся операторы группы без feasible-поста исчерпаны.
        if (!possible.length) break;

        const selected = possible[0];
        const options = selected.options.sort((a, b) => {
          const qualification = qualificationPriority(b.level) - qualificationPriority(a.level);
          if (qualification) return qualification;
          if (a.free !== b.free) return a.free ? -1 : 1;
          const rarity = a.rarity - b.rarity;
          if (rarity) return rarity;
          const coverageDiff = virtualCoverage[a.post.index] - virtualCoverage[b.post.index];
          return coverageDiff || a.post.index - b.post.index;
        });
        const option = options[0];
        group.delete(selected.op.index);
        addAssignment(
          option.post.index,
          selected.op.index,
          `Операторы ${targetLevel}L`,
          option.releaseState
        );
      }
    }
  }

  function canStillDevelop(op) {
    if (usedOps.has(op.index)) return false;
    return postCoverage.some(post =>
      !lockedPosts.has(post.index) &&
      isCandidateLevel(getLevel(post.index, op.index)) &&
      isFirstLEligible(op.index, post.index) &&
      releaseForTraining(op.index, post.index)
    );
  }

  // Динамическая лестница: посты N → операторы N → посты N+1 ...
  // Она ограничена только фактическими кандидатами и физическим потолком.
  let level = 2;
  const maximumIterations = Math.max(posts.length, eligibleOps.length) + 2;
  for (let iteration = 0; iteration < maximumIterations; iteration++) {
    developPostsTo(level);
    developOperatorsTo(level);

    const blockedOperators = eligibleOps.some(op =>
      (virtualPoly.get(op.index) || 0) < level &&
      canStillDevelop(op)
    );
    if (blockedOperators) break;

    const possibleNextStep = eligibleOps.some(op => canStillDevelop(op)) ||
      postCoverage.some(post => !lockedPosts.has(post.index) && virtualCoverage[post.index] < level + 1);
    if (!possibleNextStep) break;
    level++;
  }

  // Если логических назначений нет, это действительно означает отсутствие
  // допустимого развития, а не только отсутствие свободной календарной ячейки.
  if (planAssignments.length === 0) {
    tbody.innerHTML = '<tr><td style="text-align:center;color:#16a34a;padding:40px;">✅ Участок полностью укомплектован</td></tr>';
    thead.innerHTML = '';
    return;
  }

  // Определяем срок обучения для каждого назначения.
  // Несколько назначений на один пост допустимы: календарь разместит их
  // последовательно, не допуская пересечения.
  const planWithDays = planAssignments.map(a => {
    const lvl = getLevel(a.postIndex, a.opIndex);
    const configuredDays = Number(trainingDays[a.postIndex]);
    const days = (lvl === 'Iкр' || lvl === null || lvl === '' || lvl === '0' || lvl === 0)
      ? (Number.isInteger(configuredDays) && configuredDays > 0 ? configuredDays : 1)
      : 10;
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

  // Строим календарь выбранного месяца. По умолчанию это текущий месяц;
  // просмотр истории задаёт window.developmentPlanViewDate.
  const selectedPlanDate = window.developmentPlanViewDate instanceof Date
    ? window.developmentPlanViewDate
    : new Date();
  const now = new Date(
    selectedPlanDate.getFullYear(),
    selectedPlanDate.getMonth(),
    1
  );
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

  const maxConcurrentTrainings = Math.max(
    1,
    Number.parseInt(window.developmentSettings?.maxConcurrentTrainings, 10) || 2
  );

  // Распределяем по будням с заданным лимитом. Первое
  // неполностью размещаемое назначение останавливает месячный план.
  const schedule = {};
  const dailyCount = {};
  const acceptedAssignments = [];
  const generatedLogicalCount = planAssignments.length;
  let generationStoppedByCalendar = false;
  let stopReason = null;

  for (const assign of planWithDays) {
    const opName = operators[assign.opIndex];
    const selectedDays = [];
    for (let d = 0; d < daysInMonth && selectedDays.length < assign.days; d++) {
      const dayOfWeek = new Date(year, month, d + 1).getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) continue;
      if ((dailyCount[d] || 0) >= maxConcurrentTrainings) continue;
      let busy = false;
      for (const key in schedule) {
        if (schedule[key]?.[d] === opName) { busy = true; break; }
      }
      if (busy) continue;
      if (schedule[assign.postIndex] && schedule[assign.postIndex][d]) continue;
      selectedDays.push(d);
    }

    if (selectedDays.length !== assign.days) {
      generationStoppedByCalendar = true;
      stopReason = {
        operator: opName,
        post: posts[assign.postIndex],
        requiredDays: assign.days,
        availableDays: selectedDays.length,
        year,
        month
      };
      break;
    }
    if (!schedule[assign.postIndex]) schedule[assign.postIndex] = {};
    for (const d of selectedDays) {
      if (!schedule[assign.postIndex]) schedule[assign.postIndex] = {};
      schedule[assign.postIndex][d] = opName;
      dailyCount[d] = (dailyCount[d] || 0) + 1;
    }
    acceptedAssignments.push(assign);
  }

  window.lastDevelopmentGenerationMeta = {
    year,
    month,
    generationStatus: generationStoppedByCalendar
      ? 'calendar-capacity-reached'
      : 'completed',
    stopReason,
    generationSettings: { maxConcurrentTrainings },
    acceptedCount: acceptedAssignments.length,
    logicalCount: generatedLogicalCount
  };

  // После календарного STOP итоговый logical list содержит только уже
  // принятые назначения. Невыполнимое и все последующие назначения не
  // попадают ни в snapshot, ни в дальнейшее ручное редактирование плана.
  if (generationStoppedByCalendar) {
    const committedKeys = new Set(
      acceptedAssignments.map(a => `${a.postIndex}:${a.opIndex}`)
    );
    virtualCoverage.splice(0, virtualCoverage.length, ...baseVirtualCoverage);
    virtualPoly.clear();
    baseVirtualPoly.forEach((value, key) => virtualPoly.set(key, value));
    virtualOccupancy = cloneOccupancy(baseVirtualOccupancy);
    usedOps.clear();
    baseUsedOps.forEach(index => usedOps.add(index));

    // Восстанавливаем virtual state только для реально принятых
    // назначений, созданных после обязательных continuation-записей.
    const committedGenerated = planAssignments
      .slice(basePlanAssignmentCount)
      .filter(a => committedKeys.has(`${a.postIndex}:${a.opIndex}`));
    for (const assignment of committedGenerated) {
      const nextOccupancy = releaseForTraining(
        assignment.opIndex,
        assignment.postIndex
      );
      if (!nextOccupancy) continue;
      virtualOccupancy = nextOccupancy;
      usedOps.add(assignment.opIndex);
      virtualCoverage[assignment.postIndex]++;
      virtualPoly.set(
        assignment.opIndex,
        (virtualPoly.get(assignment.opIndex) || 0) + 1
      );
    }

    planAssignments.splice(
      0,
      planAssignments.length,
      ...acceptedAssignments.map(({ selectedDays, ...assignment }) => assignment)
    );
  }

  if (acceptedAssignments.length === 0) {
    thead.innerHTML = '';
    tbody.innerHTML = '<tr><td style="text-align:center;color:#b45309;padding:40px;">План не удалось полностью разместить в календаре. Подробности доступны в настройках.</td></tr>';
    if (statusElement) {
      statusElement.textContent = 'План развития сформирован до доступной календарной ёмкости.';
      statusElement.style.display = 'block';
    }
    return;
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
    for (const assign of acceptedAssignments) {
      if (assign.postIndex === p.index) {
        const lvl = getLevel(p.index, assign.opIndex);
        const days = (lvl === 'Iкр' || lvl === null || lvl === '' || lvl === '0' || lvl === 0)
          ? trainingDays[p.index]
          : 10;
        postDays = postDays ? `${postDays} / ${days}` : String(days);
      }
    }
    bodyHTML += `<td style="font-weight:600;">${postDays}</td></tr>`;
  }
  tbody.innerHTML = bodyHTML;

  if (statusElement) {
    statusElement.textContent = generationStoppedByCalendar
      ? 'План развития сформирован до доступной календарной ёмкости.'
      : '';
    statusElement.style.display = statusElement.textContent ? 'block' : 'none';
  }

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
