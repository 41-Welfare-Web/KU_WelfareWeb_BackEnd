import { Module } from '@nestjs/common';
import { RentalsController } from './rentals.controller';
import { RentalsService } from './rentals.service';
import { ConfigurationsModule } from '../configurations/configurations.module';

@Module({
  imports: [ConfigurationsModule],
  controllers: [RentalsController],
  providers: [RentalsService],
})
export class RentalsModule {}
