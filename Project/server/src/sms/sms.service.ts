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
    const message = `[RentalWeb] 인증번호는 [${code}] 입니다. 3분 내에 입력해주세요.`;
    return this.sendSMS(receiver, message);
  }
}
