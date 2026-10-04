const STORAGE_KEY = 'ilu-se4-state-v1';

let storageCanSave = true;

function saveState() {
  if (!storageCanSave) {
    return false;
  }

  const state = {
    posts,
    operators,
    difficulty,
    ergonomics,
    trainingDays,
    attendanceData,
    operatorAttendance,
    operatorRoles,
    data,
    trainingRecords,
    placementLog,
    statsHistory,
    workshopChief,
    sectionChief,
    filters: filterState
  };

  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(state)
    );

    return true;
  } catch (error) {
    console.error(
      'Не удалось сохранить данные:',
      error
    );

    return false;
  }
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return false;
    }

    const state = JSON.parse(raw);

    const arrays = [
      'posts',
      'operators',
      'difficulty',
      'ergonomics',
      'trainingDays',
      'attendanceData',
      'operatorAttendance',
      'operatorRoles',
      'data',
      'trainingRecords',
      'placementLog'
    ];

    if (
      arrays.some(key => !Array.isArray(state[key]))
    ) {
      throw new Error(
        'Некорректная структура сохранённых данных'
      );
    }

    const postCount = state.posts.length;
    const operatorCount = state.operators.length;

    if (
      state.difficulty.length !== postCount ||
      state.ergonomics.length !== postCount ||
      state.trainingDays.length !== postCount ||
      state.operatorAttendance.length !== operatorCount ||
      state.operatorRoles.length !== operatorCount
    ) {
      throw new Error(
        'Размеры массивов не совпадают'
      );
    }

    if (
      state.data.length !== postCount ||
      state.attendanceData.length !== postCount ||
      state.data.some(
        row =>
          !Array.isArray(row) ||
          row.length !== operatorCount
      ) ||
      state.attendanceData.some(
        row =>
          !Array.isArray(row) ||
          row.length !== operatorCount
      )
    ) {
      throw new Error(
        'Некорректный размер матрицы'
      );
    }

    posts = state.posts;
    operators = state.operators;
    difficulty = state.difficulty;
    ergonomics = state.ergonomics;
    trainingDays = state.trainingDays;
    attendanceData = state.attendanceData;
    operatorAttendance = state.operatorAttendance;
    operatorRoles = state.operatorRoles;
    data = state.data;
    trainingRecords = state.trainingRecords;
    placementLog = state.placementLog;

    statsHistory = Array.isArray(state.statsHistory)
      ? state.statsHistory
      : [];

    workshopChief =
      typeof state.workshopChief === 'string'
        ? state.workshopChief
        : '';

    sectionChief =
      typeof state.sectionChief === 'string'
        ? state.sectionChief
        : '';

    if (
      state.filters &&
      typeof state.filters === 'object'
    ) {
      filterState = {
        department:
          typeof state.filters.department === 'string'
            ? state.filters.department
            : '',

        workshop:
          typeof state.filters.workshop === 'string'
            ? state.filters.workshop
            : '',

        section:
          typeof state.filters.section === 'string'
            ? state.filters.section
            : '',

        shift:
          typeof state.filters.shift === 'string'
            ? state.filters.shift
            : ''
      };
    }

    return true;
  } catch (error) {
    console.error(
      'Не удалось загрузить сохранённые данные:',
      error
    );

    return false;
  }
}