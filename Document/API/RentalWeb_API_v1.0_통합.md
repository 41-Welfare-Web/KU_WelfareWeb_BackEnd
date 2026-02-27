**[주의] 이 문서는 RentalWeb 서비스의 통합 API 명세서입니다. 분류별로 분리된 문서들은 이 문서의 내용을 기반으로 합니다.**

### **RentalWeb API 명세서 (v1.0)**

이 문서는 RentalWeb 프론트엔드와 백엔드 간의 데이터 통신을 위한 API 엔드포인트를 정의합니다.

> 💡 **Tip:** 이 문서의 모든 내용은 서버 실행 후 **[Swagger UI (http://localhost:3000/api-docs)](http://localhost:3000/api-docs)**를 통해 웹 화면으로 더 편하게 확인하고 직접 테스트해 볼 수 있습니다.

---
### **1. 인증 (Auth)**

# 회원가입 인증번호 요청 (Request Signup Verification)

`FR-01` 요구사항에 따라, 회원가입을 위한 SMS 인증번호를 요청합니다.

## **ENDPOINT:** `POST /api/auth/request-signup-verification`
**Description:** 입력한 전화번호로 6자리 인증번호를 발송합니다. 보안 및 어뷰징 방지를 위해 하루 최대 5회까지만 요청 가능합니다.
**Required Permissions:** All Users

---

##### **Request Body**

```json
{
  "phoneNumber": "01012345678"
}
```
* `phoneNumber`: (string, required) 하이픈 없는 전화번호 형식.

---

##### **Responses**

*   **Success Response (`200 OK`)**

```json
{
  "message": "인증번호가 발송되었습니다."
}
```

*   **Error Responses**

| HTTP Code | Error Code | 설명 |
| :--- | :--- | :--- |
| `400 Bad Request` | `LIMIT_EXCEEDED` | 하루 최대 발송 횟수(5회)를 초과했을 때 |
| `409 Conflict` | `DUPLICATE_PHONE_NUMBER` | 이미 가입된 전화번호일 때 |
| `500 Internal Server Error` | `SERVER_ERROR` | 서버 내부 에러 (Solapi 설정 누락 등) |

---

# 회원가입 인증번호 확인 (Verify Signup Code)

사용자가 입력한 인증번호가 유효한지 확인합니다.

## **ENDPOINT:** `POST /api/auth/verify-signup-code`
**Description:** 서버에 저장된 인증번호와 사용자가 입력한 번호를 비교합니다. 이 API의 성공 여부에 따라 프론트엔드에서 회원가입 버튼을 활성화할 수 있습니다.
**Required Permissions:** All Users

---

##### **Request Body**

```json
{
  "phoneNumber": "01012345678",
  "verificationCode": "123456"
}
```
* `phoneNumber`: (string, required) 인증번호를 요청했던 전화번호.
* `verificationCode`: (string, required) 사용자가 입력한 6자리 코드.

---

##### **Responses**

*   **Success Response (`200 OK`)**

```json
{
  "success": true,
  "message": "인증에 성공하였습니다."
}
```

*   **Error Responses**

| HTTP Code | Error Code | 설명 |
| :--- | :--- | :--- |
| `400 Bad Request` | `INVALID_CODE` | 코드가 틀렸거나 만료되었을 때 |

---

# 회원가입 (Register)

`FR-01` 요구사항에 따라, 새로운 사용자 계정을 생성합니다. 성공 시, 생성된 사용자 정보와 로그인 유지를 위한 토큰을 반환합니다.

## **ENDPOINT:** `POST /api/auth/register`
**Description:** 사용자로부터 가입 정보를 받아 새로운 계정을 생성하고, `users` 테이블에 프로필 정보를 저장합니다.
**Required Permissions:** All Users

---

##### **Request Body**

```json
{
  "username": "testuser",
  "password": "password123!",
  "name": "김테스트",
  "studentId": "202412345",
  "phoneNumber": "01012345678",
  "departmentType": "학과",
  "departmentName": "컴퓨터공학과",
  "verificationCode": "123456"
}
```
* `username`: (string, required) 로그인 아이디. 5~20자의 영문 소문자, 숫자만 가능.
* `password`: (string, required) 비밀번호. 최소 8자 이상, 영문, 숫자, 특수문자 포함.
* `name`: (string, required) 실제 이름.
* `studentId`: (string, required) 학번.
* `phoneNumber`: (string, required) 전화번호. 하이픈 없이 입력.
* `departmentType`: (string, required) 소속 유형 (총학생회, 학과, 중앙동아리 등).
* `departmentName`: (string, optional) 소속 단위명 (예: 컴퓨터공학과). 총학생회 등 일부 유형은 생략 가능.
* `verificationCode`: (string, required) SMS로 인증받은 6자리 코드. 최종 가입 시 서버에서 한 번 더 검증합니다.

---

##### **Responses**

*   **Success Response (`201 Created`)**

```json
{
  "user": {
    "id": "a1b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5p6",
    "username": "testuser",
    "name": "김테스트",
    "role": "USER"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "def50200f0a8e9..."
}
```

*   **Error Responses**

| HTTP Code | Error Code | 설명 |
| :--- | :--- | :--- |
| `400 Bad Request` | `INVALID_INPUT` | 요청값이 유효성 규칙에 맞지 않을 때 |
| `409 Conflict` | `DUPLICATE_USERNAME` | `username`이 이미 존재할 때 |
| `409 Conflict` | `DUPLICATE_STUDENT_ID` | `studentId`가 이미 존재할 때 |
| `409 Conflict` | `DUPLICATE_PHONE_NUMBER` | `phoneNumber`가 이미 존재할 때 |
| `500 Internal Server Error` | `SERVER_ERROR` | 서버 내부 로직 처리 중 에러 발생 |

---
# 아이디 찾기 (Find Username)

`FR-04` 요구사항에 따라, 이름과 전화번호로 사용자의 아이디를 찾습니다.

## **ENDPOINT:** `POST /api/auth/find-username`
**Description:** 이름과 전화번호가 일치하는 사용자를 찾아, 해당 전화번호로 아이디를 SMS 발송합니다.
**Required Permissions:** All Users

---

##### **Request Body**

```json
{
  "name": "김테스트",
  "phoneNumber": "01012345678"
}
```
* `name`: (string, required) 가입 시 입력한 실제 이름.
* `phoneNumber`: (string, required) 가입 시 인증한 전화번호. 하이픈 없이 입력.

---

##### **Responses**

*   **Success Response (`200 OK`)**

```json
{
  "message": "요청이 접수되었습니다. 가입된 정보와 일치하는 경우, SMS로 아이디를 발송해 드립니다."
}
```
*   **Note:** 사용자 정보 존재 여부를 알려주지 않기 위해, 성공/실패 시 모두 동일한 메시지를 반환합니다.

---
# 비밀번호 재설정 요청 (Request Password Reset)

`FR-04` 요구사항에 따라, 비밀번호 재설정을 위한 인증 코드를 요청합니다.

## **ENDPOINT:** `POST /api/auth/password-reset/request`
**Description:** 아이디와 전화번호가 일치하는 사용자를 찾아, 비밀번호를 재설정할 수 있는 임시 인증 코드를 SMS로 발송합니다.
**Required Permissions:** All Users

---

##### **Request Body**

```json
{
  "username": "testuser",
  "phoneNumber": "01012345678"
}
```
* `username`: (string, required) 아이디.
* `phoneNumber`: (string, required) 가입 시 인증한 전화번호. 하이픈 없이 입력.

---

##### **Responses**

*   **Success Response (`200 OK`)**

```json
{
  "message": "요청이 접수되었습니다. 가입된 정보와 일치하는 경우, SMS로 인증 코드를 발송해 드립니다."
}
```

---
# 비밀번호 재설정 코드 검증 (Verify Password Reset)

`FR-04` 요구사항에 따라, SMS 인증 코드의 유효성을 검증하고 비밀번호 변경에 사용할 `resetToken`을 발급합니다.

## **ENDPOINT:** `POST /api/auth/password-reset/verify`
**Description:** SMS로 발급받은 인증 코드가 유효한지 확인하고, 성공 시 비밀번호 변경용 단기 토큰(`resetToken`)을 반환합니다. 코드는 1회 사용 후 즉시 삭제됩니다.
**Required Permissions:** All Users

---

##### **Request Body**

```json
{
  "username": "testuser",
  "verificationCode": "123456"
}
```
* `username`: (string, required) 아이디.
* `verificationCode`: (string, required) SMS로 수신한 인증 코드.

---

##### **Responses**

*   **Success Response (`200 OK`)**

```json
{
  "resetToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```
* `resetToken`: 비밀번호 변경 시 사용하는 JWT. **유효기간 10분**.

*   **Error Responses**

| HTTP Code | Error Code | 설명 |
| :--- | :--- | :--- |
| `400 Bad Request` | `INVALID_VERIFICATION_CODE` | 인증 코드가 일치하지 않거나 만료되었을 때 |
| `400 Bad Request` | `TOO_MANY_ATTEMPTS` | 인증 5회 실패로 코드 삭제 후 재요청 필요 |

---
# 비밀번호 재설정 확정 (Confirm Password Reset)

`FR-04` 요구사항에 따라, `resetToken`과 새 비밀번호를 받아 비밀번호를 최종 변경합니다.

## **ENDPOINT:** `POST /api/auth/password-reset/confirm`
**Description:** verify 단계에서 발급받은 `resetToken`을 검증하고, 유효할 경우 새 비밀번호로 변경합니다.
**Required Permissions:** All Users

---

##### **Request Body**

```json
{
  "resetToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "newPassword": "newPassword123!"
}
```
* `resetToken`: (string, required) verify 단계에서 발급받은 토큰. 10분 유효.
* `newPassword`: (string, required) 새 비밀번호. 비밀번호 정책을 따라야 함.

---

##### **Responses**

*   **Success Response (`200 OK`)**

```json
{
  "message": "비밀번호가 성공적으로 변경되었습니다."
}
```

*   **Error Responses**

| HTTP Code | Error Code | 설명 |
| :--- | :--- | :--- |
| `400 Bad Request` | `INVALID_RESET_TOKEN` | `resetToken`이 유효하지 않거나 만료되었을 때 |
| `400 Bad Request` | `INVALID_PASSWORD` | 새 비밀번호가 유효성 규칙에 맞지 않을 때 |
| `404 Not Found` | `USER_NOT_FOUND` | 해당 `username`의 사용자가 없을 때 |

---
# 로그인 (Login)

`FR-03` 요구사항에 따라, 사용자를 인증하고 로그인 유지를 위한 토큰을 발급합니다.

## **ENDPOINT:** `POST /api/auth/login`
**Description:** `username`과 `password`를 받아 유효성을 검증하고, 성공 시 사용자 정보와 새로운 `accessToken`, `refreshToken`을 발급합니다.
**Required Permissions:** All Users

---

##### **Request Body**

```json
{
  "username": "testuser",
  "password": "password123!"
}
```
* `username`: (string, required) 로그인 아이디.
* `password`: (string, required) 비밀번호.

---

##### **Responses**

*   **Success Response (`200 OK`)**

```json
{
  "user": {
    "id": "a1b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5p6",
    "username": "testuser",
    "name": "김테스트",
    "role": "USER"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "def50200f0a8e9..."
}
```

*   **Error Responses**

| HTTP Code | Error Code | 설명 |
| :--- | :--- | :--- |
| `401 Unauthorized` | `INVALID_CREDENTIALS` | 아이디 또는 비밀번호가 일치하지 않을 때 |
| `403 Forbidden` | `ACCOUNT_LOCKED` | `FR-03`에 따라, 5회 이상 로그인 실패로 계정이 잠겼을 때 |
| `500 Internal Server Error` | `SERVER_ERROR` | 서버 내부 로직 처리 중 에러 발생 |

---
# 로그아웃 (Logout)

현재 사용자를 시스템에서 로그아웃 처리합니다.

## **ENDPOINT:** `POST /api/auth/logout`
**Description:** 서버에 저장된 `refreshToken`을 무효화하여, 더 이상 새로운 `accessToken`을 발급받지 못하도록 합니다. 클라이언트는 이 API 호출 후 자체적으로 저장된 토큰들을 삭제해야 합니다.
**Required Permissions:** Authenticated Users

---

##### **Request Body**

```json
{
  "refreshToken": "def50200f0a8e9..."
}
```
* `refreshToken`: (string, required) 로그인 시 발급받았던 `refreshToken`.

---

##### **Responses**

*   **Success Response (`200 OK`)**

```json
{
  "message": "Successfully logged out."
}
```

*   **Error Responses**

| HTTP Code | Error Code | 설명 |
| :--- | :--- | :--- |
| `400 Bad Request` | `INVALID_TOKEN` | 제공된 `refreshToken`이 유효하지 않을 때 |

---
# 토큰 갱신 (Refresh Token)

만료된 `accessToken`을 `refreshToken`을 이용해 재발급받습니다.

## **ENDPOINT:** `POST /api/auth/refresh`
**Description:** `accessToken`은 보안을 위해 수명이 짧습니다(예: 15분). 이 토큰이 만료되었을 때, 클라이언트는 이 API를 호출하여 사용자를 다시 로그인시키지 않고 새로운 `accessToken`을 발급받을 수 있습니다.
**Required Permissions:** Authenticated Users (유효한 `refreshToken` 소유자)

---

##### **Request Body**

```json
{
  "refreshToken": "def50200f0a8e9..."
}
```
* `refreshToken`: (string, required) 로그인 시 발급받았던 `refreshToken`.

---

##### **Responses**

*   **Success Response (`200 OK`)**

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (new)",
  "refreshToken": "abc123def456... (new, optional but recommended)"
}
```
* **Note:** 보안 강화를 위해, 토큰 갱신 시 `refreshToken`도 함께 갱신(rotate)하는 것을 권장합니다.

*   **Error Responses**

| HTTP Code | Error Code | 설명 |
| :--- | :--- | :--- |
| `401 Unauthorized` | `INVALID_TOKEN` | 제공된 `refreshToken`이 유효하지 않거나 만료되었거나, 이미 사용된 토큰일 때 |

---
### **2. 사용자 (Users)**

# 내 정보 조회 (Get My Profile)

로그인된 사용자가 자신의 프로필 정보를 조회합니다.

## **ENDPOINT:** `GET /api/users/me`
**Description:** 요청에 포함된 `accessToken`을 검증하여 사용자를 식별하고, 해당 사용자의 상세 프로필 정보를 반환합니다.
**Required Permissions:** Authenticated Users

---

##### **Request**
*   Path, Query, Body Parameters 없음.

---

##### **Responses**

*   **Success Response (`200 OK`)**

```json
{
  "id": "a1b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5p6",
  "username": "testuser",
  "name": "김테스트",
  "studentId": "202412345",
  "phoneNumber": "01012345678",
  "departmentType": "학과",
  "departmentName": "컴퓨터공학과",
  "role": "USER",
  "createdAt": "2024-01-01T12:00:00Z"
}
```

*   **Error Responses**

| HTTP Code | Error Code | 설명 |
| :--- | :--- | :--- |
| `401 Unauthorized` | `NOT_AUTHENTICATED` | `accessToken`이 유효하지 않거나 제공되지 않았을 때 |

---
# 내 정보 수정 (Update My Profile)

`FR-05` 요구사항에 따라, 로그인된 사용자가 자신의 프로필 정보를 수정합니다.

## **ENDPOINT:** `PUT /api/users/me`
**Description:** `accessToken`으로 사용자를 식별하고, 요청된 필드의 유효성을 검증한 후 정보를 업데이트합니다.
**Required Permissions:** Authenticated Users

---

##### **Request Body**

```json
{
  "currentPassword": "password123!",
  "newPassword": "newPassword456!",
  "phoneNumber": "01087654321",
  "departmentType": "학과",
  "departmentName": "총학생회"
}
```
* `currentPassword`: (string, required) 정보 수정을 위한 본인 확인용 현재 비밀번호.
* `newPassword`: (string, optional) 변경할 새 비밀번호.
* `phoneNumber`: (string, optional) 변경할 전화번호. 하이픈 없이 입력. 변경 시 SMS 재인증 필요.
* `departmentType`: (string, optional) 변경할 소속 유형.
* `departmentName`: (string, optional) 변경할 소속 단위명.

---

##### **Responses**

*   **Success Response (`200 OK`)**

```json
{
  "id": "a1b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5p6",
  "username": "testuser",
  "name": "김테스트",
  "studentId": "202412345",
  "phoneNumber": "01087654321",
  "department": "총학생회",
  "role": "USER",
  "createdAt": "2024-01-01T12:00:00Z"
}
```
* **Note:** 수정이 완료된 최신 사용자 정보를 반환합니다.

*   **Error Responses**

| HTTP Code | Error Code | 설명 |
| :--- | :--- | :--- |
| `400 Bad Request` | `INVALID_INPUT` | `newPassword` 등이 유효성 규칙에 맞지 않을 때 |
| `401 Unauthorized` | `NOT_AUTHENTICATED` | `accessToken`이 유효하지 않을 때 |
| `403 Forbidden` | `INCORRECT_PASSWORD` | `currentPassword`가 일치하지 않을 때 |
| `409 Conflict` | `DUPLICATE_PHONE_NUMBER` | 변경하려는 `phoneNumber`가 이미 존재할 때 |

---
---
# 회원 탈퇴 (Delete My Account)

`FR-06` 요구사항에 따라, 로그인된 사용자가 자신의 계정을 삭제하고 탈퇴합니다.

## **ENDPOINT:** `DELETE /api/users/me`
**Description:** 요청에 포함된 `password`를 통해 본인임을 확인한 후, 해당 사용자의 모든 정보를 시스템에서 삭제 처리합니다.
**Required Permissions:** Authenticated Users

---

#### **Request Body**

```json
{
  "password": "password123!"
}
```
* `password`: (string, required) 계정 삭제를 위한 본인 확인용 현재 비밀번호.

---

#### **Responses**

*   **Success Response (`200 OK`)**

```json
{
  "message": "회원 탈퇴가 성공적으로 처리되었습니다."
}
```

*   **Error Responses**

| HTTP Code | Error Code | 설명 |
| :--- | :--- | :--- |
| `401 Unauthorized` | `NOT_AUTHENTICATED` | `accessToken`이 유효하지 않을 때 |
| `403 Forbidden` | `INCORRECT_PASSWORD` | `password`가 일치하지 않을 때 |
| `500 Internal Server Error` | `SERVER_ERROR` | 서버 내부 로직 처리 중 에러 발생 |

---
# 사용자 대시보드 조회 (Get User Dashboard)

로그인된 사용자의 현재 대여 현황 요약 정보를 조회합니다.

## **ENDPOINT:** `GET /api/users/me/dashboard`
**Description:** 현재 활성 대여 건수, 가장 가까운 반납일, 활성 플로터 주문 건수, 최근 대여 목록을 한 번에 반환합니다.
**Required Permissions:** Authenticated Users

---

#### **Responses**

*   **Success Response (`200 OK`)**

```json
{
  "activeRentalsCount": 2,
  "nearestReturnDate": "2024-08-05T00:00:00.000Z",
  "activePlotterOrdersCount": 1,
  "recentRentals": [
    {
      "id": 101,
      "status": "RENTED",
      "startDate": "2024-08-01T00:00:00.000Z",
      "endDate": "2024-08-05T00:00:00.000Z",
      "itemSummary": "DSLR 카메라 외 1건"
    }
  ]
}
```
* `activeRentalsCount`: 현재 `RENTED` 상태인 대여 건수.
* `nearestReturnDate`: 활성 대여 중 가장 가까운 반납 예정일. 활성 대여가 없으면 `null`.
* `activePlotterOrdersCount`: `PENDING`, `CONFIRMED`, `PRINTED` 상태인 플로터 주문 건수.
* `recentRentals`: 최근 3건의 대여 기록.

*   **Error Responses**

| HTTP Code | Error Code | 설명 |
| :--- | :--- | :--- |
| `401 Unauthorized` | `NOT_AUTHENTICATED` | `accessToken`이 유효하지 않을 때 |
| `500 Internal Server Error` | `SERVER_ERROR` | 서버 내부 로직 처리 중 에러 발생 |

---
# 전체 사용자 목록 조회 (Get All Users)

`FR-22` 요구사항에 따라, 관리자가 시스템에 등록된 전체 사용자 목록을 조회합니다. 검색, 정렬, 페이지네이션 기능을 포함합니다.

## **ENDPOINT:** `GET /api/users`
**Description:** 다양한 조건으로 사용자 목록을 필터링하고, 페이지 단위로 나누어 반환합니다.
**Required Permissions:** Admin Only

---

#### **Query Parameters**

| 파라미터 | 타입 | 필수 여부 | 설명 |
| :--- | :--- | :--- | :--- |
| `page` | `integer` | 선택 | 조회할 페이지 번호. (기본값: 1) |
| `pageSize` | `integer` | 선택 | 한 페이지에 보여줄 사용자 수. (기본값: 20) |
| `search` | `string` | 선택 | 검색어. `name`, `username`, `studentId` 필드를 대상으로 부분 일치 검색을 수행합니다. |
| `role` | `string` | 선택 | 특정 역할(`USER` 또는 `ADMIN`)을 가진 사용자만 필터링합니다. |
| `sortBy` | `string` | 선택 | 정렬 기준 필드. (예: `name`, `studentId`, `createdAt`. 기본값: `createdAt`) |
| `sortOrder` | `string` | 선택 | 정렬 순서. `asc` (오름차순) 또는 `desc` (내림차순). (기본값: `desc`) |

---

#### **Responses**

*   **Success Response (`200 OK`)**

```json
{
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "totalItems": 150,
    "totalPages": 8
  },
  "users": [
    {
      "id": "a1b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5p6",
      "username": "testuser",
      "name": "김테스트",
      "studentId": "202412345",
      "phoneNumber": "01012345678",
      "departmentType": "학과",
      "departmentName": "컴퓨터공학과",
      "role": "USER",
      "createdAt": "2024-01-01T12:00:00Z"
    },
    {
      "id": "b2c3d4e5-f6g7-h8i9-j0k1-l2m3n4o5p6q7",
      "username": "adminuser",
      "name": "박관리",
      "studentId": "202000001",
      "phoneNumber": "010-0000-0001",
      "departmentType": "총학생회",
      "departmentName": null,
      "role": "ADMIN",
      "createdAt": "2023-12-25T10:00:00Z"
    }
  ]
}
```

*   **Error Responses**

| HTTP Code | Error Code | 설명 |
| :--- | :--- | :--- |
| `401 Unauthorized` | `NOT_AUTHENTICATED` | `accessToken`이 유효하지 않을 때 |
| `403 Forbidden` | `NO_PERMISSION` | 관리자 권한이 없을 때 |
| `500 Internal Server Error` | `SERVER_ERROR` | 서버 내부 로직 처리 중 에러 발생 |

---
# 사용자 역할 변경 (Update User Role)

`FR-23` 요구사항에 따라, 관리자가 특정 사용자의 역할을 변경합니다.

## **ENDPOINT:** `PUT /api/users/{userId}/role`
**Description:** 관리자가 `userId`를 지정하여 해당 사용자의 역할을 'USER' 또는 'ADMIN'으로 변경합니다.
**Required Permissions:** Admin Only

---

#### **Path Parameters**

| 파라미터 | 타입 | 설명 |
| :--- | :--- | :--- |
| `userId` | `uuid` | 역할을 변경할 사용자의 고유 ID |

---

#### **Request Body**

```json
{
  "role": "ADMIN"
}
```
* `role`: (string, required) 변경할 새 역할. 'USER' 또는 'ADMIN' 값만 가능합니다.

---

#### **Responses**

*   **Success Response (`200 OK`)**

```json
{
  "id": "a1b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5p6",
  "username": "testuser",
  "name": "김테스트",
  "studentId": "202412345",
  "phoneNumber": "010-1234-5678",
  "departmentType": "학과",
  "departmentName": "컴퓨터공학과",
  "role": "ADMIN",
  "createdAt": "2024-01-01T12:00:00Z"
}
```
* **Note:** 역할 변경이 완료된 최신 사용자 정보를 반환합니다.

*   **Error Responses**

| HTTP Code | Error Code | 설명 |
| :--- | :--- | :--- |
| `400 Bad Request` | `INVALID_ROLE` | `role` 필드의 값이 'USER' 또는 'ADMIN'이 아닐 때 |
| `401 Unauthorized` | `NOT_AUTHENTICATED` | `accessToken`이 유효하지 않을 때 |
| `403 Forbidden` | `NO_PERMISSION` | 관리자 권한이 없을 때 |
| `404 Not Found` | `USER_NOT_FOUND` | 해당 `userId`의 사용자가 없을 때 |
| `500 Internal Server Error` | `SERVER_ERROR` | 서버 내부 로직 처리 중 에러 발생 |

---
### **3. 물품 (Items & Categories)**

# 물품 목록 조회 (Get All Items)

`FR-08`, `FR-09` 요구사항에 따라, 모든 물품 목록을 검색, 필터링, 정렬 기능과 함께 조회합니다.

## **ENDPOINT:** `GET /api/items`
**Description:** `FR-08`에 따라 페이지네이션 없이 모든 물품을 반환하며, 다양한 조건으로 필터링 및 정렬할 수 있습니다.
**Required Permissions:** All Users

---

#### **Query Parameters**

| 파라미터 | 타입 | 필수 여부 | 설명 |
| :--- | :--- | :--- | :--- |
| `search` | `string` | 선택 | 물품 이름(name)을 대상으로 부분 일치 검색을 수행합니다. |
| `categoryIds` | `string` | 선택 | 카테고리 ID를 쉼표(`,`)로 구분하여 전달합니다. (예: `1,3,5`) |
| `sortBy` | `string` | 선택 | 정렬 기준. `popularity` (인기순), `name` (이름순), `createdAt` (최신순). (기본값: `popularity`) |
| `sortOrder` | `string` | 선택 | 정렬 순서. `asc` (오름차순) 또는 `desc` (내림차순). (기본값: `desc`) |

---

#### **Responses**

*   **Success Response (`200 OK`)**

```json
[
  {
    "id": 1,
    "category": {
      "id": 2,
      "name": "촬영장비"
    },
    "name": "DSLR 카메라",
    "itemCode": "CAM-001",
    "rentalCount": 120,
    "imageUrl": "https://example.com/images/camera.jpg",
    "managementType": "INDIVIDUAL",
    "totalQuantity": 5,
    "currentStock": 2,
    "createdAt": "2024-01-10T10:00:00Z"
  },
  {
    "id": 2,
    "category": {
      "id": 5,
      "name": "음향장비"
    },
    "name": "블루투스 마이크",
    "itemCode": "MIC-003",
    "rentalCount": 95,
    "imageUrl": "https://example.com/images/mic.jpg",
    "managementType": "BULK",
    "totalQuantity": 10,
    "currentStock": 8,
    "createdAt": "2024-01-05T15:30:00Z"
  }
]
```
* **Note:** `currentStock`은 현재 시점에서 대여 가능한 재고 수량을 의미합니다.

*   **Error Responses**

| HTTP Code | Error Code | 설명 |
| :--- | :--- | :--- |
| `500 Internal Server Error` | `SERVER_ERROR` | 서버 내부 로직 처리 중 에러 발생 |

---
# 물품 상세 조회 (Get Item Details)

`FR-10` 요구사항에 따라, 특정 물품의 상세 정보를 조회합니다.

## **ENDPOINT:** `GET /api/items/{itemId}`
**Description:** `itemId`에 해당하는 물품의 모든 정보를 반환합니다. `description` 필드는 관리자가 입력한 상세 설명(HTML/Markdown)을 포함합니다.
**Required Permissions:** All Users

---

#### **Path Parameters**

| 파라미터 | 타입 | 설명 |
| :--- | :--- | :--- |
| `itemId` | `integer` | 조회할 물품의 고유 ID |

---

#### **Responses**

*   **Success Response (`200 OK`)**

```json
{
  "id": 1,
  "category": {
    "id": 2,
    "name": "촬영장비"
  },
  "name": "DSLR 카메라",
  "itemCode": "CAM-001",
  "description": "<h1>고화질 DSLR 카메라</h1><p>제품 특징: ...</p><img src='...' />",
  "rentalCount": 120,
  "imageUrl": "https://example.com/images/camera.jpg",
  "managementType": "INDIVIDUAL",
  "totalQuantity": 5,
  "createdAt": "2024-01-10T10:00:00Z"
}
```

*   **Error Responses**

| HTTP Code | Error Code | 설명 |
| :--- | :--- | :--- |
| `404 Not Found` | `ITEM_NOT_FOUND` | 해당 `itemId`의 물품이 없을 때 |
| `500 Internal Server Error` | `SERVER_ERROR` | 서버 내부 로직 처리 중 에러 발생 |

---
# 물품 생성 (Create Item)

`FR-19` 요구사항에 따라, 관리자가 새로운 물품을 시스템에 등록합니다.

## **ENDPOINT:** `POST /api/items`
**Description:** 새로운 물품 정보를 받아 `items` 테이블에 저장합니다.
**Required Permissions:** Admin Only

---

#### **Request Body**

```json
{
  "categoryId": 2,
  "name": "새로운 삼각대",
  "itemCode": "TRI-005",
  "description": "가볍고 튼튼한 전문가용 삼각대입니다.",
  "imageUrl": "https://example.com/images/tripod.jpg",
  "managementType": "BULK",
  "totalQuantity": 10
}
```
* `categoryId`: (integer, required)
* `name`: (string, required)
* `itemCode`: (string, required, unique)
* `description`: (string, optional)
* `imageUrl`: (string, optional)
* `managementType`: (string, required) 'INDIVIDUAL' 또는 'BULK'
* `totalQuantity`: (integer, optional) `managementType`이 'BULK'일 때 필요합니다.

---

#### **Responses**

*   **Success Response (`201 Created`)**
    *   생성된 물품의 전체 정보를 반환합니다. (상세 조회 응답과 동일)

*   **Error Responses**

| HTTP Code | Error Code | 설명 |
| :--- | :--- | :--- |
| `400 Bad Request` | `INVALID_INPUT` | 필수 필드가 누락되거나 유효하지 않을 때 |
| `401 Unauthorized` | `NOT_AUTHENTICATED` | 로그인이 필요할 때 |
| `403 Forbidden` | `NO_PERMISSION` | 관리자 권한이 없을 때 |
| `409 Conflict` | `DUPLICATE_ITEM_CODE` | `itemCode`가 이미 존재할 때 |

---
# 물품 수정 (Update Item)

`FR-19` 요구사항에 따라, 관리자가 기존 물품의 정보를 수정합니다.

## **ENDPOINT:** `PUT /api/items/{itemId}`
**Description:** `itemId`에 해당하는 물품의 정보를 수정합니다.
**Required Permissions:** Admin Only

---

#### **Path Parameters**

| 파라미터 | 타입 | 설명 |
| :--- | :--- | :--- |
| `itemId` | `integer` | 수정할 물품의 고유 ID |

---

#### **Request Body**
*   물품 생성(Create Item)의 Request Body와 동일하며, 모든 필드는 선택적(optional)입니다.

---

#### **Responses**

*   **Success Response (`200 OK`)**
    *   수정된 물품의 전체 정보를 반환합니다. (상세 조회 응답과 동일)

*   **Error Responses**

| HTTP Code | Error Code | 설명 |
| :--- | :--- | :--- |
| `404 Not Found` | `ITEM_NOT_FOUND` | 해당 `itemId`의 물품이 없을 때 |
| `409 Conflict` | `DUPLICATE_ITEM_CODE` | 수정하려는 `itemCode`가 다른 물품에 이미 존재할 때 |
| (이 외 Create Item의 Error Responses 참조) | | |

---
# 물품 삭제 (Delete Item)

`FR-19` 요구사항에 따라, 관리자가 물품을 삭제합니다.

## **ENDPOINT:** `DELETE /api/items/{itemId}`
**Description:** `itemId`에 해당하는 물품을 삭제합니다.
**Required Permissions:** Admin Only

---

#### **Path Parameters**

| 파라미터 | 타입 | 설명 |
| :--- | :--- | :--- |
| `itemId` | `integer` | 삭제할 물품의 고유 ID |

---

#### **Responses**

*   **Success Response (`204 No Content`)**
    *   성공적으로 삭제되었으며, 별도의 본문(body)은 없습니다.

*   **Error Responses**

| HTTP Code | Error Code | 설명 |
| :--- | :--- | :--- |
| `401 Unauthorized` | `NOT_AUTHENTICATED` | 로그인이 필요할 때 |
| `403 Forbidden` | `NO_PERMISSION` | 관리자 권한이 없을 때 |
| `404 Not Found` | `ITEM_NOT_FOUND` | 해당 `itemId`의 물품이 없을 때 |
| `409 Conflict` | `ITEM_IN_USE` | 해당 물품과 연결된 대여 기록이 있어 삭제할 수 없을 때 |

---
# 물품 날짜별 재고 조회 (Get Item Availability)

물품의 날짜 범위별 가용 재고를 조회합니다. 대여 예약 화면의 캘린더용입니다.

## **ENDPOINT:** `GET /api/items/{itemId}/availability`
**Description:** 시작일부터 종료일까지의 각 날짜별로 가용 수량을 반환합니다. 로그인 불필요.
**Required Permissions:** All Users

---

#### **Path Parameters**

| 파라미터 | 타입 | 설명 |
| :--- | :--- | :--- |
| `itemId` | `integer` | 조회할 물품의 고유 ID |

#### **Query Parameters**

| 파라미터 | 타입 | 필수 여부 | 설명 |
| :--- | :--- | :--- | :--- |
| `startDate` | `string` | 필수 | 조회 시작일 (YYYY-MM-DD) |
| `endDate` | `string` | 필수 | 조회 종료일 (YYYY-MM-DD) |

---

#### **Responses**

*   **Success Response (`200 OK`)**

```json
[
  { "date": "2024-08-01", "availableQuantity": 3, "totalQuantity": 5 },
  { "date": "2024-08-02", "availableQuantity": 2, "totalQuantity": 5 },
  { "date": "2024-08-03", "availableQuantity": 5, "totalQuantity": 5 }
]
```
* `availableQuantity`: 해당 날짜에 대여 가능한 수량.
* `totalQuantity`: 전체 보유 수량.

*   **Error Responses**

| HTTP Code | Error Code | 설명 |
| :--- | :--- | :--- |
| `404 Not Found` | `ITEM_NOT_FOUND` | 해당 `itemId`의 물품이 없을 때 |

---
# 개별 실물 목록 조회 (Get Item Instances)

`INDIVIDUAL` 관리 방식 물품의 개별 실물(인스턴스) 목록을 조회합니다.

## **ENDPOINT:** `GET /api/items/{itemId}/instances`
**Description:** 해당 물품의 모든 개별 실물을 `serialNumber` 오름차순으로 반환합니다.
**Required Permissions:** Admin Only

---

#### **Path Parameters**

| 파라미터 | 타입 | 설명 |
| :--- | :--- | :--- |
| `itemId` | `integer` | 조회할 물품의 고유 ID |

---

#### **Responses**

*   **Success Response (`200 OK`)**

```json
[
  {
    "id": 1,
    "itemId": 1,
    "serialNumber": "CAM-001-01",
    "status": "AVAILABLE",
    "imageUrl": null,
    "createdAt": "2024-01-10T10:00:00Z"
  },
  {
    "id": 2,
    "itemId": 1,
    "serialNumber": "CAM-001-02",
    "status": "RENTED",
    "imageUrl": "https://example.com/images/cam02.jpg",
    "createdAt": "2024-01-10T10:00:00Z"
  }
]
```

*   **Error Responses**

| HTTP Code | Error Code | 설명 |
| :--- | :--- | :--- |
| `401 Unauthorized` | `NOT_AUTHENTICATED` | 로그인이 필요할 때 |
| `403 Forbidden` | `NO_PERMISSION` | 관리자 권한이 없을 때 |

---
# 개별 실물 등록 (Create Item Instance)

`INDIVIDUAL` 관리 방식 물품에 새로운 개별 실물을 등록합니다.

## **ENDPOINT:** `POST /api/items/{itemId}/instances`
**Description:** 자산 관리 번호(시리얼 번호)를 부여하여 새 실물을 등록합니다.
**Required Permissions:** Admin Only

---

#### **Path Parameters**

| 파라미터 | 타입 | 설명 |
| :--- | :--- | :--- |
| `itemId` | `integer` | 실물을 등록할 물품의 고유 ID |

---

#### **Request Body**

```json
{
  "serialNumber": "CAM-001-03",
  "status": "AVAILABLE",
  "imageUrl": "https://example.com/images/cam03.jpg"
}
```
* `serialNumber`: (string, required, unique) 자산 관리 번호.
* `status`: (string, optional) 초기 상태. `AVAILABLE`, `RENTED`, `BROKEN` 중 하나. (기본값: `AVAILABLE`)
* `imageUrl`: (string, optional) 개별 실물 이미지 URL.

---

#### **Responses**

*   **Success Response (`201 Created`)**
    *   생성된 실물 정보를 반환합니다. (목록 조회 응답의 단건과 동일)

*   **Error Responses**

| HTTP Code | Error Code | 설명 |
| :--- | :--- | :--- |
| `401 Unauthorized` | `NOT_AUTHENTICATED` | 로그인이 필요할 때 |
| `403 Forbidden` | `NO_PERMISSION` | 관리자 권한이 없을 때 |
| `409 Conflict` | `DUPLICATE_SERIAL_NUMBER` | `serialNumber`가 이미 존재할 때 |

---
# 개별 실물 수정 (Update Item Instance)

등록된 개별 실물의 정보를 수정합니다.

## **ENDPOINT:** `PUT /api/items/instances/{instanceId}`
**Description:** 실물의 상태, 시리얼 번호, 이미지를 수정합니다.
**Required Permissions:** Admin Only

---

#### **Path Parameters**

| 파라미터 | 타입 | 설명 |
| :--- | :--- | :--- |
| `instanceId` | `integer` | 수정할 실물의 고유 ID |

---

#### **Request Body**
*   모든 필드는 선택적(optional)입니다.

```json
{
  "serialNumber": "CAM-001-03",
  "status": "BROKEN",
  "imageUrl": "https://example.com/images/cam03_new.jpg"
}
```

---

#### **Responses**

*   **Success Response (`200 OK`)**
    *   수정된 실물 정보를 반환합니다.

*   **Error Responses**

| HTTP Code | Error Code | 설명 |
| :--- | :--- | :--- |
| `401 Unauthorized` | `NOT_AUTHENTICATED` | 로그인이 필요할 때 |
| `403 Forbidden` | `NO_PERMISSION` | 관리자 권한이 없을 때 |
| `404 Not Found` | `INSTANCE_NOT_FOUND` | 해당 `instanceId`의 실물이 없을 때 |

---
# 개별 실물 삭제 (Delete Item Instance)

등록된 개별 실물을 소프트 삭제합니다.

## **ENDPOINT:** `DELETE /api/items/instances/{instanceId}`
**Description:** 실물을 시스템에서 삭제 처리합니다. (소프트 삭제)
**Required Permissions:** Admin Only

---

#### **Path Parameters**

| 파라미터 | 타입 | 설명 |
| :--- | :--- | :--- |
| `instanceId` | `integer` | 삭제할 실물의 고유 ID |

---

#### **Responses**

*   **Success Response (`200 OK`)**

```json
{ "message": "실물이 삭제되었습니다." }
```

*   **Error Responses**

| HTTP Code | Error Code | 설명 |
| :--- | :--- | :--- |
| `401 Unauthorized` | `NOT_AUTHENTICATED` | 로그인이 필요할 때 |
| `403 Forbidden` | `NO_PERMISSION` | 관리자 권한이 없을 때 |
| `404 Not Found` | `INSTANCE_NOT_FOUND` | 해당 `instanceId`의 실물이 없을 때 |

---
# 세트 구성품 추가 (Add Item Component)

물품을 다른 물품의 세트 구성품으로 등록합니다.

## **ENDPOINT:** `POST /api/items/{itemId}/components`
**Description:** `itemId` 물품을 부모(세트)로, 지정한 물품을 구성품으로 연결합니다. 동일한 조합이 이미 존재하면 수량을 업데이트합니다.
**Required Permissions:** Admin Only

---

#### **Path Parameters**

| 파라미터 | 타입 | 설명 |
| :--- | :--- | :--- |
| `itemId` | `integer` | 부모(세트) 물품의 고유 ID |

---

#### **Request Body**

```json
{
  "componentId": 3,
  "quantity": 2
}
```
* `componentId`: (integer, required) 구성품으로 추가할 물품의 ID.
* `quantity`: (integer, required) 세트 내 포함 수량. (최소 1)

---

#### **Responses**

*   **Success Response (`201 Created`)**

```json
{
  "parentId": 1,
  "componentId": 3,
  "quantity": 2
}
```

*   **Error Responses**

| HTTP Code | Error Code | 설명 |
| :--- | :--- | :--- |
| `401 Unauthorized` | `NOT_AUTHENTICATED` | 로그인이 필요할 때 |
| `403 Forbidden` | `NO_PERMISSION` | 관리자 권한이 없을 때 |
| `404 Not Found` | `ITEM_NOT_FOUND` | 부모 또는 구성품 물품이 없을 때 |

---
# 세트 구성품 삭제 (Remove Item Component)

세트에서 특정 구성품 연결을 제거합니다.

## **ENDPOINT:** `DELETE /api/items/{itemId}/components/{componentId}`
**Description:** 부모 물품과 구성품 물품 간의 세트 연결을 끊습니다.
**Required Permissions:** Admin Only

---

#### **Path Parameters**

| 파라미터 | 타입 | 설명 |
| :--- | :--- | :--- |
| `itemId` | `integer` | 부모(세트) 물품의 고유 ID |
| `componentId` | `integer` | 제거할 구성품 물품의 고유 ID |

---

#### **Responses**

*   **Success Response (`200 OK`)**

```json
{ "message": "구성품이 세트에서 제외되었습니다." }
```

*   **Error Responses**

| HTTP Code | Error Code | 설명 |
| :--- | :--- | :--- |
| `401 Unauthorized` | `NOT_AUTHENTICATED` | 로그인이 필요할 때 |
| `403 Forbidden` | `NO_PERMISSION` | 관리자 권한이 없을 때 |
| `404 Not Found` | `COMPONENT_NOT_FOUND` | 해당 구성품 연결이 없을 때 |

---
# 카테고리 목록 조회 (Get All Categories)

물품을 분류하는 데 사용되는 모든 카테고리 목록을 조회합니다.

## **ENDPOINT:** `GET /api/categories`
**Description:** 시스템에 등록된 모든 카테고리를 반환합니다.
**Required Permissions:** All Users

---

#### **Responses**

*   **Success Response (`200 OK`)**

```json
[
  { "id": 1, "name": "도서" },
  { "id": 2, "name": "촬영장비" },
  { "id": 3, "name": "체육기구" }
]
```

---
# 카테고리 생성 (Create Category)

관리자가 새로운 카테고리를 추가합니다.

## **ENDPOINT:** `POST /api/categories`
**Description:** 새로운 카테고리 이름을 받아 저장합니다.
**Required Permissions:** Admin Only

---

#### **Request Body**

```json
{
  "name": "음향장비"
}
```
* `name`: (string, required, unique)

---

#### **Responses**

*   **Success Response (`201 Created`)**

```json
{ "id": 4, "name": "음향장비" }
```

*   **Error Responses**

| HTTP Code | Error Code | 설명 |
| :--- | :--- | :--- |
| `409 Conflict` | `DUPLICATE_CATEGORY_NAME` | 동일한 이름의 카테고리가 이미 존재할 때 |
| (이 외 Create Item의 Error Responses 참조) | | |

---
# 카테고리 수정 (Update Category)

관리자가 기존 카테고리의 이름을 수정합니다.

## **ENDPOINT:** `PUT /api/categories/{categoryId}`
**Description:** `categoryId`에 해당하는 카테고리의 이름을 수정합니다.
**Required Permissions:** Admin Only

---

#### **Path Parameters**

| 파라미터 | 타입 | 설명 |
| :--- | :--- | :--- |
| `categoryId` | `integer` | 수정할 카테고리의 고유 ID |

---

#### **Request Body**

```json
{
  "name": "음향기기"
}
```
* `name`: (string, required, unique)

---

#### **Responses**

*   **Success Response (`200 OK`)**

```json
{ "id": 4, "name": "음향기기" }
```

*   **Error Responses**

| HTTP Code | Error Code | 설명 |
| :--- | :--- | :--- |
| `404 Not Found` | `CATEGORY_NOT_FOUND` | 해당 `categoryId`의 카테고리가 없을 때 |
| (이 외 Create Category의 Error Responses 참조) | | |

---
# 카테고리 삭제 (Delete Category)

관리자가 카테고리를 삭제합니다.

## **ENDPOINT:** `DELETE /api/categories/{categoryId}`
**Description:** `categoryId`에 해당하는 카테고리를 삭제합니다.
**Required Permissions:** Admin Only

---

#### **Path Parameters**

| 파라미터 | 타입 | 설명 |
| :--- | :--- | :--- |
| `categoryId` | `integer` | 삭제할 카테고리의 고유 ID |

---

#### **Responses**

*   **Success Response (`204 No Content`)**

*   **Error Responses**

| HTTP Code | Error Code | 설명 |
| :--- | :--- | :--- |
| `404 Not Found` | `CATEGORY_NOT_FOUND` | 해당 `categoryId`의 카테고리가 없을 때 |
| `409 Conflict` | `CATEGORY_IN_USE` | 해당 카테고리에 속한 물품이 있어 삭제할 수 없을 때 |
| (이 외 Delete Item의 Error Responses 참조) | | |


---
### **4. 대여 (Rentals)**

# 새 대여 예약 생성 (Create Rental)

`FR-15` 요구사항에 따라, 사용자가 장바구니의 물품들을 최종적으로 대여 예약합니다.

## **ENDPOINT:** `POST /api/rentals`
**Description:** 대여할 물품 목록을 받아 새로운 대여 예약을 생성합니다. 날짜가 다른 품목들은 자동으로 그룹핑되어 그룹당 1건의 rental이 생성됩니다.
**Required Permissions:** Authenticated Users

---

#### **Request Body**

```json
{
  "departmentType": "학과",
  "departmentName": "컴퓨터공학과",
  "items": [
    { "itemId": 1, "quantity": 1, "startDate": "2026-06-02", "endDate": "2026-06-04" },
    { "itemId": 5, "quantity": 2, "startDate": "2026-06-09", "endDate": "2026-06-11" }
  ]
}
```
* `departmentType`: (string, required) 신청 시 소속 유형.
* `departmentName`: (string, optional) 신청 시 소속 단위명.
* `items`: (array, required) 대여할 물품 목록
    * `itemId`: (integer, required) 물품 ID
    * `quantity`: (integer, required) 대여 수량
    * `startDate`: (string, required) 해당 품목의 대여 시작일 (YYYY-MM-DD)
    * `endDate`: (string, required) 해당 품목의 반납 예정일 (YYYY-MM-DD)

> **Note:** 동일한 `startDate`/`endDate`를 가진 품목들은 하나의 rental로 묶입니다. 날짜가 다른 품목들은 각각 별도의 rental로 생성됩니다.

---

#### **Responses**

*   **Success Response (`201 Created`)**
    *   생성된 대여 목록(`rentals`)을 반환합니다. 날짜 그룹 수만큼 rental 객체가 포함됩니다.

```json
{
  "rentals": [
    {
      "id": 101,
      "userId": "a1b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5p6",
      "startDate": "2026-06-02",
      "endDate": "2026-06-04",
      "status": "RESERVED",
      "createdAt": "2026-05-20T10:00:00Z",
      "rentalItems": [
        { "itemId": 1, "name": "DSLR 카메라", "quantity": 1 }
      ]
    },
    {
      "id": 102,
      "userId": "a1b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5p6",
      "startDate": "2026-06-09",
      "endDate": "2026-06-11",
      "status": "RESERVED",
      "createdAt": "2026-05-20T10:00:00Z",
      "rentalItems": [
        { "itemId": 5, "name": "삼각대", "quantity": 2 }
      ]
    }
  ]
}
```

*   **Error Responses**

| HTTP Code | Error Code | 설명 |
| :--- | :--- | :--- |
| `400 Bad Request` | `INVALID_DATE_RANGE` | 품목별 대여 기간이 유효하지 않을 때 (예: 시작일이 반납일보다 늦음, 과거 날짜) |
| `400 Bad Request` | `RENTAL_PERIOD_EXCEEDED` | `FR-14`에 따라 최대 예약 가능 기간(2개월)을 초과했을 때 |
| `400 Bad Request` | `RENTAL_ON_HOLIDAY` | `FR-14`에 따라 휴무일에 대여/반납을 시도할 때 |
| `409 Conflict` | `INSUFFICIENT_STOCK` | 요청한 기간에 재고가 부족할 때 |

---
# 사용자 대여 대리 신청 (Create Rental By Admin)

관리자가 특정 사용자를 대신하여 대여 예약을 생성합니다.

## **ENDPOINT:** `POST /api/rentals/admin`
**Description:** 관리자가 `targetUserId`를 지정하여 해당 사용자의 대여 예약을 생성합니다. 이력에 "관리자 대리 예약 생성"으로 기록됩니다.
**Required Permissions:** Admin Only

---

#### **Request Body**

```json
{
  "targetUserId": "a1b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5p6",
  "departmentType": "총학생회",
  "departmentName": null,
  "items": [
    { "itemId": 1, "quantity": 1, "startDate": "2026-06-02", "endDate": "2026-06-04" }
  ]
}
```
* `targetUserId`: (uuid, required) 대여를 신청할 사용자의 UUID.
* `departmentType`: (string, required)
* `departmentName`: (string, optional)
* `items`: `POST /api/rentals`의 Request Body와 동일 (품목별 날짜 포함).

---

#### **Responses**

*   **Success Response (`201 Created`)**
    *   생성된 대여 정보를 반환합니다. (`POST /api/rentals` 성공 응답과 동일)

*   **Error Responses**

| HTTP Code | Error Code | 설명 |
| :--- | :--- | :--- |
| `401 Unauthorized` | `NOT_AUTHENTICATED` | 로그인이 필요할 때 |
| `403 Forbidden` | `NO_PERMISSION` | 관리자 권한이 없을 때 |
| `404 Not Found` | `USER_NOT_FOUND` | `targetUserId`에 해당하는 사용자가 없을 때 |
| (이 외 Create Rental의 Error Responses 참조) | | |

---
# 대여 목록 조회 (Get Rentals)

사용자 또는 관리자가 대여 목록을 조회합니다.

## **ENDPOINT:** `GET /api/rentals`
**Description:** 일반 사용자는 자신의 주문 내역만, 관리자는 전체 주문 내역을 조회할 수 있습니다.
**Required Permissions:** Authenticated Users (Admin은 전체 조회 가능)

---

#### **Query Parameters**

| 파라미터 | 타입 | 필수 여부 | 설명 |
| :--- | :--- | :--- | :--- |
| `userId` | `uuid` | 선택 (Admin) | 특정 사용자의 대여 내역을 조회합니다. (관리자 전용) |
| `status` | `string` | 선택 | 특정 상태의 대여 건만 필터링합니다. (예: `RESERVED`, `RENTED`, `OVERDUE`) |
| `page` | `integer` | 선택 | 페이지 번호 (기본값: 1) |
| `pageSize` | `integer` | 선택 | 페이지 당 항목 수 (기본값: 10) |

---

#### **Responses**

*   **Success Response (`200 OK`)**
    *   페이지네이션 정보와 함께 대여 목록을 반환합니다.

```json
{
  "pagination": {
    "page": 1,
    "pageSize": 10,
    "totalItems": 5,
    "totalPages": 1
  },
  "rentals": [
    {
      "id": 101,
      "user": { "name": "김테스트", "studentId": "202412345", "phoneNumber": "01012345678", "department": "컴퓨터공학과" },
      "startDate": "2024-08-01",
      "endDate": "2024-08-05",
      "status": "RESERVED",
      "itemSummary": "DSLR 카메라 외 1건",
      "createdAt": "2024-07-20T10:00:00Z"
    }
  ]
}
```

---
# 대여 상세 조회 (Get Rental Details)

특정 대여 건의 상세 정보를 조회합니다.

## **ENDPOINT:** `GET /api/rentals/{rentalId}`
**Description:** `rentalId`에 해당하는 대여 건의 상세 정보와 포함된 모든 물품 목록을 반환합니다.
**Required Permissions:** Authenticated Users (자신의 대여 건) or Admin

---

#### **Path Parameters**

| 파라미터 | 타입 | 설명 |
| :--- | :--- | :--- |
| `rentalId` | `integer` | 조회할 대여의 고유 ID |

---

#### **Responses**

*   **Success Response (`200 OK`)**
    *   `POST /api/rentals` 성공 응답과 유사하나, 더 상세한 정보를 포함합니다.

*   **Error Responses**

| HTTP Code | Error Code | 설명 |
| :--- | :--- | :--- |
| `403 Forbidden` | `NO_PERMISSION` | 자신의 대여 건이 아닌 경우 (User) |
| `404 Not Found` | `RENTAL_NOT_FOUND` | 해당 `rentalId`의 대여 건이 없을 때 |

---
# 대여 정보 수정 (Update Rental)

`FR-16` 요구사항에 따라, '예약' 상태인 대여 건의 정보를 사용자가 수정합니다.

## **ENDPOINT:** `PUT /api/rentals/{rentalId}`
**Description:** 대여 기간 또는 품목 수량을 수정합니다.
**Required Permissions:** Authenticated Users (자신의 대여 건)

---

#### **Path Parameters**

| 파라미터 | 타입 | 설명 |
| :--- | :--- | :--- |
| `rentalId` | `integer` | 수정할 대여의 고유 ID |

---

#### **Request Body**
*   `POST /api/rentals`의 Request Body와 동일하며, 모든 필드는 선택적입니다.
*   **단, 수정 시 `items` 배열의 모든 품목은 동일한 `startDate`/`endDate`를 가져야 합니다.** 날짜가 다른 경우 취소 후 재신청이 필요합니다.

---

#### **Responses**

*   **Success Response (`200 OK`)**
    *   수정된 대여 상세 정보를 반환합니다.

*   **Error Responses**

| HTTP Code | Error Code | 설명 |
| :--- | :--- | :--- |
| `403 Forbidden` | `NOT_MODIFIABLE` | '예약' 상태가 아니어서 수정할 수 없을 때 |
| (이 외 Create Rental, Get Rental Details의 Error 참조) | | |

---
# 대여 예약 취소 (Cancel Rental)

`FR-17` 요구사항에 따라, '예약' 상태인 대여 건을 사용자가 취소합니다.

## **ENDPOINT:** `DELETE /api/rentals/{rentalId}`
**Description:** `rentalId`에 해당하는 예약을 취소하고, 재고를 복구합니다.
**Required Permissions:** Authenticated Users (자신의 대여 건)

---

#### **Path Parameters**

| 파라미터 | 타입 | 설명 |
| :--- | :--- | :--- |
| `rentalId` | `integer` | 취소할 대여의 고유 ID |

---

#### **Responses**

*   **Success Response (`204 No Content`)**

*   **Error Responses**

| HTTP Code | Error Code | 설명 |
| :--- | :--- | :--- |
| `403 Forbidden` | `NOT_CANCELLABLE` | '예약' 상태가 아니어서 취소할 수 없을 때 |
| (이 외 Get Rental Details의 Error 참조) | | |

---
# 대여 상태 변경 (Update Rental Status)

`FR-20` 요구사항에 따라, 관리자가 대여 건의 상태를 변경합니다.

## **ENDPOINT:** `PUT /api/rentals/{rentalId}/status`
**Description:** 관리자가 물품 수령/반납 등에 따라 대여 상태를 직접 변경합니다.
**Required Permissions:** Admin Only

---

#### **Path Parameters**

| 파라미터 | 타입 | 설명 |
| :--- | :--- | :--- |
| `rentalId` | `integer` | 상태를 변경할 대여의 고유 ID |

---

#### **Request Body**

```json
{
  "status": "RENTED",
  "memo": "사용자에게 정상 지급 완료"
}
```
* `status`: (string, required) 변경할 상태. (`RENTED`, `RETURNED`, `CANCELED` 등)
* `memo`: (string, optional) 상태 변경에 대한 비고. (예: 불량 반납 시 내용, 관리자 취소 사유)

---

#### **Responses**

*   **Success Response (`200 OK`)**
    *   상태 변경이 완료된 대여 상세 정보를 반환합니다.

*   **Error Responses**

| HTTP Code | Error Code | 설명 |
| :--- | :--- | :--- |
| `400 Bad Request` | `INVALID_STATUS_TRANSITION` | 유효하지 않은 상태 변경일 때 (예: `RETURNED` -> `RENTED`) |
| `400 Bad Request` | `MEMO_REQUIRED` | 특정 상태 변경 시(예: 불량, 관리자 취소) `memo`가 누락되었을 때 |
| (이 외 Get Rental Details의 Error 참조) | | |


---
### **5. 플로터 (Plotter)**

# 플로터 가격 계산 (Calculate Plotter Price)

주문 전에 인쇄 비용을 미리 계산합니다.

## **ENDPOINT:** `POST /api/plotter/calculate-price`
**Description:** 사용자의 소속(프로필 정보 활용), 목적, 용지 크기, 장수를 기반으로 무료/유료 여부와 예상 금액을 반환합니다.
**Required Permissions:** Authenticated Users

---

#### **Request Body**

```json
{
  "purpose": "졸업 작품 포스터",
  "paperSize": "A0",
  "pageCount": 1
}
```
* `purpose`: (string, required) 인쇄 목적.
* `paperSize`: (string, required) 용지 크기. (예: `A0`, `A1`)
* `pageCount`: (integer, required) 인쇄 장수.

---

#### **Responses**

*   **Success Response (`200 OK`)**

```json
{
  "price": 5000,
  "isFree": false,
  "message": "인쇄 비용은 총 5,000원입니다. 입금 확인증(영수증) 업로드가 필요합니다."
}
```
* **무료인 경우:** `{ "price": 0, "isFree": true, "message": "..." }`
* `isFree`: 무료 인쇄 대상 여부. 무료이면 `POST /api/plotter/orders` 시 `paymentReceiptImage` 불필요.

*   **Error Responses**

| HTTP Code | Error Code | 설명 |
| :--- | :--- | :--- |
| `400 Bad Request` | `INVALID_INPUT` | 필수 필드 누락 또는 유효하지 않은 값 |
| `500 Internal Server Error` | `SERVER_ERROR` | 서버 내부 로직 처리 중 에러 발생 |

---
# 플로터 주문 신청 (Create Plotter Order)

`FR-27`, `FR-28` 요구사항에 따라, 사용자가 플로터 인쇄를 주문 신청합니다.

## **ENDPOINT:** `POST /api/plotter/orders`
**Description:** 인쇄 목적, 용지 크기, 인쇄 장수 등의 정보와 PDF 파일을 받아 플로터 주문을 신청합니다. 파일 업로드를 위해 `multipart/form-data` 형식을 사용합니다.
**Required Permissions:** Authenticated Users

---

#### **Request Body (multipart/form-data)**

| 필드명 | 타입 | 필수 여부 | 설명 |
| :--- | :--- | :--- | :--- |
| `purpose` | `string` | 필수 | 인쇄 목적 |
| `paperSize` | `string` | 필수 | 용지 크기 (예: `A0`, `A1`) |
| `pageCount` | `integer` | 필수 | 인쇄 장수 (업로드된 PDF 파일의 페이지 수와 일치해야 함) |
| `paymentReceiptImage` | `file` | 유료 시 필수 | 입금 내역 캡처 이미지 파일 (유료 서비스일 경우) |
| `pdfFile` | `file` | 필수 | 인쇄할 PDF 파일 |

---

#### **Responses**

*   **Success Response (`201 Created`)**
    *   생성된 플로터 주문 정보를 반환합니다.

```json
{
  "id": 201,
  "userId": "a1b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5p6",
  "purpose": "졸업 작품 포스터",
  "paperSize": "A0",
  "pageCount": 1,
  "isPaidService": true,
  "price": 5000,
  "fileUrl": "https://example.com/files/order_201.pdf",
  "originalFilename": "poster.pdf",
  "pickupDate": "2024-07-25",
  "status": "PENDING",
  "createdAt": "2024-07-22T11:00:00Z"
}
```

*   **Error Responses**

| HTTP Code | Error Code | 설명 |
| :--- | :--- | :--- |
| `400 Bad Request` | `INVALID_FILE_TYPE` | PDF 파일이 아닐 때 |
| `400 Bad Request` | `PAGE_COUNT_MISMATCH` | 입력된 `pageCount`와 실제 PDF 페이지 수가 다를 때 |
| `400 Bad Request` | `PAYMENT_RECEIPT_REQUIRED` | 유료 서비스인데 `paymentReceiptImage`가 누락되었을 때 |
| `400 Bad Request` | `INVALID_INPUT` | 필수 필드 누락 또는 유효성 검사 실패 |
| `401 Unauthorized` | `NOT_AUTHENTICATED` | 로그인이 필요할 때 |
| `500 Internal Server Error` | `SERVER_ERROR` | 서버 내부 로직 처리 중 에러 발생 |

---
# 플로터 주문 목록 조회 (Get Plotter Orders)

사용자 또는 관리자가 플로터 주문 목록을 조회합니다.

## **ENDPOINT:** `GET /api/plotter/orders`
**Description:** 일반 사용자는 자신의 주문 내역만, 관리자는 전체 주문 내역을 조회할 수 있습니다.
**Required Permissions:** Authenticated Users (Admin은 전체 조회 가능)

---

#### **Query Parameters**

| 파라미터 | 타입 | 필수 여부 | 설명 |
| :--- | :--- | :--- | :--- |
| `userId` | `uuid` | 선택 (Admin) | 특정 사용자의 주문 내역을 조회합니다. (관리자 전용) |
| `status` | `string` | 선택 | 특정 상태의 주문 건만 필터링합니다. (예: `PENDING`, `CONFIRMED`, `PRINTED`) |
| `page` | `integer` | 선택 | 페이지 번호 (기본값: 1) |
| `pageSize` | `integer` | 선택 | 페이지 당 항목 수 (기본값: 10) |

---

#### **Responses**

*   **Success Response (`200 OK`)**
    *   페이지네이션 정보와 함께 플로터 주문 목록을 반환합니다.

```json
{
  "pagination": {
    "page": 1,
    "pageSize": 10,
    "totalItems": 3,
    "totalPages": 1
  },
  "orders": [
    {
      "id": 201,
      "user": { "name": "김테스트", "studentId": "202412345" },
      "purpose": "졸업 작품 포스터",
      "paperSize": "A0",
      "pageCount": 1,
      "pickupDate": "2024-07-25",
      "status": "PENDING",
      "createdAt": "2024-07-22T11:00:00Z"
    }
  ]
}
```

---
# 플로터 주문 취소 (Cancel Plotter Order)

`FR-29` 요구사항에 따라, '주문 대기' 상태인 플로터 주문을 사용자가 취소합니다.

## **ENDPOINT:** `DELETE /api/plotter/orders/{orderId}`
**Description:** `orderId`에 해당하는 주문을 취소합니다. '주문 대기' 상태에서만 가능합니다.
**Required Permissions:** Authenticated Users (자신의 주문 건)

---

#### **Path Parameters**

| 파라미터 | 타입 | 설명 |
| :--- | :--- | :--- |
| `orderId` | `integer` | 취소할 주문의 고유 ID |

---

#### **Responses**

*   **Success Response (`204 No Content`)**

*   **Error Responses**

| HTTP Code | Error Code | 설명 |
| :--- | :--- | :--- |
| `403 Forbidden` | `NOT_CANCELLABLE` | '주문 대기' 상태가 아니어서 취소할 수 없을 때 |
| `404 Not Found` | `ORDER_NOT_FOUND` | 해당 `orderId`의 주문이 없을 때 |
| `401 Unauthorized` | `NOT_AUTHENTICATED` | 로그인이 필요할 때 |

---
# 플로터 주문 상태 변경 (Update Plotter Order Status)

`FR-30` 요구사항에 따라, 관리자가 플로터 주문의 상태를 변경합니다.

## **ENDPOINT:** `PUT /api/plotter/orders/{orderId}/status`
**Description:** 관리자가 플로터 주문의 상태를 변경하고, 필요한 경우 반려 사유를 기록합니다.
**Required Permissions:** Admin Only

---

#### **Path Parameters**

| 파라미터 | 타입 | 설명 |
| :--- | :--- | :--- |
| `orderId` | `integer` | 상태를 변경할 주문의 고유 ID |

---

#### **Request Body**

```json
{
  "status": "CONFIRMED",
  "rejectionReason": "PDF 파일에 문제가 있습니다."
}
```
* `status`: (string, required) 변경할 상태. (`PENDING`, `CONFIRMED`, `PRINTED`, `REJECTED`, `COMPLETED`)
* `rejectionReason`: (string, optional) `status`가 `REJECTED`일 경우 필수.

---

#### **Responses**

*   **Success Response (`200 OK`)**
    *   상태 변경이 완료된 플로터 주문 정보를 반환합니다.

*   **Error Responses**

| HTTP Code | Error Code | 설명 |
| :--- | :--- | :--- |
| `400 Bad Request` | `INVALID_STATUS_TRANSITION` | 유효하지 않은 상태 변경일 때 |
| `400 Bad Request` | `REJECTION_REASON_REQUIRED` | `status`가 `REJECTED`인데 `rejectionReason`이 누락되었을 때 |
| `404 Not Found` | `ORDER_NOT_FOUND` | 해당 `orderId`의 주문이 없을 때 |
| `401 Unauthorized` | `NOT_AUTHENTICATED` | 로그인이 필요할 때 |
| `403 Forbidden` | `NO_PERMISSION` | 관리자 권한이 없을 때 |
| `500 Internal Server Error` | `SERVER_ERROR` | 서버 내부 로직 처리 중 에러 발생 |


---
### **6. 관리 (Admin)**

# 통계 데이터 조회 (Get Statistics)

관리자가 시스템의 주요 통계 데이터를 조회합니다.

## **ENDPOINT:** `GET /api/admin/stats`
**Description:** 총 사용자 수, 총 대여 건수, 인기 물품 목록 등 시스템 운영에 필요한 다양한 통계 정보를 반환합니다.
**Required Permissions:** Admin Only

---

#### **Responses**

*   **Success Response (`200 OK`)**

```json
{
  "totalUsers": 1250,
  "totalRentals": 3450,
  "activeRentals": 50,
  "overdueRentals": 5,
  "mostRentedItems": [
    { "itemId": 1, "name": "DSLR 카메라", "rentalCount": 120 },
    { "itemId": 2, "name": "빔 프로젝터", "rentalCount": 98 }
  ],
  "plotterOrdersPending": 10,
  "plotterOrdersCompleted": 150
}
```

*   **Error Responses**

| HTTP Code | Error Code | 설명 |
| :--- | :--- | :--- |
| `401 Unauthorized` | `NOT_AUTHENTICATED` | 로그인이 필요할 때 |
| `403 Forbidden` | `NO_PERMISSION` | 관리자 권한이 없을 때 |
| `500 Internal Server Error` | `SERVER_ERROR` | 서버 내부 로직 처리 중 에러 발생 |

---
# 휴무일 목록 조회 (Get Holidays)

`FR-31` 요구사항에 따라, 관리자가 설정한 휴무일 목록을 조회합니다.

## **ENDPOINT:** `GET /api/admin/holidays`
**Description:** 시스템에 등록된 모든 휴무일 목록을 반환합니다.
**Required Permissions:** All Users (물품 대여/플로터 예약 시 휴무일 정보가 필요하므로)

---

#### **Responses**

*   **Success Response (`200 OK`)**

```json
[
  { "id": 1, "holidayDate": "2024-09-16", "description": "추석 연휴" },
  { "id": 2, "holidayDate": "2024-10-03", "description": "개천절" }
]
```

*   **Error Responses**

| HTTP Code | Error Code | 설명 |
| :--- | :--- | :--- |
| `500 Internal Server Error` | `SERVER_ERROR` | 서버 내부 로직 처리 중 에러 발생 |

---
# 휴무일 추가 (Add Holiday)

`FR-31` 요구사항에 따라, 관리자가 새로운 휴무일을 추가합니다.

## **ENDPOINT:** `POST /api/admin/holidays`
**Description:** 새로운 휴무일 정보를 받아 저장합니다.
**Required Permissions:** Admin Only

---

#### **Request Body**

```json
{
  "holidayDate": "2024-12-25",
  "description": "성탄절"
}
```
* `holidayDate`: (string, required, unique) 휴무일 날짜 (YYYY-MM-DD)
* `description`: (string, optional) 휴무일 설명

---

#### **Responses**

*   **Success Response (`201 Created`)**

```json
{ "id": 3, "holidayDate": "2024-12-25", "description": "성탄절" }
```

*   **Error Responses**

| HTTP Code | Error Code | 설명 |
| :--- | :--- | :--- |
| `409 Conflict` | `DUPLICATE_HOLIDAY` | 동일한 날짜의 휴무일이 이미 존재할 때 |
| (이 외 Admin API의 Error Responses 참조) | | |

---
# 휴무일 삭제 (Delete Holiday)

`FR-31` 요구사항에 따라, 관리자가 등록된 휴무일을 삭제합니다.

## **ENDPOINT:** `DELETE /api/admin/holidays/{id}`
**Description:** `id`에 해당하는 휴무일을 시스템에서 삭제합니다.
**Required Permissions:** Admin Only

---

#### **Path Parameters**

| 파라미터 | 타입 | 설명 |
| :--- | :--- | :--- |
| `id` | `integer` | 삭제할 휴무일의 고유 ID |

---

#### **Responses**

*   **Success Response (`200 OK`)**

```json
{ "message": "휴무일이 삭제되었습니다." }
```

*   **Error Responses**

| HTTP Code | Error Code | 설명 |
| :--- | :--- | :--- |
| `401 Unauthorized` | `NOT_AUTHENTICATED` | 로그인이 필요할 때 |
| `403 Forbidden` | `NO_PERMISSION` | 관리자 권한이 없을 때 |
| `404 Not Found` | `HOLIDAY_NOT_FOUND` | 해당 `id`의 휴무일이 없을 때 |

---
# 이미지 업로드 (Upload Image)

관리자가 물품 등록이나 상세 설명에 사용할 이미지를 서버에 업로드합니다.

## **ENDPOINT:** `POST /api/admin/upload-image`
**Description:** 이미지 파일을 받아 Supabase Storage의 `items` 폴더에 저장하고 접근 가능한 공용 URL을 반환합니다.
**Required Permissions:** Admin Only

---

#### **Request Body (multipart/form-data)**

| 필드명 | 타입 | 필수 여부 | 설명 |
| :--- | :--- | :--- | :--- |
| `file` | `file` | 필수 | 이미지 파일 (최대 5MB, png/jpg/jpeg/webp 지원) |

---

#### **Responses**

*   **Success Response (`200 OK`)**

```json
{
  "url": "https://[supabase-url]/storage/v1/object/public/rental-web/items/[uuid].png"
}
```

*   **Error Responses**

| HTTP Code | Error Code | 설명 |
| :--- | :--- | :--- |
| `400 Bad Request` | `INVALID_FILE_TYPE` | 허용되지 않은 파일 형식일 때 |
| `400 Bad Request` | `FILE_TOO_LARGE` | 파일 크기가 5MB를 초과할 때 |
| `401 Unauthorized` | `NOT_AUTHENTICATED` | 로그인이 필요할 때 |
| `403 Forbidden` | `NO_PERMISSION` | 관리자 권한이 없을 때 |

---
# 시스템 설정 목록 조회 (Get Configurations)

관리자가 시스템의 모든 설정 목록을 조회합니다.

## **ENDPOINT:** `GET /api/admin/configurations`
**Description:** 시스템에 저장된 모든 설정(`configKey`, `configValue`, `description`)을 반환합니다.
**Required Permissions:** Admin Only

---

#### **Responses**

*   **Success Response (`200 OK`)**

```json
[
  {
    "configKey": "loginAttemptLimit",
    "configValue": "5",
    "description": "로그인 시도 횟수 제한"
  },
  {
    "configKey": "rentalMaxPeriodMonths",
    "configValue": "2",
    "description": "최대 대여 가능 기간 (개월)"
  }
]
```

*   **Error Responses**

| HTTP Code | Error Code | 설명 |
| :--- | :--- | :--- |
| `401 Unauthorized` | `NOT_AUTHENTICATED` | 로그인이 필요할 때 |
| `403 Forbidden` | `NO_PERMISSION` | 관리자 권한이 없을 때 |
| `500 Internal Server Error` | `SERVER_ERROR` | 서버 내부 로직 처리 중 에러 발생 |

---
# 시스템 설정 수정 (Update Configurations)

관리자가 시스템 설정을 수정합니다.

## **ENDPOINT:** `PUT /api/admin/configurations`
**Description:** 하나 이상의 시스템 설정을 업데이트합니다. `configKey`를 기준으로 `configValue`를 변경합니다.
**Required Permissions:** Admin Only

---

#### **Request Body**

```json
{
  "configKey": "loginAttemptLimit",
  "configValue": "7"
}
```
* `configKey`: (string, required) 설정 키
* `configValue`: (string, required) 변경할 설정 값

---

#### **Responses**

*   **Success Response (`200 OK`)**
    *   업데이트된 설정 목록을 반환합니다.

```json
[
  {
    "configKey": "loginAttemptLimit",
    "configValue": "7",
    "description": "로그인 시도 횟수 제한"
  },
  {
    "configKey": "rentalMaxPeriodMonths",
    "configValue": "3",
    "description": "최대 대여 가능 기간 (개월)"
  }
]
```

*   **Error Responses**

| HTTP Code | Error Code | 설명 |
| :--- | :--- | :--- |
| `400 Bad Request` | `INVALID_INPUT` | `configValue`가 유효하지 않을 때 |
| `404 Not Found` | `CONFIG_KEY_NOT_FOUND` | 존재하지 않는 `configKey`를 수정하려 할 때 |
| (이 외 Admin API의 Error Responses 참조) | | |

---
### **8. 장바구니 (Cart)**

# 내 장바구니 조회 (Get My Cart)

`FR-12`, `FR-13` 요구사항에 따라, 현재 로그인한 사용자의 장바구니 목록을 조회합니다.

## **ENDPOINT:** `GET /api/cart`
**Description:** 로그인한 사용자의 장바구니 항목 전체를 반환합니다. 각 항목에는 물품 및 카테고리 정보가 포함됩니다. `hasUnsetDates` 필드로 날짜 미설정 항목 존재 여부를 확인할 수 있으며, 프론트엔드에서 대여 확정 버튼 비활성화 조건으로 활용할 수 있습니다.
**Required Permissions:** JWT Required

---

#### **Responses**

*   **Success Response (`200 OK`)**

```json
{
  "items": [
    {
      "id": 1,
      "userId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "itemId": 5,
      "quantity": 2,
      "startDate": null,
      "endDate": null,
      "createdAt": "2026-03-01T00:00:00Z",
      "updatedAt": "2026-03-01T00:00:00Z",
      "item": {
        "id": 5,
        "name": "삼각대",
        "itemCode": "TRP-001",
        "imageUrl": "https://example.com/images/tripod.jpg",
        "category": { "id": 2, "name": "촬영장비" }
      }
    }
  ],
  "totalCount": 1,
  "hasUnsetDates": true
}
```
* `items`: (array) 장바구니 항목 목록. 담은 순서(생성일 오름차순)로 반환됩니다.
* `totalCount`: (integer) 장바구니 항목 총 개수.
* `hasUnsetDates`: (boolean) `startDate` 또는 `endDate`가 null인 항목이 하나라도 있으면 `true`.

*   **Error Responses**

| HTTP Code | Error Code | 설명 |
| :--- | :--- | :--- |
| `401 Unauthorized` | `NOT_AUTHENTICATED` | `accessToken`이 유효하지 않을 때 |

---
# 장바구니 물품 추가 (Add Item to Cart)

`FR-11` 요구사항에 따라, 물품을 장바구니에 추가합니다.

## **ENDPOINT:** `POST /api/cart`
**Description:** 선택한 물품을 장바구니에 추가합니다. 날짜는 이 시점에 설정하지 않으며, 장바구니 페이지에서 `PUT /api/cart/{cartItemId}`로 별도 설정합니다. 동일한 물품이 이미 장바구니에 있을 경우 수량을 새 값으로 덮어씁니다(upsert). 재고 검증은 이 시점에 수행하지 않으며, 대여 확정(`POST /api/rentals`) 시점에 검증됩니다.
**Required Permissions:** JWT Required

---

#### **Request Body**

```json
{
  "itemId": 5,
  "quantity": 2
}
```
* `itemId`: (integer, required) 장바구니에 담을 물품의 고유 ID.
* `quantity`: (integer, required) 대여할 수량. 최소 1 이상이어야 합니다.

---

#### **Responses**

*   **Success Response (`201 Created`)**

```json
{
  "id": 1,
  "userId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "itemId": 5,
  "quantity": 2,
  "startDate": null,
  "endDate": null,
  "createdAt": "2026-03-01T00:00:00Z",
  "updatedAt": "2026-03-01T00:00:00Z",
  "item": {
    "id": 5,
    "name": "삼각대",
    "itemCode": "TRP-001",
    "imageUrl": "https://example.com/images/tripod.jpg",
    "category": { "id": 2, "name": "촬영장비" }
  }
}
```
* **Note:** 동일 물품이 이미 장바구니에 있던 경우에도 `201 Created`를 반환하며, 수량이 새 값으로 갱신됩니다.

*   **Error Responses**

| HTTP Code | Error Code | 설명 |
| :--- | :--- | :--- |
| `400 Bad Request` | `INVALID_INPUT` | `quantity`가 1 미만이거나 유효하지 않을 때 |
| `401 Unauthorized` | `NOT_AUTHENTICATED` | `accessToken`이 유효하지 않을 때 |
| `404 Not Found` | `ITEM_NOT_FOUND` | 해당 `itemId`의 물품이 없거나 삭제된 상태일 때 |

---
# 장바구니 항목 수정 (Update Cart Item)

`FR-13`, `FR-14` 요구사항에 따라, 장바구니 항목의 수량 또는 대여 날짜를 수정합니다.

## **ENDPOINT:** `PUT /api/cart/{cartItemId}`
**Description:** 장바구니 페이지에서 수량 변경 또는 날짜 설정 시 호출합니다. 모든 필드는 선택사항이며, 전송한 필드만 업데이트됩니다. `startDate` 또는 `endDate`에 `null`을 명시적으로 전송하면 해당 날짜가 초기화됩니다. `startDate`와 `endDate`는 반드시 함께 설정하거나 함께 초기화해야 합니다.
**Required Permissions:** JWT Required

---

#### **Path Parameters**

| 파라미터 | 타입 | 설명 |
| :--- | :--- | :--- |
| `cartItemId` | `integer` | 수정할 장바구니 항목의 고유 ID |

---

#### **Request Body**

```json
{
  "quantity": 1,
  "startDate": "2026-03-05",
  "endDate": "2026-03-07"
}
```
* `quantity`: (integer, optional) 변경할 수량. 최소 1 이상이어야 합니다.
* `startDate`: (string, optional, nullable) 변경할 대여 시작일. `YYYY-MM-DD` 형식. `null` 전송 시 날짜 초기화.
* `endDate`: (string, optional, nullable) 변경할 반납일. `YYYY-MM-DD` 형식. `null` 전송 시 날짜 초기화.

---

#### **Responses**

*   **Success Response (`200 OK`)**

```json
{
  "id": 1,
  "userId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "itemId": 5,
  "quantity": 1,
  "startDate": "2026-03-05T00:00:00.000Z",
  "endDate": "2026-03-07T00:00:00.000Z",
  "createdAt": "2026-03-01T00:00:00Z",
  "updatedAt": "2026-03-02T10:00:00Z",
  "item": {
    "id": 5,
    "name": "삼각대",
    "itemCode": "TRP-001",
    "imageUrl": "https://example.com/images/tripod.jpg",
    "category": { "id": 2, "name": "촬영장비" }
  }
}
```

*   **Error Responses**

| HTTP Code | Error Code | 설명 |
| :--- | :--- | :--- |
| `400 Bad Request` | `INVALID_INPUT` | 날짜 유효성 오류 (과거 날짜, 반납일 < 시작일, 한쪽만 설정 등) |
| `401 Unauthorized` | `NOT_AUTHENTICATED` | `accessToken`이 유효하지 않을 때 |
| `403 Forbidden` | `NO_PERMISSION` | 타인의 장바구니 항목에 접근하려 할 때 |
| `404 Not Found` | `CART_ITEM_NOT_FOUND` | 해당 `cartItemId`의 항목이 없을 때 |

---
# 장바구니 항목 제거 (Remove Cart Item)

`FR-13` 요구사항에 따라, 장바구니에서 특정 항목을 제거합니다.

## **ENDPOINT:** `DELETE /api/cart/{cartItemId}`
**Description:** `cartItemId`에 해당하는 장바구니 항목을 영구 삭제합니다. 본인의 항목만 삭제할 수 있습니다.
**Required Permissions:** JWT Required

---

#### **Path Parameters**

| 파라미터 | 타입 | 설명 |
| :--- | :--- | :--- |
| `cartItemId` | `integer` | 제거할 장바구니 항목의 고유 ID |

---

#### **Responses**

*   **Success Response (`200 OK`)**

```json
{
  "message": "장바구니에서 제거되었습니다."
}
```

*   **Error Responses**

| HTTP Code | Error Code | 설명 |
| :--- | :--- | :--- |
| `401 Unauthorized` | `NOT_AUTHENTICATED` | `accessToken`이 유효하지 않을 때 |
| `403 Forbidden` | `NO_PERMISSION` | 타인의 장바구니 항목에 접근하려 할 때 |
| `404 Not Found` | `CART_ITEM_NOT_FOUND` | 해당 `cartItemId`의 항목이 없을 때 |

---
* **Note:** `POST /api/rentals`로 대여가 확정되면 해당 사용자의 장바구니 전체가 자동으로 초기화됩니다.

---
### **9. 공통 (Common)**

# 헬스체크 (Health Check)

서버 및 연결된 외부 서비스의 상태를 확인합니다.

## **ENDPOINT:** `GET /api/common/health`
**Description:** DB, SMS(Solapi), Storage(Supabase)의 연결 상태를 진단하여 반환합니다.
**Required Permissions:** All Users

---

#### **Responses**

*   **Success Response (`200 OK`)**

```json
{
  "status": "OK",
  "timestamp": "2024-07-22T11:00:00.000Z",
  "services": {
    "database": "UP",
    "sms": "UP",
    "storage": "UP"
  }
}
```
* `status`: 전체 상태. DB가 `DOWN`이면 `ERROR`, 나머지는 `OK`.
* `services.database`: DB 연결 상태. `UP` 또는 `DOWN`.
* `services.sms`: Solapi SMS 서비스 상태. `UP`, `DOWN`, `NOT_CONFIGURED` 중 하나.
* `services.storage`: Supabase Storage 상태. `UP`, `DOWN`, `NOT_CONFIGURED` 중 하나.

---
# 공통 메타데이터 조회 (Get Metadata)

플로터 신청 화면 등에 필요한 공통 데이터를 조회합니다.

## **ENDPOINT:** `GET /api/common/metadata`
**Description:** `configurations` 테이블에 저장된 소속 리스트, 무료 목적, 플로터 가격 등 공통 데이터를 반환합니다. 로그인 불필요.
**Required Permissions:** All Users

---

#### **Responses**

*   **Success Response (`200 OK`)**

```json
{
  "departments": ["컴퓨터공학과", "전자공학과", "총학생회"],
  "freePurposes": ["수업 자료", "동아리 활동"],
  "prices": {
    "a0": 5000,
    "a1": 3000
  }
}
```
* `departments`: 플로터 신청 시 선택 가능한 소속 목록.
* `freePurposes`: 해당 목적이면 무료 인쇄 대상인 목적 목록.
* `prices`: 용지 크기별 인쇄 단가 (원).

---
# 이미지 업로드 - 공용 (Upload Image)

로그인된 사용자가 이미지를 업로드합니다. (플로터 입금 영수증 등 용도)

## **ENDPOINT:** `POST /api/common/upload`
**Description:** 이미지 파일을 받아 Supabase Storage의 `common` 폴더에 저장하고 공용 URL을 반환합니다.
**Required Permissions:** Authenticated Users

---

#### **Request Body (multipart/form-data)**

| 필드명 | 타입 | 필수 여부 | 설명 |
| :--- | :--- | :--- | :--- |
| `file` | `file` | 필수 | 이미지 파일 (jpg, png, webp 지원, 크기 제한 없음) |

---

#### **Responses**

*   **Success Response (`200 OK`)**

```json
{
  "url": "https://[supabase-url]/storage/v1/object/public/rental-web/common/[uuid].png"
}
```

*   **Error Responses**

| HTTP Code | Error Code | 설명 |
| :--- | :--- | :--- |
| `400 Bad Request` | `FILE_REQUIRED` | 파일이 없을 때 |
| `400 Bad Request` | `INVALID_FILE_TYPE` | 이미지 파일(jpg, png, webp)이 아닐 때 |
| `401 Unauthorized` | `NOT_AUTHENTICATED` | 로그인이 필요할 때 |
