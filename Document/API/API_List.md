### **RentalWeb API 명세 목록**

**1. 인증 (Auth)**
*   `POST /api/auth/request-signup-verification` (회원가입 인증번호 요청)
*   `POST /api/auth/verify-signup-code` (회원가입 인증번호 확인)
*   `POST /api/auth/register` (회원가입)
*   `POST /api/auth/login` (로그인)
*   `POST /api/auth/logout` (로그아웃)
*   `POST /api/auth/refresh` (토큰 갱신)
*   `POST /api/auth/find-username` (아이디 찾기)
*   `POST /api/auth/password-reset/request` (비밀번호 재설정 요청)
*   `POST /api/auth/password-reset/confirm` (비밀번호 재설정 확정)

**2. 사용자 (Users)**
*   `GET /api/users/me` (내 정보 조회)
*   `PUT /api/users/me` (내 정보 수정)
*   `DELETE /api/users/me` (회원 탈퇴)
*   `GET /api/users` (전체 사용자 목록 조회 - **Admin** )
*   `PUT /api/users/{userId}/role` (사용자 역할 변경 - **Admin**)

**3. 물품 (Items & Categories)**
*   `GET /api/items` (물품 목록 조회)
*   `GET /api/items/{itemId}` (물품 상세 조회)
*   `POST /api/items` (물품 생성 - **Admin**)
*   `PUT /api/items/{itemId}` (물품 수정 - **Admin**)
*   `DELETE /api/items/{itemId}` (물품 삭제 - **Admin**)
*   `GET /api/categories` (카테고리 목록 조회)

**4. 대여 (Rentals)**
*   `POST /api/rentals` (새 대여 예약 생성)
*   `GET /api/rentals` (대여 목록 조회 - 내역 또는 전체-**Admin**)
*   `GET /api/rentals/{rentalId}` (대여 상세 조회)
*   `PUT /api/rentals/{rentalId}` (대여 정보 수정)
*   `DELETE /api/rentals/{rentalId}` (대여 예약 취소)
*   `PUT /api/rentals/{rentalId}/status` (대여 상태 변경 - **Admin**)

**5. 플로터 (Plotter)**
*   `POST /api/plotter/orders` (플로터 예약 신청)
*   `GET /api/plotter/orders` (플로터 예약 목록 조회 - 내역 또는 전체-**Admin**)
*   `DELETE /api/plotter/orders/{orderId}` (플로터 예약 취소)
*   `PUT /api/plotter/orders/{orderId}/status` (플로터 예약 상태 변경 - **Admin**)

**6. 관리 (Admin)**
*   `GET /api/admin/stats` (통계 데이터 조회 - **Admin**)
*   `GET /api/admin/holidays` (휴무일 목록 조회)
*   `POST /api/admin/holidays` (휴무일 추가 - **Admin**)
*   `DELETE /api/admin/holidays/{holidayId}` (휴무일 삭제 - **Admin**)
*   `GET /api/admin/configurations` (시스템 설정 목록 조회 - **Admin**)
*   `PUT /api/admin/configurations` (시스템 설정 수정 - **Admin**)

**7. 신규 추가 API (v1.1)**
*   `GET /api/items/{itemId}/availability` (물품 날짜별 재고 조회 - 캘린더용)
*   `GET /api/users/me/dashboard` (내 대시보드 요약 조회)
*   `GET /api/items/{itemId}/instances` (개별 실물 목록 조회 - **Admin**)
*   `POST /api/items/{itemId}/instances` (개별 실물 등록 - **Admin**)
*   `PUT /api/items/instances/{instanceId}` (개별 실물 상태 수정 - **Admin**)
*   `DELETE /api/items/instances/{instanceId}` (개별 실물 삭제 - **Admin**)
*   `POST /api/common/upload` (공용 이미지 업로드)