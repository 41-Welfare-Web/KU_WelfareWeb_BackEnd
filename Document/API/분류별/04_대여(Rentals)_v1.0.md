**[주의] 이 문서는 `API/통합/RentalWeb_API_v1.0_통합.md` 파일에서 자동으로 생성된 일부입니다. 통합 문서가 업데이트될 경우, 이 문서의 내용도 반드시 동기화해야 합니다.**

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