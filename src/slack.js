const axios = require('axios');

class SlackClient {
  constructor(webhookUrl) {
    this.webhookUrl = webhookUrl;
  }

  /**
   * Slack에 작업 알림 메시지를 보냅니다
   */
  async sendTaskReminder(tasks) {
    if (!tasks || tasks.length === 0) {
      console.log('알림을 보낼 작업이 없습니다.');
      return;
    }

    const message = this.formatTaskMessage(tasks);

    try {
      await axios.post(this.webhookUrl, message);
      console.log(`Slack에 ${tasks.length}개 작업 알림을 성공적으로 전송했습니다.`);
    } catch (error) {
      console.error('Slack 메시지 전송 중 오류 발생:', error);
      throw error;
    }
  }

  /**
   * 작업 목록을 Slack 메시지 형식으로 변환합니다
   */
  formatTaskMessage(tasks) {
    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '📋 마감일 임박 작업 알림',
          emoji: true
        }
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `총 ${tasks.length}개의 작업이 3일 이내에 마감됩니다.`
          }
        ]
      },
      {
        type: 'divider'
      }
    ];

    // 각 작업을 블록으로 추가
    tasks.forEach((task, index) => {
      const daysLeft = this.calculateDaysLeft(task.dueDate);
      const urgencyEmoji = this.getUrgencyEmoji(daysLeft);
      const priorityEmoji = this.getPriorityEmoji(task.priority);

      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `${urgencyEmoji} *${task.title}*\n${priorityEmoji} 우선순위: ${task.priority || '없음'}\n📅 마감일: ${this.formatDate(task.dueDate)} (${daysLeft}일 남음)\n👤 담당자: ${task.assignee?.join(', ') || '없음'}`
        },
        accessory: {
          type: 'button',
          text: {
            type: 'plain_text',
            text: '작업 보기',
            emoji: true
          },
          url: task.url,
          action_id: `view_task_${task.id}`
        }
      });

      // 마지막 작업이 아니면 구분선 추가
      if (index < tasks.length - 1) {
        blocks.push({
          type: 'divider'
        });
      }
    });

    // 푸터 추가
    blocks.push(
      {
        type: 'divider'
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `💡 이 알림은 2시간마다 자동으로 전송됩니다. | 마지막 업데이트: ${new Date().toLocaleString('ko-KR')}`
          }
        ]
      }
    );

    return {
      blocks: blocks
    };
  }

  /**
   * 마감일까지 남은 일수를 계산합니다
   */
  calculateDaysLeft(dueDate) {
    const today = new Date();
    const due = new Date(dueDate);
    const timeDiff = due.getTime() - today.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
  }

  /**
   * 긴급도에 따른 이모지를 반환합니다
   */
  getUrgencyEmoji(daysLeft) {
    if (daysLeft <= 0) return '🚨'; // 마감일 지남
    if (daysLeft === 1) return '⚡'; // 1일 남음
    if (daysLeft === 2) return '⚠️'; // 2일 남음
    return '📌'; // 3일 남음
  }

  /**
   * 우선순위에 따른 이모지를 반환합니다
   */
  getPriorityEmoji(priority) {
    switch (priority?.toLowerCase()) {
      case 'high':
      case '높음':
        return '🔴';
      case 'medium':
      case '보통':
        return '🟡';
      case 'low':
      case '낮음':
        return '🟢';
      default:
        return '⚪';
    }
  }

  /**
   * 날짜를 한국어 형식으로 포맷합니다
   */
  formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'short'
    });
  }
}

module.exports = SlackClient;
