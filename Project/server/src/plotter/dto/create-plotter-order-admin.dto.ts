import { IsNotEmpty, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CreatePlotterOrderDto } from './create-plotter-order.dto';

export class CreatePlotterOrderAdminDto extends CreatePlotterOrderDto {
  @ApiProperty({
    example: 'a1b2c3d4-e5f6-4g7h-i8j9-k0l1m2n3o4p5',
    description: '주문을 생성할 대상 사용자의 고유 ID (UUID)',
  })
  @IsUUID()
  @IsNotEmpty()
  targetUserId: string;
}

export class CreatePlotterOrderAdminWithFilesDto extends CreatePlotterOrderAdminDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: '인쇄할 PDF 파일',
  })
  pdfFile: any;

  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: '결제 영수증 이미지 (관리자 확인 시 선택)',
    required: false,
  })
  paymentReceiptImage?: any;
}
