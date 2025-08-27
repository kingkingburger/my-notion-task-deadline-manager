import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotionClient } from '../src/notion.ts';
import { mockNotionResponse } from './mocks/notion.mock';

// Notion 클라이언트 모킹
const mockQuery = vi.fn();
vi.mock('@notionhq/client', () => ({
  Client: vi.fn().mockImplementation(() => ({
    databases: {
      query: mockQuery
    }
  }))
}));

describe('NotionClient', () => {
  let notionClient: NotionClient;

  beforeEach(() => {
    vi.clearAllMocks();
    notionClient = new NotionClient('test-api-key', 'test-database-id');
  });

  describe('getTasks', () => {
    it('진행중이거나 대기중인 작업만 가져와야 합니다', async () => {
      mockQuery.mockResolvedValue(mockNotionResponse);

      const tasks = await notionClient.getTasks();

      expect(mockQuery).toHaveBeenCalledWith({
        database_id: 'test-database-id',
        filter: {
          or: [
            {
              property: '상태',
              status: {
                equals: '진행중'
              }
            },
            {
              property: '상태',
              status: {
                equals: '대기'
              }
            }
          ]
        },
        sorts: [
          {
            property: '목표일',
            direction: 'ascending'
          }
        ]
      });

      expect(tasks).toHaveLength(1);
      expect(tasks[0]).toMatchObject({
        id: 'test-page-id-1',
        title: '테스트 작업 1',
        dueDate: '2023-12-05',
        status: '진행중',
        priority: '높음'
      });
    });

    it('Notion API 오류를 적절히 처리해야 합니다', async () => {
      const error = new Error('Notion API 오류');
      mockQuery.mockRejectedValue(error);

      await expect(notionClient.getTasks()).rejects.toThrow('Notion API 오류');
    });

    it('빈 결과를 올바르게 처리해야 합니다', async () => {
      mockQuery.mockResolvedValue({ results: [] });

      const tasks = await notionClient.getTasks();

      expect(tasks).toEqual([]);
    });

    it('잘못된 페이지 객체를 필터링해야 합니다', async () => {
      mockQuery.mockResolvedValue({
        results: [
          { object: 'partial_page' }, // 부분적인 페이지는 제외
          mockNotionResponse.results[0]
        ]
      });

      const tasks = await notionClient.getTasks();

      expect(tasks).toHaveLength(1);
    });
  });
});
