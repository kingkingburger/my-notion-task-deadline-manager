import * as cron from 'node-cron';
import { NotionClient } from './notion.js';
import { SlackClient } from './slack.js';
import { 
  filterTasksByDueDate, 
  sortTasksByPriorityAndDueDate, 
  filterTasksByStatus,
  excludeCompletedTasks,
  validateEnvironmentVariables,
  log,
  getEnvNumber,
  getEnvString
} from './utils.js';

export class TaskReminderApp {
  private notionClient: NotionClient;
  private slackClient: SlackClient;
  private reminderDays: number;
  private cronSchedule: string;

  constructor() {
    try {
      // 환경변수 검증
      validateEnvironmentVariables();

      // 클라이언트 초기화
      this.notionClient = new NotionClient(
        process.env.NOTION_API_KEY!, 
        process.env.NOTION_DATABASE_ID!
      );
      this.slackClient = new SlackClient(process.env.SLACK_WEBHOOK_URL!);

      // 설정값
      this.reminderDays = getEnvNumber('REMINDER_DAYS', 3);
      this.cronSchedule = getEnvString('CRON_SCHEDULE', '0 */2 * * *'); // 2시간마다

      log('TaskReminderApp이 성공적으로 초기화되었습니다.');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log(`초기화 중 오류 발생: ${errorMessage}`, 'error');
      process.exit(1);
    }
  }

  /**
   * 작업 알림을 처리하는 메인 함수
   */
  async processTaskReminders(): Promise<void> {
    try {
      log('작업 알림 처리를 시작합니다...');

      // Notion에서 진행중/대기중 작업 가져오기
      const allTasks = await this.notionClient.getTasks();
      log(`총 ${allTasks.length}개의 진행중/대기중 작업을 가져왔습니다.`);

      // 완료된 작업 제외 (이중 확인)
      const activeTasks = excludeCompletedTasks(allTasks);
      log(`완료 상태 제외 후: ${activeTasks.length}개`);

      // 마감일이 임박한 작업들만 필터링
      const upcomingTasks = filterTasksByDueDate(activeTasks, this.reminderDays);
      log(`마감일이 ${this.reminderDays}일 이내인 작업: ${upcomingTasks.length}개`);

      if (upcomingTasks.length === 0) {
        log('알림을 보낼 작업이 없습니다.');
        return;
      }

      // 우선순위와 마감일로 정렬
      const sortedTasks = sortTasksByPriorityAndDueDate(upcomingTasks);

      // Slack으로 알림 전송
      await this.slackClient.sendTaskReminder(sortedTasks);

      log('작업 알림 처리를 완료했습니다.');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log(`작업 알림 처리 중 오류 발생: ${errorMessage}`, 'error');

      // 오류 발생 시 Slack으로 오류 메시지 전송
      try {
        if (error instanceof Error) {
          await this.slackClient.sendErrorNotification(error);
        }
      } catch (slackError) {
        const slackErrorMessage = slackError instanceof Error ? slackError.message : String(slackError);
        log(`Slack 오류 알림 전송 실패: ${slackErrorMessage}`, 'error');
      }
    }
  }

  /**
   * 스케줄러 시작
   */
  startScheduler(): void {
    log(`스케줄러를 시작합니다. (스케줄: ${this.cronSchedule})`);

    // 즉시 한 번 실행
    this.processTaskReminders();

    // cron 스케줄에 따라 주기적 실행
    cron.schedule(this.cronSchedule, () => {
      log('스케줄된 작업 알림 처리를 시작합니다.');
      this.processTaskReminders();
    });

    log('스케줄러가 성공적으로 시작되었습니다.');
  }

  /**
   * 애플리케이션 종료 처리
   */
  setupGracefulShutdown(): void {
    const shutdown = () => {
      log('애플리케이션을 종료합니다...');
      process.exit(0);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  }
}

// 애플리케이션 실행 - Bun과 Node.js 호환
async function main() {
  const app = new TaskReminderApp();
  app.setupGracefulShutdown();
  app.startScheduler();

  // 애플리케이션 계속 실행 유지
  log('작업 알림 서비스가 실행 중입니다... (종료하려면 Ctrl+C)');
}

// Bun에서 직접 실행되는 경우에만 main 함수 호출
if (import.meta.main || (process.argv[1] && process.argv[1].endsWith('app.ts'))) {
  main().catch((error) => {
    log(`애플리케이션 시작 중 오류 발생: ${error.message}`, 'error');
    process.exit(1);
  });
}
