-- categories 테이블 초기 데이터
INSERT INTO public.categories (name) VALUES
('행사 대여물품'),
('체육 관련 대여물품'),
('기타 대여물품');

-- items 테이블 초기 데이터
-- 카테고리 ID는 위 INSERT 순서에 따라 1: 행사, 2: 체육, 3: 기타 로 가정합니다.

-- 행사 대여물품
INSERT INTO public.items (category_id, name, total_quantity) VALUES
(1, '유선마이크', 9),
(1, '무선마이크', 8),
(1, '무선마이크(송수신기)', 4),
(1, '대형 무선 앰프', 6),
(1, '소형 무선 앰프', 6),
(1, '걸이형 마이크', 1),
(1, '구르마(소형)', 4),
(1, '구르마(대형)', 5),
(1, '리드선', 8),
(1, '천막', 13),
(1, '테이블', 27),
(1, '듀라테이블', 8),
(1, '의자', 97),
(1, '돗자리', 8);

-- 체육 관련 대여물품
INSERT INTO public.items (category_id, name, total_quantity) VALUES
(2, '피구공', 5),
(2, '축구공', 1),
(2, '농구공', 1),
(2, '대줄넘기', 2),
(2, '줄다리기 줄', 5),
(2, '전자휘슬', 1),
(2, '족구네트', 3),
(2, '에어펌프', 2),
(2, '계주봉', 5),
(2, '고깔', 40);

-- 기타 대여물품
INSERT INTO public.items (category_id, name, total_quantity) VALUES
(3, 'Aux선(C타입)', 3),
(3, 'Aux선(라이트닝)', 3),
(3, 'Aux선(Aux)', 3),
(3, '의사봉', 1),
(3, '이젤', 5),
(3, '삼각대', 3),
(3, '경광봉', 2),
(3, '빔프로젝터', 1),
(3, '빔스크린', 1),
(3, '화이트보드', 1),
(3, '명찰', 260),
(3, '몰카탐지기', 8),
(3, '아이스박스', 2),
(3, '확성기', 1);

-- configurations 테이블 초기 데이터
INSERT INTO public.configurations (config_key, config_value, description) VALUES
  ('rental_max_period_months',      '2',                                                                          '최대 대여 가능 기간 (개월)'),
  ('login_attempt_limit',           '5',                                                                          '로그인 시도 횟수 제한'),
  ('plotter_pickup_delay_days',     '2',                                                                          '플로터 신청 후 수령까지 걸리는 근무일 수'),
  ('verification_code_ttl_minutes', '5',                                                                          '인증번호 유효 시간 (분)'),
  ('plotter_price_a0',              '5000',                                                                       'A0 용지 인쇄 단가 (원)'),
  ('plotter_price_a1',              '3000',                                                                       'A1 용지 인쇄 단가 (원)'),
  ('plotter_free_departments',      '중앙동아리,중앙자치기구',                                                      '무료 인쇄 대상 소속 단위'),
  ('plotter_free_purposes',         '예산안 출력,동아리 행사',                                                      '무료 인쇄 대상 목적'),
  ('plotter_departments_list',      '총학생회,중앙자치기구,단과대,학과,중앙동아리,단과대동아리,학과동아리,기타', '서비스 이용 가능 소속 단위 리스트')
ON CONFLICT (config_key) DO NOTHING;
