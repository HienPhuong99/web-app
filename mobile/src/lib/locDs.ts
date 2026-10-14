// Lọc và sắp xếp các danh sách trên điện thoại: kho, thẻ kho (nhập – xuất), đơn của khách, điện thoại đăng nhập; và các lựa chọn gửi lên máy chủ
// cho danh sách khách, hợp đồng. Thuần TypeScript (không dùng React Native) để test được bằng node --test.
import type { DongTheKho, HangKho, ThietBi } from './api.ts';
import { timKiem } from './timKiem.ts';

/** Danh sách lựa chọn [giá trị, nhãn]; cái đầu là mặc định */
export type LuaChon<T extends string> = readonly (readonly [T, string])[];
type GiaTri<L> = L extends LuaChon<infer T> ? T : never;

const theoChu = (a: string, b: string) => a.localeCompare(b, 'vi');

// ===== Sắp xếp: chọn tiêu chí, bấm lại tiêu chí đang chọn thì đảo chiều =====
/** 'giam': lớn trước (nhiều → ít, mới → cũ, Z → A), hiện mũi tên ↓; 'tang': nhỏ trước, hiện ↑ */
export type Chieu = 'tang' | 'giam';
/** Tiêu chí sắp xếp [giá trị, nhãn, chiều khi mới chọn]; cái đầu là mặc định */
export type TieuChi<T extends string> = readonly (readonly [T, string, Chieu])[];
export type SapXep<T extends string> = { theo: T; chieu: Chieu };
type TieuChiCua<L> = L extends TieuChi<infer T> ? T : never;
export const sxMacDinh = <T extends string>(ds: TieuChi<T>): SapXep<T> => ({ theo: ds[0][0], chieu: ds[0][2] });
/** Bấm tiêu chí v: đang chọn thì đảo chiều, tiêu chí khác thì chọn với chiều mặc định của nó */
export function bamSapXep<T extends string>(ds: TieuChi<T>, hien: SapXep<T>, v: T): SapXep<T> {
  if (v === hien.theo) return { theo: v, chieu: hien.chieu === 'giam' ? 'tang' : 'giam' };
  return { theo: v, chieu: (ds.find(x => x[0] === v) ?? ds[0])[2] };
}
/** Mô tả cách đang sắp, vd. "theo số lượng, giảm dần" (cho dòng ghi chú và trình đọc màn hình) */
export function moTaSx<T extends string>(ds: TieuChi<T>, sx: SapXep<T>): string {
  return `theo ${(ds.find(x => x[0] === sx.theo) ?? ds[0])[1].toLowerCase()}, ${sx.chieu === 'giam' ? 'giảm dần' : 'tăng dần'}`;
}
const dau = (c: Chieu) => (c === 'giam' ? -1 : 1);

// ===== Kho: tồn từng mặt hàng =====
export const LOC_KHO = [['tat', 'Tất cả'], ['con', 'Còn hàng'], ['sap', 'Sắp hết'], ['het', 'Hết hàng']] as const satisfies LuaChon<string>;
export const SX_KHO = [['ten', 'Tên', 'tang'], ['ton', 'Tồn', 'tang'], ['ban', 'Đã bán', 'giam'], ['gia', 'Giá', 'giam']] as const satisfies TieuChi<string>;
export type LocKho = GiaTri<typeof LOC_KHO>;
export type SxKho = SapXep<TieuChiCua<typeof SX_KHO>>;
export const sapHet = (h: HangKho) => h.ton > 0 && h.ton <= h.TonToiThieu;
const LOC_KHO_FN: Record<LocKho, (h: HangKho) => boolean> = { tat: () => true, con: h => h.ton > 0, sap: sapHet, het: h => h.ton <= 0 };
// So sánh tăng dần (nhỏ trước)
const SX_KHO_FN: Record<SxKho['theo'], (a: HangKho, b: HangKho) => number> = {
  ten: (a, b) => theoChu(a.TenHang, b.TenHang), ton: (a, b) => a.ton - b.ton, ban: (a, b) => a.xuat - b.xuat, gia: (a, b) => a.GiaLe - b.GiaLe,
};
/** Số mặt hàng theo từng bộ lọc (hiện trên nút lọc) */
export const demKho = (ds: HangKho[], loc: LocKho) => ds.filter(LOC_KHO_FN[loc]).length;
/** Tìm (tìm kiếm thông minh: không dấu, viết liền, viết tắt, gõ sai khi không có kết quả) trong tên, mã, model, nhóm; lọc;
 *  sắp xếp (cùng giá trị thì theo tên A → Z) */
export function locKho(ds: HangKho[], q: string, loc: LocKho, sx: SxKho): HangKho[] {
  return timKiem(ds.filter(LOC_KHO_FN[loc]), q, h => `${h.TenHang} ${h.MaHH} ${h.Model} ${h.NhomHang}`)
    .sort((a, b) => dau(sx.chieu) * SX_KHO_FN[sx.theo](a, b) || theoChu(a.TenHang, b.TenHang));
}

// ===== Thẻ kho: các lần nhập / xuất của một mặt hàng =====
export const LOC_PHIEU = [['tat', 'Nhập và xuất'], ['nhap', 'Chỉ nhập'], ['xuat', 'Chỉ xuất']] as const satisfies LuaChon<string>;
export const SX_PHIEU = [['ngay', 'Ngày', 'giam'], ['sl', 'Số lượng', 'giam']] as const satisfies TieuChi<string>;
export type LocPhieu = GiaTri<typeof LOC_PHIEU>;
export type SxPhieu = SapXep<TieuChiCua<typeof SX_PHIEU>>;
/** ds theo thứ tự máy chủ trả về (cũ trước mới sau). Sắp theo số lượng: cùng số lượng thì mới trước. */
export function locTheKho(ds: DongTheKho[], loc: LocPhieu, sx: SxPhieu): DongTheKho[] {
  const moiTruoc = ds.slice().reverse().filter(d => loc === 'tat' || (loc === 'nhap') === (d.Loai === 'Nhập'));
  if (sx.theo === 'sl') return moiTruoc.sort((a, b) => dau(sx.chieu) * (a.SoLuong - b.SoLuong));
  return sx.chieu === 'tang' ? moiTruoc.reverse() : moiTruoc;
}

// ===== Đơn hàng trong hồ sơ khách =====
type DonKhach = { TongCong: number; daThu: number; TrangThai: string };
export const LOC_DON = [['tat', 'Tất cả'], ['no', 'Còn nợ'], ['cho', 'Chưa giao xong']] as const satisfies LuaChon<string>;
export type LocDon = GiaTri<typeof LOC_DON>;
export const conNoDon = (d: DonKhach) => (d.TrangThai === 'Hủy' ? 0 : Math.max(0, d.TongCong - d.daThu));
export function locDon<T extends DonKhach>(ds: T[], loc: LocDon): T[] {
  return ds.filter(d => loc === 'tat' || (loc === 'no' ? conNoDon(d) > 0 : d.TrangThai === 'Chờ giao' || d.TrangThai === 'Giao một phần'));
}

// ===== Điện thoại đăng nhập =====
export const LOC_MAY = [['tat', 'Tất cả'], ['tb', 'Bật thông báo'], ['khongTb', 'Tắt thông báo']] as const satisfies LuaChon<string>;
export const SX_MAY = [['dung', 'Lần dùng', 'giam'], ['tk', 'Tài khoản', 'tang']] as const satisfies TieuChi<string>;
export type LocMay = GiaTri<typeof LOC_MAY>;
export type SxMay = SapXep<TieuChiCua<typeof SX_MAY>>;
/** Theo tài khoản: cùng tài khoản thì máy dùng gần nhất trước */
export function locMay(ds: ThietBi[], loc: LocMay, sx: SxMay): ThietBi[] {
  const gan = (a: ThietBi, b: ThietBi) => String(b.LanCuoi).localeCompare(String(a.LanCuoi));
  return ds.filter(t => loc === 'tat' || (loc === 'tb') === t.thongBao)
    .sort(sx.theo === 'tk' ? (a, b) => dau(sx.chieu) * theoChu(a.TenDangNhap, b.TenDangNhap) || gan(a, b) : (a, b) => -dau(sx.chieu) * gan(a, b));
}

// ===== Lọc, sắp xếp ở máy chủ (dsKhachMay, dsHopDongMay nhận { loc, sx, chieu }) =====
export const LOC_KHACH = [['tat', 'Tất cả'], ['no', 'Còn nợ'], ['mua', 'Đã mua'], ['chua', 'Chưa mua']] as const satisfies LuaChon<string>;
export const SX_KHACH = [['gan', 'Lần mua', 'giam'], ['ten', 'Tên', 'tang'], ['no', 'Nợ', 'giam'], ['moi', 'Ngày thêm', 'giam']] as const satisfies TieuChi<string>;
export type LocKhach = GiaTri<typeof LOC_KHACH>;
export type SxKhach = SapXep<TieuChiCua<typeof SX_KHACH>>;
export const LOC_HD = [['tat', 'Tất cả'], ['hieuLuc', 'Đang hiệu lực'], ['sap', 'Sắp hết hạn'], ['het', 'Đã hết hạn'], ['nhap', 'Soạn thảo'], ['coFile', 'Có file PDF']] as const satisfies LuaChon<string>;
export const SX_HD = [['ngay', 'Ngày', 'giam'], ['giaTri', 'Giá trị', 'giam'], ['hetHan', 'Hết hạn', 'tang']] as const satisfies TieuChi<string>;
export type LocHD = GiaTri<typeof LOC_HD>;
export type SxHD = SapXep<TieuChiCua<typeof SX_HD>>;

/** Nhãn của giá trị đang chọn (vd. để viết "Không có khách nào còn nợ") */
export function nhanCua<T extends string>(ds: LuaChon<T>, v: T): string {
  return (ds.find(x => x[0] === v) ?? ds[0])[1];
}
