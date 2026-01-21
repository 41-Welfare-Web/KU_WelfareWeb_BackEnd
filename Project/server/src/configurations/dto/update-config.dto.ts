import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateConfigDto {
  @IsString()
  @IsNotEmpty()
  config_key: string;

  @IsString()
  @IsNotEmpty()
  config_value: string;
}
