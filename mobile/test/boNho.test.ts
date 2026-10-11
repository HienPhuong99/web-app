// Bộ nhớ dữ liệu (hiện số cũ ngay, cập nhật ở nền) và sửa số sau khi ghi: node --test test/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { datNoiLuu, khoaCua, layLuu, layNgay, luu, moTaLuc, nghe, sua, suaNhieu, xoaHet, type NoiLuu } from '../src/lib/boNho.ts';
import { dsKhachDoiNo, hoSoSauBan, hoSoSauThu, khachNoSauThu, khoSauBan, tongQuanSauBan, tongQuanSauThu } from '../src/lib/sauGhi.ts';
import type { BanNhanhKQ, HangKho, HoSoKhach, PhieuThu, TongQuan } from '../src/lib/api.ts';

const file = new Map<string, string>();
const noiLuu: NoiLuu = { doc: async k => file.get(k) ?? null, ghi: async (k, v) => { file.set(k, v); }, xoaHet: async () => { file.clear(); } };
datNoiLuu(noiLuu);
const cho = () => new Promise(r => setTimeout(r, 0));

test('nhớ trong RAM, ghi ra máy, mở app lần sau đọc lại từ máy', async () => {
  await xoaHet();
  const k = khoaCua('admin@x', 'khoMay', []);
  assert.equal(k, 'admin@x|khoMay|[]');
  assert.equal(layNgay(k), null);
  luu(k, [1, 2], true, 1000);
  assert.deepEqual(layNgay(k), { luc: 1000, du: [1, 2] });
  await cho();
  assert.ok(file.has(k));
  // Mở app lần sau: RAM trống, đọc file
  const giu = file.get(k)!;
  await xoaHet();
  file.set(k, giu);
  assert.equal(layNgay(k), null);
  assert.deepEqual(await layLuu(k), { luc: 1000, du: [1, 2] });
  assert.deepEqual(layNgay(k), { luc: 1000, du: [1, 2] });
  // Kết quả tìm theo chữ: chỉ nhớ trong RAM
  const k2 = khoaCua('admin@x', 'dsKhachMay', ['lan', {}]);
  luu(k2, { tong: 0, ds: [] }, false);
  await cho();
  assert.ok(!file.has(k2) && layNgay(k2));
  // File hỏng: coi như chưa có
  file.set('hong', '{không phải json');
  assert.equal(await layLuu('hong'), null);
});

test('đăng xuất: xóa hết, kể cả lần đọc file đang dở', async () => {
  const k = khoaCua('lan@x', 'tongQuanMay', []);
  luu(k, { a: 1 });
  await cho();
  const dangDoc = (async () => { file.set(k, JSON.stringify({ luc: 1, du: { a: 1 } })); return layLuu(khoaCua('lan@x', 'khac', [])); })();
  await xoaHet();
  assert.equal(layNgay(k), null);
  assert.equal(file.size, 0);
  assert.equal(await dangDoc, null);
});

test('sửa số đã nhớ: báo màn hình đang xem, giữ lúc lấy; sửa nhiều danh sách cùng lúc', async () => {
  await xoaHet();
  const k = khoaCua('u@x', 'chiTietKhach', ['KH1']);
  let bao = 0;
  const bo = nghe(k, () => bao++);
  sua<number>(k, n => n + 1); // chưa có: bỏ qua
  assert.equal(bao, 0);
  luu(k, 5, true, 777);
  sua<number>(k, n => n + 1);
  assert.deepEqual(layNgay(k), { luc: 777, du: 6 });
  assert.equal(bao, 2);
  bo();
  sua<number>(k, n => n + 1);
  assert.equal(bao, 2);
  const d1 = khoaCua('u@x', 'dsKhachMay', ['', { loc: 'no' }]), d2 = khoaCua('u@x', 'dsKhachMay', ['', { loc: 'tat' }]), khac = khoaCua('u@x', 'dsKhachMayX', []);
  [d1, d2, khac].forEach(x => luu(x, 1));
  suaNhieu<number>(x => x.startsWith('u@x|dsKhachMay|'), n => n + 10);
  assert.deepEqual([d1, d2, khac].map(x => layNgay(x)!.du), [11, 11, 1]);
});

test('mô tả lúc cập nhật', () => {
  const bayGio = new Date(2026, 9, 11, 15, 0).getTime();
  assert.equal(moTaLuc(new Date(2026, 9, 11, 13, 5).getTime(), bayGio), '13:05');
  assert.equal(moTaLuc(new Date(2026, 9, 10, 9, 0).getTime(), bayGio), 'hôm qua 09:00');
  assert.equal(moTaLuc(new Date(2026, 9, 2, 21, 30).getTime(), bayGio), '02/10 21:30');
});

const TQ = (): TongQuan => ({
  user: { u: 'a', ten: 'A', vaiTro: 'admin' }, cuaHang: { ten: 'x', moTa: '' }, homNay: '2026-10-11',
  ban: { don: 2, tien: 30 }, thu: 10, homQua: { don: 0, tien: 0 }, ban7: [{ ngay: '2026-10-10', tien: 5 }, { ngay: '2026-10-11', tien: 30 }],
  hopDong: [], dot: [], donTre: [], hang: [], soMuc: 0,
  no: { soKhach: 2, tong: 50, top: [{ MaKH: 'K1', TenKH: 'Một', SDT: '', tien: 40 }, { MaKH: 'K2', TenKH: 'Hai', SDT: '', tien: 10 }] },
});
const KQ = (o: Partial<BanNhanhKQ> = {}): BanNhanhKQ => ({ SoDH: 'DH9', SoPK: 'XK9', SoPT: 'PT9', TongCong: 100, daThu: 60, MaKH: 'K3', TenKH: 'Ba', loiThu: '', lines: [], ...o });

test('bán xong: doanh số, tiền thu, công nợ trên Tổng quan', () => {
  const tq = tongQuanSauBan(TQ(), KQ());
  assert.deepEqual([tq.ban, tq.thu, tq.ban7[1].tien, tq.ban7[0].tien], [{ don: 3, tien: 130 }, 70, 130, 5]);
  assert.deepEqual([tq.no.soKhach, tq.no.tong, tq.no.top.map(x => x.MaKH + ':' + x.tien)], [3, 90, ['K1:40', 'K3:40', 'K2:10']]);
  // Trả đủ: công nợ không đổi
  const du = tongQuanSauBan(TQ(), KQ({ daThu: 100 }));
  assert.deepEqual([du.no, du.thu], [TQ().no, 110]);
  // Khách đang nợ mua thêm chưa trả: không tăng số khách
  assert.deepEqual(tongQuanSauBan(TQ(), KQ({ MaKH: 'K2', daThu: 0 })).no.soKhach, 2);
  assert.equal(TQ().ban.don, 2); // không sửa dữ liệu gốc
});

test('thu tiền xong: Tổng quan, hồ sơ, danh sách khách, khách còn nợ', () => {
  const pt: PhieuThu = { SoPT: 'PT5', Ngay: '2026-10-11', MaKH: 'K2', TenKH: 'Hai', SoDH: 'DH1', SoTien: 10, HinhThuc: 'Tiền mặt' };
  const tq = tongQuanSauThu(TQ(), pt);
  assert.deepEqual([tq.thu, tq.no.tong, tq.no.soKhach, tq.no.top.map(x => x.MaKH)], [20, 40, 1, ['K1']]);
  assert.equal(tongQuanSauThu(TQ(), { ...pt, Ngay: '2026-10-01' }).thu, 10); // phiếu ngày khác: tiền thu hôm nay không đổi
  const hs: HoSoKhach = { kh: { MaKH: 'K2', TenKH: 'Hai', SDT: '', DiaChi: '', Email: '', NguoiLienHe: '', GhiChu: '' }, mua: 100, da: 90, no: 10,
    don: [{ SoDH: 'DH1', Ngay: '2026-10-01', TongCong: 100, TrangThai: 'Đã giao', daThu: 90 }], thu: [], may: [], hopDong: [] };
  const sau = hoSoSauThu(hs, pt);
  assert.deepEqual([sau.da, sau.no, sau.don[0].daThu, sau.thu.map(p => p.SoPT)], [100, 0, 100, ['PT5']]);
  assert.equal(hoSoSauThu(sau, pt), sau); // sửa hai lần (màn hình gọi lại): không trừ hai lần
  assert.equal(hoSoSauThu(hs, { ...pt, MaKH: 'K9' }), hs);
  const ds = { tong: 2, ds: [{ MaKH: 'K2', TenKH: 'Hai', SDT: '', DiaChi: '', no: 10, muaCuoi: '' }, { MaKH: 'K1', TenKH: 'Một', SDT: '', DiaChi: '', no: 40, muaCuoi: '' }] };
  assert.deepEqual(dsKhachDoiNo(ds, 'K2', -10).ds.map(k => k.no), [0, 40]);
  assert.equal(dsKhachDoiNo(ds, 'K9', -10), ds);
  assert.deepEqual(khachNoSauThu({ tong: 50, ds: [{ MaKH: 'K1', TenKH: 'Một', SDT: '', tien: 40 }, { MaKH: 'K2', TenKH: 'Hai', SDT: '', tien: 10 }] }, pt),
    { tong: 40, ds: [{ MaKH: 'K1', TenKH: 'Một', SDT: '', tien: 40 }] });
});

test('bán xong: tồn kho, hồ sơ khách', () => {
  const h = (MaHH: string, ton: number): HangKho => ({ MaHH, TenHang: MaHH, Model: '', NhomHang: '', DVT: '', GiaLe: 0, GiaSi: 0, TonToiThieu: 0, nhap: ton, xuat: 0, ton });
  assert.deepEqual(khoSauBan([h('A', 3), h('B', 1)], [{ MaHH: 'A', SoLuong: 1 }, { MaHH: 'A', SoLuong: 1 }, { SoLuong: 1 }]).map(x => [x.ton, x.xuat]), [[1, 2], [1, 0]]);
  const hs: HoSoKhach = { kh: { MaKH: 'K3', TenKH: 'Ba', SDT: '', DiaChi: '', Email: '', NguoiLienHe: '', GhiChu: '' }, mua: 0, da: 0, no: 0, don: [], thu: [], may: [], hopDong: [] };
  const sau = hoSoSauBan(hs, KQ(), '2026-10-11');
  assert.deepEqual([sau.mua, sau.da, sau.no, sau.don[0].SoDH], [100, 60, 40, 'DH9']);
});
