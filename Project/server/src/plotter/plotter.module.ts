import { Module } from '@nestjs/common';
import { PlotterController } from './plotter.controller';
import { PlotterService } from './plotter.service';
import { FilesService } from '../common/files.service';

@Module({
  controllers: [PlotterController],
  providers: [PlotterService, FilesService]
})
export class PlotterModule {}
