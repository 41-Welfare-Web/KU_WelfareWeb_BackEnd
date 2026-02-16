import { Module } from '@nestjs/common';
import { FilesService } from './files.service';
import { CommonController } from './common.controller';

@Module({
  providers: [FilesService],
  controllers: [CommonController],
  exports: [FilesService],
})
export class CommonModule {}
