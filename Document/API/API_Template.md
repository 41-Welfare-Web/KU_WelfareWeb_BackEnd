### [순번]. [API 이름]

[API에 대한 간략한 설명. 어떤 요구사항(FR-XX)과 관련 있는지 명시하면 좋음.]

*   **Endpoint:** `[HTTP Method] [URL]`
    *   예: `GET /api/items/{item_id}`
*   **Description:** [API의 역할과 동작에 대한 상세 설명]
*   **Required Permissions:** [API 호출에 필요한 권한 (예: All Users, Authenticated Users, Admin Only)]

---

#### **Path Parameters**

| 파라미터 | 타입 | 설명 |
| :--- | :--- | :--- |
| `example_id` | `integer` | [설명] |

#### **Query Parameters**

| 파라미터 | 타입 | 필수 여부 | 설명 |
| :--- | :--- | :--- | :--- |
| `sort` | `string` | 선택 | [설명] |

#### **Request Body**

```json
{
  "fieldName": "string"
}
```
* `fieldName`: [필드에 대한 설명]

---

#### **Responses**

*   **Success Response (`200 OK` 또는 `201 Created`)**

```json
{
  "data": {
    "id": 1,
    "name": "Sample"
  }
}
```

*   **Error Responses**

| HTTP Code | Error Code | 설명 |
| :--- | :--- | :--- |
| `400 Bad Request` | `INVALID_INPUT` | 요청값이 유효하지 않을 때 |
| `401 Unauthorized` | `NOT_AUTHENTICATED` | 로그인이 필요할 때 |
| `403 Forbidden` | `NO_PERMISSION` | 해당 기능에 대한 권한이 없을 때 |
| `404 Not Found` | `NOT_FOUND` | 요청한 리소스가 존재하지 않을 때 |
| `500 Internal Server Error` | `SERVER_ERROR` | 서버 내부 로직 처리 중 에러 발생 |
