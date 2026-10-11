// Sửa số đã nhớ ngay sau khi máy chủ báo ghi xong (bán nhanh, thu tiền): Tổng quan, kho, công nợ, hồ sơ khách hiện đúng tức thì,
// không phải chờ tải lại. Cùng cách tính với máy chủ (EmailSang.gs tongHopSang_, Api.gs); lần tải sau vẫn lấy số của máy chủ làm chuẩn.
// Thuần TypeScript, test bằng node --test.
import type { BanNhanhKQ, DsKhach, HangKho, HoSoKhach, KhachNo, PhieuThu, TongQuan } from './api';

type No = TongQuan['no'];

/** Công nợ trên Tổng quan khi nợ của một khách đổi them (âm = trả bớt). top giữ 5 khách nợ nhiều nhất. */
function doiNo(no: No, maKH: string, tenKH: string, them: number): No {
  if (!them) return no;
  const cu = no.top.find(x => x.MaKH === maKH);
  let soKhach = no.soKhach;
  if (cu && cu.tien + them <= 0) soKhach--; // trả hết
  // Khách chưa có trong top mà top chưa đủ 5: chắc chắn trước đó không nợ. Top đủ 5 thì chưa biết, để lần tải sau sửa.
  if (!cu && them > 0 && no.top.length < 5) soKhach++;
  const top = (cu ? no.top.map(x => (x.MaKH === maKH ? { ...x, tien: x.tien + them } : x)) : them > 0 ? [...no.top, { MaKH: maKH, TenKH: tenKH, SDT: '', tien: them }] : no.top)
    .filter(x => x.tien > 0).sort((a, b) => b.tien - a.tien).slice(0, 5);
  return { soKhach: Math.max(soKhach, top.length), tong: Math.max(0, no.tong + them), top };
}

export function tongQuanSauBan(tq: TongQuan, kq: BanNhanhKQ): TongQuan {
  return {
    ...tq,
    ban: { don: tq.ban.don + 1, tien: tq.ban.tien + kq.TongCong },
    thu: tq.thu + kq.daThu,
    ban7: tq.ban7.map(x => (x.ngay === tq.homNay ? { ...x, tien: x.tien + kq.TongCong } : x)),
    no: doiNo(tq.no, kq.MaKH, kq.TenKH, kq.TongCong - kq.daThu),
  };
}

/** Bán xong: tồn kho giảm theo các dòng đã bán (dòng không có mã hàng là dịch vụ, không trừ kho) */
export function khoSauBan(hang: HangKho[], lines: { MaHH?: string; SoLuong: number }[]): HangKho[] {
  const ban: Record<string, number> = {};
  lines.forEach(l => { if (l.MaHH) ban[l.MaHH] = (ban[l.MaHH] ?? 0) + l.SoLuong; });
  return hang.map(h => (ban[h.MaHH] ? { ...h, xuat: h.xuat + ban[h.MaHH], ton: h.ton - ban[h.MaHH] } : h));
}

export function hoSoSauBan(hs: HoSoKhach, kq: BanNhanhKQ, homNay: string): HoSoKhach {
  if (hs.kh.MaKH !== kq.MaKH) return hs;
  return {
    ...hs, mua: hs.mua + kq.TongCong, da: hs.da + kq.daThu, no: hs.no + kq.TongCong - kq.daThu,
    don: [{ SoDH: kq.SoDH, Ngay: homNay, TongCong: kq.TongCong, TrangThai: 'Đã giao', daThu: kq.daThu }, ...hs.don.filter(d => d.SoDH !== kq.SoDH)],
  };
}

export function tongQuanSauThu(tq: TongQuan, pt: PhieuThu): TongQuan {
  return { ...tq, thu: tq.thu + (String(pt.Ngay).slice(0, 10) === tq.homNay ? pt.SoTien : 0), no: doiNo(tq.no, pt.MaKH, pt.TenKH, -pt.SoTien) };
}

export function hoSoSauThu(hs: HoSoKhach, pt: PhieuThu): HoSoKhach {
  if (hs.kh.MaKH !== pt.MaKH || hs.thu.some(p => p.SoPT === pt.SoPT)) return hs;
  return {
    ...hs, da: hs.da + pt.SoTien, no: hs.no - pt.SoTien,
    thu: [{ SoPT: pt.SoPT, Ngay: pt.Ngay, SoTien: pt.SoTien, HinhThuc: pt.HinhThuc, SoDH: pt.SoDH }, ...hs.thu],
    don: hs.don.map(d => (pt.SoDH && d.SoDH === pt.SoDH ? { ...d, daThu: d.daThu + pt.SoTien } : d)),
  };
}

/** Danh sách khách (mọi bộ lọc): đổi số nợ của một khách */
export function dsKhachDoiNo(ds: DsKhach, maKH: string, them: number): DsKhach {
  return ds.ds.some(k => k.MaKH === maKH) ? { ...ds, ds: ds.ds.map(k => (k.MaKH === maKH ? { ...k, no: k.no + them } : k)) } : ds;
}

/** Danh sách khách còn nợ (Tổng quan → Khách còn nợ): trả hết thì bỏ khỏi danh sách */
export function khachNoSauThu(kn: KhachNo, pt: PhieuThu): KhachNo {
  if (!kn.ds.some(k => k.MaKH === pt.MaKH)) return kn;
  return { tong: Math.max(0, kn.tong - pt.SoTien), ds: kn.ds.map(k => (k.MaKH === pt.MaKH ? { ...k, tien: k.tien - pt.SoTien } : k)).filter(k => k.tien > 0).sort((a, b) => b.tien - a.tien) };
}
