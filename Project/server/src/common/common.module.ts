import { Module } from '@nestjs/common';
import { FilesService } from './files.service';
import { CommonController } from './common.controller';
import { ConfigurationsModule } from '../configurations/configurations.module';

@Module({
  imports: [ConfigurationsModule],
  providers: [FilesService],
  controllers: [CommonController],
  exports: [FilesService],
})
export class CommonModule {}
