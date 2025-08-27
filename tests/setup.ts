import { vi } from 'vitest';

// 환경변수 설정
process.env.NOTION_API_KEY = 'test-notion-api-key';
process.env.NOTION_DATABASE_ID = 'test-database-id';
process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/test';
process.env.REMINDER_DAYS = '3';
process.env.CRON_SCHEDULE = '0 */2 * * *';

// 전역 모킹 설정
vi.mock('node-cron', () => ({
  schedule: vi.fn()
}));

// Console 모킹 (선택적)
global.console = {
  ...console,
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn()
};
