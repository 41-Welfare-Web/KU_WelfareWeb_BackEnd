import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class FilesService {
  private supabase: SupabaseClient | null = null;
  private bucketName: string;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;
    this.bucketName = process.env.SUPABASE_BUCKET_NAME || 'rental-web';

    if (supabaseUrl && supabaseKey) {
      this.supabase = createClient(supabaseUrl, supabaseKey);
    } else {
      console.warn(
        '[FilesService] Supabase credentials not found. File upload will be mocked.',
      );
    }
  }

  async uploadFile(file: Express.Multer.File, folder: string): Promise<string> {
    const fileExt = path.extname(file.originalname);
    const fileName = `${uuidv4()}${fileExt}`;
    const filePath = `${folder}/${fileName}`;

    // Mock Mode
    if (!this.supabase) {
      console.log(`[Mock Upload] Uploading ${filePath} (Size: ${file.size})`);
      return `https://mock-storage.com/${filePath}`;
    }

    // Real Upload
    const { data, error } = await this.supabase.storage
      .from(this.bucketName)
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (error) {
      console.error('[FilesService] Upload Error:', error);
      throw new InternalServerErrorException('파일 업로드 중 오류가 발생했습니다.');
    }

    // Get Public URL
    const { data: publicData } = this.supabase.storage
      .from(this.bucketName)
      .getPublicUrl(filePath);

    return publicData.publicUrl;
  }

  async deleteFile(fileUrl: string): Promise<void> {
    if (!this.supabase) {
      console.log(`[Mock Delete] Deleting file at ${fileUrl}`);
      return;
    }

    // URL에서 경로 추출 (예: .../bucketName/folder/file.pdf -> folder/file.pdf)
    // 간단하게 구현: URL의 마지막 부분(파일명)과 그 앞의 폴더명을 조합
    // *주의* 실제 URL 구조에 따라 파싱 로직이 달라질 수 있음.
    // 여기서는 간단히 전체 경로가 URL에 포함되어 있다고 가정하고 파싱
    try {
        const urlObj = new URL(fileUrl);
        // Pathname: /storage/v1/object/public/rental-web/plotter/pdfs/uuid.pdf
        const decodedPath = decodeURIComponent(urlObj.pathname);
        const pathParts = decodedPath.split(`/${this.bucketName}/`);
        if (pathParts.length < 2) return; // 버킷명 없는 경우 패스

        const filePath = pathParts[1]; // plotter/pdfs/uuid.pdf

        const { error } = await this.supabase.storage
        .from(this.bucketName)
        .remove([filePath]);

        if (error) {
            console.error('[FilesService] Delete Error:', error);
        }
    } catch (e) {
        console.warn(`[FilesService] Failed to parse file URL: ${fileUrl}`);
    }
  }
}
