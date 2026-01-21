### **RentalWeb API 명세서 (v1.0)**

이 문서는 RentalWeb 프론트엔드와 백엔드 간의 데이터 통신을 위한 API 엔드포인트를 정의합니다.

---
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

---
### **2. 사용자 (Users)**

#### **2.1. 내 정보 조회 (Get My Profile)**

로그인된 사용자가 자신의 프로필 정보를 조회합니다.

*   **Endpoint:** `GET /api/users/me`
*   **Description:** 요청에 포함된 `accessToken`을 검증하여 사용자를 식별하고, 해당 사용자의 상세 프로필 정보를 반환합니다.
*   **Required Permissions:** Authenticated Users

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
  "student_id": "202412345",
  "phone_number": "010-1234-5678",
  "department": "컴퓨터공학과",
  "role": "USER",
  "created_at": "2024-01-01T12:00:00Z"
}
```

*   **Error Responses**

| HTTP Code | Error Code | 설명 |
| :--- | :--- | :--- |
| `401 Unauthorized` | `NOT_AUTHENTICATED` | `accessToken`이 유효하지 않거나 제공되지 않았을 때 |

---
#### **2.2. 내 정보 수정 (Update My Profile)**

`FR-05` 요구사항에 따라, 로그인된 사용자가 자신의 프로필 정보를 수정합니다.

*   **Endpoint:** `PUT /api/users/me`
*   **Description:** `accessToken`으로 사용자를 식별하고, 요청된 필드의 유효성을 검증한 후 정보를 업데이트합니다.
*   **Required Permissions:** Authenticated Users

---

##### **Request Body**

```json
{
  "current_password": "password123!",
  "new_password": "newPassword456!",
  "phone_number": "010-8765-4321",
  "department": "총학생회"
}
```
* `current_password`: (string, required) 정보 수정을 위한 본인 확인용 현재 비밀번호.
* `new_password`: (string, optional) 변경할 새 비밀번호.
* `phone_number`: (string, optional) 변경할 전화번호. 변경 시 SMS 재인증 필요.
* `department`: (string, optional) 변경할 소속 단위.

---

##### **Responses**

*   **Success Response (`200 OK`)**

```json
{
  "id": "a1b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5p6",
  "username": "testuser",
  "name": "김테스트",
  "student_id": "202412345",
  "phone_number": "010-8765-4321",
  "department": "총학생회",
  "role": "USER",
  "created_at": "2024-01-01T12:00:00Z"
}
```
* **Note:** 수정이 완료된 최신 사용자 정보를 반환합니다.

*   **Error Responses**

| HTTP Code | Error Code | 설명 |
| :--- | :--- | :--- |
| `400 Bad Request` | `INVALID_INPUT` | `new_password` 등이 유효성 규칙에 맞지 않을 때 |
| `401 Unauthorized` | `NOT_AUTHENTICATED` | `accessToken`이 유효하지 않을 때 |
| `403 Forbidden` | `INCORRECT_PASSWORD` | `current_password`가 일치하지 않을 때 |
| `409 Conflict` | `DUPLICATE_PHONE_NUMBER` | 변경하려는 `phone_number`가 이미 존재할 때 |

---
### **2.3. 회원 탈퇴 (Delete My Account)**

`FR-06` 요구사항에 따라, 로그인된 사용자가 자신의 계정을 삭제하고 탈퇴합니다.

*   **Endpoint:** `DELETE /api/users/me`
*   **Description:** 요청에 포함된 `password`를 통해 본인임을 확인한 후, 해당 사용자의 모든 정보를 시스템에서 삭제 처리합니다.
*   **Required Permissions:** Authenticated Users

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
### **2.4. 전체 사용자 목록 조회 (Get All Users)**

`FR-22` 요구사항에 따라, 관리자가 시스템에 등록된 전체 사용자 목록을 조회합니다. 검색, 정렬, 페이지네이션 기능을 포함합니다.

*   **Endpoint:** `GET /api/users`
*   **Description:** 다양한 조건으로 사용자 목록을 필터링하고, 페이지 단위로 나누어 반환합니다.
*   **Required Permissions:** Admin Only

---

#### **Query Parameters**

| 파라미터 | 타입 | 필수 여부 | 설명 |
| :--- | :--- | :--- | :--- |
| `page` | `integer` | 선택 | 조회할 페이지 번호. (기본값: 1) |
| `pageSize` | `integer` | 선택 | 한 페이지에 보여줄 사용자 수. (기본값: 20) |
| `search` | `string` | 선택 | 검색어. `name`, `username`, `student_id` 필드를 대상으로 부분 일치 검색을 수행합니다. |
| `role` | `string` | 선택 | 특정 역할(`USER` 또는 `ADMIN`)을 가진 사용자만 필터링합니다. |
| `sortBy` | `string` | 선택 | 정렬 기준 필드. (예: `name`, `student_id`, `created_at`. 기본값: `created_at`) |
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
      "student_id": "202412345",
      "phone_number": "010-1234-5678",
      "department": "컴퓨터공학과",
      "role": "USER",
      "created_at": "2024-01-01T12:00:00Z"
    },
    {
      "id": "b2c3d4e5-f6g7-h8i9-j0k1-l2m3n4o5p6q7",
      "username": "adminuser",
      "name": "박관리",
      "student_id": "202000001",
      "phone_number": "010-0000-0001",
      "department": "총학생회",
      "role": "ADMIN",
      "created_at": "2023-12-25T10:00:00Z"
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
### **2.5. 사용자 역할 변경 (Update User Role)**

`FR-23` 요구사항에 따라, 관리자가 특정 사용자의 역할을 변경합니다.

*   **Endpoint:** `PUT /api/users/{user_id}/role`
*   **Description:** 관리자가 `user_id`를 지정하여 해당 사용자의 역할을 'USER' 또는 'ADMIN'으로 변경합니다.
*   **Required Permissions:** Admin Only

---

#### **Path Parameters**

| 파라미터 | 타입 | 설명 |
| :--- | :--- | :--- |
| `user_id` | `uuid` | 역할을 변경할 사용자의 고유 ID |

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
  "student_id": "202412345",
  "phone_number": "010-1234-5678",
  "department": "컴퓨터공학과",
  "role": "ADMIN",
  "created_at": "2024-01-01T12:00:00Z"
}
```
* **Note:** 역할 변경이 완료된 최신 사용자 정보를 반환합니다.

*   **Error Responses**

| HTTP Code | Error Code | 설명 |
| :--- | :--- | :--- |
| `400 Bad Request` | `INVALID_ROLE` | `role` 필드의 값이 'USER' 또는 'ADMIN'이 아닐 때 |
| `401 Unauthorized` | `NOT_AUTHENTICATED` | `accessToken`이 유효하지 않을 때 |
| `403 Forbidden` | `NO_PERMISSION` | 관리자 권한이 없을 때 |
| `404 Not Found` | `USER_NOT_FOUND` | 해당 `user_id`의 사용자가 없을 때 |
| `500 Internal Server Error` | `SERVER_ERROR` | 서버 내부 로직 처리 중 에러 발생 |

---
### **3. 물품 (Items & Categories)**

#### **3.1. 물품 목록 조회 (Get All Items)**

`FR-08`, `FR-09` 요구사항에 따라, 모든 물품 목록을 검색, 필터링, 정렬 기능과 함께 조회합니다.

*   **Endpoint:** `GET /api/items`
*   **Description:** `FR-08`에 따라 페이지네이션 없이 모든 물품을 반환하며, 다양한 조건으로 필터링 및 정렬할 수 있습니다.
*   **Required Permissions:** All Users

---

#### **Query Parameters**

| 파라미터 | 타입 | 필수 여부 | 설명 |
| :--- | :--- | :--- | :--- |
| `search` | `string` | 선택 | 물품 이름(name)을 대상으로 부분 일치 검색을 수행합니다. |
| `category_ids` | `string` | 선택 | 카테고리 ID를 쉼표(`,`)로 구분하여 전달합니다. (예: `1,3,5`) |
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
    "item_code": "CAM-001",
    "rental_count": 120,
    "image_url": "https://example.com/images/camera.jpg",
    "management_type": "INDIVIDUAL",
    "total_quantity": 5,
    "current_stock": 2,
    "created_at": "2024-01-10T10:00:00Z"
  },
  {
    "id": 2,
    "category": {
      "id": 5,
      "name": "음향장비"
    },
    "name": "블루투스 마이크",
    "item_code": "MIC-003",
    "rental_count": 95,
    "image_url": "https://example.com/images/mic.jpg",
    "management_type": "BULK",
    "total_quantity": 10,
    "current_stock": 8,
    "created_at": "2024-01-05T15:30:00Z"
  }
]
```
* **Note:** `current_stock`은 현재 시점에서 대여 가능한 재고 수량을 의미합니다.

*   **Error Responses**

| HTTP Code | Error Code | 설명 |
| :--- | :--- | :--- |
| `500 Internal Server Error` | `SERVER_ERROR` | 서버 내부 로직 처리 중 에러 발생 |

---
#### **3.2. 물품 상세 조회 (Get Item Details)**

`FR-10` 요구사항에 따라, 특정 물품의 상세 정보를 조회합니다.

*   **Endpoint:** `GET /api/items/{item_id}`
*   **Description:** `item_id`에 해당하는 물품의 모든 정보를 반환합니다. `description` 필드는 관리자가 입력한 상세 설명(HTML/Markdown)을 포함합니다.
*   **Required Permissions:** All Users

---

#### **Path Parameters**

| 파라미터 | 타입 | 설명 |
| :--- | :--- | :--- |
| `item_id` | `integer` | 조회할 물품의 고유 ID |

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
  "item_code": "CAM-001",
  "description": "<h1>고화질 DSLR 카메라</h1><p>제품 특징: ...</p><img src='...' />",
  "rental_count": 120,
  "image_url": "https://example.com/images/camera.jpg",
  "management_type": "INDIVIDUAL",
  "total_quantity": 5,
  "created_at": "2024-01-10T10:00:00Z"
}
```

*   **Error Responses**

| HTTP Code | Error Code | 설명 |
| :--- | :--- | :--- |
| `404 Not Found` | `ITEM_NOT_FOUND` | 해당 `item_id`의 물품이 없을 때 |
| `500 Internal Server Error` | `SERVER_ERROR` | 서버 내부 로직 처리 중 에러 발생 |

---
#### **3.3. 물품 생성 (Create Item)**

`FR-19` 요구사항에 따라, 관리자가 새로운 물품을 시스템에 등록합니다.

*   **Endpoint:** `POST /api/items`
*   **Description:** 새로운 물품 정보를 받아 `items` 테이블에 저장합니다.
*   **Required Permissions:** Admin Only

---

#### **Request Body**

```json
{
  "category_id": 2,
  "name": "새로운 삼각대",
  "item_code": "TRI-005",
  "description": "가볍고 튼튼한 전문가용 삼각대입니다.",
  "image_url": "https://example.com/images/tripod.jpg",
  "management_type": "BULK",
  "total_quantity": 10
}
```
* `category_id`: (integer, required)
* `name`: (string, required)
* `item_code`: (string, required, unique)
* `description`: (string, optional)
* `image_url`: (string, optional)
* `management_type`: (string, required) 'INDIVIDUAL' 또는 'BULK'
* `total_quantity`: (integer, optional) `management_type`이 'BULK'일 때 필요합니다.

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
| `409 Conflict` | `DUPLICATE_ITEM_CODE` | `item_code`가 이미 존재할 때 |

---
#### **3.4. 물품 수정 (Update Item)**

`FR-19` 요구사항에 따라, 관리자가 기존 물품의 정보를 수정합니다.

*   **Endpoint:** `PUT /api/items/{item_id}`
*   **Description:** `item_id`에 해당하는 물품의 정보를 수정합니다.
*   **Required Permissions:** Admin Only

---

#### **Path Parameters**

| 파라미터 | 타입 | 설명 |
| :--- | :--- | :--- |
| `item_id` | `integer` | 수정할 물품의 고유 ID |

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
| `404 Not Found` | `ITEM_NOT_FOUND` | 해당 `item_id`의 물품이 없을 때 |
| `409 Conflict` | `DUPLICATE_ITEM_CODE` | 수정하려는 `item_code`가 다른 물품에 이미 존재할 때 |
| (이 외 Create Item의 Error Responses 참조) | | |

---
#### **3.5. 물품 삭제 (Delete Item)**

`FR-19` 요구사항에 따라, 관리자가 물품을 삭제합니다.

*   **Endpoint:** `DELETE /api/items/{item_id}`
*   **Description:** `item_id`에 해당하는 물품을 삭제합니다.
*   **Required Permissions:** Admin Only

---

#### **Path Parameters**

| 파라미터 | 타입 | 설명 |
| :--- | :--- | :--- |
| `item_id` | `integer` | 삭제할 물품의 고유 ID |

---

#### **Responses**

*   **Success Response (`204 No Content`)**
    *   성공적으로 삭제되었으며, 별도의 본문(body)은 없습니다.

*   **Error Responses**

| HTTP Code | Error Code | 설명 |
| :--- | :--- | :--- |
| `401 Unauthorized` | `NOT_AUTHENTICATED` | 로그인이 필요할 때 |
| `403 Forbidden` | `NO_PERMISSION` | 관리자 권한이 없을 때 |
| `404 Not Found` | `ITEM_NOT_FOUND` | 해당 `item_id`의 물품이 없을 때 |
| `409 Conflict` | `ITEM_IN_USE` | 해당 물품과 연결된 대여 기록이 있어 삭제할 수 없을 때 |

---
#### **3.6. 카테고리 목록 조회 (Get All Categories)**

물품을 분류하는 데 사용되는 모든 카테고리 목록을 조회합니다.

*   **Endpoint:** `GET /api/categories`
*   **Description:** 시스템에 등록된 모든 카테고리를 반환합니다.
*   **Required Permissions:** All Users

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
#### **3.7. 카테고리 생성 (Create Category)**

관리자가 새로운 카테고리를 추가합니다.

*   **Endpoint:** `POST /api/categories`
*   **Description:** 새로운 카테고리 이름을 받아 저장합니다.
*   **Required Permissions:** Admin Only

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
#### **3.8. 카테고리 수정 (Update Category)**

관리자가 기존 카테고리의 이름을 수정합니다.

*   **Endpoint:** `PUT /api/categories/{category_id}`
*   **Description:** `category_id`에 해당하는 카테고리의 이름을 수정합니다.
*   **Required Permissions:** Admin Only

---

#### **Path Parameters**

| 파라미터 | 타입 | 설명 |
| :--- | :--- | :--- |
| `category_id` | `integer` | 수정할 카테고리의 고유 ID |

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
| `404 Not Found` | `CATEGORY_NOT_FOUND` | 해당 `category_id`의 카테고리가 없을 때 |
| (이 외 Create Category의 Error Responses 참조) | | |

---
#### **3.9. 카테고리 삭제 (Delete Category)**

관리자가 카테고리를 삭제합니다.

*   **Endpoint:** `DELETE /api/categories/{category_id}`
*   **Description:** `category_id`에 해당하는 카테고리를 삭제합니다.
*   **Required Permissions:** Admin Only

---

#### **Path Parameters**

| 파라미터 | 타입 | 설명 |
| :--- | :--- | :--- |
| `category_id` | `integer` | 삭제할 카테고리의 고유 ID |

---

#### **Responses**

*   **Success Response (`204 No Content`)**

*   **Error Responses**

| HTTP Code | Error Code | 설명 |
| :--- | :--- | :--- |
| `404 Not Found` | `CATEGORY_NOT_FOUND` | 해당 `category_id`의 카테고리가 없을 때 |
| `409 Conflict` | `CATEGORY_IN_USE` | 해당 카테고리에 속한 물품이 있어 삭제할 수 없을 때 |
| (이 외 Delete Item의 Error Responses 참조) | | |

---
### **4. 대여 (Rentals)**

#### **4.1. 새 대여 예약 생성 (Create Rental)**

`FR-15` 요구사항에 따라, 사용자가 장바구니의 물품들을 최종적으로 대여 예약합니다.

*   **Endpoint:** `POST /api/rentals`
*   **Description:** 대여할 물품 목록과 대여 기간을 받아 새로운 대여 예약을 생성합니다.
*   **Required Permissions:** Authenticated Users

---

#### **Request Body**

```json
{
  "start_date": "2024-08-01",
  "end_date": "2024-08-05",
  "items": [
    { "item_id": 1, "quantity": 1 },
    { "item_id": 5, "quantity": 2 }
  ]
}
```
* `start_date`: (string, required) 대여 시작일 (YYYY-MM-DD)
* `end_date`: (string, required) 반납 예정일 (YYYY-MM-DD)
* `items`: (array, required) 대여할 물품 목록
    * `item_id`: (integer, required) 물품 ID
    * `quantity`: (integer, required) 대여 수량

---

#### **Responses**

*   **Success Response (`201 Created`)**
    *   생성된 대여 정보(`rental`)와 포함된 품목(`rental_items`) 정보를 반환합니다.

```json
{
  "id": 101,
  "user_id": "a1b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5p6",
  "start_date": "2024-08-01",
  "end_date": "2024-08-05",
  "status": "RESERVED",
  "created_at": "2024-07-20T10:00:00Z",
  "rental_items": [
    { "item_id": 1, "name": "DSLR 카메라", "quantity": 1 },
    { "item_id": 5, "name": "삼각대", "quantity": 2 }
  ]
}
```

*   **Error Responses**

| HTTP Code | Error Code | 설명 |
| :--- | :--- | :--- |
| `400 Bad Request` | `INVALID_DATE_RANGE` | 대여 기간이 유효하지 않을 때 (예: 시작일이 반납일보다 늦음) |
| `400 Bad Request` | `RENTAL_PERIOD_EXCEEDED` | `FR-14`에 따라 최대 예약 가능 기간(2개월)을 초과했을 때 |
| `400 Bad Request` | `RENTAL_ON_HOLIDAY` | `FR-14`에 따라 휴무일에 대여/반납을 시도할 때 |
| `409 Conflict` | `INSUFFICIENT_STOCK` | 요청한 기간에 재고가 부족할 때 |

---
#### **4.2. 대여 목록 조회 (Get Rentals)**

사용자 또는 관리자가 대여 목록을 조회합니다.

*   **Endpoint:** `GET /api/rentals`
*   **Description:** 일반 사용자는 자신의 주문 내역만, 관리자는 전체 주문 내역을 조회할 수 있습니다.
*   **Required Permissions:** Authenticated Users (Admin은 전체 조회 가능)

---

#### **Query Parameters**

| 파라미터 | 타입 | 필수 여부 | 설명 |
| :--- | :--- | :--- | :--- |
| `user_id` | `uuid` | 선택 (Admin) | 특정 사용자의 대여 내역을 조회합니다. (관리자 전용) |
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
      "user": { "name": "김테스트", "student_id": "202412345" },
      "start_date": "2024-08-01",
      "end_date": "2024-08-05",
      "status": "RESERVED",
      "item_summary": "DSLR 카메라 외 1건",
      "created_at": "2024-07-20T10:00:00Z"
    }
  ]
}
```

---
#### **4.3. 대여 상세 조회 (Get Rental Details)**

특정 대여 건의 상세 정보를 조회합니다.

*   **Endpoint:** `GET /api/rentals/{rental_id}`
*   **Description:** `rental_id`에 해당하는 대여 건의 상세 정보와 포함된 모든 물품 목록을 반환합니다.
*   **Required Permissions:** Authenticated Users (자신의 대여 건) or Admin

---

#### **Path Parameters**

| 파라미터 | 타입 | 설명 |
| :--- | :--- | :--- |
| `rental_id` | `integer` | 조회할 대여의 고유 ID |

---

#### **Responses**

*   **Success Response (`200 OK`)**
    *   `POST /api/rentals` 성공 응답과 유사하나, 더 상세한 정보를 포함합니다.

*   **Error Responses**

| HTTP Code | Error Code | 설명 |
| :--- | :--- | :--- |
| `403 Forbidden` | `NO_PERMISSION` | 자신의 대여 건이 아닌 경우 (User) |
| `404 Not Found` | `RENTAL_NOT_FOUND` | 해당 `rental_id`의 대여 건이 없을 때 |

---
#### **4.4. 대여 정보 수정 (Update Rental)**

`FR-16` 요구사항에 따라, '예약' 상태인 대여 건의 정보를 사용자가 수정합니다.

*   **Endpoint:** `PUT /api/rentals/{rental_id}`
*   **Description:** 대여 기간 또는 품목 수량을 수정합니다.
*   **Required Permissions:** Authenticated Users (자신의 대여 건)

---

#### **Path Parameters**

| 파라미터 | 타입 | 설명 |
| :--- | :--- | :--- |
| `rental_id` | `integer` | 수정할 대여의 고유 ID |

---

#### **Request Body**
*   `POST /api/rentals`의 Request Body와 동일하며, 모든 필드는 선택적입니다.

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
#### **4.5. 대여 예약 취소 (Cancel Rental)**

`FR-17` 요구사항에 따라, '예약' 상태인 대여 건을 사용자가 취소합니다.

*   **Endpoint:** `DELETE /api/rentals/{rental_id}`
*   **Description:** `rental_id`에 해당하는 예약을 취소하고, 재고를 복구합니다.
*   **Required Permissions:** Authenticated Users (자신의 대여 건)

---

#### **Path Parameters**

| 파라미터 | 타입 | 설명 |
| :--- | :--- | :--- |
| `rental_id` | `integer` | 취소할 대여의 고유 ID |

---

#### **Responses**

*   **Success Response (`204 No Content`)**

*   **Error Responses**

| HTTP Code | Error Code | 설명 |
| :--- | :--- | :--- |
| `403 Forbidden` | `NOT_CANCELLABLE` | '예약' 상태가 아니어서 취소할 수 없을 때 |
| (이 외 Get Rental Details의 Error 참조) | | |

---
#### **4.6. 대여 상태 변경 (Update Rental Status)**

`FR-20` 요구사항에 따라, 관리자가 대여 건의 상태를 변경합니다.

*   **Endpoint:** `PUT /api/rentals/{rental_id}/status`
*   **Description:** 관리자가 물품 수령/반납 등에 따라 대여 상태를 직접 변경합니다.
*   **Required Permissions:** Admin Only

---

#### **Path Parameters**

| 파라미터 | 타입 | 설명 |
| :--- | :--- | :--- |
| `rental_id` | `integer` | 상태를 변경할 대여의 고유 ID |

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

#### **5.1. 플로터 주문 신청 (Create Plotter Order)**

`FR-27`, `FR-28` 요구사항에 따라, 사용자가 플로터 인쇄를 주문 신청합니다.

*   **Endpoint:** `POST /api/plotter/orders`
*   **Description:** 인쇄 목적, 용지 크기, 인쇄 장수 등의 정보와 PDF 파일을 받아 플로터 주문을 신청합니다. 파일 업로드를 위해 `multipart/form-data` 형식을 사용합니다.
*   **Required Permissions:** Authenticated Users

---

#### **Request Body (multipart/form-data)**

| 필드명 | 타입 | 필수 여부 | 설명 |
| :--- | :--- | :--- | :--- |
| `purpose` | `string` | 필수 | 인쇄 목적 |
| `paper_size` | `string` | 필수 | 용지 크기 (예: `A0`, `A1`) |
| `page_count` | `integer` | 필수 | 인쇄 장수 (업로드된 PDF 파일의 페이지 수와 일치해야 함) |
| `is_paid_service` | `boolean` | 필수 | 유료 서비스 여부 (서버에서 자동 판별 후 클라이언트에 전달) |
| `payment_receipt_image` | `file` | 유료 시 필수 | 입금 내역 캡처 이미지 파일 (유료 서비스일 경우) |
| `pdf_file` | `file` | 필수 | 인쇄할 PDF 파일 |

---

#### **Responses**

*   **Success Response (`201 Created`)**
    *   생성된 플로터 주문 정보를 반환합니다.

```json
{
  "id": 201,
  "user_id": "a1b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5p6",
  "purpose": "졸업 작품 포스터",
  "paper_size": "A0",
  "page_count": 1,
  "is_paid_service": true,
  "price": 5000,
  "file_url": "https://example.com/files/order_201.pdf",
  "original_filename": "poster.pdf",
  "pickup_date": "2024-07-25",
  "status": "PENDING",
  "created_at": "2024-07-22T11:00:00Z"
}
```

*   **Error Responses**

| HTTP Code | Error Code | 설명 |
| :--- | :--- | :--- |
| `400 Bad Request` | `INVALID_FILE_TYPE` | PDF 파일이 아닐 때 |
| `400 Bad Request` | `PAGE_COUNT_MISMATCH` | 입력된 `page_count`와 실제 PDF 페이지 수가 다를 때 |
| `400 Bad Request` | `PAYMENT_RECEIPT_REQUIRED` | 유료 서비스인데 `payment_receipt_image`가 누락되었을 때 |
| `400 Bad Request` | `INVALID_INPUT` | 필수 필드 누락 또는 유효성 검사 실패 |
| `401 Unauthorized` | `NOT_AUTHENTICATED` | 로그인이 필요할 때 |
| `500 Internal Server Error` | `SERVER_ERROR` | 서버 내부 로직 처리 중 에러 발생 |

---
#### **5.2. 플로터 주문 목록 조회 (Get Plotter Orders)**

사용자 또는 관리자가 플로터 주문 목록을 조회합니다.

*   **Endpoint:** `GET /api/plotter/orders`
*   **Description:** 일반 사용자는 자신의 주문 내역만, 관리자는 전체 주문 내역을 조회할 수 있습니다.
*   **Required Permissions:** Authenticated Users (Admin은 전체 조회 가능)

---

#### **Query Parameters**

| 파라미터 | 타입 | 필수 여부 | 설명 |
| :--- | :--- | :--- | :--- |
| `user_id` | `uuid` | 선택 (Admin) | 특정 사용자의 주문 내역을 조회합니다. (관리자 전용) |
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
      "user": { "name": "김테스트", "student_id": "202412345" },
      "purpose": "졸업 작품 포스터",
      "paper_size": "A0",
      "page_count": 1,
      "pickup_date": "2024-07-25",
      "status": "PENDING",
      "created_at": "2024-07-22T11:00:00Z"
    }
  ]
}
```

---
#### **5.3. 플로터 주문 취소 (Cancel Plotter Order)**

`FR-29` 요구사항에 따라, '주문 대기' 상태인 플로터 주문을 사용자가 취소합니다.

*   **Endpoint:** `DELETE /api/plotter/orders/{order_id}`
*   **Description:** `order_id`에 해당하는 주문을 취소합니다. '주문 대기' 상태에서만 가능합니다.
*   **Required Permissions:** Authenticated Users (자신의 주문 건)

---

#### **Path Parameters**

| 파라미터 | 타입 | 설명 |
| :--- | :--- | :--- |
| `order_id` | `integer` | 취소할 주문의 고유 ID |

---

#### **Responses**

*   **Success Response (`204 No Content`)**

*   **Error Responses**

| HTTP Code | Error Code | 설명 |
| :--- | :--- | :--- |
| `403 Forbidden` | `NOT_CANCELLABLE` | '주문 대기' 상태가 아니어서 취소할 수 없을 때 |
| `404 Not Found` | `ORDER_NOT_FOUND` | 해당 `order_id`의 주문이 없을 때 |
| `401 Unauthorized` | `NOT_AUTHENTICATED` | 로그인이 필요할 때 |

---
#### **5.4. 플로터 주문 상태 변경 (Update Plotter Order Status)**

`FR-30` 요구사항에 따라, 관리자가 플로터 주문의 상태를 변경합니다.

*   **Endpoint:** `PUT /api/plotter/orders/{order_id}/status`
*   **Description:** 관리자가 플로터 주문의 상태를 변경하고, 필요한 경우 반려 사유를 기록합니다.
*   **Required Permissions:** Admin Only

---

#### **Path Parameters**

| 파라미터 | 타입 | 설명 |
| :--- | :--- | :--- |
| `order_id` | `integer` | 상태를 변경할 주문의 고유 ID |

---

#### **Request Body**

```json
{
  "status": "CONFIRMED",
  "rejection_reason": "PDF 파일에 문제가 있습니다."
}
```
* `status`: (string, required) 변경할 상태. (`PENDING`, `CONFIRMED`, `PRINTED`, `REJECTED`, `COMPLETED`)
* `rejection_reason`: (string, optional) `status`가 `REJECTED`일 경우 필수.

---

#### **Responses**

*   **Success Response (`200 OK`)**
    *   상태 변경이 완료된 플로터 주문 정보를 반환합니다.

*   **Error Responses**

| HTTP Code | Error Code | 설명 |
| :--- | :--- | :--- |
| `400 Bad Request` | `INVALID_STATUS_TRANSITION` | 유효하지 않은 상태 변경일 때 |
| `400 Bad Request` | `REJECTION_REASON_REQUIRED` | `status`가 `REJECTED`인데 `rejection_reason`이 누락되었을 때 |
| `404 Not Found` | `ORDER_NOT_FOUND` | 해당 `order_id`의 주문이 없을 때 |
| `401 Unauthorized` | `NOT_AUTHENTICATED` | 로그인이 필요할 때 |
| `403 Forbidden` | `NO_PERMISSION` | 관리자 권한이 없을 때 |
| `500 Internal Server Error` | `SERVER_ERROR` | 서버 내부 로직 처리 중 에러 발생 |

---
### **6. 관리 (Admin)**

#### **6.1. 통계 데이터 조회 (Get Statistics)**

관리자가 시스템의 주요 통계 데이터를 조회합니다.

*   **Endpoint:** `GET /api/admin/stats`
*   **Description:** 총 사용자 수, 총 대여 건수, 인기 물품 목록 등 시스템 운영에 필요한 다양한 통계 정보를 반환합니다.
*   **Required Permissions:** Admin Only

---

#### **Responses**

*   **Success Response (`200 OK`)**

```json
{
  "total_users": 1250,
  "total_rentals": 3450,
  "active_rentals": 50,
  "overdue_rentals": 5,
  "most_rented_items": [
    { "item_id": 1, "name": "DSLR 카메라", "rental_count": 120 },
    { "item_id": 2, "name": "빔 프로젝터", "rental_count": 98 }
  ],
  "plotter_orders_pending": 10,
  "plotter_orders_completed": 150
}
```

*   **Error Responses**

| HTTP Code | Error Code | 설명 |
| :--- | :--- | :--- |
| `401 Unauthorized` | `NOT_AUTHENTICATED` | 로그인이 필요할 때 |
| `403 Forbidden` | `NO_PERMISSION` | 관리자 권한이 없을 때 |
| `500 Internal Server Error` | `SERVER_ERROR` | 서버 내부 로직 처리 중 에러 발생 |

---
#### **6.2. 휴무일 목록 조회 (Get Holidays)**

`FR-31` 요구사항에 따라, 관리자가 설정한 휴무일 목록을 조회합니다.

*   **Endpoint:** `GET /api/admin/holidays`
*   **Description:** 시스템에 등록된 모든 휴무일 목록을 반환합니다.
*   **Required Permissions:** All Users (물품 대여/플로터 예약 시 휴무일 정보가 필요하므로)

---

#### **Responses**

*   **Success Response (`200 OK`)**

```json
[
  { "id": 1, "holiday_date": "2024-09-16", "description": "추석 연휴" },
  { "id": 2, "holiday_date": "2024-10-03", "description": "개천절" }
]
```

*   **Error Responses**

| HTTP Code | Error Code | 설명 |
| :--- | :--- | :--- |
| `500 Internal Server Error` | `SERVER_ERROR` | 서버 내부 로직 처리 중 에러 발생 |

---
#### **6.3. 휴무일 추가 (Add Holiday)**

`FR-31` 요구사항에 따라, 관리자가 새로운 휴무일을 추가합니다.

*   **Endpoint:** `POST /api/admin/holidays`
*   **Description:** 새로운 휴무일 정보를 받아 저장합니다.
*   **Required Permissions:** Admin Only

---

#### **Request Body**

```json
{
  "holiday_date": "2024-12-25",
  "description": "성탄절"
}
```
* `holiday_date`: (string, required, unique) 휴무일 날짜 (YYYY-MM-DD)
* `description`: (string, optional) 휴무일 설명

---

#### **Responses**

*   **Success Response (`201 Created`)**

```json
{ "id": 3, "holiday_date": "2024-12-25", "description": "성탄절" }
```

*   **Error Responses**

| HTTP Code | Error Code | 설명 |
| :--- | :--- | :--- |
| `409 Conflict` | `DUPLICATE_HOLIDAY` | 동일한 날짜의 휴무일이 이미 존재할 때 |
| (이 외 Admin API의 Error Responses 참조) | | |

---
#### **6.4. 휴무일 삭제 (Delete Holiday)**

`FR-31` 요구사항에 따라, 관리자가 휴무일을 삭제합니다.

*   **Endpoint:** `DELETE /api/admin/holidays/{holiday_id}`
*   **Description:** `holiday_id`에 해당하는 휴무일을 삭제합니다.
*   **Required Permissions:** Admin Only

---

#### **Path Parameters**

| 파라미터 | 타입 | 설명 |
| :--- | :--- | :--- |
| `holiday_id` | `integer` | 삭제할 휴무일의 고유 ID |

---

#### **Responses**

*   **Success Response (`204 No Content`)**

*   **Error Responses**

| HTTP Code | Error Code | 설명 |
| :--- | :--- | :--- |
| `404 Not Found` | `HOLIDAY_NOT_FOUND` | 해당 `holiday_id`의 휴무일이 없을 때 |
| (이 외 Admin API의 Error Responses 참조) | | |

---
#### **6.5. 시스템 설정 목록 조회 (Get Configurations)**

관리자가 시스템의 모든 설정 목록을 조회합니다.

*   **Endpoint:** `GET /api/admin/configurations`
*   **Description:** 시스템에 저장된 모든 설정(`config_key`, `config_value`, `description`)을 반환합니다.
*   **Required Permissions:** Admin Only

---

#### **Responses**

*   **Success Response (`200 OK`)**

```json
[
  {
    "config_key": "login_attempt_limit",
    "config_value": "5",
    "description": "로그인 시도 횟수 제한"
  },
  {
    "config_key": "rental_max_period_months",
    "config_value": "2",
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
#### **6.6. 시스템 설정 수정 (Update Configurations)**

관리자가 시스템 설정을 수정합니다.

*   **Endpoint:** `PUT /api/admin/configurations`
*   **Description:** 하나 이상의 시스템 설정을 업데이트합니다. `config_key`를 기준으로 `config_value`를 변경합니다.
*   **Required Permissions:** Admin Only

---

#### **Request Body**

```json
{
  "config_key": "login_attempt_limit",
  "config_value": "7"
}
```
* `config_key`: (string, required) 설정 키
* `config_value`: (string, required) 변경할 설정 값

---

#### **Responses**

*   **Success Response (`200 OK`)**
    *   업데이트된 설정 목록을 반환합니다.

```json
[
  {
    "config_key": "login_attempt_limit",
    "config_value": "7",
    "description": "로그인 시도 횟수 제한"
  },
  {
    "config_key": "rental_max_period_months",
    "config_value": "3",
    "description": "최대 대여 가능 기간 (개월)"
  }
]
```

*   **Error Responses**

| HTTP Code | Error Code | 설명 |
| :--- | :--- | :--- |
| `400 Bad Request` | `INVALID_INPUT` | `config_value`가 유효하지 않을 때 |
| `404 Not Found` | `CONFIG_KEY_NOT_FOUND` | 존재하지 않는 `config_key`를 수정하려 할 때 |
| (이 외 Admin API의 Error Responses 참조) | | |