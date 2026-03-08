import { Module } from '@nestjs/common';
import { FilesService } from './files.service';
import { CommonController } from './common.controller';
import { ConfigurationsModule } from '../configurations/configurations.module';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditLogInterceptor } from './interceptors/audit-log.interceptor';
import { PrismaModule } from '../prisma/prisma.module';
import { SmsModule } from '../sms/sms.module';
import { PlotterModule } from '../plotter/plotter.module';

@Module({
  imports: [ConfigurationsModule, PrismaModule, SmsModule, PlotterModule],
  providers: [
    FilesService,
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditLogInterceptor,
    },
  ],
  controllers: [CommonController],
  exports: [FilesService],
})
export class CommonModule {}
