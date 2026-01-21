import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RentalStatus, PlotterStatus } from '@prisma/client';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getStats() {
    // 1. 기본 카운트
    const totalUsers = await this.prisma.user.count();
    const totalRentals = await this.prisma.rental.count();
    
    // 2. 활성 대여 (대여 중)
    const activeRentals = await this.prisma.rental.count({
      where: { status: RentalStatus.RENTED },
    });

    // 3. 연체 대여 (반납일 지남 & 아직 반납 안 함)
    const today = new Date();
    const overdueRentals = await this.prisma.rental.count({
      where: {
        status: RentalStatus.RENTED,
        endDate: { lt: today },
      },
    });

    // 4. 인기 물품 (Top 5)
    const mostRentedItems = await this.prisma.item.findMany({
      orderBy: { rentalCount: 'desc' },
      take: 5,
      select: { id: true, name: true, rentalCount: true },
    });

    // 5. 플로터 주문 현황
    const plotterPending = await this.prisma.plotterOrder.count({
      where: { status: PlotterStatus.PENDING },
    });
    const plotterCompleted = await this.prisma.plotterOrder.count({
      where: { status: PlotterStatus.COMPLETED },
    });

    return {
      total_users: totalUsers,
      total_rentals: totalRentals,
      active_rentals: activeRentals,
      overdue_rentals: overdueRentals,
      most_rented_items: mostRentedItems,
      plotter_orders_pending: plotterPending,
      plotter_orders_completed: plotterCompleted,
    };
  }
}