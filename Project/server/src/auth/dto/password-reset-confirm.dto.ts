import { IsNotEmpty, IsString, MinLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PasswordResetConfirmDto {
  @ApiProperty({ example: 'testuser', description: '아이디' })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({ example: '123456', description: 'SMS로 수신한 인증 코드' })
  @IsString()
  @IsNotEmpty()
  verificationCode: string;

  @ApiProperty({ example: 'newPassword123!', description: '새 비밀번호' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @Matches(/^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/, {
    message:
      '비밀번호는 최소 8자 이상, 영문, 숫자, 특수문자를 포함해야 합니다.',
  })
  newPassword: string;
}
