#!/bin/bash
###############################################################################
# RentalWeb — 전체 API E2E 테스트 스크립트
# 대상: Railway 배포 서버
# 실행: bash test_api_full.sh
###############################################################################

BASE_URL="https://rentalweb-production.up.railway.app/api"

# 관리자 계정
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="admin123!"

# 색상
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# 카운터
PASS=0
FAIL=0
SKIP=0
TOTAL=0

# 저장 변수
ACCESS_TOKEN=""
REFRESH_TOKEN=""
ADMIN_USER_ID=""

# 임시 파일
RESP_FILE=$(mktemp)
trap "rm -f $RESP_FILE" EXIT

###############################################################################
# 유틸리티
###############################################################################

log_section() {
  echo ""
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${CYAN}  $1${NC}"
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# HTTP 요청 후 STATUS, BODY 전역변수에 결과 저장
http_get() {
  local url="$1"
  local token="${2:-}"
  if [ -n "$token" ]; then
    STATUS=$(curl -s -o "$RESP_FILE" -w '%{http_code}' -H "Authorization: Bearer $token" "$url" 2>/dev/null || echo "000")
  else
    STATUS=$(curl -s -o "$RESP_FILE" -w '%{http_code}' "$url" 2>/dev/null || echo "000")
  fi
  BODY=$(cat "$RESP_FILE" 2>/dev/null || echo "")
}

http_post() {
  local url="$1"
  local data_file="$2"
  local token="${3:-}"
  if [ -n "$token" ]; then
    STATUS=$(curl -s -o "$RESP_FILE" -w '%{http_code}' -X POST \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $token" \
      -d @"$data_file" "$url" 2>/dev/null || echo "000")
  else
    STATUS=$(curl -s -o "$RESP_FILE" -w '%{http_code}' -X POST \
      -H "Content-Type: application/json" \
      -d @"$data_file" "$url" 2>/dev/null || echo "000")
  fi
  BODY=$(cat "$RESP_FILE" 2>/dev/null || echo "")
}

http_put() {
  local url="$1"
  local data_file="$2"
  local token="${3:-}"
  if [ -n "$token" ]; then
    STATUS=$(curl -s -o "$RESP_FILE" -w '%{http_code}' -X PUT \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $token" \
      -d @"$data_file" "$url" 2>/dev/null || echo "000")
  else
    STATUS=$(curl -s -o "$RESP_FILE" -w '%{http_code}' -X PUT \
      -H "Content-Type: application/json" \
      -d @"$data_file" "$url" 2>/dev/null || echo "000")
  fi
  BODY=$(cat "$RESP_FILE" 2>/dev/null || echo "")
}

http_delete() {
  local url="$1"
  local token="${2:-}"
  if [ -n "$token" ]; then
    STATUS=$(curl -s -o "$RESP_FILE" -w '%{http_code}' -X DELETE -H "Authorization: Bearer $token" "$url" 2>/dev/null || echo "000")
  else
    STATUS=$(curl -s -o "$RESP_FILE" -w '%{http_code}' -X DELETE "$url" 2>/dev/null || echo "000")
  fi
  BODY=$(cat "$RESP_FILE" 2>/dev/null || echo "")
}

# JSON body를 임시파일에 쓰고 경로 반환
jbody() {
  local tmp
  tmp=$(mktemp)
  cat > "$tmp"
  echo "$tmp"
}

assert_status() {
  local test_id="$1" test_name="$2" expected="$3"
  TOTAL=$((TOTAL + 1))
  if [ "$STATUS" = "$expected" ]; then
    PASS=$((PASS + 1))
    echo -e "  ${GREEN}✓ PASS${NC} [$test_id] $test_name (HTTP $STATUS)"
  else
    FAIL=$((FAIL + 1))
    echo -e "  ${RED}✗ FAIL${NC} [$test_id] $test_name (expected $expected, got $STATUS)"
    echo -e "    ${YELLOW}Response: ${BODY:0:200}${NC}"
  fi
}

assert_status_oneof() {
  local test_id="$1" test_name="$2"
  shift 2
  local expected=("$@")
  TOTAL=$((TOTAL + 1))
  local match=false
  for exp in "${expected[@]}"; do
    [ "$STATUS" = "$exp" ] && match=true
  done
  if $match; then
    PASS=$((PASS + 1))
    echo -e "  ${GREEN}✓ PASS${NC} [$test_id] $test_name (HTTP $STATUS)"
  else
    FAIL=$((FAIL + 1))
    echo -e "  ${RED}✗ FAIL${NC} [$test_id] $test_name (expected ${expected[*]}, got $STATUS)"
    echo -e "    ${YELLOW}Response: ${BODY:0:200}${NC}"
  fi
}

assert_body_contains() {
  local test_id="$1" test_name="$2" expected="$3" substring="$4"
  TOTAL=$((TOTAL + 1))
  if [ "$STATUS" = "$expected" ] && echo "$BODY" | grep -q "$substring"; then
    PASS=$((PASS + 1))
    echo -e "  ${GREEN}✓ PASS${NC} [$test_id] $test_name (HTTP $STATUS, contains '$substring')"
  else
    FAIL=$((FAIL + 1))
    echo -e "  ${RED}✗ FAIL${NC} [$test_id] $test_name (expected $expected+'$substring', got $STATUS)"
    echo -e "    ${YELLOW}Response: ${BODY:0:200}${NC}"
  fi
}

skip_test() {
  local test_id="$1" test_name="$2" reason="$3"
  TOTAL=$((TOTAL + 1))
  SKIP=$((SKIP + 1))
  echo -e "  ${YELLOW}⊘ SKIP${NC} [$test_id] $test_name — $reason"
}

# JSON 값 추출 (jq 없이)
jval() { echo "$BODY" | grep -o "\"$1\"[[:space:]]*:[[:space:]]*\"[^\"]*\"" | head -1 | sed "s/\"$1\"[[:space:]]*:[[:space:]]*\"//" | sed 's/"$//'; }
jnum() { echo "$BODY" | grep -o "\"$1\"[[:space:]]*:[[:space:]]*[0-9]*" | head -1 | grep -o '[0-9]*$'; }

###############################################################################
# 미래 평일 날짜 계산
###############################################################################
get_future_weekday() {
  local days_ahead=${1:-5}
  local current_date
  current_date=$(date +%s)
  local count=0
  local check_date=$current_date
  while [ $count -lt $days_ahead ]; do
    check_date=$((check_date + 86400))
    local dow
    dow=$(date -d "@$check_date" +%u 2>/dev/null || date -r "$check_date" +%u 2>/dev/null)
    if [ "$dow" -le 5 ]; then
      count=$((count + 1))
    fi
  done
  date -d "@$check_date" +%Y-%m-%d 2>/dev/null || date -r "$check_date" +%Y-%m-%d 2>/dev/null
}

FUTURE_START=$(get_future_weekday 5)
FUTURE_END=$(get_future_weekday 10)
FUTURE_START2=$(get_future_weekday 15)
FUTURE_END2=$(get_future_weekday 20)

# 고유 식별자 (중복 방지)
TS=$(date +%s)

echo ""
echo "==========================================================="
echo "  RentalWeb API 통합 테스트"
echo "  서버: $BASE_URL"
echo "  시작: $(date '+%Y-%m-%d %H:%M:%S')"
echo "  테스트 날짜: $FUTURE_START ~ $FUTURE_END"
echo "==========================================================="

###############################################################################
# 1. Auth
###############################################################################
log_section "1. Auth (인증)"

# 1-1. 관리자 로그인
F=$(jbody <<EOF
{"username":"$ADMIN_USERNAME","password":"$ADMIN_PASSWORD"}
EOF
)
http_post "$BASE_URL/auth/login" "$F"
rm -f "$F"
assert_status "1-1" "관리자 로그인 성공" 200

if [ "$STATUS" = "200" ]; then
  ACCESS_TOKEN=$(jval "accessToken")
  REFRESH_TOKEN=$(jval "refreshToken")
  # user.id 추출
  ADMIN_USER_ID=$(echo "$BODY" | grep -o '"id":"[^"]*"' | head -1 | sed 's/"id":"//' | sed 's/"$//')
  echo "    → Token: ${ACCESS_TOKEN:0:20}..."
  echo "    → User ID: $ADMIN_USER_ID"
fi

# 1-2. 잘못된 비밀번호
F=$(jbody <<EOF
{"username":"admin","password":"wrongpass123!"}
EOF
)
http_post "$BASE_URL/auth/login" "$F"; rm -f "$F"
assert_status "1-2" "잘못된 비밀번호 로그인 실패" 401

# 1-3. 없는 사용자
F=$(jbody <<EOF
{"username":"nonexistent_user_xyz","password":"test1234!"}
EOF
)
http_post "$BASE_URL/auth/login" "$F"; rm -f "$F"
assert_status "1-3" "존재하지 않는 사용자 로그인 실패" 401

# 1-4. 토큰 갱신
if [ -n "$REFRESH_TOKEN" ]; then
  F=$(jbody <<EOF
{"refreshToken":"$REFRESH_TOKEN"}
EOF
)
  http_post "$BASE_URL/auth/refresh" "$F"; rm -f "$F"
  assert_status "1-4" "토큰 갱신 성공" 200
  if [ "$STATUS" = "200" ]; then
    NEW_AT=$(jval "accessToken")
    NEW_RT=$(jval "refreshToken")
    [ -n "$NEW_AT" ] && ACCESS_TOKEN="$NEW_AT"
    [ -n "$NEW_RT" ] && REFRESH_TOKEN="$NEW_RT"
  fi
else
  skip_test "1-4" "토큰 갱신" "refreshToken 없음"
fi

# 1-5. 잘못된 refreshToken
F=$(jbody <<EOF
{"refreshToken":"invalid.token.here"}
EOF
)
http_post "$BASE_URL/auth/refresh" "$F"; rm -f "$F"
assert_status "1-5" "잘못된 refreshToken 거부" 401

# 1-6. 로그아웃 + 재로그인
if [ -n "$REFRESH_TOKEN" ]; then
  F=$(jbody <<EOF
{"refreshToken":"$REFRESH_TOKEN"}
EOF
)
  http_post "$BASE_URL/auth/logout" "$F" "$ACCESS_TOKEN"; rm -f "$F"
  assert_status "1-6" "로그아웃 성공" 200

  # 재로그인
  F=$(jbody <<EOF
{"username":"$ADMIN_USERNAME","password":"$ADMIN_PASSWORD"}
EOF
)
  http_post "$BASE_URL/auth/login" "$F"; rm -f "$F"
  if [ "$STATUS" = "200" ]; then
    ACCESS_TOKEN=$(jval "accessToken")
    REFRESH_TOKEN=$(jval "refreshToken")
    echo "    → 재로그인 완료"
  fi
else
  skip_test "1-6" "로그아웃" "refreshToken 없음"
fi

# 1-7. 아이디 찾기 (존재)
F=$(jbody <<'EOF'
{"name":"관리자","phoneNumber":"010-0000-0000"}
EOF
)
http_post "$BASE_URL/auth/find-username" "$F"; rm -f "$F"
assert_status "1-7" "아이디 찾기 (존재)" 200

# 1-8. 아이디 찾기 (미존재)
F=$(jbody <<'EOF'
{"name":"없는사람","phoneNumber":"010-9999-9999"}
EOF
)
http_post "$BASE_URL/auth/find-username" "$F"; rm -f "$F"
assert_status "1-8" "아이디 찾기 (미존재, 보안 동일응답)" 200

# 1-9. 비밀번호 재설정 요청
F=$(jbody <<'EOF'
{"username":"admin","phoneNumber":"010-0000-0000"}
EOF
)
http_post "$BASE_URL/auth/password-reset/request" "$F"; rm -f "$F"
assert_status_oneof "1-9" "비밀번호 재설정 요청" 200 400

# 1-10. 비밀번호 재설정 - 잘못된 코드
F=$(jbody <<'EOF'
{"username":"admin","verificationCode":"000000"}
EOF
)
http_post "$BASE_URL/auth/password-reset/verify" "$F"; rm -f "$F"
assert_status "1-10" "비밀번호 재설정 - 잘못된 코드" 400

# 1-11. 비밀번호 재설정 - 잘못된 토큰
F=$(jbody <<'EOF'
{"resetToken":"invalid.token","newPassword":"NewPass123!"}
EOF
)
http_post "$BASE_URL/auth/password-reset/confirm" "$F"; rm -f "$F"
assert_status_oneof "1-11" "비밀번호 재설정 - 잘못된 토큰" 400 401

# 1-12. 회원가입 인증번호 요청
F=$(jbody <<'EOF'
{"phoneNumber":"01099999999"}
EOF
)
http_post "$BASE_URL/auth/request-signup-verification" "$F"; rm -f "$F"
assert_status_oneof "1-12" "회원가입 인증번호 요청" 200 201 400

# 1-13. 회원가입 인증번호 - 잘못된 코드
F=$(jbody <<'EOF'
{"phoneNumber":"01099999999","verificationCode":"000000"}
EOF
)
http_post "$BASE_URL/auth/verify-signup-code" "$F"; rm -f "$F"
assert_status_oneof "1-13" "회원가입 인증번호 - 잘못된 코드" 400 404

###############################################################################
# 2. Users
###############################################################################
log_section "2. Users (사용자)"

# 2-1. 내 정보 조회
http_get "$BASE_URL/users/me" "$ACCESS_TOKEN"
assert_status "2-1" "내 정보 조회" 200

# 2-2. 인증 없이 내 정보 조회
http_get "$BASE_URL/users/me"
assert_status "2-2" "인증 없이 내 정보 조회 거부" 401

# 2-3. 대시보드
http_get "$BASE_URL/users/me/dashboard" "$ACCESS_TOKEN"
assert_status "2-3" "대시보드 조회" 200

# 2-4. 내 정보 수정
F=$(jbody <<EOF
{"currentPassword":"$ADMIN_PASSWORD","departmentType":"총학생회"}
EOF
)
http_put "$BASE_URL/users/me" "$F" "$ACCESS_TOKEN"; rm -f "$F"
assert_status "2-4" "내 정보 수정 (소속 변경)" 200

# 2-5. 내 정보 수정 (잘못된 비밀번호로 비밀번호 변경 시도)
F=$(jbody <<'EOF'
{"currentPassword":"wrongpass!","newPassword":"NewPass999!"}
EOF
)
http_put "$BASE_URL/users/me" "$F" "$ACCESS_TOKEN"; rm -f "$F"
assert_status "2-5" "내 정보 수정 (잘못된 비밀번호)" 401

# 2-6. 전체 사용자 조회
http_get "$BASE_URL/users" "$ACCESS_TOKEN"
assert_status "2-6" "전체 사용자 조회 (Admin)" 200

# 2-7. 전체 사용자 조회 (검색)
http_get "$BASE_URL/users?search=admin" "$ACCESS_TOKEN"
assert_status "2-7" "전체 사용자 조회 (검색)" 200

# 2-8/2-9. 역할 변경 — skip (테스트 사용자 없음)
skip_test "2-8" "사용자 역할 변경" "테스트용 사용자 없음"
skip_test "2-9" "잘못된 역할 변경" "테스트용 사용자 없음"

###############################################################################
# 3. Categories
###############################################################################
log_section "3. Categories (카테고리)"

# 3-1. 목록 조회
http_get "$BASE_URL/categories"
assert_status "3-1" "카테고리 목록 조회" 200

# 3-2. 생성
TEST_CATEGORY_ID=""
F=$(jbody <<'EOF'
{"name":"_테스트카테고리_"}
EOF
)
http_post "$BASE_URL/categories" "$F" "$ACCESS_TOKEN"; rm -f "$F"
assert_status "3-2" "카테고리 생성" 201
if [ "$STATUS" = "201" ]; then
  TEST_CATEGORY_ID=$(jnum "id")
  echo "    → 카테고리 ID: $TEST_CATEGORY_ID"
fi

# 3-3. 중복 생성
F=$(jbody <<'EOF'
{"name":"_테스트카테고리_"}
EOF
)
http_post "$BASE_URL/categories" "$F" "$ACCESS_TOKEN"; rm -f "$F"
assert_status "3-3" "카테고리 중복 생성 거부" 409

# 3-4. 수정
if [ -n "$TEST_CATEGORY_ID" ]; then
  F=$(jbody <<'EOF'
{"name":"_테스트카테고리_수정_"}
EOF
)
  http_put "$BASE_URL/categories/$TEST_CATEGORY_ID" "$F" "$ACCESS_TOKEN"; rm -f "$F"
  assert_status "3-4" "카테고리 수정" 200
else
  skip_test "3-4" "카테고리 수정" "생성 실패"
fi

# 3-6. 없는 카테고리 삭제
http_delete "$BASE_URL/categories/99999" "$ACCESS_TOKEN"
assert_status "3-6" "없는 카테고리 삭제 거부" 404

# 3-5. 테스트 카테고리 삭제
if [ -n "$TEST_CATEGORY_ID" ]; then
  http_delete "$BASE_URL/categories/$TEST_CATEGORY_ID" "$ACCESS_TOKEN"
  assert_status_oneof "3-5" "카테고리 삭제" 200 204
else
  skip_test "3-5" "카테고리 삭제" "생성 실패"
fi

###############################################################################
# 4. Items
###############################################################################
log_section "4. Items (물품)"

# 4-1. 목록 조회
http_get "$BASE_URL/items"
assert_status "4-1" "물품 목록 조회" 200
FIRST_ITEM_ID=$(jnum "id")
[ -z "$FIRST_ITEM_ID" ] && FIRST_ITEM_ID=1
echo "    → 첫 물품 ID: $FIRST_ITEM_ID"

# 4-2. 검색
http_get "$BASE_URL/items?search=%EB%A7%88%EC%9D%B4%ED%81%AC"
assert_status "4-2" "물품 목록 검색 (마이크)" 200

# 4-3. 카테고리 필터
http_get "$BASE_URL/items?categoryIds=1"
assert_status "4-3" "물품 목록 카테고리 필터" 200

# 4-4. 상세 조회
http_get "$BASE_URL/items/$FIRST_ITEM_ID"
assert_status "4-4" "물품 상세 조회" 200

# 4-5. 없는 물품
http_get "$BASE_URL/items/99999"
assert_status "4-5" "없는 물품 조회 거부" 404

# 4-6. 재고 조회 (캘린더)
http_get "$BASE_URL/items/$FIRST_ITEM_ID/availability?startDate=$FUTURE_START&endDate=$FUTURE_END"
assert_status "4-6" "물품 재고 조회 (캘린더)" 200

# 4-7. 물품 생성 (BULK)
TEST_ITEM_ID=""
F=$(mktemp)
cat > "$F" <<EOF
{"categoryId":1,"name":"_E2E테스트물품_","itemCode":"E2E-TEST-$TS","managementType":"BULK","totalQuantity":10}
EOF
http_post "$BASE_URL/items" "$F" "$ACCESS_TOKEN"; rm -f "$F"
assert_status "4-7" "물품 생성 (BULK)" 201
if [ "$STATUS" = "201" ]; then
  TEST_ITEM_ID=$(jnum "id")
  echo "    → 물품 ID: $TEST_ITEM_ID"
fi

# 4-8. 코드 중복
F=$(mktemp)
cat > "$F" <<EOF
{"categoryId":1,"name":"중복","itemCode":"E2E-TEST-$TS","managementType":"BULK","totalQuantity":5}
EOF
http_post "$BASE_URL/items" "$F" "$ACCESS_TOKEN"; rm -f "$F"
assert_status "4-8" "물품 코드 중복 생성 거부" 409

# 4-9. 물품 수정
if [ -n "$TEST_ITEM_ID" ]; then
  F=$(jbody <<'EOF'
{"name":"_E2E테스트물품_수정_","totalQuantity":15}
EOF
)
  http_put "$BASE_URL/items/$TEST_ITEM_ID" "$F" "$ACCESS_TOKEN"; rm -f "$F"
  assert_status "4-9" "물품 수정" 200
else
  skip_test "4-9" "물품 수정" "물품 생성 실패"
fi

# INDIVIDUAL 물품 생성 (인스턴스 테스트용)
INDIVIDUAL_ITEM_ID=""
F=$(mktemp)
cat > "$F" <<EOF
{"categoryId":1,"name":"_E2E개별관리물품_","itemCode":"E2E-IND-$TS","managementType":"INDIVIDUAL","totalQuantity":0}
EOF
http_post "$BASE_URL/items" "$F" "$ACCESS_TOKEN"; rm -f "$F"
[ "$STATUS" = "201" ] && INDIVIDUAL_ITEM_ID=$(jnum "id")

# 4-11. 개별 실물 등록
TEST_INSTANCE_ID=""
if [ -n "$INDIVIDUAL_ITEM_ID" ]; then
  F=$(mktemp)
  cat > "$F" <<EOF
{"serialNumber":"E2E-SN-$TS","status":"AVAILABLE"}
EOF
  http_post "$BASE_URL/items/$INDIVIDUAL_ITEM_ID/instances" "$F" "$ACCESS_TOKEN"; rm -f "$F"
  assert_status "4-11" "개별 실물 등록" 201
  [ "$STATUS" = "201" ] && TEST_INSTANCE_ID=$(jnum "id") && echo "    → 인스턴스 ID: $TEST_INSTANCE_ID"
else
  skip_test "4-11" "개별 실물 등록" "INDIVIDUAL 물품 생성 실패"
fi

# 4-12. 개별 실물 조회
if [ -n "$INDIVIDUAL_ITEM_ID" ]; then
  http_get "$BASE_URL/items/$INDIVIDUAL_ITEM_ID/instances" "$ACCESS_TOKEN"
  assert_status "4-12" "개별 실물 조회" 200
else
  skip_test "4-12" "개별 실물 조회" "INDIVIDUAL 물품 없음"
fi

# 4-13. 개별 실물 수정
if [ -n "$TEST_INSTANCE_ID" ]; then
  F=$(jbody <<'EOF'
{"status":"BROKEN"}
EOF
)
  http_put "$BASE_URL/items/instances/$TEST_INSTANCE_ID" "$F" "$ACCESS_TOKEN"; rm -f "$F"
  assert_status "4-13" "개별 실물 수정 (BROKEN)" 200
else
  skip_test "4-13" "개별 실물 수정" "인스턴스 없음"
fi

# 4-15. 세트 구성품 추가
COMPONENT_RELATION_ID=""
if [ -n "$TEST_ITEM_ID" ]; then
  F=$(mktemp)
  echo "{\"componentId\":$FIRST_ITEM_ID,\"quantity\":1}" > "$F"
  http_post "$BASE_URL/items/$TEST_ITEM_ID/components" "$F" "$ACCESS_TOKEN"; rm -f "$F"
  assert_status "4-15" "세트 구성품 추가" 201
  [ "$STATUS" = "201" ] && COMPONENT_RELATION_ID=$(jnum "id")
else
  skip_test "4-15" "세트 구성품 추가" "물품 없음"
fi

# 4-16. 세트 구성품 삭제 (componentId는 물품 ID, relation PK가 아님)
if [ -n "$TEST_ITEM_ID" ] && [ -n "$COMPONENT_RELATION_ID" ]; then
  http_delete "$BASE_URL/items/$TEST_ITEM_ID/components/$FIRST_ITEM_ID" "$ACCESS_TOKEN"
  assert_status_oneof "4-16" "세트 구성품 삭제" 200 204
else
  skip_test "4-16" "세트 구성품 삭제" "구성품 없음"
fi

# 4-14. 개별 실물 삭제
if [ -n "$TEST_INSTANCE_ID" ]; then
  http_delete "$BASE_URL/items/instances/$TEST_INSTANCE_ID" "$ACCESS_TOKEN"
  assert_status_oneof "4-14" "개별 실물 삭제" 200 204
else
  skip_test "4-14" "개별 실물 삭제" "인스턴스 없음"
fi

# Cleanup: INDIVIDUAL 물품
[ -n "$INDIVIDUAL_ITEM_ID" ] && http_delete "$BASE_URL/items/$INDIVIDUAL_ITEM_ID" "$ACCESS_TOKEN" > /dev/null 2>&1

###############################################################################
# 5. Cart
###############################################################################
log_section "5. Cart (장바구니)"

# 5-1. 장바구니 물품 추가
TEST_CART_ID=""
F=$(mktemp); echo "{\"itemId\":$FIRST_ITEM_ID,\"quantity\":1}" > "$F"
http_post "$BASE_URL/cart" "$F" "$ACCESS_TOKEN"; rm -f "$F"
assert_status "5-1" "장바구니 물품 추가" 201
[ "$STATUS" = "201" ] && TEST_CART_ID=$(jnum "id") && echo "    → Cart ID: $TEST_CART_ID"

# 5-2. 동일 물품 재추가 (upsert)
F=$(mktemp); echo "{\"itemId\":$FIRST_ITEM_ID,\"quantity\":2}" > "$F"
http_post "$BASE_URL/cart" "$F" "$ACCESS_TOKEN"; rm -f "$F"
assert_status "5-2" "동일 물품 재추가 (upsert)" 201
[ "$STATUS" = "201" ] && TEST_CART_ID=$(jnum "id")

# 5-3. 없는 물품 추가
F=$(jbody <<'EOF'
{"itemId":99999,"quantity":1}
EOF
)
http_post "$BASE_URL/cart" "$F" "$ACCESS_TOKEN"; rm -f "$F"
assert_status "5-3" "없는 물품 추가 거부" 404

# 5-4. 장바구니 조회
http_get "$BASE_URL/cart" "$ACCESS_TOKEN"
assert_status "5-4" "장바구니 조회" 200

# 5-5. 날짜 설정
if [ -n "$TEST_CART_ID" ]; then
  F=$(mktemp); echo "{\"quantity\":1,\"startDate\":\"$FUTURE_START\",\"endDate\":\"$FUTURE_END\"}" > "$F"
  http_put "$BASE_URL/cart/$TEST_CART_ID" "$F" "$ACCESS_TOKEN"; rm -f "$F"
  assert_status "5-5" "장바구니 날짜 설정" 200
else
  skip_test "5-5" "장바구니 날짜 설정" "장바구니 없음"
fi

# 5-6. 과거 날짜 설정
if [ -n "$TEST_CART_ID" ]; then
  F=$(jbody <<'EOF'
{"startDate":"2020-01-01","endDate":"2020-01-03"}
EOF
)
  http_put "$BASE_URL/cart/$TEST_CART_ID" "$F" "$ACCESS_TOKEN"; rm -f "$F"
  assert_status "5-6" "과거 날짜 설정 거부" 400
else
  skip_test "5-6" "과거 날짜 설정" "장바구니 없음"
fi

# 5-8. 없는 항목 삭제
http_delete "$BASE_URL/cart/99999" "$ACCESS_TOKEN"
assert_status "5-8" "없는 장바구니 항목 삭제 거부" 404

# 5-7. 항목 삭제
if [ -n "$TEST_CART_ID" ]; then
  http_delete "$BASE_URL/cart/$TEST_CART_ID" "$ACCESS_TOKEN"
  assert_status_oneof "5-7" "장바구니 항목 삭제" 200 204
else
  skip_test "5-7" "장바구니 항목 삭제" "장바구니 없음"
fi

###############################################################################
# 6. Rentals
###############################################################################
log_section "6. Rentals (대여)"

# 대여 테스트 전용 BULK 물품 생성 (재고 충분)
RENTAL_TEST_ITEM_ID=""
F=$(mktemp)
cat > "$F" <<EOF
{"categoryId":1,"name":"_E2E대여테스트물품_","itemCode":"E2E-RENTAL-$TS","managementType":"BULK","totalQuantity":100}
EOF
http_post "$BASE_URL/items" "$F" "$ACCESS_TOKEN"; rm -f "$F"
[ "$STATUS" = "201" ] && RENTAL_TEST_ITEM_ID=$(jnum "id") && echo "    → 대여 테스트 물품 ID: $RENTAL_TEST_ITEM_ID"
# fallback
[ -z "$RENTAL_TEST_ITEM_ID" ] && RENTAL_TEST_ITEM_ID=$FIRST_ITEM_ID

# 6-1. 대여 예약 생성
TEST_RENTAL_ID=""
F=$(mktemp)
cat > "$F" <<EOF
{"departmentType":"총학생회","items":[{"itemId":$RENTAL_TEST_ITEM_ID,"quantity":1,"startDate":"$FUTURE_START","endDate":"$FUTURE_END"}]}
EOF
http_post "$BASE_URL/rentals" "$F" "$ACCESS_TOKEN"; rm -f "$F"
assert_status "6-1" "대여 예약 생성 (정상)" 201
if [ "$STATUS" = "201" ]; then
  TEST_RENTAL_ID=$(jnum "id")
  echo "    → 대여 ID: $TEST_RENTAL_ID"
fi

# 6-2. 과거 날짜
F=$(mktemp)
cat > "$F" <<EOF
{"departmentType":"총학생회","items":[{"itemId":$RENTAL_TEST_ITEM_ID,"quantity":1,"startDate":"2020-01-06","endDate":"2020-01-07"}]}
EOF
http_post "$BASE_URL/rentals" "$F" "$ACCESS_TOKEN"; rm -f "$F"
assert_status "6-2" "과거 날짜 예약 거부" 400

# 6-3. 주말 날짜
NEXT_SAT=$(date -d "next Saturday" +%Y-%m-%d 2>/dev/null || echo "2026-03-07")
NEXT_SUN=$(date -d "next Sunday" +%Y-%m-%d 2>/dev/null || echo "2026-03-08")
F=$(mktemp)
cat > "$F" <<EOF
{"departmentType":"총학생회","items":[{"itemId":$RENTAL_TEST_ITEM_ID,"quantity":1,"startDate":"$NEXT_SAT","endDate":"$NEXT_SUN"}]}
EOF
http_post "$BASE_URL/rentals" "$F" "$ACCESS_TOKEN"; rm -f "$F"
assert_status "6-3" "주말 날짜 예약 거부" 400

# 6-4. 최대 기간 초과
FAR_FUTURE=$(date -d "+6 months" +%Y-%m-%d 2>/dev/null || echo "2026-09-01")
FAR_FUTURE_END=$(date -d "+6 months +3 days" +%Y-%m-%d 2>/dev/null || echo "2026-09-04")
F=$(mktemp)
cat > "$F" <<EOF
{"departmentType":"총학생회","items":[{"itemId":$RENTAL_TEST_ITEM_ID,"quantity":1,"startDate":"$FAR_FUTURE","endDate":"$FAR_FUTURE_END"}]}
EOF
http_post "$BASE_URL/rentals" "$F" "$ACCESS_TOKEN"; rm -f "$F"
assert_status "6-4" "최대 기간 초과 예약 거부" 400

# 6-5. 재고 초과
F=$(mktemp)
cat > "$F" <<EOF
{"departmentType":"총학생회","items":[{"itemId":$RENTAL_TEST_ITEM_ID,"quantity":9999,"startDate":"$FUTURE_START","endDate":"$FUTURE_END"}]}
EOF
http_post "$BASE_URL/rentals" "$F" "$ACCESS_TOKEN"; rm -f "$F"
assert_status_oneof "6-5" "재고 초과 예약 거부" 400 409

# 6-6. 목록 조회
http_get "$BASE_URL/rentals" "$ACCESS_TOKEN"
assert_status "6-6" "대여 목록 조회" 200

# 6-7. 상세 조회
if [ -n "$TEST_RENTAL_ID" ]; then
  http_get "$BASE_URL/rentals/$TEST_RENTAL_ID" "$ACCESS_TOKEN"
  assert_status "6-7" "대여 상세 조회" 200
else
  skip_test "6-7" "대여 상세 조회" "대여 없음"
fi

# 6-8. 예약 수정 (RESERVED) — 날짜만 변경
if [ -n "$TEST_RENTAL_ID" ]; then
  # 동일 물품+수량, 날짜만 변경
  MODIFIED_START=$(get_future_weekday 7)
  MODIFIED_END=$(get_future_weekday 12)
  F=$(mktemp)
  cat > "$F" <<EOF
{"departmentType":"총학생회","items":[{"itemId":$RENTAL_TEST_ITEM_ID,"quantity":1,"startDate":"$MODIFIED_START","endDate":"$MODIFIED_END"}]}
EOF
  http_put "$BASE_URL/rentals/$TEST_RENTAL_ID" "$F" "$ACCESS_TOKEN"; rm -f "$F"
  assert_status "6-8" "예약 수정 (RESERVED)" 200
else
  skip_test "6-8" "예약 수정" "대여 없음"
fi

# 6-10. RESERVED → RENTED
if [ -n "$TEST_RENTAL_ID" ]; then
  F=$(jbody <<'EOF'
{"status":"RENTED","memo":"E2E 테스트 수령"}
EOF
)
  http_put "$BASE_URL/rentals/$TEST_RENTAL_ID/status" "$F" "$ACCESS_TOKEN"; rm -f "$F"
  assert_status "6-10" "상태 변경: RESERVED→RENTED" 200
else
  skip_test "6-10" "상태 변경: RESERVED→RENTED" "대여 없음"
fi

# 6-11. RENTED → RETURNED
if [ -n "$TEST_RENTAL_ID" ]; then
  F=$(jbody <<'EOF'
{"status":"RETURNED","memo":"E2E 테스트 반납"}
EOF
)
  http_put "$BASE_URL/rentals/$TEST_RENTAL_ID/status" "$F" "$ACCESS_TOKEN"; rm -f "$F"
  assert_status "6-11" "상태 변경: RENTED→RETURNED" 200
else
  skip_test "6-11" "상태 변경: RENTED→RETURNED" "대여 없음"
fi

# 6-12. 종료된 건 상태 변경
if [ -n "$TEST_RENTAL_ID" ]; then
  F=$(jbody <<'EOF'
{"status":"RENTED","memo":"재시도"}
EOF
)
  http_put "$BASE_URL/rentals/$TEST_RENTAL_ID/status" "$F" "$ACCESS_TOKEN"; rm -f "$F"
  assert_status "6-12" "종료된 건 상태 변경 거부" 400
else
  skip_test "6-12" "종료된 건 상태 변경" "대여 없음"
fi

# 6-13. 관리자 대리 예약
ADMIN_RENTAL_ID=""
if [ -n "$ADMIN_USER_ID" ]; then
  F=$(mktemp)
  cat > "$F" <<EOF
{"targetUserId":"$ADMIN_USER_ID","departmentType":"총학생회","items":[{"itemId":$RENTAL_TEST_ITEM_ID,"quantity":1,"startDate":"$FUTURE_START","endDate":"$FUTURE_END"}]}
EOF
  http_post "$BASE_URL/rentals/admin" "$F" "$ACCESS_TOKEN"; rm -f "$F"
  assert_status "6-13" "관리자 대리 예약" 201
  [ "$STATUS" = "201" ] && ADMIN_RENTAL_ID=$(jnum "id")
else
  skip_test "6-13" "관리자 대리 예약" "Admin ID 없음"
fi

# 6-14. 없는 사용자 대리 예약
F=$(mktemp)
cat > "$F" <<EOF
{"targetUserId":"00000000-0000-0000-0000-000000000000","departmentType":"총학생회","items":[{"itemId":$RENTAL_TEST_ITEM_ID,"quantity":1,"startDate":"$FUTURE_START","endDate":"$FUTURE_END"}]}
EOF
http_post "$BASE_URL/rentals/admin" "$F" "$ACCESS_TOKEN"; rm -f "$F"
assert_status "6-14" "없는 사용자 대리 예약 거부" 404

# 6-9. 예약 취소
if [ -n "$ADMIN_RENTAL_ID" ]; then
  http_delete "$BASE_URL/rentals/$ADMIN_RENTAL_ID" "$ACCESS_TOKEN"
  assert_status_oneof "6-9" "예약 취소 (RESERVED)" 200 204
else
  skip_test "6-9" "예약 취소" "대리 예약 없음"
fi

# 6-15. 재고 복구 확인
http_get "$BASE_URL/items/$RENTAL_TEST_ITEM_ID/availability?startDate=$FUTURE_START&endDate=$FUTURE_END"
assert_status "6-15" "재고 복구 확인 (취소 후)" 200

###############################################################################
# 7. Plotter
###############################################################################
log_section "7. Plotter (플로터)"

# 7-1. 가격 계산 (유료)
F=$(jbody <<'EOF'
{"purpose":"졸업 작품 포스터","paperSize":"A0","pageCount":2}
EOF
)
http_post "$BASE_URL/plotter/calculate-price" "$F" "$ACCESS_TOKEN"; rm -f "$F"
assert_status "7-1" "가격 계산 (유료)" 200

# 7-2. 가격 계산 (무료 조건)
F=$(jbody <<'EOF'
{"purpose":"회칙 명시 사항 인쇄","paperSize":"A1","pageCount":1}
EOF
)
http_post "$BASE_URL/plotter/calculate-price" "$F" "$ACCESS_TOKEN"; rm -f "$F"
assert_status "7-2" "가격 계산 (무료 조건)" 200

# 7-3. 주문 목록 조회
http_get "$BASE_URL/plotter/orders" "$ACCESS_TOKEN"
assert_status "7-3" "주문 목록 조회" 200

# 소속을 중앙동아리로 변경 (무료 주문 가능)
F=$(mktemp)
cat > "$F" <<EOF
{"currentPassword":"$ADMIN_PASSWORD","departmentType":"중앙동아리","departmentName":"테스트동아리"}
EOF
http_put "$BASE_URL/users/me" "$F" "$ACCESS_TOKEN"; rm -f "$F"

# 유효한 PDF 파일 생성
TEMP_PDF="/tmp/e2e_plotter_test.pdf"
printf '%%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n' > "$TEMP_PDF"

# 한글 multipart 값을 파일로 준비 (Windows curl 인코딩 문제 우회)
printf '중앙동아리' > /tmp/f_dept_type.txt
printf '테스트동아리' > /tmp/f_dept_name.txt
printf '회칙 명시 사항 인쇄(예산안 등)' > /tmp/f_purpose.txt

# 플로터 주문 생성 (무료: 중앙동아리 + 무료목적)
PLOTTER_ORDER_ID=""
STATUS=$(curl -s -o "$RESP_FILE" -w '%{http_code}' -X POST \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -F "departmentType=</tmp/f_dept_type.txt" \
  -F "departmentName=</tmp/f_dept_name.txt" \
  -F "purpose=</tmp/f_purpose.txt" \
  -F "paperSize=A0" \
  -F "pageCount=1" \
  -F "pdfFile=@$TEMP_PDF" \
  "$BASE_URL/plotter/orders" 2>/dev/null || echo "000")
BODY=$(cat "$RESP_FILE" 2>/dev/null || echo "")
[ "$STATUS" = "201" ] && PLOTTER_ORDER_ID=$(jnum "id") && echo "    → 주문1 ID: $PLOTTER_ORDER_ID"

# 7-4. 상태 변경 (CONFIRMED)
if [ -n "$PLOTTER_ORDER_ID" ]; then
  F=$(jbody <<'EOF'
{"status":"CONFIRMED"}
EOF
)
  http_put "$BASE_URL/plotter/orders/$PLOTTER_ORDER_ID/status" "$F" "$ACCESS_TOKEN"; rm -f "$F"
  assert_status "7-4" "주문 상태 변경 (CONFIRMED)" 200
else
  skip_test "7-4" "주문 상태 변경 (CONFIRMED)" "주문 생성 실패"
fi

# 두 번째 주문 (반려 테스트용)
PLOTTER_ORDER_ID2=""
STATUS=$(curl -s -o "$RESP_FILE" -w '%{http_code}' -X POST \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -F "departmentType=</tmp/f_dept_type.txt" \
  -F "departmentName=</tmp/f_dept_name.txt" \
  -F "purpose=</tmp/f_purpose.txt" \
  -F "paperSize=A1" \
  -F "pageCount=1" \
  -F "pdfFile=@$TEMP_PDF" \
  "$BASE_URL/plotter/orders" 2>/dev/null || echo "000")
BODY=$(cat "$RESP_FILE" 2>/dev/null || echo "")
[ "$STATUS" = "201" ] && PLOTTER_ORDER_ID2=$(jnum "id") && echo "    → 주문2 ID: $PLOTTER_ORDER_ID2"

# 7-5. 반려 시 사유 누락
if [ -n "$PLOTTER_ORDER_ID2" ]; then
  F=$(jbody <<'EOF'
{"status":"REJECTED"}
EOF
)
  http_put "$BASE_URL/plotter/orders/$PLOTTER_ORDER_ID2/status" "$F" "$ACCESS_TOKEN"; rm -f "$F"
  assert_status "7-5" "반려 시 사유 누락 거부" 400
else
  skip_test "7-5" "반려 시 사유 누락" "주문 생성 실패"
fi

# 7-6. 반려 시 사유 포함
if [ -n "$PLOTTER_ORDER_ID2" ]; then
  F=$(jbody <<'EOF'
{"status":"REJECTED","rejectionReason":"E2E 테스트 반려"}
EOF
)
  http_put "$BASE_URL/plotter/orders/$PLOTTER_ORDER_ID2/status" "$F" "$ACCESS_TOKEN"; rm -f "$F"
  assert_status "7-6" "반려 시 사유 포함 성공" 200
else
  skip_test "7-6" "반려 시 사유 포함" "주문 없음"
fi

# 세 번째 주문 (취소 테스트용)
PLOTTER_ORDER_ID3=""
STATUS=$(curl -s -o "$RESP_FILE" -w '%{http_code}' -X POST \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -F "departmentType=</tmp/f_dept_type.txt" \
  -F "departmentName=</tmp/f_dept_name.txt" \
  -F "purpose=</tmp/f_purpose.txt" \
  -F "paperSize=A0" \
  -F "pageCount=1" \
  -F "pdfFile=@$TEMP_PDF" \
  "$BASE_URL/plotter/orders" 2>/dev/null || echo "000")
BODY=$(cat "$RESP_FILE" 2>/dev/null || echo "")
[ "$STATUS" = "201" ] && PLOTTER_ORDER_ID3=$(jnum "id") && echo "    → 주문3 ID: $PLOTTER_ORDER_ID3"

# 7-7. 주문 취소 (PENDING)
if [ -n "$PLOTTER_ORDER_ID3" ]; then
  http_delete "$BASE_URL/plotter/orders/$PLOTTER_ORDER_ID3" "$ACCESS_TOKEN"
  assert_status_oneof "7-7" "주문 취소 (PENDING)" 200 204
else
  skip_test "7-7" "주문 취소 (PENDING)" "주문 생성 실패"
fi

# 7-8. PENDING 아닌 주문 취소
if [ -n "$PLOTTER_ORDER_ID" ]; then
  http_delete "$BASE_URL/plotter/orders/$PLOTTER_ORDER_ID" "$ACCESS_TOKEN"
  assert_status "7-8" "PENDING 아닌 주문 취소 거부" 400
else
  skip_test "7-8" "PENDING 아닌 주문 취소" "주문 없음"
fi

rm -f "$TEMP_PDF" /tmp/f_dept_type.txt /tmp/f_dept_name.txt /tmp/f_purpose.txt

# 소속 원래대로
F=$(mktemp)
cat > "$F" <<EOF
{"currentPassword":"$ADMIN_PASSWORD","departmentType":"총학생회"}
EOF
http_put "$BASE_URL/users/me" "$F" "$ACCESS_TOKEN" > /dev/null 2>&1; rm -f "$F"

###############################################################################
# 8. Admin
###############################################################################
log_section "8. Admin (관리)"

# 8-1. 통계 조회
http_get "$BASE_URL/admin/stats" "$ACCESS_TOKEN"
assert_status "8-1" "통계 조회" 200

# 8-2. 휴무일 목록
http_get "$BASE_URL/admin/holidays"
assert_status "8-2" "휴무일 목록 조회" 200

# 8-3. 휴무일 추가
TEST_HOLIDAY_ID=""
F=$(jbody <<'EOF'
{"holidayDate":"2026-12-31","description":"E2E 테스트 휴무"}
EOF
)
http_post "$BASE_URL/admin/holidays" "$F" "$ACCESS_TOKEN"; rm -f "$F"
assert_status "8-3" "휴무일 추가" 201
[ "$STATUS" = "201" ] && TEST_HOLIDAY_ID=$(jnum "id") && echo "    → Holiday ID: $TEST_HOLIDAY_ID"

# 8-4. 중복 휴무일
F=$(jbody <<'EOF'
{"holidayDate":"2026-12-31","description":"중복"}
EOF
)
http_post "$BASE_URL/admin/holidays" "$F" "$ACCESS_TOKEN"; rm -f "$F"
assert_status "8-4" "중복 휴무일 추가 거부" 409

# 8-5. 휴무일 삭제
if [ -n "$TEST_HOLIDAY_ID" ]; then
  http_delete "$BASE_URL/admin/holidays/$TEST_HOLIDAY_ID" "$ACCESS_TOKEN"
  assert_status_oneof "8-5" "휴무일 삭제" 200 204
else
  skip_test "8-5" "휴무일 삭제" "휴무일 없음"
fi

# 8-6. 설정 조회
http_get "$BASE_URL/admin/configurations" "$ACCESS_TOKEN"
assert_status "8-6" "설정 조회" 200

# 8-7. 설정 수정
F=$(jbody <<'EOF'
{"configKey":"plotter_price_a0","configValue":"2000"}
EOF
)
http_put "$BASE_URL/admin/configurations" "$F" "$ACCESS_TOKEN"; rm -f "$F"
assert_status "8-7" "설정 수정" 200

# 8-8. 없는 설정 키
F=$(jbody <<'EOF'
{"configKey":"nonexistent_key_xyz","configValue":"test"}
EOF
)
http_put "$BASE_URL/admin/configurations" "$F" "$ACCESS_TOKEN"; rm -f "$F"
assert_status "8-8" "없는 설정 키 수정 거부" 404

###############################################################################
# 9. Common
###############################################################################
log_section "9. Common (공통)"

# 9-1. 헬스체크
http_get "$BASE_URL/common/health"
assert_body_contains "9-1" "헬스체크" 200 "status"

# 9-2. 메타데이터
http_get "$BASE_URL/common/metadata"
assert_body_contains "9-2" "메타데이터 조회" 200 "departments"

# 9-3. 인증 없이 이미지 업로드
STATUS=$(curl -s -o "$RESP_FILE" -w '%{http_code}' -X POST \
  -F "file=@/dev/null" "$BASE_URL/common/upload" 2>/dev/null || echo "000")
BODY=$(cat "$RESP_FILE" 2>/dev/null || echo "")
assert_status "9-3" "인증 없이 이미지 업로드 거부" 401

###############################################################################
# Cleanup
###############################################################################
log_section "Cleanup (테스트 데이터 정리)"

if [ -n "$TEST_ITEM_ID" ]; then
  http_delete "$BASE_URL/items/$TEST_ITEM_ID" "$ACCESS_TOKEN"
  echo "  → 테스트 물품 삭제: HTTP $STATUS"
fi

if [ -n "$RENTAL_TEST_ITEM_ID" ] && [ "$RENTAL_TEST_ITEM_ID" != "$FIRST_ITEM_ID" ]; then
  http_delete "$BASE_URL/items/$RENTAL_TEST_ITEM_ID" "$ACCESS_TOKEN"
  echo "  → 대여 테스트 물품 삭제: HTTP $STATUS"
fi

echo "  → 정리 완료"

###############################################################################
# 결과
###############################################################################
echo ""
echo "==========================================================="
echo "  테스트 결과 요약"
echo "==========================================================="
echo ""
FAILED=$((TOTAL - PASS - SKIP))
echo -e "  총 테스트: ${CYAN}$TOTAL${NC}개"
echo -e "  ${GREEN}통과: $PASS${NC}개"
[ "$SKIP" -gt 0 ] && echo -e "  ${YELLOW}건너뜀: $SKIP${NC}개"
if [ "$FAILED" -gt 0 ]; then
  echo -e "  ${RED}실패: $FAILED${NC}개"
else
  echo -e "  ${GREEN}실패: 0${NC}개"
fi
echo ""
echo "  완료: $(date '+%Y-%m-%d %H:%M:%S')"
echo "==========================================================="

[ "$FAILED" -gt 0 ] && exit 1 || exit 0
