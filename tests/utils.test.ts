import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  filterTasksByDueDate,
  filterTasksByStatus,
  excludeCompletedTasks,
  sortTasksByDueDate,
  sortTasksByPriorityAndDueDate,
  validateEnvironmentVariables,
  formatDate,
  log,
  getEnvNumber,
  getEnvString
} from '../src/utils.ts';
import type { Task } from '../src/types/index.ts';

const createMockTask = (overrides: Partial<Task>): Task => ({
  id: 'test-id',
  title: '테스트 작업',
  dueDate: null,
  status: null,
  priority: null,
  assignee: null,
  url: 'https://notion.so/test',
  ...overrides
});

describe('Utils', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('filterTasksByDueDate', () => {
    it('지정된 일수 이내의 작업만 반환해야 합니다', () => {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      const nextWeek = new Date(today);
      nextWeek.setDate(today.getDate() + 7);

      const tasks: Task[] = [
        createMockTask({ id: '1', dueDate: tomorrow.toISOString().split('T')[0] }),
        createMockTask({ id: '2', dueDate: nextWeek.toISOString().split('T')[0] }),
        createMockTask({ id: '3', dueDate: null })
      ];

      const result = filterTasksByDueDate(tasks, 3);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
    });

    it('마감일이 없는 작업은 제외해야 합니다', () => {
      const tasks: Task[] = [
        createMockTask({ id: '1', dueDate: null }),
        createMockTask({ id: '2', dueDate: undefined as any })
      ];

      const result = filterTasksByDueDate(tasks, 3);

      expect(result).toHaveLength(0);
    });

    it('기본값으로 3일을 사용해야 합니다', () => {
      const today = new Date();
      const inTwoDays = new Date(today);
      inTwoDays.setDate(today.getDate() + 2);

      const tasks: Task[] = [
        createMockTask({ id: '1', dueDate: inTwoDays.toISOString().split('T')[0] })
      ];

      const result = filterTasksByDueDate(tasks);

      expect(result).toHaveLength(1);
    });
  });

  describe('excludeCompletedTasks', () => {
    it('완료된 작업을 제외해야 합니다', () => {
      const tasks: Task[] = [
        createMockTask({ id: '1', status: '진행중' }),
        createMockTask({ id: '2', status: '완료' }),
        createMockTask({ id: '3', status: 'Done' }),
        createMockTask({ id: '4', status: '대기' })
      ];

      const result = excludeCompletedTasks(tasks);

      expect(result).toHaveLength(2);
      expect(result.map(t => t.id)).toEqual(['1', '4']);
    });

    it('상태가 없는 작업은 포함해야 합니다', () => {
      const tasks: Task[] = [
        createMockTask({ id: '1', status: null }),
        createMockTask({ id: '2', status: '완료' })
      ];

      const result = excludeCompletedTasks(tasks);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
    });
  });

  describe('sortTasksByPriorityAndDueDate', () => {
    it('우선순위와 마감일로 올바르게 정렬해야 합니다', () => {
      const tasks: Task[] = [
        createMockTask({ id: '1', priority: '보통', dueDate: '2023-12-05' }),
        createMockTask({ id: '2', priority: '높음', dueDate: '2023-12-07' }),
        createMockTask({ id: '3', priority: '높음', dueDate: '2023-12-03' }),
        createMockTask({ id: '4', priority: '낮음', dueDate: '2023-12-01' })
      ];

      const result = sortTasksByPriorityAndDueDate(tasks);

      expect(result.map(t => t.id)).toEqual(['3', '2', '1', '4']);
    });

    it('우선순위가 같으면 마감일로 정렬해야 합니다', () => {
      const tasks: Task[] = [
        createMockTask({ id: '1', priority: '높음', dueDate: '2023-12-05' }),
        createMockTask({ id: '2', priority: '높음', dueDate: '2023-12-03' })
      ];

      const result = sortTasksByPriorityAndDueDate(tasks);

      expect(result.map(t => t.id)).toEqual(['2', '1']);
    });
  });

  describe('validateEnvironmentVariables', () => {
    it('필수 환경변수가 모두 있으면 성공해야 합니다', () => {
      process.env.NOTION_API_KEY = 'test-key';
      process.env.NOTION_DATABASE_ID = 'test-db-id';
      process.env.SLACK_WEBHOOK_URL = 'test-url';

      expect(() => validateEnvironmentVariables()).not.toThrow();
    });

    it('필수 환경변수가 없으면 에러를 던져야 합니다', () => {
      delete process.env.NOTION_API_KEY;

      expect(() => validateEnvironmentVariables()).toThrow(
        '다음 환경변수가 설정되지 않았습니다: NOTION_API_KEY'
      );
    });
  });

  describe('getEnvNumber', () => {
    it('올바른 숫자 환경변수를 파싱해야 합니다', () => {
      process.env.TEST_NUMBER = '42';

      const result = getEnvNumber('TEST_NUMBER', 0);

      expect(result).toBe(42);
    });

    it('잘못된 값이면 기본값을 반환해야 합니다', () => {
      process.env.TEST_NUMBER = 'not-a-number';

      const result = getEnvNumber('TEST_NUMBER', 5);

      expect(result).toBe(5);
    });

    it('환경변수가 없으면 기본값을 반환해야 합니다', () => {
      const result = getEnvNumber('NON_EXISTENT', 10);

      expect(result).toBe(10);
    });
  });

  describe('getEnvString', () => {
    it('환경변수 문자열을 반환해야 합니다', () => {
      process.env.TEST_STRING = 'test-value';

      const result = getEnvString('TEST_STRING', 'default');

      expect(result).toBe('test-value');
    });

    it('환경변수가 없으면 기본값을 반환해야 합니다', () => {
      const result = getEnvString('NON_EXISTENT', 'default-value');

      expect(result).toBe('default-value');
    });
  });

  describe('formatDate', () => {
    it('날짜를 한국어 형식으로 포맷해야 합니다', () => {
      const date = new Date('2023-12-01');
      const result = formatDate(date);

      expect(result).toMatch(/2023년.*12월.*1일/);
    });

    it('문자열 날짜도 처리해야 합니다', () => {
      const result = formatDate('2023-12-01');

      expect(result).toMatch(/2023년.*12월.*1일/);
    });
  });

  describe('log', () => {
    it('로그 메시지를 올바른 형식으로 출력해야 합니다', () => {
      const consoleSpy = vi.spyOn(console, 'log');

      log('테스트 메시지', 'info');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[.*\] INFO: 테스트 메시지/)
      );
    });

    it('기본 로그 레벨은 info여야 합니다', () => {
      const consoleSpy = vi.spyOn(console, 'log');

      log('테스트 메시지');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[.*\] INFO: 테스트 메시지/)
      );
    });
  });
});
