# RentalWeb DB 데이터 관리 가이드 (v1.1)

이 문서는 테스트 및 QA 효율화를 위한 데이터 분류 체계와 DB 관리 스크립트 사용법을 정의합니다.

---

## 1. 데이터 관리 스크립트 (Scripts)

`Project/server/prisma` 디렉토리에는 데이터베이스를 관리하기 위한 다양한 유틸리티 스크립트가 포함되어 있습니다. 모든 스크립트는 `Project/server` 디렉토리에서 실행해야 합니다.

### **A. DB 매니저 (`db_manager.ts`)**
테스트 환경을 빠르게 초기화하기 위한 도구입니다.

*   **QA 모드 (권장):** 대여 이력, 플로터 주문 등 **트랜잭션 데이터만** 삭제합니다. 물품 목록과 카테고리는 유지됩니다.
    ```bash
    npm run db:reset-qa
    # 또는
    npx ts-node prisma/db_manager.ts qa
    ```
*   **FULL 모드:** DB의 **모든 데이터**를 날리고 초기 시딩 상태(관리자 1명, 기본 설정)로 되돌립니다.
    ```bash
    npm run db:reset-full
    # 또는
    npx ts-node prisma/db_manager.ts full
    ```

### **B. 물품 데이터 복구 (`restore_items.ts`)**
JSON 백업 파일(`backups/2026-03-15`)을 기반으로 카테고리와 물품 목록을 복구합니다. 이미지가 포함된 상태 그대로 복원됩니다.
```bash
npx ts-node prisma/restore_items.ts
```

### **C. 시퀀스 동기화 (`fix_sequences.ts`)**
데이터를 수동으로 삽입(Restore 등)한 후, DB의 자동 증가(Auto-increment) ID 카운터가 어긋나 발생하는 `Unique constraint failed (P2002)` 에러를 해결합니다.
```bash
npx ts-node prisma/fix_sequences.ts
```

---

## 2. 데이터 분류 체계

### **정적 데이터 (Static / Master)**
*   **관리 대상:** `Category`, `Item`, `ItemInstance`, `Configuration`
*   **복구 전략:** `restore_items.ts`를 통해 백업본에서 복구하거나, `seed.ts`를 통해 초기화합니다.

### **유동적 데이터 (Transactional)**
*   **관리 대상:** `User`, `Rental`, `PlotterOrder`, `AuditLog`, `CartItem`, `VerificationCode`
*   **복구 전략:** 테스트 목적에 따라 `db_manager.ts qa` 명령어로 주기적으로 초기화하여 깨끗한 테스트 환경을 유지합니다.

---

## 3. 백업 전략

중요한 변경 사항이 있을 경우, 다음 명령어로 DB 상태를 JSON으로 백업해두는 것을 권장합니다.
(현재 `Project/server/backups` 폴더에 날짜별로 관리됨)

```bash
# 백업 생성 스크립트 (필요 시 작성/실행)
npx ts-node prisma/backup_db.ts
```
