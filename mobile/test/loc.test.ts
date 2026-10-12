// Lọc, sắp xếp danh sách trên điện thoại: node --test test/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { DongTheKho, HangKho, ThietBi } from '../src/lib/api.ts';
import { LOC_KHO, SX_KHO, LOC_PHIEU, SX_PHIEU, SX_KHACH, SX_HD, LOC_HD, demKho, locKho, locTheKho, locDon, conNoDon, locMay, nhanCua, sxMacDinh, bamSapXep, moTaSx, type Chieu } from '../src/lib/locDs.ts';

// Viết gọn cách sắp xếp: giam('ton') = theo tồn, lớn trước
const giam = <T extends string>(theo: T) => ({ theo, chieu: 'giam' as Chieu }), tang = <T extends string>(theo: T) => ({ theo, chieu: 'tang' as Chieu });

const h = (MaHH: string, TenHang: string, ton: number, o: Partial<HangKho> = {}): HangKho =>
  ({ MaHH, TenHang, Model: '', NhomHang: '', DVT: 'Máy', GiaLe: 0, GiaSi: 0, TonToiThieu: 0, nhap: ton, xuat: 0, ton, ...o });
const KHO = [
  h('HH1', 'iPhone 16 Pro Max', 5, { GiaLe: 28990000, xuat: 7, TonToiThieu: 2, NhomHang: 'iPhone' }),
  h('HH2', 'Ốp lưng MagSafe', 2, { GiaLe: 250000, xuat: 30, TonToiThieu: 15 }),
  h('HH3', 'AirPods Pro 2', 0, { GiaLe: 5990000, xuat: 4 }),
  h('HH4', 'Cáp USB-C', -1, { GiaLe: 150000, xuat: 31 }),
  h('HH5', 'iPhone 15', 9, { GiaLe: 16490000, xuat: 2, NhomHang: 'iPhone' }),
];
const ma = (ds: { MaHH: string }[]) => ds.map(x => x.MaHH);

test('kho: lọc còn / sắp hết / hết hàng, đếm trên nút', () => {
  assert.deepEqual(ma(locKho(KHO, '', 'con', tang('ten'))), ['HH5', 'HH1', 'HH2']);
  assert.deepEqual(ma(locKho(KHO, '', 'sap', tang('ten'))), ['HH2']);
  assert.deepEqual(ma(locKho(KHO, '', 'het', tang('ten'))), ['HH3', 'HH4']); // tồn âm cũng là hết
  assert.deepEqual(LOC_KHO.map(([k]) => demKho(KHO, k)), [5, 3, 1, 2]);
});

test('kho: sắp xếp hai chiều, tìm không dấu', () => {
  assert.deepEqual(ma(locKho(KHO, '', 'tat', tang('ten'))), ['HH3', 'HH4', 'HH5', 'HH1', 'HH2']); // A → Z tiếng Việt: Ốp sau i
  assert.deepEqual(ma(locKho(KHO, '', 'tat', giam('ten'))), ['HH2', 'HH1', 'HH5', 'HH4', 'HH3']);
  assert.deepEqual(ma(locKho(KHO, '', 'tat', tang('ton'))), ['HH4', 'HH3', 'HH2', 'HH1', 'HH5']);
  assert.deepEqual(ma(locKho(KHO, '', 'tat', giam('ton'))), ['HH5', 'HH1', 'HH2', 'HH3', 'HH4']);
  assert.deepEqual(ma(locKho(KHO, '', 'tat', giam('ban'))), ['HH4', 'HH2', 'HH1', 'HH3', 'HH5']);
  assert.deepEqual(ma(locKho(KHO, '', 'tat', giam('gia'))), ['HH1', 'HH5', 'HH3', 'HH2', 'HH4']);
  assert.deepEqual(ma(locKho(KHO, '', 'tat', tang('gia'))), ['HH4', 'HH2', 'HH3', 'HH5', 'HH1']);
  assert.deepEqual(ma(locKho(KHO, 'op lung', 'tat', tang('ten'))), ['HH2']);
  assert.deepEqual(ma(locKho(KHO, 'IPHONE', 'con', tang('gia'))), ['HH5', 'HH1']);
  assert.deepEqual(SX_KHO.map(x => x[1]), ['Tên', 'Tồn', 'Đã bán', 'Giá']);
  // cùng tồn / cùng giá: theo tên A → Z dù đảo chiều
  const bang = [h('B', 'Sạc 20W', 3, { GiaLe: 490000 }), h('A', 'Cáp USB-C', 3, { GiaLe: 490000 }), h('C', 'Ốp lưng', 3, { GiaLe: 490000 })];
  assert.deepEqual([tang('ton'), giam('ton'), giam('gia'), tang('ban')].map(sx => ma(locKho(bang, '', 'tat', sx as never)).join('')), ['ACB', 'ACB', 'ACB', 'ACB']); // Cáp, Ốp, Sạc (Ô đứng trước S)
  assert.equal(KHO[0].MaHH, 'HH1'); // không đổi mảng gốc
});

test('bấm tiêu chí: chọn với chiều mặc định, bấm lại thì đảo chiều', () => {
  const md = sxMacDinh(SX_KHO);
  assert.deepEqual(md, tang('ten'));
  assert.deepEqual(bamSapXep(SX_KHO, md, 'gia'), giam('gia')); // giá: mặc định cao trước
  assert.deepEqual(bamSapXep(SX_KHO, md, 'ton'), tang('ton')); // tồn: mặc định ít trước
  assert.deepEqual(bamSapXep(SX_KHO, giam('gia'), 'gia'), tang('gia'));
  assert.deepEqual(bamSapXep(SX_KHO, tang('gia'), 'gia'), giam('gia'));
  assert.deepEqual(bamSapXep(SX_KHO, tang('gia'), 'ten'), tang('ten')); // đổi tiêu chí: về chiều mặc định của nó
  assert.equal(moTaSx(SX_PHIEU, giam('sl')), 'theo số lượng, giảm dần');
  assert.equal(moTaSx(SX_HD, tang('hetHan')), 'theo hết hạn, tăng dần');
  assert.deepEqual([SX_KHACH, SX_HD].map(ds => ds.map(x => x[0])), [['gan', 'ten', 'no', 'moi'], ['ngay', 'giaTri', 'hetHan']]); // máy chủ nhận đúng các giá trị này
});

const d = (SoPK: string, Loai: string, SoLuong: number, Ngay: string): DongTheKho => ({ SoPK, Ngay, Loai, SoDH: '', DoiTac: '', GhiChu: '', SoLuong, IMEI: '' });
// thứ tự máy chủ trả về: cũ trước
const THE = [d('NK1', 'Nhập', 10, '2026-01-01'), d('XK1', 'Xuất', 2, '2026-02-01'), d('XK2', 'Xuất', 5, '2026-03-01'), d('NK2', 'Nhập', 5, '2026-04-01'), d('XK3', 'Xuất', 1, '2026-05-01')];
const so = (ds: DongTheKho[]) => ds.map(x => x.SoPK);

test('thẻ kho: chỉ nhập, chỉ xuất, ngày và số lượng hai chiều', () => {
  assert.deepEqual(so(locTheKho(THE, 'tat', giam('ngay'))), ['XK3', 'NK2', 'XK2', 'XK1', 'NK1']);
  assert.deepEqual(so(locTheKho(THE, 'tat', tang('ngay'))), ['NK1', 'XK1', 'XK2', 'NK2', 'XK3']);
  assert.deepEqual(so(locTheKho(THE, 'nhap', giam('ngay'))), ['NK2', 'NK1']);
  assert.deepEqual(so(locTheKho(THE, 'xuat', tang('ngay'))), ['XK1', 'XK2', 'XK3']);
  assert.deepEqual(so(locTheKho(THE, 'tat', giam('sl'))), ['NK1', 'NK2', 'XK2', 'XK1', 'XK3']); // cùng 5: phiếu mới trước
  assert.deepEqual(so(locTheKho(THE, 'tat', tang('sl'))), ['XK3', 'XK1', 'NK2', 'XK2', 'NK1']); // đảo chiều: cùng 5 vẫn mới trước
  assert.deepEqual(so(locTheKho(THE, 'xuat', tang('sl'))), ['XK3', 'XK1', 'XK2']);
  assert.deepEqual(so(THE), ['NK1', 'XK1', 'XK2', 'NK2', 'XK3']);
  assert.deepEqual([LOC_PHIEU.map(x => x[1]), SX_PHIEU.map(x => x[1])], [['Nhập và xuất', 'Chỉ nhập', 'Chỉ xuất'], ['Ngày', 'Số lượng']]);
  assert.deepEqual(sxMacDinh(SX_PHIEU), giam('ngay'));
});

test('đơn của khách: còn nợ, chưa giao xong', () => {
  const don = [
    { SoDH: '1', TongCong: 100, daThu: 100, TrangThai: 'Đã giao' }, { SoDH: '2', TongCong: 100, daThu: 30, TrangThai: 'Chờ giao' },
    { SoDH: '3', TongCong: 100, daThu: 0, TrangThai: 'Hủy' }, { SoDH: '4', TongCong: 50, daThu: 50, TrangThai: 'Giao một phần' },
  ];
  assert.deepEqual(locDon(don, 'no').map(x => x.SoDH), ['2']);
  assert.deepEqual(locDon(don, 'cho').map(x => x.SoDH), ['2', '4']);
  assert.equal(locDon(don, 'tat').length, 4);
  assert.deepEqual(don.map(conNoDon), [0, 70, 0, 0]);
});

test('điện thoại đăng nhập: lọc thông báo, sắp xếp', () => {
  const t = (MaMay: string, TenDangNhap: string, LanCuoi: string, thongBao: boolean): ThietBi => ({ MaMay, TenDangNhap, TenMay: MaMay, NgayTao: '', LanCuoi, thongBao, mayNay: false });
  const ds = [t('a', 'lan', '2026-01-02 08:00', true), t('b', 'admin', '2026-03-01 09:00', false), t('c', 'lan', '2026-02-01 10:00', false)];
  assert.deepEqual(locMay(ds, 'tat', giam('dung')).map(x => x.MaMay), ['b', 'c', 'a']);
  assert.deepEqual(locMay(ds, 'tat', tang('dung')).map(x => x.MaMay), ['a', 'c', 'b']);
  assert.deepEqual(locMay(ds, 'tat', tang('tk')).map(x => x.MaMay), ['b', 'c', 'a']);
  assert.deepEqual(locMay(ds, 'tat', giam('tk')).map(x => x.MaMay), ['c', 'a', 'b']); // cùng tài khoản: vẫn máy dùng gần nhất trước
  assert.deepEqual([locMay(ds, 'tb', giam('dung')).map(x => x.MaMay), locMay(ds, 'khongTb', giam('dung')).map(x => x.MaMay)], [['a'], ['b', 'c']]);
});

test('nhãn lựa chọn', () => {
  assert.equal(nhanCua(LOC_HD, 'sap'), 'Sắp hết hạn');
  assert.equal(nhanCua(LOC_HD, 'la' as never), 'Tất cả');
});
