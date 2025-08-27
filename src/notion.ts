import { Client } from '@notionhq/client';
import type { 
  PageObjectResponse,
  PartialPageObjectResponse 
} from '@notionhq/client/build/src/api-endpoints';
import type { Task, NotionPageResponse, NotionPropertyValue, PropertyType } from './types/index.js';

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
   * 가능한 속성명들 중에서 실제 존재하는 속성을 찾습니다
   */
  private findProperty(properties: PageObjectResponse['properties'], possibleNames: string[]) {
    for (const name of possibleNames) {
      if (properties[name]) {
        return properties[name];
      }
    }
    return undefined;
  }

  /**
   * 데이터베이스의 스키마를 분석하여 실제 속성명들을 가져옵니다
   */
  async getDatabaseSchema() {
    try {
      const database = await this.notion.databases.retrieve({
        database_id: this.databaseId
      });

      const schema = Object.entries(database.properties).map(([name, property]) => ({
        name,
        type: property.type
      }));

      console.log('데이터베이스 스키마:', schema);
      return schema;
    } catch (error) {
      console.error('데이터베이스 스키마 조회 오류:', error);
      throw error;
    }
  }

  /**
   * Notion 데이터베이스에서 진행중이거나 대기중인 작업만 가져옵니다
   */
  async getTasks(): Promise<Task[]> {
    try {
      // 먼저 데이터베이스 스키마 확인
      const database = await this.notion.databases.retrieve({
        database_id: this.databaseId
      });

      console.log('데이터베이스 속성들:', Object.keys(database.properties));

      const response = await this.notion.databases.query({
        database_id: this.databaseId,
        filter: {
          and: [
            {
              or: [
                {
                  property: '상태',
                  select: {
                    equals: '진행중'
                  }
                },
                {
                  property: '상태',
                  select: {
                    equals: '대기'
                  }
                }
              ]
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

      console.log('쿼리 결과 개수:', response.results.length);

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

    // 디버깅을 위해 속성들 출력
    console.log('페이지 속성들:', Object.keys(properties));

    return {
      id: page.id,
      title: this.getPropertyValue(
        properties.Name || 
        properties.Title || 
        properties['제목'] || 
        properties['이름'], 
        'title'
      ),
      dueDate: this.getPropertyValue(
        properties['Due Date'] || 
        properties['마감일'] || 
        properties['목표일'] || 
        properties['완료일'], 
        'date'
      ),
      status: this.getPropertyValue(
        properties.Status || 
        properties['상태'] || 
        properties['진행상태'], 
        'select'
      ),
      priority: this.getPropertyValue(
        properties.Priority || 
        properties['우선순위'] || 
        properties['중요도'], 
        'select'
      ),
      assignee: this.getPropertyValue(
        properties.Assignee || 
        properties['담당자'] || 
        properties['배정자'], 
        'people'
      ),
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
