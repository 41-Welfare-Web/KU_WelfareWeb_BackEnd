/**
 * 전역 KST 시간 계산 유틸리티
 * 서버 로컬 타임존에 상관없이 항상 한국 표준시(UTC+9)를 기준으로 날짜를 계산합니다.
 */

/**
 * 현재 시간을 KST 기준으로 반환합니다.
 */
export function getNowKst(): Date {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const kst = new Date(utc + (9 * 60 * 60 * 1000));
  return kst;
}

/**
 * 특정 날짜를 KST 00:00:00 (오늘 시작 시각)으로 변환하여 반환합니다.
 * @param date 변환할 날짜 (기본값: 현재 KST)
 */
export function getStartOfDayKst(date: Date = getNowKst()): Date {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  return startOfDay;
}

/**
 * ISO 문자열 등에서 날짜 부분(YYYY-MM-DD)만 추출하여 KST 자정 객체로 반환합니다.
 * DB 저장 및 비교 시 정합성을 위해 사용합니다.
 */
export function parseDateOnlyKst(dateStr: string): Date {
  const [year, month, day] = dateStr.split('T')[0].split('-').map(Number);
  // UTC 00:00으로 생성하면 DB(Date 타입)와 비교 시 가장 안전함
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
}

/**
 * Date 객체를 YYYY-MM-DD 문자열로 변환합니다. (KST 기준)
 */
export function formatDateOnlyKst(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
