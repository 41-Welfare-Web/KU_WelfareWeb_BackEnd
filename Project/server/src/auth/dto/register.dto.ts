import { IsString, IsNotEmpty, Matches, MinLength, MaxLength } from 'class-validator';

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  @MaxLength(20)
  @Matches(/^[a-z0-9]+$/, {
    message: '아이디는 5~20자의 영문 소문자와 숫자만 사용 가능합니다.',
  })
  username: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: '비밀번호는 최소 8자 이상이어야 합니다.' })
  // 실제 서비스에선 복잡성 체크 로직(특수문자 포함 등)을 더 추가할 수 있습니다.
  password: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  studentId: string;

  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @IsString()
  @IsNotEmpty()
  department: string;
}
