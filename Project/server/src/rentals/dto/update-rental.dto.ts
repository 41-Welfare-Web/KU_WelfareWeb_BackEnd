import { CreateRentalDto } from './create-rental.dto';
import { PartialType } from '@nestjs/swagger';

export class UpdateRentalDto extends PartialType(CreateRentalDto) {}
