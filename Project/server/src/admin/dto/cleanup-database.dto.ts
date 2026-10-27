import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

/** 소프트 삭제 데이터를 영구 삭제하기 전 최소 보존 기간(일) */
export const MIN_RETENTION_DAYS = 30;
export const DEFAULT_RETENTION_DAYS = 90;

export class CleanupDatabaseDto {
  @ApiProperty({
    example: true,
    description:
      '미리보기 모드. 기본값 true — 실제로 지우려면 명시적으로 false를 보내야 합니다. ' +
      'true면 아무것도 삭제하지 않고 삭제 대상 건수만 돌려줍니다.',
    required: false,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  dryRun?: boolean;

  @ApiProperty({
    example: false,
    description:
      '소프트 삭제된 대여/플로터/물품을 영구 삭제합니다. ' +
      `삭제된 지 olderThanDays(기본 ${DEFAULT_RETENTION_DAYS}일)가 지난 것만 대상이며, ` +
      '다른 기록이 참조 중인 물품은 건너뜁니다.',
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  purgeSoftDeleted?: boolean;

  @ApiProperty({
    example: DEFAULT_RETENTION_DAYS,
    description: `보존 기간(일). 최소 ${MIN_RETENTION_DAYS}일. 이 기간이 지난 소프트 삭제 데이터만 영구 삭제합니다.`,
    required: false,
    default: DEFAULT_RETENTION_DAYS,
  })
  @Type(() => Number)
  @IsInt()
  @Min(MIN_RETENTION_DAYS)
  @IsOptional()
  olderThanDays?: number;

  @ApiProperty({
    example: false,
    description:
      '테스트 계정(testuser_*, lock_*, e2eusertest)과 관련 기록을 영구 삭제합니다.',
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  deleteTestUsers?: boolean;

  @ApiProperty({
    example: false,
    description: '모든 물품의 누적 대여 횟수를 0으로 초기화합니다.',
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  resetRentalCounts?: boolean;
}
