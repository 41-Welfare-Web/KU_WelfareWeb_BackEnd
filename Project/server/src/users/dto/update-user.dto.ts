import { IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class UpdateUserDto {
  @IsString()
  @IsOptional()
  current_password?: string;

  @IsString()
  @IsOptional()
  @MinLength(8)
  new_password?: string;

  @IsString()
  @IsOptional()
  @Matches(/^010-\d{4}-\d{4}$/)
  phone_number?: string;

  @IsString()
  @IsOptional()
  department?: string;
}
