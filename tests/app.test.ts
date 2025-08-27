import { describe, it, expect, vi, beforeEach } from 'vitest';
import {TaskReminderApp} from "../src/app.ts";
import {mockTasks} from "./mocks/notion.mock.ts";

// 의존성 모킹
vi.mock('../src/notion.ts', () => ({
  NotionClient: vi.fn().mockImplementation(() => ({
    getTasks: vi.fn()
  }))
}));

vi.mock('../src/slack.ts', () => ({
  SlackClient: vi.fn().mockImplementation(() => ({
    sendTaskReminder: vi.fn(),
    sendErrorNotification: vi.fn()
  }))
}));

vi.mock('node-cron', () => ({
  schedule: vi.fn()
}));

// utils 모킹
vi.mock('../src/utils.ts', () => ({
  validateEnvironmentVariables: vi.fn(),
  log: vi.fn(),
  getEnvNumber: vi.fn(),
  getEnvString: vi.fn(),
  filterTasksByDueDate: vi.fn().mockImplementation((tasks, days) => tasks),
  sortTasksByPriorityAndDueDate: vi.fn().mockImplementation((tasks) => tasks),
  excludeCompletedTasks: vi.fn().mockImplementation((tasks) => tasks.filter((task: any) => task.status !== '완료'))
}));

describe('TaskReminderApp', () => {
  let app: TaskReminderApp;
  let mockNotionClient: any;
  let mockSlackClient: any;
  const originalEnv = process.env;

  beforeEach(async () => {
    vi.clearAllMocks();

    // 환경변수 복원
    process.env = { ...originalEnv };

    // 기본 환경변수 설정
    process.env.NOTION_API_KEY = 'test-notion-key';
    process.env.NOTION_DATABASE_ID = 'test-db-id';
    process.env.SLACK_WEBHOOK_URL = 'test-slack-url';
    process.env.REMINDER_DAYS = '3';
    process.env.CRON_SCHEDULE = '0 */2 * * *';

    // utils 모킹된 함수들 가져오기
    const { validateEnvironmentVariables, getEnvNumber, getEnvString } = await import('../src/utils.ts');

    // 기본 동작 설정
    vi.mocked(validateEnvironmentVariables).mockImplementation(() => {});
    vi.mocked(getEnvNumber).mockImplementation((key, defaultValue) => {
      const value = process.env[key];
      return value ? parseInt(value, 10) : defaultValue;
    });
    vi.mocked(getEnvString).mockImplementation((key, defaultValue) => {
      return process.env[key] || defaultValue;
    });
  });

  describe('constructor', () => {
    it('필수 환경변수가 없으면 프로세스를 종료해야 합니다', async () => {
      const { validateEnvironmentVariables } = await import('../src/utils.ts');
      const error = new Error('다음 환경변수가 설정되지 않았습니다: NOTION_API_KEY');

      // process.exit를 모킹
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('Process exit prevented in test');
      });

      // console.log 스파이 (로그 확인용)
      const logSpy = vi.spyOn(console, 'log');

      vi.mocked(validateEnvironmentVariables).mockImplementation(() => {
        throw error;
      });

      expect(() => new TaskReminderApp()).toThrow('Process exit prevented in test');

      // process.exit가 올바른 코드로 호출되었는지 확인
      expect(exitSpy).toHaveBeenCalledWith(1);

      // spy들 복원
      exitSpy.mockRestore();
      logSpy.mockRestore();
    });

    it('환경변수가 모두 있으면 성공적으로 초기화되어야 합니다', async () => {
      const { validateEnvironmentVariables } = await import('../src/utils.ts');
      vi.mocked(validateEnvironmentVariables).mockImplementation(() => {});

      // process.exit가 호출되지 않아야 함
      const exitSpy = vi.spyOn(process, 'exit');

      const taskApp = new TaskReminderApp();
      expect(taskApp).toBeInstanceOf(TaskReminderApp);

      // process.exit가 호출되지 않았는지 확인
      expect(exitSpy).not.toHaveBeenCalled();

      // 모킹된 인스턴스에 접근
      const { NotionClient } = await import('../src/notion.ts');
      const { SlackClient } = await import('../src/slack.ts');

      app = taskApp;
      mockNotionClient = vi.mocked(NotionClient).mock.results[0].value;
      mockSlackClient = vi.mocked(SlackClient).mock.results[0].value;

      // spy 복원
      exitSpy.mockRestore();
    });
  });

  describe('processTaskReminders', () => {
    beforeEach(async () => {
      if (!app) {
        const { validateEnvironmentVariables } = await import('../src/utils.ts');
        vi.mocked(validateEnvironmentVariables).mockImplementation(() => {});
        app = new TaskReminderApp();

        const { NotionClient } = await import('../src/notion.ts');
        const { SlackClient } = await import('../src/slack.ts');

        mockNotionClient = vi.mocked(NotionClient).mock.results[0].value;
        mockSlackClient = vi.mocked(SlackClient).mock.results[0].value;
      }
    });

    it('작업 알림을 성공적으로 처리해야 합니다', async () => {
      const activeTasks = mockTasks.filter(task => task.status !== '완료');

      mockNotionClient.getTasks.mockResolvedValue(mockTasks);

      await app.processTaskReminders();

      expect(mockNotionClient.getTasks).toHaveBeenCalled();
      expect(mockSlackClient.sendTaskReminder).toHaveBeenCalled();
    });

    it('알림을 보낼 작업이 없으면 Slack 전송을 건너뛰어야 합니다', async () => {
      mockNotionClient.getTasks.mockResolvedValue([]);

      await app.processTaskReminders();

      expect(mockNotionClient.getTasks).toHaveBeenCalled();
      expect(mockSlackClient.sendTaskReminder).not.toHaveBeenCalled();
    });

    it('Notion 오류 시 오류 알림을 전송해야 합니다', async () => {
      const error = new Error('Notion API 오류');
      mockNotionClient.getTasks.mockRejectedValue(error);

      await app.processTaskReminders();

      expect(mockSlackClient.sendErrorNotification).toHaveBeenCalledWith(error);
    });

    it('Slack 오류 알림 전송이 실패해도 크래시하지 않아야 합니다', async () => {
      const notionError = new Error('Notion API 오류');
      const slackError = new Error('Slack 전송 실패');

      mockNotionClient.getTasks.mockRejectedValue(notionError);
      mockSlackClient.sendErrorNotification.mockRejectedValue(slackError);

      await expect(app.processTaskReminders()).resolves.not.toThrow();
    });
  });

  describe('startScheduler', () => {
    beforeEach(async () => {
      if (!app) {
        const { validateEnvironmentVariables } = await import('../src/utils.ts');
        vi.mocked(validateEnvironmentVariables).mockImplementation(() => {});
        app = new TaskReminderApp();

        const { NotionClient } = await import('../src/notion.ts');
        const { SlackClient } = await import('../src/slack.ts');

        mockNotionClient = vi.mocked(NotionClient).mock.results[0].value;
        mockSlackClient = vi.mocked(SlackClient).mock.results[0].value;
      }
    });

    it('스케줄러를 시작하고 즉시 한 번 실행해야 합니다', async () => {
      mockNotionClient.getTasks.mockResolvedValue([]);

      const { schedule } = await import('node-cron');
      const scheduleSpy = vi.mocked(schedule);

      app.startScheduler();

      expect(scheduleSpy).toHaveBeenCalledWith('0 */2 * * *', expect.any(Function));
      expect(mockNotionClient.getTasks).toHaveBeenCalled();
    });
  });

  describe('setupGracefulShutdown', () => {
    beforeEach(async () => {
      if (!app) {
        const { validateEnvironmentVariables } = await import('../src/utils.ts');
        vi.mocked(validateEnvironmentVariables).mockImplementation(() => {});
        app = new TaskReminderApp();

        const { NotionClient } = await import('../src/notion.ts');
        const { SlackClient } = await import('../src/slack.ts');

        mockNotionClient = vi.mocked(NotionClient).mock.results[0].value;
        mockSlackClient = vi.mocked(SlackClient).mock.results[0].value;
      }
    });

    it('SIGTERM 신호를 처리해야 합니다', () => {
      const onSpy = vi.spyOn(process, 'on');

      app.setupGracefulShutdown();

      expect(onSpy).toHaveBeenCalledWith('SIGTERM', expect.any(Function));
      expect(onSpy).toHaveBeenCalledWith('SIGINT', expect.any(Function));
    });
  });
});
