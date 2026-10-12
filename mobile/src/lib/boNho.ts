// Bộ nhớ dữ liệu đã tải: mở lại màn hình là hiện ngay số lần trước, rồi lấy số mới ở nền (stale-while-revalidate).
// Thuần TypeScript (test được bằng node --test). Nơi lưu lâu dài (file trên máy / localStorage) gắn vào bằng datNoiLuu().
// Mỗi mục: { luc: lúc lấy (ms), du: dữ liệu }. Khóa đã gồm tài khoản nên đổi tài khoản không lẫn dữ liệu; đăng xuất thì xóa hết.

export type Muc<T = unknown> = { luc: number; du: T };
export type NoiLuu = {
  doc: (khoa: string) => Promise<string | null>;
  ghi: (khoa: string, giaTri: string) => Promise<void>;
  xoaHet: () => Promise<void>;
};

const ram = new Map<string, Muc>();
const nguoiNghe = new Map<string, Set<() => void>>();
let noiLuu: NoiLuu | null = null;
let doi = 0; // tăng khi xóa hết: bỏ kết quả đọc file của lần trước (đọc xong sau khi đã đăng xuất)

export function datNoiLuu(n: NoiLuu | null) { noiLuu = n; }

/** Khóa bộ nhớ: tài khoản + hàm + tham số */
export function khoaCua(u: string, fn: string, args: unknown[]): string {
  return u + '|' + fn + '|' + JSON.stringify(args);
}

/** Mục trong RAM (đã mở trong lần chạy app này) */
export function layNgay<T>(khoa: string): Muc<T> | null {
  return (ram.get(khoa) as Muc<T> | undefined) ?? null;
}

/** RAM chưa có thì đọc file (mở app lần sau vẫn có số cũ) */
export async function layLuu<T>(khoa: string): Promise<Muc<T> | null> {
  const m = layNgay<T>(khoa);
  if (m || !noiLuu) return m;
  const d = doi;
  try {
    const s = await noiLuu.doc(khoa);
    if (!s || d !== doi) return null;
    const v = JSON.parse(s) as Muc<T>;
    if (!v || typeof v.luc !== 'number' || !('du' in v)) return null;
    if (!ram.has(khoa)) ram.set(khoa, v);
    return layNgay<T>(khoa);
  } catch { return null; }
}

/** Lưu dữ liệu mới (RAM ngay, file ở nền) và báo các màn hình đang xem khóa này. luuMay = false: chỉ giữ trong RAM. */
export function luu<T>(khoa: string, du: T, luuMay = true, luc = Date.now()) {
  const m: Muc<T> = { luc, du };
  ram.set(khoa, m);
  if (luuMay && noiLuu) noiLuu.ghi(khoa, JSON.stringify(m)).catch(() => {});
  bao(khoa);
}

/** Sửa dữ liệu đã nhớ ngay sau khi ghi thành công (vd. thu tiền xong giảm công nợ), không chờ tải lại. Giữ nguyên lúc lấy. */
export function sua<T>(khoa: string, f: (du: T) => T) {
  const m = ram.get(khoa) as Muc<T> | undefined;
  if (!m) return;
  try { luu(khoa, f(m.du), true, m.luc); } catch { /* dữ liệu dạng lạ: để lần tải sau sửa */ }
}

/** Sửa mọi mục có khóa thỏa điều kiện (vd. mọi danh sách khách) */
export function suaNhieu<T>(chon: (khoa: string) => boolean, f: (du: T) => T) {
  [...ram.keys()].filter(chon).forEach(k => sua<T>(k, f));
}

export function nghe(khoa: string, f: () => void): () => void {
  let s = nguoiNghe.get(khoa);
  if (!s) nguoiNghe.set(khoa, (s = new Set()));
  s.add(f);
  return () => { s.delete(f); if (!s.size) nguoiNghe.delete(khoa); };
}

function bao(khoa: string) { nguoiNghe.get(khoa)?.forEach(f => f()); }

/** Đăng xuất / hết phiên: xóa hết dữ liệu đã nhớ trên máy */
export async function xoaHet() {
  doi++;
  ram.clear();
  try { await noiLuu?.xoaHet(); } catch { /* lần sau ghi đè */ }
}

/** "Cập nhật lúc 13:05" / "hôm qua 13:05" / "12/10 13:05" theo giờ máy */
export function moTaLuc(luc: number, bayGio = Date.now()): string {
  const d = new Date(luc), n = new Date(bayGio);
  const gio = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  const ngay0 = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const lech = Math.round((ngay0(n) - ngay0(d)) / 864e5);
  if (lech <= 0) return gio;
  if (lech === 1) return 'hôm qua ' + gio;
  return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + ' ' + gio;
}
