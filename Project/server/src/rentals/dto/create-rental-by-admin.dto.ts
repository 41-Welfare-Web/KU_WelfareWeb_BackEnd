import { CreateRentalDto } from './create-rental.dto';
import { IsNotEmpty, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRentalByAdminDto extends CreateRentalDto {
  @ApiProperty({
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    description: '대여를 신청할 사용자의 UUID',
  })
  @IsUUID()
  @IsNotEmpty()
  targetUserId: string;
}
