import {
  IsString,
  IsNotEmpty,
  Matches,
  MinLength,
  MaxLength,
  IsIn,
  ValidateIf,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export const DEPARTMENT_TYPES = [
  '총학생회',
  '중앙자치기구',
  '단과대 학생회',
  '학과 학생회',
  '중앙동아리',
  '과동아리',
  '문과대학',
  '이과대학',
  '공과대학',
  '건축대학',
  '경영대학',
  '사회과학대학',
  '생명과학대학',
  '융합과학기술원',
  '부동산과학원',
  '사범대학',
  '수의과대학',
  '상허교양대학',
  '예술디자인대학',
  '기타',
] as const;

export class RegisterDto {
  @ApiProperty({
    example: 'testuser',
    description: '로그인 아이디 (5~20자 영문/숫자)',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  @MaxLength(20)
  @Matches(/^[a-z0-9]+$/, {
    message: '아이디는 5~20자의 영문 소문자와 숫자만 사용 가능합니다.',
  })
  username: string;

  @ApiProperty({
    example: 'password123!',
    description: '비밀번호 (최소 8자, 영문/숫자/특수문자)',
  })
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

  @ApiProperty({
    example: '학과',
    description: '소속 유형 (metadata API의 departments 분류명)',
    enum: DEPARTMENT_TYPES,
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(DEPARTMENT_TYPES, { message: '유효하지 않은 소속 유형입니다.' })
  departmentType: string;

  @ApiProperty({
    example: '컴퓨터공학과',
    description: '소속 단위명 (총학생회 제외 필수)',
    required: false,
  })
  @ValidateIf((o) => o.departmentType !== '총학생회')
  @IsString()
  @IsNotEmpty({ message: '소속 단위명을 입력해주세요.' })
  departmentName?: string;

  @ApiProperty({ example: '123456', description: 'SMS 인증번호' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{6}$/, { message: '인증번호는 6자리 숫자여야 합니다.' })
  verificationCode: string;
}
