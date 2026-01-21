import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';

@Injectable()
export class FilesService {
  /**
   * 실제로는 S3, Supabase Storage 등에 업로드하는 로직이 들어갑니다.
   * 현재는 테스트를 위해 파일 정보를 바탕으로 가상 경로를 생성합니다.
   */
  async uploadFile(file: Express.Multer.File, folder: string): Promise<string> {
    const fileExt = path.extname(file.originalname);
    const fileName = `${uuidv4()}${fileExt}`;
    const filePath = `${folder}/${fileName}`;

    // TODO: 실제 Storage SDK 연동 (예: supabase.storage.from('bucket').upload(...))
    // 지금은 가상의 URL을 반환하도록 합니다.
    return `https://your-storage-url.com/${filePath}`;
  }

  async deleteFile(fileUrl: string): Promise<void> {
    // TODO: 실제 Storage에서 파일 삭제 로직
    console.log(`[File Deleted] ${fileUrl}`);
  }
}
