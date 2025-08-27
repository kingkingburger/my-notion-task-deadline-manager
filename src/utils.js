/**
 * 마감일이 지정된 일수 이내인 작업들을 필터링합니다
 */
function filterTasksByDueDate(tasks, days = 3) {
  const today = new Date();
  const futureDate = new Date();
  futureDate.setDate(today.getDate() + days);

  return tasks.filter(task => {
    if (!task.dueDate) return false;

    const dueDate = new Date(task.dueDate);
    return dueDate >= today && dueDate <= futureDate;
  });
}

/**
 * 작업을 마감일 순으로 정렬합니다
 */
function sortTasksByDueDate(tasks) {
  return tasks.sort((a, b) => {
    const dateA = new Date(a.dueDate);
    const dateB = new Date(b.dueDate);
    return dateA - dateB;
  });
}

/**
 * 작업을 우선순위와 마감일로 정렬합니다
 */
function sortTasksByPriorityAndDueDate(tasks) {
  const priorityOrder = { 'High': 1, '높음': 1, 'Medium': 2, '보통': 2, 'Low': 3, '낮음': 3 };

  return tasks.sort((a, b) => {
    // 우선순위로 먼저 정렬
    const priorityA = priorityOrder[a.priority] || 4;
    const priorityB = priorityOrder[b.priority] || 4;

    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }

    // 우선순위가 같으면 마감일로 정렬
    const dateA = new Date(a.dueDate);
    const dateB = new Date(b.dueDate);
    return dateA - dateB;
  });
}

/**
 * 환경변수 검증
 */
function validateEnvironmentVariables() {
  const required = ['NOTION_API_KEY', 'NOTION_DATABASE_ID', 'SLACK_WEBHOOK_URL'];
  const missing = [];

  required.forEach(key => {
    if (!process.env[key]) {
      missing.push(key);
    }
  });

  if (missing.length > 0) {
    throw new Error(`다음 환경변수가 설정되지 않았습니다: ${missing.join(', ')}`);
  }
}

/**
 * 날짜 포맷팅
 */
function formatDate(date) {
  return new Date(date).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short'
  });
}

/**
 * 로깅 헬퍼
 */
function log(message, level = 'info') {
  const timestamp = new Date().toISOString();
  const levelUpper = level.toUpperCase();
  console.log(`[${timestamp}] ${levelUpper}: ${message}`);
}

module.exports = {
  filterTasksByDueDate,
  sortTasksByDueDate,
  sortTasksByPriorityAndDueDate,
  validateEnvironmentVariables,
  formatDate,
  log
};
