### **RentalWeb 데이터베이스 스키마 (v1.0.1)**

최종 수정일: 2026-03-11 (Actual Code 기준 동기화 완료)

---

#### **0. 공통 Enum 타입**

| 타입명 | 값 (Values) | 설명 |
| :--- | :--- | :--- |
| `Role` | `USER`, `ADMIN` | 사용자 권한 |
| `ManagementType` | `INDIVIDUAL`, `BULK` | 물품 관리 방식 (개별 시리얼 vs 단순 수량) |
| `InstanceStatus` | `AVAILABLE`, `RENTED`, `BROKEN` | 개별 품목 실물 상태 |
| `RentalStatus` | `RESERVED`, `RENTED`, `RETURNED`, `CANCELED`, `OVERDUE` | 대여 예약 상태 |
| `PlotterStatus` | `PENDING`, `CONFIRMED`, `PRINTED`, `REJECTED`, `COMPLETED` | 플로터 주문 상태 |

---

#### **1. `users` (사용자)**

| 컬럼명 | 데이터 타입 | 설명 | 제약 조건 |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | 사용자 고유 ID | **Primary Key** |
| `name` | `varchar(30)` | 실명 | Not Null |
| `username` | `varchar(20)` | 로그인 아이디 | **Unique**, Not Null |
| `password` | `varchar(255)` | bcrypt 해싱된 비밀번호 | Not Null |
| `student_id` | `varchar(20)` | 학번 | **Unique**, Not Null |
| `phone_number` | `varchar(20)` | 전화번호 | **Unique**, Not Null |
| `department_type` | `varchar(30)` | 소속 유형 | Not Null |
| `department_name` | `varchar(50)` | 소속 단위명 | Nullable |
| `role` | `enum(Role)` | 권한 | Default: `USER` |
| `login_attempts` | `integer` | 로그인 실패 횟수 | Default: 0 |
| `lock_until` | `timestampz` | 계정 잠금 만료 시간 | |
| `deleted_at` | `timestampz` | 소프트 삭제 시간 | |
| `created_at` | `timestampz` | 생성일 | Default: `now()` |

#### **2. `categories` (카테고리)**

| 컬럼명 | 데이터 타입 | 설명 | 제약 조건 |
| :--- | :--- | :--- | :--- |
| `id` | `serial` | ID | **Primary Key** |
| `name` | `varchar(50)` | 카테고리명 (행사, 체육, 음향기기, 기타 등) | **Unique**, Not Null |
| `deleted_at` | `timestampz` | 소프트 삭제 시간 | |

#### **3. `items` (물품 종류)**

| 컬럼명 | 데이터 타입 | 설명 | 제약 조건 |
| :--- | :--- | :--- | :--- |
| `id` | `serial` | ID | **Primary Key** |
| `category_id` | `integer` | 카테고리 ID | Foreign Key (`categories.id`) |
| `name` | `varchar(100)` | 물품명 (예: 천막, 피구공, 유선마이크) | Not Null |
| `item_code` | `varchar(20)` | 물품 코드 (카테고리 ID를 백의 자리로 사용: 101, 202, 303 등) | **Unique**, Not Null |
| `description` | `text` | 상세 설명 | |
| `rental_count` | `integer` | 총 대여 횟수 | Default: 0 |
| `image_url` | `text` | 대표 이미지 URL | |
| `video_url` | `text` | 가이드 영상 URL | |
| `management_type` | `enum(ManagementType)` | 관리 방식 | Not Null |
| `total_quantity` | `integer` | 총 보유 수량 (BULK 전용) | |
| `deleted_at` | `timestampz` | 소프트 삭제 시간 | |
| `created_at` | `timestampz` | 생성일 | Default: `now()` |

#### **3-1. `item_images` (물품 추가 이미지)**

| 컬럼명 | 데이터 타입 | 설명 | 제약 조건 |
| :--- | :--- | :--- | :--- |
| `id` | `serial` | ID | **Primary Key** |
| `item_id` | `integer` | 물품 ID | Foreign Key (`items.id`, On Delete Cascade) |
| `image_url` | `text` | 이미지 URL | Not Null |
| `order` | `integer` | 출력 순서 | Default: 0 |
| `created_at` | `timestampz` | 등록 시간 | Default: `now()` |

#### **4. `item_instances` (개별 재고)**

| 컬럼명 | 데이터 타입 | 설명 | 제약 조건 |
| :--- | :--- | :--- | :--- |
| `id` | `serial` | ID | **Primary Key** |
| `item_id` | `integer` | 물품 ID | Foreign Key (`items.id`) |
| `serial_number` | `varchar(50)` | 시리얼 번호 | **Unique**, Not Null |
| `status` | `enum(InstanceStatus)` | 상태 | Default: `AVAILABLE` |
| `image_url` | `text` | 개별 이미지 URL | |
| `deleted_at` | `timestampz` | 소프트 삭제 시간 | |

#### **5. `rentals` (대여 예약)**

| 컬럼명 | 데이터 타입 | 설명 | 제약 조건 |
| :--- | :--- | :--- | :--- |
| `id` | `serial` | ID | **Primary Key** |
| `user_id` | `uuid` | 사용자 ID | Foreign Key (`users.id`) |
| `start_date` | `date` | 대여 시작일 | Not Null |
| `end_date` | `date` | 반납 예정일 | Not Null |
| `department_type` | `varchar(30)` | 신청 당시 소속 유형 | Not Null |
| `department_name` | `varchar(50)` | 신청 당시 소속 단위명 | |
| `status` | `enum(RentalStatus)` | 대여 상태 | Default: `RESERVED` |
| `memo` | `text` | 관리자 비고 | |
| `deleted_at` | `timestampz` | 소프트 삭제 시간 | |
| `created_at` | `timestampz` | 생성일 | Default: `now()` |

#### **8. `plotter_orders` (플로터 주문)**

| 컬럼명 | 데이터 타입 | 설명 | 제약 조건 |
| :--- | :--- | :--- | :--- |
| `id` | `serial` | ID | **Primary Key** |
| `user_id` | `uuid` | 사용자 ID | Foreign Key (`users.id`) |
| `purpose` | `varchar(100)` | 인쇄 목적 | Not Null |
| `paper_size` | `varchar(10)` | 용지 크기 (`A0`, `A1`) | Not Null |
| `page_count` | `integer` | 출력 페이지 수 | Not Null |
| `is_paid_service` | `boolean` | 유료 여부 | Not Null |
| `price` | `integer` | 청구 금액 (원) | Default: 0 |
| `payment_receipt_url` | `text` | 입금 영수증 이미지 URL | |
| `department_type` | `varchar(30)` | 신청 당시 소속 유형 | Not Null |
| `department_name` | `varchar(50)` | 신청 당시 소속 단위명 | |
| `file_url` | `text` | 업로드된 PDF 파일 URL | Not Null |
| `original_filename` | `varchar(255)` | 원본 파일명 | |
| `file_size` | `integer` | 파일 크기 (bytes) | |
| `pickup_date` | `date` | 수령 예정일 (신청일 기준 근무일 +2) | Not Null |
| `status` | `enum(PlotterStatus)` | 주문 상태 | Default: `PENDING` |
| `rejection_reason` | `text` | 반려 사유 (`REJECTED` 시) | |
| `memo` | `text` | 관리자 메모 | |
| `deleted_at` | `timestampz` | 소프트 삭제 시간 | |
| `created_at` | `timestampz` | 생성일 | Default: `now()` |

#### **12. `verification_codes` (인증 코드 - Stateless)**

| 컬럼명 | 데이터 타입 | 설명 | 제약 조건 |
| :--- | :--- | :--- | :--- |
| `id` | `serial` | ID | **Primary Key** |
| `target` | `varchar(50)` | 인증 대상 (ID/전화번호) | **Index**, Not Null |
| `code` | `varchar(10)` | 6자리 코드 | Not Null |
| `attempts` | `integer` | 인증 시도 횟수 | Default: 0 |
| `expires_at` | `timestampz` | 만료 시간 | Not Null |
| `created_at` | `timestampz` | 발급 시간 | Default: `now()` |

*(나머지 테이블들은 v1.0과 동일하되, Enum 타입 적용 및 Map 필드 매핑 정보를 최신화하여 유지함)*
