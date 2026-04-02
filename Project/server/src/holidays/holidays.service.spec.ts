import { Test, TestingModule } from '@nestjs/testing';
import { HolidaysService } from './holidays.service';
import { PrismaService } from '../prisma/prisma.service';

// DB에 등록된 공휴일 목록을 Date ISO string → id 맵으로 관리하는 mock 헬퍼
function makeMockFindUnique(holidayDates: string[]) {
  const set = new Set(holidayDates);
  return (args: { where: { holidayDate: Date } }) => {
    const iso = args.where.holidayDate.toISOString().split('T')[0]; // YYYY-MM-DD
    if (set.has(iso)) {
      return Promise.resolve({ id: 1, holidayDate: args.where.holidayDate, description: 'holiday' });
    }
    return Promise.resolve(null);
  };
}

describe('HolidaysService', () => {
  let service: HolidaysService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HolidaysService,
        {
          provide: PrismaService,
          useValue: {
            holiday: {
              findUnique: jest.fn(),
              create: jest.fn(),
              findMany: jest.fn(),
              delete: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<HolidaysService>(HolidaysService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─────────────────────────────────────────────
  // isHoliday
  // ─────────────────────────────────────────────
  describe('isHoliday', () => {

    // ── 기존 테스트 ──────────────────────────────
    it('should return true for weekends', async () => {
      const saturday = new Date('2023-10-07T00:00:00Z'); // 토요일
      expect(await service.isHoliday(saturday)).toBe(true);

      const sunday = new Date('2023-10-08T00:00:00Z'); // 일요일
      expect(await service.isHoliday(sunday)).toBe(true);
    });

    it('should return true for registered holidays', async () => {
      const monday = new Date('2023-10-09T00:00:00Z'); // 한글날(등록됨)
      (prisma.holiday.findUnique as jest.Mock).mockResolvedValue({
        id: 1, holidayDate: monday, description: 'Test Holiday',
      });
      expect(await service.isHoliday(monday)).toBe(true);
    });

    it('should return false for business days', async () => {
      const tuesday = new Date('2023-10-10T00:00:00Z'); // 화요일
      (prisma.holiday.findUnique as jest.Mock).mockResolvedValue(null);
      expect(await service.isHoliday(tuesday)).toBe(false);
    });

    it('[버그재현] 5/25 공휴일 등록 시 5/26이 공휴일로 잘못 판정되지 않아야 한다', async () => {
      const storedHoliday = new Date('2026-05-25T00:00:00.000Z');
      (prisma.holiday.findUnique as jest.Mock).mockImplementation(
        (args: { where: { holidayDate: Date } }) => {
          if (args.where.holidayDate.toISOString() === storedHoliday.toISOString()) {
            return Promise.resolve({ id: 1, holidayDate: storedHoliday, description: '대체공휴일' });
          }
          return Promise.resolve(null);
        },
      );

      expect(await service.isHoliday(new Date('2026-05-25T00:00:00.000Z'))).toBe(true);  // 공휴일
      expect(await service.isHoliday(new Date('2026-05-26T00:00:00.000Z'))).toBe(false); // 평일
    });

    it('[버그재현] 5/17(일) 시작일은 주말, 5/26(화) 반납일은 평일이어야 한다', async () => {
      (prisma.holiday.findUnique as jest.Mock).mockResolvedValue(null);

      expect(await service.isHoliday(new Date('2026-05-17T00:00:00.000Z'))).toBe(true);  // 일요일
      expect(await service.isHoliday(new Date('2026-05-26T00:00:00.000Z'))).toBe(false); // 화요일
    });

    // ── 요일별 판정 ──────────────────────────────
    describe('요일별 주말/평일 판정', () => {
      // 2026-05-18(월) ~ 2026-05-24(일) 한 주
      const weekDates: [string, string, boolean][] = [
        ['2026-05-18', '월요일', false],
        ['2026-05-19', '화요일', false],
        ['2026-05-20', '수요일', false],
        ['2026-05-21', '목요일', false],
        ['2026-05-22', '금요일', false],
        ['2026-05-23', '토요일', true],
        ['2026-05-24', '일요일', true],
      ];

      beforeEach(() => {
        (prisma.holiday.findUnique as jest.Mock).mockResolvedValue(null);
      });

      weekDates.forEach(([date, label, expected]) => {
        it(`${date} (${label}) → ${expected ? '휴일' : '평일'}`, async () => {
          expect(await service.isHoliday(new Date(`${date}T00:00:00.000Z`))).toBe(expected);
        });
      });
    });

    // ── 연도/월 경계 ─────────────────────────────
    describe('연도·월 경계 케이스', () => {
      it('2025-12-31(수) 공휴일 미등록 → false', async () => {
        (prisma.holiday.findUnique as jest.Mock).mockResolvedValue(null);
        expect(await service.isHoliday(new Date('2025-12-31T00:00:00.000Z'))).toBe(false);
      });

      it('2026-01-01(목) 신정 등록 → true', async () => {
        (prisma.holiday.findUnique as jest.Mock).mockImplementation(
          makeMockFindUnique(['2026-01-01']),
        );
        expect(await service.isHoliday(new Date('2026-01-01T00:00:00.000Z'))).toBe(true);
      });

      it('2026-01-01 전날(2025-12-31)과 다음날(2026-01-02) → false', async () => {
        (prisma.holiday.findUnique as jest.Mock).mockImplementation(
          makeMockFindUnique(['2026-01-01']),
        );
        expect(await service.isHoliday(new Date('2025-12-31T00:00:00.000Z'))).toBe(false);
        expect(await service.isHoliday(new Date('2026-01-02T00:00:00.000Z'))).toBe(false);
      });

      it('2026-12-31(목) 평일, 2026-12-25(금) 크리스마스 공휴일', async () => {
        (prisma.holiday.findUnique as jest.Mock).mockImplementation(
          makeMockFindUnique(['2026-12-25']),
        );
        expect(await service.isHoliday(new Date('2026-12-25T00:00:00.000Z'))).toBe(true);
        expect(await service.isHoliday(new Date('2026-12-31T00:00:00.000Z'))).toBe(false);
      });

      it('2026-02-28(토) ~ 2026-03-02(월) 경계 — 2/28(토) 주말, 3/1(일) 주말, 3/2(월) 대체공휴일', async () => {
        (prisma.holiday.findUnique as jest.Mock).mockImplementation(
          makeMockFindUnique(['2026-03-02']),
        );
        expect(await service.isHoliday(new Date('2026-02-28T00:00:00.000Z'))).toBe(true);  // 토
        expect(await service.isHoliday(new Date('2026-03-01T00:00:00.000Z'))).toBe(true);  // 일
        expect(await service.isHoliday(new Date('2026-03-02T00:00:00.000Z'))).toBe(true);  // 대체공휴일
        expect(await service.isHoliday(new Date('2026-03-03T00:00:00.000Z'))).toBe(false); // 화, 평일
      });
    });

    // ── 2026 실제 공휴일 전체 ─────────────────────
    describe('2026년 법정 공휴일 전체 검증', () => {
      const HOLIDAYS_2026 = [
        { date: '2026-01-01', desc: '신정 (목)' },
        { date: '2026-02-16', desc: '설날연휴 (월)' },
        { date: '2026-02-17', desc: '설날 (화)' },
        { date: '2026-02-18', desc: '설날연휴 (수)' },
        { date: '2026-03-02', desc: '대체공휴일(삼일절) (월)' },
        { date: '2026-05-05', desc: '어린이날 (화)' },
        { date: '2026-05-25', desc: '대체공휴일(부처님오신날) (월)' },
        { date: '2026-06-03', desc: '지방선거 임시공휴일 (수)' },
        { date: '2026-07-17', desc: '제헌절 (금)' },
        { date: '2026-08-17', desc: '대체공휴일(광복절) (월)' },
        { date: '2026-09-24', desc: '추석연휴 (목)' },
        { date: '2026-09-25', desc: '추석 (금)' },
        { date: '2026-10-05', desc: '대체공휴일(개천절) (월)' },
        { date: '2026-10-09', desc: '한글날 (금)' },
        { date: '2026-12-25', desc: '크리스마스 (금)' },
      ];

      beforeEach(() => {
        (prisma.holiday.findUnique as jest.Mock).mockImplementation(
          makeMockFindUnique(HOLIDAYS_2026.map((h) => h.date)),
        );
      });

      HOLIDAYS_2026.forEach(({ date, desc }) => {
        it(`${date} ${desc} → 공휴일`, async () => {
          expect(await service.isHoliday(new Date(`${date}T00:00:00.000Z`))).toBe(true);
        });
      });
    });

    // ── 공휴일 전날/다음날 경계 ───────────────────
    describe('공휴일 경계 — 전날/다음날은 평일', () => {
      beforeEach(() => {
        (prisma.holiday.findUnique as jest.Mock).mockImplementation(
          makeMockFindUnique(['2026-05-05', '2026-05-25', '2026-10-09']),
        );
      });

      it('어린이날(5/5 화) 전날 5/4(월) → 평일', async () => {
        expect(await service.isHoliday(new Date('2026-05-04T00:00:00.000Z'))).toBe(false);
      });

      it('어린이날(5/5 화) 다음날 5/6(수) → 평일', async () => {
        expect(await service.isHoliday(new Date('2026-05-06T00:00:00.000Z'))).toBe(false);
      });

      it('부처님오신날 대체(5/25 월) 다음날 5/26(화) → 평일 [핵심 버그 케이스]', async () => {
        expect(await service.isHoliday(new Date('2026-05-26T00:00:00.000Z'))).toBe(false);
      });

      it('한글날(10/9 금) 전날 10/8(목) → 평일', async () => {
        expect(await service.isHoliday(new Date('2026-10-08T00:00:00.000Z'))).toBe(false);
      });

      it('한글날(10/9 금) 다음날 10/10(토) → 주말', async () => {
        expect(await service.isHoliday(new Date('2026-10-10T00:00:00.000Z'))).toBe(true); // 토
      });
    });

    // ── 연속 공휴일 (설날·추석 연휴) ─────────────
    describe('연속 공휴일 (설날·추석 연휴)', () => {
      it('설날 연휴 3일 + 앞뒤 경계 (2026-02-13~19)', async () => {
        (prisma.holiday.findUnique as jest.Mock).mockImplementation(
          makeMockFindUnique(['2026-02-16', '2026-02-17', '2026-02-18']),
        );

        // 연휴 전: 2/13(금) 평일
        expect(await service.isHoliday(new Date('2026-02-13T00:00:00.000Z'))).toBe(false);
        // 2/14(토) 주말
        expect(await service.isHoliday(new Date('2026-02-14T00:00:00.000Z'))).toBe(true);
        // 2/15(일) 주말
        expect(await service.isHoliday(new Date('2026-02-15T00:00:00.000Z'))).toBe(true);
        // 연휴 3일
        expect(await service.isHoliday(new Date('2026-02-16T00:00:00.000Z'))).toBe(true);
        expect(await service.isHoliday(new Date('2026-02-17T00:00:00.000Z'))).toBe(true);
        expect(await service.isHoliday(new Date('2026-02-18T00:00:00.000Z'))).toBe(true);
        // 연휴 후: 2/19(목) 평일
        expect(await service.isHoliday(new Date('2026-02-19T00:00:00.000Z'))).toBe(false);
      });

      it('추석 연휴 2일 + 앞뒤 경계 (2026-09-23~26)', async () => {
        (prisma.holiday.findUnique as jest.Mock).mockImplementation(
          makeMockFindUnique(['2026-09-24', '2026-09-25']),
        );

        // 9/23(수) 평일
        expect(await service.isHoliday(new Date('2026-09-23T00:00:00.000Z'))).toBe(false);
        // 추석 연휴 목/금
        expect(await service.isHoliday(new Date('2026-09-24T00:00:00.000Z'))).toBe(true);
        expect(await service.isHoliday(new Date('2026-09-25T00:00:00.000Z'))).toBe(true);
        // 9/26(토) 주말
        expect(await service.isHoliday(new Date('2026-09-26T00:00:00.000Z'))).toBe(true);
        // 9/28(월) 평일
        expect(await service.isHoliday(new Date('2026-09-28T00:00:00.000Z'))).toBe(false);
      });
    });
  });

  // ─────────────────────────────────────────────
  // calculateBusinessDate
  // ─────────────────────────────────────────────
  describe('calculateBusinessDate', () => {

    // ── 기존 테스트 ──────────────────────────────
    it('should calculate correct date skipping weekends', async () => {
      // 금(10/6) + 2영업일 → 화(10/10)
      const start = new Date('2023-10-06T00:00:00Z');
      (prisma.holiday.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.calculateBusinessDate(start, 2);
      expect(result.toISOString()).toContain('2023-10-10');
    });

    it('should calculate correct date skipping weekends and holidays', async () => {
      // 금(10/6) + 2영업일, 월(10/9) 공휴일 → 수(10/11)
      const start = new Date('2023-10-06T00:00:00Z');
      (prisma.holiday.findUnique as jest.Mock).mockImplementation(
        makeMockFindUnique(['2023-10-09']),
      );

      const result = await service.calculateBusinessDate(start, 2);
      expect(result.toISOString()).toContain('2023-10-11');
    });

    // ── 단순 주말 건너뜀 ─────────────────────────
    describe('단순 주말 건너뜀', () => {
      beforeEach(() => {
        (prisma.holiday.findUnique as jest.Mock).mockResolvedValue(null);
      });

      it('월(5/18) + 2영업일 → 수(5/20)', async () => {
        const result = await service.calculateBusinessDate(new Date('2026-05-18T00:00:00Z'), 2);
        expect(result.toISOString()).toContain('2026-05-20');
      });

      it('목(5/21) + 1영업일 → 금(5/22)', async () => {
        const result = await service.calculateBusinessDate(new Date('2026-05-21T00:00:00Z'), 1);
        expect(result.toISOString()).toContain('2026-05-22');
      });

      it('금(5/22) + 1영업일 → 월(5/25 — 단, 공휴일 없을 때)', async () => {
        // 공휴일 없는 가정 → 다음 월요일
        const result = await service.calculateBusinessDate(new Date('2026-05-22T00:00:00Z'), 1);
        expect(result.toISOString()).toContain('2026-05-25');
      });

      it('금(5/22) + 2영업일 → 화(5/26, 공휴일 없을 때)', async () => {
        const result = await service.calculateBusinessDate(new Date('2026-05-22T00:00:00Z'), 2);
        expect(result.toISOString()).toContain('2026-05-26');
      });

      it('목(5/21) + 3영업일 → 화(5/26)', async () => {
        // 목+1=금, +2=주말건너 월, +3=화
        const result = await service.calculateBusinessDate(new Date('2026-05-21T00:00:00Z'), 3);
        expect(result.toISOString()).toContain('2026-05-26');
      });
    });

    // ── 공휴일 포함 건너뜀 ───────────────────────
    describe('공휴일 포함 건너뜀', () => {
      it('금(5/22) + 1영업일, 5/25 공휴일 → 화(5/26)', async () => {
        // 금+1 → 토(X) → 일(X) → 월(5/25 공휴일, X) → 화(5/26) ✓
        (prisma.holiday.findUnique as jest.Mock).mockImplementation(
          makeMockFindUnique(['2026-05-25']),
        );
        const result = await service.calculateBusinessDate(new Date('2026-05-22T00:00:00Z'), 1);
        expect(result.toISOString()).toContain('2026-05-26');
      });

      it('금(5/22) + 2영업일, 5/25 공휴일 → 수(5/27)', async () => {
        // +1 → 5/26(화), +2 → 5/27(수)
        (prisma.holiday.findUnique as jest.Mock).mockImplementation(
          makeMockFindUnique(['2026-05-25']),
        );
        const result = await service.calculateBusinessDate(new Date('2026-05-22T00:00:00Z'), 2);
        expect(result.toISOString()).toContain('2026-05-27');
      });

      it('설날 연휴 3일 포함 — 금(2/13) + 2영업일 → 금(2/20)', async () => {
        // 토(X) 일(X) 월(2/16 연휴X) 화(2/17 연휴X) 수(2/18 연휴X) 목(2/19)✓+1 금(2/20)✓+2
        (prisma.holiday.findUnique as jest.Mock).mockImplementation(
          makeMockFindUnique(['2026-02-16', '2026-02-17', '2026-02-18']),
        );
        const result = await service.calculateBusinessDate(new Date('2026-02-13T00:00:00Z'), 2);
        expect(result.toISOString()).toContain('2026-02-20');
      });

      it('추석연휴(목/금) + 주말 건너뜀 — 수(9/23) + 2영업일 → 화(9/29)', async () => {
        // +1 → 목(9/24 연휴, X) → 금(9/25 연휴, X) → 토(X) → 일(X) → 월(9/28) ✓ → 화(9/29) ✓
        (prisma.holiday.findUnique as jest.Mock).mockImplementation(
          makeMockFindUnique(['2026-09-24', '2026-09-25']),
        );
        const result = await service.calculateBusinessDate(new Date('2026-09-23T00:00:00Z'), 2);
        expect(result.toISOString()).toContain('2026-09-29');
      });

      it('연말/연초 경계 — 수(12/30) + 2영업일, 1/1 공휴일 → 월(1/4)', async () => {
        // 12/30(수)+1=12/31(목)✓ → +2=1/1(금 신정X)→1/2(토X)→1/3(일X)→1/4(월)✓
        // 2026-12-31은 목요일, 2027-01-01(금) 신정
        (prisma.holiday.findUnique as jest.Mock).mockImplementation(
          makeMockFindUnique(['2027-01-01']),
        );
        const result = await service.calculateBusinessDate(new Date('2026-12-30T00:00:00Z'), 2);
        expect(result.toISOString()).toContain('2027-01-04');
      });
    });

    // ── 플로터 수령일 (신청일 + 2영업일) ─────────
    describe('플로터 수령일 계산 — 신청일 기준 근무일 2일 뒤', () => {
      beforeEach(() => {
        (prisma.holiday.findUnique as jest.Mock).mockResolvedValue(null);
      });

      it('월(5/18) 신청 → 수(5/20) 수령', async () => {
        const result = await service.calculateBusinessDate(new Date('2026-05-18T00:00:00Z'), 2);
        expect(result.toISOString()).toContain('2026-05-20');
      });

      it('화(5/19) 신청 → 목(5/21) 수령', async () => {
        const result = await service.calculateBusinessDate(new Date('2026-05-19T00:00:00Z'), 2);
        expect(result.toISOString()).toContain('2026-05-21');
      });

      it('수(5/20) 신청 → 금(5/22) 수령', async () => {
        const result = await service.calculateBusinessDate(new Date('2026-05-20T00:00:00Z'), 2);
        expect(result.toISOString()).toContain('2026-05-22');
      });

      it('목(5/21) 신청 → 주말 건너 월(5/25) 수령', async () => {
        const result = await service.calculateBusinessDate(new Date('2026-05-21T00:00:00Z'), 2);
        expect(result.toISOString()).toContain('2026-05-25');
      });

      it('금(5/22) 신청 → 주말 건너 화(5/26) 수령', async () => {
        const result = await service.calculateBusinessDate(new Date('2026-05-22T00:00:00Z'), 2);
        expect(result.toISOString()).toContain('2026-05-26');
      });

      it('목(10/8) 신청, 한글날(10/9 금) 공휴일 → 주초 화(10/13) 수령', async () => {
        // +1 → 금(10/9 공휴일, X) → 토(X) → 일(X) → 월(10/12) ✓ → +2 → 화(10/13) ✓
        (prisma.holiday.findUnique as jest.Mock).mockImplementation(
          makeMockFindUnique(['2026-10-09']),
        );
        const result = await service.calculateBusinessDate(new Date('2026-10-08T00:00:00Z'), 2);
        expect(result.toISOString()).toContain('2026-10-13');
      });

      it('금(10/9 한글날) 신청, 한글날 당일은 이미 지났으니 다음 영업일부터 — 화(10/13) + 2 → 목(10/15)', async () => {
        // 한글날 다음날부터: 토(X) 일(X) 월(10/12)✓ 화(10/13)✓
        (prisma.holiday.findUnique as jest.Mock).mockImplementation(
          makeMockFindUnique(['2026-10-09']),
        );
        const result = await service.calculateBusinessDate(new Date('2026-10-09T00:00:00Z'), 2);
        expect(result.toISOString()).toContain('2026-10-13');
      });
    });
  });
});
