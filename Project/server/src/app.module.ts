import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ItemsModule } from './items/items.module';
import { CategoriesModule } from './categories/categories.module';
import { RentalsModule } from './rentals/rentals.module';
import { PlotterModule } from './plotter/plotter.module';
import { HolidaysModule } from './holidays/holidays.module';
import { ConfigurationsModule } from './configurations/configurations.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // 전역 모듈로 설정하여 어디서든 ConfigService 사용 가능
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    ItemsModule,
    CategoriesModule,
    RentalsModule,
    PlotterModule,
    HolidaysModule,
    ConfigurationsModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}