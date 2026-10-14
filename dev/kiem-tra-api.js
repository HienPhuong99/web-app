// Kiểm tra API JSON của app điện thoại (Api.gs → doPost) trên dữ liệu mẫu:  node dev/kiem-tra-api.js
// Chạy trong tiến trình riêng (kiem-tra.js gọi ở cuối) để có dữ liệu sạch, không lẫn với các bài test khác.
const assert = require('assert');
const { ctx: G, sheets, logs, cache, props, thuMail, push } = require('./chay-thu');
const adminPass = logs.join('\n').match(/mật khẩu: (\S+)/)[1];
const today = G.now_().slice(0, 10);
const plain = x => JSON.parse(JSON.stringify(x)); // đối tượng tạo trong vm khác prototype

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
assert.deepStrictEqual(sheets.ThietBi.rows[0], ['MaMay', 'TenDangNhap', 'TenMay', 'CapLuc', 'NgayTao', 'LanCuoi', 'PushToken']);
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
goi(ad, 'luuChungTu', 'NK', { Ngay: today, DoiTac: 'NCC', lines: [{ MaHH: 'HH0001', TenHang: 'iPhone 16 Pro Max', SoLuong: 5, IMEI: '356789012345671, F2LXK0ABC9, NK0503, NK0504, NK0505' }] });
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
assert.ok(!('ds' in tq.no)); // danh sách nợ đầy đủ chỉ gửi khi bấm xem (chiTietTongQuan)
// Bấm số liệu trên Tổng quan: đơn và phiếu thu của một ngày, lật ngày trước / sau; mọi khách còn nợ
const ct = goi(lan, 'chiTietTongQuan', 'ngay');
assert.deepStrictEqual([ct.ngay, ct.tong.don, ct.tong.tien, ct.tong.thu, ct.sau, ct.don.length, ct.thu.length], [today, tq.ban.don, tq.ban.tien, tq.thu, '', 1, 1]);
assert.deepStrictEqual([ct.don[0].daThu, typeof ct.don[0].MaKH, ct.truoc < today], [30000000, 'string', true]);
const ctTruoc = goi(lan, 'chiTietTongQuan', 'ngay', ct.truoc);
assert.deepStrictEqual([ctTruoc.ngay, ctTruoc.sau, ctTruoc.tong.tien], [ct.truoc, today, tq.ban7[5].tien]);
assert.deepStrictEqual(goi(lan, 'chiTietTongQuan', 'ngay', '2024-03-10').tong, { don: 0, tien: 0, thu: 0, traLai: 0, mayCu: 0, huy: 0 });
assert.throws(() => goi(lan, 'chiTietTongQuan', 'ngay', '2024-02-30'), /Ngày không hợp lệ/);
assert.throws(() => goi(lan, 'chiTietTongQuan', 'la'), /Không có số liệu/);
const ctNo = goi(lan, 'chiTietTongQuan', 'no');
assert.deepStrictEqual([ctNo.tong, ctNo.ds.length, ctNo.ds[0].tien, ctNo.ds[0].MaKH], [tq.no.tong, tq.no.soKhach, tq.no.top[0].tien, tq.no.top[0].MaKH]);

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

// ===== App bản 2: cài đặt thu tiền, kho, bán nhanh, khách, hợp đồng, điện thoại đăng nhập, thông báo =====
const at = G.dangNhap('admin', adminPass).token;
G.luuTaiKhoan(at, { TenDangNhap: 'binh', HoTen: 'Bình', VaiTro: 'nhanvien', MatKhau: 'binh-123', CuaHang: 'phone', moi: true });
const binh = may('binh', 'binh-123', 'iPhone Bình');

// Cài đặt: chưa khai tài khoản nhận tiền thì không có mã QR; quản trị khai xong thì app đủ thông tin tạo VietQR
let ch = goi(binh, 'cauHinhMay');
assert.deepStrictEqual([ch.qr, ch.quanTri, ch.hinhThuc[0], ch.vat], [null, false, 'Tiền mặt', 0]);
G.luuCuaHang(at, Object.assign({}, G.taiDuLieu(at).congTy, { tenNgan: 'phuonghihi', qrNganHang: '970436', qrSoTK: '0123456789', qrChuTK: 'NGUYEN VAN A' }));
ch = goi(binh, 'cauHinhMay');
assert.deepStrictEqual(ch.qr, { bin: '970436', nganHang: 'Vietcombank', soTK: '0123456789', chuTK: 'NGUYEN VAN A' });
assert.strictEqual(goi(ad3, 'cauHinhMay').quanTri, true);

// Kho: tồn = nhập − xuất; tra một IMEI xem còn trong kho, đã bán hay chưa từng nhập
goi(ad3, 'luuChungTu', 'NK', { Ngay: today, DoiTac: 'NCC', lines: [{ MaHH: 'HH0002', TenHang: 'iPhone 15', SoLuong: 2, IMEI: '351234567890132 351234567890140' }] });
let kho = goi(binh, 'khoMay'), k15 = kho.find(h => h.MaHH === 'HH0002');
assert.deepStrictEqual([k15.nhap, k15.xuat, k15.ton, k15.GiaLe, k15.TenHang], [2, 2, 0, 11300000, 'iPhone 15 128GB - Đen']);
assert.ok(kho.every((h, i) => !i || String(kho[i - 1].TenHang).localeCompare(h.TenHang, 'vi') <= 0));
let mk = goi(binh, 'traMaKho', ' 351 234 567 890 132 ');
assert.deepStrictEqual([mk.trangThai, mk.ma, mk.MaHH, mk.GiaLe, mk.DoiTac], ['trongKho', '351234567890132', 'HH0002', 11300000, 'NCC']);
mk = goi(binh, 'traMaKho', '356789012345671');
assert.deepStrictEqual([mk.trangThai, mk.SoDH, mk.TenHang], ['daBan', dh.SoDH, 'iPhone 16 Pro Max 256GB - Titan Đen']);
assert.deepStrictEqual([goi(binh, 'traMaKho', 'SF2LXK0ABC9').ma, goi(binh, 'traMaKho', 'SF2LXK0ABC9').trangThai], ['F2LXK0ABC9', 'daBan']);
assert.deepStrictEqual(goi(binh, 'traMaKho', '999999999999994'), { ma: '999999999999994', trangThai: 'chuaCo' });
assert.strictEqual(goi(binh, 'traMaKho', 'SABCDEFGHIJ').ma, 'ABCDEFGHIJ'); // serial chưa có, bỏ chữ S của mã vạch
assert.throws(() => goi(binh, 'traMaKho', ' ab '), /ít nhất 4/);

// Bán nhanh: lỗi thì báo trước, không ghi gì
const soDong = n => sheets['PS_' + n].rows.length, truoc = ['DonHang', 'DonHangCT', 'PhieuKho', 'ThuTien', 'KhachHang'].map(soDong);
const ban = o => goi(binh, 'banNhanh', o), mot = { MaHH: 'HH0002', SoLuong: 1, DonGia: 11300000, IMEI: '351234567890132' };
assert.throws(() => ban({ MaKH: 'KH00001', lines: [] }), /Chưa có hàng/);
assert.throws(() => ban({ MaKH: 'KH00001', lines: [{ MaHH: 'HH0002', SoLuong: 1, DonGia: 1, IMEI: '356789012345671' }] }), /đã xuất ở phiếu/);
assert.throws(() => ban({ khachMoi: { TenKH: 'Khách thử', SDT: '0900000099' }, lines: [{ MaHH: 'HH0002', SoLuong: 1, DonGia: 1, IMEI: '356789012345671' }] }), /đã xuất ở phiếu/); // không tạo khách thừa
assert.throws(() => ban({ MaKH: 'KH00001', lines: [{ MaHH: 'HH0002', SoLuong: 0, DonGia: 1 }] }), /số nguyên lớn hơn 0/);
assert.throws(() => ban({ MaKH: 'KH00001', lines: [{ MaHH: 'HH0002', SoLuong: 1.5, DonGia: 1 }] }), /số nguyên lớn hơn 0/);
assert.throws(() => ban({ MaKH: 'KH00001', lines: [{ MaHH: 'HH0002', SoLuong: 2, DonGia: 1, IMEI: '351234567890132' }] }), /có 1 IMEI\/serial nhưng số lượng là 2/);
assert.throws(() => ban({ MaKH: 'KH00001', lines: [mot, mot] }), /bị lặp/);
assert.throws(() => ban({ MaKH: 'KH00001', lines: [{ MaHH: 'HH9999', SoLuong: 1, DonGia: 1 }] }), /không tìm thấy mặt hàng HH9999/);
assert.throws(() => ban({ MaKH: 'KH00001', lines: [{ SoLuong: 1, DonGia: 1 }] }), /nhập tên hàng/);
assert.throws(() => ban({ MaKH: 'KH00001', lines: [{ TenHang: 'x', SoLuong: 1, DonGia: -5 }] }), /đơn giá không hợp lệ/);
assert.throws(() => ban({ MaKH: 'KH00001', lines: [mot], thu: { SoTien: 11300001 } }), /từ 0 đến 11300000/);
assert.throws(() => ban({ MaKH: 'KH99999', lines: [mot] }), /Không tìm thấy khách hàng KH99999/);
assert.throws(() => ban({ khachMoi: { TenKH: '  ' }, lines: [mot] }), /nhập tên khách mới/);
assert.deepStrictEqual(['DonHang', 'DonHangCT', 'PhieuKho', 'ThuTien', 'KhachHang'].map(soDong), truoc);
// Phiếu xuất vẫn lỗi sau khi đã lập đơn (vd. người khác vừa bán máy đó): đơn vừa lập bị xóa
const gocLuu = G.luuChungTu;
G.luuChungTu = (t, loai, d) => { if (loai === 'XK') throw new Error('giả lập lỗi phiếu xuất'); return gocLuu(t, loai, d); };
assert.throws(() => ban({ MaKH: 'KH00001', lines: [mot] }), /giả lập lỗi phiếu xuất/);
G.luuChungTu = gocLuu;
assert.deepStrictEqual(['DonHang', 'DonHangCT', 'PhieuKho', 'ThuTien', 'KhachHang'].map(soDong), truoc);

// Bán cho khách mới: đơn đã giao, máy ra khỏi kho, có hạn bảo hành, phiếu thu theo đơn
const bn = ban({ khachMoi: { TenKH: ' Chị Mai ', SDT: '0977 123 456' }, GhiChu: 'Khách quen',
  lines: [mot, { TenHang: 'Ốp lưng', SoLuong: 2, DonGia: 150000 }], thu: { SoTien: 5000000, HinhThuc: 'Chuyển khoản' } });
assert.match(bn.SoDH, /DH$/); assert.match(bn.SoPK, /XK$/); assert.match(bn.SoPT, /PT$/);
assert.deepStrictEqual([bn.TongCong, bn.daThu, bn.TenKH, bn.loiThu, bn.lines[0].HetHan, bn.lines[0].IMEI, bn.lines[1].HetHan],
  [11600000, 5000000, 'Chị Mai', '', G.congThang_(today, 12), '351234567890132', '']);
const dhBan = G.findObj_('DonHang', bn.SoDH), ptBan = G.findObj_('ThuTien', bn.SoPT);
assert.deepStrictEqual([dhBan.TrangThai, dhBan.NguoiTao, dhBan.MaKH, dhBan.GhiChu, dhBan.NgayGiao], ['Đã giao', 'Bình', bn.MaKH, 'Khách quen', today]);
assert.deepStrictEqual([ptBan.SoDH, ptBan.SoTien, ptBan.HinhThuc, ptBan.MaKH], [bn.SoDH, 5000000, 'Chuyển khoản', bn.MaKH]);
assert.deepStrictEqual(G.layChungTu(at, 'DH', bn.SoDH).lines.map(l => [l.LoaiGia, l.ThanhTien]), [['Giá lẻ', 11300000], ['Giá tùy chọn', 300000]]);
assert.strictEqual(goi(binh, 'traMaKho', '351234567890132').trangThai, 'daBan');
assert.strictEqual(goi(binh, 'khoMay').find(h => h.MaHH === 'HH0002').xuat, 3);
// Khách mới trùng số điện thoại với khách đã có: dùng khách cũ, không tạo trùng. Khách chưa trả: không có phiếu thu
const bn2 = ban({ khachMoi: { TenKH: 'Mai', SDT: '0977123456' }, lines: [{ TenHang: 'Dán màn hình', SoLuong: 1, DonGia: 100000 }] });
assert.deepStrictEqual([bn2.MaKH, bn2.SoPT, bn2.daThu], [bn.MaKH, '', 0]);
// Số dạng +84 vẫn là khách cũ (cách bán nhanh tìm khách), không tạo khách trùng
assert.strictEqual(require('vm').runInContext(`readTable_('KhachHang').find(k => sdtList_(k.SDT).indexOf(sdtVN_('+84 977 123 456')) >= 0).MaKH`, G), bn.MaKH);
assert.strictEqual(sheets.PS_KhachHang.rows.filter(r => r[3] && String(r[3]).replace(/\D/g, '') === '0977123456').length, 1);
// "Khách lẻ" không số điện thoại: mọi lần bán lẻ dùng chung một khách; khách mới khác tên không số thì tạo mới
const le1 = ban({ khachMoi: { TenKH: 'Khách lẻ' }, lines: [{ TenHang: 'Cáp sạc', SoLuong: 1, DonGia: 90000 }], thu: { SoTien: 90000 } });
const le2 = ban({ khachMoi: { TenKH: 'khach le', SDT: '' }, lines: [{ TenHang: 'Cáp sạc', SoLuong: 1, DonGia: 90000 }], thu: { SoTien: 90000 } });
assert.strictEqual(le1.MaKH, le2.MaKH);
assert.notStrictEqual(ban({ khachMoi: { TenKH: 'Anh Tú' }, lines: [{ TenHang: 'Cáp sạc', SoLuong: 1, DonGia: 90000 }] }).MaKH, le1.MaKH);
// VAT tính ở máy chủ; không chọn hình thức thì là tiền mặt
const bn3 = ban({ MaKH: bn.MaKH, VAT: 10, lines: [{ TenHang: 'Sạc 20W', SoLuong: 1, DonGia: 500000 }], thu: { SoTien: 550000 } });
assert.deepStrictEqual([bn3.TongCong, G.findObj_('ThuTien', bn3.SoPT).HinhThuc], [550000, 'Tiền mặt']);
// Phiếu thu lỗi: đơn và phiếu xuất vẫn giữ, báo lại để thu sau
const gocThu = G.luuThuTien;
G.luuThuTien = () => { throw new Error('giả lập lỗi thu tiền'); };
const bn4 = ban({ MaKH: bn.MaKH, lines: [{ TenHang: 'Cáp', SoLuong: 1, DonGia: 200000 }], thu: { SoTien: 200000 } });
G.luuThuTien = gocThu;
assert.deepStrictEqual([bn4.loiThu, bn4.SoPT, bn4.daThu, !!G.findObj_('DonHang', bn4.SoDH)], ['giả lập lỗi thu tiền', '', 0, true]);

// Hồ sơ khách: công nợ, đơn (mới trước), phiếu thu, máy đã mua kèm bảo hành
const hs = goi(binh, 'chiTietKhach', bn.MaKH);
assert.deepStrictEqual([hs.kh.TenKH, hs.kh.SDT, hs.mua, hs.da, hs.no], ['Chị Mai', '0977 123 456', 12450000, 5550000, 6900000]);
assert.deepStrictEqual(hs.don.map(d => d.SoDH), [bn4.SoDH, bn3.SoDH, bn2.SoDH, bn.SoDH]);
assert.deepStrictEqual([hs.don[3].daThu, hs.thu.length, hs.may.length, hs.may[0].IMEI, hs.may[0].ConHan, hs.hopDong.length], [5000000, 2, 1, '351234567890132', true, 0]);
assert.ok(!('SoTK' in hs.kh) && !('MST' in hs.kh));
assert.throws(() => goi(binh, 'chiTietKhach', 'KH99999'), /Không tìm thấy khách/);

// Tìm khách: không dấu, theo số điện thoại, theo mã; kèm công nợ
const tim = q => goi(binh, 'dsKhachMay', q);
assert.deepStrictEqual(tim('chi mai').ds.map(k => [k.TenKH, k.no]), [['Chị Mai', 6900000]]);
assert.deepStrictEqual(tim('0977 12').ds.map(k => k.MaKH), [bn.MaKH]);
assert.deepStrictEqual(tim('KH00001').ds.map(k => k.TenKH), ['Anh Minh']);
assert.deepStrictEqual(tim('chi').ds.map(k => k.TenKH), ['Chị Hoa', 'Chị Mai']);
assert.strictEqual(tim('12').tong, 0); // số quá ngắn
// Tìm kiếm thông minh: gõ sai một chữ vẫn ra (khi không có tên nào khớp đúng), chữ cái đầu, viết liền
assert.deepStrictEqual(tim('chi maii').ds.map(k => k.TenKH), ['Chị Mai']);
assert.deepStrictEqual(tim('anh mihn').ds.map(k => k.TenKH), ['Anh Minh']);
assert.deepStrictEqual(tim('chimai').ds.map(k => k.TenKH), ['Chị Mai']);
assert.strictEqual(tim('').tong, sheets.PS_KhachHang.rows.length - 1);
assert.strictEqual(tim('').ds[0].muaCuoi, today);
// Lọc, sắp xếp (app gửi o = { loc, sx })
const khLoc = (q, o) => goi(binh, 'dsKhachMay', q, o).ds;
const tatCa = khLoc('', {});
assert.deepStrictEqual(khLoc('', { loc: 'no' }).map(k => k.MaKH), tatCa.filter(k => k.no > 0).map(k => k.MaKH));
assert.ok(khLoc('', { loc: 'no' }).length > 0 && khLoc('', { loc: 'no' }).every(k => k.no > 0));
assert.ok(khLoc('', { loc: 'chua' }).length > 0 && khLoc('', { loc: 'chua' }).every(k => !k.muaCuoi) && khLoc('', { loc: 'mua' }).every(k => !!k.muaCuoi));
assert.strictEqual(khLoc('', { loc: 'chua' }).length + khLoc('', { loc: 'mua' }).length, tatCa.length);
const theoTen = khLoc('', { sx: 'ten' }).map(k => k.TenKH);
assert.deepStrictEqual(theoTen, theoTen.slice().sort((a, b) => a.localeCompare(b, 'vi')));
const theoNo = khLoc('', { sx: 'no' }).map(k => k.no);
assert.deepStrictEqual(theoNo, theoNo.slice().sort((a, b) => b - a));
assert.deepStrictEqual(khLoc('chi', { sx: 'no' }).map(k => k.TenKH), ['Chị Mai', 'Chị Hoa']); // tìm + sắp xếp cùng lúc
assert.strictEqual(khLoc('', { sx: 'moi' })[0].MaKH, tatCa.map(k => k.MaKH).sort().pop()); // khách mới thêm nhất
// Đảo chiều (app mới gửi thêm o.chieu)
assert.deepStrictEqual(khLoc('', { sx: 'ten', chieu: 'giam' }).map(k => k.TenKH), theoTen.slice().reverse());
assert.deepStrictEqual(khLoc('', { sx: 'no', chieu: 'tang' }).map(k => k.no), theoNo.slice().sort((a, b) => a - b));
assert.deepStrictEqual(khLoc('chi', { sx: 'no', chieu: 'tang' }).map(k => k.TenKH), ['Chị Hoa', 'Chị Mai']);
assert.deepStrictEqual(khLoc('', { sx: 'ten', chieu: 'la' }).map(k => k.TenKH), theoTen); // chiều lạ: như không gửi
const muaCu = khLoc('', { sx: 'gan', chieu: 'tang' });
assert.ok(muaCu[0].muaCuoi && muaCu[0].muaCuoi <= tatCa[0].muaCuoi && !muaCu[muaCu.length - 1].muaCuoi); // mua lâu nhất trước, chưa mua vẫn xếp cuối
assert.deepStrictEqual(khLoc('', { loc: 'la', sx: 'la' }).map(k => k.MaKH), tatCa.map(k => k.MaKH)); // giá trị lạ: như không lọc
assert.strictEqual(goi(binh, 'dsKhachMay', 'chi', { loc: 'no' }).tong, 1); // tổng tính sau khi lọc

// Hợp đồng: tìm theo số / tên / SĐT; biết hợp đồng nào đã có file để tải PDF
const shHD = G.sheet_('HopDong');
// Thêm dòng thẳng trên Sheet (không qua app) rồi kéo xuống làm mới: app gửi moi = true, bỏ qua kết quả máy chủ đã ghi nhớ
const goiMoi = (may, fn, ...args) => { const r = api({ may, fn, args, moi: true }); if (!r.ok) throw new Error(r.error); return r.result; };
shHD.appendRow(G.toRow_(shHD, { SoHD: '001-2026/HĐMB', Ngay: today, LoaiHD: 'Mua bán', MaKH: bn.MaKH, TenDN: 'Chị Mai', SDT: '0977123456', TongCong: 11300000 }));
shHD.appendRow(G.toRow_(shHD, { SoHD: '002-2026/HĐMB', Ngay: today, LoaiHD: 'Mua bán', MaKH: 'KH00001', TenDN: 'Anh Minh', FileId: 'file-x', FileCu: '1' }));
assert.deepStrictEqual(goiMoi(binh, 'dsHopDongMay', '').ds.map(h => [h.SoHD, h.coFile, h.fileCu]), [['002-2026/HĐMB', true, true], ['001-2026/HĐMB', false, false]]);
assert.deepStrictEqual(goi(binh, 'dsHopDongMay', 'chi mai').ds.map(h => h.SoHD), ['001-2026/HĐMB']);
assert.deepStrictEqual(goi(binh, 'dsHopDongMay', '0977 123').ds.map(h => h.SoHD), ['001-2026/HĐMB']);
assert.strictEqual(goi(binh, 'chiTietKhach', bn.MaKH).hopDong.length, 0); // máy chủ còn nhớ hồ sơ vừa xem: chưa thấy dòng sửa tay
assert.strictEqual(goiMoi(binh, 'chiTietKhach', bn.MaKH).hopDong[0].SoHD, '001-2026/HĐMB');
assert.strictEqual(goi(binh, 'chiTietKhach', bn.MaKH).hopDong[0].SoHD, '001-2026/HĐMB'); // lần sau dùng kết quả mới
// Lọc, sắp xếp hợp đồng
const ngayCach = n => new Date(Date.parse(today) + n * 864e5).toISOString().slice(0, 10);
shHD.appendRow(G.toRow_(shHD, { SoHD: '003-2026/HĐMB', Ngay: ngayCach(-400), LoaiHD: 'Mua bán', TenDN: 'Công ty Hết Hạn', TrangThai: 'Đang hiệu lực', NgayHetHan: ngayCach(-3), TongCong: 50000000 }));
shHD.appendRow(G.toRow_(shHD, { SoHD: '004-2026/HĐMB', Ngay: ngayCach(-300), LoaiHD: 'Mua bán', TenDN: 'Công ty Sắp Hết', TrangThai: 'Đang hiệu lực', NgayHetHan: ngayCach(10), TongCong: 2000000 }));
shHD.appendRow(G.toRow_(shHD, { SoHD: '005-2026/HĐMB', Ngay: ngayCach(-5), LoaiHD: 'Mua bán', TenDN: 'Công ty Còn Dài', TrangThai: 'Đang hiệu lực', NgayHetHan: ngayCach(200), TongCong: 9000000 }));
const hdLoc = o => goi(binh, 'dsHopDongMay', '', o).ds.map(h => h.SoHD.slice(0, 3));
assert.deepStrictEqual(hdLoc({}), ['002', '001', '005', '004', '003']);
assert.deepStrictEqual(hdLoc({ sx: 'cu' }), ['003', '004', '005', '001', '002']);
assert.deepStrictEqual(hdLoc({ sx: 'giaTri' }), ['003', '001', '005', '004', '002']);
assert.deepStrictEqual(hdLoc({ sx: 'hetHan' }), ['003', '004', '005', '002', '001']); // không có ngày hết hạn: xếp cuối
// App mới: tiêu chí + chiều; 'moi' / 'cu' của bản app cũ vẫn chạy
assert.deepStrictEqual(hdLoc({ sx: 'ngay' }), hdLoc({}));
assert.deepStrictEqual(hdLoc({ sx: 'ngay', chieu: 'tang' }), hdLoc({ sx: 'cu' }));
assert.deepStrictEqual(hdLoc({ sx: 'giaTri', chieu: 'tang' }), ['002', '004', '005', '001', '003']);
assert.deepStrictEqual(hdLoc({ sx: 'hetHan', chieu: 'giam' }), ['005', '004', '003', '002', '001']); // đảo chiều: không có ngày hết hạn vẫn xếp cuối
assert.deepStrictEqual([hdLoc({ loc: 'het' }), hdLoc({ loc: 'sap' }), hdLoc({ loc: 'hieuLuc' }), hdLoc({ loc: 'coFile' })], [['003'], ['004'], ['005', '004', '003'], ['002']]);
assert.deepStrictEqual(hdLoc({ loc: 'nhap' }), []);
assert.strictEqual(goi(binh, 'dsHopDongMay', 'cong ty', { loc: 'het' }).tong, 1);
assert.throws(() => goi(binh, 'taiPdfHopDong', '001-2026/HĐMB'), /chưa có file/);

// Điện thoại đã đăng nhập: nhân viên thấy máy mình, quản trị thấy hết; "máy này" là máy đang gọi
let tb = goi(binh, 'dsThietBi');
assert.deepStrictEqual(tb.map(x => [x.TenDangNhap, x.TenMay, x.mayNay, x.thongBao]), [['binh', 'iPhone Bình', true, false]]);
tb = goi(ad3, 'dsThietBi');
assert.ok(tb.some(x => x.TenDangNhap === 'binh') && tb.filter(x => x.mayNay).length === 1 && tb.find(x => x.mayNay).TenMay === 'Máy test');
assert.ok(G.dsThietBi(at).every(x => !x.mayNay)); // gọi từ web: không có "máy này"
const maBinh = G.dsThietBi(at).find(x => x.TenDangNhap === 'binh').MaMay;
assert.throws(() => goi(binh, 'xoaThietBi', G.dsThietBi(at).find(x => x.TenDangNhap === 'admin').MaMay), /Chỉ quản trị/);
assert.throws(() => goi(binh, 'xoaThietBi', 'khong-co'), /Không tìm thấy điện thoại/);
const binh2 = may('binh', 'binh-123', 'iPad Bình');
goi(binh2, 'xoaThietBi', maBinh); // nhân viên tự đăng xuất máy cũ của mình
assert.strictEqual(api({ may: binh, fn: 'tongQuanMay' }).error, 'HET_PHIEN');
G.xoaThietBi(at, G.dsThietBi(at).find(x => x.TenMay === 'iPad Bình').MaMay); // quản trị đăng xuất từ web
assert.strictEqual(api({ may: binh2, fn: 'tongQuanMay' }).error, 'HET_PHIEN');
assert.ok(sheets.PS_NhatKy.rows.some(r => r[2] === 'Đăng xuất điện thoại từ xa' && r[4] === 'iPad Bình'));

// Thông báo đẩy: bật trên máy → lưu mã, đặt hẹn giờ sáng; thử gửi; mỗi sáng gửi tóm tắt việc cần làm
const binh3 = may('binh', 'binh-123', 'iPhone Bình'), MA_TB = 'ExponentPushToken[abcdefghij1234567890]';
assert.strictEqual(api({ fn: 'datThongBao', args: [MA_TB] }).error, 'HET_PHIEN');
assert.match(api({ may: binh3, fn: 'datThongBao', args: ['khong-hop-le'] }).error, /không hợp lệ/);
assert.throws(() => goi(binh3, 'thuThongBao'), /chưa bật thông báo/);
thuMail.henGio = [];
assert.deepStrictEqual(goi(binh3, 'datThongBao', MA_TB), { bat: true });
assert.deepStrictEqual(thuMail.henGio.map(t => [t.ham, t.gio]), [['guiEmailSang', 7]]);
assert.strictEqual(goi(binh3, 'dsThietBi')[0].thongBao, true);
goi(binh3, 'thuThongBao');
assert.deepStrictEqual(push.da.at(-1).msgs.map(m => [m.to, m.title]), [[MA_TB, 'Thông báo thử']]);
assert.strictEqual(push.da.at(-1).url, 'https://exp.host/--/api/v2/push/send');
push.http = 500;
assert.throws(() => goi(binh3, 'thuThongBao'), /Chưa gửi được thông báo/);
push.http = 0;
// Nội dung thông báo sáng
assert.strictEqual(G.noiDungThongBao_('X', { dot: [], hopDong: [], donTre: [], hang: [], soMuc: 0 }), null);
assert.deepStrictEqual(JSON.parse(JSON.stringify(G.noiDungThongBao_('X', { dot: [1], hopDong: [], donTre: [1, 2], hang: [], soMuc: 3 }))),
  { title: 'X: 3 việc cần làm hôm nay', body: '1 đợt trả góp cần thu · 2 đơn trễ giao' });
// Bộ hẹn giờ sáng gửi một lần mỗi ngày (có hàng sắp hết nên có việc)
let soLo = push.da.length;
G.guiEmailSang({ triggerUid: 'x' });
assert.strictEqual(push.da.length, soLo + 1);
assert.deepStrictEqual(push.da.at(-1).msgs.map(m => m.to), [MA_TB]);
assert.match(push.da.at(-1).msgs[0].body, /mặt hàng sắp hết/);
G.guiEmailSang({ triggerUid: 'x' });
assert.strictEqual(push.da.length, soLo + 1);
G.guiEmailSang(); // người lạ gọi thẳng: bỏ qua
assert.strictEqual(push.da.length, soLo + 1);
// Máy bị thu hồi (đặt lại mật khẩu) mà chưa mở lại app: không gửi
props.delete('thongBao.phone');
G.luuTaiKhoan(at, { TenDangNhap: 'binh', HoTen: 'Bình', VaiTro: 'nhanvien', MatKhau: 'binh-456', CuaHang: 'phone' });
G.guiEmailSang({ triggerUid: 'x' });
assert.strictEqual(push.da.length, soLo + 1);
// Máy đã gỡ app: máy chủ Expo báo DeviceNotRegistered → xóa mã, lần sau không gửi
const binh4 = may('binh', 'binh-456', 'iPhone Bình');
goi(binh4, 'datThongBao', MA_TB);
push.loi[MA_TB] = 'DeviceNotRegistered';
props.delete('thongBao.phone');
G.guiEmailSang({ triggerUid: 'x' });
assert.strictEqual(push.da.length, soLo + 2);
assert.strictEqual(goi(binh4, 'dsThietBi')[0].thongBao, false);
// Bấm thử thông báo đúng lúc máy chủ Expo báo máy đã gỡ đăng ký: báo rõ, không nói "đã gửi"
goi(binh4, 'datThongBao', MA_TB);
assert.throws(() => goi(binh4, 'thuThongBao'), /tắt thông báo hoặc cài lại app/);
assert.strictEqual(goi(binh4, 'dsThietBi')[0].thongBao, false);
delete push.loi[MA_TB];
// Tắt thông báo; không còn máy nào bật và email sáng tắt: bỏ hẹn giờ
goi(binh4, 'datThongBao', MA_TB);
assert.deepStrictEqual(goi(binh4, 'datThongBao', ''), { bat: false });
assert.strictEqual(goi(binh4, 'dsThietBi')[0].thongBao, false);
G.datHenGioEmailSang_();
assert.strictEqual(thuMail.henGio.length, 0);
assert.match(api({ may: binh4, fn: 'noiDungThongBao_' }).error, /Không có chức năng/);

// Máy chủ ghi nhớ kết quả chỉ đọc: gọi lại không đọc Sheet nữa; ghi qua app (thu tiền, bán…) là thấy số mới ngay
{
  const shDH = sheets.PS_DonHang, goc = shDH.getDataRange.bind(shDH);
  let lanDoc = 0;
  shDH.getDataRange = () => { lanDoc++; return goc(); };
  const tq1 = goi(binh4, 'tongQuanMay');
  const docLan1 = lanDoc;
  assert.ok(docLan1 >= 1);
  assert.deepStrictEqual(goi(binh4, 'tongQuanMay'), tq1);
  assert.strictEqual(lanDoc, docLan1); // lần 2: không đọc trang Đơn hàng
  goi(binh4, 'chiTietTongQuan', 'ngay', today); // mỗi trang chỉ đọc một lần trong một lần gọi dù hàm cần nhiều lần (ThuTien)
  const kh = goi(binh4, 'dsKhachMay', '', {}).ds.find(k => k.no > 0);
  goi(binh4, 'luuThuTien', { Ngay: today, MaKH: kh.MaKH, TenKH: kh.TenKH, SoTien: 1000, HinhThuc: 'Tiền mặt' });
  const tq2 = goi(binh4, 'tongQuanMay');
  assert.strictEqual(tq2.thu, tq1.thu + 1000);
  assert.strictEqual(tq2.no.tong, tq1.no.tong - 1000);
  assert.ok(lanDoc > docLan1);
  const lan3 = lanDoc;
  goi(binh4, 'tongQuanMay');
  assert.strictEqual(lanDoc, lan3);
  goiMoi(binh4, 'tongQuanMay'); // kéo xuống làm mới: đọc lại
  assert.strictEqual(lanDoc, lan3 + 1);
  shDH.getDataRange = goc;
  // Đăng xuất / hết phiên thì không trả kết quả đã ghi nhớ
  assert.strictEqual(api({ may: 'x'.repeat(64), fn: 'tongQuanMay' }).error, 'HET_PHIEN');
}
{ // chiTietTongQuan cần ThuTien hai lần: chỉ đọc một lần
  const shTT = sheets.PS_ThuTien, goc = shTT.getDataRange.bind(shTT);
  let lanDoc = 0;
  shTT.getDataRange = () => { lanDoc++; return goc(); };
  goiMoi(binh4, 'chiTietTongQuan', 'ngay', today);
  assert.strictEqual(lanDoc, 1);
  shTT.getDataRange = goc;
}

// Giá vốn bình quân, lãi gộp (chỉ quản trị), phiếu chi, sổ quỹ
{
  const adQ = may('admin', adminPass, 'Máy sổ quỹ'), t = G.dangNhap('admin', adminPass).token;
  const iphone15 = { MaHH: 'HH0002', TenHang: 'iPhone 15 128GB - Đen', DVT: 'Máy' };
  G.luuChungTu(t, 'NK', { Ngay: today, DoiTac: 'NCC Minh Phát', lines: [Object.assign({ SoLuong: 2, GiaVon: 10000000, IMEI: 'SQ0001, SQ0002' }, iphone15)] });
  G.luuChungTu(t, 'NK', { Ngay: today, DoiTac: 'NCC Minh Phát', lines: [Object.assign({ SoLuong: 2, GiaVon: 11000000, IMEI: 'SQ0003, SQ0004' }, iphone15)] });
  assert.strictEqual(G.giaVonBQ_().HH0002, 10500000); // (2 × 10tr + 2 × 11tr) / 4; lần nhập không có giá không tính
  const xk = G.luuChungTu(t, 'XK', { Ngay: today, DoiTac: 'Khách lẻ', lines: [Object.assign({ SoLuong: 1, GiaVon: 999, IMEI: 'SQ0001' }, iphone15)] }).doc;
  assert.strictEqual(sheets.PS_PhieuKhoCT.rows.find(r => r[0] === xk.SoPK)[sheets.PS_PhieuKhoCT.rows[0].indexOf('GiaVon')], ''); // phiếu xuất không lưu giá vốn
  const dhLai = G.luuChungTu(t, 'DH', { Ngay: today, MaKH: 'KH00001', TenKH: 'Anh Minh', VAT: 10, lines: [Object.assign({ SoLuong: 2, DonGia: 12000000 }, iphone15), { TenHang: 'Dán cường lực', SoLuong: 1, DonGia: 100000 }] }).doc;
  const ln = goi(adQ, 'loiNhuan', today, today);
  assert.strictEqual(ln.tong.lai, ln.tong.doanhThu - ln.tong.giaVon);
  const don = ln.theoDon.find(d => d.SoDH === dhLai.SoDH);
  assert.deepStrictEqual([don.doanhThu, don.giaVon, don.lai], [24100000, 21000000, 3100000]); // chưa VAT; dịch vụ không có giá vốn
  assert.ok(ln.thieuGiaVon.some(h => h.MaHH === 'HH0001')); // iPhone 16 chưa nhập có giá: báo để bổ sung
  assert.strictEqual(ln.theoThang[0].thang, today.slice(0, 7));
  assert.match(api({ may: binh4, fn: 'loiNhuan', args: [today, today] }).error, /quản trị/);
  assert.throws(() => G.loiNhuan(t, today, '2000-01-01'), /không hợp lệ/);
  assert.strictEqual(goi(binh4, 'tongQuanMay').lai, null);
  assert.strictEqual(goiMoi(adQ, 'tongQuanMay').lai.lai, ln.tong.lai);

  // Phiếu chi: nhân viên thêm được, trả nhà cung cấp phải có tên; sửa / xóa chỉ quản trị
  assert.throws(() => goi(binh4, 'luuPhieuChi', { Loai: 'Trả nhà cung cấp', SoTien: 5000000 }), /nhà cung cấp/);
  assert.throws(() => goi(binh4, 'luuPhieuChi', { Loai: 'Mặt bằng', SoTien: 0 }), /số tiền/);
  const pc = goi(binh4, 'luuPhieuChi', { Ngay: today, Loai: 'Trả nhà cung cấp', DoiTac: 'NCC Minh Phát', SoTien: 30000000, HinhThuc: 'Chuyển khoản' });
  assert.strictEqual(pc.SoPC, '001-' + today.slice(0, 4) + '/PC');
  assert.throws(() => goi(binh4, 'luuPhieuChi', Object.assign({}, pc, { SoTien: 1 })), /quản trị/);
  const ship = goi(binh4, 'luuPhieuChi', { Loai: 'Vận chuyển', SoTien: 50000, GhiChu: 'Ship giao máy' });
  assert.deepStrictEqual([ship.Ngay, ship.HinhThuc], [today, 'Tiền mặt']);

  // Sổ quỹ: từ ngày bắt đầu, tiền mặt và ngân hàng tách riêng
  assert.throws(() => G.luuSoDuDau(G.dangNhap('binh', 'binh-456').token, { ngay: today }), /quản trị/);
  G.luuSoDuDau(t, { ngay: today, tienMat: 1000000, nganHang: 2000000 });
  const thuNay = G.readTable_('ThuTien').filter(p => String(p.Ngay).slice(0, 10) === today);
  const thuTM = thuNay.filter(p => p.HinhThuc === 'Tiền mặt').reduce((s, p) => s + p.SoTien, 0), thuNH = thuNay.reduce((s, p) => s + p.SoTien, 0) - thuTM;
  let sq = goi(binh4, 'soQuyMay', '');
  assert.deepStrictEqual(sq.ton, { tienMat: 1000000 + thuTM - 50000, nganHang: 2000000 + thuNH - 30000000 });
  assert.deepStrictEqual(sq.trongNgay, { thu: thuTM + thuNH, chi: 30050000 });
  assert.ok(sq.ds.some(x => x.loai === 'chi' && x.so === pc.SoPC) && sq.ds.some(x => x.loai === 'thu'));
  assert.deepStrictEqual([sq.ngay, sq.sau, sq.batDau], [today, '', today]);
  const homQua = goi(binh4, 'soQuyMay', sq.truoc);
  assert.deepStrictEqual([homQua.ton, homQua.ds.length], [{ tienMat: 1000000, nganHang: 2000000 }, 0]); // trước ngày bắt đầu: chỉ số dư đầu
  G.xoaPhieuChi(t, ship.SoPC);
  sq = goi(binh4, 'soQuyMay', ''); // máy chủ nhớ kết quả nhưng vừa có ghi nên tính lại
  assert.strictEqual(sq.ton.tienMat, 1000000 + thuTM);
  assert.throws(() => G.xoaPhieuChi(G.dangNhap('binh', 'binh-456').token, pc.SoPC), /quản trị/);
  // Web nhận phiếu chi, số dư đầu, loại chi; giá vốn chỉ quản trị thấy
  const dAd = G.taiDuLieu(t), dNv = G.taiDuLieu(G.dangNhap('binh', 'binh-456').token);
  assert.deepStrictEqual([dAd.phieuChi.length, dAd.soDuDau.tienMat, dAd.loaiChi[0], dAd.giaVon.HH0002], [1, 1000000, 'Trả nhà cung cấp', 10500000]);
  assert.deepStrictEqual(plain(dNv.giaVon), {});
  assert.strictEqual(dAd.phieuKho.find(p => p.DoiTac === 'NCC Minh Phát').GiaTri, 20000000); // giá trị nhập: để tính nợ nhà cung cấp
}

// Đơn lên đời: máy cũ là dòng −1 của đơn (giá thu), vào kho ngay; tổng đơn = tiền khách trả thật; máy cũ giữ 7 ngày; trả hàng trong 7 ngày thì trả lại đúng máy cũ
const ngayLui = n => new Date(Date.parse(today + 'T12:00:00Z') - n * 864e5).toISOString().slice(0, 10);
const doiNgay = (bang, so, ngay) => { const sh = sheets['PS_' + bang], c = sh.rows[0].indexOf('Ngay'); sh.rows.find(x => x[0] === so)[c] = ngay; };
{
  const t = G.dangNhap('admin', adminPass).token;
  const iphone15 = { MaHH: 'HH0002', SoLuong: 1, DonGia: 12000000, IMEI: 'SQ0002' };
  const kh = goi(binh4, 'luuKhach', { TenKH: 'Anh Đổi Máy', SDT: '0966000222' });
  const cu1 = { TenHang: 'iPhone 12 64GB', IMEI: '359999000000017', GiaThu: 5000000, GiaLe: 6500000, GhiChu: 'trầy nhẹ' };
  assert.throws(() => goi(binh4, 'banNhanh', { MaKH: kh.MaKH, lines: [iphone15], thuCu: [cu1], thu: { SoTien: 8000000, HinhThuc: 'Tiền mặt' } }), /từ 0 đến 7000000 đ \(đã trừ máy cũ 5000000/);
  assert.throws(() => goi(binh4, 'banNhanh', { MaKH: kh.MaKH, lines: [iphone15], thuCu: [Object.assign({}, cu1, { GiaThu: 0 })] }), /giá thu/);
  assert.throws(() => goi(binh4, 'banNhanh', { MaKH: kh.MaKH, lines: [iphone15], thuCu: [Object.assign({}, cu1, { IMEI: '' })] }), /IMEI/);
  assert.throws(() => goi(binh4, 'banNhanh', { MaKH: kh.MaKH, lines: [iphone15], thuCu: [Object.assign({}, cu1, { GiaThu: 13000000 })] }), /lớn hơn tiền hàng/);
  assert.throws(() => goi(binh4, 'banNhanh', { MaKH: kh.MaKH, lines: [Object.assign({}, iphone15, { IMEI: '' })], thuCu: [cu1] }), /là máy, ghi IMEI/);
  const tmTruoc = goi(binh4, 'soQuyMay', '').ton.tienMat, nk0 = sheets.PS_PhieuKho.rows.length;
  const r = goi(binh4, 'banNhanh', { MaKH: kh.MaKH, lines: [iphone15], thuCu: [cu1], thu: { SoTien: 7000000, HinhThuc: 'Tiền mặt' } });
  assert.deepStrictEqual([r.TongCong, r.daThu, r.thuCu.length, r.loiThu, sheets.PS_PhieuKho.rows.length], [7000000, 7000000, 1, '', nk0 + 2]);
  const ct = G.readTable_('DonHangCT').filter(l => l.SoDH === r.SoDH);
  assert.deepStrictEqual(ct.map(l => [l.SoLuong, l.DonGia, l.ThanhTien]), [[1, 12000000, 12000000], [-1, 5000000, -5000000]]);
  assert.match(ct[1].TenHang, /^iPhone 12 64GB \(máy cũ\) · IMEI 359999000000017$/);
  const hCu = G.readTable_('HangHoa').find(h => h.MaHH === r.thuCu[0].MaHH);
  assert.deepStrictEqual([hCu.TenHang, hCu.NhomHang, hCu.GiaLe, hCu.DVT], ['iPhone 12 64GB (máy cũ)', 'Máy cũ', 6500000, 'Máy']);
  assert.match(G.findObj_('PhieuKho', r.thuCu[0].SoPK).GhiChu, /^Thu cũ đổi mới · đơn .* · trầy nhẹ$/);
  assert.strictEqual(goi(binh4, 'traMaKho', '359999000000017').trangThai, 'trongKho');
  assert.strictEqual(G.giaVonBQ_()[hCu.MaHH], 5000000);
  assert.deepStrictEqual([goi(binh4, 'chiTietKhach', kh.MaKH).no, G.findObj_('DonHang', r.SoDH).TrangThai], [0, 'Đã giao']);
  assert.ok(!G.readTable_('ThuTien').some(p => p.SoDH === r.SoDH && p.HinhThuc === 'Thu máy cũ')); // không còn phiếu thu "Thu máy cũ"
  assert.strictEqual(goi(binh4, 'soQuyMay', '').ton.tienMat, tmTruoc + 7000000);
  assert.throws(() => goi(binh4, 'banNhanh', { MaKH: kh.MaKH, lines: [Object.assign({}, iphone15, { IMEI: 'SQ0003' })], thuCu: [cu1] }), /đã nhập ở phiếu/); // máy đang trong kho
  // Máy cũ đang giữ 7 ngày: không bán được, kể cả qua phiếu xuất; web không thêm / sửa / xóa dòng máy cũ, không hủy, không xóa đơn
  assert.throws(() => goi(binh4, 'banNhanh', { MaKH: kh.MaKH, lines: [{ MaHH: hCu.MaHH, SoLuong: 1, DonGia: 6500000, IMEI: '359999000000017' }] }), /đang giữ cho khách đổi trả đến hết ngày/);
  assert.throws(() => G.luuChungTu(t, 'XK', { Ngay: today, DoiTac: 'Khách', lines: [{ MaHH: hCu.MaHH, TenHang: hCu.TenHang, SoLuong: 1, IMEI: '359999000000017' }] }), /đang giữ cho khách/);
  const don = G.findObj_('DonHang', r.SoDH), dong = ct.map(l => { const x = plain(l); delete x.SoDH; return x; });
  assert.throws(() => G.luuChungTu(t, 'DH', Object.assign(plain(don), { lines: dong.slice(0, 1) })), /chỉ thêm bằng nút "Thu máy cũ"/);
  assert.throws(() => G.luuChungTu(t, 'DH', Object.assign(plain(don), { lines: [dong[0], Object.assign({}, dong[1], { DonGia: 1000 })] })), /chỉ thêm bằng nút/);
  assert.throws(() => G.luuChungTu(t, 'DH', Object.assign(plain(don), { lines: dong.concat([{ MaHH: hCu.MaHH, TenHang: 'x', SoLuong: -1, DonGia: 1 }]) })), /chỉ thêm bằng nút/);
  assert.throws(() => G.luuChungTu(t, 'DH', Object.assign(plain(don), { TrangThai: 'Hủy', lines: dong })), /không hủy được/);
  assert.strictEqual(G.luuChungTu(t, 'DH', Object.assign(plain(don), { GhiChu: 'Khách hẹn lấy hộp sau', lines: dong })).doc.TongCong, 7000000); // sửa ghi chú vẫn được
  assert.throws(() => G.luuChungTu(t, 'BG', { Ngay: today, MaKH: kh.MaKH, TenKH: kh.TenKH, lines: [{ TenHang: 'x', SoLuong: -1, DonGia: 1 }] }), /lớn hơn 0/);
  assert.throws(() => G.xoaChungTu(t, 'DH', r.SoDH), /không xóa được|Xóa các phiếu/);
  // Hợp đồng lập từ đơn lên đời: dòng máy cũ (−1, có mã hàng) trừ vào hợp đồng; số âm không có mã hàng thì không được
  const hdLD = G.luuHopDong(t, { LoaiHD: 'Hợp đồng mua bán', TenDN: kh.TenKH, MaKH: kh.MaKH, SoDH: r.SoDH, VAT: 0, lines: dong.map(l => ({ MaHH: l.MaHH, TenHang: l.TenHang, DVT: l.DVT, SoLuong: l.SoLuong, DonGia: l.DonGia })) }).doc;
  assert.strictEqual(hdLD.TongCong, 7000000);
  assert.throws(() => G.luuHopDong(t, { LoaiHD: 'Hợp đồng mua bán', TenDN: kh.TenKH, lines: [{ TenHang: 'x', SoLuong: -1, DonGia: 1 }] }), /số âm chỉ dùng cho máy cũ/);
  G.xoaHopDong(t, hdLD.SoHD);
  // Web: thu máy cũ cho đơn đã lập: thêm dòng −1, cùng tên máy dùng lại mặt hàng; không quá số còn nợ
  const dh = G.luuChungTu(t, 'DH', { Ngay: today, MaKH: kh.MaKH, TenKH: kh.TenKH, VAT: 0, lines: [{ MaHH: 'HH0002', TenHang: 'iPhone 15 128GB - Đen', SoLuong: 1, DonGia: 12000000 }] }).doc;
  assert.throws(() => G.thuMayCu(t, { SoDH: dh.SoDH, TenHang: 'iPhone 12 64GB', IMEI: '359999000000025', GiaThu: 13000000 }), /còn nợ của đơn/);
  const m2 = G.thuMayCu(t, { SoDH: dh.SoDH, TenHang: 'iPhone 12 64GB', IMEI: '359999000000025', GiaThu: 4000000 });
  assert.strictEqual(m2.MaHH, hCu.MaHH);
  assert.deepStrictEqual([G.findObj_('DonHang', dh.SoDH).TongCong, G.findObj_('DonHang', dh.SoDH).TrangThai], [8000000, 'Chờ giao']);
  assert.strictEqual(goi(binh4, 'chiTietKhach', kh.MaKH).no, 8000000);
  assert.strictEqual(G.giaVonBQ_()[hCu.MaHH], 4500000);
  // Ghi đơn lỗi: bỏ phiếu nhập máy cũ vừa lập, thử lại được, không tạo trùng mặt hàng
  const pk0 = sheets.PS_PhieuKho.rows.length, goc = G.luuChungTu, may3 = { SoDH: dh.SoDH, TenHang: 'iPhone 11 64GB', IMEI: '356000555444333', GiaThu: 2000000 };
  G.luuChungTu = function (tk, loai) { if (loai === 'DH') throw new Error('giả lập lỗi ghi đơn'); return goc.apply(this, arguments); };
  try { assert.throws(() => G.thuMayCu(t, may3), /giả lập lỗi/); } finally { G.luuChungTu = goc; }
  assert.deepStrictEqual([sheets.PS_PhieuKho.rows.length, goi(binh4, 'traMaKho', '356000555444333').trangThai], [pk0, 'chuaCo']);
  assert.ok(G.thuMayCu(t, may3).SoPK);
  assert.strictEqual(G.readTable_('HangHoa').filter(h => h.TenHang === 'iPhone 11 64GB (máy cũ)').length, 1);

  // Trả ốp lưng của đơn lên đời: máy cũ không trả lại. Trả máy mới trong 7 ngày: trả lại đúng máy cũ, hoàn tối đa tiền khách đã trả
  const op = G.luuHang(t, { TenHang: 'Ốp thử lên đời', DVT: 'Cái', GiaLe: 200000 });
  G.luuChungTu(t, 'NK', { Ngay: today, DoiTac: 'NCC', lines: [{ MaHH: op.MaHH, TenHang: op.TenHang, SoLuong: 5 }] });
  const kh2 = goi(binh4, 'luuKhach', { TenKH: 'Anh Nam Lên Đời', SDT: '0966000999' });
  const cu2 = { TenHang: 'iPhone 11 128GB', IMEI: '359999000000033', GiaThu: 5000000 };
  const b = goi(binh4, 'banNhanh', { MaKH: kh2.MaKH, lines: [{ MaHH: 'HH0002', SoLuong: 1, DonGia: 25000000, IMEI: 'SQ0003' }, { MaHH: op.MaHH, SoLuong: 1, DonGia: 200000 }], thuCu: [cu2], thu: { SoTien: 20200000, HinhThuc: 'Tiền mặt' } });
  assert.strictEqual(b.TongCong, 20200000);
  // Chọn máy thay vì gõ: máy trong kho (máy cũ vừa thu còn bị giữ 7 ngày), máy đã giao của đơn (màn trả hàng)
  const ton1 = goi(binh4, 'dsMaTon', {}), giao1 = goi(binh4, 'dsMaTon', { SoDH: b.SoDH });
  assert.ok(!ton1.some(m => m.IMEI === 'SQ0003') && ton1.every(m => m.IMEI && m.MaHH && m.SoPK));
  assert.deepStrictEqual(plain(ton1.find(m => m.IMEI === '359999000000033')), { IMEI: '359999000000033', MaHH: G.readTable_('HangHoa').find(h => h.TenHang === 'iPhone 11 128GB (máy cũ)').MaHH, TenHang: 'iPhone 11 128GB (máy cũ)', SoPK: b.thuCu[0].SoPK, Ngay: today, giuDen: ngayLui(-7) });
  assert.deepStrictEqual(plain(giao1).map(m => [m.IMEI, m.MaHH, m.giuDen]), [['SQ0003', 'HH0002', '']]);
  let xem = goi(binh4, 'traHang', { SoDH: b.SoDH, lines: [{ MaHH: op.MaHH, SoLuong: 1 }], xemTruoc: true });
  assert.deepStrictEqual([xem.tongMoi, xem.hoanToiDa, xem.mayCuTra.length, xem.hanTra], [20000000, 200000, 0, ngayLui(-7)]);
  xem = goi(binh4, 'traHang', { SoDH: b.SoDH, lines: [{ MaHH: 'HH0002', IMEI: 'SQ0003' }], xemTruoc: true });
  assert.deepStrictEqual([xem.tongMoi, xem.hoanToiDa, plain(xem.mayCuTra)], [200000, 20000000, [{ TenHang: 'iPhone 11 128GB (máy cũ)', IMEI: '359999000000033', GiaThu: 5000000 }]]);
  assert.throws(() => goi(binh4, 'traHang', { SoDH: b.SoDH, lines: [{ MaHH: 'HH0002', IMEI: 'SQ0003' }], hoan: { SoTien: 25000000 } }), /tối đa 20000000/);
  // Bước sửa đơn lỗi: gỡ phiếu nhập hàng trả và phiếu trả máy cũ, không có gì thay đổi
  const pk1 = sheets.PS_PhieuKho.rows.length;
  let lan = 0;
  G.luuChungTu = function (tk, loai) { if (loai === 'DH' && !lan++) throw new Error('giả lập lỗi sửa đơn'); return goc.apply(this, arguments); };
  try { assert.throws(() => goi(binh4, 'traHang', { SoDH: b.SoDH, lines: [{ MaHH: 'HH0002', IMEI: 'SQ0003' }], hoan: { SoTien: 20000000 } }), /Chưa ghi gì.*giả lập lỗi sửa đơn/); } finally { G.luuChungTu = goc; }
  assert.deepStrictEqual([sheets.PS_PhieuKho.rows.length, goi(binh4, 'traMaKho', 'SQ0003').trangThai, goi(binh4, 'traMaKho', '359999000000033').trangThai], [pk1, 'daBan', 'trongKho']);
  const tmTruoc2 = goi(binh4, 'soQuyMay', '').ton.tienMat, tq0 = goi(binh4, 'tongQuanMay');
  const tr = goi(binh4, 'traHang', { SoDH: b.SoDH, lines: [{ MaHH: 'HH0002', IMEI: 'SQ0003' }], hoan: { SoTien: 20000000, HinhThuc: 'Tiền mặt' } });
  assert.deepStrictEqual([tr.TongCong, tr.huy, !!tr.SoPK, !!tr.SoPKCu, tr.mayCuTra.length], [200000, false, true, true, 1]);
  assert.deepStrictEqual([goi(binh4, 'traMaKho', 'SQ0003').trangThai, goi(binh4, 'traMaKho', '359999000000033').trangThai], ['trongKho', 'daBan']);
  assert.ok(!goi(binh4, 'traBaoHanh', '359999000000033').ds.length); // máy cũ trả lại khách: không phải bán, không có bảo hành
  assert.deepStrictEqual([goi(binh4, 'chiTietKhach', kh2.MaKH).no, goi(binh4, 'soQuyMay', '').ton.tienMat], [0, tmTruoc2 - 20000000]);
  assert.ok(!G.readTable_('DonHangCT').some(l => l.SoDH === b.SoDH && l.SoLuong < 0));
  // "Đã thu" chỉ là tiền thật khách đưa: tiền trả lại khách và máy cũ thu về hiện riêng, không trừ / cộng vào
  const tq1 = goi(binh4, 'tongQuanMay'), ct1 = goi(binh4, 'chiTietTongQuan', 'ngay');
  assert.ok(tq0.mayCu >= 5000000 + 5000000); // hai đơn lên đời hôm nay (máy cũ 5tr mỗi đơn)
  assert.deepStrictEqual([tq1.thu, tq1.traLai, tq1.mayCu], [tq0.thu, tq0.traLai + 20000000, tq0.mayCu]);
  assert.deepStrictEqual([ct1.tong.thu, ct1.tong.traLai, ct1.tong.mayCu], [tq1.thu, tq1.traLai, tq1.mayCu]);
  assert.match(G.dungEmailSang_('X', plain(G.tongHopSang_(ngayLui(-1))), false).text, /đã thu [\d.]+ đ \(máy cũ thu về [\d.]+ đ · trả lại khách [\d.]+ đ\)\./);
  // Quá 7 ngày: không nhận trả; máy cũ hết thời gian giữ thì bán được
  const c = goi(binh4, 'banNhanh', { MaKH: kh2.MaKH, lines: [{ MaHH: 'HH0002', SoLuong: 1, DonGia: 25000000, IMEI: 'SQ0004' }], thuCu: [{ TenHang: 'iPhone X', IMEI: '359999000000041', GiaThu: 3000000 }], thu: { SoTien: 22000000 } });
  doiNgay('DonHang', c.SoDH, ngayLui(8));
  assert.throws(() => goi(binh4, 'traHang', { SoDH: c.SoDH, lines: [{ MaHH: 'HH0002', IMEI: 'SQ0004' }], xemTruoc: true }), /chỉ nhận trả trong 7 ngày .* đã quá hạn/);
  doiNgay('DonHang', c.SoDH, ngayLui(7));
  assert.ok(goi(binh4, 'traHang', { SoDH: c.SoDH, lines: [{ MaHH: 'HH0002', IMEI: 'SQ0004' }], xemTruoc: true }).hanTra === today); // ngày thứ 7 vẫn trả được
  doiNgay('PhieuKho', c.thuCu[0].SoPK, ngayLui(8));
  const hX = c.thuCu[0].MaHH;
  // Làm lại máy cũ (thay pin 200k): phiếu chi ghi IMEI máy trong kho, tiền chi cộng vào giá vốn
  assert.throws(() => goi(binh4, 'luuPhieuChi', { Loai: 'Làm lại máy cũ', SoTien: 200000 }), /IMEI/);
  assert.throws(() => goi(binh4, 'luuPhieuChi', { Loai: 'Làm lại máy cũ', SoTien: 200000, IMEI: '359999000000033' }), /không có trong kho/); // đã trả lại khách
  const pin = goi(binh4, 'luuPhieuChi', { Loai: 'Làm lại máy cũ', SoTien: 200000, IMEI: '35-9999-000000041', GhiChu: 'Thay pin' });
  assert.deepStrictEqual([pin.MaHH, pin.IMEI, pin.DoiTac, G.giaVonBQ_()[hX]], [hX, '359999000000041', 'iPhone X (máy cũ)', 3200000]);
  const lnTruoc = G.loiNhuan(t, today, today);
  const ban = goi(binh4, 'banNhanh', { MaKH: kh.MaKH, lines: [{ MaHH: hX, SoLuong: 1, DonGia: 3500000, IMEI: '359999000000041' }] });
  assert.strictEqual(G.luuPhieuChi(t, Object.assign({}, pin, { SoTien: 250000 })).MaHH, hX); // máy đã bán vẫn sửa được phiếu chi
  G.luuPhieuChi(t, Object.assign({}, pin, { SoTien: 200000 }));
  // Lãi: dòng máy cũ −1 lãi 0 (đơn 12tr − 5tr: doanh thu 7tr, giá vốn 10,5tr − 5tr); bán lại máy cũ 3,5tr, vốn 3tr + 200k → lãi máy cũ 300k
  const ln = G.loiNhuan(t, today, today), dR = ln.theoDon.find(x => x.SoDH === r.SoDH), dBan = ln.theoDon.find(x => x.SoDH === ban.SoDH);
  assert.deepStrictEqual([dR.doanhThu, dR.giaVon, dR.lai, dBan.lai], [7000000, 5500000, 1500000, 300000]);
  assert.deepStrictEqual([ln.tong.laiMayCu - lnTruoc.tong.laiMayCu, ln.tong.laiMayMoi + ln.tong.laiMayCu, ln.tong.laiMayMoi - lnTruoc.tong.laiMayMoi], [300000, ln.tong.lai, 0]);
  assert.ok(ln.theoHang.some(x => x.TenHang === 'Máy cũ thu vào (trừ vào đơn)' && x.lai === 0 && x.soLuong >= 3));
  assert.throws(() => goi(binh4, 'traHang', { SoDH: c.SoDH, lines: [{ MaHH: 'HH0002', IMEI: 'SQ0004' }], xemTruoc: true }), /Máy cũ 359999000000041 không còn trong kho \(đã xuất ở phiếu/);
}

// Bảo hành – sửa chữa: nhận máy, đổi trạng thái, việc cần làm, trả máy có tính phí (lập đơn dịch vụ), ảnh
{
  assert.throws(() => goi(binh4, 'luuSuaChua', { khachMoi: { TenKH: 'Chị Hoa Sửa', SDT: '0977000111' }, TenMay: 'iPhone 14' }), /tình trạng/);
  assert.throws(() => goi(binh4, 'luuSuaChua', { TenMay: 'iPhone 14', TinhTrang: 'Hỏng' }), /Chọn khách/);
  const p = goi(binh4, 'luuSuaChua', { Loai: 'Sửa chữa', khachMoi: { TenKH: 'Chị Hoa Sửa', SDT: '0977000111' }, TenMay: 'iPhone 14', IMEI: '35 1111 2222 3333 4', TinhTrang: 'Không lên nguồn', PhuKien: 'Ốp lưng', MatKhauMay: '1234' });
  assert.deepStrictEqual([p.SoPN, p.TrangThai, p.IMEI, p.NgayNhan, p.conNgay, p.SDT], ['001-' + today.slice(0, 4) + '/PN', 'Đã nhận', '351111222233334', today, 3, '0977000111']);
  assert.strictEqual(goi(binh4, 'luuSuaChua', { Loai: 'Bảo hành', khachMoi: { TenKH: 'Trùng số', SDT: '0977 000 111' }, TenMay: 'AirPods', TinhTrang: 'Rè' }).MaKH, p.MaKH); // trùng SĐT: dùng khách cũ
  assert.throws(() => goi(binh4, 'luuSuaChua', { SoPN: p.SoPN, TrangThai: 'Đã trả khách' }), /Trả máy/);
  assert.throws(() => goi(binh4, 'luuSuaChua', { SoPN: p.SoPN, TrangThai: 'Mất máy' }), /không hợp lệ/);
  const sua = goi(binh4, 'luuSuaChua', { SoPN: p.SoPN, TrangThai: 'Đã sửa xong', KetQua: 'Thay IC nguồn', ChiPhi: 300000 });
  assert.deepStrictEqual([sua.TrangThai, sua.ChiPhi, sua.TenMay, sua.MatKhauMay, sua.NgayNhan], ['Đã sửa xong', 300000, 'iPhone 14', '1234', today]);
  assert.ok(goiMoi(binh4, 'tongQuanMay').suaChua.some(x => x.SoPN === p.SoPN)); // xong chờ khách lấy: vào việc cần làm
  assert.deepStrictEqual(goi(binh4, 'dsSuaChua', 'iphone 14', {}).ds.map(x => x.SoPN), [p.SoPN]);
  assert.strictEqual(goi(binh4, 'dsSuaChua', '3333', { loc: 'xong' }).tong, 1);
  // Ảnh lưu vào Google Drive
  const anh = goi(binh4, 'luuAnhSuaChua', p.SoPN, Buffer.from('anh-thu').toString('base64'));
  assert.strictEqual(anh.Anh.length, 1);
  // Trả máy: lập đơn dịch vụ 300.000, khách trả ngay → không còn nợ
  const no0 = goi(binh4, 'chiTietKhach', p.MaKH).no;
  // Máy khác đang trả phiếu này (bấm hai lần, mạng chậm): lần sau bị từ chối, không lập thêm đơn
  const soDon0 = sheets.PS_DonHang.rows.length;
  cache.set('traSua_phone_' + p.SoPN, '1');
  assert.throws(() => goi(binh4, 'traMaySua', p.SoPN, { thu: { SoTien: 300000, HinhThuc: 'Tiền mặt' } }), /đang được trả ở máy khác/);
  assert.strictEqual(sheets.PS_DonHang.rows.length, soDon0);
  cache.delete('traSua_phone_' + p.SoPN);
  const tra = goi(binh4, 'traMaySua', p.SoPN, { thu: { SoTien: 300000, HinhThuc: 'Tiền mặt' } });
  assert.ok(![...cache.keys()].some(k => k.startsWith('traSua_')), 'Trả xong phải bỏ giữ phiếu');
  assert.deepStrictEqual([tra.TrangThai, tra.ChiPhi, !!tra.SoDH, tra.don.TongCong, tra.don.daThu], ['Đã trả khách', 300000, true, 300000, 300000]);
  assert.strictEqual(G.findObj_('DonHang', tra.SoDH).TrangThai, 'Đã giao');
  assert.strictEqual(goi(binh4, 'chiTietKhach', p.MaKH).no, no0);
  assert.throws(() => goi(binh4, 'traMaySua', p.SoPN, {}), /đã trả khách/);
  assert.throws(() => goi(binh4, 'luuSuaChua', { SoPN: p.SoPN, KetQua: 'sửa lại' }), /chỉ quản trị/);
  assert.strictEqual(goi(binh4, 'dsSuaChua', '', { loc: 'tra' }).ds[0].SoPN, p.SoPN);
  assert.ok(!goi(binh4, 'dsSuaChua', '', {}).ds.some(x => x.SoPN === p.SoPN));
  assert.ok(!goiMoi(binh4, 'tongQuanMay').suaChua.some(x => x.SoPN === p.SoPN));
  // Bảo hành miễn phí: trả máy không lập đơn
  const bh = goi(binh4, 'dsSuaChua', 'airpods', {}).ds[0];
  const traBH = goi(binh4, 'traMaySua', bh.SoPN, { ChiPhi: 0, KetQua: 'Đổi mới' });
  assert.deepStrictEqual([traBH.SoDH, traBH.don, traBH.KetQua], ['', null, 'Đổi mới']);
  assert.strictEqual(G.taiDuLieu(G.dangNhap('admin', adminPass).token).suaChua.length, 2);
}

// Giảm giá cả đơn: trừ trước VAT, không quá tiền hàng; lợi nhuận trừ theo
{
  const t = G.dangNhap('admin', adminPass).token, kh = goi(binh4, 'luuKhach', { TenKH: 'Khách Giảm Giá' });
  const dong = { MaHH: 'HH0002', TenHang: 'iPhone 15 128GB - Đen', SoLuong: 2, DonGia: 12000000 };
  const dh = G.luuChungTu(t, 'DH', { Ngay: today, MaKH: kh.MaKH, TenKH: kh.TenKH, VAT: 10, GiamGia: 1000000, lines: [dong] }).doc;
  assert.deepStrictEqual([dh.GiamGia, dh.TienHang, dh.TienVAT, dh.TongCong], [1000000, 23000000, 2300000, 25300000]);
  assert.strictEqual(G.luuChungTu(t, 'BG', { Ngay: today, TenKH: 'A', GiamGia: 99e9, lines: [dong] }).doc.TongCong, 0); // không âm
  assert.strictEqual(G.luuChungTu(t, 'BG', { Ngay: today, TenKH: 'A', GiamGia: -5, lines: [dong] }).doc.GiamGia, '');
  const lnDon = goi(may('admin', adminPass, 'Máy giảm giá'), 'loiNhuan', today, today).theoDon.find(d => d.SoDH === dh.SoDH);
  assert.strictEqual(lnDon.doanhThu, 23000000);
  const b = goi(binh4, 'banNhanh', { MaKH: kh.MaKH, lines: [{ TenHang: 'Dán màn hình', SoLuong: 1, DonGia: 200000 }], GiamGia: 50000, thu: { SoTien: 150000, HinhThuc: 'Tiền mặt' } });
  assert.deepStrictEqual([b.TongCong, b.daThu], [150000, 150000]);
  assert.strictEqual(G.findObj_('DonHang', b.SoDH).GiamGia, 50000);
}

// Kiểm kho theo IMEI: khớp, thiếu (trong kho chưa quét), lạ (đã bán / chưa nhập)
{
  const kho = G.imeiTrongKho_().kho, trong = Object.keys(kho);
  assert.ok(trong.includes('359999000000017') && trong.includes('359999000000025'));
  const kq = goi(binh4, 'kiemKho', ['359999000000017', ' 3599-9900-0000-017 ', '356789012345671', '999999999999'], { luu: true });
  assert.deepStrictEqual([kq.soQuet, kq.khop], [3, 1]); // mã trùng chỉ tính một lần
  assert.deepStrictEqual(kq.la.map(x => [x.IMEI, /Đã xuất/.test(x.lyDo) ? 'ban' : x.lyDo]), [['356789012345671', 'ban'], ['999999999999', 'Chưa nhập kho']]);
  assert.strictEqual(kq.thieu.length, trong.length - 1);
  // mã lạ dài hơn một ký tự so với máy đã bán (không phải serial Apple có chữ S) thì là chưa nhập, không được nhận nhầm là máy kia
  assert.deepStrictEqual(goi(binh4, 'kiemKho', ['9356789012345671']).la.map(x => x.lyDo), ['Chưa nhập kho']);
  assert.ok(kq.theoHang.some(h => h.thay === 1 && h.trongKho >= 1));
  const motHang = goi(binh4, 'kiemKho', ['359999000000017'], { MaHH: 'HH0001' });
  assert.deepStrictEqual([motHang.khop, motHang.la[0].lyDo], [0, 'Khác mặt hàng đang kiểm']);
  assert.ok(motHang.thieu.every(x => x.MaHH === 'HH0001'));
  assert.ok(sheets.PS_NhatKy.rows.some(r => r[2] === 'Kiểm kho theo IMEI'));
}

// Phiếu thu không ghi hình thức: tính là tiền mặt (sổ quỹ không đẩy sang ngân hàng); máy cũ bán hết không thành hàng sắp hết
{
  const t = G.dangNhap('admin', adminPass).token, kh = goi(binh4, 'luuKhach', { TenKH: 'Khách Không Hình Thức', SDT: '0966000666' });
  assert.strictEqual(G.luuThuTien(t, { Ngay: today, MaKH: kh.MaKH, SoTien: 5000 }).HinhThuc, 'Tiền mặt');
  const cu = G.luuHang(t, { TenHang: 'iPhone 7 32GB (máy cũ) thử', NhomHang: 'Máy cũ', GiaLe: 1000000 }), moi = G.luuHang(t, { TenHang: 'Cáp thử hết hàng', GiaLe: 50000 });
  G.luuChungTu(t, 'NK', { Ngay: today, DoiTac: 'NCC', lines: [{ MaHH: cu.MaHH, TenHang: cu.TenHang, SoLuong: 1 }, { MaHH: moi.MaHH, TenHang: moi.TenHang, SoLuong: 1 }] });
  G.luuChungTu(t, 'XK', { Ngay: today, DoiTac: 'Khách', lines: [{ MaHH: cu.MaHH, TenHang: cu.TenHang, SoLuong: 1 }, { MaHH: moi.MaHH, TenHang: moi.TenHang, SoLuong: 1 }] });
  const sap = G.tongHopSang_(today).hang.map(h => h.MaHH);
  assert.ok(sap.includes(moi.MaHH) && !sap.includes(cu.MaHH), JSON.stringify(sap));
}

// Bán nhanh cho khách mới mà xuất kho lỗi: bỏ cả đơn và khách vừa tạo
{
  const kh0 = sheets.PS_KhachHang.rows.length, dh0 = sheets.PS_DonHang.rows.length, goc = G.luuChungTu;
  G.luuChungTu = function (tk, loai, doc) { if (loai === 'XK') throw new Error('giả lập lỗi xuất kho'); return goc.apply(this, arguments); };
  try { assert.throws(() => goi(binh4, 'banNhanh', { khachMoi: { TenKH: 'Khách Lỗi Xuất Kho', SDT: '0966000888' }, lines: [{ TenHang: 'Dán màn hình', SoLuong: 1, DonGia: 100000 }] }), /giả lập lỗi xuất kho/); }
  finally { G.luuChungTu = goc; }
  assert.deepStrictEqual([sheets.PS_KhachHang.rows.length, sheets.PS_DonHang.rows.length], [kh0, dh0]);
}

// Lệnh ghi kèm mã lần gửi: gửi lại cùng mã (app báo lỗi mạng mà máy chủ đã ghi) nhận kết quả cũ, không ghi thêm phiếu
{
  const kh = goi(binh4, 'luuKhach', { TenKH: 'Khách Gửi Lại', SDT: '0966000555' }), so0 = sheets.PS_ThuTien.rows.length;
  const gui = ma => api({ may: binh4, fn: 'luuThuTien', args: [{ Ngay: today, MaKH: kh.MaKH, SoTien: 120000, HinhThuc: 'Tiền mặt' }], maGhi: ma });
  const a = gui('lan-gui-0001'), b = gui('lan-gui-0001');
  assert.ok(a.ok && b.ok && a.result.SoPT === b.result.SoPT, JSON.stringify([a, b]));
  assert.strictEqual(sheets.PS_ThuTien.rows.length, so0 + 1);
  assert.strictEqual(gui('lan-gui-0002').ok && sheets.PS_ThuTien.rows.length, so0 + 2); // mã mới: phiếu mới
  const khoa = 'ghi_' + G.bamMay_(binh4).slice(0, 20) + '_lan-gui-0003';
  cache.set(khoa, '…đang ghi');
  assert.match(gui('lan-gui-0003').error, /đang được máy chủ xử lý/);
  cache.delete(khoa);
  const loi = api({ may: binh4, fn: 'luuThuTien', args: [{ Ngay: today, MaKH: kh.MaKH, SoTien: 0 }], maGhi: 'lan-gui-0004' });
  assert.match(loi.error, /Nhập số tiền thu/);
  assert.ok(!cache.has('ghi_' + G.bamMay_(binh4).slice(0, 20) + '_lan-gui-0004'), 'Lỗi thật thì bỏ giữ để gửi lại được');
  assert.strictEqual(api({ may: binh4, fn: 'luuThuTien', args: [{ Ngay: today, MaKH: kh.MaKH, SoTien: 1000 }], maGhi: 'bad' }).ok, true); // mã sai dạng: bỏ qua, ghi bình thường
}

// Serial có dấu gạch / chấm (lưu nguyên như nhập): quét hay gõ không dấu vẫn tìm thấy ở tra kho, kiểm kho, tra bảo hành
{
  const t = G.dangNhap('admin', adminPass).token, kh = goi(binh4, 'luuKhach', { TenKH: 'Khách Serial Gạch', SDT: '0966000444' });
  G.luuChungTu(t, 'NK', { Ngay: today, DoiTac: 'NCC', lines: [{ MaHH: 'HH0001', TenHang: 'iPhone 16 Pro Max 256GB - Titan Đen', SoLuong: 1, IMEI: 'F2L-ABC.1234' }] });
  assert.deepStrictEqual([goi(binh4, 'traMaKho', 'f2l abc1234').trangThai, goi(binh4, 'traMaKho', 'F2LABC1234').ma], ['trongKho', 'F2L-ABC.1234']);
  assert.deepStrictEqual(goi(binh4, 'kiemKho', ['F2LABC1234'], { MaHH: 'HH0001' }).khop, 1);
  goi(binh4, 'banNhanh', { MaKH: kh.MaKH, lines: [{ MaHH: 'HH0001', SoLuong: 1, DonGia: 28000000, IMEI: 'F2L-ABC.1234' }], thu: { SoTien: 28000000, HinhThuc: 'Tiền mặt' } });
  assert.strictEqual(goi(binh4, 'traMaKho', 'F2LABC1234').trangThai, 'daBan');
  assert.strictEqual(goi(binh4, 'traBaoHanh', 'F2LABC1234').ds[0].IMEIKhop, 'F2L-ABC.1234');
  assert.match(goi(binh4, 'kiemKho', ['F2LABC1234']).la[0].lyDo, /Đã xuất ở phiếu/);
  // cùng máy viết khác dấu: không bán lần nữa, không nhập trùng trong một phiếu
  assert.throws(() => goi(binh4, 'banNhanh', { MaKH: kh.MaKH, lines: [{ MaHH: 'HH0001', SoLuong: 1, DonGia: 1, IMEI: 'f2l_abc/1234' }] }), /đã xuất ở phiếu/);
  assert.throws(() => G.luuChungTu(t, 'NK', { Ngay: today, DoiTac: 'NCC', lines: [{ MaHH: 'HH0001', TenHang: 'iPhone', SoLuong: 2, IMEI: 'AB-1234, AB1234' }] }), /bị lặp trong phiếu/);
  const vmc = c => require('vm').runInContext(c, G);
  assert.deepStrictEqual(JSON.parse(vmc(`JSON.stringify([sdtList_('0911000001 - 0912000002'), sdtList_('0911-000-001'), sdtVN_('+84 0911 000 001'), sdtVN_('84911000001')])`)),
    [['0911000001', '0912000002'], ['0911000001'], '0911000001', '0911000001']);
}

// Khách trả hàng: nhập lại kho, đơn giảm (trả hết thì hủy), trả lại tiền bằng phiếu thu âm, bảo hành không còn thuộc khách
{
  const t = G.dangNhap('admin', adminPass).token, kh = goi(binh4, 'luuKhach', { TenKH: 'Khách Trả Hàng', SDT: '0966000333' });
  G.luuChungTu(t, 'NK', { Ngay: today, DoiTac: 'NCC', lines: [{ MaHH: 'HH0001', TenHang: 'iPhone 16 Pro Max 256GB - Titan Đen', SoLuong: 2, IMEI: '357000000000011, 357000000000029', GiaVon: 25000000 }] });
  const b = goi(binh4, 'banNhanh', { MaKH: kh.MaKH, lines: [{ MaHH: 'HH0001', SoLuong: 1, DonGia: 28000000, IMEI: '357000000000011' }, { MaHH: 'HH0001', SoLuong: 1, DonGia: 28000000, IMEI: '357000000000029' }, { TenHang: 'Dán màn hình', SoLuong: 1, DonGia: 100000 }],
    thu: { SoTien: 56100000, HinhThuc: 'Tiền mặt' } });
  assert.throws(() => goi(binh4, 'traHang', { SoDH: b.SoDH, lines: [{ MaHH: 'HH0001', IMEI: '357000000000099' }] }), /không có trong các lần giao/);
  assert.throws(() => goi(binh4, 'traHang', { SoDH: b.SoDH, lines: [] }), /Chọn hàng/);
  // đang có máy khác nhận trả đơn này: từ chối; lỗi kiểm tra ở trên không để lại giữ đơn
  assert.ok(![...cache.keys()].some(k => k.startsWith('traHang_')));
  cache.set('traHang_phone_' + b.SoDH, '1');
  assert.throws(() => goi(binh4, 'traHang', { SoDH: b.SoDH, lines: [{ MaHH: 'HH0001', IMEI: '357000000000011' }] }), /đang được nhận trả ở máy khác/);
  cache.delete('traHang_phone_' + b.SoDH);
  const xem = goi(binh4, 'traHang', { SoDH: b.SoDH, lines: [{ MaHH: 'HH0001', IMEI: '357000000000011' }], xemTruoc: true });
  assert.deepStrictEqual([xem.tongCu, xem.tongMoi, xem.daThu, xem.hoanToiDa, xem.huy], [56100000, 28100000, 56100000, 28000000, false]);
  assert.throws(() => goi(binh4, 'traHang', { SoDH: b.SoDH, lines: [{ MaHH: 'HH0001', IMEI: '357000000000011' }], hoan: { SoTien: 30000000 } }), /tối đa 28000000/);
  const tmTruoc = goi(binh4, 'soQuyMay', '').ton.tienMat;
  const r = goi(binh4, 'traHang', { SoDH: b.SoDH, lines: [{ MaHH: 'HH0001', IMEI: '357000000000011' }], hoan: { SoTien: 28000000, HinhThuc: 'Tiền mặt' }, GhiChu: 'Đổi ý' });
  assert.deepStrictEqual([r.TongCong, r.huy, r.hoan, !!r.SoPK, !!r.SoPT], [28100000, false, 28000000, true, true]);
  assert.strictEqual(goi(binh4, 'traMaKho', '357000000000011').trangThai, 'trongKho');
  assert.strictEqual(goi(binh4, 'chiTietKhach', kh.MaKH).no, 0);
  const sq = goi(binh4, 'soQuyMay', '');
  assert.strictEqual(sq.ton.tienMat, tmTruoc - 28000000);
  assert.ok(sq.ds.some(x => x.loai === 'chi' && x.so === r.SoPT && x.SoTien === 28000000));
  // Mở phiếu trả lại tiền trên web rồi bấm Lưu (ô số tiền không có dấu trừ): vẫn là số âm; đổi số tiền thì không được
  const ptTra = G.findObj_('ThuTien', r.SoPT), at2 = G.dangNhap('admin', adminPass).token;
  assert.strictEqual(G.luuThuTien(at2, Object.assign({}, ptTra, { SoTien: 28000000, GhiChu: 'khách nhận tiền mặt' })).SoTien, -28000000);
  assert.strictEqual(G.findObj_('ThuTien', r.SoPT).SoTien, -28000000);
  assert.throws(() => G.luuThuTien(at2, Object.assign({}, ptTra, { SoTien: 1000 })), /phiếu trả lại tiền khách/);
  assert.strictEqual(G.giaVonBQ_().HH0001, 25000000); // nhập lại không ghi giá: giá vốn bình quân không đổi
  const bh = goi(binh4, 'traBaoHanh', '357000000000011');
  assert.ok(!bh.ds.some(x => x.MaKH === kh.MaKH)); // máy đã trả: không còn bảo hành cho khách này
  assert.strictEqual(goi(binh4, 'traBaoHanh', '357000000000029').ds[0].MaKH, kh.MaKH);
  assert.throws(() => goi(binh4, 'traHang', { SoDH: b.SoDH, lines: [{ MaHH: 'HH0001', IMEI: '357000000000011' }] }), /đã nhập ở phiếu|số lượng trả/);
  // Trả nốt: đơn hủy, khách không còn nợ, tiền trả lại tối đa đúng số đã thu
  const het = goi(binh4, 'traHang', { SoDH: b.SoDH, lines: [{ MaHH: 'HH0001', IMEI: '357000000000029' }, { TenHang: 'Dán màn hình', SoLuong: 1 }], hoan: { SoTien: 28100000, HinhThuc: 'Chuyển khoản' } });
  assert.deepStrictEqual([het.huy, het.TrangThai], [true, 'Hủy']);
  assert.strictEqual(goi(binh4, 'chiTietKhach', kh.MaKH).no, 0);
  assert.throws(() => goi(binh4, 'traHang', { SoDH: b.SoDH, lines: [{ MaHH: 'HH0001', SoLuong: 1 }] }), /Đơn đã hủy/);
}

// Khách trả hàng của đơn mới giao một phần: phần chưa giao chỉ bớt khỏi đơn (không nhập kho), máy đã giao kèm IMEI phải ghi IMEI
{
  const t = G.dangNhap('admin', adminPass).token, kh = goi(binh4, 'luuKhach', { TenKH: 'Khách Giao Dở', SDT: '0966000555' });
  const op = G.luuHang(t, { TenHang: 'Ốp lưng thử trả hàng', DVT: 'Cái', GiaLe: 150000 });
  G.luuChungTu(t, 'NK', { Ngay: today, DoiTac: 'NCC', lines: [{ MaHH: op.MaHH, TenHang: op.TenHang, SoLuong: 10 },
    { MaHH: 'HH0001', TenHang: 'iPhone 16 Pro Max 256GB - Titan Đen', SoLuong: 2, IMEI: '357000000000037, 357000000000045' }] });
  const d = G.luuChungTu(t, 'DH', { Ngay: today, MaKH: kh.MaKH, TenKH: kh.TenKH, lines: [{ MaHH: op.MaHH, TenHang: op.TenHang, SoLuong: 3, DonGia: 150000 },
    { MaHH: 'HH0001', TenHang: 'iPhone 16 Pro Max 256GB - Titan Đen', SoLuong: 2, DonGia: 28000000 }] }).doc;
  G.luuChungTu(t, 'XK', { Ngay: today, SoDH: d.SoDH, DoiTac: kh.TenKH, lines: [{ MaHH: op.MaHH, TenHang: op.TenHang, SoLuong: 1 },
    { MaHH: 'HH0001', TenHang: 'iPhone 16 Pro Max 256GB - Titan Đen', SoLuong: 1, IMEI: '357000000000037' }] });
  const ton = ma => { const x = G.tonKho_()[ma]; return x.nhap - x.xuat; };
  const tonOp = ton(op.MaHH), ton16 = ton('HH0001');
  // 2 ốp chưa giao: chỉ bớt khỏi đơn, kho không đổi
  let r = goi(binh4, 'traHang', { SoDH: d.SoDH, lines: [{ MaHH: op.MaHH, SoLuong: 2 }] });
  assert.deepStrictEqual([r.SoPK, ton(op.MaHH), r.TrangThai], ['', tonOp, 'Giao một phần']);
  // iPhone đã giao kèm IMEI: trả theo số lượng thì phải ghi IMEI (máy còn lại của dòng chưa giao nên trả 1 cái được, không nhập kho)
  r = goi(binh4, 'traHang', { SoDH: d.SoDH, lines: [{ MaHH: 'HH0001', SoLuong: 1 }] });
  assert.deepStrictEqual([r.SoPK, ton('HH0001')], ['', ton16]);
  assert.throws(() => goi(binh4, 'traHang', { SoDH: d.SoDH, lines: [{ MaHH: 'HH0001', SoLuong: 1 }] }), /ghi IMEI\/serial của máy khách trả/);
  assert.throws(() => goi(binh4, 'traHang', { SoDH: d.SoDH, lines: [{ MaHH: 'HH0001', IMEI: '357000000000045' }] }), /không có trong các lần giao/); // máy còn trong kho
  assert.throws(() => goi(binh4, 'traHang', { SoDH: d.SoDH, lines: [{ MaHH: op.MaHH, IMEI: '357000000000037' }] }), /là máy iPhone/);
  // Trả iPhone có IMEI: nhập lại kho (phiếu nhập ghi số đơn), đơn còn 1 ốp đã giao → "Đã giao"
  r = goi(binh4, 'traHang', { SoDH: d.SoDH, lines: [{ MaHH: 'HH0001', IMEI: '357000000000037' }] });
  assert.deepStrictEqual([!!r.SoPK, ton('HH0001'), r.TrangThai, G.findObj_('PhieuKho', r.SoPK).SoDH], [true, ton16 + 1, 'Đã giao', d.SoDH]);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(G.daGiao_(d.SoDH))), { [op.MaHH]: 1, HH0001: 0 });
  // Ốp đã giao: nhập lại kho, đơn hết hàng thì hủy
  r = goi(binh4, 'traHang', { SoDH: d.SoDH, lines: [{ MaHH: op.MaHH, SoLuong: 1 }] });
  assert.deepStrictEqual([!!r.SoPK, ton(op.MaHH), r.huy], [true, tonOp + 1, true]);
}

// Phiếu bán hàng PDF để gửi khách; nhắc khách sắp hết bảo hành
{
  const t = G.dangNhap('admin', adminPass).token, kh = goi(binh4, 'luuKhach', { TenKH: 'Khách Phiếu', SDT: '0966000444' });
  const b = goi(binh4, 'banNhanh', { MaKH: kh.MaKH, lines: [{ MaHH: 'HH0001', SoLuong: 1, DonGia: 28000000, IMEI: 'NK0503' }], GiamGia: 1000000, thu: { SoTien: 20000000, HinhThuc: 'Tiền mặt' } });
  const pdf = goi(binh4, 'phieuBanHangPdf', b.SoDH);
  assert.match(pdf.ten, /^Phieu ban hang \d{3}-\d{4}-DH\.pdf$/);
  const noiDung = Buffer.from(pdf.base64, 'base64').toString('utf8'); // máy chủ thử: "PDF" giữ nguyên HTML
  assert.ok(['PHIẾU BÁN HÀNG', 'Khách Phiếu', 'Giảm giá', '-1.000.000', '27.000.000', 'Còn phải trả', '7.000.000'].every(x => noiDung.includes(x)), noiDung);
  assert.throws(() => goi(binh4, 'phieuBanHangPdf', '999-2026/DH'), /Không tìm thấy/);
  // Máy giao 12 tháng trước + 5 ngày: còn 5 ngày bảo hành → vào danh sách nhắc
  const sau5 = new Date(Date.parse(today) + 5 * 864e5).toISOString().slice(0, 10), ngayGiao = (+sau5.slice(0, 4) - 1) + sau5.slice(4);
  G.luuChungTu(t, 'NK', { Ngay: ngayGiao, DoiTac: 'NCC', lines: [{ MaHH: 'HH0002', TenHang: 'iPhone 15 128GB - Đen', SoLuong: 1, IMEI: '358000000000013' }] });
  const dhCu = G.luuChungTu(t, 'DH', { Ngay: ngayGiao, MaKH: kh.MaKH, TenKH: kh.TenKH, VAT: 0, lines: [{ MaHH: 'HH0002', TenHang: 'iPhone 15 128GB - Đen', SoLuong: 1, DonGia: 1 }] }).doc;
  G.luuChungTu(t, 'XK', { Ngay: ngayGiao, SoDH: dhCu.SoDH, DoiTac: kh.TenKH, lines: [{ MaHH: 'HH0002', TenHang: 'iPhone 15 128GB - Đen', SoLuong: 1, IMEI: '358000000000013' }] });
  const nhac = goiMoi(binh4, 'tongQuanMay').sapHetBH.find(x => x.IMEI === '358000000000013');
  assert.deepStrictEqual([nhac && nhac.MaKH, nhac && nhac.n], [kh.MaKH, 5]);
}

// Sai mật khẩu 5 lần: chặn 10 phút như web
for (let i = 0; i < 5; i++) api({ fn: 'dangNhapMay', args: ['admin', 'sai'] });
assert.match(api({ fn: 'dangNhapMay', args: ['admin', adminPass] }).error, /quá 5 lần/);

console.log('OK - API app điện thoại: tất cả kiểm tra đều đạt');
