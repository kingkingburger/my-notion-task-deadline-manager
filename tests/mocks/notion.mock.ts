import type { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints';
import type { Task } from '../../src/types/index.js';

export const mockNotionPage: PageObjectResponse = {
  object: 'page',
  id: 'test-page-id-1',
  created_time: '2023-12-01T00:00:00.000Z',
  last_edited_time: '2023-12-01T00:00:00.000Z',
  created_by: { object: 'user', id: 'user-1' },
  last_edited_by: { object: 'user', id: 'user-1' },
  cover: null,
  icon: null,
  parent: { type: 'database_id', database_id: 'test-database-id' },
  archived: false,
  properties: {
    '작업': {
      id: 'title',
      type: 'title',
      title: [
        {
          type: 'text',
          text: { content: '테스트 작업 1', link: null },
          annotations: {
            bold: false,
            italic: false,
            strikethrough: false,
            underline: false,
            code: false,
            color: 'default'
          },
          plain_text: '테스트 작업 1',
          href: null
        }
      ]
    },
    '목표일': {
      id: 'date',
      type: 'date',
      date: {
        start: '2023-12-05',
        end: null,
        time_zone: null
      }
    },
    '상태': {
      id: 'status',
      type: 'status',
      status: {
        id: 'status-1',
        name: '진행중',
        color: 'blue'
      }
    },
    '우선순위': {
      id: 'select',
      type: 'select',
      select: {
        id: 'priority-1',
        name: '높음',
        color: 'red'
      }
    }
  },
  url: 'https://notion.so/test-page-1',
  in_trash: false,
  public_url: null,
};

export const mockTasks: Task[] = [
  {
    id: 'test-task-1',
    title: '긴급 작업',
    dueDate: '2023-12-05',
    status: '진행중',
    priority: '높음',
    assignee: null,
    url: 'https://notion.so/test-task-1'
  },
  {
    id: 'test-task-2',
    title: '일반 작업',
    dueDate: '2023-12-07',
    status: '대기',
    priority: '보통',
    assignee: null,
    url: 'https://notion.so/test-task-2'
  },
  {
    id: 'test-task-3',
    title: '완료된 작업',
    dueDate: '2023-12-03',
    status: '완료',
    priority: '낮음',
    assignee: null,
    url: 'https://notion.so/test-task-3'
  }
];

export const mockNotionResponse = {
  results: [mockNotionPage],
  next_cursor: null,
  has_more: false,
  type: 'page_or_database',
  page_or_database: {}
};
