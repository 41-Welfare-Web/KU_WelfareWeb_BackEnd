import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateConfigDto {
  @IsString()
  @IsNotEmpty()
  configKey: string;

  @IsString()
  @IsNotEmpty()
  configValue: string;
}
