import { Module } from '@nestjs/common';
import { RentalsController } from './rentals.controller';
import { RentalsService } from './rentals.service';
import { ConfigurationsModule } from '../configurations/configurations.module';
import { HolidaysModule } from '../holidays/holidays.module';
import { SmsModule } from '../sms/sms.module';
import { CartModule } from '../cart/cart.module';

@Module({
  imports: [ConfigurationsModule, HolidaysModule, SmsModule, CartModule],
  controllers: [RentalsController],
  providers: [RentalsService],
})
export class RentalsModule {}
