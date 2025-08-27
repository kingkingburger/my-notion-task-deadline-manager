import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import { NotionClient } from '../src/notion.ts';
import { SlackClient } from '../src/slack.ts';
import { TaskReminderApp } from '../src/app.ts';
import { mockNotionResponse, mockTasks } from './mocks/notion.mock.ts';

// axios 모킹
vi.mock('axios');
const mockedAxios = vi.mocked(axios);

// Notion 클라이언트 모킹
const mockQuery = vi.fn();
vi.mock('@notionhq/client', () => ({
  Client: vi.fn().mockImplementation(() => ({
    databases: {
      query: mockQuery
    }
  }))
}));

vi.mock('node-cron', () => ({
  schedule: vi.fn()
}));

describe('통합 테스트', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      NOTION_API_KEY: 'test-notion-key',
      NOTION_DATABASE_ID: 'test-db-id',
      SLACK_WEBHOOK_URL: 'https://hooks.slack.com/test',
      REMINDER_DAYS: '3',
      CRON_SCHEDULE: '0 */2 * * *'
    };
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('전체 워크플로우', () => {
    it('Notion에서 작업을 가져와 Slack으로 알림을 보내는 전체 과정이 작동해야 합니다', async () => {
      // Notion API 응답 모킹
      const tasksWithUpcomingDueDate = {
        ...mockNotionResponse,
        results: [
          {
            ...mockNotionResponse.results[0],
            properties: {
              ...mockNotionResponse.results[0].properties,
              '목표일': {
                id: 'date',
                type: 'date',
                date: {
                  start: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 2일 후
                  end: null,
                  time_zone: null
                }
              }
            }
          }
        ]
      };

      mockQuery.mockResolvedValue(tasksWithUpcomingDueDate);
      mockedAxios.post.mockResolvedValue({ status: 200 });

      const app = new TaskReminderApp();
      await app.processTaskReminders();

      // Notion API가 호출되었는지 확인
      expect(mockQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          database_id: 'test-db-id',
          filter: expect.objectContaining({
            or: expect.arrayContaining([
              expect.objectContaining({
                property: '상태',
                status: { equals: '진행중' }
              })
            ])
          })
        })
      );

      // Slack 웹훅이 호출되었는지 확인
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://hooks.slack.com/test',
        expect.objectContaining({
          blocks: expect.arrayContaining([
            expect.objectContaining({
              type: 'header',
              text: expect.objectContaining({
                text: '📋 마감일 임박 작업 알림'
              })
            })
          ])
        })
      );
    });

    it('마감일이 지나지 않은 작업은 알림을 보내지 않아야 합니다', async () => {
      // 7일 후 마감인 작업
      const tasksWithFutureDueDate = {
        ...mockNotionResponse,
        results: [
          {
            ...mockNotionResponse.results[0],
            properties: {
              ...mockNotionResponse.results[0].properties,
              '목표일': {
                id: 'date',
                type: 'date',
                date: {
                  start: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7일 후
                  end: null,
                  time_zone: null
                }
              }
            }
          }
        ]
      };

      mockQuery.mockResolvedValue(tasksWithFutureDueDate);

      const app = new TaskReminderApp();
      await app.processTaskReminders();

      expect(mockQuery).toHaveBeenCalled();
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    it('오류 발생 시 오류 알림을 Slack으로 보내야 합니다', async () => {
      const error = new Error('Notion API 연결 실패');
      mockQuery.mockRejectedValue(error);
      mockedAxios.post.mockResolvedValue({ status: 200 });

      const app = new TaskReminderApp();
      await app.processTaskReminders();

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://hooks.slack.com/test',
        expect.objectContaining({
          blocks: expect.arrayContaining([
            expect.objectContaining({
              type: 'header',
              text: expect.objectContaining({
                text: '❌ 작업 알림 시스템 오류'
              })
            })
          ])
        })
      );
    });
  });

  describe('NotionClient와 SlackClient 통합', () => {
    it('NotionClient에서 가져온 작업을 SlackClient가 올바르게 포맷해야 합니다', async () => {
      const notionClient = new NotionClient('test-key', 'test-db-id');
      const slackClient = new SlackClient('https://hooks.slack.com/test');

      mockQuery.mockResolvedValue(mockNotionResponse);
      mockedAxios.post.mockResolvedValue({ status: 200 });

      const tasks = await notionClient.getTasks();
      await slackClient.sendTaskReminder(tasks);

      expect(tasks).toHaveLength(1);
      expect(tasks[0]).toMatchObject({
        title: '테스트 작업 1',
        status: '진행중',
        priority: '높음'
      });

      const slackMessage = mockedAxios.post.mock.calls[0][1];
      expect(slackMessage.blocks).toBeDefined();

      const taskSection = slackMessage.blocks.find((block: any) => 
        block.type === 'section' && 
        block.text?.text?.includes('테스트 작업 1')
      );
      expect(taskSection).toBeDefined();
    });
  });

  describe('환경변수 기반 설정', () => {
    it('REMINDER_DAYS 환경변수를 올바르게 사용해야 합니다', async () => {
      process.env.REMINDER_DAYS = '5';

      // 5일 후 마감인 작업
      const tasksWithFiveDaysDueDate = {
        ...mockNotionResponse,
        results: [
          {
            ...mockNotionResponse.results[0],
            properties: {
              ...mockNotionResponse.results[0].properties,
              '목표일': {
                id: 'date',
                type: 'date',
                date: {
                  start: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                  end: null,
                  time_zone: null
                }
              }
            }
          }
        ]
      };

      mockQuery.mockResolvedValue(tasksWithFiveDaysDueDate);
      mockedAxios.post.mockResolvedValue({ status: 200 });

      const app = new TaskReminderApp();
      await app.processTaskReminders();

      expect(mockedAxios.post).toHaveBeenCalled();
    });

    it('CRON_SCHEDULE 환경변수를 올바르게 사용해야 합니다', async () => {
      process.env.CRON_SCHEDULE = '0 0 * * *'; // 매일 자정

      const { schedule } = await import('node-cron');
      const scheduleSpy = vi.mocked(schedule);

      const app = new TaskReminderApp();
      app.startScheduler();

      expect(scheduleSpy).toHaveBeenCalledWith('0 0 * * *', expect.any(Function));
    });
  });
});
