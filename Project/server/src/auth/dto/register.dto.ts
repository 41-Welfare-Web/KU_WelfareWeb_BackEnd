import { IsString, IsNotEmpty, Matches, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'testuser', description: '로그인 아이디 (5~20자 영문/숫자)' })
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  @MaxLength(20)
  @Matches(/^[a-z0-9]+$/, {
    message: '아이디는 5~20자의 영문 소문자와 숫자만 사용 가능합니다.',
  })
  username: string;

  @ApiProperty({ example: 'password123!', description: '비밀번호 (최소 8자, 영문/숫자/특수문자)' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: '비밀번호는 최소 8자 이상이어야 합니다.' })
  password: string;

  @ApiProperty({ example: '김테스트', description: '사용자 실명' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: '202412345', description: '학번' })
  @IsString()
  @IsNotEmpty()
  studentId: string;

  @ApiProperty({ example: '010-1234-5678', description: '전화번호' })
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @ApiProperty({ example: '컴퓨터공학과', description: '소속 학과/단위' })
  @IsString()
  @IsNotEmpty()
  department: string;
}
