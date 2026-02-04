import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateHolidayDto {
  @IsDateString()
  @IsNotEmpty()
  holidayDate: string;

  @IsString()
  @IsOptional()
  description?: string;
}
