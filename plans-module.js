// ======================== ПЛАНИРОВАНИЕ РАЗВИТИЯ ========================
window.ILU_DEVELOPMENT_GENERATOR_VERSION = '1.2-sequential-training-2026-10-11';
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
  const diagnostic = window.ILU_DEVELOPMENT_DIAGNOSTICS === true
    ? { posts: {}, assignments: [], events: [], _seen: new Set() }
    : null;
  const recordDiagnostic = (postIndex, opIndex, reasons) => {
    if (!diagnostic) return;
    const key = String(postIndex);
    diagnostic.posts[key] ||= { post: posts[postIndex], candidates: [] };
    const signature = `${postIndex}:${opIndex}:${reasons.slice().sort().join('|')}`;
    if (diagnostic._seen.has(signature)) return;
    diagnostic._seen.add(signature);
    diagnostic.posts[key].candidates.push({
      operator: operators[opIndex],
      level: getLevel(postIndex, opIndex),
      role: operatorRoles[opIndex],
      reasons
    });
  };
  const diagnosticEvent = event => {
    if (diagnostic) diagnostic.events.push(event);
  };

  const eligibleOps = [];
  const replacementOps = [];
  for (let c = 0; c < operators.length; c++) {
    if (operatorRoles[c] === 'ДС') {
      replacementOps.push({ index: c, name: operators[c], count: 0 });
      continue;
    }
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
  const configuredTrainingLimit = window.developmentSettings?.maxOperatorTrainings;
  const maxOperatorTrainings = configuredTrainingLimit === 'unlimited' ||
    configuredTrainingLimit === Infinity
    ? Infinity
    : Math.max(1, Number.parseInt(configuredTrainingLimit, 10) || 2);
  const assignmentCounts = new Map(eligibleOps.map(op => [op.index, 0]));
  const assignedPostKeys = new Set();
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

    const replacements = [...eligibleOps, ...replacementOps]
      .filter(op => op.index !== blockedOp)
      .filter(op => operatorRoles[op.index] !== 'ДС' ||
        (isRotationAttendance(op.index) && isFree(op.index, occupancy)))
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
    const assignmentKey = `${opIndex}:${postIndex}`;
    if ((assignmentCounts.get(opIndex) || 0) >= maxOperatorTrainings ||
      assignedPostKeys.has(assignmentKey) ||
      (lockedPosts.has(postIndex) && !allowLocked)) return false;
    const nextOccupancy = releaseState || releaseForTraining(opIndex, postIndex);
    if (!nextOccupancy) return false;
    virtualOccupancy = nextOccupancy;
    assignmentCounts.set(opIndex, (assignmentCounts.get(opIndex) || 0) + 1);
    assignedPostKeys.add(assignmentKey);
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
      .filter(op => (assignmentCounts.get(op.index) || 0) < maxOperatorTrainings)
      .map(op => ({
        ...op,
        level: getLevel(postIndex, op.index),
        free: isFree(op.index),
        releaseState: releaseForTraining(op.index, postIndex)
      }))
      .filter(candidate =>
        (() => {
          const reasons = [];
          if (lockedPosts.has(postIndex)) reasons.push('post_locked');
          if (!isCandidateLevel(candidate.level)) reasons.push('level_not_candidate');
          if (assignedPostKeys.has(`${candidate.index}:${postIndex}`)) reasons.push('same_post_already_assigned');
          if (!isFirstLEligible(candidate.index, postIndex)) reasons.push('first_L_restriction');
          if (!candidate.releaseState) reasons.push('unsafe_release');
          recordDiagnostic(postIndex, candidate.index, reasons);
          return reasons.length === 0;
        })()
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
    if (!assignedPostKeys.has(`${continuation.index}:${post.index}`)) {
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
  const baseAssignmentCounts = new Map(assignmentCounts);
  const baseAssignedPostKeys = new Set(assignedPostKeys);
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
        if (!candidate) {
          diagnosticEvent({ type: 'posts_cycle_stop', post: posts[post.index], targetLevel, reason: 'no_feasible_candidate' });
          break;
        }
        if (!addAssignment(post.index, candidate.index, `Посты ${targetLevel}L`, candidate.releaseState)) {
          diagnosticEvent({ type: 'posts_cycle_stop', post: posts[post.index], targetLevel, operator: operators[candidate.index], reason: 'add_assignment_rejected' });
          break;
        }
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
      .filter(option => !assignedPostKeys.has(`${op.index}:${option.post.index}`))
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
          (assignmentCounts.get(op.index) || 0) < maxOperatorTrainings &&
          (virtualPoly.get(op.index) || 0) < targetLevel &&
          canStillDevelop(op)
        );
      if (!available.length) {
        diagnosticEvent({ type: 'operators_cycle_stop', targetLevel, reason: 'no_available_operator' });
        break;
      }

      const currentPoly = Math.min(
        ...available.map(op => assignmentCounts.get(op.index) || 0)
      );
      const group = new Set(
        available
          .filter(op => (assignmentCounts.get(op.index) || 0) === currentPoly)
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
        if (!possible.length) {
          diagnosticEvent({
            type: 'operators_group_stop',
            targetLevel,
            operators: [...group].map(index => operators[index]),
            reason: 'no_operator_has_feasible_post'
          });
          break;
        }

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
        diagnosticEvent({ type: 'operator_selected', targetLevel, operator: selected.op.name, post: option.post.name });
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
    if ((assignmentCounts.get(op.index) || 0) >= maxOperatorTrainings) return false;
    return postCoverage.some(post =>
      !lockedPosts.has(post.index) &&
      isCandidateLevel(getLevel(post.index, op.index)) &&
      !assignedPostKeys.has(`${op.index}:${post.index}`) &&
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
  const operatorStageEnd = new Map();
  const acceptedAssignments = [];
  const generatedLogicalCount = planAssignments.length;
  let generationStoppedByCalendar = false;
  let stopReason = null;

  const currentDate = new Date();
  const isCurrentMonth = year === currentDate.getFullYear() && month === currentDate.getMonth();
  const generationStartDay = isCurrentMonth ? currentDate.getDate() - 1 : 0;

  for (const assign of planWithDays) {
    const opName = operators[assign.opIndex];
    const selectedDays = [];
    const earliestDay = Math.max(generationStartDay, (operatorStageEnd.get(assign.opIndex) ?? -1) + 1);
    for (let d = earliestDay; d < daysInMonth && selectedDays.length < assign.days; d++) {
      const dayOfWeek = new Date(year, month, d + 1).getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) continue;
      if ((dailyCount[d] || 0) >= maxConcurrentTrainings) {
        selectedDays.length = 0;
        continue;
      }
      let busy = false;
      for (const key in schedule) {
        if (schedule[key]?.[d] === opName) { busy = true; break; }
      }
      if (busy || (schedule[assign.postIndex] && schedule[assign.postIndex][d])) {
        selectedDays.length = 0;
        continue;
      }
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
    operatorStageEnd.set(assign.opIndex, selectedDays[selectedDays.length - 1]);
    acceptedAssignments.push({ ...assign, startDay: selectedDays[0] + 1,
      endDay: selectedDays[selectedDays.length - 1] + 1, selectedDays: [...selectedDays] });
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
  if (diagnostic) {
    posts.forEach((post, index) => {
      const key = String(index);
      diagnostic.posts[key] ||= { post, candidates: [] };
      if (lockedPosts.has(index) && diagnostic.posts[key].candidates.length === 0) {
        diagnostic.posts[key].candidates.push({
          operator: null,
          level: null,
          role: null,
          reasons: ['post_locked_by_continuation']
        });
      }
    });
    Object.values(diagnostic.posts).forEach(report => {
      report.assigned = acceptedAssignments
        .filter(item => posts[item.postIndex] === report.post)
        .map(item => {
          const days = Object.keys(schedule[item.postIndex] || {})
            .filter(day => schedule[item.postIndex][day] === operators[item.opIndex])
            .map(day => Number(day) + 1);
          return { operator: operators[item.opIndex], days };
        });
    });
    delete diagnostic._seen;
    window.lastDevelopmentDiagnostics = diagnostic;
    console.info('[ILU development diagnostics]', diagnostic);
  }

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
    assignmentCounts.clear();
    baseAssignmentCounts.forEach((count, index) => assignmentCounts.set(index, count));
    assignedPostKeys.clear();
    baseAssignedPostKeys.forEach(key => assignedPostKeys.add(key));

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
      assignmentCounts.set(
        assignment.opIndex,
        (assignmentCounts.get(assignment.opIndex) || 0) + 1
      );
      assignedPostKeys.add(`${assignment.opIndex}:${assignment.postIndex}`);
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

  if (window.ILU_DEVELOPMENT_DIAGNOSTICS === true) {
    const displayedAssignments = Object.values(schedule).reduce(
      (total, days) => total + Object.keys(days || {}).length,
      0
    );
    window.lastDevelopmentGenerationSummary = {
      version: window.ILU_DEVELOPMENT_GENERATOR_VERSION,
      logicalAssignments: planAssignments.length,
      calendarAssignments: acceptedAssignments.length,
      displayedAssignments,
      generatedFor: `${year}-${String(month + 1).padStart(2, '0')}`
    };
    console.info('[ILU development generation summary]', window.lastDevelopmentGenerationSummary);
  }

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
  menu.innerHTML = `<div class="danger" onclick="deleteCalendarTraining('${opName}', 'past'); hideMenu();">🗑️ Удалить прошедшие обучения</div><div class="danger" onclick="deleteCalendarTraining('${opName}', 'future'); hideMenu();">🗑️ Удалить будущие обучения</div>`;
  document.body.appendChild(menu);
  positionPlanContextMenu(menu, event);
  if (typeof document.__iluCalendarTooltipReposition === 'function') {
    document.__iluCalendarTooltipReposition();
  }
  if (typeof document.__iluCalendarTooltipShow === 'function') {
    document.__iluCalendarTooltipShow(td);
  }
  currentMenu = menu;
  setTimeout(() => document.addEventListener('click', hideMenu, { once: true }), 0);
}

function deleteCalendarTraining(opName, mode = 'all') {
  const question = mode === 'past'
    ? `Удалить прошедшие обучения оператора «${opName}»?`
    : mode === 'future'
      ? 'Удалить все обучения с сегодняшнего дня до конца выбранного месяца? Прошедшие обучения останутся без изменений'
      : `Удалить все обучения оператора «${opName}» за весь месяц?`;
  if (!confirm(question)) return;
  const tbody = document.querySelector('#devCalendarTable tbody');
  if (!tbody) return;
  const viewDate = window.developmentPlanViewDate instanceof Date ? window.developmentPlanViewDate : new Date();
  const now = new Date();
  const isCurrentMonth = viewDate.getFullYear() === now.getFullYear() && viewDate.getMonth() === now.getMonth();
  const isFutureMonth = viewDate > new Date(now.getFullYear(), now.getMonth(), 1);
  const cutoff = now.getDate() - 1;
  const allTd = tbody.querySelectorAll('td[data-op="' + opName + '"]');
  const affectedRows = new Set();
  const targets = Array.from(allTd).filter(td => {
    if (mode === 'all') return true;
    if (mode === 'future' && isFutureMonth) return true;
    if (mode === 'past' && isFutureMonth) return false;
    if (!isCurrentMonth) return true;
    if (mode === 'future') return Number(td.dataset.day) >= cutoff;
    return Number(td.dataset.day) < cutoff;
  });

  if (mode === 'future' && !isCurrentMonth && !isFutureMonth) {
    alert('Выбран прошлый месяц. Будущие обучения отсутствуют.');
    return;
  }
  if (!targets.length) {
    alert('Будущих обучений для удаления нет.');
    return;
  }

  targets.forEach(td => {
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
  if (typeof document.__iluCalendarTooltipReposition === 'function') {
    document.__iluCalendarTooltipReposition();
  }
  if (typeof document.__iluCalendarTooltipShow === 'function') {
    document.__iluCalendarTooltipShow(td);
  }
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
function parseRotationDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  const text = String(value || '').trim();
  let match = text.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (match) {
    const date = new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
    return date.getFullYear() === Number(match[3]) &&
      date.getMonth() === Number(match[2]) - 1 &&
      date.getDate() === Number(match[1])
      ? date
      : null;
  }

  match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    return date.getFullYear() === Number(match[1]) &&
      date.getMonth() === Number(match[2]) - 1 &&
      date.getDate() === Number(match[3])
      ? date
      : null;
  }

  return null;
}

function addRotationCalendarMonths(date, months) {
  const source = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const targetMonth = source.getMonth() + months;
  const lastDay = new Date(source.getFullYear(), targetMonth + 1, 0).getDate();
  return new Date(
    source.getFullYear(),
    targetMonth,
    Math.min(source.getDate(), lastDay)
  );
}

function isRotationLevel(level) {
  return level === 'L' || level === 'U';
}

function isRotationAttendance(index) {
  // Для ДС значение «С» означает «в другом секторе» и является
  // штатным специальным статусом доступного внешнего резервного оператора.
  if (operatorRoles[index] === 'ДС') {
    return operatorAttendance[index] === 'С';
  }
  return operatorAttendance[index] === 'Я' || operatorAttendance[index] === 'Явка';
}

function getLastPlacementDate(opName, postName) {
  let lastDate = null;
  for (const entry of placementLog) {
    if (entry.opName === opName && entry.postName === postName) {
      const date = parseRotationDate(entry.date);
      if (!date) continue;
      if (!lastDate || date > lastDate) lastDate = date;
    }
  }
  return lastDate;
}

// Сохраняем совместимость с прежними потребителями визуального статуса.
function getWorstAge(opIndex) {
  let worst = null;
  for (let postIndex = 0; postIndex < posts.length; postIndex++) {
    if (!isRotationLevel(data[postIndex]?.[opIndex])) continue;
    const age = getPlacementAgeColor(operators[opIndex], posts[postIndex]);
    if (age === 'red') return 'red';
    if (age === 'yellow') worst = 'yellow';
  }
  return worst;
}

window.ILU_ROTATION_GENERATOR_VERSION = '1.2-ds-reserve-render-2026-10-11';
function generateRotationPlan() {
  const thead = document.querySelector('#rotCalendarTable thead');
  const tbody = document.querySelector('#rotCalendarTable tbody');
  if (!thead || !tbody) return;

  const selectedDate = window.rotationPlanViewDate instanceof Date
    ? window.rotationPlanViewDate
    : new Date();
  const now = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
  const year = now.getFullYear();
  const month = now.getMonth();
  window.daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInMonth = window.daysInMonth;
  const settings = typeof getRotationSettings === 'function'
    ? getRotationSettings()
    : { durationWorkingDays: 5, maxConcurrentChains: 2 };
  const durationWorkingDays = Math.max(
    1,
    Number.parseInt(settings.durationWorkingDays, 10) || 5
  );
  const maxConcurrentChains = Math.max(
    1,
    Number.parseInt(settings.maxConcurrentChains, 10) || 2
  );

  // Заголовок
  let headerHTML = '<tr><th>Пост</th>';
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    const dayName = date.toLocaleString('ru-RU', { weekday: 'short' });
    headerHTML += `<th>${d}<br>${dayName}</th>`;
  }
  headerHTML += '</tr>';
  thead.innerHTML = headerHTML;

  const excludedRoles = new Set(['НУ', 'СО', 'ДС']);
  const isEligibleOperator = opIndex =>
    !excludedRoles.has(operatorRoles[opIndex]) && isRotationAttendance(opIndex);
  const canUsePost = (opIndex, postIndex) =>
    isEligibleOperator(opIndex) && isRotationLevel(data[postIndex]?.[opIndex]);
  const cloneState = state => [...state];
  const workingDays = [];
  const currentDate = new Date();
  const isCurrentMonth = year === currentDate.getFullYear() && month === currentDate.getMonth();
  const generationStartDay = isCurrentMonth ? currentDate.getDate() - 1 : 0;
  const protectedRotationDays = new Set();
  if (isCurrentMonth && window.rotationProtectedContext?.year === year &&
      window.rotationProtectedContext?.month === month) {
    for (const item of window.rotationProtectedContext.chains || []) {
      const dates = item.dates;
      for (let day = dates.start; day <= dates.end; day++) protectedRotationDays.add(day - 1);
    }
  }
  for (let day = generationStartDay; day < daysInMonth; day++) {
    const weekday = new Date(year, month, day + 1).getDay();
    if (weekday !== 0 && weekday !== 6 && !protectedRotationDays.has(day)) workingDays.push(day);
  }

  // Базовая расстановка — только текущие кружки. План не меняет матрицу.
  const baselineState = Array(posts.length).fill(null);
  const baselineOpPost = Array(operators.length).fill(null);
  for (let postIndex = 0; postIndex < posts.length; postIndex++) {
    const markedOperators = [];
    for (let opIndex = 0; opIndex < operators.length; opIndex++) {
      if (attendanceData?.[postIndex]?.[opIndex] !== '○') continue;
      markedOperators.push(opIndex);
    }

    // Формальное закрепление СО не занимает производственный пост.
    // Если есть любой другой оператор с ○, он сохраняет обычную
    // семантику занятости. НУ и ДС не получают автоматического
    // исключения и поэтому также остаются занятостью поста.
    const baselineOperator = markedOperators.find(
      opIndex => operatorRoles[opIndex] !== 'СО'
    );
    if (baselineOperator === undefined) continue;

    baselineState[postIndex] = baselineOperator;
    if (baselineOpPost[baselineOperator] === null) {
      baselineOpPost[baselineOperator] = postIndex;
    }
  }

  const coveredPosts = new Set(
    baselineState
      .map((opIndex, postIndex) =>
        opIndex !== null && isRotationLevel(data[postIndex]?.[opIndex])
          ? postIndex
          : null
      )
      .filter(postIndex => postIndex !== null)
  );

  const needs = [];
  for (let opIndex = 0; opIndex < operators.length; opIndex++) {
    if (!isEligibleOperator(opIndex)) continue;
    for (let postIndex = 0; postIndex < posts.length; postIndex++) {
      if (!canUsePost(opIndex, postIndex)) continue;
      if (baselineOpPost[opIndex] === postIndex) continue;

      const lastDate = getLastPlacementDate(operators[opIndex], posts[postIndex]);
      const deadline = lastDate ? addRotationCalendarMonths(lastDate, 3) : null;
      const monthStart = new Date(year, month, 1);
      const monthEnd = new Date(year, month + 1, 0);
      const overdue = Boolean(deadline && deadline < monthStart);
      const category = !lastDate ? 'unknown' : overdue ? 'overdue' : 'upcoming';
      const urgency = category === 'overdue'
        ? Math.floor((monthStart - deadline) / 86400000)
        : category === 'upcoming'
          ? Math.max(0, Math.floor((deadline - monthStart) / 86400000))
          : 0;

      needs.push({
        key: `${opIndex}:${postIndex}`,
        opIndex,
        postIndex,
        operator: operators[opIndex],
        post: posts[postIndex],
        level: data[postIndex][opIndex],
        lastDate,
        deadline,
        category,
        urgency
      });
    }
  }

  const categoryOrder = { overdue: 0, unknown: 1, upcoming: 2 };
  // Считаем только блоки, в которых оператор был основной целью.
  // Участие в цепочке как замещение сюда не попадает.
  const plannedPrimaryBlocks = new Map();
  const plannedPrimaryBlockCount = opIndex =>
    plannedPrimaryBlocks.get(opIndex) || 0;
  const compareNeeds = (a, b) => {
    const categoryDiff = categoryOrder[a.category] - categoryOrder[b.category];
    if (categoryDiff) return categoryDiff;
    if (a.category === 'overdue' && a.urgency !== b.urgency) return b.urgency - a.urgency;
    if (a.category === 'upcoming' && a.urgency !== b.urgency) return a.urgency - b.urgency;
    if (a.category === 'unknown' && b.category === 'unknown') {
      const balanceDiff = plannedPrimaryBlockCount(a.opIndex) -
        plannedPrimaryBlockCount(b.opIndex);
      if (balanceDiff) return balanceDiff;
    }
    return a.opIndex - b.opIndex || a.postIndex - b.postIndex;
  };
  needs.sort(compareNeeds);

  const unknownTotal = needs.filter(need => need.category === 'unknown').length;
  const virtualStates = Array.from(
    { length: daysInMonth },
    () => cloneState(baselineState)
  );
  const activeChainCount = Array(daysInMonth).fill(0);
  const activeOperators = Array.from({ length: daysInMonth }, () => new Set());
  const activePosts = Array.from({ length: daysInMonth }, () => new Set());
  const schedule = Array.from({ length: daysInMonth }, () => ({}));
  const chains = [];
  if (protectedRotationDays.size && window.rotationProtectedContext) {
    for (const item of window.rotationProtectedContext.chains || []) {
      const chain = item.chain;
      const dates = item.dates;
      const participants = chain.participants || [];
      for (let day = dates.start - 1; day <= dates.end - 1; day++) {
        activeChainCount[day]++;
        for (const participant of participants) {
          const opIndex = operators.indexOf(participant.operator);
          const postIndex = posts.indexOf(participant.toPost);
          if (opIndex >= 0) activeOperators[day].add(opIndex);
          if (postIndex >= 0) activePosts[day].add(postIndex);
        }
        for (const reserve of chain.reserves || []) {
          const opIndex = operators.indexOf(reserve.operator);
          const postIndex = posts.indexOf(reserve.post);
          if (opIndex >= 0) activeOperators[day].add(opIndex);
          if (postIndex >= 0) activePosts[day].add(postIndex);
        }
      }
    }
  }
  const rotationDiagnostics = window.ILU_ROTATION_DIAGNOSTICS === true
    ? {
      chains: [],
      counts: {
        calculatedChains: 0,
        chainsWithReserves: 0,
        reserveEntries: 0,
        passedReserveEntries: 0,
        renderedReserveCells: 0
      },
      endpointChecks: []
    }
    : null;
  const plannedNeedKeys = new Set();
  let unknownScheduled = 0;

  function currentOperatorPost(state, opIndex) {
    const postIndex = state.indexOf(opIndex);
    return postIndex >= 0 ? postIndex : null;
  }

  function chainParticipants(chain) {
    return new Set(chain.filter(item => !item.reserve).map(item => item.opIndex));
  }

  function chainPosts(chain) {
    return new Set(
      chain
        .map(item => item.toPost)
        .filter(postIndex => postIndex !== null && postIndex !== undefined)
    );
  }

  function applyChain(state, chain) {
    const next = cloneState(state);
    const participantOps = chainParticipants(chain);
    for (const item of chain) {
      if (item.fromPost !== null && next[item.fromPost] === item.opIndex) {
        next[item.fromPost] = null;
      }
    }
    for (const reserve of chain.reserveOps || []) {
      if (next[reserve.postIndex] !== null && next[reserve.postIndex] !== reserve.opIndex) return null;
      next[reserve.postIndex] = reserve.opIndex;
    }
    for (const item of chain) {
      if (item.reserve) continue;
      if (item.toPost === null || item.toPost === undefined) continue;
      const occupant = next[item.toPost];
      if (occupant !== null && !participantOps.has(occupant)) return null;
      next[item.toPost] = item.opIndex;
    }
    for (const postIndex of coveredPosts) {
      const opIndex = next[postIndex];
      if (opIndex === null || !isRotationLevel(data[postIndex]?.[opIndex])) return null;
    }
    return next;
  }

  function buildChainCandidates(state, primaryOp, targetPost) {
    if (!canUsePost(primaryOp, targetPost)) return [];
    const sourcePost = currentOperatorPost(state, primaryOp);
    const initialTargetOccupant = state[targetPost];
    const results = [];
    const maxResults = 500;
    const initialChain = [{ opIndex: primaryOp, fromPost: sourcePost, toPost: targetPost }];
    const usedOps = new Set([primaryOp]);
    const usedPosts = new Set([targetPost]);

    const emitWithFreeEndpoint = (chain, chainOps, chainPostsSet) => {
      if (sourcePost === null) {
        const applied = applyChain(state, chain);
        if (applied) results.push(chain);
        return;
      }

      for (let freeOp = 0; freeOp < operators.length; freeOp++) {
        if (chainOps.has(freeOp)) continue;
        if (currentOperatorPost(state, freeOp) !== null) continue;
        const isReserve = operatorRoles[freeOp] === 'ДС';
        if (isReserve) {
          const reason = !isRotationAttendance(freeOp)
            ? 'неявка'
            : !isRotationLevel(data[sourcePost]?.[freeOp])
              ? 'нет L/U на освобождаемом посту'
              : null;
          if (rotationDiagnostics) rotationDiagnostics.endpointChecks.push({
            operator: operators[freeOp], post: posts[sourcePost], accepted: !reason, reason
          });
          if (reason) continue;
        } else if (!canUsePost(freeOp, sourcePost)) continue;
        if (chainPostsSet.has(sourcePost)) continue;
        const endpoint = [
          ...chain,
          { opIndex: freeOp, fromPost: null, toPost: sourcePost, reserve: isReserve }
        ];
        if (isReserve) endpoint.reserveOps = [{ opIndex: freeOp, postIndex: sourcePost }];
        const applied = applyChain(state, endpoint);
        if (rotationDiagnostics && isReserve && !applied) {
          rotationDiagnostics.endpointChecks.push({
            operator: operators[freeOp], post: posts[sourcePost], accepted: false,
            reason: 'цепочка не прошла проверку покрытия/занятости'
          });
        }
        if (applied) results.push(endpoint);
        if (results.length >= maxResults) return;
      }
    };

    const visit = (displacedOp, chain, chainOps, chainPostsSet) => {
      if (results.length >= maxResults) return;
      const source = currentOperatorPost(state, displacedOp);
      if (source === null) return;

      // Открытая цепочка: свободный основной оператор занимает целевой пост,
      // а вытесненный оператор временно освобождается. Такое освобождение
      // действует только внутри блока и не является фактической постановкой.
      if (sourcePost === null && isEligibleOperator(displacedOp)) {
        const opened = [
          ...chain,
          { opIndex: displacedOp, fromPost: source, toPost: null }
        ];
        if (applyChain(state, opened)) results.push(opened);
      }

      for (let destination = 0; destination < posts.length; destination++) {
        if (destination === source || chainPostsSet.has(destination)) continue;
        if (!canUsePost(displacedOp, destination)) continue;

        // Возврат на исходный пост первичного оператора замыкает цепочку.
        if (destination === sourcePost && state[destination] === primaryOp) {
          const closed = [
            ...chain,
            { opIndex: displacedOp, fromPost: source, toPost: destination }
          ];
          if (applyChain(state, closed)) results.push(closed);
          continue;
        }

        const occupant = state[destination];
        const nextChain = [
          ...chain,
          { opIndex: displacedOp, fromPost: source, toPost: destination }
        ];
        const nextOps = new Set(chainOps);
        nextOps.add(displacedOp);
        const nextPosts = new Set(chainPostsSet);
        nextPosts.add(destination);

        if (occupant === null) {
          emitWithFreeEndpoint(nextChain, nextOps, nextPosts);
        } else if (!nextOps.has(occupant)) {
          visit(occupant, nextChain, nextOps, nextPosts);
        }
        if (results.length >= maxResults) return;
      }
    };

    if (initialTargetOccupant === null) {
      emitWithFreeEndpoint(initialChain, usedOps, usedPosts);
    } else if (initialTargetOccupant !== primaryOp && isEligibleOperator(initialTargetOccupant)) {
      visit(initialTargetOccupant, initialChain, usedOps, usedPosts);
    }

    return results;
  }

  function chainUsefulNeeds(chain) {
    const destinations = new Map(chain.map(item => [item.opIndex, item.toPost]));
    return needs.filter(need =>
      !plannedNeedKeys.has(need.key) &&
      destinations.get(need.opIndex) === need.postIndex
    );
  }

  function chainUrgencyBenefit(chain) {
    return chainUsefulNeeds(chain).reduce((total, need) => {
      if (need.category === 'overdue') return total + 100000 + need.urgency;
      if (need.category === 'unknown') return total + 10000;
      return total + Math.max(1, 1000 - need.urgency);
    }, 0);
  }

  function chainConflicts(chain, blockDays) {
    const ops = chainParticipants(chain);
    const destinationPosts = chainPosts(chain);
    return blockDays.some(day => {
      if (activeChainCount[day] >= maxConcurrentChains) return true;
      return [...ops].some(op => activeOperators[day].has(op)) ||
        [...destinationPosts].some(post => activePosts[day].has(post));
    });
  }

  function findChainOptions(need) {
    const options = [];
    for (let startPosition = 0; startPosition + durationWorkingDays <= workingDays.length; startPosition++) {
      const blockDays = workingDays.slice(startPosition, startPosition + durationWorkingDays);
      if (chainConflicts([], blockDays)) continue;

      const firstDay = blockDays[0];
      const candidates = buildChainCandidates(
        virtualStates[firstDay],
        need.opIndex,
        need.postIndex
      );
      for (const chain of candidates) {
        if (chainConflicts(chain, blockDays)) continue;
        const appliedStates = [];
        let valid = true;
        for (const day of blockDays) {
          const applied = applyChain(virtualStates[day], chain);
          if (!applied) {
            valid = false;
            break;
          }
          appliedStates.push({ day, state: applied });
        }
        if (!valid) continue;
        options.push({
          chain,
          blockDays,
          startPosition,
          usefulNeeds: chainUsefulNeeds(chain),
          urgencyBenefit: chainUrgencyBenefit(chain),
          appliedStates
        });
      }
    }
    return options;
  }

  function chooseChainOption(need, options) {
    const unknownTarget = unknownTotal > 0
      ? Math.round(((unknownScheduled + 1) / (unknownTotal + 1)) * workingDays.length)
      : 0;
    options.sort((a, b) => {
      if (a.chain.length !== b.chain.length) return a.chain.length - b.chain.length;
      if (a.usefulNeeds.length !== b.usefulNeeds.length) {
        return b.usefulNeeds.length - a.usefulNeeds.length;
      }
      if (a.urgencyBenefit !== b.urgencyBenefit) return b.urgencyBenefit - a.urgencyBenefit;
      if (need.category === 'unknown' && a.startPosition !== b.startPosition) {
        return Math.abs(a.startPosition - unknownTarget) - Math.abs(b.startPosition - unknownTarget);
      }
      const opOrder = Math.min(...a.chain.map(item => item.opIndex)) -
        Math.min(...b.chain.map(item => item.opIndex));
      if (opOrder) return opOrder;
      const aPostOrder = a.chain
        .map(item => item.toPost)
        .filter(postIndex => postIndex !== null && postIndex !== undefined);
      const bPostOrder = b.chain
        .map(item => item.toPost)
        .filter(postIndex => postIndex !== null && postIndex !== undefined);
      const postOrder = (aPostOrder.length ? Math.min(...aPostOrder) : Infinity) -
        (bPostOrder.length ? Math.min(...bPostOrder) : Infinity);
      return postOrder || a.startPosition - b.startPosition;
    });
    return options[0] || null;
  }

  function commitChain(option, need) {
    const chainId = chains.length + 1;
    const usefulNeeds = option.usefulNeeds;
    for (const { day, state } of option.appliedStates) {
      virtualStates[day] = state;
      activeChainCount[day]++;
      for (const item of option.chain) {
        if (item.reserve) continue;
        activeOperators[day].add(item.opIndex);
        if (item.toPost === null || item.toPost === undefined) continue;
        activePosts[day].add(item.toPost);
        schedule[day][item.toPost] = {
          operator: operators[item.opIndex],
          chainId
        };
      }
      for (const reserve of option.chain.reserveOps || []) {
        activePosts[day].add(reserve.postIndex);
        schedule[day][reserve.postIndex] = {
          operator: `ДС: ${operators[reserve.opIndex]}`,
          reserve: true,
          chainId
        };
      }
    }
    for (const usefulNeed of usefulNeeds) plannedNeedKeys.add(usefulNeed.key);
    plannedPrimaryBlocks.set(
      need.opIndex,
      plannedPrimaryBlockCount(need.opIndex) + 1
    );
    unknownScheduled += usefulNeeds.filter(item => item.category === 'unknown').length;

    chains.push({
      id: chainId,
      startDay: option.blockDays[0],
      endDay: option.blockDays[option.blockDays.length - 1],
      durationWorkingDays,
      participants: option.chain.map(item => ({
        operator: operators[item.opIndex],
        fromPost: item.fromPost === null ? null : posts[item.fromPost],
        toPost: item.toPost === null || item.toPost === undefined
          ? null
          : posts[item.toPost]
      })).filter((_, index) => !option.chain[index].reserve),
      reserves: (option.chain.reserveOps || []).map(reserve => ({
        operator: operators[reserve.opIndex],
        post: posts[reserve.postIndex]
      })),
      primaryNeed: {
        operator: need.operator,
        post: need.post,
        category: need.category,
        deadline: need.deadline ? `${need.deadline.getFullYear()}-${String(need.deadline.getMonth() + 1).padStart(2, '0')}-${String(need.deadline.getDate()).padStart(2, '0')}` : null
      },
      usefulNeeds: usefulNeeds.map(item => item.key)
    });
    if (rotationDiagnostics) {
      const reserves = option.chain.reserveOps || [];
      rotationDiagnostics.chains.push({
        id: chainId,
        startDay: option.blockDays[0] + 1,
        endDay: option.blockDays[option.blockDays.length - 1] + 1,
        operator: need.operator,
        fromPost: option.chain[0]?.fromPost === null || option.chain[0]?.fromPost === undefined
          ? null : posts[option.chain[0].fromPost],
        toPost: posts[need.postIndex],
        reserves: reserves.map(reserve => ({
          operator: operators[reserve.opIndex],
          post: posts[reserve.postIndex]
        })),
        noReserveReason: reserves.length ? null : 'резерв ДС не потребовался или не прошёл проверки'
      });
    }
  }

  // Неудачная потребность не останавливает месяц. После размещения других
  // цепочек делаем повторную попытку: позднее окно могло освободиться.
  for (let pass = 0; pass < 2; pass++) {
    let progress = false;
    while (true) {
      const pendingNeeds = needs
        .filter(need => !plannedNeedKeys.has(need.key))
        .sort(compareNeeds);
      if (pendingNeeds.length === 0) break;

      let committed = false;
      for (const need of pendingNeeds) {
        const option = chooseChainOption(need, findChainOptions(need));
        if (!option) continue;
        commitChain(option, need);
        progress = true;
        committed = true;
        break;
      }
      if (!committed) break;
    }
    if (!progress) break;
  }

  window.lastRotationGenerationMeta = {
    year,
    month,
    generatedAt: new Date().toISOString(),
    durationWorkingDays,
    maxConcurrentChains,
    chains,
    reserveCoverages: chains.flatMap(chain => (chain.reserves || []).map(reserve => ({
      chainId: chain.id,
      startDay: chain.startDay,
      endDay: chain.endDay,
      operator: reserve.operator,
      post: reserve.post
    }))),
    needs: needs.map(need => ({
      key: need.key,
      operator: need.operator,
      post: need.post,
      category: need.category,
      deadline: need.deadline ? `${need.deadline.getFullYear()}-${String(need.deadline.getMonth() + 1).padStart(2, '0')}-${String(need.deadline.getDate()).padStart(2, '0')}` : null,
      planned: plannedNeedKeys.has(need.key)
    }))
  };

  // Тело таблицы
  let bodyHTML = '';
  for (let r = 0; r < posts.length; r++) {
    bodyHTML += `<tr><td style="text-align:left;font-weight:500;">${posts[r]}</td>`;
    for (let d = 0; d < daysInMonth; d++) {
      const cell = schedule[d][r];
      const op = cell?.operator || '';
      const executionClass = op && typeof isRotationApproved === 'function' && isRotationApproved(year, month)
        ? ` rotation-fact-${rotationFactState(op, posts[r], year, month, d + 1, { operators, operatorIds, posts, postIds })}`
        : '';
      const reserveAttrs = cell?.reserve ? ' data-reserve="true"' : '';
      const reserveStyle = cell?.reserve ? 'color:#7c3aed;font-weight:600;' : '';
      bodyHTML += `<td class="${executionClass.trim()}"${reserveAttrs} style="font-size:11px;${reserveStyle}">${op}</td>`;
    }
    bodyHTML += '</tr>';
  }
  tbody.innerHTML = bodyHTML;

  if (rotationDiagnostics) {
    rotationDiagnostics.counts.calculatedChains = chains.length;
    rotationDiagnostics.counts.chainsWithReserves = chains.filter(chain =>
      Array.isArray(chain.reserves) && chain.reserves.length > 0
    ).length;
    rotationDiagnostics.counts.reserveEntries = chains.reduce(
      (total, chain) => total + (Array.isArray(chain.reserves) ? chain.reserves.length : 0), 0
    );
    rotationDiagnostics.counts.passedReserveEntries = Object.values(schedule)
      .reduce((total, daySchedule) => total + Object.values(daySchedule)
        .filter(cell => cell?.reserve).length, 0);
    rotationDiagnostics.counts.renderedReserveCells = tbody.querySelectorAll(
      'td[data-reserve="true"]'
    ).length;
    window.lastRotationReserveDiagnostics = rotationDiagnostics;
    console.info('[ILU rotation diagnostics]', rotationDiagnostics);
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
        if (td.getAttribute('data-reserve') === 'true') {
          td.style.color = '#7c3aed';
          td.style.fontWeight = '600';
          td.style.cursor = 'default';
          return;
        }
        const chain = schedule[colIndex - 1][r]?.chainId;
        if (chain) {
          td.setAttribute('data-chain-id', String(chain));
          td.title = `Цепочка ${chain}`;
        }
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
  const viewDate = getRotationViewDate();
  if (typeof isRotationApproved === 'function' && isRotationApproved(viewDate.getFullYear(), viewDate.getMonth())) {
    if (typeof editRotationCellComment === 'function') editRotationCellComment(td);
    return;
  }
  const opName = td.getAttribute('data-op');
  if (!opName) return;

  const menu = document.createElement('div');
  menu.className = 'context-menu';
  menu.innerHTML = `<div class="danger" onclick="deleteRotationOp('${opName}', ${td.getAttribute('data-post')}, ${td.getAttribute('data-day')}); hideMenu();">🗑️ Убрать оператора</div>`;
  document.body.appendChild(menu);
  positionPlanContextMenu(menu, event);
  currentMenu = menu;
  setTimeout(() => document.addEventListener('click', hideMenu, { once: true }), 0);
}

function deleteRotationOp(opName, postIndex, dayIndex = null) {
  const tbody = document.querySelector('#rotCalendarTable tbody');
  if (!tbody) return;

  const row = tbody.querySelector(`tr:nth-child(${postIndex + 1})`);
  if (!row) return;

  const allTd = row.querySelectorAll('td');
  const cellsToDelete = [];
  if (dayIndex !== null && !Number.isNaN(Number(dayIndex))) {
    const selected = allTd[Number(dayIndex) + 1];
    if (selected?.getAttribute('data-op') === opName) {
      let index = Number(dayIndex);
      while (index >= 0 && allTd[index + 1]?.getAttribute('data-op') === opName) {
        if (!cellsToDelete.includes(allTd[index + 1])) cellsToDelete.push(allTd[index + 1]);
        index--;
      }
      index = Number(dayIndex) + 1;
      while (index < allTd.length - 1 && allTd[index + 1]?.getAttribute('data-op') === opName) {
        if (!cellsToDelete.includes(allTd[index + 1])) cellsToDelete.push(allTd[index + 1]);
        index++;
      }
    }
  } else {
    allTd.forEach(td => {
      if (td.getAttribute('data-op') === opName) cellsToDelete.push(td);
    });
  }

  cellsToDelete.forEach(td => {
      td.textContent = '+';
      td.style.color = '#94a3b8';
      td.style.fontSize = '16px';
      td.style.fontWeight = '400';
      td.style.cursor = 'pointer';
      td.onclick = function(e) { addRotationOp(e); };
      td.removeAttribute('data-op');
  });
}

function addRotationOp(event) {
  event.stopPropagation();
  hideMenu();

  const td = event.target;
  const postIndex = parseInt(td.getAttribute('data-post'));
  const dayIndex = parseInt(td.getAttribute('data-day'), 10);

  // Ручная ротация разрешена только для L/U и операторов с явкой.
  const qualified = operators.filter((op, idx) => {
    if (!isRotationAttendance(idx) || ['НУ', 'СО', 'ДС'].includes(operatorRoles[idx])) return false;
    const lvl = data[postIndex][idx];
    return isRotationLevel(lvl);
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

  const opIndex = operators.indexOf(opName);
  if (opIndex < 0 || !isRotationAttendance(opIndex) || !isRotationLevel(data[postIndex]?.[opIndex])) {
    alert('Для ротации доступны только операторы с явкой и уровнем L/U на выбранном посту.');
    return;
  }

  const rows = tbody.querySelectorAll('tr');
  for (const otherRow of rows) {
    const otherCells = otherRow.querySelectorAll('td');
    for (let index = 1; index < otherCells.length; index++) {
      if (index - 1 === dayIndex && otherCells[index].getAttribute('data-op') === opName) {
        alert('Оператор уже назначен на другой пост в этот день.');
        return;
      }
    }
  }

  td.textContent = opName;
  td.style.color = '#16a34a';
  td.style.fontWeight = '600';
  td.style.fontSize = '12px';
  td.style.cursor = 'pointer';
  td.setAttribute('data-op', opName);
  td.onclick = function(e) { editRotationCell(e); };
}
