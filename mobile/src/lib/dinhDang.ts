// Định dạng tiền, ngày, hạn bảo hành. Thuần TypeScript (không dùng React Native) để test được bằng node --test.

/** 28200000 → "28.200.000 đ" */
export function tien(n: number | string | null | undefined): string {
  const v = Math.round(Number(n) || 0);
  return (v < 0 ? '-' : '') + String(Math.abs(v)).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' đ';
}

/** Số gọn cho ô nhỏ: 56500000 → "56,5 tr", 1250000000 → "1,25 tỷ", 950000 → "950 k", 0 → "0" */
export function tienGon(n: number | string | null | undefined): string {
  const v = Math.round(Number(n) || 0), a = Math.abs(v), dau = v < 0 ? '-' : '';
  const so = (x: number, donVi: string) => dau + String(Math.round(x * 100) / 100).replace('.', ',') + ' ' + donVi;
  if (a >= 1e9) return so(a / 1e9, 'tỷ');
  if (a >= 1e6) return so(Math.round(a / 1e5) / 10, 'tr');
  if (a >= 1e3) return dau + Math.round(a / 1e3) + ' k';
  return String(v);
}

/** "2026-10-11" → "11/10/2026"; chuỗi lạ giữ nguyên */
export function ngay(s: string | null | undefined): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s ?? ''));
  return m ? `${m[3]}/${m[2]}/${m[1]}` : String(s ?? '');
}

export type TinhTrangBH = { nhan: string; loai: 'con' | 'sap' | 'het' | 'khong' };

/** Hạn bảo hành của một máy từ kết quả traBaoHanh (ConNgay: số ngày còn lại, âm là đã hết; null là không bảo hành) */
export function tinhTrangBaoHanh(x: { HetHan?: string; ConNgay?: number | null }): TinhTrangBH {
  if (!x.HetHan || x.ConNgay === null || x.ConNgay === undefined) return { nhan: 'Không bảo hành', loai: 'khong' };
  const n = x.ConNgay;
  if (n < 0) return { nhan: `Hết hạn ${-n} ngày`, loai: 'het' };
  if (n === 0) return { nhan: 'Hết hạn hôm nay', loai: 'sap' };
  return { nhan: `Còn ${n} ngày`, loai: n <= 30 ? 'sap' : 'con' };
}

/** Lời chào theo giờ (0–23) */
export function loiChao(gio: number): string {
  if (gio < 11) return 'Chào buổi sáng';
  if (gio < 14) return 'Chào buổi trưa';
  if (gio < 18) return 'Chào buổi chiều';
  return 'Chào buổi tối';
}

/** "2026-10-11" → "T7" (thứ trong tuần, dùng cho biểu đồ 7 ngày) */
export function thu(s: string): string {
  const d = new Date(s + 'T00:00:00Z').getUTCDay();
  return Number.isNaN(d) ? '' : d === 0 ? 'CN' : 'T' + (d + 1);
}

/** Ngày theo giờ Việt Nam (UTC+7, như máy chủ) của thời điểm d, dạng "2026-10-11" – điện thoại để múi giờ khác vẫn ghi đúng ngày phiếu thu */
export function homNay(d: Date = new Date()): string {
  return new Date(d.getTime() + 7 * 36e5).toISOString().slice(0, 10);
}

/** Hôm nay (giờ Việt Nam) cộng n ngày theo lịch, dạng "2026-10-14" */
export function congNgay(n: number, d: Date = new Date()): string {
  const v = new Date(d.getTime() + 7 * 36e5);
  v.setUTCDate(v.getUTCDate() + n);
  return v.toISOString().slice(0, 10);
}
