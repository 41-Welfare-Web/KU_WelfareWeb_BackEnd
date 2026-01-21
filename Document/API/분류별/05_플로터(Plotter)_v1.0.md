**[주의] 이 문서는 `API/통합/RentalWeb_API_v1.0_통합.md` 파일에서 자동으로 생성된 일부입니다. 통합 문서가 업데이트될 경우, 이 문서의 내용도 반드시 동기화해야 합니다.**

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