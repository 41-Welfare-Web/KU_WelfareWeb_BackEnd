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
JSON 백업 파일(`backups/2026-03-15`)을 기반으로 카테고리, 물품 목록, 개별 인스턴스를 복구합니다.
> ⚠️ 이 스크립트는 `itemImages`(갤러리 이미지)를 복구하지 않습니다. 이미지 복구는 아래 `upload_images.ts`를 사용하세요.
```bash
npx ts-node prisma/restore_items.ts
```

### **D. 이미지 업로드 및 DB 복구 (`upload_images.ts`)**
로컬 이미지 파일을 Supabase Storage에 업로드하고, `itemImages` 테이블과 `items.imageUrl`을 한번에 동기화합니다.

**실행 조건:** `Project/data/2026_03_23_Item_Image/` 폴더에 이미지 파일이 있어야 합니다.

```bash
npx ts-node prisma/upload_images.ts
```

**처리 흐름:**
1. `Project/data/20260309_Item_Image/` 내 `.jpg`, `.png` 파일을 Supabase `rental-web` 버킷 `items/` 경로에 upsert 업로드
2. 파일명 패턴(`{itemCode}_{순서}.{확장자}`)을 파싱 → DB에서 itemCode로 itemId 조회 → `itemImages` 테이블에 upsert
3. 각 물품의 order=1 이미지를 `items.imageUrl` 대표 이미지로 자동 업데이트

**이미지 파일 명명 규칙:**

| 항목 | 규칙 | 예시 |
|------|------|------|
| 파일명 형식 | `{itemCode}_{순서}.{확장자}` | `101_1.jpg`, `206_2.jpg` |
| 확장자 | `.jpg` 또는 `.png` 허용 | `412_1.png` (포토월) |
| 순서 번호 | 1부터 시작, 갤러리 순서와 일치 | `104_1.jpg`, `104_2.jpg` |

**DB 이미지 구조:**

```
items.imageUrl       ← order=1 이미지 URL (대표 이미지, 목록 썸네일용)
itemImages[]         ← 갤러리 이미지 전체 (order 오름차순 정렬)
  - itemId
  - imageUrl
  - order (1, 2, ...)
```

> **주의:** `items.imageUrl`과 `itemImages` order=1의 URL은 항상 동일해야 합니다. 스크립트가 자동으로 맞춰줍니다.

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
