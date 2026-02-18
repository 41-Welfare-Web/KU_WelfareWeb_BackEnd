import { Module } from '@nestjs/common';
import { RentalsController } from './rentals.controller';
import { RentalsService } from './rentals.service';
import { ConfigurationsModule } from '../configurations/configurations.module';
import { HolidaysModule } from '../holidays/holidays.module';
import { SmsModule } from '../sms/sms.module';

@Module({
  imports: [ConfigurationsModule, HolidaysModule, SmsModule],
  controllers: [RentalsController],
  providers: [RentalsService],
})
export class RentalsModule {}
