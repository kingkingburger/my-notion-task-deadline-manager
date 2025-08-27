import type { Task, LogLevel, TaskFilterOptions, EnvironmentConfig } from './types/index.js';

/**
 * 마감일이 지정된 일수 이내인 작업들을 필터링합니다
 */
export function filterTasksByDueDate(tasks: Task[], days: number = 3): Task[] {
  const today = new Date();
  const futureDate = new Date();
  futureDate.setDate(today.getDate() + days);

  return tasks.filter(task => {
    if (!task.dueDate) return false;

    const dueDate = new Date(task.dueDate);
    return dueDate <= futureDate;
  });
}

/**
 * 허용된 상태의 작업들만 필터링합니다 (완료된 작업 제외)
 */
export function filterTasksByStatus(tasks: Task[]): Task[] {
  const allowedStatuses = [
    'In Progress', '진행중',
    'Not Started', '대기', '시작 전',
    'To Do', '할 일',
    'Pending', '보류'
  ];

  return tasks.filter(task => {
    if (!task.status) return true; // 상태가 없으면 포함
    return allowedStatuses.includes(task.status);
  });
}

/**
 * 완료된 작업들을 제외합니다
 */
export function excludeCompletedTasks(tasks: Task[]): Task[] {
  const completedStatuses = [
    'Done', '완료', '완성',
    'Completed', '끝',
    'Finished', '종료',
    'Closed', '닫힘'
  ];

  return tasks.filter(task => {
    if (!task.status) return true; // 상태가 없으면 포함
    return !completedStatuses.includes(task.status);
  });
}

/**
 * 작업을 마감일 순으로 정렬합니다
 */
export function sortTasksByDueDate(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    if (!a.dueDate || !b.dueDate) return 0;
    const dateA = new Date(a.dueDate);
    const dateB = new Date(b.dueDate);
    return dateA.getTime() - dateB.getTime();
  });
}

/**
 * 작업을 우선순위와 마감일로 정렬합니다
 */
export function sortTasksByPriorityAndDueDate(tasks: Task[]): Task[] {
  const priorityOrder: Record<string, number> = { 
    'High': 1, '높음': 1, 
    'Medium': 2, '보통': 2, 
    'Low': 3, '낮음': 3 
  };

  return [...tasks].sort((a, b) => {
    // 우선순위로 먼저 정렬
    const priorityA = priorityOrder[a.priority || ''] || 4;
    const priorityB = priorityOrder[b.priority || ''] || 4;

    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }

    // 우선순위가 같으면 마감일로 정렬
    if (!a.dueDate || !b.dueDate) return 0;
    const dateA = new Date(a.dueDate);
    const dateB = new Date(b.dueDate);
    return dateA.getTime() - dateB.getTime();
  });
}

/**
 * 환경변수 검증
 */
export function validateEnvironmentVariables(): void {
  const required: (keyof EnvironmentConfig)[] = [
    'NOTION_API_KEY', 
    'NOTION_DATABASE_ID', 
    'SLACK_WEBHOOK_URL'
  ];
  const missing: string[] = [];

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
export function formatDate(date: string | Date): string {
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
export function log(message: string, level: LogLevel = 'info'): void {
  const timestamp = new Date().toISOString();
  const levelUpper = level.toUpperCase();
  console.log(`[${timestamp}] ${levelUpper}: ${message}`);
}

/**
 * 안전한 환경변수 파싱
 */
export function getEnvNumber(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * 안전한 환경변수 문자열 가져오기
 */
export function getEnvString(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}
