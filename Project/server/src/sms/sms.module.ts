import { Module } from '@nestjs/common';
import { SmsService } from './sms.service';
import { ConfigurationsModule } from '../configurations/configurations.module';

@Module({
  imports: [ConfigurationsModule],
  providers: [SmsService],
  exports: [SmsService],
})
export class SmsModule {}
