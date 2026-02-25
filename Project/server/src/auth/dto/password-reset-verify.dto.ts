import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PasswordResetVerifyDto {
  @ApiProperty({ example: 'testuser', description: '아이디' })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({ example: '123456', description: 'SMS로 수신한 인증 코드' })
  @IsString()
  @IsNotEmpty()
  verificationCode: string;
}
