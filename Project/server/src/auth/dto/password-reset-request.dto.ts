import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PasswordResetRequestDto {
  @ApiProperty({ example: 'testuser', description: '아이디' })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({
    example: '010-1234-5678',
    description: '가입 시 인증한 전화번호',
  })
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;
}
