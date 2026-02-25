import { IsOptional, IsString, Matches, MinLength, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { DEPARTMENT_TYPES } from '../../auth/dto/register.dto';

export class UpdateUserDto {
  @ApiProperty({
    example: 'password123!',
    description: '현재 비밀번호 (비밀번호 변경 시 필수)',
    required: false,
  })
  @IsOptional()
  @IsString()
  currentPassword?: string;

  @ApiProperty({
    example: 'newPassword456!',
    description: '새 비밀번호',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/)
  newPassword?: string;

  @ApiProperty({
    example: '010-8765-4321',
    description: '변경할 전화번호',
    required: false,
  })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiProperty({
    example: '학과',
    description: '변경할 소속 유형',
    enum: DEPARTMENT_TYPES,
    required: false,
  })
  @IsOptional()
  @IsIn(DEPARTMENT_TYPES, { message: '유효하지 않은 소속 유형입니다.' })
  departmentType?: string;

  @ApiProperty({
    example: '컴퓨터공학과',
    description: '변경할 소속 단위명',
    required: false,
  })
  @IsOptional()
  @IsString()
  departmentName?: string;
}
