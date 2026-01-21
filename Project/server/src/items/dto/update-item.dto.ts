import { PartialType } from '@nestjs/mapped-types';
import { CreateItemDto } from './create-category.dto'; // 경로 주의

// 실제 파일명에 맞춰 수정
import { CreateItemDto as OriginalCreateItemDto } from './create-item.dto';
export class UpdateItemDto extends PartialType(OriginalCreateItemDto) {}
