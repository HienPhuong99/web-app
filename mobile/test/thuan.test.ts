// Hàm thuần của app: node --test test/   (Node 22.18+ tự bỏ kiểu TypeScript)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tien, tienGon, ngay, tinhTrangBaoHanh, loiChao, thu, homNay, congNgay } from '../src/lib/dinhDang.ts';
import { dungLuhn, chuanHoaMa, chuanHoaTra, loaiMa, goiYMa } from '../src/lib/maQuet.ts';

test('tiền', () => {
  assert.equal(tien(28200000), '28.200.000 đ');
  assert.equal(tien('1000'), '1.000 đ');
  assert.equal(tien(0), '0 đ');
  assert.equal(tien(null), '0 đ');
  assert.equal(tien(-2500000), '-2.500.000 đ');
  assert.equal(tien(999.6), '1.000 đ');
});

test('tiền gọn', () => {
  assert.equal(tienGon(56500000), '56,5 tr');
  assert.equal(tienGon(28200000), '28,2 tr');
  assert.equal(tienGon(1000000), '1 tr');
  assert.equal(tienGon(1250000000), '1,25 tỷ');
  assert.equal(tienGon(950000), '950 k');
  assert.equal(tienGon(999), '999');
  assert.equal(tienGon(0), '0');
  assert.equal(tienGon(-3200000), '-3,2 tr');
  assert.equal(tienGon(999999), '1000 k');
});

test('ngày', () => {
  assert.equal(ngay('2026-10-11'), '11/10/2026');
  assert.equal(ngay('2026-10-11 08:30'), '11/10/2026');
  assert.equal(ngay(''), '');
  assert.equal(ngay(undefined), '');
  assert.equal(ngay('hôm qua'), 'hôm qua');
  assert.equal(thu('2026-10-10'), 'T7');
  assert.equal(thu('2026-10-11'), 'CN');
  assert.equal(thu('2026-10-12'), 'T2');
});

test('tình trạng bảo hành', () => {
  assert.deepEqual(tinhTrangBaoHanh({ HetHan: '2027-10-11', ConNgay: 365 }), { nhan: 'Còn 365 ngày', loai: 'con' });
  assert.deepEqual(tinhTrangBaoHanh({ HetHan: '2026-11-01', ConNgay: 21 }), { nhan: 'Còn 21 ngày', loai: 'sap' });
  assert.deepEqual(tinhTrangBaoHanh({ HetHan: '2026-10-11', ConNgay: 0 }), { nhan: 'Hết hạn hôm nay', loai: 'sap' });
  assert.deepEqual(tinhTrangBaoHanh({ HetHan: '2025-03-10', ConNgay: -215 }), { nhan: 'Hết hạn 215 ngày', loai: 'het' });
  assert.deepEqual(tinhTrangBaoHanh({ HetHan: '', ConNgay: null }), { nhan: 'Không bảo hành', loai: 'khong' });
  assert.deepEqual(tinhTrangBaoHanh({}), { nhan: 'Không bảo hành', loai: 'khong' });
});

test('lời chào', () => {
  assert.equal(loiChao(7), 'Chào buổi sáng');
  assert.equal(loiChao(12), 'Chào buổi trưa');
  assert.equal(loiChao(15), 'Chào buổi chiều');
  assert.equal(loiChao(21), 'Chào buổi tối');
});

test('Luhn và loại mã', () => {
  assert.ok(dungLuhn('490154203237518'));
  assert.ok(!dungLuhn('490154203237519'));
  assert.ok(!dungLuhn('49015420323751A'));
  assert.equal(loaiMa('490154203237518'), 'imei');
  assert.equal(loaiMa('490154203237519'), 'imei-sai');
  assert.equal(loaiMa('0194253401230'), 'ean');
  assert.equal(loaiMa('194253401230'), 'ean');
  assert.equal(loaiMa('F2LXK0ABC9'), 'serial');
  assert.equal(loaiMa('ANHMINH'), 'khac');
  assert.match(goiYMa('490154203237519'), /sai số kiểm tra/);
  assert.match(goiYMa('0194253401230'), /mã sản phẩm/);
  assert.equal(goiYMa('490154203237518'), '');
  assert.equal(goiYMa('F2LXK0ABC9'), '');
});

test('chuẩn hóa mã quét', () => {
  assert.equal(chuanHoaMa(' 490154203237518 '), '490154203237518');
  assert.equal(chuanHoaMa('49 015420 323751 8'), '490154203237518');
  assert.equal(chuanHoaMa('IMEI: 490154203237518'), '490154203237518');
  assert.equal(chuanHoaMa('IMEI1:490154203237518\nIMEI2:356789012345671'), '490154203237518');
  assert.equal(chuanHoaMa('imei 49-0154203-237518'), '490154203237518');
  assert.equal(chuanHoaMa('S/N: f2lxk0abc9'), 'F2LXK0ABC9');
  assert.equal(chuanHoaMa('Serial No. F2LXK0ABC9'), 'F2LXK0ABC9');
  assert.equal(chuanHoaMa('SF2LXK0ABC9'), 'SF2LXK0ABC9'); // chữ S đầu mã vạch serial: máy chủ tự thử bỏ
  assert.equal(chuanHoaMa('0911 000 001'), '0911000001');
  assert.equal(chuanHoaMa(''), '');
  // ô Tra bảo hành: tên khách giữ dấu cách; IMEI, serial, số điện thoại vẫn gọn như chuanHoaMa
  assert.equal(chuanHoaTra('  Nguyễn   Minh '), 'Nguyễn Minh');
  assert.equal(chuanHoaTra('NGUYỄN MINH'), 'NGUYỄN MINH');
  assert.equal(chuanHoaTra('minh'), 'MINH');
  assert.equal(chuanHoaTra('49 015420 323751 8'), '490154203237518');
  assert.equal(chuanHoaTra('IMEI: 490154203237518'), '490154203237518');
  assert.equal(chuanHoaTra('S/N: f2lxk0abc9'), 'F2LXK0ABC9');
  assert.equal(chuanHoaTra('Serial No. F2LXK0ABC9'), 'F2LXK0ABC9');
  assert.equal(chuanHoaTra('0911 000 001'), '0911000001');
});

test('hôm nay theo giờ Việt Nam', () => {
  // giờ Việt Nam (UTC+7) bất kể múi giờ của máy chạy
  assert.equal(homNay(new Date(Date.UTC(2026, 0, 5, 16, 59))), '2026-01-05'); // 23:59 ngày 5 giờ VN
  assert.equal(homNay(new Date(Date.UTC(2026, 0, 5, 17, 1))), '2026-01-06'); // 00:01 ngày 6 giờ VN
  assert.equal(homNay(new Date(Date.UTC(2026, 11, 31, 16, 30))), '2026-12-31');
  assert.match(homNay(), /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(congNgay(3, new Date(Date.UTC(2026, 9, 11, 17, 30))), '2026-10-15'); // 00:30 ngày 12 giờ VN + 3
  assert.equal(congNgay(1, new Date(Date.UTC(2026, 11, 31, 2))), '2027-01-01');
});
