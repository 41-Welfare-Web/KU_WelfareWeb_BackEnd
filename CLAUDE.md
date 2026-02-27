# CLAUDE.md — RentalWeb 프로젝트

Claude Code가 이 프로젝트에서 작업할 때 참고하는 컨텍스트 파일입니다.

---

## 프로젝트 개요

**RentalWeb**은 대학교 내 구성원(학과, 동아리 등)을 위한 **물품 대여 및 플로터 출력 주문** 서비스입니다.
- **대여 요금 없음** (학생 복지 서비스)
- 역할 기반 접근 제어: `USER` / `ADMIN`

---

## 기술 스택

| 분류 | 기술 |
|------|------|
| Frontend | React 18 + Vite + TypeScript |
| UI | shadcn/ui + Radix UI + Tailwind CSS |
| 라우팅 | React Router DOM v6 (HashRouter) |
| 서버 상태 | TanStack Query v5 |
| 폼 | React Hook Form + Zod |
| 패키지 매니저 | **pnpm** |
| Backend | **Supabase Edge Functions** (Deno 런타임) |
| DB | Supabase PostgreSQL |
| 배포 | Vercel (FE) / Supabase (BE) |

> **[중요]** `스택_정리.md`에는 NestJS/Railway가 기술되어 있으나, 실제 구현 브랜치(`supabase_backend`)는 **Supabase Edge Functions**를 사용합니다.

---

## 폴더 구조

```
RentalWeb/
├── Project/                    # 프론트엔드 React 앱 (작업 메인 디렉토리)
│   ├── src/
│   │   ├── components/ui/      # shadcn/ui 컴포넌트 (전부 설치됨)
│   │   ├── pages/              # Index.tsx, About.tsx, NotFound.tsx (현재 스캐폴드)
│   │   ├── hooks/              # use-mobile.tsx, use-toast.ts
│   │   └── lib/                # utils.ts
│   ├── supabase/
│   │   └── edge_function/      # Deno Edge Functions
│   │       └── tests/          # Edge Function 테스트
│   ├── package.json / pnpm-lock.yaml
│   └── vite.config.ts
├── Document/
│   ├── API/RentalWeb_API_v1.0_통합.md   # 전체 API 명세
│   ├── DB_Schema_v1.0.md                # DB 스키마
│   ├── 시스템 기획서_v1.0.md            # 기획서
│   ├── 요구사항_명세서_v1.0.md          # 요구사항 명세서 (FR-01~FR-31)
│   └── 스택_정리.md                     # 기술 스택 선정 문서
├── supabase/
│   └── seed.sql                # DB 초기 데이터 (카테고리 3개, 물품 37개)
└── CLAUDE.md                   # 이 파일
```

---

## 현재 구현 상태

- 프론트엔드 **스캐폴드 단계** — 라우트 선언만 있고, 실제 페이지는 "준비 중" placeholder
- shadcn/ui 컴포넌트 전체 설치 완료
- `App.tsx`: HashRouter 사용, 아래 라우트 선언됨:
  - `/` (Index), `/about`, `/greeting`, `/projects`, `/organization`
  - `/rental` (중앙대여사업), `/print` (플로터), `/board`

---

## 데이터베이스 스키마 요약 (12개 테이블)

| 테이블 | 설명 |
|--------|------|
| `users` | `auth.users.id`와 연결되는 프로필. username/student_id/phone_number Unique |
| `categories` | 카테고리 (행사/체육/기타 — seed 있음) |
| `items` | 물품 종류. `management_type`: `INDIVIDUAL`(개별관리) / `BULK`(수량관리) |
| `item_instances` | INDIVIDUAL 물품의 개별 실물 (serial_number) |
| `rentals` | 대여 마스터. 상태: `RESERVED`→`RENTED`→`RETURNED`/`CANCELED`/`OVERDUE` |
| `rental_items` | 대여 품목 중간 테이블 (quantity + instance_id) |
| `rental_history` | 상태 변경 이력 (changed_by, old/new_status, memo) |
| `plotter_orders` | 플로터 주문. 상태: `PENDING`→`CONFIRMED`→`PRINTED`→`COMPLETED`/`REJECTED` |
| `plotter_order_history` | 플로터 상태 변경 이력 |
| `holidays` | 관리자 지정 휴무일 |
| `configurations` | 시스템 설정 (login_attempt_limit, rental_max_period_months 등) |
| `audit_log` | 시스템 활동 전체 로그 (action, target_type, target_id, details jsonb) |

---

## 실제 물품 목록 (seed.sql 기준, 37종)

**행사 (14종):** 유선마이크(9), 무선마이크(8), 무선마이크(송수신기)(4), 대형무선앰프(6), 소형무선앰프(6), 걸이형마이크(1), 구르마소형(4), 구르마대형(5), 리드선(8), 천막(13), 테이블(27), 듀라테이블(8), 의자(97), 돗자리(8)

**체육 (10종):** 피구공(5), 축구공(1), 농구공(1), 대줄넘기(2), 줄다리기줄(5), 전자휘슬(1), 족구네트(3), 에어펌프(2), 계주봉(5), 고깔(40)

**기타 (13종):** Aux선(C타입)(3), Aux선(라이트닝)(3), Aux선(Aux)(3), 의사봉(1), 이젤(5), 삼각대(3), 경광봉(2), 빔프로젝터(1), 빔스크린(1), 화이트보드(1), 명찰(260), 몰카탐지기(8), 아이스박스(2), 확성기(1)

---

## API 엔드포인트 목록

### 인증 (Auth)
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

### 사용자 (Users)
- `GET /api/users/me` — 내 정보 조회
- `PUT /api/users/me` — 내 정보 수정 (current_password 필수)
- `DELETE /api/users/me` — 회원 탈퇴 (password 확인)
- `GET /api/users` — 전체 사용자 목록 **[Admin]** (검색/정렬/페이지네이션)
- `PUT /api/users/{user_id}/role` — 역할 변경 **[Admin]**

### 물품 (Items & Categories)
- `GET /api/items` — 목록 조회 (search, category_ids, sortBy, sortOrder)
- `GET /api/items/{item_id}` — 상세 조회
- `GET /api/items/{item_id}/availability` — 날짜별 재고 조회 (캘린더용, FR-32)
- `POST /api/items` — 생성 **[Admin]**
- `PUT /api/items/{item_id}` — 수정 **[Admin]**
- `DELETE /api/items/{item_id}` — 삭제 **[Admin]**
- `GET /api/items/{item_id}/instances` — 개별 실물 목록 조회 **[Admin]** (FR-34)
- `POST /api/items/{item_id}/instances` — 개별 실물 등록 **[Admin]** (FR-34)
- `PUT /api/items/instances/{instance_id}` — 개별 실물 상태 수정 **[Admin]** (FR-34)
- `DELETE /api/items/instances/{instance_id}` — 개별 실물 삭제 **[Admin]** (FR-34)
- `POST /api/items/{item_id}/components` — 세트 구성품 추가 **[Admin]** (FR-36)
- `DELETE /api/items/{item_id}/components/{component_id}` — 세트 구성품 삭제 **[Admin]** (FR-36)
- `GET /api/categories` — 카테고리 목록
- `POST /api/categories` — 카테고리 생성 **[Admin]**
- `PUT /api/categories/{id}` — 카테고리 수정 **[Admin]**
- `DELETE /api/categories/{id}` — 카테고리 삭제 **[Admin]**

### 대여 (Rentals)
- `POST /api/rentals` — 예약 생성 (start_date, end_date, items[], 세트 자동 포함)
- `POST /api/rentals/admin` — 관리자 대리 예약 생성 **[Admin]** (FR-20)
- `GET /api/rentals` — 목록 조회 (본인 또는 전체-Admin)
- `GET /api/rentals/{rental_id}` — 상세 조회
- `PUT /api/rentals/{rental_id}` — 예약 수정 (RESERVED 상태만)
- `DELETE /api/rentals/{rental_id}` — 예약 취소 (RESERVED 상태만)
- `PUT /api/rentals/{rental_id}/status` — 상태 변경 **[Admin]** (memo 필수 조건 있음)

### 플로터 (Plotter)
- `POST /api/plotter/calculate-price` — 실시간 예상 가격 계산 (FR-28)
- `POST /api/plotter/orders` — 주문 신청 (multipart/form-data, PDF 파일 검증)
- `GET /api/plotter/orders` — 목록 조회
- `DELETE /api/plotter/orders/{order_id}` — 취소 (PENDING 상태만)
- `PUT /api/plotter/orders/{order_id}/status` — 상태 변경 **[Admin]** (REJECTED 시 rejection_reason 필수)

### 장바구니 (Cart)
- `GET /api/cart` — 내 장바구니 조회 (FR-12, FR-13)
- `POST /api/cart` — 장바구니 물품 추가 (FR-11, 동일 물품 존재 시 수량 덮어씀)
- `PUT /api/cart/{cart_item_id}` — 장바구니 항목 수량/날짜 수정 (FR-13, FR-14)
- `DELETE /api/cart/{cart_item_id}` — 장바구니 항목 제거 (FR-13)

### 관리 (Admin)
- `POST /api/admin/upload-image` — 물품 이미지 업로드 **[Admin]** (5MB, png/jpeg/jpg/webp, `items` 버킷)
- `GET /api/admin/stats` — 통계 데이터
- `GET /api/admin/holidays` — 휴무일 목록 (All Users)
- `POST /api/admin/holidays` — 휴무일 추가 **[Admin]**
- `DELETE /api/admin/holidays/{holiday_id}` — 휴무일 삭제 **[Admin]**
- `GET /api/admin/configurations` — 시스템 설정 **[Admin]**
- `PUT /api/admin/configurations` — 설정 수정 **[Admin]**

### 공통 (Common)
- `GET /api/common/health` — 시스템 헬스체크 (DB/SMS/Storage 상태, FR-37)
- `GET /api/common/metadata` — 공통 메타데이터 조회 (소속 목록, 무료 목적 목록, 가격표)
- `POST /api/common/upload` — 공용 이미지 업로드 (인증 필요, jpg/png/webp, `common` 버킷)

### 사용자 (Users) — 추가 엔드포인트
- `GET /api/users/me/dashboard` — 마이페이지 대시보드 요약 (대여 건수, 반납일, 플로터 상태, FR-33)

---

## 핵심 비즈니스 규칙

### 대여 정책
- 예약 가능 기간: **오늘 기준 최대 2개월 이내**
- 운영일: **평일(월~금)** only — 주말, 공휴일, 관리자 지정 휴무일 불가
- 사용자는 **RESERVED 상태**에서만 수정/취소 가능
- 장바구니 기반 다중 물품 동시 예약

### 플로터 정책
- 수령일: **신청일 기준 근무일 2일 뒤** 자동 계산
- PDF 파일만 허용 (Magic Number 검증 + 페이지 수 검증)
- **PENDING 상태**에서만 취소 가능, 수정 불가 (취소 후 재신청)
- 무료 조건: 소속이 **'중앙동아리'/'자치기구'** + 지정된 무료 목적
- 유료 시: 입금 계좌 표시 + 입금 내역 캡처 이미지 필수 업로드

### 인증 정책
- JWT (AccessToken 단명 + RefreshToken 갱신)
- 로그인 5회 실패 → **10분 계정 잠금**
- SMS 인증: **5분** 유효, 하루 최대 5회 재발송, 실패 5회 시 즉시 만료

### SMS 알림 (FR-18)
- 물품: 예약 완료, 반납 D-1, 연체 발생
- 플로터: 주문 반려(사유 포함), 인쇄 완료(수령 안내)

---

## 화면 구조 (IA)

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

## 개발 명령어

```bash
# Project/ 디렉토리에서 실행
pnpm dev              # 개발 서버
pnpm build            # 프로덕션 빌드
pnpm lint             # ESLint
pnpm test:edge-functions  # Deno Edge Function 테스트
```

---

## 요구사항 ID 참조 (FR)

| FR | 내용 |
|----|------|
| FR-01 | 회원가입 + SMS 인증 (5분/5회) |
| FR-02 | 아이디 중복 확인 (실시간) |
| FR-03 | 로그인 + JWT + 5회 실패 잠금 |
| FR-07 | 역할 기반 접근 제어 |
| FR-08~17 | 물품 목록/검색/상세/장바구니/대여 |
| FR-18 | SMS 알림 |
| FR-19~23 | 관리자 물품/대여/사용자 관리 |
| FR-26~31 | 플로터 주문 + 운영일 관리 |
