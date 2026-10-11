// Giỏ hàng bán nhanh, liên hệ, mã VietQR: node --test test/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { docTien, doiSoLuong, dongGui, soTienNhap, suaGia, themHang, themMay, tongGio, xoaDong } from '../src/lib/gioHang.ts';
import { boDau, linkGoi, linkVietQR, linkZalo, noiDungCK, soDienThoai } from '../src/lib/lienHe.ts';

const ip15 = { MaHH: 'HH0002', TenHang: 'iPhone 15 128GB - Đen', DVT: 'Máy', GiaLe: 11300000 };
const op = { MaHH: 'HH0009', TenHang: 'Ốp lưng', DVT: 'Cái', GiaLe: 150000 };

test('giỏ: mỗi máy một dòng, quét trùng báo lỗi', () => {
  let g = themMay([], ip15, ' 351234567890132 ');
  g = themMay(g, ip15, '351234567890140');
  assert.deepEqual(g.map(l => [l.MaHH, l.SoLuong, l.DonGia, l.IMEI]), [['HH0002', 1, 11300000, '351234567890132'], ['HH0002', 1, 11300000, '351234567890140']]);
  assert.notEqual(g[0].k, g[1].k);
  assert.throws(() => themMay(g, ip15, '351234567890132'), /đã có trong đơn/);
  assert.throws(() => themMay(g, ip15, '  '), /Thiếu IMEI/);
  assert.equal(themMay([], ip15, 'f2lxk0abc9')[0].IMEI, 'F2LXK0ABC9');
});

test('giỏ: hàng không IMEI cộng dồn, dịch vụ theo tên', () => {
  let g = themHang([], op);
  g = themHang(g, op, 2);
  assert.deepEqual(g.map(l => [l.TenHang, l.SoLuong]), [['Ốp lưng', 3]]);
  g = themHang(g, { MaHH: '', TenHang: ' Dán màn hình ', GiaLe: 100000 });
  g = themHang(g, { MaHH: '', TenHang: 'Dán màn hình' });
  assert.deepEqual(g.map(l => [l.MaHH, l.TenHang, l.SoLuong, l.DonGia]), [['HH0009', 'Ốp lưng', 3, 150000], ['', 'Dán màn hình', 2, 100000]]);
  assert.throws(() => themHang(g, { MaHH: '', TenHang: '  ' }), /Nhập tên hàng/);
  // máy có IMEI không bị gộp với dòng cùng mặt hàng
  g = themMay(g, ip15, '351234567890132');
  g = themHang(g, ip15);
  assert.deepEqual(g.filter(l => l.MaHH === 'HH0002').map(l => [l.SoLuong, l.IMEI]), [[1, '351234567890132'], [1, '']]);
});

test('giỏ: đổi số lượng, giá, xóa; tổng tiền như máy chủ', () => {
  let g = themMay(themHang([], op, 2), ip15, '351234567890132');
  const [kOp, kMay] = g.map(l => l.k);
  g = doiSoLuong(g, kMay, 5); // dòng có IMEI giữ 1 máy
  g = doiSoLuong(g, kOp, 4.7);
  assert.deepEqual(g.map(l => l.SoLuong), [4, 1]);
  assert.deepEqual(tongGio(g), { cong: 11900000, giam: 0, tienHang: 11900000, tienVAT: 0, tong: 11900000, soMay: 5 });
  g = suaGia(g, kMay, 10999999.6);
  assert.equal(g[1].DonGia, 11000000);
  assert.equal(suaGia(g, kOp, -5)[0].DonGia, 0);
  assert.deepEqual(tongGio(g, 10), { cong: 11600000, giam: 0, tienHang: 11600000, tienVAT: 1160000, tong: 12760000, soMay: 5 });
  // Giảm giá cả đơn: trừ trước VAT, không quá tiền hàng, không âm
  assert.deepEqual(tongGio(g, 10, 600000), { cong: 11600000, giam: 600000, tienHang: 11000000, tienVAT: 1100000, tong: 12100000, soMay: 5 });
  assert.deepEqual([tongGio(g, 0, 99e9).tong, tongGio(g, 0, -5).giam], [0, 0]);
  assert.deepEqual(tongGio([{ k: 'a', MaHH: '', TenHang: 'x', DVT: '', SoLuong: 3, DonGia: 333333, IMEI: '' }], 8), { cong: 999999, giam: 0, tienHang: 999999, tienVAT: 80000, tong: 1079999, soMay: 3 });
  assert.deepEqual(doiSoLuong(g, kOp, 0).map(l => l.k), [kMay]);
  assert.deepEqual(xoaDong(g, kMay).map(l => l.k), [kOp]);
  assert.deepEqual(dongGui(g)[1], { MaHH: 'HH0002', TenHang: 'iPhone 15 128GB - Đen', DVT: 'Máy', SoLuong: 1, DonGia: 11000000, IMEI: '351234567890132' });
  assert.ok(!('k' in dongGui(g)[0]));
});

test('ô nhập tiền', () => {
  assert.equal(docTien('28.200.000'), 28200000);
  assert.equal(docTien('28,200,000 đ'), 28200000);
  assert.equal(docTien(''), 0);
  assert.equal(docTien(null), 0);
  assert.equal(docTien('-5'), 5);
  assert.equal(docTien('99999999999999999'), 9999999999999);
  assert.equal(soTienNhap(28200000), '28.200.000');
  assert.equal(soTienNhap(0), '');
  assert.equal(soTienNhap(999), '999');
});

test('số điện thoại, gọi, Zalo', () => {
  assert.equal(soDienThoai('0911 000 001'), '0911000001');
  assert.equal(soDienThoai('+84 911 000 001'), '0911000001');
  assert.equal(soDienThoai('84911000001'), '0911000001');
  assert.equal(soDienThoai('0911.000.001 / 0922 000 002'), '0911000001');
  assert.equal(soDienThoai('Anh 123 / 0922 000 002'), '0922000002');
  assert.equal(soDienThoai(''), '');
  assert.equal(soDienThoai('không có'), '');
  assert.equal(linkGoi('0911 000 001'), 'tel:0911000001');
  assert.equal(linkZalo('+84 911 000 001'), 'https://zalo.me/0911000001');
  assert.equal(linkZalo(''), '');
});

test('mã VietQR', () => {
  const qr = { bin: '970436', nganHang: 'Vietcombank', soTK: '0123456789', chuTK: 'NGUYEN VAN A' };
  assert.equal(boDau('Đơn Chị Mai'), 'don chi mai');
  assert.equal(noiDungCK('Thu tiền đơn 001-2026/DH – Chị Mai!'), 'THU TIEN DON 001 2026 DH CHI MAI');
  assert.equal(noiDungCK('a'.repeat(80)).length, 50);
  assert.equal(linkVietQR(qr, 11300000, 'Đơn 001-2026/DH'),
    'https://img.vietqr.io/image/970436-0123456789-compact2.png?amount=11300000&addInfo=DON%20001%202026%20DH&accountName=NGUYEN%20VAN%20A');
  assert.equal(linkVietQR({ ...qr, chuTK: '' }, 0, ''), 'https://img.vietqr.io/image/970436-0123456789-compact2.png');
  assert.equal(linkVietQR(null, 1000, 'x'), '');
  assert.equal(linkVietQR({ ...qr, soTK: '' }, 1000, 'x'), '');
});
