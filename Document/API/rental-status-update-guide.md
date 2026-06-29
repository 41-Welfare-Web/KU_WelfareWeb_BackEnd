# 대여 상태 변경 API 가이드

> 프론트엔드 연동 참고용

---

## 엔드포인트

```
PUT /api/rentals/:id/status
```

---

## 변경 전 vs 변경 후

### 변경 전 (기존 동작)

`rentalItemId` 없이 상태를 넘기면 **예약 묶음 내 모든 품목**이 한 번에 같은 상태로 변경됐습니다.

```json
// 요청
{
  "status": "RETURNED"
}
// → 해당 rental에 속한 모든 rentalItem이 RETURNED로 변경됨
```

문제 상황: 마이크 3개 + 의자 10개를 묶음 예약했을 때, 마이크 1개만 불량이어도 전체를 처리해야 했음.

---

### 변경 후 (현재 동작)

`rentalItemId`를 함께 넘기면 **해당 품목 하나만** 상태가 변경됩니다.

```json
// 요청 - 특정 품목만 변경
{
  "status": "DEFECTIVE",
  "rentalItemId": 42,
  "memo": "마이크 파손 확인"
}
// → rentalItem ID 42번만 DEFECTIVE로 변경됨
// → 나머지 품목은 기존 상태 유지
// → DEFECTIVE 처리된 품목이 개별 실물(instanceId)을 가지면 해당 실물 상태도 BROKEN으로 자동 변경
```

```json
// 요청 - 전체 일괄 변경 (기존과 동일)
{
  "status": "RETURNED"
}
// → 해당 rental의 모든 품목이 RETURNED로 변경됨
```

---

## Request Body 전체 필드

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `status` | `string` | 선택 | 변경할 상태. 생략 시 메모만 업데이트 |
| `rentalItemId` | `number` | 선택 | 개별 품목 처리 시 해당 RentalItem의 ID. 생략 시 전체 일괄 변경 |
| `memo` | `string` | 선택 | 비고/메모 |

---

## 사용 가능한 status 값

| 값 | 설명 |
|----|------|
| `RESERVED` | 예약 |
| `RENTED` | 대여 중 |
| `RETURNED` | 반납 완료 |
| `CANCELED` | 취소 |
| `OVERDUE` | 연체 |
| `DEFECTIVE` | 불량 |

> `rentalItemId`는 모든 status에 사용 가능합니다. DEFECTIVE 전용이 아닙니다.

---

## 사용 시나리오

### 시나리오 1: 전체 반납 처리
```json
{ "status": "RETURNED", "memo": "정상 반납" }
```
→ 묶음 내 모든 품목 RETURNED 처리

### 시나리오 2: 특정 품목만 불량 처리
```json
{ "status": "DEFECTIVE", "rentalItemId": 42, "memo": "마이크 파손" }
```
→ 42번 품목만 DEFECTIVE, 나머지는 그대로

### 시나리오 3: 특정 품목만 먼저 반납
```json
{ "status": "RETURNED", "rentalItemId": 55 }
```
→ 55번 품목만 RETURNED, 나머지는 기존 상태 유지

### 시나리오 4: 메모만 수정
```json
{ "memo": "반납 일정 협의 중" }
```
→ 상태 변경 없이 메모만 업데이트

---

## rentalItemId 확인 방법

`GET /api/rentals/:id` 응답의 `rentalItems` 배열에서 각 품목의 `id` 값을 사용합니다.

```json
// GET /api/rentals/10 응답 예시
{
  "id": 10,
  "rentalItems": [
    { "id": 41, "item": { "name": "무선마이크" }, "quantity": 2, "status": "RENTED" },
    { "id": 42, "item": { "name": "무선마이크" }, "quantity": 1, "status": "RENTED" },
    { "id": 55, "item": { "name": "의자" }, "quantity": 10, "status": "RENTED" }
  ]
}
// rentalItemId에 41, 42, 55 중 하나를 넣으면 해당 품목만 변경됨
```
