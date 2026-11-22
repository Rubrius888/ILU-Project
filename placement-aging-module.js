function placementAgingDay(value) {
  const text = typeof value === 'string' ? value.trim() : '';
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  const local = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(text);
  if (!iso && !local) return null;

  const [year, month, day] = (iso ? iso.slice(1) : [local[3], local[2], local[1]]).map(Number);
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  if (year < 1 || date.getUTCFullYear() !== year ||
      date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return date.getTime() / 86400000;
}

function placementAgingWorkdays(from, to) {
  const days = to - from;
  let workdays = Math.floor(days / 7) * 5;
  // 1970-01-01 was Thursday. Skip the placement date and include the report date.
  for (let offset = 1; offset <= days % 7; offset++) {
    const weekday = ((from + offset + 4) % 7 + 7) % 7;
    if (weekday !== 0 && weekday !== 6) workdays++;
  }
  return workdays;
}

function placementAgingIdentity(names, ids = []) {
  const byId = new Map(ids.flatMap((id, index) => id ? [[id, index]] : []));
  const byName = new Map();
  names.forEach((name, index) => {
    if (!byName.has(name)) byName.set(name, []);
    byName.get(name).push(index);
  });
  return (id, name) => {
    const matches = byName.get(name) || [];
    if (!id) return matches.length === 1 ? matches[0] : null;
    const index = byId.get(id);
    // An old name can disappear after a rename. A name now identifying a
    // different operator or post makes the stored pair ambiguous.
    return index !== undefined && (!matches.length || matches.includes(index)) ? index : null;
  };
}

function buildPlacementAgingReport(matrix, today) {
  const reportDay = placementAgingDay(today);
  const operatorIndex = placementAgingIdentity(matrix.operators, matrix.operatorIds);
  const postIndex = placementAgingIdentity(matrix.posts, matrix.postIds);
  const diagnostics = { invalidDates: 0, unresolvedPairs: 0, conflicts: 0 };
  const starts = new Map();
  for (const event of matrix.placementFactEvents || []) {
    if (event?.eventType !== 'start' || !event.sourcePlacementId) continue;
    if (!starts.has(event.sourcePlacementId)) starts.set(event.sourcePlacementId, []);
    starts.get(event.sourcePlacementId).push(event);
  }

  const signatures = new Map();
  const conflictingRecords = new Set();
  for (const entry of matrix.placementLog) {
    if (!entry?.id) continue;
    const signature = JSON.stringify([
      entry.operatorId, entry.opName, entry.postId, entry.postName,
      placementAgingDay(entry.date), entry.status, entry.reason
    ]);
    if (signatures.has(entry.id) && signatures.get(entry.id) !== signature) {
      conflictingRecords.add(entry.id);
    }
    signatures.set(entry.id, signature);
  }

  const latest = new Map();
  for (const entry of matrix.placementLog) {
    if (!entry) {
      diagnostics.unresolvedPairs++;
      continue;
    }
    if (entry.status && entry.status !== '○' && entry.status !== '△') continue;

    const operator = operatorIndex(entry.operatorId, entry.opName);
    const post = postIndex(entry.postId, entry.postName);
    if (conflictingRecords.has(entry.id) || (starts.get(entry.id) || []).some(event =>
      (event.operatorId && (entry.operatorId ? event.operatorId !== entry.operatorId : operatorIndex(event.operatorId) !== operator)) ||
      (event.postId && (entry.postId ? event.postId !== entry.postId : postIndex(event.postId) !== post))
    )) {
      diagnostics.conflicts++;
      continue;
    }
    if (operator === null || post === null) {
      diagnostics.unresolvedPairs++;
      continue;
    }
    const day = placementAgingDay(entry.date);
    if (day === null || reportDay === null || day > reportDay) {
      diagnostics.invalidDates++;
      continue;
    }

    // Both kinds of participation use the journal date. An event alone
    // cannot add or advance a date, even when it has a later timestamp.
    const key = `${post}:${operator}`;
    if (!latest.has(key) || day > latest.get(key)) latest.set(key, day);
  }

  const rolesExcluded = new Set(['СО', 'НУ', 'ДС']);
  const qualifications = new Set(['I', 'Iкр', 'L', 'Lкр', 'U']);
  const rows = [];
  matrix.posts.forEach((post, postIndex) => {
    matrix.operators.forEach((operator, operatorIndex) => {
      const level = matrix.data[postIndex]?.[operatorIndex];
      if (!qualifications.has(level) || rolesExcluded.has(matrix.operatorRoles[operatorIndex]) ||
          matrix.operatorAttendance[operatorIndex] === 'У') return;

      const lastDay = latest.get(`${postIndex}:${operatorIndex}`) ?? null;
      const days = lastDay === null ? null : placementAgingWorkdays(lastDay, reportDay);
      const color = days === null || days >= 42 ? 'red' : days >= 30 ? 'yellow' : 'green';
      const status = days === null ? 'Нет постановок' :
        { red: 'Устарело', yellow: 'Требует внимания', green: 'Актуально' }[color];
      rows.push({ post, postId: matrix.postIds?.[postIndex], operator, level, lastDay, days, color, status });
    });
  });

  rows.sort((a, b) =>
    (b.days ?? Infinity) - (a.days ?? Infinity) ||
    a.post.localeCompare(b.post, 'ru', { numeric: true }) ||
    a.operator.localeCompare(b.operator, 'ru')
  );
  return { rows, diagnostics };
}

function renderPlacementAging() {
  const panel = document.getElementById('placementAging');
  if (!panel) return;

  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const { rows, diagnostics } = buildPlacementAgingReport({
    operators, operatorIds, operatorRoles, operatorAttendance, posts, postIds, data,
    placementLog, placementFactEvents
  }, today);

  const postFilter = panel.querySelector('#placementAgingPost');
  const query = panel.querySelector('#placementAgingOperator');
  const lastPost = postFilter.value;
  postFilter.replaceChildren(new Option('Все посты', ''),
    ...posts.map((post, index) => new Option(post, postIds[index])));
  if (postIds.includes(lastPost)) postFilter.value = lastPost;

  const tbody = panel.querySelector('tbody');
  const dateFormat = new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC'
  });
  const showRows = () => {
    const name = query.value.trim().toLocaleLowerCase('ru');
    const visible = rows.filter(row =>
      (!postFilter.value || row.postId === postFilter.value) &&
      row.operator.toLocaleLowerCase('ru').includes(name)
    );
    const counts = { red: 0, yellow: 0, green: 0 };
    const fragment = document.createDocumentFragment();
    for (const row of visible) {
      counts[row.color]++;
      const tr = document.createElement('tr');
      const date = row.lastDay === null ? '—' : dateFormat.format(new Date(row.lastDay * 86400000));
      for (const value of [row.post, row.operator, row.level, date, row.days ?? '—']) {
        tr.insertCell().textContent = value;
      }
      const status = tr.insertCell();
      status.textContent = row.status;
      status.className = `placement-aging-status placement-aging-${row.color}`;
      fragment.appendChild(tr);
    }

    if (!visible.length) {
      const tr = document.createElement('tr');
      const cell = tr.insertCell();
      cell.colSpan = 6;
      cell.textContent = rows.length ? 'По выбранным фильтрам записей нет.' : 'Нет квалифицированных сочетаний операторов и постов.';
      fragment.appendChild(tr);
    }

    tbody.replaceChildren(fragment);
    for (const [color, count] of Object.entries(counts)) {
      panel.querySelector(`[data-aging-count="${color}"]`).textContent = count;
    }
  };

  const notice = panel.querySelector('#placementAgingDiagnostics');
  const { conflicts, invalidDates, unresolvedPairs } = diagnostics;
  notice.hidden = !(conflicts || invalidDates || unresolvedPairs);
  notice.textContent = `Пропущенные строки журнала: конфликт ID или записей — ${conflicts}, некорректные или будущие даты — ${invalidDates}, не удалось определить пару — ${unresolvedPairs}.`;
  postFilter.onchange = showRows;
  query.oninput = showRows;
  showRows();
}
