### **RentalWeb 데이터베이스 스키마 (v1.0)**

기획서와 요구사항 명세서를 기반으로 설계한 데이터베이스 구조입니다. 백엔드로 Supabase (Postgres) 사용을 가정합니다.

**1. `users` (사용자)**

사용자 계정 정보를 저장합니다. Supabase의 `auth.users` 테이블과 `id`로 연결되는 프로필 테이블입니다.

| 컬럼명 | 데이터 타입 | 설명 | 제약 조건 |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | 사용자 고유 ID | **Primary Key**, `auth.users.id`와 연결 |
| `name` | `varchar(30)` | 실제 이름 (동명이인 가능) | Not Null |
| `username` | `varchar(20)` | 로그인 아이디 | **Unique**, Not Null |
| `password` | `varchar(255)` | 암호화된 비밀번호 | Not Null |
| `student_id` | `varchar(20)` | 학번 | **Unique**, Not Null |
| `phone_number` | `varchar(20)` | 전화번호 | **Unique**, Not Null |
| `department` | `varchar(50)` | 소속 단위(학과, 동아리 등) | Not Null |
| `role` | `varchar(10)` | 사용자 역할 ('USER', 'ADMIN') | Not Null, Default: 'USER' |
| `created_at` | `timestampz` | 생성일 | Not Null, Default: `now()` |

**2. `categories` (물품 카테고리)**

| 컬럼명 | 데이터 타입 | 설명 | 제약 조건 |
| :--- | :--- | :--- | :--- |
| `id` | `serial` | 카테고리 ID | **Primary Key** |
| `name` | `varchar(50)` | 카테고리명 | **Unique**, Not Null |

**3. `items` (물품 종류)**

대여 가능한 물품의 종류를 정의합니다.

| 컬럼명 | 데이터 타입 | 설명 | 제약 조건 |
| :--- | :--- | :--- | :--- |
| `id` | `serial` | 물품 종류 ID | **Primary Key** |
| `category_id` | `integer` | 카테고리 ID | Foreign Key (`categories.id`) |
| `name` | `varchar(100)` | 물품명 | Not Null |
| `item_code` | `varchar(20)` | 물품 종류 코드 | **Unique**, Not Null |
| `description` | `text` | 상세 설명 (HTML 또는 Markdown) | |
| `rental_count` | `integer` | 총 대여 횟수 (인기순 정렬용) | Not Null, Default: 0 |
| `image_url` | `text` | 대표 이미지 URL | |
| `management_type` | `varchar(20)` | 관리 방식 ('INDIVIDUAL', 'BULK') | Not Null |
| `total_quantity` | `integer` | 총 보유 수량 (BULK 타입 전용) | |
| `created_at` | `timestampz` | 생성일 | Not Null, Default: `now()` |

**4. `item_instances` (개별 재고)**

`management_type`이 'INDIVIDUAL'인 물품의 개별 실물을 관리합니다.

| 컬럼명 | 데이터 타입 | 설명 | 제약 조건 |
| :--- | :--- | :--- | :--- |
| `id` | `serial` | 개별 재고 ID | **Primary Key** |
| `item_id` | `integer` | 물품 종류 ID | Foreign Key (`items.id`) |
| `serial_number` | `varchar(50)` | 자산 관리 번호 (예: 'MIC-01-01') | **Unique**, Not Null |
| `status` | `varchar(20)` | 상태 ('AVAILABLE', 'RENTED', 'BROKEN') | Not Null, Default: 'AVAILABLE' |
| `image_url` | `text` | 개별 품목 실물 이미지 URL | |
| `created_at` | `timestampz` | 최초 등록일 | Not Null, Default: `now()` |

**5. `rentals` (대여 예약)**

사용자별 대여 건의 마스터 정보입니다. 장바구니에서 '대여 확정' 시 생성됩니다.

| 컬럼명 | 데이터 타입 | 설명 | 제약 조건 |
| :--- | :--- | :--- | :--- |
| `id` | `serial` | 대여 ID | **Primary Key** |
| `user_id` | `uuid` | 대여한 사용자 ID | Foreign Key (`users.id`) |
| `start_date` | `date` | 대여 시작일 | Not Null |
| `end_date` | `date` | 반납 예정일 | Not Null |
| `status` | `varchar(20)` | 대여 상태 ('RESERVED', 'RENTED', 'RETURNED', 'CANCELED', 'OVERDUE') | Not Null, Default: 'RESERVED' |
| `created_at` | `timestampz` | 예약 생성일 | Not Null, Default: `now()` |

**6. `rental_items` (대여 품목)**

하나의 대여 건(`rentals`)에 어떤 물품(`items`)이 포함되었는지 명시하는 중간 테이블입니다. '수량'과 '개별' 관리 품목을 모두 지원합니다.

| 컬럼명 | 데이터 타입 | 설명 | 제약 조건 |
| :--- | :--- | :--- | :--- |
| `id` | `serial` | 대여 품목 고유 ID | **Primary Key** |
| `rental_id` | `integer` | 대여 ID | Foreign Key (`rentals.id`) |
| `item_id` | `integer` | 물품 종류 ID | Foreign Key (`items.id`) |
| `quantity` | `integer` | 대여 수량 (BULK 타입용) | Not Null, Default: 1 |
| `instance_id` | `integer` | 개별 재고 ID (INDIVIDUAL 타입용) | Foreign Key (`item_instances.id`), Nullable |

**7. `rental_history` (대여 이력)**

`FR-21` 요구사항을 위한 테이블. `rentals` 테이블의 상태 변경 및 개별 `rental_items`의 상태 변경 이력을 모두 기록합니다.

| 컬럼명 | 데이터 타입 | 설명 | 제약 조건 |
| :--- | :--- | :--- | :--- |
| `id` | `serial` | 이력 ID | **Primary Key** |
| `rental_id` | `integer` | 대여 ID | Foreign Key (`rentals.id`) |
| `rental_item_id` | `integer` | 대여 품목 ID (특정 품목의 이력일 경우 명시) | Foreign Key (`rental_items.id`), Nullable |
| `changed_by` | `uuid` | 변경 주체 (사용자 또는 관리자 ID) | Foreign Key (`users.id`) |
| `old_status` | `varchar(20)` | 변경 전 상태 | |
| `new_status` | `varchar(20)` | 변경 후 상태 | Not Null |
| `memo` | `text` | 비고 (예: 불량/취소 사유) | |
| `changed_at` | `timestampz` | 변경 시간 | Not Null, Default: `now()` |

**8. `plotter_orders` (플로터 주문)**

| 컬럼명 | 데이터 타입 | 설명 | 제약 조건 |
| :--- | :--- | :--- | :--- |
| `id` | `serial` | 주문 ID | **Primary Key** |
| `user_id` | `uuid` | 신청자 ID | Foreign Key (`users.id`) |
| `purpose` | `varchar(100)` | 인쇄 목적 | Not Null |
| `paper_size` | `varchar(10)` | 용지 크기 | Not Null |
| `page_count` | `integer` | 인쇄 장수 | Not Null |
| `is_paid_service` | `boolean` | 유료 여부 | Not Null |
| `price` | `integer` | 확정 금액 (무료 시 0) | Not Null, Default: 0 |
| `payment_receipt_url` | `text` | 입금 내역 캡처 이미지 URL | |
| `file_url` | `text` | 업로드한 PDF 파일 URL | Not Null |
| `original_filename` | `varchar(255)` | 원본 파일명 | |
| `file_size` | `integer` | 파일 크기 (bytes) | |
| `pickup_date` | `date` | 수령 예정일 | Not Null |
| `status` | `varchar(20)` | 주문 상태 ('PENDING', 'CONFIRMED', 'PRINTED', 'REJECTED', 'COMPLETED') | Not Null, Default: 'PENDING' |
| `rejection_reason` | `text` | 반려 사유 | |
| `created_at` | `timestampz` | 신청일 | Not Null, Default: `now()` |

**9. `plotter_order_history` (플로터 주문 이력)**

플로터 주문 건의 상태 변경 이력을 모두 기록합니다.

| 컬럼명 | 데이터 타입 | 설명 | 제약 조건 |
| :--- | :--- | :--- | :--- |
| `id` | `serial` | 이력 ID | **Primary Key** |
| `order_id` | `integer` | 주문 ID | Foreign Key (`plotter_orders.id`) |
| `changed_by` | `uuid` | 변경 주체 (관리자 ID) | Foreign Key (`users.id`) |
| `old_status` | `varchar(20)` | 변경 전 상태 | |
| `new_status` | `varchar(20)` | 변경 후 상태 | Not Null |
| `memo` | `text` | 비고 (예: 반려 사유 자동 기록) | |
| `changed_at` | `timestampz` | 변경 시간 | Not Null, Default: `now()` |

**10. `holidays` (휴무일)**

`FR-31` 요구사항을 위한 테이블. 관리자가 지정한 휴무일을 저장합니다.

| 컬럼명 | 데이터 타입 | 설명 | 제약 조건 |
| :--- | :--- | :--- | :--- |
| `id` | `serial` | ID | **Primary Key** |
| `holiday_date` | `date` | 휴무일 날짜 | **Unique**, Not Null |
| `description` | `varchar(100)` | 휴무일 설명 (예: '추석 연휴') | |

**11. `configurations` (시스템 설정)**

코드 수정 없이 주요 정책 및 시스템 변수를 관리하기 위한 테이블입니다.

| 컬럼명 | 데이터 타입 | 설명 | 제약 조건 |
| :--- | :--- | :--- | :--- |
| `config_key` | `varchar(50)` | 설정 키 (예: 'login_attempt_limit') | **Primary Key** |
| `config_value` | `varchar(255)` | 설정 값 (예: '5') | Not Null |
| `description` | `text` | 해당 설정에 대한 설명 | |
| `updated_at` | `timestampz` | 마지막 수정일 | Not Null, Default: `now()` |

**12. `verification_codes` (인증 코드)**

SMS 인증 및 비밀번호 찾기 시 발급되는 임시 코드를 관리합니다. (서버 메모리가 아닌 DB에 저장하여 Stateless 보장)

| 컬럼명 | 데이터 타입 | 설명 | 제약 조건 |
| :--- | :--- | :--- | :--- |
| `id` | `serial` | ID | **Primary Key** |
| `target` | `varchar(50)` | 인증 대상 (로그인 ID 또는 전화번호) | Not Null, Index |
| `code` | `varchar(10)` | 발급된 인증 코드 (6자리 숫자) | Not Null |
| `attempts` | `integer` | 인증 시도 횟수 | Not Null, Default: 0 |
| `expires_at` | `timestampz` | 만료 시간 | Not Null |
| `created_at` | `timestampz` | 생성 시간 | Not Null, Default: `now()` |

**13. `audit_log` (시스템 활동 로그)**

시스템의 모든 주요 활동을 기록하여 보안 및 책임 추적성을 확보합니다.

| 컬럼명 | 데이터 타입 | 설명 | 제약 조건 |
| :--- | :--- | :--- | :--- |
| `id` | `bigserial` | 로그 ID | **Primary Key** |
| `user_id` | `uuid` | 활동을 수행한 사용자 ID (시스템 자체 활동은 NULL) | Foreign Key (`users.id`) |
| `action` | `varchar(50)` | 수행된 활동 종류 (예: 'USER_LOGIN', 'ITEM_CREATE') | Not Null |
| `target_type` | `varchar(50)` | 활동의 대상이 된 테이블 (예: 'items', 'rentals') | |
| `target_id` | `text` | 활동 대상의 ID | |
| `details` | `jsonb` | 변경 전/후 데이터 등 상세 정보 | |
| `ip_address` | `inet` | 활동을 수행한 곳의 IP 주소 | |
| `created_at` | `timestampz` | 활동 발생 시간 | Not Null, Default: `now()` |