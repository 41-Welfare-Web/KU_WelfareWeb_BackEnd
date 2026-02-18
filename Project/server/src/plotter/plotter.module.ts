import { Module } from '@nestjs/common';
import { PlotterController } from './plotter.controller';
import { PlotterService } from './plotter.service';
import { FilesService } from '../common/files.service';
import { ConfigurationsModule } from '../configurations/configurations.module';
import { HolidaysModule } from '../holidays/holidays.module';
import { SmsModule } from '../sms/sms.module';

@Module({
  imports: [ConfigurationsModule, HolidaysModule, SmsModule],
  controllers: [PlotterController],
  providers: [PlotterService, FilesService],
})
export class PlotterModule {}
