# RentalWeb Project TODO List

## 🚀 배포 및 보안 (Deployment & Security)
- [x] **회원가입 인증번호 응답 노출 제거**: 응답에서 `code` 필드 제거 완료. 현재 `message`만 반환.
- [ ] **CoolSMS(Solapi) CIDR 설정 변경**: 현재 개발용으로 `0.0.0.0/0` 설정됨. 실제 서버 배포 후 서버의 고정 IP로 제한할 것.
- [ ] **Supabase Storage 권한 설정**: Bucket 정책(Policies)에서 `authenticated` 사용자만 업로드 가능하도록 설정 확인.
- [ ] **환경 변수 점검**: `.env`의 모든 비밀키가 노출되지 않도록 서버 관리 대시보드(Railway 등)에 안전하게 등록.

## 🛠️ 백엔드 추가 작업 (Backend)
- [ ] **실제 서비스 연동 테스트**: API Key 발급 후 실제 문자 발송 및 파일 업로드 동작 확인.
- [x] **관리자용 이미지 업로드 API**: 물품 등록/수정 시 사용할 범용 이미지 업로드 API (`POST /api/admin/upload-image`) 설계 및 구현 완료.
- [x] **알림 서비스(SMS) 발송 시점 확대**: 대여 반납 D-1 알림 스케줄러 구현 완료 (`handleRentalReminder`, 매일 10:00 KST).
- [ ] **PDF 페이지 수 추출**: 필요 시 PDF 라이브러리 도입하여 실제 페이지 수 자동 검증 (FR-27 선택 사항).

## 🎨 프론트엔드 (Frontend)
- [ ] **새 프로젝트 세팅**: Vite + React + TypeScript 프로젝트 생성.
- [ ] **API 연동 계층 구현**: Axios 또는 Fetch를 사용한 백엔드 API 통신 구조 설계.
- [ ] **주요 화면 개발**: 로그인, 회원가입(SMS 인증), 물품 목록, 장바구니, 대여 캘린더 등.
