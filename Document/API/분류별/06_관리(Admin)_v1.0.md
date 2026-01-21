**[주의] 이 문서는 `API/통합/RentalWeb_API_v1.0_통합.md` 파일에서 자동으로 생성된 일부입니다. 통합 문서가 업데이트될 경우, 이 문서의 내용도 반드시 동기화해야 합니다.**

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