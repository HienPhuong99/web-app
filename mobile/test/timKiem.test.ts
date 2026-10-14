// Tìm kiếm thông minh: cùng mẫu với máy chủ / web (dev/tim-kiem-mau.json, chạy bằng dev/kiem-tra-tim-kiem.js)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { khoangCach, timKiem } from '../src/lib/timKiem.ts';

type Mau = { ten: string; ds: string[]; q: string; kq: string[]; ganDung?: boolean };
const mau: Mau[] = JSON.parse(readFileSync(new URL('../../dev/tim-kiem-mau.json', import.meta.url), 'utf8'));

test('tìm kiếm: các mẫu chung với web và máy chủ', () => {
  for (const m of mau) {
    const kq = timKiem(m.ds, m.q, x => x);
    assert.deepEqual([[...kq], !!kq.ganDung], [m.kq, !!m.ganDung], `${m.ten} (gõ "${m.q}")`);
  }
});

test('tìm kiếm: giữ thứ tự khi chỉ lọc, chữ trống trả cả danh sách', () => {
  assert.deepEqual([...timKiem(['Ốp lưng iPhone 15', 'iPhone 15 128GB'], 'iphone 15', x => x, { giuThuTu: true })], ['Ốp lưng iPhone 15', 'iPhone 15 128GB']);
  assert.deepEqual(timKiem(['a', 'b'], '  ', x => x), ['a', 'b']);
});

test('khoảng cách sửa chuỗi: thêm, bớt, thay, đổi chỗ hai chữ cạnh nhau', () => {
  assert.deepEqual([khoangCach('iphone', 'iphone', 2), khoangCach('iphne', 'iphone', 2), khoangCach('iphnoe', 'iphone', 2), khoangCach('ipxone', 'iphone', 2), khoangCach('abc', 'xyz', 1)], [0, 1, 1, 1, 2]);
});

import { goiYMaTon, type MaTon } from '../src/lib/maTon.ts';
const may = (IMEI: string, MaHH = 'HH0002', TenHang = 'iPhone 15 128GB', giuDen = ''): MaTon => ({ IMEI, MaHH, TenHang, SoPK: 'PK1', Ngay: '2026-10-01', giuDen });

test('gợi ý máy trong kho: gõ số cuối IMEI, bỏ máy đã có trong đơn, theo mặt hàng, theo tên', () => {
  const ds = [may('351234567890132'), may('356781230000132'), may('359999000001321', 'HH0005', 'iPhone 11 64GB'), may('F2LXK0ABC123', 'HH0007', 'iPad Air')];
  assert.deepEqual(goiYMaTon(ds, '0132').map(m => m.IMEI), ['351234567890132', '356781230000132', '359999000001321']); // khớp cuối mã trước, giữa sau
  assert.deepEqual(goiYMaTon(ds, '3599').map(m => m.IMEI), ['359999000001321']); // đầu mã
  assert.deepEqual(goiYMaTon(ds, '0132', ['35123456789-0132']).map(m => m.IMEI), ['356781230000132', '359999000001321']);
  assert.deepEqual(goiYMaTon(ds, 'abc 123').map(m => m.IMEI), ['F2LXK0ABC123']); // serial có chữ, gõ có dấu cách
  assert.deepEqual(goiYMaTon(ds, '', [], { maHH: 'HH0002' }).length, 2); // chọn mặt hàng: hiện mọi máy của mặt hàng
  assert.deepEqual(goiYMaTon(ds, 'ip 11').map(m => m.IMEI), ['359999000001321']);
  assert.deepEqual([goiYMaTon(ds, '').length, goiYMaTon(ds, '13').length, goiYMaTon(null, '0132').length], [0, 0, 0]);
});
