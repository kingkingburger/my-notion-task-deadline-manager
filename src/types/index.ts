export interface Task {
  id: string;
  title: string | null;
  dueDate: string | null;
  status: string | null;
  priority: string | null;
  assignee: string[] | null;
  url: string;
}

export interface NotionProperty {
  title?: { plain_text: string }[];
  rich_text?: { plain_text: string }[];
  date?: { start: string };
  select?: { name: string };
  multi_select?: { name: string }[];
  people?: { name?: string; id: string }[];
  number?: number;
  checkbox?: boolean;
}

export interface NotionPage {
  id: string;
  url: string;
  properties: Record<string, NotionProperty>;
}

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
}
