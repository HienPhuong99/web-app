// Tìm kiếm thông minh: cùng thuật toán với máy chủ (apps-script/TimKiem.gs) và web (Index.html, khối <tim-kiem>).
// Mẫu dev/tim-kiem-mau.json kiểm cả ba bản (test/timKiem.test.ts ở đây). Thuần TypeScript để test được bằng node --test.
// 1. Chuẩn hóa: bỏ dấu, chữ thường, bỏ ký tự lạ, tách chữ và số ("ip15pm" → "ip 15 pm", "128GB" → "128 gb").
// 2. Mỗi từ gõ phải khớp, theo thứ tự ưu tiên: trùng nguyên từ (3 điểm) > đầu một từ (2) > nằm trong chuỗi liền không cách
//    (1: "0901234" khớp "0901 234 567", 4 số cuối IMEI) > chữ cái đầu các từ (0,8: "pm" = Pro Max, "tn" = tai nghe) > viết tắt (TU_TAT).
// 3. Không có kết quả nào thì mới thử gần đúng: cho sai 1 chữ (từ 3–6 ký tự) hoặc 2 chữ (từ 7 ký tự), đo bằng khoảng cách sửa chuỗi.
// 4. Điểm cao xếp trước; từ gõ đầu trùng từ đầu của tên được cộng thêm; bằng điểm thì tên ngắn hơn trước.

const TU_TAT: Record<string, string[]> = { ss: ['samsung'], xm: ['xiaomi'], dt: ['dien thoai'], ip: ['iphone'], mb: ['macbook'], aw: ['apple watch'] };

type Ban = { w: string[]; c: string; i: string };
type TuTim = { t: string; alt: string[][] };

const chuan = (s: string | null | undefined): string =>
  String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ').replace(/([a-z])(\d)/g, '$1 $2').replace(/(\d)([a-z])/g, '$1 $2').trim();

function banTim(text: string): Ban {
  const w = chuan(text).split(' ').filter(Boolean);
  return { w, c: w.join(''), i: w.map(x => x[0]).join('') };
}
export const phanTichTim = (q: string): TuTim[] =>
  chuan(q).split(' ').filter(Boolean).map(t => ({ t, alt: [[t], ...(TU_TAT[t] ?? []).map(x => x.split(' '))] }));

/** Khoảng cách sửa chuỗi (thêm / bớt / thay / đổi chỗ hai chữ cạnh nhau); dừng sớm khi chắc chắn vượt toiDa */
export function khoangCach(a: string, b: string, toiDa: number): number {
  if (Math.abs(a.length - b.length) > toiDa) return toiDa + 1;
  let d2: number[] | null = null, d1: number[] = [];
  for (let j = 0; j <= b.length; j++) d1.push(j);
  for (let i = 1; i <= a.length; i++) {
    const d = [i];
    let nho = i;
    for (let j = 1; j <= b.length; j++) {
      let v = Math.min(d1[j] + 1, d[j - 1] + 1, d1[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (d2 && i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, d2[j - 2] + 1);
      d.push(v);
      if (v < nho) nho = v;
    }
    if (nho > toiDa) return toiDa + 1;
    d2 = d1; d1 = d;
  }
  return d1[b.length];
}

function diemTu(t: string, b: Ban, ganDung: boolean): number {
  let best = 0;
  for (const w of b.w) {
    if (w === t) return 3;
    if (best < 2 && w.startsWith(t)) best = 2;
  }
  if (best) return best;
  if (t.length >= 2 && b.c.includes(t)) return 1;
  if (t.length >= 2 && t.length <= 4 && /^[a-z]+$/.test(t) && b.i.includes(t)) return 0.8;
  if (ganDung && t.length >= 3 && !/^\d+$/.test(t)) {
    const toiDa = t.length >= 7 ? 2 : 1;
    for (const w of b.w) {
      if (/^\d+$/.test(w)) continue;
      if (khoangCach(t, w, toiDa) <= toiDa || (w.length > t.length && khoangCach(t, w.slice(0, t.length), toiDa) <= toiDa)) return 0.5;
    }
  }
  return 0;
}

function diemTim(pt: TuTim[], b: Ban, ganDung: boolean): number {
  if (!pt.length) return 1;
  let tong = 0;
  for (const tu of pt) {
    let tot = 0;
    for (const cach of tu.alt) {
      let d = 0, du = true;
      for (const x of cach) { const v = diemTu(x, b, ganDung); if (!v) { du = false; break; } d += v; }
      if (du && d / cach.length > tot) tot = d / cach.length;
    }
    if (!tot) return 0;
    tong += tot;
  }
  const dau = b.w[0] || '';
  if (dau && dau.startsWith(pt[0].t)) tong += 1;
  return tong - b.w.length * 0.01;
}

export type KetQuaTim<T> = T[] & { ganDung?: boolean };
/**
 * Lọc và xếp hạng ds theo câu tìm q; text(x) = chuỗi để tìm của một bản ghi. giuThuTu: chỉ lọc, giữ thứ tự ds.
 * Không có bản ghi nào khớp đúng thì trả kết quả gần đúng (gõ sai chính tả), kèm ganDung = true.
 */
export function timKiem<T>(ds: T[], q: string, text: (x: T) => string, o: { giuThuTu?: boolean } = {}): KetQuaTim<T> {
  const pt = phanTichTim(q);
  if (!pt.length) return ds.slice();
  const ban = ds.map(x => banTim(text(x)));
  const chay = (ganDung: boolean): T[] => {
    const kq: { x: T; d: number; i: number }[] = [];
    ds.forEach((x, i) => { const d = diemTim(pt, ban[i], ganDung); if (d) kq.push({ x, d, i }); });
    if (!o.giuThuTu) kq.sort((a, b) => b.d - a.d || a.i - b.i);
    return kq.map(k => k.x);
  };
  let kq: KetQuaTim<T> = chay(false);
  if (!kq.length) { kq = chay(true); kq.ganDung = kq.length > 0; }
  return kq;
}
