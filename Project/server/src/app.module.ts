import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CategoriesModule } from './categories/categories.module';
import { ItemsModule } from './items/items.module';
import { RentalsModule } from './rentals/rentals.module';
import { PlotterModule } from './plotter/plotter.module';
import { AdminModule } from './admin/admin.module';
import { ConfigModule } from '@nestjs/config';
import { ConfigurationsModule } from './configurations/configurations.module';
import { HolidaysModule } from './holidays/holidays.module';
import { SmsModule } from './sms/sms.module';
import { CommonModule } from './common/common.module';
import { CartModule } from './cart/cart.module';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 60 seconds (milliseconds)
        limit: 60,  // 60 requests per ttl
      },
    ]),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    UsersModule,
    CategoriesModule,
    ItemsModule,
    RentalsModule,
    PlotterModule,
    AdminModule,
    ConfigurationsModule,
    HolidaysModule,
    SmsModule,
    CommonModule,
    CartModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
