export interface Task {
  id: string;
  title: string | null;
  dueDate: string | null;
  status: string | null;
  priority: string | null;
  assignee: string[] | null;
  url: string;
}

// Notion API 공식 타입을 재사용
import type { 
  PageObjectResponse,
  PartialPageObjectResponse 
} from '@notionhq/client/build/src/api-endpoints';

// 페이지 타입 별칭
export type NotionPageResponse = PageObjectResponse;

// 속성 타입 별칭 
export type NotionPropertyValue = PageObjectResponse['properties'][string];

export interface SlackBlock {
  type: string;
  text?: {
    type: string;
    text: string;
    emoji?: boolean;
  };
  elements?: any[];
  accessory?: any;
}

export interface SlackMessage {
  blocks: SlackBlock[];
}

export interface EnvironmentConfig {
  NOTION_API_KEY: string;
  NOTION_DATABASE_ID: string;
  SLACK_WEBHOOK_URL: string;
  REMINDER_DAYS?: string;
  CRON_SCHEDULE?: string;
  NODE_ENV?: string;
}

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export type PropertyType = 
  | 'title' 
  | 'rich_text' 
  | 'date' 
  | 'select' 
  | 'multi_select' 
  | 'people' 
  | 'number' 
  | 'checkbox';

export interface TaskFilterOptions {
  days: number;
  includeOverdue?: boolean;
  statusFilter?: string[];
  excludeCompleted?: boolean;
}

export const TASK_STATUSES = {
  ACTIVE: ['In Progress', '진행중', 'Not Started', '대기', '시작 전', 'To Do', '할 일', 'Pending', '보류'],
  COMPLETED: ['Done', '완료', '완성', 'Completed', '끝', 'Finished', '종료', 'Closed', '닫힘']
} as const;
