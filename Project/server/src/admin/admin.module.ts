import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { FilesService } from '../common/files.service';

@Module({
  controllers: [AdminController],
  providers: [AdminService, FilesService],
})
export class AdminModule {}
