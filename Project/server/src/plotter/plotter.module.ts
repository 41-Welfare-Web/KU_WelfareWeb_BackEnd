import { Module } from '@nestjs/common';
import { PlotterController } from './plotter.controller';
import { PlotterService } from './plotter.service';

@Module({
  controllers: [PlotterController],
  providers: [PlotterService]
})
export class PlotterModule {}
