**[주의] 이 문서는 `API/통합/RentalWeb_API_v1.0_통합.md` 파일에서 자동으로 생성된 일부입니다. 통합 문서가 업데이트될 경우, 이 문서의 내용도 반드시 동기화해야 합니다.**

### **1. 인증 (Auth)**

#### **1.1. 회원가입 (Signup)**

`FR-01` 요구사항에 따라, 새로운 사용자 계정을 생성합니다. 성공 시, 생성된 사용자 정보와 로그인 유지를 위한 토큰을 반환합니다.

*   **Endpoint:** `POST /api/auth/register`
*   **Description:** 사용자로부터 가입 정보를 받아 새로운 계정을 생성하고, `users` 테이블에 프로필 정보를 저장합니다.
*   **Required Permissions:** All Users

---

##### **Request Body**

```json
{
  "username": "testuser",
  "password": "password123!",
  "name": "김테스트",
  "student_id": "202412345",
  "phone_number": "010-1234-5678",
  "department": "컴퓨터공학과"
}
```
* `username`: (string, required) 로그인 아이디. 5~20자의 영문 소문자, 숫자만 가능.
* `password`: (string, required) 비밀번호. 최소 8자 이상, 영문, 숫자, 특수문자 포함.
* `name`: (string, required) 실제 이름.
* `student_id`: (string, required) 학번.
* `phone_number`: (string, required) 전화번호. SMS 인증을 거친 번호.
* `department`: (string, required) 소속 단위.

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
| `409 Conflict` | `DUPLICATE_STUDENT_ID` | `student_id`가 이미 존재할 때 |
| `409 Conflict` | `DUPLICATE_PHONE_NUMBER` | `phone_number`가 이미 존재할 때 |
| `500 Internal Server Error` | `SERVER_ERROR` | 서버 내부 로직 처리 중 에러 발생 |

---
#### **1.2. 아이디 찾기 (Find Username)**

`FR-04` 요구사항에 따라, 이름과 전화번호로 사용자의 아이디를 찾습니다.

*   **Endpoint:** `POST /api/auth/find-username`
*   **Description:** 이름과 전화번호가 일치하는 사용자를 찾아, 해당 전화번호로 아이디를 SMS 발송합니다.
*   **Required Permissions:** All Users

---

##### **Request Body**

```json
{
  "name": "김테스트",
  "phone_number": "010-1234-5678"
}
```
* `name`: (string, required) 가입 시 입력한 실제 이름.
* `phone_number`: (string, required) 가입 시 인증한 전화번호.

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
#### **1.3. 비밀번호 재설정 요청 (Request Password Reset)**

`FR-04` 요구사항에 따라, 비밀번호 재설정을 위한 인증 코드를 요청합니다.

*   **Endpoint:** `POST /api/auth/password-reset/request`
*   **Description:** 아이디와 전화번호가 일치하는 사용자를 찾아, 비밀번호를 재설정할 수 있는 임시 인증 코드를 SMS로 발송합니다.
*   **Required Permissions:** All Users

---

##### **Request Body**

```json
{
  "username": "testuser",
  "phone_number": "010-1234-5678"
}
```
* `username`: (string, required) 아이디.
* `phone_number`: (string, required) 가입 시 인증한 전화번호.

---

##### **Responses**

*   **Success Response (`200 OK`)**

```json
{
  "message": "요청이 접수되었습니다. 가입된 정보와 일치하는 경우, SMS로 인증 코드를 발송해 드립니다."
}
```

---
#### **1.4. 비밀번호 재설정 확정 (Confirm Password Reset)**

`FR-04` 요구사항에 따라, 인증 코드를 이용해 비밀번호를 최종 변경합니다.

*   **Endpoint:** `POST /api/auth/password-reset/confirm`
*   **Description:** SMS로 발급받은 인증 코드가 유효한지 확인하고, 유효할 경우 새 비밀번호로 변경합니다.
*   **Required Permissions:** All Users

---

##### **Request Body**

```json
{
  "username": "testuser",
  "verification_code": "123456",
  "new_password": "newPassword123!"
}
```
* `username`: (string, required) 아이디.
* `verification_code`: (string, required) SMS로 수신한 인증 코드.
* `new_password`: (string, required) 새 비밀번호. 비밀번호 정책을 따라야 함.

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
| `400 Bad Request` | `INVALID_VERIFICATION_CODE` | 인증 코드가 일치하지 않거나 만료되었을 때 |
| `400 Bad Request` | `INVALID_PASSWORD` | 새 비밀번호가 유효성 규칙에 맞지 않을 때 |
| `404 Not Found` | `USER_NOT_FOUND` | 해당 `username`의 사용자가 없을 때 |

---
#### **1.5. 로그인 (Login)**

`FR-03` 요구사항에 따라, 사용자를 인증하고 로그인 유지를 위한 토큰을 발급합니다.

*   **Endpoint:** `POST /api/auth/login`
*   **Description:** `username`과 `password`를 받아 유효성을 검증하고, 성공 시 사용자 정보와 새로운 `accessToken`, `refreshToken`을 발급합니다.
*   **Required Permissions:** All Users

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
#### **1.6. 로그아웃 (Logout)**

현재 사용자를 시스템에서 로그아웃 처리합니다.

*   **Endpoint:** `POST /api/auth/logout`
*   **Description:** 서버에 저장된 `refreshToken`을 무효화하여, 더 이상 새로운 `accessToken`을 발급받지 못하도록 합니다. 클라이언트는 이 API 호출 후 자체적으로 저장된 토큰들을 삭제해야 합니다.
*   **Required Permissions:** Authenticated Users

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
#### **1.7. 토큰 갱신 (Refresh Token)**

만료된 `accessToken`을 `refreshToken`을 이용해 재발급받습니다.

*   **Endpoint:** `POST /api/auth/refresh`
*   **Description:** `accessToken`은 보안을 위해 수명이 짧습니다(예: 15분). 이 토큰이 만료되었을 때, 클라이언트는 이 API를 호출하여 사용자를 다시 로그인시키지 않고 새로운 `accessToken`을 발급받을 수 있습니다.
*   **Required Permissions:** Authenticated Users (유효한 `refreshToken` 소유자)

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