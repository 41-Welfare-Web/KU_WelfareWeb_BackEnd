import { IsString, IsNotEmpty, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SignupVerificationCheckDto {
  @ApiProperty({ example: '01012345678', description: '전화번호' })
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @ApiProperty({ example: '123456', description: '사용자가 입력한 인증번호' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{6}$/, { message: '인증번호는 6자리 숫자여야 합니다.' })
  verificationCode: string;
}
