# RentalWeb AI Session Initialization Guide

이 문서는 Gemini CLI(또는 다른 AI 에이전트)가 세션을 시작할 때 프로젝트의 맥락을 빠르게 파악하기 위한 가이드라인입니다. 세션 시작 시 이 파일을 가장 먼저 읽고 지시에 따라 분석을 수행하세요.

## 1. 필수 분석 문서 리스트 (Priority Order)

다음 문서들을 순서대로 읽고 프로젝트의 현재 상태와 비즈니스 로직을 파악하십시오.

1.  **요구사항 명세서:** `Document/specification/요구사항_명세서_v1.0.md`
    *   **목적:** 서비스의 전체 기능 범위 및 비즈니스 규칙(대여 정책, 휴일 처리 등) 파악.
2.  **DB 스키마:** `Document/DB/DB_Schema_v1.0.md`
    *   **목적:** 데이터 모델링 구조, 테이블 간 관계 및 Prisma 스키마 설계 이해.
3.  **API 통합 명세:** `Document/API/RentalWeb_API_v1.0_통합.md`
    *   **목적:** 제공되는 엔드포인트, 요청/응답 규격 및 인증 방식 확인.
4.  **백엔드 개발 가이드:** `Document/백엔드_개발_가이드.md`
    *   **목적:** NestJS 아키텍처, 코딩 컨벤션, 에러 핸들링 및 보안 정책 파악.
5.  **시스템 기획서:** `Document/specification/시스템 기획서_v1.0.md`
    *   **목적:** UI/UX 흐름 및 서비스 운영 프로세스 이해.

## 2. 분석 시 중점 사항 (Backend Focus)

*   **역할 정의:** 본 세션은 **백엔드(Server-side) 개발 및 유지보수에만 100% 집중**함. **프론트엔드 구현, 디자인, UI/UX 개선 제안 등 프론트 관련 작업은 일체 고려하거나 신경 쓰지 않아도 됨.** 모든 결과물은 API의 안정성, 보안, 성능, 그리고 프론트엔드 개발자가 바로 연동할 수 있는 명확한 문서화(Contract)에 초점을 맞춤.
*   **현재 개발 단계:** 백엔드 핵심 기능 구현 완료 및 안정화/문서화 단계.
*   **비즈니스 핵심:** 학생회 대상 무료 대여 서비스, 휴일 제외 대여 기간 계산, SMS 인증, PDF 업로드 보안 등.
*   **기술 스택:**
    *   Backend: NestJS, Prisma, PostgreSQL, Supabase Storage, Solapi(SMS).
    *   Infra: 세션 기반 인증 대신 Stateless(JWT/Verification) 방식 지향.
*   **협업 포인트:** 프론트엔드 개발자가 즉시 연동 가능하도록 Swagger 또는 상세 Markdown API 명세를 철저히 관리할 것.

## 3. 백엔드 개발 및 검증 원칙 (Best Practices)

본 세션에서 백엔드 작업을 수행할 때는 다음 원칙을 반드시 준수하십시오.

*   **API 문서 동기화 (API Contract First - CRITICAL):** 로직 변경으로 인해 Request/Response 구조가 바뀌면, 코드를 수정하기 전이나 동시에 `Document/API/RentalWeb_API_v1.0_통합.md`를 즉시 업데이트할 것. 프론트엔드 개발자가 항상 최신 사양을 참고할 수 있도록 하는 것이 최우선임.
*   **검증 및 테스트 (Verification):** 기능 변화의 규모와 중요도에 따라 적당한 시점에 다음 스크립트들을 활용하여 핵심 API의 정상 작동 여부를 확인할 것.
    *   `Project/server/test_api_full.sh`: 전체 API 엔드포인트 종합 테스트 (Shell).
    *   `Project/server/verify_api.ps1`: 전체 API 상태 및 핵심 로직 빠른 검증 (PowerShell).
    *   `Project/server/test/full-e2e-user-flow.e2e-spec.ts`: 사용자 시나리오 전체 흐름(E2E) 검증.
    *   `Project/server/test_withdrawal.js`: 회원 탈퇴 및 데이터 처리 로직 검증.
*   **데이터 관리 (Data Management):** 데이터 구조 변경 시 `prisma/schema.prisma` 업데이트 후 `npx prisma generate`를 수행하며, 테스트 데이터가 필요할 경우 `prisma/seed.ts` 또는 `import_items.ts`를 적극 활용할 것.
*   **외부 서비스 의존성 (External Services):** SMS(Solapi), Storage(Supabase), PDF 검증(Magic Number) 등 외부 서비스 연동 로직 수정 시 `.env` 설정 확인 및 실제 연동 테스트를 수행하여 시스템 중단을 방지할 것.

## 4. 준비 완료 보고

위 문서들을 모두 분석했다면, 다음 내용을 요약하여 사용자에게 보고하고 명령을 대기하십시오.
1.  핵심 비즈니스 로직 요약 (1~2문장)
2.  현재 기술 스택 및 인프라 구성 요약
3.  즉시 수행 가능한 다음 단계 제언
