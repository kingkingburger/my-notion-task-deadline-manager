import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { SlackClient } from '../src/slack.ts';
import {mockTasks} from "./mocks/notion.mock";

// axios 모킹
vi.mock('axios');
const mockedAxios = vi.mocked(axios);

describe('SlackClient', () => {
  let slackClient: SlackClient;
  const webhookUrl = 'https://hooks.slack.com/test';

  beforeEach(() => {
    vi.clearAllMocks();
    slackClient = new SlackClient(webhookUrl);
  });

  describe('sendTaskReminder', () => {
    it('작업 알림 메시지를 성공적으로 전송해야 합니다', async () => {

      const activeTasks = mockTasks.filter(task => task.status !== '완료');
      await slackClient.sendTaskReminder(activeTasks);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        webhookUrl,
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

    it('빈 작업 배열을 처리해야 합니다', async () => {
      await slackClient.sendTaskReminder([]);

      expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    it('Slack 전송 오류를 적절히 처리해야 합니다', async () => {
      const error = new Error('Slack 전송 실패');

      await expect(slackClient.sendTaskReminder(mockTasks)).rejects.toThrow('Slack 전송 실패');
    });

    it('작업 메시지 형식이 올바른지 확인해야 합니다', async () => {

      const testTask = {
        ...mockTasks[0],
        dueDate: new Date().toISOString().split('T')[0] // 오늘 날짜
      };

      await slackClient.sendTaskReminder([testTask]);

      const callArgs = (mockedAxios.post as any).mock.calls[0];
      const message = callArgs[1];

      expect(message.blocks).toBeDefined();
      expect(message.blocks.length).toBeGreaterThan(0);

      // 헤더 블록 확인
      const headerBlock = message.blocks.find((block: any) => block.type === 'header');
      expect(headerBlock).toBeDefined();

      // 작업 섹션 블록 확인
      const taskSection = message.blocks.find((block: any) => 
        block.type === 'section' && block.text?.text?.includes(testTask.title)
      );
      expect(taskSection).toBeDefined();
    });
  });

  describe('sendErrorNotification', () => {
    it('오류 알림을 성공적으로 전송해야 합니다', async () => {
      const error = new Error('테스트 오류');
      await slackClient.sendErrorNotification(error);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        webhookUrl,
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

    it('Slack 오류 알림 전송 실패를 처리해야 합니다', async () => {
      const error = new Error('테스트 오류');

      // 오류가 던져지지 않아야 함 (내부에서 catch됨)
      await expect(slackClient.sendErrorNotification(error)).resolves.not.toThrow();
    });
  });
});
