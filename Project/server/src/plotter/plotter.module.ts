import { Module } from '@nestjs/common';
import { PlotterController } from './plotter.controller';
import { PlotterService } from './plotter.service';
import { FilesService } from '../common/files.service';
import { ConfigurationsModule } from '../configurations/configurations.module';

@Module({
  imports: [ConfigurationsModule],
  controllers: [PlotterController],
  providers: [PlotterService, FilesService],
})
export class PlotterModule {}
