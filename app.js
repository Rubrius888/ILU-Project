
const restoredState = loadState();

/*
 * Новая установка должна открываться как чистый шаблон.
 * Если сохранённой матрицы нет, не показываем встроенные демонстрационные
 * данные разработчика. На компьютере владельца loadState() вернёт true,
 * поэтому его существующая матрица будет восстановлена без изменений.
 */
if (!restoredState) {
  posts = [];
  operators = [];
  difficulty = [];
  ergonomics = [];
  trainingDays = [];
  attendanceData = [];
  operatorAttendance = [];
  operatorRoles = [];
  data = [];
  trainingRecords = [];
  placementLog = [];
  placementFilters = {
    dateFrom: '',
    dateTo: '',
    operators: [],
    posts: []
  };
  placementSort = {
    key: 'date',
    direction: 'desc'
  };
  workshopChief = '';
  sectionChief = '';
}

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
  const emptyPosts = totalPosts - filledPosts;
  document.getElementById('statsTotalPosts').textContent = totalPosts;
  document.getElementById('statsFilledPosts').textContent = filledPosts;
  document.getElementById('statsEmptyPosts').textContent = emptyPosts;
  const emptyPostsRow = document.getElementById('statsEmptyPostsRow');

if (emptyPostsRow) {
  emptyPostsRow.classList.toggle('is-danger', emptyPosts > 0);
}
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

// ======================== ПЕРВИЧНЫЙ ЗАПУСК ========================
restoreSavedFilters();
updateDateBar();
updateInfoCard();
renderMatrix();
renderTrainingTable();
renderPlacementLog();
