# CLAUDE.md — RentalWeb 프로젝트

Claude Code가 이 프로젝트에서 작업할 때 참고하는 컨텍스트 파일입니다.

---

## 프로젝트 개요

**RentalWeb**은 대학교 내 구성원(학과, 동아리 등)을 위한 **물품 대여 및 플로터 출력 주문** 서비스입니다.
- **대여 요금 없음** (학생 복지 서비스)
- 역할 기반 접근 제어: `USER` / `ADMIN`

---

## 기술 스택

### 백엔드 (구현 완료)

| 분류 | 기술 |
|------|------|
| 프레임워크 | NestJS 11 + TypeScript |
| ORM | Prisma 6.19 |
| DB | Supabase PostgreSQL |
| 인증 | JWT (Passport.js) — Access Token + Refresh Token |
| SMS | Solapi (CoolSMS), Mock 모드 지원 |
| 파일 스토리지 | Supabase Storage |
| API 문서 | Swagger (`http://localhost:3000/api-docs`) |
| 스케줄링 | @nestjs/schedule (자동 연체 처리) |
| Rate Limiting | @nestjs/throttler |
| 패키지 매니저 | npm |
| 배포 (예정) | Railway |

### 프론트엔드 (미구현 — 개발 예정)

| 분류 | 기술 |
|------|------|
| 프레임워크 | React 18 + Vite + TypeScript |
| UI | shadcn/ui + Radix UI + Tailwind CSS |
| 라우팅 | React Router DOM v6 (HashRouter) |
| 서버 상태 | TanStack Query v5 |
| 폼 | React Hook Form + Zod |
| 패키지 매니저 | **pnpm** |
| 배포 (예정) | Vercel |

---

## 폴더 구조

```
RentalWeb/
├── Project/
│   └── server/                         # NestJS 백엔드
│       ├── src/
│       │   ├── admin/                  # 이미지 업로드, 통계
│       │   ├── auth/                   # JWT 인증, 회원가입/로그인/재설정
│       │   ├── cart/                   # 장바구니 CRUD
│       │   ├── categories/             # 카테고리 CRUD
│       │   ├── common/                 # 파일 업로드, 헬스체크, 메타데이터, 감사로그 인터셉터
│       │   ├── configurations/         # 시스템 설정 (DB 기반 key-value)
│       │   ├── holidays/               # 휴무일 관리
│       │   ├── items/                  # 물품 CRUD, 개별실물, 세트구성, 재고캘린더
│       │   ├── plotter/                # 플로터 주문/가격계산/상태변경
│       │   ├── prisma/                 # PrismaService
│       │   ├── rentals/                # 대여 예약/수정/취소/상태변경, 자동연체
│       │   ├── sms/                    # SMS 발송 (Solapi 연동)
│       │   ├── users/                  # 사용자 프로필, 관리자 사용자관리
│       │   ├── app.module.ts           # 메인 모듈
│       │   └── main.ts                 # NestJS 부트스트랩 (글로벌 prefix: /api)
│       ├── prisma/
│       │   ├── schema.prisma           # 14개 모델 정의
│       │   └── seed.ts                 # DB 시딩
│       ├── test/                       # E2E 테스트
│       ├── package.json
│       └── tsconfig.json
├── Document/
│   ├── API/
│   │   ├── RentalWeb_API_v1.0_통합.md  # 전체 API 명세 (상세)
│   │   ├── API_List.md                 # API 엔드포인트 목록
│   │   └── API_Test_Guide.md           # API 테스트 가이드
│   ├── DB/
│   │   └── DB_Schema_v1.0.md           # DB 스키마 문서
│   ├── specification/
│   │   ├── 시스템 기획서_v1.0.md       # 기획서
│   │   └── 요구사항_명세서_v1.0.md     # 요구사항 명세서 (FR-01~FR-37)
│   ├── Reference/
│   │   └── 스택_정리.md                # 기술 스택 선정 문서
│   ├── architecture/usecase/           # 유스케이스 다이어그램
│   ├── 디자인/                         # 로고, 색상코드, 리플렛
│   └── 백엔드_개발_가이드.md           # 백엔드 세팅/테스트 가이드
├── supabase/
│   └── seed.sql                        # DB 초기 데이터 (카테고리 3개, 물품 37개)
├── CLAUDE.md                           # 이 파일
├── TODO.md                             # 미완성 작업 목록
└── GEMINI.md
```

---

## 현재 구현 상태

### 백엔드 — **완료**
- NestJS 기반 REST API 서버 (`Project/server/`)
- 13개 모듈, 82개 소스 파일, 약 58개 API 엔드포인트
- Prisma 스키마 14개 모델 — DB 스키마 완성
- JWT 인증, SMS 연동, 자동 연체 스케줄러, 감사로그 등 비즈니스 로직 완성
- Swagger UI를 통한 API 문서 자동 생성

### 프론트엔드 — **미시작**
- `Project/` 디렉토리 내에 프론트엔드 앱 미생성
- React + Vite 프로젝트 스캐폴딩부터 필요

---

## 데이터베이스 스키마 요약 (14개 모델)

| 테이블 | 설명 |
|--------|------|
| `users` | 사용자 프로필. username/student_id/phone_number Unique. 자체 JWT 인증 (bcrypt) |
| `categories` | 카테고리 (행사/체육/기타 — seed 있음). 소프트 삭제 |
| `items` | 물품 종류. `management_type`: `INDIVIDUAL`(개별관리) / `BULK`(수량관리). 소프트 삭제 |
| `item_components` | 세트(번들) 구성 — 부모 물품과 구성품 물품의 관계 |
| `item_instances` | INDIVIDUAL 물품의 개별 실물 (serial_number). 상태: AVAILABLE/RENTED/BROKEN |
| `rentals` | 대여 마스터. 상태: `RESERVED`→`RENTED`→`RETURNED`/`CANCELED`/`OVERDUE`. 소프트 삭제 |
| `rental_items` | 대여 품목 중간 테이블 (quantity + instance_id) |
| `rental_history` | 대여 상태 변경 이력 (changed_by, old/new_status, memo) |
| `plotter_orders` | 플로터 주문. 상태: `PENDING`→`CONFIRMED`→`PRINTED`→`COMPLETED`/`REJECTED`. 소프트 삭제 |
| `plotter_order_history` | 플로터 상태 변경 이력 |
| `holidays` | 관리자 지정 휴무일 |
| `configurations` | 시스템 설정 key-value (login_attempt_limit, rental_max_period_months 등) |
| `verification_codes` | SMS 인증 코드 (target, code, attempts, expires_at) — Stateless 보장 |
| `audit_log` | 시스템 활동 전체 로그 (action, target_type, target_id, details jsonb, ip_address) |
| `cart_items` | 장바구니 (user_id + item_id Unique). 대여 확정 시 자동 초기화 |

---

## 실제 물품 목록 (seed.sql 기준, 37종)

**행사 (14종):** 유선마이크(9), 무선마이크(8), 무선마이크(송수신기)(4), 대형무선앰프(6), 소형무선앰프(6), 걸이형마이크(1), 구르마소형(4), 구르마대형(5), 리드선(8), 천막(13), 테이블(27), 듀라테이블(8), 의자(97), 돗자리(8)

**체육 (10종):** 피구공(5), 축구공(1), 농구공(1), 대줄넘기(2), 줄다리기줄(5), 전자휘슬(1), 족구네트(3), 에어펌프(2), 계주봉(5), 고깔(40)

**기타 (13종):** Aux선(C타입)(3), Aux선(라이트닝)(3), Aux선(Aux)(3), 의사봉(1), 이젤(5), 삼각대(3), 경광봉(2), 빔프로젝터(1), 빔스크린(1), 화이트보드(1), 명찰(260), 몰카탐지기(8), 아이스박스(2), 확성기(1)

---

## API 엔드포인트 목록 (총 58개)

### 인증 (Auth) — 10개
- `POST /api/auth/request-signup-verification` — 회원가입 SMS 인증번호 요청 (FR-01, Throttle 3/min)
- `POST /api/auth/verify-signup-code` — 회원가입 인증번호 확인 (FR-01)
- `POST /api/auth/register` — 회원가입 (FR-01)
- `POST /api/auth/login` — 로그인, JWT 발급 (FR-03), 5회 실패 시 10분 잠금
- `POST /api/auth/logout` — 로그아웃, refreshToken 무효화
- `POST /api/auth/refresh` — AccessToken 갱신
- `POST /api/auth/find-username` — 아이디 찾기 (이름+전화번호, Throttle 3/min)
- `POST /api/auth/password-reset/request` — 비밀번호 재설정 1단계: SMS 인증번호 발송 (Throttle 3/min)
- `POST /api/auth/password-reset/verify` — 비밀번호 재설정 2단계: 코드 검증 → resetToken 발급 (10분 유효)
- `POST /api/auth/password-reset/confirm` — 비밀번호 재설정 3단계: resetToken + 새 비밀번호 확정

### 사용자 (Users) — 6개
- `GET /api/users/me` — 내 정보 조회
- `GET /api/users/me/dashboard` — 마이페이지 대시보드 요약 (대여 건수, 반납일, 플로터 상태, FR-33)
- `PUT /api/users/me` — 내 정보 수정 (current_password 필수)
- `DELETE /api/users/me` — 회원 탈퇴 (password 확인, 소프트 삭제)
- `GET /api/users` — 전체 사용자 목록 **[Admin]** (검색/정렬/페이지네이션)
- `PUT /api/users/:id/role` — 역할 변경 **[Admin]**

### 물품 (Items) — 12개
- `GET /api/items` — 목록 조회 (search, category_ids, sortBy, sortOrder)
- `GET /api/items/:id` — 상세 조회
- `GET /api/items/:id/availability` — 날짜별 재고 조회 (캘린더용, FR-32)
- `POST /api/items` — 생성 **[Admin]**
- `PUT /api/items/:id` — 수정 **[Admin]**
- `DELETE /api/items/:id` — 삭제 (소프트 삭제) **[Admin]**
- `GET /api/items/:id/instances` — 개별 실물 목록 조회 **[Admin]** (FR-34)
- `POST /api/items/:id/instances` — 개별 실물 등록 **[Admin]** (FR-34)
- `PUT /api/items/instances/:instanceId` — 개별 실물 상태 수정 **[Admin]** (FR-34)
- `DELETE /api/items/instances/:instanceId` — 개별 실물 삭제 **[Admin]** (FR-34)
- `POST /api/items/:id/components` — 세트 구성품 추가 **[Admin]** (FR-36)
- `DELETE /api/items/:id/components/:componentId` — 세트 구성품 삭제 **[Admin]** (FR-36)

### 카테고리 (Categories) — 4개
- `GET /api/categories` — 카테고리 목록
- `POST /api/categories` — 카테고리 생성 **[Admin]**
- `PUT /api/categories/:id` — 카테고리 수정 **[Admin]**
- `DELETE /api/categories/:id` — 카테고리 삭제 (소프트 삭제) **[Admin]**

### 대여 (Rentals) — 7개
- `POST /api/rentals` — 예약 생성 (start_date, end_date, items[], 세트 자동 포함)
- `POST /api/rentals/admin` — 관리자 대리 예약 생성 **[Admin]** (FR-20)
- `GET /api/rentals` — 목록 조회 (본인 또는 전체-Admin, 페이지네이션)
- `GET /api/rentals/:id` — 상세 조회
- `PUT /api/rentals/:id` — 예약 수정 (RESERVED 상태만)
- `DELETE /api/rentals/:id` — 예약 취소 (RESERVED 상태만)
- `PUT /api/rentals/:id/status` — 상태 변경 **[Admin]** (memo 필수 조건 있음)

### 플로터 (Plotter) — 5개
- `POST /api/plotter/calculate-price` — 실시간 예상 가격 계산 (purpose, paperSize, pageCount, departmentType[optional]) (FR-28)
- `POST /api/plotter/orders` — 주문 신청 (multipart/form-data, PDF 파일 검증)
- `GET /api/plotter/orders` — 목록 조회 (본인 또는 전체-Admin, 페이지네이션)
- `DELETE /api/plotter/orders/:id` — 취소 (PENDING 상태만)
- `PUT /api/plotter/orders/:id/status` — 상태 변경 **[Admin]** (REJECTED 시 rejection_reason 필수)

### 장바구니 (Cart) — 4개
- `GET /api/cart` — 내 장바구니 조회 (FR-12, FR-13)
- `POST /api/cart` — 장바구니 물품 추가 (FR-11, 동일 물품 존재 시 수량 덮어씀)
- `PUT /api/cart/:id` — 장바구니 항목 수량/날짜 수정 (FR-13, FR-14)
- `DELETE /api/cart/:id` — 장바구니 항목 제거 (FR-13)

### 관리 (Admin) — 7개
- `POST /api/admin/upload-image` — 물품 이미지 업로드 **[Admin]** (5MB, png/jpeg/jpg/webp, `items` 버킷)
- `GET /api/admin/stats` — 통계 데이터 **[Admin]**
- `GET /api/admin/holidays` — 휴무일 목록 (All Users)
- `GET /api/admin/holidays/calendar` — 월별 휴무일 캘린더 조회 (All Users, `?year=&month=`, 주말+등록휴무일 합산)
- `POST /api/admin/holidays` — 휴무일 추가 **[Admin]**
- `DELETE /api/admin/holidays/:id` — 휴무일 삭제 **[Admin]**
- `GET /api/admin/configurations` — 시스템 설정 **[Admin]**
- `PUT /api/admin/configurations` — 설정 수정 **[Admin]**

### 공통 (Common) — 3개
- `GET /api/common/health` — 시스템 헬스체크 (DB/SMS/Storage 상태, FR-37)
- `GET /api/common/metadata` — 공통 메타데이터 조회 (소속 2D 배열, 인쇄 목적 목록, 무료 목적 목록, 가격표)
- `POST /api/common/upload` — 공용 이미지 업로드 (인증 필요, jpg/png/webp, `common` 버킷)

---

## 핵심 비즈니스 규칙

### 대여 정책
- 예약 가능 기간: **오늘 기준 최대 2개월 이내**
- 운영일: **평일(월~금)** only — 주말, 공휴일, 관리자 지정 휴무일 불가
- 사용자는 **RESERVED 상태**에서만 수정/취소 가능
- 장바구니 기반 다중 물품 동시 예약
- **재고 동시성**: Prisma Transaction으로 재고 확인 + 예약 생성 원자적 처리

### 플로터 정책
- 수령일: **신청일 기준 근무일 2일 뒤** 자동 계산
- PDF 파일만 허용 (Magic Number `%PDF-` 검증)
- **PENDING 상태**에서만 취소 가능, 수정 불가 (취소 후 재신청)
- 무료 조건: 소속이 **'중앙동아리'/'중앙자치기구'** + 무료 목적(**회칙 명시 사항 인쇄, 학과 행사 목적**)
- 유료 단가: A0 = 2,000원, A1 = 1,500원
- 유료 시: 입금 계좌 표시 + 입금 내역 캡처 이미지 필수 업로드

### 인증 정책
- JWT (AccessToken 단명 + RefreshToken 갱신)
- 로그인 5회 실패 → **10분 계정 잠금** (`login_attempts`, `lock_until` 컬럼)
- SMS 인증: **5분** 유효, 하루 최대 5회 재발송, 실패 5회 시 즉시 만료
- **비밀번호 정책**: 최소 8자 이상, 영문+숫자 필수, 특수문자 `!@#$%^&*` 허용(선택) — 회원가입 및 비밀번호 재설정 시 동일 규칙 적용

### 자동화
- **자동 연체**: 매일 오전 9시(KST) 스케줄러 → RENTED 상태 중 반납일 경과 건을 OVERDUE로 변경 + SMS 발송
- **감사 로그**: 모든 CUD API 요청을 `audit_log` 테이블에 자동 기록 (인터셉터)

### SMS 알림 (FR-18)
- 물품: 예약 완료, 반납 D-1, 연체 발생
- 플로터: 주문 반려(사유 포함), 인쇄 완료(수령 안내)

---

## 화면 구조 (IA) — 프론트엔드 개발 시 참고

```
[사용자]
/ (로그인 전 메인)  →  /auth/register, /auth/login
/items (물품 목록)  →  /items/:id (물품 상세)
/cart (장바구니)    →  /checkout (대여 확정)
/print (플로터 주문)
/mypage (나의 대여/주문 현황, 회원정보 수정)

[관리자]
/admin/dashboard
/admin/items       /admin/rentals
/admin/plotter     /admin/users
/admin/operations  (휴무일/설정)
```

---

## 디자인 에셋

- **로고**: 빨강→주황 그라데이션 'ㄴ' 형태 심볼 (`Document/디자인/기본로고.png`, `프로필_로고.png`)
- **색상 팔레트**: `#410f07`(다크), `#ff0000`(Primary), `#fe6949`, `#fd9b70`, `#fccc96`, `#fbffbf`(라이트), `#f3f6d4`
- **참고 리플렛**: `Document/디자인/선본 리플렛.jpg`

---

## 개발 명령어

```bash
# 백엔드 (Project/server/ 디렉토리에서 실행)
npm install               # 의존성 설치
npm run start:dev         # 개발 서버 (watch 모드)
npm run build             # 프로덕션 빌드
npm run start:prod        # 프로덕션 실행
npm run lint              # ESLint
npm run test              # Jest 단위 테스트
npm run test:e2e          # E2E 테스트
npx prisma studio         # DB GUI 확인

# 프론트엔드 (미구현 — 생성 후 사용)
pnpm dev                  # 개발 서버
pnpm build                # 프로덕션 빌드
pnpm lint                 # ESLint
```

---

## 요구사항 ID 참조 (FR)

| FR | 내용 |
|----|------|
| FR-01 | 회원가입 + SMS 인증 (5분/5회) |
| FR-02 | 아이디 중복 확인 (실시간) |
| FR-03 | 로그인 + JWT + 5회 실패 잠금 |
| FR-04 | 아이디/비밀번호 찾기 |
| FR-05 | 회원정보 수정 |
| FR-06 | 회원 탈퇴 (소프트 삭제) |
| FR-07 | 역할 기반 접근 제어 |
| FR-08~17 | 물품 목록/검색/상세/장바구니/대여 |
| FR-18 | SMS 알림 |
| FR-19~23 | 관리자 물품/대여/사용자 관리 |
| FR-24 | 연체 정책 (자동 OVERDUE) |
| FR-25 | 물품 상태 관리 (불량 추적) |
| FR-26~31 | 플로터 주문 + 운영일 관리 |
| FR-32 | 물품 미래 재고 조회 (캘린더) |
| FR-33 | 마이페이지 대시보드 요약 |
| FR-34 | 개별 실물 자산 관리 |
| FR-35 | 공용 이미지 업로드 |
| FR-36 | 물품 세트 대여 기능 |
| FR-37 | 시스템 상태 진단 (헬스체크) |
