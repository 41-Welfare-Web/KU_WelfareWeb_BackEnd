**[주의] 이 문서는 `API/통합/RentalWeb_API_v1.0_통합.md` 파일에서 자동으로 생성된 일부입니다. 통합 문서가 업데이트될 경우, 이 문서의 내용도 반드시 동기화해야 합니다.**

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