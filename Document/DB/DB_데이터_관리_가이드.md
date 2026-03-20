# RentalWeb DB 데이터 관리 가이드 (v1.0)

이 문서는 테스트 및 QA 효율화를 위한 데이터 분류 체계와 DB 관리 스크립트 사용법을 정의합니다.

---

## 1. 데이터 분류 체계

시스템의 데이터는 성격에 따라 **정적 데이터(Master)**와 **유동적 데이터(Transactional)**로 구분하여 관리합니다.

### **A. 정적 데이터 (Static / Master Data)**
서비스 운영의 근간이 되는 데이터로, 테스트 중에도 원칙적으로 유지되어야 하는 데이터입니다.
- **대상 테이블:**
  - `Category`: 물품 카테고리 (촬영장비, 음향기기 등)
  - `Item`, `ItemImage`, `ItemComponent`: 물품 목록 및 세트 구성 정보
  - `ItemInstance`: 개별 실물 자산 정보 (시리얼 번호 등)
  - `Configuration`: 시스템 설정 값 (대여 기간, 플로터 가격 등)
  - `Holiday`: 운영일 및 휴무일 정보
  - `User (ADMIN)`: 관리자 계정

### **B. 유동적 데이터 (Dynamic / Transactional Data)**
사용자 활동에 의해 생성되는 휘발성 데이터로, 테스트 회차마다 초기화하여 깨끗한 상태를 유지할 수 있는 데이터입니다.
- **대상 테이블:**
  - `User (USER)`: 테스트용 일반 사용자 계정
  - `Rental`, `RentalItem`, `RentalHistory`: 물품 대여 예약 및 상태 변경 이력
  - `PlotterOrder`, `PlotterOrderHistory`: 플로터 주문 및 진행 이력
  - `CartItem`: 장바구니 담긴 내역
  - `VerificationCode`: SMS 인증 코드 내역
  - `AuditLog`: 시스템 감사 로그

---

## 2. DB 관리 명령어 (Scripts)

`Project/server` 경로에서 다음 명령어를 통해 데이터를 관리할 수 있습니다.

### **① QA 초기화 (추천)**
테스트 중에 쌓인 사용자 활동 데이터만 지우고, 물품 카탈로그는 유지합니다.
```bash
npm run db:reset-qa
```
- **효과:** 모든 대여/주문 기록 삭제, 일반 사용자(`USER`) 삭제.
- **용도:** 새로운 사용자로 대여 프로세스를 처음부터 다시 테스트할 때 사용.

### **② 카탈로그 초기화**
물품 목록까지 모두 지우고 초기 상태로 되돌립니다.
```bash
npm run db:reset-catalog
```
- **효과:** QA 초기화 내용 + 모든 물품(`Item`) 및 자산 정보 삭제.
- **용도:** 물품 목록(Master Data)을 대량으로 수정하거나 다시 세팅하고 싶을 때 사용.

### **③ 전체 공장 초기화**
데이터베이스를 완전히 비우고 `seed.ts`의 데이터만 다시 채웁니다.
```bash
npm run db:reset-full
```
- **효과:** 모든 테이블의 데이터를 삭제하고 시퀀스(ID)를 초기화한 후, `prisma/seed.ts` 실행.
- **용도:** 시스템을 완전히 초기 설치 상태로 되돌리고 싶을 때 사용.

---

## 3. 데이터 롤백 및 복구 전략

1. **테스트 데이터 백업:** 중요한 테스트 데이터가 있는 경우 `Project/server/backups` 폴더에 JSON 형태로 백업본을 저장해 두는 것을 권장합니다.
2. **멱등성 유지:** 모든 마스터 데이터는 `prisma/seed.ts`에 정의되어야 합니다. 스크립트 실행 후 `npx prisma db seed`를 통해 언제든 표준 상태로 복구할 수 있습니다.
