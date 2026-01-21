import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class FindUsernameDto {
  @ApiProperty({ example: '김테스트', description: '가입 시 입력한 이름' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: '010-1234-5678', description: '가입 시 인증한 전화번호' })
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;
}
