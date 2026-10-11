// Kiểm tra API JSON của app điện thoại (Api.gs → doPost) trên dữ liệu mẫu:  node dev/kiem-tra-api.js
// Chạy trong tiến trình riêng (kiem-tra.js gọi ở cuối) để có dữ liệu sạch, không lẫn với các bài test khác.
const assert = require('assert');
const { ctx: G, sheets, logs, cache, props } = require('./chay-thu');
const adminPass = logs.join('\n').match(/mật khẩu: (\S+)/)[1];
const today = G.now_().slice(0, 10);

const api = body => {
  const out = G.doPost({ postData: { contents: typeof body === 'string' ? body : JSON.stringify(body) } });
  assert.strictEqual(out.getMimeType(), 'application/json');
  return JSON.parse(out.getContent());
};
const goi = (may, fn, ...args) => { const r = api({ may, fn, args }); if (!r.ok) throw new Error(r.error); return r.result; };
const may = (u, p, ten) => goi(null, 'dangNhapMay', u, p, ten).may;
const thietBi = () => sheets.ThietBi.rows.slice(1);

// Yêu cầu hỏng, hàm lạ, hàm riêng, thuộc tính của Object: đều bị từ chối, không lộ lỗi kỹ thuật
assert.deepStrictEqual(api('khong-phai-json'), { ok: false, error: 'Yêu cầu không hợp lệ.' });
assert.deepStrictEqual(api(''), { ok: false, error: 'Yêu cầu không hợp lệ.' });
assert.deepStrictEqual(api('null'), { ok: false, error: 'Yêu cầu không hợp lệ.' });
['caiDat', 'readTable_', 'dangNhap', 'luuTaiKhoan', 'xoaChungTu', 'kiemTraTaoHopDong', 'toString', 'constructor', '__proto__', 'hasOwnProperty', ''].forEach(fn =>
  assert.match(api({ fn }).error, /Không có chức năng/, fn));
assert.strictEqual(goi(null, 'thongTinDangNhap').ten, 'phuonghihi'); // trang đăng nhập: không cần đăng nhập
['taiDuLieu', 'tongQuanMay', 'traBaoHanh'].forEach(fn => {
  assert.strictEqual(api({ fn }).error, 'HET_PHIEN');
  assert.strictEqual(api({ fn, may: 'x'.repeat(64) }).error, 'HET_PHIEN');
  assert.strictEqual(api({ fn, may: { a: 1 } }).error, 'HET_PHIEN');
});

// Vừa triển khai bản có bảng ThietBi lên Sheet cũ, chưa ai mở web: lần gọi đầu từ app tự tạo bảng trước khi ghi
delete sheets.ThietBi; props.delete('schema'); cache.delete('schema');
assert.strictEqual(goi(null, 'dangNhapMay', 'admin', adminPass, 'Máy đầu tiên').user.u, 'admin');
assert.ok(props.get('schema'));
sheets.ThietBi.rows.length = 1;

// Đăng nhập trên máy: mã máy dài, Sheet chỉ lưu mã băm; sai mật khẩu báo như web
assert.match(api({ fn: 'dangNhapMay', args: ['admin', 'sai'] }).error, /Sai tên đăng nhập/);
const dn = goi(null, 'dangNhapMay', ' Admin ', adminPass, 'iPhone của chủ');
assert.match(dn.may, /^[0-9a-f]{64}$/);
assert.deepStrictEqual([dn.user.u, dn.user.vaiTro, dn.cuaHang.ten], ['admin', 'admin', 'phuonghihi']);
const ad = dn.may;
assert.strictEqual(thietBi().length, 1);
assert.deepStrictEqual(sheets.ThietBi.rows[0], ['MaMay', 'TenDangNhap', 'TenMay', 'CapLuc', 'NgayTao', 'LanCuoi']);
const [ma0, tk0, ten0, cap0] = thietBi()[0];
assert.ok(/^[0-9a-f]{64}$/.test(ma0) && ma0 !== ad && !JSON.stringify(sheets).includes(ad), 'Không được lưu mã máy gốc');
assert.deepStrictEqual([tk0, ten0, cap0], ['admin', 'iPhone của chủ', String(dn.user.t)]);
assert.ok(sheets.PS_NhatKy.rows.some(r => r[2] === 'Đăng nhập app điện thoại'));

// Gọi hàm qua API: kết quả như gọi trực tiếp, phân quyền vẫn do từng hàm kiểm tra
assert.strictEqual(goi(ad, 'taiDuLieu').cuaHang.ten, 'phuonghihi');
const t = G.dangNhap('admin', adminPass).token;
G.luuTaiKhoan(t, { TenDangNhap: 'lan', HoTen: 'Lan', VaiTro: 'nhanvien', MatKhau: 'lan-123', CuaHang: 'phone', moi: true });
const lan = may('lan', 'lan-123', 'Android quầy');
const kh = goi(lan, 'luuKhach', { TenKH: 'Chị Hoa', SDT: '0988 777 666' });
assert.deepStrictEqual([kh.MaKH, kh.NguoiTao], ['KH00002', 'Lan']);
assert.throws(() => goi(lan, 'luuChungTu', 'XK', { Ngay: today, lines: [{ MaHH: 'HH0001', TenHang: 'x', SoLuong: 0 }] }), /lớn hơn 0/);

// Dữ liệu tra bảo hành: 2 máy giao hôm nay cho Anh Minh, 1 máy giao năm 2020 (đã hết bảo hành), 1 dòng dịch vụ
const dh = goi(ad, 'luuChungTu', 'DH', { Ngay: today, MaKH: 'KH00001', TenKH: 'Anh Minh', SDT: '0911000001', VAT: 0, lines: [
  { MaHH: 'HH0001', TenHang: 'iPhone 16 Pro Max 256GB - Titan Đen', SoLuong: 2, DonGia: 28200000 }, { TenHang: 'Dán cường lực', SoLuong: 1, DonGia: 100000 }] }).doc;
goi(ad, 'luuChungTu', 'NK', { Ngay: today, DoiTac: 'NCC', lines: [{ MaHH: 'HH0001', TenHang: 'iPhone 16 Pro Max', SoLuong: 5 }] });
goi(lan, 'luuChungTu', 'XK', { Ngay: today, SoDH: dh.SoDH, DoiTac: 'Anh Minh', lines: [
  { MaHH: 'HH0001', TenHang: 'iPhone 16 Pro Max 256GB - Titan Đen', SoLuong: 2, IMEI: '356789012345671, F2LXK0ABC9' }, { TenHang: 'Dán cường lực', SoLuong: 1 }] });
goi(ad, 'luuChungTu', 'XK', { Ngay: '2020-01-15', DoiTac: 'Chị Hoa', lines: [{ MaHH: 'HH0002', TenHang: 'iPhone 15 128GB - Đen', SoLuong: 1, IMEI: '351111122222333' }] });
goi(lan, 'luuThuTien', { Ngay: today, SoDH: dh.SoDH, SoTien: 30000000, HinhThuc: 'Chuyển khoản' });

const tra = q => goi(lan, 'traBaoHanh', q);
let r = tra('356789012345671');
assert.deepStrictEqual([r.tong, r.ds[0].IMEIKhop, r.ds[0].TenKH, r.ds[0].SDT, r.ds[0].ConHan, r.ds[0].ConNgay > 360], [1, '356789012345671', 'Anh Minh', '0911000001', true, true]);
assert.strictEqual(r.ds[0].HetHan, G.congThang_(today, 12));
assert.strictEqual(tra(' 2345671 ').ds[0].IMEIKhop, '356789012345671'); // gõ một phần
assert.strictEqual(tra('f2lxk0abc9').ds[0].IMEIKhop, 'F2LXK0ABC9'); // serial, chữ thường
assert.strictEqual(tra('SF2LXK0ABC9').ds[0].IMEIKhop, 'F2LXK0ABC9'); // mã vạch serial trên hộp có chữ S đầu
assert.strictEqual(tra('35-6789 0123-45671').tong, 1); // mã có dấu cách / gạch
r = tra('0911 000 001');
assert.deepStrictEqual([r.tong, r.ds[0].IMEIKhop], [1, '']); // theo SĐT: dòng dịch vụ không có mã hàng nên không hiện
assert.strictEqual(tra('anh minh').tong, 1);
assert.strictEqual(tra('CHI HOA').tong, 1);
r = tra('351111122222333');
assert.deepStrictEqual([r.ds[0].ConHan, r.ds[0].HetHan, r.ds[0].ConNgay < 0, r.ds[0].TenKH], [false, '2021-01-15', true, 'Chị Hoa']);
assert.strictEqual(tra('999999999').tong, 0);
assert.throws(() => tra(' 12 '), /ít nhất 3 ký tự/);
assert.throws(() => tra(null), /ít nhất 3 ký tự/);
assert.strictEqual(tra('iphone').tong, 0); // không tra theo tên hàng (tránh trả cả kho)

// Tổng quan: số liệu hôm nay, 7 ngày, việc cần làm
const tq = goi(lan, 'tongQuanMay');
assert.deepStrictEqual([tq.homNay, tq.ban.don, tq.ban.tien, tq.thu, tq.user.ten, tq.cuaHang.ten], [today, 1, 56500000, 30000000, 'Lan', 'phuonghihi']);
assert.deepStrictEqual([tq.ban7.length, tq.ban7[6].ngay, tq.ban7[6].tien, tq.ban7[0].ngay < today], [7, today, 56500000, true]);
assert.deepStrictEqual([tq.no.soKhach, tq.no.tong], [1, 26500000]);
assert.ok(!('MatKhau' in tq.user) && !('shops' in tq.user));

// Bộ nhớ đệm mất (sau 6 giờ không dùng): mã máy vẫn dùng được, dựng lại phiên từ Sheet và ghi lần dùng cuối
thietBi().forEach(row => { row[5] = '2000-01-01 00:00'; });
cache.clear();
assert.strictEqual(goi(lan, 'tongQuanMay').user.ten, 'Lan');
assert.ok(thietBi().find(row => row[1] === 'lan')[5] > '2000-01-01 00:00');
assert.strictEqual(thietBi().find(row => row[1] === 'admin')[5], '2000-01-01 00:00'); // máy khác không bị đụng

// Tự đổi mật khẩu trên máy này: máy này vẫn dùng tiếp (kể cả khi bộ nhớ đệm mất), máy khác của tài khoản bị đăng xuất
const lan2 = may('lan', 'lan-123', 'iPad');
goi(lan, 'doiMatKhau', 'lan-123', 'lan-456');
assert.strictEqual(api({ may: lan2, fn: 'tongQuanMay' }).error, 'HET_PHIEN');
assert.strictEqual(goi(lan, 'tongQuanMay').user.ten, 'Lan');
cache.clear();
assert.strictEqual(goi(lan, 'tongQuanMay').user.ten, 'Lan');
assert.strictEqual(api({ may: lan2, fn: 'tongQuanMay' }).error, 'HET_PHIEN');
assert.strictEqual(thietBi().filter(row => row[1] === 'lan').length, 1); // máy bị thu hồi đã xóa khỏi Sheet
assert.ok(G.dangNhap('lan', 'lan-456').token);

// Quản trị đặt lại mật khẩu hoặc khóa tài khoản: mọi máy của tài khoản đó bị đăng xuất ngay
const t2 = G.dangNhap('admin', adminPass).token;
G.luuTaiKhoan(t2, { TenDangNhap: 'lan', HoTen: 'Lan', VaiTro: 'nhanvien', MatKhau: 'lan-789', CuaHang: 'phone' });
assert.strictEqual(api({ may: lan, fn: 'tongQuanMay' }).error, 'HET_PHIEN');
const lan3 = may('lan', 'lan-789', 'Android quầy');
assert.strictEqual(goi(lan3, 'tongQuanMay').user.ten, 'Lan');
G.luuTaiKhoan(t2, { TenDangNhap: 'lan', HoTen: 'Lan', VaiTro: 'nhanvien', TrangThai: 'Khóa', CuaHang: 'phone' });
assert.strictEqual(api({ may: lan3, fn: 'tongQuanMay' }).error, 'HET_PHIEN');
cache.clear();
assert.strictEqual(api({ may: lan3, fn: 'tongQuanMay' }).error, 'HET_PHIEN');
assert.match(api({ fn: 'dangNhapMay', args: ['lan', 'lan-789'] }).error, /bị khóa/);
assert.strictEqual(thietBi().filter(row => row[1] === 'lan').length, 0);
assert.strictEqual(goi(ad, 'tongQuanMay').user.u, 'admin'); // tài khoản khác không bị ảnh hưởng

// Đăng xuất trên máy: xóa khỏi Sheet, mã máy hết hiệu lực; đăng xuất lần nữa không lỗi
const ad2 = may('admin', adminPass, 'Máy thử');
assert.strictEqual(goi(ad2, 'dangXuatMay'), null);
assert.strictEqual(api({ may: ad2, fn: 'taiDuLieu' }).error, 'HET_PHIEN');
assert.strictEqual(goi(ad2, 'dangXuatMay'), null);
assert.strictEqual(goi(null, 'dangXuatMay'), null);
assert.strictEqual(goi(ad, 'taiDuLieu').user.u, 'admin');

// Tối đa 10 máy mỗi tài khoản: máy dùng lâu nhất bị đăng xuất
for (let i = 0; i < 12; i++) may('admin', adminPass, 'Máy ' + i);
assert.strictEqual(thietBi().filter(row => row[1] === 'admin').length, 10);
assert.strictEqual(api({ may: ad, fn: 'taiDuLieu' }).error, 'HET_PHIEN');

// Chủ khóa tài khoản thẳng trong Sheet (không qua app nên không có mốc thu hồi): máy bị đăng xuất khi phiên trong bộ nhớ đệm hết
G.luuTaiKhoan(G.dangNhap('admin', adminPass).token, { TenDangNhap: 'hoa', HoTen: 'Hoa', VaiTro: 'nhanvien', MatKhau: 'hoa-123', CuaHang: 'phone', moi: true });
const hoa = may('hoa', 'hoa-123', 'Máy Hoa');
const tkRows = sheets.TaiKhoan.rows, cotTT = tkRows[0].indexOf('TrangThai');
tkRows.find(row => row[0] === 'hoa')[cotTT] = 'Khóa';
cache.clear();
assert.strictEqual(api({ may: hoa, fn: 'tongQuanMay' }).error, 'HET_PHIEN');
assert.strictEqual(thietBi().filter(row => row[1] === 'hoa').length, 0);

// Gõ số thì chỉ tra IMEI và SĐT, không tra tên (tên khách/đại lý có số sẽ ra nhầm)
const ad3 = may('admin', adminPass, 'Máy test');
goi(ad3, 'luuChungTu', 'XK', { Ngay: today, DoiTac: 'Đại lý 2345671', lines: [{ MaHH: 'HH0002', TenHang: 'iPhone 15', SoLuong: 1, IMEI: '359999988888777' }] });
const dl = goi(ad3, 'traBaoHanh', '2345671');
assert.deepStrictEqual([dl.tong, dl.ds[0].IMEIKhop], [1, '356789012345671']);
assert.strictEqual(goi(ad3, 'traBaoHanh', 'dai ly').tong, 1);

// Sai mật khẩu 5 lần: chặn 10 phút như web
for (let i = 0; i < 5; i++) api({ fn: 'dangNhapMay', args: ['admin', 'sai'] });
assert.match(api({ fn: 'dangNhapMay', args: ['admin', adminPass] }).error, /quá 5 lần/);

console.log('OK - API app điện thoại: tất cả kiểm tra đều đạt');
