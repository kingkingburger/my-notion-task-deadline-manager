const { Client } = require('@notionhq/client');

class NotionClient {
  constructor(apiKey, databaseId) {
    this.notion = new Client({
      auth: apiKey,
    });
    this.databaseId = databaseId;
  }

  /**
   * Notion 데이터베이스에서 모든 작업을 가져옵니다
   */
  async getTasks() {
    try {
      const response = await this.notion.databases.query({
        database_id: this.databaseId,
        filter: {
          and: [
            {
              property: 'Status',
              select: {
                does_not_equal: 'Done'
              }
            }
          ]
        },
        sorts: [
          {
            property: 'Due Date',
            direction: 'ascending'
          }
        ]
      });

      return response.results.map(page => this.formatTask(page));
    } catch (error) {
      console.error('Notion에서 작업을 가져오는 중 오류 발생:', error);
      throw error;
    }
  }

  /**
   * Notion 페이지 객체를 작업 객체로 변환합니다
   */
  formatTask(page) {
    const properties = page.properties;

    return {
      id: page.id,
      title: this.getPropertyValue(properties.Name || properties.Title, 'title'),
      dueDate: this.getPropertyValue(properties['Due Date'], 'date'),
      status: this.getPropertyValue(properties.Status, 'select'),
      priority: this.getPropertyValue(properties.Priority, 'select'),
      assignee: this.getPropertyValue(properties.Assignee, 'people'),
      url: page.url
    };
  }

  /**
   * Notion 속성 값을 추출합니다
   */
  getPropertyValue(property, type) {
    if (!property) return null;

    switch (type) {
      case 'title':
        return property.title?.[0]?.plain_text || null;
      case 'rich_text':
        return property.rich_text?.[0]?.plain_text || null;
      case 'date':
        return property.date?.start || null;
      case 'select':
        return property.select?.name || null;
      case 'multi_select':
        return property.multi_select?.map(item => item.name) || [];
      case 'people':
        return property.people?.map(person => person.name || person.id) || [];
      case 'number':
        return property.number || null;
      case 'checkbox':
        return property.checkbox || false;
      default:
        return null;
    }
  }
}

module.exports = NotionClient;
