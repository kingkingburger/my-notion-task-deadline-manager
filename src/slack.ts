import axios from 'axios';
import type { Task, SlackMessage, SlackBlock } from './types/index.js';

export class SlackClient {
  private webhookUrl: string;

  constructor(webhookUrl: string) {
    this.webhookUrl = webhookUrl;
  }

  /**
   * Slack에 작업 알림 메시지를 보냅니다
   */
  async sendTaskReminder(tasks: Task[]): Promise<void> {
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
   * 오류 알림을 Slack으로 전송
   */
  async sendErrorNotification(error: Error): Promise<void> {
    const errorMessage: SlackMessage = {
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '❌ 작업 알림 시스템 오류',
            emoji: true
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `작업 알림 처리 중 오류가 발생했습니다:\n\`\`\`${error.message}\`\`\``
          }
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `🕒 ${new Date().toLocaleString('ko-KR')}`
            }
          ]
        }
      ]
    };

    try {
      await axios.post(this.webhookUrl, errorMessage);
    } catch (slackError) {
      console.error('Slack 오류 알림 전송 실패:', slackError);
    }
  }

  /**
   * 작업 목록을 Slack 블록 형식으로 변환합니다 (개선된 버전)
   */
  private formatTaskMessage(tasks: Task[]): SlackMessage {
    const blocks: SlackBlock[] = [
      // 헤더
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '📋 마감일 임박 작업 알림',
          emoji: true
        }
      },
      // 요약 정보
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `총 *${tasks.length}개*의 작업이 3일 이내에 마감됩니다.`
        }
      },
      {
        type: 'divider'
      }
    ];

    // 각 작업을 하나의 섹션으로 추가
    tasks.forEach((task, index) => {
      if (!task.dueDate) return;

      const daysLeft = this.calculateDaysLeft(task.dueDate);
      const urgencyEmoji = this.getUrgencyEmoji(daysLeft);
      const priorityEmoji = this.getPriorityEmoji(task.priority);
      const statusEmoji = this.getStatusEmoji(task.status);

      // 작업 정보를 한 섹션에 정리
      let taskInfo = `${urgencyEmoji} *${task.title}*\n`;
      taskInfo += `${priorityEmoji} 우선순위: ${task.priority || '없음'}  |  `;
      taskInfo += `${statusEmoji} 상태: ${task.status || '없음'}\n`;
      taskInfo += `📅 *${this.formatDate(task.dueDate)}* ${this.formatDaysLeft(daysLeft)}`;

      if (task.assignee && task.assignee.length > 0) {
        taskInfo += `\n👤 ${task.assignee.join(', ')}`;
      }

      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: taskInfo
        },
        accessory: {
          type: 'button',
          text: {
            type: 'plain_text',
            text: '보기',
            emoji: true
          },
          url: task.url,
          action_id: `view_task_${task.id}`
        }
      });
    });

    // 푸터
    blocks.push(
      {
        type: 'divider'
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `💡 2시간마다 자동 전송  |  🕒 ${new Date().toLocaleString('ko-KR')}`
          }
        ]
      }
    );

    return { blocks };
  }

  /**
   * 마감일까지 남은 일수를 계산합니다
   */
  private calculateDaysLeft(dueDate: string): number {
    const today = new Date();
    const due = new Date(dueDate);
    const timeDiff = due.getTime() - today.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
  }

  /**
   * 긴급도에 따른 이모지를 반환합니다
   */
  private getUrgencyEmoji(daysLeft: number): string {
    if (daysLeft <= 0) return '🚨'; // 마감일 지남
    if (daysLeft === 1) return '⚡'; // 1일 남음
    if (daysLeft === 2) return '⚠️'; // 2일 남음
    return '📌'; // 3일 남음
  }

  /**
   * 우선순위에 따른 이모지를 반환합니다
   */
  private getPriorityEmoji(priority: string | null): string {
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
   * 상태에 따른 이모지를 반환합니다
   */
  private getStatusEmoji(status: string | null): string {
    switch (status?.toLowerCase()) {
      case 'in progress':
      case '진행중':
        return '🚀';
      case 'not started':
      case '대기':
      case '시작 전':
        return '⏳';
      case 'to do':
      case '할 일':
        return '📝';
      case 'pending':
      case '보류':
        return '⏸️';
      default:
        return '📋';
    }
  }

  /**
   * 날짜를 한국어 형식으로 포맷합니다
   */
  private formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'short'
    });
  }

  /**
   * 남은 일수를 적절한 텍스트로 포맷합니다
   */
  private formatDaysLeft(daysLeft: number): string {
    if (daysLeft < 0) {
      const daysPassed = Math.abs(daysLeft);
      if (daysPassed === 1) {
        return '(1일 지남)';
      } else {
        return `(${daysPassed}일 지남)`;
      }
    } else if (daysLeft === 0) {
      return '(오늘 마감)';
    } else if (daysLeft === 1) {
      return '(1일 남음)';
    } else {
      return `(${daysLeft}일 남음)`;
    }
  }
}
