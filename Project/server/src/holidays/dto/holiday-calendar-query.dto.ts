import { IsInt, Min, Max, IsDefined } from 'class-validator';
import { Type } from 'class-transformer';

export class HolidayCalendarQueryDto {
  @IsDefined({ message: 'year 파라미터는 필수입니다.' })
  @Type(() => Number)
  @IsInt()
  @Min(2020)
  @Max(2099)
  year: number;

  @IsDefined({ message: 'month 파라미터는 필수입니다.' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month: number;
}
