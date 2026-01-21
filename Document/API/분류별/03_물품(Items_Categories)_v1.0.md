**[주의] 이 문서는 `API/통합/RentalWeb_API_v1.0_통합.md` 파일에서 자동으로 생성된 일부입니다. 통합 문서가 업데이트될 경우, 이 문서의 내용도 반드시 동기화해야 합니다.**

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