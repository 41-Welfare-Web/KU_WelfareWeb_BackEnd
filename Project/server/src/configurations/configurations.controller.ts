import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { ConfigurationsService } from './configurations.service';
import { UpdateConfigDto } from './dto/update-config.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@Controller('admin/configurations')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Role.ADMIN)
export class ConfigurationsController {
  constructor(private readonly configurationsService: ConfigurationsService) {}

  @Get()
  findAll() {
    return this.configurationsService.findAll();
  }

  @Put()
  update(@Body() updateConfigDto: UpdateConfigDto) {
    return this.configurationsService.update(updateConfigDto);
  }
}