import { IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateHolidayDto {
  @IsDateString()
  @IsNotEmpty()
  holiday_date: string; // YYYY-MM-DD

  @IsString()
  @IsOptional()
  description?: string;
}
