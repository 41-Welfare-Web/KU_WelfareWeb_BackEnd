import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateHolidayDto } from './dto/create-holiday.dto';
import {
  CreateHolidayRangeDto,
  DeleteHolidayRangeDto,
  MAX_BULK_RANGE_DAYS,
} from './dto/bulk-holiday.dto';
import { parseDateOnlyKst } from '../common/utils/date.util';

@Injectable()
export class HolidaysService {
  constructor(private prisma: PrismaService) {}

  async create(createHolidayDto: CreateHolidayDto) {
    const { holidayDate, description } = createHolidayDto;
    const date = parseDateOnlyKst(holidayDate);

    const existing = await this.prisma.holiday.findUnique({
      where: { holidayDate: date },
    });
    if (existing) throw new ConflictException('이미 등록된 휴무일입니다.');

    return this.prisma.holiday.create({
      data: {
        holidayDate: date,
        description,
      },
    });
  }

  /** 시작일~종료일 범위를 날짜 배열로 (UTC 자정 기준, 양끝 포함) */
  private expandRange(startDate: string, endDate: string): Date[] {
    const start = parseDateOnlyKst(startDate);
    const end = parseDateOnlyKst(endDate);

    if (end < start) {
      throw new BadRequestException('종료일이 시작일보다 빠릅니다.');
    }
    const days = Math.round((+end - +start) / 86400000) + 1;
    if (days > MAX_BULK_RANGE_DAYS) {
      throw new BadRequestException(
        `한 번에 처리할 수 있는 기간은 최대 ${MAX_BULK_RANGE_DAYS}일입니다. (요청: ${days}일)`,
      );
    }

    const dates: Date[] = [];
    for (let t = +start; t <= +end; t += 86400000) {
      dates.push(new Date(t));
    }
    return dates;
  }

  /**
   * 기간 일괄 등록.
   *
   * 주말은 운영일 계산에서 이미 자동 제외되므로 기본적으로 등록하지 않습니다.
   * 이미 등록된 날짜는 기존 사유를 보존하기 위해 건드리지 않고 건너뜁니다.
   */
  async createRange(dto: CreateHolidayRangeDto) {
    const { description, includeWeekends } = dto;
    const all = this.expandRange(dto.startDate, dto.endDate);

    const targets = includeWeekends
      ? all
      : all.filter((d) => d.getUTCDay() !== 0 && d.getUTCDay() !== 6);
    const weekendsSkipped = all.length - targets.length;

    const existing = await this.prisma.holiday.findMany({
      where: { holidayDate: { in: targets } },
      select: { holidayDate: true },
    });
    const have = new Set(
      existing.map((e) => e.holidayDate.toISOString().split('T')[0]),
    );
    const toCreate = targets.filter(
      (d) => !have.has(d.toISOString().split('T')[0]),
    );

    if (toCreate.length > 0) {
      await this.prisma.holiday.createMany({
        data: toCreate.map((holidayDate) => ({ holidayDate, description })),
        skipDuplicates: true,
      });
    }

    return {
      message: `휴무일 ${toCreate.length}일을 등록했습니다.`,
      created: toCreate.length,
      alreadyRegistered: have.size,
      weekendsSkipped,
      dates: toCreate.map((d) => d.toISOString().split('T')[0]),
    };
  }

  /** 기간 일괄 삭제 */
  async removeRange(dto: DeleteHolidayRangeDto) {
    const dates = this.expandRange(dto.startDate, dto.endDate);
    const { count } = await this.prisma.holiday.deleteMany({
      where: { holidayDate: { in: dates } },
    });
    return { message: `휴무일 ${count}일을 삭제했습니다.`, deleted: count };
  }

  async findAll() {
    return this.prisma.holiday.findMany({
      orderBy: { holidayDate: 'asc' },
    });
  }

  async remove(id: number) {
    const holiday = await this.prisma.holiday.findUnique({ where: { id } });
    if (!holiday) throw new NotFoundException('휴무일을 찾을 수 없습니다.');

    await this.prisma.holiday.delete({ where: { id } });
    return { message: '휴무일이 삭제되었습니다.' };
  }

  // 특정 월의 모든 휴무일(주말 + 등록 휴무일) 목록 반환
  async getCalendar(year: number, month: number) {
    const firstDay = new Date(Date.UTC(year, month - 1, 1));
    const lastDay = new Date(Date.UTC(year, month, 0)); // 해당 월 마지막 날

    // DB에서 해당 월 등록 휴무일 조회
    const registeredHolidays = await this.prisma.holiday.findMany({
      where: {
        holidayDate: { gte: firstDay, lte: lastDay },
      },
    });
    const registeredMap = new Map(
      registeredHolidays.map((h) => [
        h.holidayDate.toISOString().split('T')[0],
        h.description,
      ]),
    );

    const result: { date: string; type: 'WEEKEND' | 'HOLIDAY'; description?: string }[] = [];

    const cursor = new Date(firstDay);
    while (cursor <= lastDay) {
      const dateStr = cursor.toISOString().split('T')[0];
      const day = cursor.getUTCDay(); // UTC 기준 (0=일, 6=토)

      if (day === 0 || day === 6) {
        result.push({ date: dateStr, type: 'WEEKEND' });
      } else if (registeredMap.has(dateStr)) {
        result.push({ date: dateStr, type: 'HOLIDAY', description: registeredMap.get(dateStr) ?? undefined });
      }

      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    return { year, month, holidays: result };
  }

  // Check if a specific date is a holiday (Weekend or Registered Holiday)
  async isHoliday(date: Date): Promise<boolean> {
    // getDay()는 로컬 타임존 기준이라 서버 환경(UTC/KST)에 따라 오작동할 수 있음
    // holidayDate가 @db.Date(UTC 기준)이므로 항상 UTC 기준으로 처리
    const dayOfWeek = date.getUTCDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return true; // Weekend
    }

    // UTC 자정으로 정규화 (parseDateOnlyKst와 동일한 기준)
    const utcMidnight = new Date(Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
    ));

    const holiday = await this.prisma.holiday.findUnique({
      where: { holidayDate: utcMidnight },
    });

    return !!holiday;
  }

  // Calculate the date after 'days' business days
  async calculateBusinessDate(startDate: Date, days: number): Promise<Date> {
    const currentDate = new Date(startDate);
    let addedDays = 0;

    while (addedDays < days) {
      // setUTCDate로 UTC 기준 날짜 이동 (로컬 타임존 영향 방지)
      currentDate.setUTCDate(currentDate.getUTCDate() + 1);
      if (!(await this.isHoliday(currentDate))) {
        addedDays++;
      }
    }

    return currentDate;
  }
}
