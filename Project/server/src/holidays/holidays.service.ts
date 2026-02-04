import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateHolidayDto } from './dto/create-holiday.dto';

@Injectable()
export class HolidaysService {
  constructor(private prisma: PrismaService) {}

  async create(createHolidayDto: CreateHolidayDto) {
    const { holidayDate, description } = createHolidayDto;
    const date = new Date(holidayDate);

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

  // Check if a specific date is a holiday (Weekend or Registered Holiday)
  async isHoliday(date: Date): Promise<boolean> {
    const day = date.getDay();
    if (day === 0 || day === 6) {
      return true; // Weekend
    }

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const holiday = await this.prisma.holiday.findUnique({
      where: { holidayDate: startOfDay },
    });

    return !!holiday;
  }

  // Calculate the date after 'days' business days
  async calculateBusinessDate(startDate: Date, days: number): Promise<Date> {
    const currentDate = new Date(startDate);
    let addedDays = 0;

    while (addedDays < days) {
      currentDate.setDate(currentDate.getDate() + 1);
      if (!(await this.isHoliday(currentDate))) {
        addedDays++;
      }
    }

    return currentDate;
  }
}
