// Gọi điện, nhắn Zalo, mã VietQR chuyển khoản. Thuần TypeScript để test được bằng node --test.

/** Bỏ dấu tiếng Việt, viết thường (giống norm() của web) */
export const boDau = (s: string | null | undefined): string =>
  String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();

/** Số đầu tiên trong ô SĐT ("0911 000 001 / 0922…" → "0911000001"); +84 / 84 đầu số đổi về 0. Không có số hợp lệ → "" */
export function soDienThoai(sdt: string | null | undefined): string {
  const dau = String(sdt ?? '').split(/[\/,;]/).map(x => x.replace(/[^\d+]/g, '')).find(x => x.replace(/\D/g, '').length >= 8) || '';
  const so = dau.replace(/\D/g, '');
  if (!so) return '';
  return /^84\d{9}$/.test(so) ? '0' + so.slice(2) : so;
}

export const linkGoi = (sdt: string) => { const s = soDienThoai(sdt); return s ? 'tel:' + s : ''; };
export const linkZalo = (sdt: string) => { const s = soDienThoai(sdt); return s ? 'https://zalo.me/' + s : ''; };

export type TaiKhoanQR = { bin: string; nganHang: string; soTK: string; chuTK: string };

/** Nội dung chuyển khoản: không dấu, chỉ chữ và số, viết hoa, tối đa 50 ký tự (ngân hàng hay cắt ký tự lạ) */
export function noiDungCK(s: string): string {
  return boDau(s).replace(/[^0-9a-z]+/g, ' ').trim().toUpperCase().slice(0, 50).trim();
}

/**
 * Ảnh mã VietQR (dịch vụ Quick Link của vietqr.io, giống trang web): khách quét bằng app ngân hàng là có sẵn số tài khoản, số tiền, nội dung.
 * Chưa khai tài khoản nhận tiền → "".
 */
export function linkVietQR(qr: TaiKhoanQR | null | undefined, soTien: number, noiDung: string, kieu = 'compact2'): string {
  if (!qr || !qr.bin || !qr.soTK) return '';
  const p: string[] = [];
  if (soTien > 0) p.push('amount=' + Math.round(soTien));
  const nd = noiDungCK(noiDung);
  if (nd) p.push('addInfo=' + encodeURIComponent(nd));
  if (qr.chuTK) p.push('accountName=' + encodeURIComponent(qr.chuTK));
  return `https://img.vietqr.io/image/${encodeURIComponent(qr.bin)}-${encodeURIComponent(qr.soTK)}-${kieu}.png${p.length ? '?' + p.join('&') : ''}`;
}
