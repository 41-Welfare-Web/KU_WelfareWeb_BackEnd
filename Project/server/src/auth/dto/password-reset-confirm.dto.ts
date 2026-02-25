import { IsNotEmpty, IsString, MinLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PasswordResetConfirmDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...', description: 'verify 단계에서 발급받은 resetToken' })
  @IsString()
  @IsNotEmpty()
  resetToken: string;

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
