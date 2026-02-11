import { IsString, IsNotEmpty, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SignupVerificationRequestDto {
  @ApiProperty({ example: '01012345678', description: '전화번호 (하이픈 없이)' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^010\d{8}$/, { message: '유효한 휴대전화 번호 형식이 아닙니다. (예: 01012345678)' })
  phoneNumber: string;
}
