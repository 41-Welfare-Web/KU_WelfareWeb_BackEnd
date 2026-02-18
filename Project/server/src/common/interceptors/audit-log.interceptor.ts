import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(private prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body, ip } = request;
    const user = request.user; // AuthGuard를 거친 경우 사용자 정보가 있음

    // 상태 변경 요청(POST, PUT, PATCH, DELETE)만 기록
    const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);

    return next.handle().pipe(
      tap(async () => {
        if (isMutation) {
          try {
            await this.prisma.auditLog.create({
              data: {
                userId: user?.userId || null,
                action: `${method} ${url}`,
                targetType: this.extractTargetType(url),
                details: body || {},
                ipAddress: ip,
              },
            });
          } catch (error) {
            console.error('[AuditLogInterceptor] Failed to save audit log:', error);
          }
        }
      }),
    );
  }

  private extractTargetType(url: string): string | null {
    const parts = url.split('/');
    // /api/items/1 -> items, /api/rentals -> rentals 등 추출
    return parts.length > 2 ? parts[2] : 'unknown';
  }
}
