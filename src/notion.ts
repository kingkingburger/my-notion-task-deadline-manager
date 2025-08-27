import {Client} from '@notionhq/client';
import type {PageObjectResponse} from '@notionhq/client/build/src/api-endpoints';
import type {NotionPropertyValue, PropertyType, Task} from './types/index.js';

export class NotionClient {
  private notion: Client;
  private databaseId: string;

  constructor(apiKey: string, databaseId: string) {
    this.notion = new Client({
      auth: apiKey,
    });
    this.databaseId = databaseId;
  }

  /**
   * Notion 데이터베이스에서 진행중이거나 대기중인 작업만 가져옵니다
   */
  async getTasks(): Promise<Task[]> {
    try {
      const response = await this.notion.databases.query({
        database_id: this.databaseId,
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

      return response.results
        .filter((page): page is PageObjectResponse => 
          'properties' in page && page.object === 'page'
        )
        .map(page => this.formatTask(page));
    } catch (error) {
      console.error('Notion에서 작업을 가져오는 중 오류 발생:', error);
      throw error;
    }
  }

  /**
   * Notion 페이지 객체를 작업 객체로 변환합니다
   */
  private formatTask(page: PageObjectResponse): Task {
    const properties = page.properties;

    return {
      id: page.id,
      title: this.getPropertyValue(properties['작업'], 'title'), // '작업' 속성이 제목
      dueDate: this.getPropertyValue(properties['목표일'], 'date'), // '목표일' 속성
      status: this.getPropertyValue(properties['상태'], 'status'), // '상태' 속성 (status 타입)
      priority: this.getPropertyValue(properties['우선순위'], 'select'), // '우선순위' 속성
      assignee: null, // 담당자 속성이 없으므로 null
      url: page.url
    };
  }

  /**
   * Notion 속성 값을 추출합니다
   */
  private getPropertyValue(property: NotionPropertyValue | undefined, type: PropertyType): any {
    if (!property) return null;

    switch (type) {
      case 'title':
        return property.type === 'title' ? property.title?.[0]?.plain_text || null : null;
      case 'rich_text':
        return property.type === 'rich_text' ? property.rich_text?.[0]?.plain_text || null : null;
      case 'date':
        return property.type === 'date' ? property.date?.start || null : null;
      case 'select':
        return property.type === 'select' ? property.select?.name || null : null;
      case 'status':
        return property.type === 'status' ? property.status?.name || null : null;
      case 'multi_select':
        return property.type === 'multi_select' ? property.multi_select?.map(item => item.name) || [] : [];
      case 'people':
        return property.type === 'people' ? property.people?.map(person => person.id) || [] : [];
      case 'number':
        return property.type === 'number' ? property.number || null : null;
      case 'checkbox':
        return property.type === 'checkbox' ? property.checkbox || false : false;
      default:
        return null;
    }
  }
}
