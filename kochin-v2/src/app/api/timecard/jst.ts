// タイムカードの時刻まわりの共通ルール
//
// ・データベース(timecard / breaks)の時刻の列は「世界標準時(UTC)」で保存する
// ・画面に出すときだけ日本時間(Asia/Tokyo)に直す
// ・どのパソコン・サーバーで動いても同じ結果になるよう、変換は必ずここで明示する

// 日本時間での「今日」の日付（例: "2026-10-13"）
export function todayJst(): string {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().split('T')[0];
}

// 日本時間の日付 "YYYY-MM-DD" と時刻 "HH:MM" を、
// データベースに保存する形（UTCの日時文字列 "YYYY-MM-DD HH:MM:SS"）に変換する
export function jstToUtcWall(date: string, hhmm: string): string {
  const d = new Date(`${date}T${hhmm}:00+09:00`);
  return d.toISOString().slice(0, 19).replace('T', ' ');
}
