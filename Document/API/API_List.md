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
*   `POST /api/auth/password-reset/verify` (비밀번호 재설정 코드 검증 → resetToken 발급)
*   `POST /api/auth/password-reset/confirm` (비밀번호 재설정 확정 - resetToken + 새 비밀번호)

**2. 사용자 (Users)**
*   `GET /api/users/me` (내 정보 조회)
*   `PUT /api/users/me` (내 정보 수정)
*   `DELETE /api/users/me` (회원 탈퇴 - 소프트 삭제)
*   `GET /api/users` (전체 사용자 목록 조회 - **Admin** )
*   `PUT /api/users/{userId}/role` (사용자 역할 변경 - **Admin**)

**3. 물품 (Items & Categories)**
*   `GET /api/items` (물품 목록 조회)
*   `GET /api/items/{itemId}` (물품 상세 조회)
*   `POST /api/items` (물품 생성 - **Admin**)
*   `PUT /api/items/{itemId}` (물품 수정 - **Admin**)
*   `DELETE /api/items/{itemId}` (물품 삭제 - 소프트 삭제 - **Admin**)
*   `POST /api/items/{itemId}/components` (세트 구성품 추가 - **Admin**)
*   `DELETE /api/items/{itemId}/components/{componentId}` (세트 구성품 삭제 - **Admin**)
*   `GET /api/categories` (카테고리 목록 조회)
*   `POST /api/categories` (카테고리 생성 - **Admin**)
*   `PUT /api/categories/{categoryId}` (카테고리 수정 - **Admin**)
*   `DELETE /api/categories/{categoryId}` (카테고리 삭제 - 소프트 삭제 - **Admin**)

**4. 대여 (Rentals)**
*   `POST /api/rentals` (새 대여 예약 생성 - 세트 자동 포함)
*   `POST /api/rentals/admin` (사용자 대여 대리 신청 - **Admin**)
*   `GET /api/rentals` (대여 목록 조회 - 내역 또는 전체-**Admin**)
*   `GET /api/rentals/{rentalId}` (대여 상세 조회)
*   `PUT /api/rentals/{rentalId}` (대여 정보 수정 - 날짜/수량)
*   `DELETE /api/rentals/{rentalId}` (대여 예약 취소)
*   `PUT /api/rentals/{rentalId}/status` (대여 상태 변경 - **Admin**)

**5. 플로터 (Plotter)**
*   `POST /api/plotter/calculate-price` (플로터 실시간 예상 가격 계산 - **Auth**)
*   `POST /api/plotter/orders` (플로터 예약 신청)
*   `GET /api/plotter/orders` (플로터 예약 목록 조회 - 내역 또는 전체-**Admin**)
*   `DELETE /api/plotter/orders/{id}` (플로터 예약 취소 - 소프트 삭제)
*   `PUT /api/plotter/orders/{id}/status` (플로터 예약 상태 변경 - **Admin**)

**6. 관리 (Admin)**
*   `POST /api/admin/upload-image` (물품 이미지 업로드 - **Admin** 전용, 5MB 제한, png/jpeg/jpg/webp, `items` 버킷)
*   `GET /api/admin/stats` (통계 데이터 조회 - **Admin**)
*   `GET /api/admin/holidays` (휴무일 목록 조회 - **All**)
*   `POST /api/admin/holidays` (휴무일 추가 - **Admin**)
*   `DELETE /api/admin/holidays/{id}` (휴무일 삭제 - **Admin**)
*   `GET /api/admin/configurations` (시스템 설정 목록 조회 - **Admin**)
*   `PUT /api/admin/configurations` (시스템 설정 수정 - **Admin**)

**7. 신규 추가 API (v1.3)**
*   `GET /api/common/health` (시스템 헬스체크 및 서비스 진단)
*   `GET /api/common/metadata` (공통 메타데이터 조회 - 소속 리스트, 가격 등)
*   `GET /api/items/{itemId}/availability` (물품 날짜별 재고 조회 - 캘린더용)
*   `GET /api/users/me/dashboard` (내 대시보드 요약 조회)
*   `GET /api/items/{itemId}/instances` (개별 실물 목록 조회 - **Admin**)
*   `POST /api/items/{itemId}/instances` (개별 실물 등록 - **Admin**)
*   `PUT /api/items/instances/{instanceId}` (개별 실물 상태 수정 - **Admin**)
*   `DELETE /api/items/instances/{instanceId}` (개별 실물 삭제 - 소프트 삭제 - **Admin**)
*   `POST /api/common/upload` (공용 이미지 업로드)

**8. 장바구니 (Cart)**
*   `GET /api/cart` (내 장바구니 조회 - FR-12, FR-13)
*   `POST /api/cart` (장바구니 물품 추가 - FR-11)
*   `PUT /api/cart/{cartItemId}` (장바구니 항목 수정 - 수량/날짜 - FR-13, FR-14)
*   `DELETE /api/cart/{cartItemId}` (장바구니 항목 제거 - FR-13)
