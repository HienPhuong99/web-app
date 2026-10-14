// Máy trong kho để chọn IMEI thay vì gõ đủ 15 số: gõ vài số (thường là mấy số cuối), hoặc chọn mặt hàng máy rồi chọn máy.
// Thuần TypeScript để test được bằng node --test.
import { timKiem } from './timKiem.ts';

/** Một máy trong kho (dsMaTon của máy chủ). giuDen: máy cũ thu đổi còn bị giữ tới ngày đó, chưa bán được. */
export type MaTon = { IMEI: string; MaHH: string; TenHang: string; SoPK: string; Ngay: string; giuDen: string };

const gon = (s: string) => String(s ?? '').replace(/[\s._/-]/g, '').toUpperCase();

/**
 * Gợi ý máy theo chữ đang gõ: gõ số / serial thì tìm trong IMEI (khớp cuối mã xếp trước, rồi đầu mã, rồi giữa); không khớp mã
 * nào (hoặc gõ chữ) thì tìm theo tên máy (tìm kiếm thông minh). Bỏ máy đã có trong đơn. maHH: chỉ máy của mặt hàng đó.
 */
export function goiYMaTon(ds: MaTon[] | null | undefined, go: string, daCo: string[] = [], o: { maHH?: string; toiDa?: number } = {}): MaTon[] {
  const co = new Set(daCo.map(gon)), q = gon(go), toiDa = o.toiDa ?? 8;
  const nguon = (ds ?? []).filter(m => !co.has(gon(m.IMEI)) && (!o.maHH || m.MaHH === o.maHH));
  if (!q) return o.maHH ? nguon.slice(0, toiDa) : [];
  if (/^\d{1,2}$/.test(q)) return []; // 1–2 số: chưa đủ để đoán máy
  if (/\d/.test(q) && q.length >= 3) {
    const hang = (m: MaTon) => { const g = gon(m.IMEI); return g.endsWith(q) ? 0 : g.startsWith(q) ? 1 : g.includes(q) ? 2 : -1; };
    const theoMa = nguon.map(m => ({ m, h: hang(m) })).filter(x => x.h >= 0).sort((a, b) => a.h - b.h).slice(0, toiDa).map(x => x.m);
    if (theoMa.length || /^\d+$/.test(q)) return theoMa;
  }
  return q.length >= 2 ? timKiem(nguon, go, m => `${m.TenHang} ${m.IMEI}`).slice(0, toiDa) : []; // không khớp mã: tìm theo tên máy ("ip 11")
}
