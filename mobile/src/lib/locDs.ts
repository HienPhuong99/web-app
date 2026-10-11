// Lọc và sắp xếp các danh sách trên điện thoại: kho, thẻ kho (nhập – xuất), đơn của khách, điện thoại đăng nhập; và các lựa chọn gửi lên máy chủ
// cho danh sách khách, hợp đồng. Thuần TypeScript (không dùng React Native) để test được bằng node --test.
import type { DongTheKho, HangKho, ThietBi } from './api.ts';
import { boDau } from './lienHe.ts';

/** Danh sách lựa chọn [giá trị, nhãn]; cái đầu là mặc định */
export type LuaChon<T extends string> = readonly (readonly [T, string])[];
type GiaTri<L> = L extends LuaChon<infer T> ? T : never;

const theoChu = (a: string, b: string) => a.localeCompare(b, 'vi');

// ===== Kho: tồn từng mặt hàng =====
export const LOC_KHO = [['tat', 'Tất cả'], ['con', 'Còn hàng'], ['sap', 'Sắp hết'], ['het', 'Hết hàng']] as const satisfies LuaChon<string>;
export const SX_KHO = [['ten', 'Tên A → Z'], ['tonIt', 'Tồn ít nhất'], ['tonNhieu', 'Tồn nhiều nhất'], ['banChay', 'Bán chạy'], ['giaCao', 'Giá cao'], ['giaThap', 'Giá thấp']] as const satisfies LuaChon<string>;
export type LocKho = GiaTri<typeof LOC_KHO>;
export type SxKho = GiaTri<typeof SX_KHO>;
export const sapHet = (h: HangKho) => h.ton > 0 && h.ton <= h.TonToiThieu;
const LOC_KHO_FN: Record<LocKho, (h: HangKho) => boolean> = { tat: () => true, con: h => h.ton > 0, sap: sapHet, het: h => h.ton <= 0 };
const SX_KHO_FN: Record<SxKho, (a: HangKho, b: HangKho) => number> = {
  ten: (a, b) => theoChu(a.TenHang, b.TenHang), tonIt: (a, b) => a.ton - b.ton, tonNhieu: (a, b) => b.ton - a.ton,
  banChay: (a, b) => b.xuat - a.xuat, giaCao: (a, b) => b.GiaLe - a.GiaLe, giaThap: (a, b) => a.GiaLe - b.GiaLe,
};
/** Số mặt hàng theo từng bộ lọc (hiện trên nút lọc) */
export const demKho = (ds: HangKho[], loc: LocKho) => ds.filter(LOC_KHO_FN[loc]).length;
/** Tìm (không cần dấu, mọi từ đều phải có) trong tên, mã, model, nhóm; lọc; sắp xếp (cùng giá trị thì theo tên) */
export function locKho(ds: HangKho[], q: string, loc: LocKho, sx: SxKho): HangKho[] {
  const w = boDau(q).split(/\s+/).filter(Boolean);
  return ds.filter(h => LOC_KHO_FN[loc](h) && w.every(x => boDau(`${h.TenHang} ${h.MaHH} ${h.Model} ${h.NhomHang}`).includes(x)))
    .sort((a, b) => SX_KHO_FN[sx](a, b) || theoChu(a.TenHang, b.TenHang));
}

// ===== Thẻ kho: các lần nhập / xuất của một mặt hàng =====
export const LOC_PHIEU = [['tat', 'Nhập và xuất'], ['nhap', 'Chỉ nhập'], ['xuat', 'Chỉ xuất']] as const satisfies LuaChon<string>;
export const SX_PHIEU = [['moi', 'Mới nhất'], ['cu', 'Cũ nhất'], ['slNhieu', 'Số lượng nhiều → ít'], ['slIt', 'Số lượng ít → nhiều']] as const satisfies LuaChon<string>;
export type LocPhieu = GiaTri<typeof LOC_PHIEU>;
export type SxPhieu = GiaTri<typeof SX_PHIEU>;
/** ds theo thứ tự máy chủ trả về (cũ trước mới sau). Sắp theo số lượng: cùng số lượng thì mới trước. */
export function locTheKho(ds: DongTheKho[], loc: LocPhieu, sx: SxPhieu): DongTheKho[] {
  const moiTruoc = ds.slice().reverse().filter(d => loc === 'tat' || (loc === 'nhap') === (d.Loai === 'Nhập'));
  if (sx === 'cu') return moiTruoc.reverse();
  if (sx === 'slNhieu') return moiTruoc.sort((a, b) => b.SoLuong - a.SoLuong);
  if (sx === 'slIt') return moiTruoc.sort((a, b) => a.SoLuong - b.SoLuong);
  return moiTruoc;
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
export const SX_MAY = [['gan', 'Dùng gần nhất'], ['lau', 'Lâu không dùng'], ['tk', 'Theo tài khoản']] as const satisfies LuaChon<string>;
export type LocMay = GiaTri<typeof LOC_MAY>;
export type SxMay = GiaTri<typeof SX_MAY>;
export function locMay(ds: ThietBi[], loc: LocMay, sx: SxMay): ThietBi[] {
  const gan = (a: ThietBi, b: ThietBi) => String(b.LanCuoi).localeCompare(String(a.LanCuoi));
  return ds.filter(t => loc === 'tat' || (loc === 'tb') === t.thongBao)
    .sort(sx === 'lau' ? (a, b) => gan(b, a) : sx === 'tk' ? (a, b) => theoChu(a.TenDangNhap, b.TenDangNhap) || gan(a, b) : gan);
}

// ===== Lọc, sắp xếp ở máy chủ (dsKhachMay, dsHopDongMay nhận { loc, sx }) =====
export const LOC_KHACH = [['tat', 'Tất cả'], ['no', 'Còn nợ'], ['mua', 'Đã mua'], ['chua', 'Chưa mua']] as const satisfies LuaChon<string>;
export const SX_KHACH = [['gan', 'Mua gần đây'], ['ten', 'Tên A → Z'], ['no', 'Nợ nhiều nhất'], ['moi', 'Mới thêm']] as const satisfies LuaChon<string>;
export type LocKhach = GiaTri<typeof LOC_KHACH>;
export type SxKhach = GiaTri<typeof SX_KHACH>;
export const LOC_HD = [['tat', 'Tất cả'], ['hieuLuc', 'Đang hiệu lực'], ['sap', 'Sắp hết hạn'], ['het', 'Đã hết hạn'], ['nhap', 'Soạn thảo'], ['coFile', 'Có file PDF']] as const satisfies LuaChon<string>;
export const SX_HD = [['moi', 'Mới nhất'], ['cu', 'Cũ nhất'], ['giaTri', 'Giá trị cao'], ['hetHan', 'Hết hạn sớm']] as const satisfies LuaChon<string>;
export type LocHD = GiaTri<typeof LOC_HD>;
export type SxHD = GiaTri<typeof SX_HD>;

/** Nhãn của giá trị đang chọn (vd. để viết "Không có khách nào còn nợ") */
export function nhanCua<T extends string>(ds: LuaChon<T>, v: T): string {
  return (ds.find(x => x[0] === v) ?? ds[0])[1];
}
