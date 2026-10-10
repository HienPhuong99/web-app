// Gọi API của Apps Script (apps-script/Api.gs → doPost). Thuần TypeScript, chỉ dùng fetch, để test được bằng node --test.
// Gửi Content-Type text/plain: Apps Script đọc nội dung thô, và trình duyệt không phải hỏi trước (CORS preflight) khi chạy bản web.

/** Máy chủ báo mã máy hết hiệu lực (đăng xuất, khóa tài khoản, đổi mật khẩu…): app phải đăng nhập lại */
export class LoiPhien extends Error {
  constructor() { super('Phiên đăng nhập đã hết. Vui lòng đăng nhập lại.'); this.name = 'LoiPhien'; }
}

export type YeuCau = { fn: string; args?: unknown[]; may?: string | null };

export async function goiApi<T = unknown>(url: string, yc: YeuCau, choToiDa = 30000): Promise<T> {
  if (!/^https?:\/\/\S+$/.test(url)) throw new Error('Địa chỉ máy chủ không hợp lệ.');
  const ctrl = new AbortController(), hen = setTimeout(() => ctrl.abort(), choToiDa);
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ fn: yc.fn, args: yc.args ?? [], may: yc.may ?? undefined }), signal: ctrl.signal,
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
  hopDong: { SoHD: string; TenDN: string; NgayHetHan: string; het: boolean; n: number; bao: number; quyetDinh: number; tuGiaHan: boolean }[];
  dot: { SoHD: string; TenDN: string; Nhan: string; NgayDen: string; SoTien: number; quaHan: boolean; n: number }[];
  donTre: { SoDH: string; TenKH: string; NgayGiao: string; TongCong: number }[];
  hang: { MaHH: string; TenHang: string; ton: number; toiThieu: number }[];
  soMuc: number; no: { soKhach: number; tong: number; top: { MaKH: string; TenKH: string; SDT: string; tien: number }[] };
};
