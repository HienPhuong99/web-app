// Gọi API của Apps Script (apps-script/Api.gs → doPost). Thuần TypeScript, chỉ dùng fetch, để test được bằng node --test.
// Gửi Content-Type text/plain: Apps Script đọc nội dung thô, và trình duyệt không phải hỏi trước (CORS preflight) khi chạy bản web.

/** Máy chủ báo mã máy hết hiệu lực (đăng xuất, khóa tài khoản, đổi mật khẩu…): app phải đăng nhập lại */
export class LoiPhien extends Error {
  constructor() { super('Phiên đăng nhập đã hết. Vui lòng đăng nhập lại.'); this.name = 'LoiPhien'; }
}

/** moi = true: máy chủ bỏ qua kết quả đã ghi nhớ, lấy số mới nhất (kéo xuống để làm mới) */
/** maGhi: mã lần gửi của lệnh ghi; gửi lại cùng mã (sau khi mạng lỗi) thì máy chủ trả kết quả lần trước, không ghi thêm */
export type YeuCau = { fn: string; args?: unknown[]; may?: string | null; moi?: boolean; maGhi?: string };

export async function goiApi<T = unknown>(url: string, yc: YeuCau, choToiDa = 30000): Promise<T> {
  if (!/^https?:\/\/\S+$/.test(url)) throw new Error('Địa chỉ máy chủ không hợp lệ.');
  const ctrl = new AbortController(), hen = setTimeout(() => ctrl.abort(), choToiDa);
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ fn: yc.fn, args: yc.args ?? [], may: yc.may ?? undefined, moi: yc.moi || undefined, maGhi: yc.maGhi || undefined }), signal: ctrl.signal,
    });
  } catch {
    throw new Error(ctrl.signal.aborted ? 'Máy chủ phản hồi quá lâu. Thử lại sau.' : 'Không kết nối được máy chủ. Kiểm tra mạng.');
  } finally { clearTimeout(hen); }
  if (!res.ok) throw new Error(`Máy chủ báo lỗi (HTTP ${res.status}).`);
  const text = await res.text();
  let j: { ok?: boolean; result?: T; error?: string };
  try { j = JSON.parse(text); } catch {
    // Thường gặp: link web app chưa để "Bất kỳ ai" truy cập nên Google trả trang đăng nhập (HTML)
    throw new Error('Máy chủ trả dữ liệu không đọc được. Kiểm tra địa chỉ máy chủ và quyền truy cập của web app.');
  }
  if (!j || typeof j !== 'object' || typeof j.ok !== 'boolean') throw new Error('Máy chủ trả dữ liệu không đúng dạng.');
  if (!j.ok) {
    if (j.error === 'HET_PHIEN') throw new LoiPhien();
    throw new Error(j.error || 'Có lỗi xảy ra.');
  }
  return j.result as T;
}

// ===== Kiểu dữ liệu trả về (khớp Api.gs) =====
export type NguoiDung = { u: string; ten: string; vaiTro: 'admin' | 'nhanvien' | string };
export type DangNhapKQ = { may: string; user: NguoiDung & { shop: string }; cuaHang: { ten: string; moTa: string } };

export type MayBaoHanh = {
  SoPK: string; Ngay: string; SoDH: string; MaKH: string; TenKH: string; SDT: string; MaHH: string; TenHang: string; Model: string;
  DVT: string; SoLuong: number; IMEI: string; HetHan: string; IMEIKhop: string; ConHan: boolean | null; ConNgay: number | null;
};
export type TraBaoHanhKQ = { q: string; tong: number; ds: MayBaoHanh[] };

export type TongQuan = {
  user: NguoiDung; cuaHang: { ten: string; moTa: string }; homNay: string;
  ban: { don: number; tien: number }; thu: number; homQua: { don: number; tien: number }; ban7: { ngay: string; tien: number }[];
  hopDong: { SoHD: string; MaKH: string; TenDN: string; NgayHetHan: string; het: boolean; n: number; bao: number; quyetDinh: number; tuGiaHan: boolean }[];
  dot: { SoHD: string; MaKH: string; TenDN: string; Nhan: string; NgayDen: string; SoTien: number; quaHan: boolean; n: number }[];
  donTre: { SoDH: string; MaKH: string; TenKH: string; NgayGiao: string; TongCong: number }[];
  hang: { MaHH: string; TenHang: string; ton: number; toiThieu: number }[];
  soMuc: number; no: { soKhach: number; tong: number; top: { MaKH: string; TenKH: string; SDT: string; tien: number }[] };
  /** lãi gộp hôm nay (doanh thu chưa VAT − giá vốn); null khi không phải quản trị, không có ở máy chủ bản cũ */
  lai?: LaiGop | null;
  /** máy sửa đến / quá hẹn trả hoặc đã xong chờ khách lấy (máy chủ bản cũ không có) */
  /** máy còn 0–15 ngày bảo hành: mời khách quay lại */
  sapHetBH?: { MaKH: string; TenKH: string; SDT: string; TenHang: string; IMEI: string; HetHan: string; n: number }[];
  suaChua?: { SoPN: string; MaKH: string; TenKH: string; SDT: string; TenMay: string; TrangThai: string; NgayHen: string; n: number | null }[];
};
/** Phiếu nhận bảo hành – sửa chữa (DichVu.gs) */
export type PhieuSua = {
  SoPN: string; NgayNhan: string; Loai: 'Bảo hành' | 'Sửa chữa' | string; MaKH: string; TenKH: string; SDT: string; TenMay: string; IMEI: string;
  TinhTrang: string; PhuKien: string; MatKhauMay: string; NgayHen: string; TrangThai: string; ChiPhi: number; KetQua: string; NgayTra: string; SoDH: string;
  Anh: string[]; conNgay: number | null; NguoiTao: string;
};
export const TT_SUA = ['Đã nhận', 'Đang sửa', 'Chờ linh kiện', 'Đã sửa xong', 'Không sửa được', 'Đã trả khách'] as const;
export type LaiGop = { doanhThu: number; giaVon: number; lai: number };

/** soQuyMay(ngày): tồn quỹ cuối ngày (tiền mặt / ngân hàng), thu – chi trong ngày và từng phiếu */
export type SoQuy = {
  ngay: string; homNay: string; truoc: string; sau: string; batDau: string;
  ton: { tienMat: number; nganHang: number }; trongNgay: { thu: number; chi: number };
  ds: { loai: 'thu' | 'chi'; so: string; noiDung: string; SoTien: number; HinhThuc: string; MaKH: string; luc: string }[];
  loaiChi: string[]; hinhThuc: string[];
};
export type PhieuChi = { SoPC: string; Ngay: string; Loai: string; DoiTac: string; SoTien: number; HinhThuc: string; GhiChu: string };

/** chiTietTongQuan('ngay', ngày): đơn hàng và phiếu thu của một ngày; truoc / sau để lật ngày (sau rỗng khi là hôm nay) */
export type ChiTietNgay = {
  ngay: string; homNay: string; truoc: string; sau: string;
  don: { SoDH: string; MaKH: string; TenKH: string; TongCong: number; daThu: number; TrangThai: string; gio: string }[];
  thu: { SoPT: string; MaKH: string; TenKH: string; SoDH: string; SoTien: number; HinhThuc: string; GhiChu: string }[];
  tong: { don: number; tien: number; thu: number; huy: number };
};
/** chiTietTongQuan('no'): mọi khách còn nợ, nhiều nhất trước */
export type KhachNo = { tong: number; ds: { MaKH: string; TenKH: string; SDT: string; tien: number }[] };

export type CauHinh = { hinhThuc: string[]; vat: number; quanTri: boolean; qr: { bin: string; nganHang: string; soTK: string; chuTK: string } | null };

export type HangKho = { MaHH: string; TenHang: string; Model: string; NhomHang: string; DVT: string; GiaLe: number; GiaSi: number; TonToiThieu: number; nhap: number; xuat: number; ton: number };
export type DongTheKho = { SoPK: string; Ngay: string; Loai: 'Nhập' | 'Xuất' | string; SoDH: string; DoiTac: string; GhiChu: string; SoLuong: number; IMEI: string };
export type MaKho = { ma: string; trangThai: 'trongKho' | 'daBan' | 'chuaCo'; MaHH?: string; TenHang?: string; DVT?: string; GiaLe?: number; SoPK?: string; Ngay?: string; SoDH?: string; DoiTac?: string };

export type KhachTom = { MaKH: string; TenKH: string; SDT: string; DiaChi: string; no: number; muaCuoi: string };
export type DsKhach = { tong: number; ds: KhachTom[] };
export type HoSoKhach = {
  kh: { MaKH: string; TenKH: string; SDT: string; DiaChi: string; Email: string; NguoiLienHe: string; GhiChu: string };
  mua: number; da: number; no: number;
  don: { SoDH: string; Ngay: string; TongCong: number; TrangThai: string; daThu: number }[];
  thu: { SoPT: string; Ngay: string; SoTien: number; HinhThuc: string; SoDH: string }[];
  may: MayBaoHanh[]; hopDong: { SoHD: string; Ngay: string; LoaiHD: string; TongCong: number; NgayHetHan: string; TrangThai: string; coFile: boolean }[];
};

export type BanNhanhKQ = {
  SoDH: string; SoPK: string; SoPT: string; TongCong: number; daThu: number; MaKH: string; TenKH: string; loiThu: string;
  lines: { TenHang: string; SoLuong: number; IMEI: string; HetHan: string }[];
  /** máy cũ thu về trừ vào đơn (daThu đã gồm giá các máy này) */
  thuCu?: { MaHH: string; TenHang: string; IMEI: string; GiaThu: number; SoPK: string; SoPT: string }[];
};
export type PhieuThu = { SoPT: string; Ngay: string; MaKH: string; TenKH: string; SoDH: string; SoTien: number; HinhThuc: string };

export type HopDongTom = { SoHD: string; Ngay: string; LoaiHD: string; TenDN: string; MaKH: string; SDT: string; TongCong: number; NgayHetHan: string; TrangThai: string; coFile: boolean; fileCu: boolean };
export type ThietBi = { MaMay: string; TenDangNhap: string; TenMay: string; NgayTao: string; LanCuoi: string; thongBao: boolean; mayNay: boolean };
