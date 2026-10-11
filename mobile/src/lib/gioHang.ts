// Giỏ hàng của màn hình Bán nhanh: mỗi máy có IMEI là một dòng riêng (số lượng 1), hàng không IMEI (phụ kiện, dịch vụ) cộng dồn.
// Thuần TypeScript để test được bằng node --test. Tiền tính giống máy chủ (luuChungTu): làm tròn từng dòng, VAT làm tròn trên tổng.

export type DongGio = { k: string; MaHH: string; TenHang: string; DVT: string; SoLuong: number; DonGia: number; IMEI: string };
export type HangChon = { MaHH: string; TenHang: string; DVT?: string; GiaLe?: number };

let dem = 0;
const khoaMoi = () => 'd' + Date.now().toString(36) + (++dem).toString(36);

/** giam: giảm giá cả đơn (trừ trước VAT, không quá tiền hàng); cong: cộng các dòng trước khi giảm */
export function tongGio(ds: DongGio[], vat = 0, giam = 0): { cong: number; giam: number; tienHang: number; tienVAT: number; tong: number; soMay: number } {
  const cong = ds.reduce((s, l) => s + Math.round(l.SoLuong * l.DonGia), 0), g = Math.min(Math.max(0, cong), Math.max(0, Math.round(Number(giam) || 0)));
  const tienHang = cong - g;
  const tienVAT = Math.round(tienHang * (Number(vat) || 0) / 100);
  return { cong, giam: g, tienHang, tienVAT, tong: tienHang + tienVAT, soMay: ds.reduce((s, l) => s + l.SoLuong, 0) };
}

/** Thêm một máy theo IMEI/serial. Máy đã có trong giỏ thì báo lỗi (quét trùng). */
export function themMay(ds: DongGio[], h: HangChon, imei: string): DongGio[] {
  const ma = imei.trim().toUpperCase();
  if (!ma) throw new Error('Thiếu IMEI/serial.');
  if (ds.some(l => l.IMEI === ma)) throw new Error(`Máy ${ma} đã có trong đơn.`);
  return [...ds, { k: khoaMoi(), MaHH: h.MaHH, TenHang: h.TenHang, DVT: h.DVT || '', SoLuong: 1, DonGia: Math.round(h.GiaLe || 0), IMEI: ma }];
}

/** Thêm hàng không có IMEI: đã có dòng cùng mặt hàng (không IMEI) thì tăng số lượng. MaHH trống = dịch vụ / hàng ngoài danh mục. */
export function themHang(ds: DongGio[], h: HangChon, soLuong = 1): DongGio[] {
  const ten = h.TenHang.trim();
  if (!ten) throw new Error('Nhập tên hàng / dịch vụ.');
  const i = ds.findIndex(l => !l.IMEI && (h.MaHH ? l.MaHH === h.MaHH : !l.MaHH && l.TenHang === ten));
  if (i >= 0) return ds.map((l, j) => (j === i ? { ...l, SoLuong: l.SoLuong + soLuong } : l));
  return [...ds, { k: khoaMoi(), MaHH: h.MaHH, TenHang: ten, DVT: h.DVT || '', SoLuong: soLuong, DonGia: Math.round(h.GiaLe || 0), IMEI: '' }];
}

/** Đổi số lượng dòng không IMEI; về 0 thì bỏ dòng. Dòng có IMEI luôn là 1 máy. */
export function doiSoLuong(ds: DongGio[], k: string, soLuong: number): DongGio[] {
  const sl = Math.max(0, Math.floor(Number(soLuong) || 0));
  if (!sl) return ds.filter(l => l.k !== k);
  return ds.map(l => (l.k === k && !l.IMEI ? { ...l, SoLuong: sl } : l));
}

export function suaGia(ds: DongGio[], k: string, gia: number): DongGio[] {
  return ds.map(l => (l.k === k ? { ...l, DonGia: Math.max(0, Math.round(Number(gia) || 0)) } : l));
}

export const xoaDong = (ds: DongGio[], k: string): DongGio[] => ds.filter(l => l.k !== k);

/** Dòng gửi lên API banNhanh */
export const dongGui = (ds: DongGio[]) => ds.map(l => ({ MaHH: l.MaHH, TenHang: l.TenHang, DVT: l.DVT, SoLuong: l.SoLuong, DonGia: l.DonGia, IMEI: l.IMEI }));

/** Ô nhập tiền: chỉ lấy chữ số. "28.200.000" → 28200000, "" → 0 */
export function docTien(s: string | number | null | undefined): number {
  const so = String(s ?? '').replace(/\D/g, '').slice(0, 13);
  return so ? Number(so) : 0;
}

/** Hiện số trong ô nhập tiền khi đang gõ: 28200000 → "28.200.000", 0 → "" */
export function soTienNhap(n: number): string {
  return n > 0 ? String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.') : '';
}
