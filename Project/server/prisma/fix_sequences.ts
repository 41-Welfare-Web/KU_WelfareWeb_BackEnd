import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixSequences() {
  console.log('🔄 DB 시퀀스(Auto-increment) 동기화 시작...');

  const tables = ['Item', 'Category', 'ItemInstance', 'PlotterOrder', 'Rental'];

  try {
    for (const table of tables) {
      const modelName = table.charAt(0).toLowerCase() + table.slice(1);
      const maxRecord = await (prisma as any)[modelName].findFirst({
        orderBy: { id: 'desc' },
      });

      if (maxRecord) {
        const nextId = maxRecord.id + 1;
        // PostgreSQL 전용 시퀀스 리셋 쿼리 (Prisma 스키마의 @@map 설정을 고려해야 함)
        // 기본적으로 Prisma는 테이블명을 소문자 복수형 또는 @@map 이름으로 사용함
        // 여기서는 간단하게 실제 DB 테이블 명을 추측하거나 쿼리를 날림
        const tableName = table === 'Item' ? 'items' : 
                          table === 'Category' ? 'categories' :
                          table === 'ItemInstance' ? 'item_instances' :
                          table === 'PlotterOrder' ? 'plotter_orders' :
                          table === 'Rental' ? 'rentals' : table.toLowerCase();

        await prisma.$executeRawUnsafe(
          `SELECT setval(pg_get_serial_sequence('"${tableName}"', 'id'), ${maxRecord.id})`
        );
        console.log(`✅ ${table} 테이블 시퀀스가 ${maxRecord.id}로 설정되었습니다. (다음 ID: ${nextId})`);
      }
    }
    console.log('🏁 모든 시퀀스 동기화 완료!');
  } catch (error) {
    console.error('💥 시퀀스 수정 중 오류 발생:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixSequences();
