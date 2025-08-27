import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';

// E2E 테스트를 위한 실제 환경 시뮬레이션
describe('E2E 테스트', () => {
  const originalEnv = process.env;

  beforeAll(() => {
    // 테스트용 환경변수 설정
    process.env = {
      ...originalEnv,
      NOTION_API_KEY: 'test-notion-key',
      NOTION_DATABASE_ID: 'test-db-id',
      SLACK_WEBHOOK_URL: 'https://hooks.slack.com/test',
      REMINDER_DAYS: '3',
      CRON_SCHEDULE: '0 */2 * * *'
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('애플리케이션 시작', () => {
    it('모든 의존성이 올바르게 로드되어야 합니다', async () => {
      // 동적 import로 모듈 로드 테스트
      const modules = await Promise.all([
        import('../src/app.ts'),
        import('../src/notion.ts'),
        import('../src/slack.ts'),
        import('../src/utils.ts'),
        import('../src/types/index.ts')
      ]);

      expect(modules).toHaveLength(5);
      expect(modules[0].TaskReminderApp).toBeDefined();
      expect(modules[1].NotionClient).toBeDefined();
      expect(modules[2].SlackClient).toBeDefined();
      expect(modules[3].log).toBeDefined();
    });

    it('타입 정의가 올바르게 export되어야 합니다', async () => {
      const typesModule = await import('../src/types/index.ts');

      expect(typesModule.TASK_STATUSES).toBeDefined();
      expect(typesModule.TASK_STATUSES.ACTIVE).toContain('진행중');
      expect(typesModule.TASK_STATUSES.COMPLETED).toContain('완료');
    });
  });

  describe('환경변수 검증', () => {
    it('필수 환경변수 누락 시 적절한 오류 메시지를 표시해야 합니다', async () => {
      // 환경변수 임시 제거
      const notionApiKey = process.env.NOTION_API_KEY;
      delete process.env.NOTION_API_KEY;

      try {
        // 모듈을 새로 import하기 위해 캐시 클리어
        vi.resetModules();

        const { validateEnvironmentVariables } = await import('../src/utils.ts');

        expect(() => validateEnvironmentVariables()).toThrow(
          '다음 환경변수가 설정되지 않았습니다: NOTION_API_KEY'
        );
      } finally {
        // 환경변수 복원
        if (notionApiKey) {
          process.env.NOTION_API_KEY = notionApiKey;
        }
      }
    });
  });

  describe('모듈 간 호환성', () => {
    it('모든 모듈이 ESM으로 올바르게 작동해야 합니다', async () => {
      const { TaskReminderApp } = await import('../src/app.ts');
      const { NotionClient } = await import('../src/notion.ts');
      const { SlackClient } = await import('../src/slack.ts');
      const { log, validateEnvironmentVariables } = await import('../src/utils.ts');

      expect(typeof TaskReminderApp).toBe('function');
      expect(typeof NotionClient).toBe('function');
      expect(typeof SlackClient).toBe('function');
      expect(typeof log).toBe('function');
      expect(typeof validateEnvironmentVariables).toBe('function');
    });

    it('타입 가져오기가 올바르게 작동해야 합니다', async () => {
      // 타입 import는 런타임에 영향을 주지 않으므로 
      // 컴파일 타임 검증을 위한 기본적인 테스트만 수행
      const typesModule = await import('../src/types/index.ts');

      expect(typesModule).toBeDefined();
    });
  });

  describe('크론 스케줄링', () => {
    it('크론 표현식이 유효해야 합니다', async () => {
      const cronSchedules = [
        '0 */2 * * *', // 2시간마다
        '0 0 * * *',   // 매일 자정
        '*/30 * * * *', // 30분마다
        '0 9 * * 1-5'   // 평일 오전 9시
      ];

      // 기본적인 크론 표현식 형식 검증
      cronSchedules.forEach(schedule => {
        const parts = schedule.split(' ');
        expect(parts).toHaveLength(5);
      });
    });
  });

  describe('로깅 시스템', () => {
    it('모든 로그 레벨이 올바르게 작동해야 합니다', async () => {
      const { log } = await import('../src/utils.ts');
      const consoleSpy = vi.spyOn(console, 'log');

      const levels = ['info', 'warn', 'error', 'debug'] as const;

      levels.forEach(level => {
        log(`${level} 메시지 테스트`, level);
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringMatching(new RegExp(`\\[.*\\] ${level.toUpperCase()}: ${level} 메시지 테스트`))
        );
      });

      consoleSpy.mockRestore();
    });
  });
});
