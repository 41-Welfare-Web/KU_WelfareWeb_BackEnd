import { IsOptional, IsString, Matches, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiProperty({ example: 'password123!', description: '현재 비밀번호 (비밀번호 변경 시 필수)', required: false })
  @IsOptional()
  @IsString()
  currentPassword?: string;

  @ApiProperty({ example: 'newPassword456!', description: '새 비밀번호', required: false })
  @IsOptional()
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/)
  newPassword?: string;

  @ApiProperty({ example: '010-8765-4321', description: '변경할 전화번호', required: false })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiProperty({ example: '총학생회', description: '변경할 소속 단위', required: false })
  @IsOptional()
  @IsString()
  department?: string;
}
