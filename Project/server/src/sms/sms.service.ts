import { Injectable, InternalServerErrorException } from '@nestjs/common';
import coolsms from 'coolsms-node-sdk';
import { ConfigurationsService } from '../configurations/configurations.service';

@Injectable()
export class SmsService {
  private messageService: any;
  private senderNumber: string;
  private isMock: boolean;

  constructor(private configService: ConfigurationsService) {
    const apiKey = process.env.SOLAPI_API_KEY;
    const apiSecret = process.env.SOLAPI_API_SECRET;
    this.senderNumber = process.env.SOLAPI_SENDER_NUMBER || '';

    // 키가 하나라도 없으면 Mock 모드로 동작
    if (!apiKey || !apiSecret || !this.senderNumber) {
      this.isMock = true;
      console.warn(
        '[SmsService] Solapi credentials missing. Running in MOCK mode (Console Output).',
      );
    } else {
      this.isMock = false;
      // SDK 초기화
      this.messageService = new coolsms(apiKey, apiSecret);
    }
  }

  /**
   * SMS 발송 (단문)
   * @param receiver 수신자 전화번호 (하이픈 없이 숫자만)
   * @param message 내용
   * @param ignoreConfig 설정값(sms_notifications_enabled) 무시 여부 (인증번호 등 필수 발송용)
   */
  async sendSMS(receiver: string, message: string, ignoreConfig = false): Promise<boolean> {
    // 1. 설정 확인 (필수 발송이 아닌 경우에만)
    if (!ignoreConfig) {
      const smsEnabled = await this.configService.getValue('sms_notifications_enabled', 'true');
      if (smsEnabled !== 'true') {
        console.log(`[SmsService] SMS Notifications are DISABLED. Skipping message to ${receiver}`);
        return true;
      }
    }

    if (this.isMock) {
      console.log(`
[MOCK SMS (Solapi)] To: ${receiver} | Msg: ${message}
`);
      return true;
    }

    try {
      const result = await this.messageService.sendOne({
        to: receiver,
        from: this.senderNumber,
        text: message,
        autoTypeDetect: true, // SMS/LMS 자동 구분
      });

      // Solapi SDK는 성공 시 그룹 ID 등이 담긴 객체 리턴, 실패 시 throw Error
      console.log(`[SmsService] Send Success: ${JSON.stringify(result)}`);
      return true;
    } catch (error) {
      console.error('[SmsService] Solapi Send Failed:', error);
      throw new InternalServerErrorException(
        `문자 발송 실패: ${error.message || 'Unknown Error'}`,
      );
    }
  }

  /**
   * 인증번호 발송 편의 메소드 (인증번호는 항상 발송되어야 하므로 ignoreConfig=true)
   */
  async sendVerificationCode(receiver: string, code: string): Promise<boolean> {
    const message = `[RentalWeb] 인증번호는 [${code}] 입니다. 5분 내에 입력해주세요.`;
    return this.sendSMS(receiver, message, true);
  }

  /**
   * 대여 상태 변경 알림 (비활성화)
   */
  async sendRentalStatusNotice(
    receiver: string,
    name: string,
    itemSummary: string,
    status: string,
    memo?: string,
  ): Promise<boolean> {
    console.log(`[SmsService] Rental status notice DISABLED. Skipping message to ${receiver} for status ${status}`);
    return true;
  }

  /**
   * 반납 예정일 안내 (비활성화)
   */
  async sendReturnReminder(
    receiver: string,
    name: string,
    itemSummary: string,
    dueDate: string,
  ): Promise<boolean> {
    console.log(`[SmsService] Return reminder DISABLED. Skipping message to ${receiver}`);
    return true;
  }

  /**
   * 플로터 주문 상태 알림 (CONFIRMED, REJECTED만 발송)
   */
  async sendPlotterStatusNotice(
    receiver: string,
    name: string,
    status: string,
    rejectionReason?: string,
  ): Promise<boolean> {
    // 요청하신 대로 CONFIRMED와 REJECTED 상태만 발송 허용
    if (status !== 'CONFIRMED' && status !== 'REJECTED') {
      console.log(`[SmsService] Plotter status notice for ${status} is DISABLED. Skipping message to ${receiver}`);
      return true;
    }

    let statusText = status;
    if (status === 'CONFIRMED') statusText = '주문 확정(입금 확인)';
    if (status === 'REJECTED') statusText = '주문 반려';

    let message = `[RentalWeb] ${name}님, 플로터 주문 상태가 [${statusText}]로 변경되었습니다.`;

    if (status === 'REJECTED') {
      message = `[RentalWeb] ${name}님, 플로터 주문이 반려되었습니다.\n사유: ${rejectionReason || '규정 미준수 등'}`;
    }

    // 플로터 알림은 중요하므로 ignoreConfig=true를 사용하여 설정값에 상관없이 발송 (또는 필요시 false 유지)
    return this.sendSMS(receiver, message, true);
  }

  /**
   * 서비스 상태 확인 (Health Check용)
   */
  async checkStatus() {
    return {
      status: this.isMock ? 'MOCK' : 'LIVE',
      senderNumber: this.senderNumber,
    };
  }
}
