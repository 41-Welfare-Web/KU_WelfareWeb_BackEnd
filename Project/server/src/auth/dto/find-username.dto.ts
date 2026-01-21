import { IsNotEmpty, IsString } from 'class-validator';

export class FindUsernameDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  phoneNumber: string;
}
