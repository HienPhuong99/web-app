// Dùng chung cho các màn hình bảo hành – sửa chữa
import type { PhieuSua } from './api';
import { ngay } from './dinhDang';
import { mau } from '../ui/theme';

export const MAU_SUA: Record<string, string> = { 'Đã nhận': mau.xam, 'Đang sửa': mau.brand, 'Chờ linh kiện': mau.vang, 'Đã sửa xong': mau.xanh, 'Không sửa được': mau.do, 'Đã trả khách': mau.chuNhat };

/** "Quá hẹn 2 ngày" / "Hẹn trả hôm nay" / "Hẹn 12/10" */
export const moTaHen = (p: Pick<PhieuSua, 'NgayHen' | 'conNgay'>) =>
  p.conNgay === null || !p.NgayHen ? '' : p.conNgay < 0 ? `Quá hẹn ${-p.conNgay} ngày` : p.conNgay === 0 ? 'Hẹn trả hôm nay' : 'Hẹn ' + ngay(p.NgayHen).slice(0, 5);

/** Số phiếu có dấu "/" (001-2026/PN): đổi thành "~" khi đưa vào đường dẫn, đổi lại khi đọc */
export const maDuongDan = (so: string) => so.replace(/\//g, '~');
export const tuDuongDan = (s: string) => s.replace(/~/g, '/');
