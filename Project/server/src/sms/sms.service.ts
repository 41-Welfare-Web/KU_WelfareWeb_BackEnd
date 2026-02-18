import { Injectable, InternalServerErrorException } from '@nestjs/common';
import coolsms from 'coolsms-node-sdk';

@Injectable()
export class SmsService {
  private messageService: any;
  private senderNumber: string;
  private isMock: boolean;

  constructor() {
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
   */
  async sendSMS(receiver: string, message: string): Promise<boolean> {
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
   * 인증번호 발송 편의 메소드
   */
  async sendVerificationCode(receiver: string, code: string): Promise<boolean> {
    const message = `[RentalWeb] 인증번호는 [${code}] 입니다. 5분 내에 입력해주세요.`;
    return this.sendSMS(receiver, message);
  }

  /**
   * 대여 상태 변경 알림
   */
  async sendRentalStatusNotice(
    receiver: string,
    name: string,
    itemSummary: string,
    status: string,
    memo?: string,
  ): Promise<boolean> {
    let statusText = status;
    if (status === 'RESERVED') statusText = '예약 완료';
    if (status === 'RENTED') statusText = '대여 중(수령 완료)';
    if (status === 'RETURNED') statusText = '반납 완료';
    if (status === 'CANCELED') statusText = '취소됨';

    let message = `[RentalWeb] ${name}님, 대여 신청하신 [${itemSummary}]의 상태가 [${statusText}]로 변경되었습니다.`;
    if (memo) {
      message += `\n사유/메모: ${memo}`;
    }
    
    return this.sendSMS(receiver, message);
  }

  /**
   * 반납 예정일 안내 (D-1)
   */
  async sendReturnReminder(
    receiver: string,
    name: string,
    itemSummary: string,
    dueDate: string,
  ): Promise<boolean> {
    const message = `[RentalWeb] ${name}님, 대여 중인 [${itemSummary}]의 반납 예정일은 내일(${dueDate})입니다. 늦지 않게 반납 부탁드립니다.`;
    return this.sendSMS(receiver, message);
  }

  /**
   * 플로터 주문 상태 알림 (반려, 완료 등)
   */
  async sendPlotterStatusNotice(
    receiver: string,
    name: string,
    status: string,
    rejectionReason?: string,
  ): Promise<boolean> {
    let statusText = status;
    if (status === 'PENDING') statusText = '주문 대기';
    if (status === 'APPROVED') statusText = '주문 확정';
    if (status === 'COMPLETED') statusText = '인쇄 완료';
    if (status === 'REJECTED') statusText = '주문 반려';
    if (status === 'PICKED_UP') statusText = '수령 완료';

    let message = `[RentalWeb] ${name}님, 플로터 주문 상태가 [${statusText}]로 변경되었습니다.`;

    if (status === 'REJECTED') {
      message = `[RentalWeb] ${name}님, 플로터 주문이 반려되었습니다.\n사유: ${rejectionReason || '규정 미준수 등'}`;
    } else if (status === 'COMPLETED') {
      message = `[RentalWeb] ${name}님, 플로터 인쇄가 완료되었습니다. 학생회실에서 수령해 주세요!`;
    }

    return this.sendSMS(receiver, message);
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
