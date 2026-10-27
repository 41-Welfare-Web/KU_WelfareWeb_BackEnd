import { Test, TestingModule } from '@nestjs/testing';
import { AdminService } from './admin.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AdminService - cleanupDatabase', () => {
  let service: AdminService;

  const mockPrisma = {
    rental: { findMany: jest.fn(), deleteMany: jest.fn(), count: jest.fn() },
    rentalItem: { deleteMany: jest.fn() },
    rentalHistory: { deleteMany: jest.fn() },
    plotterOrder: { findMany: jest.fn(), deleteMany: jest.fn(), count: jest.fn() },
    plotterOrderHistory: { deleteMany: jest.fn() },
    item: { findMany: jest.fn(), deleteMany: jest.fn(), updateMany: jest.fn(), count: jest.fn() },
    cartItem: { deleteMany: jest.fn() },
    auditLog: { deleteMany: jest.fn(), create: jest.fn() },
    user: { findMany: jest.fn(), deleteMany: jest.fn(), count: jest.fn() },
  };

  const ACTOR = 'admin-uuid';

  /** 참조가 하나도 없어 삭제 가능한 물품 */
  const freeItem = (id: number, name: string) => ({
    id,
    name,
    _count: {
      rentalItems: 0,
      cartItems: 0,
      itemInstances: 0,
      itemImages: 0,
      components: 0,
      isPartOf: 0,
    },
  });

  /** 대여 이력이 남아 있어 FK 때문에 지울 수 없는 물품 */
  const referencedItem = (id: number, name: string) => ({
    id,
    name,
    _count: { ...freeItem(id, name)._count, rentalItems: 3 },
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrisma.rental.findMany.mockResolvedValue([{ id: 1 }, { id: 2 }]);
    mockPrisma.plotterOrder.findMany.mockResolvedValue([{ id: 10 }]);
    mockPrisma.item.findMany.mockResolvedValue([freeItem(100, '폐기물품')]);
    mockPrisma.user.findMany.mockResolvedValue([]);
    mockPrisma.auditLog.create.mockResolvedValue({});

    const module: TestingModule = await Test.createTestingModule({
      providers: [AdminService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get<AdminService>(AdminService);
  });

  it('기본값은 미리보기라 아무것도 지우지 않는다', async () => {
    const res = await service.cleanupDatabase({ purgeSoftDeleted: true }, ACTOR);

    expect(res.dryRun).toBe(true);
    expect(mockPrisma.rental.deleteMany).not.toHaveBeenCalled();
    expect(mockPrisma.plotterOrder.deleteMany).not.toHaveBeenCalled();
    expect(mockPrisma.item.deleteMany).not.toHaveBeenCalled();
    expect(res.planned).toMatchObject({ rentals: 2, plotterOrders: 1, items: 1 });
  });

  it('dryRun: false 일 때만 실제로 삭제한다', async () => {
    await service.cleanupDatabase({ purgeSoftDeleted: true, dryRun: false }, ACTOR);

    expect(mockPrisma.rentalHistory.deleteMany).toHaveBeenCalledWith({
      where: { rentalId: { in: [1, 2] } },
    });
    expect(mockPrisma.rental.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: [1, 2] } },
    });
    expect(mockPrisma.item.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: [100] } },
    });
  });

  it('보존 기간이 지난 것만 대상으로 조회한다', async () => {
    await service.cleanupDatabase(
      { purgeSoftDeleted: true, olderThanDays: 30, dryRun: false },
      ACTOR,
    );

    const where = mockPrisma.rental.findMany.mock.calls[0][0].where;
    expect(where.deletedAt.not).toBeNull();
    expect(where.deletedAt.lt).toBeInstanceOf(Date);
    // 30일 전후(오차 1일 이내)를 기준으로 잘라야 한다
    const days = (Date.now() - where.deletedAt.lt.getTime()) / 86400000;
    expect(days).toBeGreaterThan(29);
    expect(days).toBeLessThan(31.5);
  });

  it('다른 기록이 참조 중인 물품은 건너뛰고 사유를 알려준다', async () => {
    mockPrisma.item.findMany.mockResolvedValue([
      freeItem(100, '폐기물품'),
      referencedItem(101, '천막'),
    ]);

    const res = await service.cleanupDatabase(
      { purgeSoftDeleted: true, dryRun: false },
      ACTOR,
    );

    // 참조 없는 것만 삭제
    expect(mockPrisma.item.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: [100] } },
    });
    expect(res.planned.itemsBlocked).toBe(1);
    expect(res.results.join(' ')).toContain('천막');
  });

  it('미리보기도 감사 로그에 남긴다', async () => {
    await service.cleanupDatabase({ purgeSoftDeleted: true }, ACTOR);
    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'DB_MAINTENANCE_PREVIEW' }),
      }),
    );
  });

  it('아무 옵션도 없으면 아무 작업도 하지 않는다', async () => {
    const res = await service.cleanupDatabase({}, ACTOR);
    expect(mockPrisma.rental.deleteMany).not.toHaveBeenCalled();
    expect(mockPrisma.item.updateMany).not.toHaveBeenCalled();
    expect(res.results).toEqual(['선택된 작업이 없습니다.']);
  });
});
