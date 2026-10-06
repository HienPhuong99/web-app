// Kiểm tra nhanh logic máy chủ (Code.gs) trên dữ liệu mẫu:  node dev/kiem-tra.js
const assert = require('assert');
const { ctx: G, sheets, logs, cache, props, Sheet, drive, docs } = require('./chay-thu');
const vm = require('vm');
const adminPass = logs.join('\n').match(/mật khẩu: (\S+)/)[1];
const today = G.now_().slice(0, 10);
const year = today.slice(0, 4);
const plain = x => JSON.parse(JSON.stringify(x)); // đối tượng tạo trong vm khác prototype
const rowsOf = (name, key) => sheets[name].rows.filter(r => r[0] === key);

// Cửa hàng thứ hai chỉ dựng trong bài test này (app thật chỉ còn phuonghihi): kiểm tra mã dùng chung nhiều cửa hàng vẫn tách dữ liệu đúng
vm.runInContext(`SHOPS.demo = Object.assign({}, SHOPS.phone, { ten: 'Cửa hàng thử', moTa: 'Cửa hàng thứ hai để kiểm tra', prefix: 'DM_', soBG: 'DM',
  congTy: Object.assign({}, SHOPS.phone.congTy, { ten: 'CÔNG TY THỬ', vatMacDinh: 8, qrNganHang: '970405', qrSoTK: '6100201006846', qrChuTK: 'CONG TY THU', hinhThuc: ['Chuyển khoản', 'Tiền mặt'] }) });`, G);
const HH = ['MaHH', 'TenHang', 'Model', 'NhomHang', 'PhanLoai', 'DVT', 'XuatXu', 'GiaSi', 'GiaLe', 'GhiChu']; // thiếu cột TonToiThieu như bản cũ: caiDat phải tự thêm
const KH = ['MaKH', 'TenKH', 'NguoiLienHe', 'SDT', 'DiaChi', 'MST', 'Email', 'GhiChu', 'NgayTao', 'NguoiTao'];
sheets.DM_KhachHang = new Sheet([KH,
  ['KH00001', 'Công ty TNHH Mẫu Một', 'Anh Nam', '0900000001', '12 Đường Số 1, TP.HCM', '0300000001', '', 'Khách mẫu', '2026-08-02', 'Mẫu'],
  ['KH00002', 'Chị Lan', '', '0900000002 / 0900000003', 'Thủ Đức, TP.HCM', '', '', '', '2026-09-10', 'Mẫu']]);
sheets.DM_HangHoa = new Sheet([HH,
  ['HH0001', 'Bình chữa cháy bột ABC 4kg', 'MFZL4', 'Bình chữa cháy', 'BÌNH CHỮA CHÁY', 'Bình', 'VN', 345000, 445000, ''],
  ['HH0002', 'Bình chữa cháy xách tay CO2 3kg', 'MT3', 'Bình chữa cháy', 'BÌNH CHỮA CHÁY', 'Bình', 'VN', 435000, 555000, ''],
  ['HH0003', 'Kệ đựng 2 bình chữa cháy', '', 'Tủ + kệ', 'TỦ + KỆ', 'Cái', 'Việt Nam', 85000, 120000, ''],
  ['HH0004', 'Đầu báo khói địa chỉ', 'QA01', 'Báo cháy', 'BÁO CHÁY', 'Cái', 'TQ', '', '', 'Chưa có giá']]);
G.caiDat();
sheets.TaiKhoan.rows[1][sheets.TaiKhoan.rows[0].indexOf('CuaHang')] = 'phone,demo'; // quản trị được vào cả 2 cửa hàng

// caiDat: mỗi cửa hàng một bộ trang tính, trang PCCC bị ẩn, cột thiếu được thêm
assert.ok(['PS_DonHang', 'PS_ThuTien', 'DM_DonHang', 'DM_PhieuKhoCT', 'TaiKhoan'].every(n => sheets[n]));
assert.ok(sheets.DM_HangHoa.hidden && !sheets.PS_HangHoa.hidden);
assert.ok(sheets.DM_HangHoa.rows[0].includes('TonToiThieu'));

// Đăng nhập: không phân biệt hoa thường; luôn mở cửa hàng mặc định (phone) trước
assert.throws(() => G.dangNhap('admin', 'sai-mat-khau'), /Sai tên đăng nhập/);
const login = G.dangNhap(' ADMIN ', adminPass), admin = login.token;
assert.deepStrictEqual([login.user.shop, plain(login.user.shops)], ['phone', ['phone', 'demo']]);
let d = G.taiDuLieu(admin);
assert.deepStrictEqual([d.cuaHang.id, d.khach.length, d.hang.length, d.congTy.vatMacDinh], ['phone', 1, 2, 0]);

// Chuyển sang PCCC trong Cài đặt: dữ liệu của cửa hàng kia
d = G.chonCuaHang(admin, 'demo');
assert.deepStrictEqual([d.cuaHang.id, d.khach.length, d.hang.length, d.congTy.vatMacDinh], ['demo', 2, 4, 8]);
assert.throws(() => G.chonCuaHang(admin, 'khong-co'), /không được vào/);

// Khách hàng: mã tự sinh, sửa không đổi mã/ngày tạo, chuỗi "=..." không thành công thức
const kh = G.luuKhach(admin, { TenKH: 'Khách thử', SDT: ' 0900000009 ' });
assert.deepStrictEqual([kh.MaKH, kh.SDT], ['KH00003', '0900000009']);
assert.strictEqual(G.luuKhach(admin, { MaKH: 'KH00003', TenKH: 'Khách thử (sửa)', NgayTao: '2000-01-01' }).NgayTao, kh.NgayTao);
assert.strictEqual(G.toRow_(sheets.DM_KhachHang, { TenKH: '=IMPORTXML("x")' })[1], "'=IMPORTXML(\"x\")");

// Báo giá: số tự tăng theo năm, tiền luôn tính lại ở máy chủ, bỏ dòng trống
const bg = G.luuChungTu(admin, 'BG', { Ngay: today, MaKH: 'KH00002', TenKH: 'Chị Lan', VAT: 8, lines: [
  { MaHH: 'HH0001', TenHang: 'Bình chữa cháy bột ABC 4kg', SoLuong: 10, LoaiGia: 'Giá sỉ', DonGia: 345000, ThanhTien: 1 },
  { TenHang: '   ' },
  { TenHang: 'Công lắp đặt', SoLuong: 1, LoaiGia: 'Giá tùy chọn', DonGia: 500000 },
] }).doc;
assert.strictEqual(bg.SoBG, `001-${year}/DM`);
assert.deepStrictEqual([bg.lines.length, bg.TienHang, bg.TienVAT, bg.TongCong], [2, 3950000, 316000, 4266000]);
assert.strictEqual(G.luuChungTu(admin, 'BG', { Ngay: '2099-01-02', TenKH: 'A', lines: [{ TenHang: 'B', SoLuong: 1, DonGia: 1 }] }).doc.SoBG, '001-2099/DM');
assert.throws(() => G.luuChungTu(admin, 'BG', { TenKH: 'A', lines: [{ TenHang: '' }] }), /Chưa có dòng hàng/);

// Chốt đơn từ báo giá: phải có mã khách; đơn mới ở trạng thái chờ giao
assert.throws(() => G.luuChungTu(admin, 'DH', { Ngay: today, TenKH: 'Khách lẻ', lines: bg.lines }), /chọn khách trong danh sách/);
const dh = G.luuChungTu(admin, 'DH', Object.assign({}, bg, { SoBG: bg.SoBG, NguoiTao: '', NgayTao: '', lines: bg.lines })).doc;
assert.deepStrictEqual([dh.SoDH, dh.TrangThai, dh.TongCong, dh.SoBG], [`001-${year}/DH`, 'Chờ giao', 4266000, bg.SoBG]);

// Nhập kho 20 bình, giao 6 → giao một phần, tồn 14; giao nốt 4 + dòng công → đã giao, tồn 10
let r = G.luuChungTu(admin, 'NK', { Ngay: today, DoiTac: 'NCC Victory', lines: [{ MaHH: 'HH0001', TenHang: 'Bình ABC 4kg', SoLuong: 20 }] });
assert.strictEqual(r.doc.SoPK, `001-${year}/NK`);
assert.deepStrictEqual(plain(r.ton.HH0001), { nhap: 20, xuat: 0 });
assert.throws(() => G.luuChungTu(admin, 'XK', { Ngay: today, SoDH: 'khong-co', lines: [{ MaHH: 'HH0001', TenHang: 'x', SoLuong: 1 }] }), /Không tìm thấy đơn hàng/);
assert.throws(() => G.luuChungTu(admin, 'XK', { Ngay: today, lines: [{ MaHH: 'HH0001', TenHang: 'x', SoLuong: 0 }] }), /lớn hơn 0/);
const xk1 = G.luuChungTu(admin, 'XK', { Ngay: today, SoDH: dh.SoDH, DoiTac: 'Chị Lan', lines: [{ MaHH: 'HH0001', TenHang: 'Bình ABC 4kg', SoLuong: 6 }] });
assert.deepStrictEqual([xk1.doc.SoPK, xk1.donHang[0].TrangThai, xk1.ton.HH0001.nhap - xk1.ton.HH0001.xuat], [`001-${year}/XK`, 'Giao một phần', 14]);
const xk2 = G.luuChungTu(admin, 'XK', { Ngay: today, SoDH: dh.SoDH, lines: [
  { MaHH: 'HH0001', TenHang: 'Bình ABC 4kg', SoLuong: 4 }, { TenHang: 'Công lắp đặt', SoLuong: 1 }] });
assert.strictEqual(xk2.donHang[0].TrangThai, 'Đã giao');
assert.deepStrictEqual(plain(G.layChungTu(admin, 'DH', dh.SoDH).daGiao), { HH0001: 10, 'Công lắp đặt': 1 });
assert.strictEqual(G.theKho(admin, 'HH0001').map(m => m.Loai + m.SoLuong).join(','), 'Nhập20,Xuất6,Xuất4');
// Xóa phiếu giao → đơn quay về giao một phần, tồn cộng lại
r = G.xoaChungTu(admin, 'XK', xk2.doc.SoPK);
assert.deepStrictEqual([r.ton.HH0001.xuat, r.donHang[0].TrangThai], [6, 'Giao một phần']);

// Thu tiền: gắn đơn thì tự lấy khách của đơn; đơn có phiếu thu/giao thì không xóa được
assert.throws(() => G.luuThuTien(admin, { Ngay: today, MaKH: 'KH00002', SoTien: 0 }), /số tiền/);
const pt = G.luuThuTien(admin, { Ngay: today, SoDH: dh.SoDH, SoTien: '2133000', HinhThuc: 'Chuyển khoản' });
assert.deepStrictEqual([pt.SoPT, pt.MaKH, pt.SoTien], [`001-${year}/PT`, 'KH00002', 2133000]);
assert.throws(() => G.xoaChungTu(admin, 'DH', dh.SoDH), /phiếu thu hoặc phiếu giao/);
assert.throws(() => G.xoaKhach(admin, 'KH00002'), /không xóa được/);

// Hủy đơn giữ nguyên trạng thái Hủy dù có giao hàng; khôi phục thì tính lại
G.luuChungTu(admin, 'DH', Object.assign({}, dh, { TrangThai: 'Hủy' }));
assert.strictEqual(G.findObj_('DonHang', dh.SoDH).TrangThai, 'Hủy');
G.luuChungTu(admin, 'DH', Object.assign({}, dh, { TrangThai: '' }));
assert.strictEqual(G.findObj_('DonHang', dh.SoDH).TrangThai, 'Giao một phần');

// Sửa chứng từ: giữ số và người lập, thay toàn bộ dòng, không đụng chứng từ khác
const sua = G.luuChungTu(admin, 'BG', Object.assign({}, bg, { NguoiTao: 'ai đó', lines: [{ TenHang: 'Bình CO2 3kg', SoLuong: 2, DonGia: 435000 }] })).doc;
assert.deepStrictEqual([sua.SoBG, sua.NguoiTao], [bg.SoBG, bg.NguoiTao]);
assert.deepStrictEqual([rowsOf('DM_BaoGiaCT', bg.SoBG).length, rowsOf('DM_DonHangCT', dh.SoDH).length], [1, 2]);
assert.strictEqual(G.taiDuLieu(admin).thongKe.topHang[0].TenHang, 'Bình chữa cháy bột ABC 4kg');

// Hai cửa hàng tách riêng: số chứng từ, mã khách, tồn kho đếm lại từ đầu; PCCC không bị ảnh hưởng
G.chonCuaHang(admin, 'phone');
const psBg = G.luuChungTu(admin, 'BG', { Ngay: today, MaKH: 'KH00001', TenKH: 'Anh Minh', VAT: 0, lines: [
  { MaHH: 'HH0002', TenHang: 'iPhone 15 128GB - Đen', SoLuong: 1, LoaiGia: 'Giá lẻ', DonGia: 11300000 }] }).doc;
assert.deepStrictEqual([psBg.SoBG, psBg.TongCong], [`001-${year}/BG`, 11300000]);
assert.strictEqual(G.luuKhach(admin, { TenKH: 'Chị Hoa' }).MaKH, 'KH00002');
assert.strictEqual(G.luuChungTu(admin, 'NK', { Ngay: today, DoiTac: 'Tồn đầu kỳ', lines: [{ MaHH: 'HH0001', TenHang: 'iPhone', SoLuong: 3 }] }).doc.SoPK, `001-${year}/NK`);
d = G.taiDuLieu(admin);
assert.deepStrictEqual([d.khach.length, d.baoGia.length, d.donHang.length, plain(d.ton)], [2, 1, 0, { HH0001: { nhap: 3, xuat: 0 } }]);
assert.deepStrictEqual([sheets.DM_KhachHang.rows.length, sheets.PS_BaoGia.rows.length, sheets.DM_BaoGia.rows.length], [4, 2, 3]);

// Phân quyền: nhân viên không sửa bảng giá, không xóa; phải còn 1 quản trị; phải chọn ít nhất 1 cửa hàng
assert.throws(() => G.luuTaiKhoan(admin, { TenDangNhap: 'x.y', MatKhau: '123456', CuaHang: '', moi: true }), /ít nhất 1 cửa hàng/);
G.luuTaiKhoan(admin, { TenDangNhap: 'Lan.Nguyen', HoTen: 'Lan', VaiTro: 'nhanvien', MatKhau: 'lan-123', CuaHang: 'phone', moi: true });
assert.throws(() => G.luuTaiKhoan(admin, { TenDangNhap: 'lan.nguyen', MatKhau: 'khac-123', CuaHang: 'phone', moi: true }), /đã có/);
const lanLogin = G.dangNhap('lan.nguyen', 'lan-123'), lan = lanLogin.token;
assert.deepStrictEqual(plain(lanLogin.user.shops), ['phone']);
assert.throws(() => G.chonCuaHang(lan, 'demo'), /không được vào/);
assert.ok(!JSON.stringify(G.taiDuLieu(lan)).includes('Cửa hàng thử')); // nhân viên phone không thấy gì của PCCC
assert.throws(() => G.luuHang(lan, { TenHang: 'X' }), /quản trị/);
assert.throws(() => G.xoaChungTu(lan, 'BG', psBg.SoBG), /quản trị/);
assert.throws(() => G.xoaThuTien(lan, 'x'), /quản trị/);
assert.throws(() => G.dsTaiKhoan(lan), /quản trị/);
assert.strictEqual(G.luuThuTien(lan, { Ngay: today, MaKH: 'KH00001', SoTien: 100000 }).NguoiTao, 'Lan');
assert.throws(() => G.luuTaiKhoan(admin, { TenDangNhap: 'admin', HoTen: 'Quản trị', VaiTro: 'nhanvien', CuaHang: 'phone,demo' }), /ít nhất 1 tài khoản quản trị/);
assert.ok(G.dsTaiKhoan(admin).every(t => !('MatKhau' in t) && !('Muoi' in t)));
assert.strictEqual(G.dsTaiKhoan(admin).find(t => t.TenDangNhap === 'admin').CuaHang, 'phone,demo');

// Bảng/cột thêm ở bản mới: caiDat tạo đủ; Sheet của bản cũ tự được nâng cấp ở lần gọi đầu, không cần chạy lại caiDat
assert.ok(['CaiDat', 'PS_NhatKy', 'DM_NhatKy'].every(n => sheets[n]) && sheets.DM_NhatKy.hidden && !sheets.CaiDat.hidden);
assert.ok(sheets.PS_PhieuKhoCT.rows[0].includes('IMEI') && sheets.PS_HangHoa.rows[0].includes('BaoHanh'));
delete sheets.PS_NhatKy; sheets.PS_PhieuKhoCT.rows.forEach(r => { r.length = 7; }); sheets.PS_PhieuKhoCT.maxCols = 7; // giả lập Sheet bản cũ, lưới vừa khít 7 cột
props.delete('schema'); cache.delete('schema');
const ss = G.SpreadsheetApp.getActive(), insertSheet = ss.insertSheet;
ss.insertSheet = () => { throw new Error('giả lập lỗi tạo trang tính'); };
assert.strictEqual(G.taiDuLieu(admin).cuaHang.id, 'phone'); // nâng cấp lỗi giữa chừng: app vẫn chạy với bảng cũ
assert.ok(!sheets.PS_NhatKy && !props.get('schema'));
ss.insertSheet = insertSheet; cache.delete('schema');
G.taiDuLieu(admin);
assert.ok(sheets.PS_NhatKy && !sheets.PS_NhatKy.hidden && sheets.PS_PhieuKhoCT.rows[0][7] === 'IMEI' && props.get('schema'));

// Thông tin cửa hàng sửa trong app: chỉ quản trị, chỉ đổi cửa hàng đang làm việc, bỏ trường lạ; trang đăng nhập lấy tên mới
assert.throws(() => G.luuCuaHang(lan, { ten: 'X', hinhThuc: 'Tiền mặt' }), /quản trị/);
assert.throws(() => G.luuCuaHang(admin, { ten: '', hinhThuc: 'Tiền mặt' }), /Nhập tên cửa hàng/);
assert.throws(() => G.luuCuaHang(admin, { ten: 'Shop A', hinhThuc: 'Tiền mặt', qrNganHang: '970436', qrSoTK: '12' }), /Mã QR/);
const ch = G.luuCuaHang(admin, { tenNgan: 'Táo Đỏ', moTa: 'iPhone cũ mới', ten: 'CỬA HÀNG TÁO ĐỎ', diaChi: 'Số 1 Lê Lợi\n\n Số 2 Hai Bà Trưng ', hinhThuc: 'Tiền mặt\nChuyển khoản',
  vatMacDinh: 0, baoHanhThang: 6, qrNganHang: '970436', qrSoTK: '0123 456 789', qrChuTK: 'NGUYEN VAN A', mst: '0312345678', la: '=HACK()' });
assert.deepStrictEqual([ch.ten, plain(ch.congTy.diaChi), ch.congTy.qrSoTK, ch.congTy.baoHanhThang, 'la' in ch.congTy],
  ['Táo Đỏ', ['Số 1 Lê Lợi', 'Số 2 Hai Bà Trưng'], '0123456789', 6, false]);
d = G.taiDuLieu(admin);
assert.deepStrictEqual([d.cuaHang.ten, d.congTy.ten, d.congTy.mst, d.congTy.kyTen, d.dsCuaHang.map(x => x.ten).join()], ['Táo Đỏ', 'CỬA HÀNG TÁO ĐỎ', '0312345678', '', 'Táo Đỏ,Cửa hàng thử']);
assert.strictEqual(G.thongTinDangNhap().ten, 'Táo Đỏ');
assert.strictEqual(G.chonCuaHang(admin, 'demo').congTy.qrSoTK, '6100201006846'); // cửa hàng kia giữ nguyên
G.chonCuaHang(admin, 'phone');

// IMEI/serial khi giao hàng: số mã = số lượng, không lặp, không bán trùng; khách trả máy (nhập lại kho) thì bán lại được
const dhP = G.luuChungTu(admin, 'DH', { Ngay: '2020-08-31', MaKH: 'KH00001', TenKH: 'Anh Minh', SDT: '0911000001', VAT: 0, lines: [
  { MaHH: 'HH0001', TenHang: 'iPhone 16 Pro Max', SoLuong: 2, DonGia: 28200000 }, { TenHang: 'Dán cường lực', SoLuong: 2, DonGia: 100000 }] }).doc;
const giao = imei => G.luuChungTu(admin, 'XK', { Ngay: '2020-08-31', SoDH: dhP.SoDH, DoiTac: 'Anh Minh', lines: [
  { MaHH: 'HH0001', TenHang: 'iPhone 16 Pro Max', SoLuong: 2, IMEI: imei }, { TenHang: 'Dán cường lực', SoLuong: 2 }] });
assert.throws(() => giao('356789012345671'), /có 1 IMEI\/serial nhưng số lượng là 2/);
assert.throws(() => giao('356789012345671, 356789012345671'), /bị lặp/);
assert.throws(() => giao('356789012345671, ab'), /không hợp lệ/);
const xkP = giao('356789012345671;\n f2lxk0abc9').doc;
assert.strictEqual(xkP.lines[0].IMEI, '356789012345671, F2LXK0ABC9');
assert.deepStrictEqual(xkP.lines.map(l => l.HetHan), ['2021-02-28', '']); // cửa hàng bảo hành 6 tháng; dòng dịch vụ không bảo hành
const ban1 = imei => G.luuChungTu(admin, 'XK', { Ngay: today, lines: [{ MaHH: 'HH0001', TenHang: 'iPhone', SoLuong: 1, IMEI: imei }] });
const nhap1 = imei => G.luuChungTu(admin, 'NK', { Ngay: today, DoiTac: 'Khách trả máy', lines: [{ MaHH: 'HH0001', TenHang: 'iPhone', SoLuong: 1, IMEI: imei }] });
assert.throws(() => ban1('F2LXK0ABC9'), /đã xuất ở phiếu 001-2020\/XK \(đơn 001-2020\/DH\)/);
assert.strictEqual(G.luuChungTu(admin, 'XK', Object.assign({}, xkP, { GhiChu: 'sửa' })).doc.SoPK, xkP.SoPK); // sửa chính phiếu đó thì không báo trùng
nhap1('f2lxk0abc9');
assert.throws(() => nhap1('F2LXK0ABC9'), /đã nhập ở phiếu/);
ban1('F2LXK0ABC9');
assert.throws(() => ban1('F2LXK0ABC9'), /đã xuất ở phiếu/);
assert.strictEqual(plain(G.layChungTu(admin, 'XK', xkP.SoPK)).lines[0].HetHan, '2021-02-28');

// Tra bảo hành: khách và SĐT lấy từ đơn hàng; mặt hàng đặt bảo hành 0 tháng thì không có hạn; cộng tháng đúng cuối tháng
G.luuHang(admin, Object.assign({}, plain(G.findObj_('HangHoa', 'HH0002')), { BaoHanh: 0 }));
G.luuChungTu(admin, 'XK', { Ngay: '2024-01-31', DoiTac: 'Khách lẻ', lines: [{ MaHH: 'HH0002', TenHang: 'iPhone 15', SoLuong: 1, IMEI: 'SN-0001' }] });
const bh = plain(G.dsBaoHanh(lan));
assert.deepStrictEqual(bh.filter(x => x.SoPK === xkP.SoPK).map(x => [x.TenKH, x.SDT, x.IMEI, x.HetHan]), [['Anh Minh', '0911000001', '356789012345671, F2LXK0ABC9', '2021-02-28']]);
assert.deepStrictEqual([bh.find(x => x.IMEI === 'SN-0001').HetHan, bh.find(x => x.IMEI === 'SN-0001').TenKH], ['', 'Khách lẻ']);
assert.deepStrictEqual([G.congThang_('2024-01-31', 1), G.congThang_('2025-11-30', 3), G.congThang_('2026-09-30', 12)], ['2024-02-29', '2026-02-28', '2027-09-30']);

// Báo cáo theo mặt hàng trong khoảng ngày
const bc = plain(G.baoCaoHang(lan, '2020-08-01', '2020-08-31'));
assert.deepStrictEqual([bc.topHang.length, bc.topHang[0].TenHang, bc.topHang[0].ThanhTien, bc.topHang[0].Nhom, bc.theoNhom[1].ten], [2, 'iPhone 16 Pro Max', 56400000, 'iPhone 16 Series', 'Dịch vụ / khác']);
assert.throws(() => G.baoCaoHang(lan, '2020', ''), /không hợp lệ/);

// Nhật ký: ghi ai làm gì, mới nhất trước, chỉ quản trị xem, mỗi cửa hàng một sổ
const nk = plain(G.dsNhatKy(admin));
assert.ok(nk.some(x => x.HanhDong === 'Thêm phiếu xuất kho' && x.DoiTuong === xkP.SoPK && /Quản trị \(admin\)/.test(x.NguoiDung)));
assert.ok(nk.some(x => x.HanhDong === 'Sửa thông tin cửa hàng') && nk.some(x => x.HanhDong === 'Sửa mặt hàng' && x.DoiTuong === 'HH0002'));
assert.strictEqual(nk[0].HanhDong, 'Thêm phiếu xuất kho');
assert.throws(() => G.dsNhatKy(lan), /quản trị/);
G.luuChungTu(admin, 'DH', Object.assign({}, dhP, { TrangThai: 'Hủy' }));
assert.strictEqual(plain(G.dsNhatKy(admin))[0].HanhDong, 'Hủy đơn hàng');
G.luuChungTu(admin, 'DH', Object.assign({}, dhP, { TrangThai: '' }));
assert.ok(!sheets.DM_NhatKy.rows.some(r => /Anh Minh/.test(r[4])));

// ===== Hợp đồng (GĐ1) =====
// Số tiền thành chữ: các ca khó của tiếng Việt (linh, mốt, lăm, không trăm) và ví dụ trong video hướng dẫn
[[0, 'Không đồng chẵn.'], [1, 'Một đồng chẵn.'], [11, 'Mười một đồng chẵn.'], [15, 'Mười lăm đồng chẵn.'], [21, 'Hai mươi mốt đồng chẵn.'], [25, 'Hai mươi lăm đồng chẵn.'],
  [101, 'Một trăm linh một đồng chẵn.'], [105, 'Một trăm linh năm đồng chẵn.'], [1005, 'Một nghìn không trăm linh năm đồng chẵn.'], [21000, 'Hai mươi mốt nghìn đồng chẵn.'],
  [112420000, 'Một trăm mười hai triệu bốn trăm hai mươi nghìn đồng chẵn.'], [1001001, 'Một triệu không trăm linh một nghìn không trăm linh một đồng chẵn.'],
  [2500000000, 'Hai tỷ năm trăm triệu đồng chẵn.'], [1e12, 'Một nghìn tỷ đồng chẵn.'], [-5000, 'Âm năm nghìn đồng chẵn.'], [1234.6, 'Một nghìn hai trăm ba mươi lăm đồng chẵn.']]
  .forEach(([n, chu]) => assert.strictEqual(G.docTienChu_(n), chu, 'docTienChu_(' + n + ')'));
assert.throws(() => G.docTienChu_(1e16), /quá lớn/);

// Giao diện (Index.html, docSo: in báo giá và xem trước hợp đồng) và máy chủ (docTienChu_: ghi vào file hợp đồng) phải đọc số giống nhau
const docSoGiaoDien = vm.runInNewContext(require('fs').readFileSync(require('path').join(__dirname, '..', 'apps-script', 'Index.html'), 'utf8').match(/function docSo\(n\) \{[\s\S]*?\r?\n\}\r?\n/)[0] + ';docSo');
let seedRng = 12345; const rnd = () => (seedRng = (seedRng * 1103515245 + 12345) % 2147483648) / 2147483648;
const mau = [0, 1, 4, 14, 24, 34, 104, 1004, 1e6 + 4, 1e9, 1e9 + 1, 2e9 + 24, 999999999999];
for (let i = 0; i < 3000; i++) mau.push(Math.floor(rnd() * Math.pow(10, 1 + Math.floor(rnd() * 11))));
mau.forEach(n => assert.strictEqual(G.docTienChu_(n), docSoGiaoDien(n) + ' chẵn.', 'Đọc số khác nhau ở ' + n)); // ≥ 1 nghìn tỷ hai bên đọc khác nhau nhưng không có thật trong cửa hàng

// Bảng mới và cột mới của khách hàng có sẵn
assert.ok(['PS_HopDong', 'PS_HopDongCT', 'PS_MauHopDong', 'DM_HopDong'].every(n => sheets[n]));
assert.ok(['NguoiDaiDien', 'ChucVu', 'SoTK', 'NganHang', 'VanPhongGD'].every(c => sheets.PS_KhachHang.rows[0].includes(c)));
const khHD = G.luuKhach(admin, { TenKH: 'Công ty Minh Long', NguoiDaiDien: 'Nguyễn Văn Hùng', ChucVu: 'Giám đốc', SoTK: '288273663', NganHang: 'VP Bank', VanPhongGD: 'Q.12', MST: '0312456789' });
assert.deepStrictEqual([G.findObj_('KhachHang', khHD.MaKH).NguoiDaiDien, G.findObj_('KhachHang', khHD.MaKH).SoTK], ['Nguyễn Văn Hùng', '288273663']);

// Lập hợp đồng: kiểm tra đầu vào
const hdLines = [{ MaHH: 'HH0001', TenHang: 'Thép xây dựng D16', DVT: 'Tấn', SoLuong: 1, DonGia: 15200000, ThanhTien: 1 }, { TenHang: '  ' },
  { TenHang: 'Sơn nước nội thất', DVT: 'Thùng', SoLuong: 100, DonGia: 680000 }, { TenHang: 'Ống nhựa PVC Ø60', DVT: 'Mét', SoLuong: 500, DonGia: 38000 }];
const hdMau = { LoaiHD: 'Hợp đồng mua bán', TenDN: 'Công ty Minh Long', MaKH: khHD.MaKH, VAT: 10, Ngay: '2026-01-25', lines: hdLines };
assert.throws(() => G.luuHopDong(admin, Object.assign({}, hdMau, { LoaiHD: ' ' })), /Chọn loại hợp đồng/);
assert.throws(() => G.luuHopDong(admin, Object.assign({}, hdMau, { TenDN: '' })), /tên khách hàng/);
assert.throws(() => G.luuHopDong(admin, Object.assign({}, hdMau, { Ngay: '2026-02-30' })), /Ngày ký không hợp lệ/);
assert.throws(() => G.luuHopDong(admin, Object.assign({}, hdMau, { NgayHieuLuc: '2026-03-01', NgayHetHan: '2026-02-01' })), /hết hạn phải sau/);
assert.throws(() => G.luuHopDong(admin, Object.assign({}, hdMau, { lines: [{ TenHang: 'X', SoLuong: 0, DonGia: 1 }] })), /số lượng phải lớn hơn 0/);
assert.throws(() => G.luuHopDong(admin, Object.assign({}, hdMau, { lines: [{ TenHang: 'X', SoLuong: 1, DonGia: -5 }] })), /không được âm/);
assert.throws(() => G.luuHopDong(admin, Object.assign({}, hdMau, { SoDH: 'khong-co' })), /Không tìm thấy đơn hàng/);
assert.throws(() => G.luuHopDong(admin, Object.assign({}, hdMau, { SoHD: '999-2026/HD' })), /Không tìm thấy hợp đồng/);
assert.strictEqual(sheets.PS_HopDong.rows.length, 1); // lỗi thì không ghi gì

// Lưu: số tự đánh theo năm của ngày ký, tiền và bằng chữ tính ở máy chủ (không tin số trình duyệt gửi), bỏ dòng trống
const hd = G.luuHopDong(admin, Object.assign({}, hdMau, { TongCong: 1, TienHang: 1, BangChu: 'giả', LinkFile: 'https://evil.example', FileId: 'x', NgayHetHan: '2027-01-25', NguoiPhuTrach: 'Linh', SoDH: dhP.SoDH })).doc;
assert.deepStrictEqual([hd.SoHD, hd.TrangThai, hd.TienHang, hd.TienVAT, hd.TongCong, hd.lines.length], ['001-2026/HD', 'Soạn thảo', 102200000, 10220000, 112420000, 3]);
assert.strictEqual(hd.BangChu, 'Một trăm mười hai triệu bốn trăm hai mươi nghìn đồng chẵn.');
assert.deepStrictEqual([hd.FileId || '', hd.LinkFile || ''], ['', '']); // file chỉ do máy chủ gán khi tạo file Docs
assert.deepStrictEqual(plain(G.layHopDong(lan, hd.SoHD).lines).map(l => [l.STT, l.TenHang, l.ThanhTien]), [[1, 'Thép xây dựng D16', 15200000], [2, 'Sơn nước nội thất', 68000000], [3, 'Ống nhựa PVC Ø60', 19000000]]);
assert.strictEqual(G.luuHopDong(lan, Object.assign({}, hdMau, { Ngay: '2027-03-01' })).doc.SoHD, '001-2027/HD'); // năm khác đánh lại từ 001
assert.strictEqual(G.luuHopDong(lan, hdMau).doc.SoHD, '002-2026/HD');
assert.strictEqual(G.luuHopDong(lan, Object.assign({}, hdMau, { lines: [] })).doc.TongCong, 0); // hợp đồng nguyên tắc không cần dòng hàng

// Sửa: giữ số, người lập, file; thay toàn bộ dòng; không đụng hợp đồng khác
const hdRow = sheets.PS_HopDong.rows.findIndex(r => r[0] === hd.SoHD), cols = sheets.PS_HopDong.rows[0];
sheets.PS_HopDong.rows[hdRow][cols.indexOf('FileId')] = 'id-that'; sheets.PS_HopDong.rows[hdRow][cols.indexOf('LinkFile')] = 'https://docs.google.com/document/d/id-that';
const sua1 = G.luuHopDong(lan, Object.assign({}, hd, { NguoiTao: 'ai đó', LinkFile: 'https://evil.example', lines: [{ TenHang: 'Thép D16', DVT: 'Tấn', SoLuong: 2, DonGia: 15000000 }] })).doc;
assert.deepStrictEqual([sua1.SoHD, sua1.NguoiTao, sua1.FileId, sua1.LinkFile, sua1.TongCong], [hd.SoHD, 'Quản trị', '1', '', 33000000]); // nhân viên chỉ thấy cờ đã có file
assert.deepStrictEqual([G.findObj_('HopDong', hd.SoHD).FileId, G.findObj_('HopDong', hd.SoHD).LinkFile], ['id-that', 'https://docs.google.com/document/d/id-that']); // file thật vẫn giữ nguyên trong Sheet
assert.strictEqual(rowsOf('PS_HopDongCT', hd.SoHD).length, 1);
assert.strictEqual(rowsOf('PS_HopDongCT', '002-2026/HD').length, 3);

// Đã hiệu lực: nhân viên đổi trạng thái được nhưng không sửa hàng/số tiền; quản trị sửa được
const hieuLuc = Object.assign({}, sua1, { TrangThai: 'Đang hiệu lực', lines: [{ TenHang: 'Thép D16', DVT: 'Tấn', SoLuong: 2, DonGia: 15000000 }] });
assert.strictEqual(G.luuHopDong(lan, hieuLuc).doc.TrangThai, 'Đang hiệu lực');
assert.throws(() => G.luuHopDong(lan, Object.assign({}, hieuLuc, { lines: [{ TenHang: 'Thép D16', DVT: 'Tấn', SoLuong: 3, DonGia: 15000000 }] })), /đã hiệu lực/);
assert.throws(() => G.luuHopDong(lan, Object.assign({}, hieuLuc, { VAT: 8 })), /đã hiệu lực/);
assert.strictEqual(G.luuHopDong(lan, Object.assign({}, hieuLuc, { GhiChu: 'đổi ghi chú' })).doc.GhiChu, 'đổi ghi chú');
assert.strictEqual(G.luuHopDong(admin, Object.assign({}, hieuLuc, { lines: [{ TenHang: 'Thép D16', DVT: 'Tấn', SoLuong: 3, DonGia: 15000000 }] })).doc.TongCong, 49500000);

// Xóa: chỉ quản trị; xóa cả dòng hàng; mỗi cửa hàng một sổ riêng
assert.throws(() => G.xoaHopDong(lan, '002-2026/HD'), /quản trị/);
G.xoaHopDong(admin, '002-2026/HD');
assert.deepStrictEqual([rowsOf('PS_HopDong', '002-2026/HD').length, rowsOf('PS_HopDongCT', '002-2026/HD').length], [0, 0]);
assert.throws(() => G.xoaHopDong(admin, '002-2026/HD'), /Không tìm thấy/);
assert.deepStrictEqual([G.taiDuLieu(admin).hopDong.length, G.taiDuLieu(admin).mauHD.length], [sheets.PS_HopDong.rows.length - 1, 6]); // caiDat đã tạo 6 file mẫu hợp đồng
G.chonCuaHang(admin, 'demo');
assert.deepStrictEqual([G.taiDuLieu(admin).hopDong.length, G.luuHopDong(admin, hdMau).doc.SoHD], [0, '001-2026/HD']);
G.chonCuaHang(admin, 'phone');
assert.ok(plain(G.dsNhatKy(admin)).some(x => x.HanhDong === 'Thêm hợp đồng' && x.DoiTuong === hd.SoHD) && plain(G.dsNhatKy(admin)).some(x => x.HanhDong === 'Xóa hợp đồng' && x.DoiTuong === '002-2026/HD'));


// ===== Hợp đồng (GĐ3): file Google Docs từ mẫu =====
const vanBan = id => docs.get(id).body.getText();
const idDe = r => G.findObj_('HopDong', r.doc.SoHD).FileId; // mã file thật lấy thẳng từ Sheet: nhân viên chỉ nhận cờ "đã có file" ('1'), không nhận mã/link Drive
const bangTrong = id => docs.get(id).body.children.filter(c => c.getType() === 'TABLE');
const tenThuMuc = id => (drive.folders.get(drive.files.get(id).folder) || {}).name;
// Bộ mẫu mặc định cho ngành điện thoại: 5 loại, tự tạo trong thư mục Drive của cửa hàng, chỉ dùng biến app biết
const mauPS = G.readTable_('MauHopDong');
assert.deepStrictEqual(mauPS.map(m => m.LoaiHD), ['Hợp đồng mua bán', 'Hợp đồng mua bán trả góp', 'Hợp đồng nguyên tắc', 'Hợp đồng đại lý – phân phối', 'Hợp đồng thu cũ đổi mới', 'Hợp đồng dịch vụ sửa chữa – bảo hành']);
const bienBiet = new Set(plain(G.bienHopDongMau(admin)).map(b => b[0]));
mauPS.forEach(m => {
  const id = G.idTuLink_(m.LinkMau), vb = vanBan(id), dung = vb.match(/\{\{[A-Z0-9_]+\}\}/g) || [];
  assert.strictEqual(tenThuMuc(id), 'Hợp đồng - phuonghihi', m.LoaiHD + ': mẫu phải nằm trong thư mục tạo lúc cài đặt (đổi tên cửa hàng sau đó không đẻ thêm thư mục)');
  assert.deepStrictEqual(dung.filter(v => !bienBiet.has(v.slice(2, -2))), [], m.LoaiHD + ': mẫu dùng biến lạ');
  ['MAHOPDONG', 'TENDOANHNGHIEP', 'B_TEN', 'NGAYKYDAI', 'THOIHAN', 'BANGHANG'].forEach(v => assert.ok(vb.includes('{{' + v + '}}'), m.LoaiHD + ' thiếu biến ' + v));
  assert.ok(bangTrong(id).length === 1 && /Điều 1\./.test(vb) && /ĐẠI DIỆN BÊN A/.test(JSON.stringify(bangTrong(id)[0].rows.map(r => r.map(c => c.getText())))), m.LoaiHD + ': thiếu Điều 1 hoặc khung chữ ký');
});
const soDoc = docs.size;
G.caiDat(); assert.strictEqual(docs.size, soDoc); // chạy lại caiDat không tạo thêm mẫu

// Tạo file hợp đồng: biến được thay, bảng hàng đúng, ký tự đặc biệt không làm hỏng, nhân viên cũng tạo được
const hdKho = G.luuHopDong(lan, { LoaiHD: 'Hợp đồng mua bán', TenDN: 'Công ty $1 & \\2 "Test" {{B_STK}}', MaKH: khHD.MaKH, MST: '', NguoiDaiDien: 'Nguyễn Văn Hùng', ChucVu: 'Giám đốc',
  Ngay: '2026-01-25', NgayHieuLuc: '2026-02-01', NgayHetHan: '2027-01-31', VAT: 10, GhiChu: 'Giao trong tuần $&', lines: hdLines }).doc;
assert.throws(() => G.taiPdfHopDong(lan, hdKho.SoHD), /chưa có file/);
const f1 = plain(G.taoFileHopDong(lan, hdKho.SoHD));
const id1 = idDe(f1), vb1 = vanBan(id1);
assert.deepStrictEqual([f1.conSot, f1.doc.FileCu, f1.doc.FileId, f1.doc.LinkFile, /^https:\/\/docs\.google\.com\/document\/d\//.test(G.findObj_('HopDong', hdKho.SoHD).LinkFile)], [[], '', '1', '', true]);
assert.ok(!vb1.includes('{{'), 'còn biến chưa thay: ' + (vb1.match(/\{\{[^}]*\}\}/g) || []));
assert.ok(vb1.includes('Số: ' + hdKho.SoHD) && vb1.includes('ngày 25 tháng 01 năm 2026') && vb1.includes('từ ngày 01/02/2026 đến hết ngày 31/01/2027'));
assert.ok(vb1.includes('Tên đơn vị / cá nhân: Công ty $1 & \\2 "Test" B_STK'), 'tên khách có $, \\ phải giữ nguyên, dấu {{ }} bị bỏ'); // không bị hiểu thành nhóm bắt $1, $&
assert.ok(vb1.includes('Mã số thuế: ' + '………………') && vb1.includes('Giao trong tuần $&'));
assert.ok(vb1.includes('CỬA HÀNG TÁO ĐỎ') && vb1.includes('0123456789 tại Vietcombank') && vb1.includes('NGUYEN VAN A') && vb1.includes('0312345678') && vb1.includes('bảo hành: 6 tháng')); // bên B lấy từ cài đặt cửa hàng
assert.ok(vb1.includes('Tổng giá trị hợp đồng (gồm thuế GTGT 10%): 112.420.000 đồng. Bằng chữ: Một trăm mười hai triệu bốn trăm hai mươi nghìn đồng chẵn.'));
const bang1 = plain(bangTrong(id1).filter(t => t.rows[0][0].getText() === 'STT')[0].rows.map(r => r.map(c => c.getText())));
assert.deepStrictEqual(bang1, [['STT', 'Tên hàng hóa, dịch vụ', 'ĐVT', 'Số lượng', 'Đơn giá (đồng)', 'Thành tiền (đồng)'],
  ['1', 'Thép xây dựng D16', 'Tấn', '1', '15.200.000', '15.200.000'], ['2', 'Sơn nước nội thất', 'Thùng', '100', '680.000', '68.000.000'], ['3', 'Ống nhựa PVC Ø60', 'Mét', '500', '38.000', '19.000.000'],
  ['', 'Cộng tiền hàng', '', '', '', '102.200.000'], ['', 'Thuế GTGT (10%)', '', '', '', '10.220.000'], ['', 'Tổng thanh toán', '', '', '', '112.420.000']]);
assert.ok(docs.get(id1).body.children.indexOf(bangTrong(id1)[0]) < vb1.length && /Bên B bán và Bên A mua các hàng hóa sau:\n?/.test(vb1));
assert.strictEqual(tenThuMuc(id1), 'Hợp đồng - phuonghihi');
assert.ok(!/[\/\\:*?"<>|]/.test(drive.files.get(id1).name) && drive.files.get(id1).name.startsWith('Hợp đồng ' + hdKho.SoHD.replace('/', '-')), drive.files.get(id1).name);
assert.ok(vanBan(G.idTuLink_(mauPS[0].LinkMau)).includes('{{TENDOANHNGHIEP}}')); // mẫu gốc không bị sửa

// File cũ khi đổi nội dung; tạo lại thì file cũ vào thùng rác
const hdTT = Object.assign({}, hdKho, { TrangThai: 'Đang hiệu lực', lines: hdLines });
assert.strictEqual(G.luuHopDong(lan, hdTT).doc.FileCu, ''); // đổi trạng thái không làm file cũ
assert.strictEqual(G.luuHopDong(lan, Object.assign({}, hdTT, { DiaChi: '12 Lê Lợi' })).doc.FileCu, '1');
assert.strictEqual(G.luuHopDong(lan, Object.assign({}, hdTT, { DiaChi: '12 Lê Lợi', TrangThai: 'Tạm dừng' })).doc.FileCu, '1'); // đã cũ thì vẫn cũ
const f2 = plain(G.taoFileHopDong(lan, hdKho.SoHD));
const id2 = idDe(f2);
assert.deepStrictEqual([f2.doc.FileCu, id2 !== id1, drive.files.get(id1).trashed, !!drive.files.get(id2).trashed], ['', true, true, false]);
assert.ok(vanBan(id2).includes('Địa chỉ: 12 Lê Lợi'));
assert.deepStrictEqual([...drive.folders.values()].filter(f => f.name.startsWith('Hợp đồng - ')).map(f => f.name), ['Hợp đồng - phuonghihi']); // dùng lại một thư mục

// PDF: tải về dạng base64
const pdf = plain(G.taiPdfHopDong(lan, hdKho.SoHD));
assert.ok(pdf.ten.endsWith('.pdf') && !pdf.ten.includes('/'));
const pdfByte = Buffer.from(pdf.base64, 'base64').toString('utf8');
assert.ok(pdfByte.startsWith('%PDF') && pdfByte.includes('Địa chỉ: 12 Lê Lợi'));

// Hợp đồng không có hàng: dòng bảng hàng được thay bằng ghi chú, không chèn bảng
const hdKhong = G.luuHopDong(lan, { LoaiHD: 'Hợp đồng nguyên tắc', TenDN: 'Đại lý Một', lines: [] }).doc;
const vbKhong = vanBan(idDe(G.taoFileHopDong(lan, hdKhong.SoHD)));
assert.ok(vbKhong.includes('(Theo báo giá, đơn đặt hàng hoặc phụ lục từng lần)') && !vbKhong.includes('{{') && vbKhong.includes('kể từ ngày ký'));
assert.strictEqual(bangTrong(G.findObj_('HopDong', hdKhong.SoHD).FileId).length, 1); // chỉ còn bảng chữ ký

// Mẫu tuỳ chỉnh (quản trị): biến lạ được báo, không làm hỏng việc tạo file
const mauTuy = G.DocumentApp.create('Mẫu riêng');
mauTuy.getBody().appendParagraph('Kính gửi {{TENDOANHNGHIEP}} - {{BIEN_LA}} - {{BANGHANG}}');
const thuMucHD = [...drive.folders.values()].find(f => f.name === 'Hợp đồng - phuonghihi');
assert.throws(() => G.luuMauHopDong(admin, { LoaiHD: 'Hợp đồng thử', LinkMau: mauTuy.getUrl() }), /phải nằm trong thư mục "Hợp đồng - phuonghihi"/); // tài liệu ngoài thư mục (vd. tài liệu riêng của chủ Google) không dùng làm mẫu được
G.DriveApp.getFileById(mauTuy.getId()).moveTo(G.DriveApp.getFolderById(thuMucHD.id));
assert.throws(() => G.luuMauHopDong(lan, { LoaiHD: 'Hợp đồng thử', LinkMau: mauTuy.getUrl() }), /quản trị/);
assert.throws(() => G.luuMauHopDong(admin, { LoaiHD: '', LinkMau: mauTuy.getUrl() }), /tên loại/);
assert.throws(() => G.luuMauHopDong(admin, { LoaiHD: 'X', LinkMau: 'không phải link' }), /dán link/i);
assert.throws(() => G.luuMauHopDong(admin, { LoaiHD: 'X', LinkMau: 'https://docs.google.com/document/d/' + 'z'.repeat(30) + '/edit' }), /Không mở được file mẫu/);
drive.files.set('P'.repeat(30), { id: 'P'.repeat(30), name: 'a.pdf', mime: 'application/pdf', folder: 'root' });
assert.throws(() => G.luuMauHopDong(admin, { LoaiHD: 'X', LinkMau: 'P'.repeat(30) }), /không phải Google Docs/);
const dsMau = plain(G.luuMauHopDong(admin, { LoaiHD: 'Hợp đồng thử', LinkMau: mauTuy.getUrl(), MoTa: 'thử' }));
assert.ok(dsMau.loaiHD.includes('Hợp đồng thử') && dsMau.mauHD.length === 7 && G.taiDuLieu(lan).loaiHD.includes('Hợp đồng thử'));
const hdThu = G.luuHopDong(lan, { LoaiHD: 'Hợp đồng thử', TenDN: 'Khách Thử', lines: hdLines }).doc;
const rThu = plain(G.taoFileHopDong(lan, hdThu.SoHD));
assert.deepStrictEqual(rThu.conSot, ['{{BIEN_LA}}']);
assert.ok(vanBan(idDe(rThu)).includes('Kính gửi Khách Thử - {{BIEN_LA}}')); // biến lạ giữ nguyên để người dùng thấy và sửa mẫu
assert.strictEqual(bangTrong(idDe(rThu)).length, 1); // mẫu có {{BANGHANG}} giữa đoạn chữ: bảng chèn trước đoạn đó
G.xoaMauHopDong(admin, 'Hợp đồng thử');
assert.throws(() => G.taoFileHopDong(lan, hdThu.SoHD), /chưa có file mẫu/);
assert.throws(() => G.xoaMauHopDong(lan, 'Hợp đồng mua bán'), /quản trị/);

// Quản trị xóa một mẫu mặc định thì app tôn trọng (không tự tạo lại); hợp đồng cũ thuộc loại đó báo thiếu mẫu; "Tạo lại mẫu mặc định" khôi phục
const hdDL = G.luuHopDong(lan, { LoaiHD: 'Hợp đồng đại lý – phân phối', TenDN: 'Đại lý Hai', lines: [] }).doc;
G.xoaMauHopDong(admin, 'Hợp đồng đại lý – phân phối');
assert.ok(!G.readTable_('MauHopDong').some(m => m.LoaiHD === 'Hợp đồng đại lý – phân phối') && !G.taiDuLieu(lan).loaiHD.includes('Hợp đồng đại lý – phân phối'));
assert.throws(() => G.taoFileHopDong(lan, hdDL.SoHD), /chưa có file mẫu/);
assert.throws(() => G.luuHopDong(lan, { LoaiHD: 'Hợp đồng đại lý – phân phối', TenDN: 'Đại lý Ba', lines: [] }), /chưa có mẫu/); // loại đã xóa không lập mới được
assert.strictEqual(G.luuHopDong(lan, Object.assign({}, hdDL, { GhiChu: 'sửa' })).doc.TrangThai, 'Soạn thảo'); // hợp đồng cũ vẫn sửa được khi giữ nguyên loại
assert.deepStrictEqual(plain(G.taoMauMacDinh(admin).moi), ['Hợp đồng đại lý – phân phối']);
assert.ok(vanBan(idDe(G.taoFileHopDong(lan, hdDL.SoHD))).includes('HỢP ĐỒNG ĐẠI LÝ – PHÂN PHỐI') && G.readTable_('MauHopDong').length === 6);
G.xoaMauHopDong(admin, 'Hợp đồng thu cũ đổi mới');
assert.throws(() => G.taoMauMacDinh(lan), /quản trị/);
assert.deepStrictEqual([plain(G.taoMauMacDinh(admin).moi), plain(G.taoMauMacDinh(admin).moi)], [['Hợp đồng thu cũ đổi mới'], []]);

// Hàm tự kiểm tra chạy tay trên Google thật: ở đây chạy trên bản giả lập để chắc chính hàm này đúng và không để lại gì
const soHDtruoc = sheets.PS_HopDong.rows.length, soFileTruoc = [...drive.files.values()].filter(f => !f.trashed).length;
const tuKiem = plain(G.kiemTraTaoHopDong());
assert.strictEqual(tuKiem.ok, true, JSON.stringify(tuKiem.kq.filter(x => !x[1])));
assert.ok(tuKiem.kq.length >= 7 && sheets.PS_HopDong.rows.length === soHDtruoc);
assert.strictEqual([...drive.files.values()].filter(f => !f.trashed).length, soFileTruoc); // file thử đã vào thùng rác

// Khóa hợp đồng đã ký: nhân viên không vòng qua được bằng cách đưa về Soạn thảo; Tạm dừng cũng là đã ký
const hdKy = G.luuHopDong(lan, { LoaiHD: 'Hợp đồng mua bán', TenDN: 'Khách Ký', VAT: 0, TrangThai: 'Đang hiệu lực', lines: [{ TenHang: 'Máy A', SoLuong: 1, DonGia: 1000000 }] }).doc;
assert.throws(() => G.luuHopDong(lan, Object.assign({}, hdKy, { TrangThai: 'Soạn thảo' })), /không đưa về Soạn thảo/);
const hdTamDung = G.luuHopDong(lan, Object.assign({}, hdKy, { TrangThai: 'Tạm dừng' })).doc;
assert.throws(() => G.luuHopDong(lan, Object.assign({}, hdTamDung, { lines: [{ TenHang: 'Máy A', SoLuong: 1, DonGia: 1 }] })), /đã hiệu lực/);
assert.strictEqual(G.luuHopDong(admin, Object.assign({}, hdTamDung, { TrangThai: 'Soạn thảo', lines: [{ TenHang: 'Máy A', SoLuong: 1, DonGia: 2000000 }] })).doc.TongCong, 2000000); // quản trị làm được
// Nhân viên chỉ thấy cờ đã có file; link mẫu chỉ gửi cho quản trị
const soCoFile = G.taiDuLieu(lan).hopDong.find(h => h.SoHD === hdKhong.SoHD), soCoFileQT = G.taiDuLieu(admin).hopDong.find(h => h.SoHD === hdKhong.SoHD);
assert.deepStrictEqual([soCoFile.FileId, soCoFile.LinkFile, soCoFileQT.FileId.length > 5, /^https:/.test(soCoFileQT.LinkFile)], ['1', '', true, true]);
assert.deepStrictEqual([G.taiDuLieu(lan).mauHD.length, G.taiDuLieu(admin).mauHD.length, G.taiDuLieu(lan).loaiHD.length], [0, 6, 6]);
// Đổi người phụ trách (có trong file) làm file cũ; người khác sửa trong lúc đang tạo file thì file cũng được coi là cũ
const hdPT = G.luuHopDong(lan, { LoaiHD: 'Hợp đồng mua bán', TenDN: 'Khách PT', NguoiPhuTrach: 'Linh', lines: [] }).doc;
G.taoFileHopDong(lan, hdPT.SoHD);
assert.strictEqual(G.luuHopDong(lan, Object.assign({}, hdPT, { NguoiPhuTrach: 'An' })).doc.FileCu, '1');
G.taoFileHopDong(lan, hdPT.SoHD);
assert.strictEqual(G.findObj_('HopDong', hdPT.SoHD).FileCu, '');
let daSua = false;
drive.khiSao = () => { if (!daSua) { daSua = true; G.luuHopDong(admin, Object.assign({}, G.findObj_('HopDong', hdPT.SoHD), { DiaChi: 'Sửa giữa chừng', lines: [] })); } }; // giả lập người khác lưu trong lúc Google đang chép mẫu
assert.strictEqual(plain(G.taoFileHopDong(lan, hdPT.SoHD)).doc.FileCu, '1');
drive.khiSao = null;
assert.strictEqual(G.findObj_('HopDong', hdPT.SoHD).FileCu, '1');
assert.strictEqual(plain(G.taoFileHopDong(lan, hdPT.SoHD)).doc.FileCu, '');

// Chưa cấp quyền Google Docs/Drive: báo rõ cách xử lý, app vẫn mở và lưu hợp đồng bình thường
assert.deepStrictEqual(plain(G.taoMauMacDinh(admin).moi), []); // đủ 5 mẫu: không cần gọi Google nên không đòi quyền
G.xoaMauHopDong(admin, 'Hợp đồng nguyên tắc');
drive.thieuQuyen = true;
assert.throws(() => G.taoFileHopDong(lan, hdKho.SoHD), /chưa được cấp quyền.*caiDat/);
assert.throws(() => G.taiPdfHopDong(lan, hdKho.SoHD), /chưa được cấp quyền/);
assert.throws(() => G.taoMauMacDinh(admin), /chưa được cấp quyền/);
assert.strictEqual(G.taiDuLieu(lan).hopDong.length > 0, true);
assert.strictEqual(G.luuHopDong(lan, Object.assign({}, hdTT, { GhiChu: 'vẫn lưu được' })).doc.GhiChu, 'vẫn lưu được');
G.caiDat(); // caiDat không vỡ khi thiếu quyền (chỉ ghi nhật ký thực thi)
drive.thieuQuyen = false;
assert.deepStrictEqual(plain(G.taoMauMacDinh(admin).moi), ['Hợp đồng nguyên tắc']);
assert.ok(G.findObj_('HopDong', hdKho.SoHD).FileId === id2); // lần tạo hỏng không làm mất file đang có

// Xóa hợp đồng đưa file vào thùng rác; mỗi cửa hàng có mẫu và thư mục riêng
G.xoaHopDong(admin, hdKho.SoHD);
assert.strictEqual(drive.files.get(id2).trashed, true);
G.chonCuaHang(admin, 'demo');
const hdDemo = G.luuHopDong(admin, Object.assign({}, hdMau, { TenDN: 'Khách demo' })).doc;
assert.strictEqual(G.readTable_('MauHopDong').length, 0);
const fDemo = G.taoFileHopDong(admin, hdDemo.SoHD).doc.FileId;
assert.deepStrictEqual([G.readTable_('MauHopDong').length, tenThuMuc(fDemo), vanBan(fDemo).includes('CÔNG TY THỬ')], [6, 'Hợp đồng - Cửa hàng thử', true]); // chưa có mẫu nào: tạo đủ bộ mặc định lần đầu dùng
G.chonCuaHang(admin, 'phone');
assert.ok(plain(G.dsNhatKy(admin)).some(x => x.HanhDong === 'Tạo file hợp đồng') && plain(G.dsNhatKy(admin)).some(x => x.HanhDong === 'Tạo lại file hợp đồng'));


// ===== Hợp đồng (GĐ4): nhân bản, tạo hàng loạt =====
const hdNguon = G.luuHopDong(lan, { LoaiHD: 'Hợp đồng mua bán', TenDN: 'Công ty Nguồn', MaKH: khHD.MaKH, MST: '0311111111', NguoiDaiDien: 'Trần Văn B', ChucVu: 'TGĐ', SDT: '0900123456',
  SoTK: '111222', NganHang: 'ACB', VAT: 8, GhiChu: 'ghi chú gốc', NgayHieuLuc: '2026-01-01', NgayHetHan: '2026-12-31', TrangThai: 'Đang hiệu lực', SoDH: dhP.SoDH,
  lines: [{ MaHH: 'HH0001', TenHang: 'iPhone 16 Pro Max', DVT: 'Máy', SoLuong: 2, DonGia: 28200000 }] }).doc;
const nb1 = plain(G.nhanBanHopDong(lan, hdNguon.SoHD, 'Hợp đồng nguyên tắc', false));
assert.deepStrictEqual([nb1.nguon, nb1.doc.LoaiHD, nb1.doc.TrangThai, nb1.doc.TenDN, nb1.doc.NguoiDaiDien, nb1.doc.SDT, nb1.doc.VAT, nb1.doc.TongCong, nb1.doc.SoDH, nb1.doc.Ngay],
  [hdNguon.SoHD, 'Hợp đồng nguyên tắc', 'Soạn thảo', 'Công ty Nguồn', 'Trần Văn B', '0900123456', 8, 60912000, dhP.SoDH, today]);
assert.deepStrictEqual([nb1.doc.NgayHieuLuc, nb1.doc.NgayHetHan, nb1.doc.GhiChu, nb1.doc.FileId || '', nb1.doc.NguoiTao, 'lines' in nb1.doc], ['', '', '', '', 'Lan', false]);
assert.notStrictEqual(nb1.doc.SoHD, hdNguon.SoHD);
assert.deepStrictEqual(plain(G.layHopDong(lan, nb1.doc.SoHD).lines).map(l => [l.TenHang, l.SoLuong, l.DonGia, l.ThanhTien]), [['iPhone 16 Pro Max', 2, 28200000, 56400000]]);
assert.strictEqual(G.findObj_('HopDong', hdNguon.SoHD).TrangThai, 'Đang hiệu lực'); // hợp đồng gốc không bị đụng
// có tạo file: ra file đúng mẫu của loại mới, bảng hàng đúng
const nb2 = plain(G.nhanBanHopDong(lan, hdNguon.SoHD, 'Hợp đồng đại lý – phân phối', true));
assert.ok(nb2.doc.FileId && !nb2.loiFile && nb2.conSot.length === 0);
const idNb2 = idDe(nb2);
assert.ok(vanBan(idNb2).includes('HỢP ĐỒNG ĐẠI LÝ – PHÂN PHỐI') && vanBan(idNb2).includes('Số: ' + nb2.doc.SoHD) && vanBan(idNb2).includes('Công ty Nguồn'));
assert.ok(JSON.stringify(bangTrong(idNb2).map(t => t.rows.map(r => r.map(c => c.getText())))).includes('60.912.000'));
// không đổi loại: giữ loại gốc; đơn hàng gốc đã bị xóa thì không gắn nữa; nhân viên cũng nhân bản được
const dhTam = G.luuChungTu(admin, 'DH', { Ngay: today, MaKH: 'KH00001', TenKH: 'Anh Minh', VAT: 0, lines: [{ TenHang: 'x', SoLuong: 1, DonGia: 1 }] }).doc;
const hdTheoDon = G.luuHopDong(lan, Object.assign({}, hdMau, { SoDH: dhTam.SoDH })).doc;
G.xoaChungTu(admin, 'DH', dhTam.SoDH);
const nb3 = plain(G.nhanBanHopDong(lan, hdTheoDon.SoHD, '', false));
assert.deepStrictEqual([nb3.doc.LoaiHD, nb3.doc.SoDH], ['Hợp đồng mua bán', '']);
assert.throws(() => G.nhanBanHopDong(lan, 'khong-co', '', false), /Không tìm thấy hợp đồng/);
// tạo file hỏng (chưa cấp quyền / loại chưa có mẫu): hợp đồng vẫn được lập, báo loiFile
drive.thieuQuyen = true;
const nb4 = plain(G.nhanBanHopDong(lan, hdNguon.SoHD, '', true));
drive.thieuQuyen = false;
assert.ok(G.findObj_('HopDong', nb4.doc.SoHD) && /chưa được cấp quyền/.test(nb4.loiFile) && !nb4.doc.FileId);
const soHDtruocNb5 = sheets.PS_HopDong.rows.length;
assert.throws(() => G.nhanBanHopDong(lan, hdNguon.SoHD, 'Loại chưa có mẫu', true), /chưa có mẫu/); // loại không có mẫu bị chặn ngay lúc lập, không đẻ ra hợp đồng không tạo được file
assert.strictEqual(sheets.PS_HopDong.rows.length, soHDtruocNb5);
assert.ok(plain(G.dsNhatKy(admin)).some(x => x.HanhDong === 'Thêm hợp đồng' && x.DoiTuong === nb2.doc.SoHD));


// ===== Cải tiến sau khảo sát thị trường (1): báo trước + tự gia hạn, IMEI, CCCD, lịch sử, gia hạn một chạm =====
const cb = (o) => G.luuHopDong(lan, Object.assign({ LoaiHD: 'Hợp đồng mua bán', TenDN: 'Khách CB', VAT: 0, lines: [] }, o)).doc;
assert.deepStrictEqual([cb({ BaoTruocNgay: 400 }).BaoTruocNgay, cb({ BaoTruocNgay: -5 }).BaoTruocNgay, cb({ BaoTruocNgay: '45' }).BaoTruocNgay], [365, 0, 45]); // kẹp trong 0..365
assert.deepStrictEqual([cb({ TuGiaHan: true }).ThangGiaHan, cb({ TuGiaHan: '1', ThangGiaHan: 6 }).ThangGiaHan, cb({ TuGiaHan: '', ThangGiaHan: 0 }).TuGiaHan, cb({ TuGiaHan: 'x' }).TuGiaHan], [12, 6, '', '']); // tự gia hạn mà chưa nhập số tháng thì 12
const dongIM = [{ TenHang: 'iPhone 16', DVT: 'Máy', SoLuong: 2, DonGia: 28000000, IMEI: '356789012345671; f2lxk0abc9' }, { TenHang: 'Ốp', SoLuong: 1, DonGia: 100000 }];
assert.throws(() => cb({ lines: [{ TenHang: 'X', SoLuong: 1, DonGia: 1, IMEI: 'ab' }] }), /IMEI\/serial "AB" không hợp lệ/);
const hdIM = cb({ SoCCCD: '079123456789', CCCDCap: '01/01/2021 – CA TP.HCM', lines: dongIM });
assert.deepStrictEqual([hdIM.IMEI, hdIM.SoCCCD, plain(G.layHopDong(lan, hdIM.SoHD).lines).map(l => l.IMEI)], ['356789012345671, F2LXK0ABC9', '079123456789', ['356789012345671, F2LXK0ABC9', '']]);
// Các trường mới nằm trong file: đổi thì file cũ; tạo file có đủ câu về gia hạn, báo trước, CCCD, IMEI
const hdBT = cb({ TuGiaHan: '1', ThangGiaHan: 6, BaoTruocNgay: 45, SoCCCD: '079123456789', CCCDCap: '01/01/2021 – CA TP.HCM', NgayHieuLuc: '2026-01-01', NgayHetHan: '2026-12-31', lines: dongIM });
const vbBT = vanBan(idDe(G.taoFileHopDong(lan, hdBT.SoHD)));
assert.ok(vbBT.includes('tự động gia hạn thêm 6 tháng mỗi lần') && vbBT.includes('Thời hạn báo trước khi chấm dứt hoặc không gia hạn: 45 ngày') && vbBT.includes('CCCD/CMND (nếu là cá nhân): 079123456789 – cấp: 01/01/2021 – CA TP.HCM'), vbBT.slice(0, 300));
assert.ok(JSON.stringify(bangTrong(idDe({ doc: hdBT })).map(x => x.rows.map(r => r.map(c => c.getText())))).includes('iPhone 16 – IMEI/serial: 356789012345671, F2LXK0ABC9'));
assert.ok(vbBT.includes('Bảo vệ dữ liệu cá nhân'));
assert.strictEqual(G.luuHopDong(lan, Object.assign({}, hdBT, { BaoTruocNgay: 60 })).doc.FileCu, '1');
const vbKhongTG = vanBan(idDe(G.taoFileHopDong(lan, cb({ NgayHieuLuc: '2026-01-01', NgayHetHan: '2026-12-31' }).SoHD)));
assert.ok(vbKhongTG.includes('không tự động gia hạn, muốn tiếp tục phải ký phụ lục hoặc hợp đồng mới') && vbKhongTG.includes('báo trước khi chấm dứt hoặc không gia hạn: ………………'));
// Gia hạn một chạm
const hdGH = cb({ TrangThai: 'Đang hiệu lực', NgayHieuLuc: '2026-01-31', NgayHetHan: '2026-01-31' });
assert.strictEqual(G.giaHanHopDong(lan, hdGH.SoHD, 1).doc.NgayHetHan, '2026-02-28'); // cuối tháng
assert.strictEqual(G.giaHanHopDong(lan, hdGH.SoHD, 12).doc.NgayHetHan, '2027-02-28');
assert.throws(() => G.giaHanHopDong(lan, hdGH.SoHD, 0), /từ 1 đến 120/);
assert.throws(() => G.giaHanHopDong(lan, hdGH.SoHD, 121), /từ 1 đến 120/);
assert.throws(() => G.giaHanHopDong(lan, 'khong-co', 6), /Không tìm thấy/);
assert.throws(() => G.giaHanHopDong(lan, cb({ NgayHetHan: '2026-12-31' }).SoHD, 6), /đang hiệu lực/);
assert.throws(() => G.giaHanHopDong(lan, cb({ TrangThai: 'Đang hiệu lực' }).SoHD, 6), /chưa có ngày hết hạn/);
const hdGHFile = cb({ TrangThai: 'Đang hiệu lực', NgayHetHan: '2026-12-31', lines: [] });
G.taoFileHopDong(lan, hdGHFile.SoHD);
const gh = plain(G.giaHanHopDong(lan, hdGHFile.SoHD, 6));
assert.deepStrictEqual([gh.doc.NgayHetHan, gh.doc.FileCu, gh.doc.FileId, gh.doc.LinkFile], ['2027-06-30', '1', '1', '']); // ngày hết hạn có trong file nên file cũ; nhân viên không thấy link
assert.deepStrictEqual(plain(G.luuHopDong(lan, Object.assign({}, gh.doc, { lines: [] })).doc.TrangThai), 'Đang hiệu lực');
// Lịch sử theo hợp đồng
const ls = plain(G.lichSuHopDong(lan, hdGHFile.SoHD));
assert.deepStrictEqual(ls.map(x => x.HanhDong), ['Sửa hợp đồng', 'Gia hạn hợp đồng', 'Tạo file hợp đồng', 'Thêm hợp đồng']);
assert.ok(ls.every(x => x.DoiTuong === hdGHFile.SoHD) && /thêm 6 tháng: 2026-12-31 → 2027-06-30/.test(ls[1].ChiTiet) && ls[1].NguoiDung.includes('lan.nguyen'));
assert.deepStrictEqual(plain(G.lichSuHopDong(lan, 'khong-co')), []);
// hanHD ở máy chủ (nhắc việc) và ở giao diện (Index.html) phải cho cùng kết quả
for (const homNay of ['2026-10-05', '2026-03-01', '2027-01-01']) {
  const gd = vm.runInNewContext('const HD_SAP = 30, today = () => ' + JSON.stringify(homNay) + ';\n' + require('fs').readFileSync(require('path').join(__dirname, '..', 'apps-script', 'Index.html'), 'utf8').match(/function hanHD\(h\) \{[\s\S]*?\r?\n\}\r?\n/)[0] + '\nhanHD');
  for (const bao of [0, 7, 30, 60, 90]) for (let off = -40; off <= 160; off += 3) for (const tt of ['Đang hiệu lực', 'Soạn thảo', 'Hoàn thành']) {
    const d = new Date(Date.parse(homNay) + off * 864e5).toISOString().slice(0, 10), h = { TrangThai: tt, NgayHetHan: d, BaoTruocNgay: bao };
    assert.deepStrictEqual(plain(G.hanHD_(h, homNay)), plain(gd(h)), JSON.stringify([homNay, h]));
  }
  assert.strictEqual(G.hanHD_({ TrangThai: 'Đang hiệu lực', NgayHetHan: '' }, homNay), null);
}
assert.deepStrictEqual(plain(G.hanHD_({ TrangThai: 'Đang hiệu lực', NgayHetHan: '2026-12-01', BaoTruocNgay: 60 }, '2026-10-05')), { sap: true, n: 57, bao: 60, quyetDinh: -3 }); // đã quá hạn phải báo 3 ngày
assert.deepStrictEqual(plain(G.hanHD_({ TrangThai: 'Đang hiệu lực', NgayHetHan: '2026-12-31', BaoTruocNgay: 60 }, '2026-10-05')), null); // còn 87 ngày > 60 + 14


// ===== Cải tiến (2): lịch thanh toán / trả góp =====
const hdTG = cb({ LoaiHD: 'Hợp đồng mua bán trả góp', TenDN: 'Anh Minh', MaKH: 'KH00001', SoDH: dhP.SoDH, VAT: 0, lines: [{ TenHang: 'iPhone 16', DVT: 'Máy', SoLuong: 1, DonGia: 30000000, IMEI: '356789012345679' }] });
const lichTG = [{ Nhan: 'Trả trước', NgayDen: '2026-10-05', SoTien: 10000000 }, { Nhan: 'Kỳ 1/2', NgayDen: '2026-11-05', SoTien: 10000000 }, { Nhan: 'Kỳ 2/2', NgayDen: '2026-12-05', SoTien: 10000000 }];
assert.throws(() => G.luuLichHopDong(lan, 'khong-co', lichTG), /Không tìm thấy hợp đồng/);
assert.throws(() => G.luuLichHopDong(lan, hdTG.SoHD, [{ Nhan: 'x', NgayDen: '2026-02-30', SoTien: 1 }]), /ngày đến hạn không hợp lệ/);
assert.throws(() => G.luuLichHopDong(lan, hdTG.SoHD, [{ Nhan: 'x', NgayDen: '2026-11-05', SoTien: 0 }]), /số tiền phải lớn hơn 0/);
assert.throws(() => G.luuLichHopDong(lan, hdTG.SoHD, Array.from({ length: 37 }, () => ({ NgayDen: '2026-11-05', SoTien: 1 }))), /Tối đa 36/);
assert.deepStrictEqual(plain(G.layHopDong(lan, hdTG.SoHD).lich), []); // lỗi thì không ghi gì
// Lưu lịch: nhập lộn xộn vẫn được sắp theo ngày đến hạn và đánh số lại
const lt = plain(G.luuLichHopDong(lan, hdTG.SoHD, [lichTG[2], lichTG[0], { NgayDen: '2026-11-05', SoTien: '10000000' }]).lich);
assert.deepStrictEqual(lt.map(r => [r.Dot, r.Nhan, r.NgayDen, r.SoTien]), [[1, 'Trả trước', '2026-10-05', 10000000], [2, 'Đợt 3', '2026-11-05', 10000000], [3, 'Kỳ 2/2', '2026-12-05', 10000000]]);
G.luuLichHopDong(lan, hdTG.SoHD, lichTG);
assert.deepStrictEqual(plain(G.layHopDong(lan, hdTG.SoHD).lich).map(r => [r.Dot, r.Nhan, r.SoPT]), [[1, 'Trả trước', ''], [2, 'Kỳ 1/2', ''], [3, 'Kỳ 2/2', '']]);
assert.strictEqual(G.taiDuLieu(lan).hopDongLich.filter(r => r.SoHD === hdTG.SoHD).length, 3);
// Hợp đồng chưa gắn đơn hàng thì chưa ghi nhận thu được (để công nợ khớp)
const hdKhongDon = cb({ LoaiHD: 'Hợp đồng mua bán trả góp', TenDN: 'Anh Minh', MaKH: 'KH00001', lines: [] });
G.luuLichHopDong(lan, hdKhongDon.SoHD, [lichTG[0]]);
assert.throws(() => G.thuDotHopDong(lan, hdKhongDon.SoHD, 1, {}), /Gắn hợp đồng với một đơn hàng/);
// Ghi nhận thu một đợt: tạo phiếu thu theo đơn hàng, đánh dấu đợt, nhân viên làm được
const soPTtruoc = sheets.PS_ThuTien.rows.length;
const thu1 = plain(G.thuDotHopDong(lan, hdTG.SoHD, 1, { Ngay: today, HinhThuc: 'Chuyển khoản', GhiChu: 'qua QR' }));
assert.strictEqual(sheets.PS_ThuTien.rows.length, soPTtruoc + 1);
assert.deepStrictEqual([thu1.phieu.SoDH, thu1.phieu.MaKH, thu1.phieu.SoTien, thu1.phieu.HinhThuc, thu1.phieu.NguoiTao, thu1.phieu.GhiChu], [dhP.SoDH, 'KH00001', 10000000, 'Chuyển khoản', 'Lan', `Hợp đồng ${hdTG.SoHD} – Trả trước – qua QR`]);
assert.deepStrictEqual(thu1.lich.map(r => [r.Dot, r.SoPT, r.NgayThu]), [[1, thu1.phieu.SoPT, today], [2, '', ''], [3, '', '']]);
assert.throws(() => G.thuDotHopDong(lan, hdTG.SoHD, 1, {}), /đã thu \(phiếu/);
assert.throws(() => G.thuDotHopDong(lan, hdTG.SoHD, 9, {}), /Không tìm thấy đợt 9/);
assert.strictEqual(sheets.PS_ThuTien.rows.length, soPTtruoc + 1); // lỗi thì không tạo thêm phiếu
// Đợt đã thu không đổi, không bỏ được; đợt chưa thu thêm/bớt/sửa tự do khi hợp đồng còn là bản nháp
assert.throws(() => G.luuLichHopDong(lan, hdTG.SoHD, lichTG.slice(1)), /Không bỏ được đợt đã thu/);
assert.throws(() => G.luuLichHopDong(lan, hdTG.SoHD, [{ SoPT: 'PT-khong-co' }, lichTG[1]]), /không khớp/);
const dsDaThu = thu1.lich.slice();
const lichSua = plain(G.luuLichHopDong(lan, hdTG.SoHD, [Object.assign({}, dsDaThu[0], { SoTien: 1, NgayDen: '2030-01-01' }), { Nhan: 'Kỳ 1/2', NgayDen: '2026-11-20', SoTien: 12000000 }, { Nhan: 'Kỳ 2/2', NgayDen: '2026-12-20', SoTien: 8000000 }]).lich);
assert.deepStrictEqual(lichSua.map(r => [r.Dot, r.SoTien, r.NgayDen, !!r.SoPT]), [[1, 10000000, '2026-10-05', true], [2, 12000000, '2026-11-20', false], [3, 8000000, '2026-12-20', false]]); // đợt đã thu giữ nguyên như đã lưu
// Hợp đồng đã ký: nhân viên không đổi lịch chưa thu nhưng vẫn ghi nhận thu; quản trị đổi được
G.luuHopDong(lan, Object.assign({}, G.findObj_('HopDong', hdTG.SoHD), { TrangThai: 'Đang hiệu lực', lines: plain(G.layHopDong(lan, hdTG.SoHD).lines) }));
assert.throws(() => G.luuLichHopDong(lan, hdTG.SoHD, lichSua.map(r => Object.assign({}, r, r.SoPT ? {} : { SoTien: r.SoTien + 1 }))), /chỉ quản trị được đổi lịch/);
assert.strictEqual(plain(G.luuLichHopDong(lan, hdTG.SoHD, lichSua)).lich.length, 3); // không đổi gì thì không bị chặn
assert.strictEqual(plain(G.luuLichHopDong(admin, hdTG.SoHD, lichSua.map(r => Object.assign({}, r, r.SoPT ? {} : { SoTien: r.SoTien + 1 })))).lich[1].SoTien, 12000001);
G.luuLichHopDong(admin, hdTG.SoHD, lichSua);
assert.strictEqual(plain(G.thuDotHopDong(lan, hdTG.SoHD, 2, {})).phieu.SoTien, 12000000);
// Hủy thu (quản trị): xóa phiếu, đưa đợt về chưa thu; hợp đồng đã thu thì không xóa được
assert.throws(() => G.huyThuDotHopDong(lan, hdTG.SoHD, 2), /quản trị/);
assert.throws(() => G.xoaHopDong(admin, hdTG.SoHD), /đã ghi nhận thu tiền/);
const soPT2 = G.findObj_('ThuTien', plain(G.layHopDong(lan, hdTG.SoHD).lich)[1].SoPT).SoPT;
assert.strictEqual(plain(G.huyThuDotHopDong(admin, hdTG.SoHD, 2).soPT), soPT2);
assert.deepStrictEqual([G.findObj_('ThuTien', soPT2), plain(G.layHopDong(lan, hdTG.SoHD).lich)[1].SoPT], [null, '']);
assert.throws(() => G.huyThuDotHopDong(admin, hdTG.SoHD, 2), /chưa thu tiền/);
// Tạo file từ mẫu trả góp: bảng lịch, số kỳ, tổng; sửa lịch thì file cũ, ghi nhận thu thì không
const vbTG = vanBan(idDe(G.taoFileHopDong(lan, hdTG.SoHD)));
const lichBang = plain(bangTrong(G.findObj_('HopDong', hdTG.SoHD).FileId).filter(x => x.rows[0][0].getText() === 'Đợt')[0].rows.map(r => r.map(c => c.getText())));
assert.deepStrictEqual(lichBang, [['Đợt', 'Nội dung', 'Ngày đến hạn', 'Số tiền (đồng)'], ['1', 'Trả trước', '05/10/2026', '10.000.000'], ['2', 'Kỳ 1/2', '20/11/2026', '12.000.000'], ['3', 'Kỳ 2/2', '20/12/2026', '8.000.000'], ['', 'Tổng cộng', '', '30.000.000']]);
assert.ok(vbTG.includes('HỢP ĐỒNG MUA BÁN TRẢ GÓP') && vbTG.includes('Số tiền trả trước: 10.000.000 đồng; số kỳ trả góp: 2; tổng các đợt: 30.000.000 đồng.') && !vbTG.includes('{{'));
assert.ok(JSON.stringify(bangTrong(G.findObj_('HopDong', hdTG.SoHD).FileId).map(x => x.rows.map(r => r.map(c => c.getText())))).includes('iPhone 16 – IMEI/serial: 356789012345679'));
assert.strictEqual(G.findObj_('HopDong', hdTG.SoHD).FileCu, '');
G.thuDotHopDong(lan, hdTG.SoHD, 2, {});
assert.strictEqual(G.findObj_('HopDong', hdTG.SoHD).FileCu, ''); // ghi nhận thu không làm file cũ
G.luuLichHopDong(admin, hdTG.SoHD, plain(G.layHopDong(lan, hdTG.SoHD).lich).concat([{ Nhan: 'Kỳ 3', NgayDen: '2027-01-20', SoTien: 5 }]));
assert.strictEqual(G.findObj_('HopDong', hdTG.SoHD).FileCu, '1');
assert.ok(vanBan(idDe(G.taoFileHopDong(lan, cb({ LoaiHD: 'Hợp đồng mua bán trả góp', lines: [] }).SoHD))).includes('(Chưa lập lịch thanh toán: hai bên thỏa thuận bằng phụ lục)'));
// Hợp đồng chưa thu đợt nào: xóa được, lịch bị xóa theo
G.xoaHopDong(admin, hdKhongDon.SoHD);
assert.strictEqual(rowsOf('PS_HopDongLich', hdKhongDon.SoHD).length, 0);
assert.ok(['Sửa lịch thanh toán', 'Thu đợt hợp đồng', 'Hủy thu đợt hợp đồng'].every(h => plain(G.dsNhatKy(admin)).some(x => x.HanhDong === h && x.DoiTuong === hdTG.SoHD)));
// Tình trạng đợt: máy chủ (nhắc việc) và giao diện (Index.html) cho cùng kết quả
const htNoi = vm.runInNewContext('const today = () => "2026-10-05";\n' + require('fs').readFileSync(require('path').join(__dirname, '..', 'apps-script', 'Index.html'), 'utf8').match(/function trangThaiDot\(r\) \{[\s\S]*?\r?\n\}\r?\n/)[0] + '\ntrangThaiDot');
for (let off = -15; off <= 20; off++) for (const so of ['', 'PT1']) {
  const r = { SoPT: so, NgayDen: new Date(Date.parse('2026-10-05') + off * 864e5).toISOString().slice(0, 10) };
  assert.strictEqual(G.trangThaiDot_(r, '2026-10-05'), htNoi(r), JSON.stringify(r));
}
assert.deepStrictEqual(['2026-10-04', '2026-10-05', '2026-10-12', '2026-10-13'].map(d => G.trangThaiDot_({ SoPT: '', NgayDen: d }, '2026-10-05')), ['quahan', 'sap', 'sap', 'cho']);


// ===== Cải tiến (3): ký tại quầy =====
const zlib = require('zlib');
const taoPng = (w, h, seed) => { // PNG RGBA có tính xác định, đủ lớn để qua kiểm tra "ảnh trống"
  const raw = Buffer.alloc((w * 4 + 1) * h); let x = seed;
  for (let i = 0; i < raw.length; i++) { x = (x * 1103515245 + 12345) & 0x7fffffff; raw[i] = i % (w * 4 + 1) === 0 ? 0 : (x >> 16) & 255; }
  const chunk = (tn, d) => { const b = Buffer.alloc(12 + d.length); b.writeUInt32BE(d.length, 0); b.write(tn, 4, 'ascii'); d.copy(b, 8); b.writeUInt32BE(zlib.crc32(Buffer.concat([Buffer.from(tn, 'ascii'), d])) >>> 0, 8 + d.length); return b; };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
};
const pngKy = 'data:image/png;base64,' + taoPng(60, 40, 1).toString('base64');
const hdKyT = cb({ LoaiHD: 'Hợp đồng mua bán', TenDN: 'Khách Ký Tay', NguoiDaiDien: 'Trần Thị Ký', lines: [{ TenHang: 'Máy K', DVT: 'Máy', SoLuong: 1, DonGia: 5000000 }] });
G.luuLichHopDong(lan, hdKyT.SoHD, [{ Nhan: 'Đợt 1', NgayDen: '2026-12-01', SoTien: 5000000 }]);
assert.throws(() => G.kyHopDong(lan, 'khong-co', pngKy, 'A'), /Không tìm thấy hợp đồng/);
assert.throws(() => G.kyHopDong(lan, hdKyT.SoHD, pngKy, 'Trần Thị Ký'), /Tạo file hợp đồng trước/);
G.taoFileHopDong(lan, hdKyT.SoHD);
assert.throws(() => G.kyHopDong(lan, hdKyT.SoHD, pngKy, '  '), /họ tên người ký/);
assert.throws(() => G.kyHopDong(lan, hdKyT.SoHD, 'data:image/png;base64,iVBORw0KGgo=', 'A'), /Chưa có chữ ký/); // ảnh quá nhỏ = trống
assert.throws(() => G.kyHopDong(lan, hdKyT.SoHD, Buffer.alloc(900, 7).toString('base64'), 'A'), /Chưa có chữ ký/); // không phải PNG
assert.throws(() => G.kyHopDong(lan, hdKyT.SoHD, '@@@', 'A'), /không hợp lệ/);
assert.throws(() => G.kyHopDong(lan, hdKyT.SoHD, 'A'.repeat(400001), 'A'), /quá lớn/);
G.luuHopDong(lan, Object.assign({}, G.findObj_('HopDong', hdKyT.SoHD), { GhiChu: 'đổi sau khi tạo file', lines: plain(G.layHopDong(lan, hdKyT.SoHD).lines) }));
assert.throws(() => G.kyHopDong(lan, hdKyT.SoHD, pngKy, 'Trần Thị Ký'), /đã cũ so với nội dung hiện tại/); // khách phải ký đúng bản đã xem
G.taoFileHopDong(lan, hdKyT.SoHD);
const soDocTruocKy = [...drive.files.values()].filter(f => !f.trashed).length;
const ky1 = plain(G.kyHopDong(lan, hdKyT.SoHD, pngKy, 'Trần Thị Ký'));
const hdSauKy = G.findObj_('HopDong', hdKyT.SoHD), pngLuu = drive.files.get(hdSauKy.KyFileId);
assert.deepStrictEqual([ky1.doc.TrangThai, ky1.doc.KyFileId, ky1.doc.FileCu, ky1.loiFile, /^[0-9A-F]{64}$/.test(ky1.ma), hdSauKy.NguoiKy], ['Đang hiệu lực', '1', '', undefined, true, 'Trần Thị Ký']); // nhân viên chỉ thấy cờ
assert.deepStrictEqual([pngLuu.mime, pngLuu.bytes.length > 600, tenThuMuc(hdSauKy.KyFileId), hdSauKy.MaXacThuc], ['image/png', true, 'Hợp đồng - phuonghihi', ky1.ma]);
const fileKy = idDe(ky1);
assert.ok(docs.get(fileKy).body.getImages().length === 1 && vanBan(fileKy).includes('Đã ký điện tử: Trần Thị Ký – ') && vanBan(fileKy).includes('Mã xác thực ' + ky1.ma.slice(0, 4) + '-') && !vanBan(fileKy).includes('{{'));
assert.ok(vanBan(fileKy).includes('Hai bên đồng ý hợp đồng có thể được ký bằng chữ ký điện tử'));
assert.throws(() => G.kyHopDong(lan, hdKyT.SoHD, pngKy, 'Trần Thị Ký'), /đã có chữ ký điện tử/);
assert.strictEqual(G.taiDuLieu(lan).hopDong.find(h => h.SoHD === hdKyT.SoHD).KyFileId, '1');
// Sau khi ký: nội dung đã ký bị khóa với mọi người (kể cả quản trị); gia hạn, ghi chú, người phụ trách, trạng thái vẫn sửa được
const dayDu = Object.assign({}, G.findObj_('HopDong', hdKyT.SoHD), { lines: plain(G.layHopDong(lan, hdKyT.SoHD).lines) });
for (const ai of [lan, admin]) {
  assert.throws(() => G.luuHopDong(ai, Object.assign({}, dayDu, { DiaChi: 'Địa chỉ mới' })), /đã có chữ ký điện tử/);
  assert.throws(() => G.luuHopDong(ai, Object.assign({}, dayDu, { lines: [{ TenHang: 'Máy K', SoLuong: 1, DonGia: 4000000 }] })), /đã có chữ ký điện tử/);
  assert.throws(() => G.luuHopDong(ai, Object.assign({}, dayDu, { VAT: 5 })), /đã có chữ ký điện tử/);
}
assert.throws(() => G.luuLichHopDong(admin, hdKyT.SoHD, [{ Nhan: 'Đợt 1', NgayDen: '2026-12-02', SoTien: 5000000 }]), /đã có chữ ký điện tử/);
assert.strictEqual(plain(G.luuLichHopDong(admin, hdKyT.SoHD, plain(G.layHopDong(lan, hdKyT.SoHD).lich)).lich).length, 1); // gửi lại y nguyên thì không bị chặn
const sauKy = G.luuHopDong(lan, Object.assign({}, dayDu, { GhiChu: 'ghi chú mới', NguoiPhuTrach: 'An', NgayHetHan: '2027-06-30', TrangThai: 'Hoàn thành' })).doc;
assert.deepStrictEqual([sauKy.GhiChu, sauKy.TrangThai, sauKy.KyFileId], ['ghi chú mới', 'Hoàn thành', '1']);
assert.throws(() => G.giaHanHopDong(lan, hdKyT.SoHD, 1), /đang hiệu lực/); // đã hoàn thành thì không gia hạn
G.luuHopDong(lan, Object.assign({}, dayDu, { TrangThai: 'Đang hiệu lực', NgayHetHan: '2027-06-30' }));
assert.strictEqual(plain(G.giaHanHopDong(lan, hdKyT.SoHD, 1)).doc.NgayHetHan, '2027-07-30'); // gia hạn không làm mất chữ ký
// Kiểm tra chữ ký: đúng, rồi bị phát hiện khi nội dung hoặc ảnh bị sửa thẳng trong Sheet / Drive
assert.deepStrictEqual(plain(G.xacThucChuKyHopDong(lan, hdPT.SoHD)), { coChuKy: false }); // hợp đồng chưa ký
const xt = plain(G.xacThucChuKyHopDong(lan, hdKyT.SoHD));
assert.deepStrictEqual([xt.coChuKy, xt.hopLe, xt.nguoi, /^[0-9A-F]{4}(-[0-9A-F]{4}){3}$/.test(xt.ma), xt.lyDo], [true, true, 'Trần Thị Ký', true, '']);
const hdKyRow = sheets.PS_HopDong.rows.findIndex(r => r[0] === hdKyT.SoHD), cDC = sheets.PS_HopDong.rows[0].indexOf('DiaChi'), diaCu = sheets.PS_HopDong.rows[hdKyRow][cDC];
sheets.PS_HopDong.rows[hdKyRow][cDC] = 'Địa chỉ bị sửa lén';
assert.deepStrictEqual([plain(G.xacThucChuKyHopDong(lan, hdKyT.SoHD)).hopLe, plain(G.xacThucChuKyHopDong(lan, hdKyT.SoHD)).lyDo], [false, 'Nội dung hợp đồng hoặc ảnh chữ ký đã thay đổi sau khi ký.']);
sheets.PS_HopDong.rows[hdKyRow][cDC] = diaCu;
assert.strictEqual(plain(G.xacThucChuKyHopDong(lan, hdKyT.SoHD)).hopLe, true);
const bytesGoc = pngLuu.bytes; pngLuu.bytes = [1, 2, 3];
assert.strictEqual(plain(G.xacThucChuKyHopDong(lan, hdKyT.SoHD)).hopLe, false);
pngLuu.bytes = bytesGoc;
// Hủy chữ ký (quản trị): xóa ảnh, file cũ, sửa được nội dung và ký lại được
assert.throws(() => G.huyChuKyHopDong(lan, hdKyT.SoHD), /quản trị/);
assert.throws(() => G.huyChuKyHopDong(admin, hdPT.SoHD), /chưa có chữ ký/);
const huy = plain(G.huyChuKyHopDong(admin, hdKyT.SoHD)).doc;
assert.deepStrictEqual([huy.KyFileId, huy.NguoiKy, huy.MaXacThuc, huy.FileCu, !!pngLuu.trashed], ['', '', '', '1', true]);
assert.strictEqual(G.luuHopDong(lan, Object.assign({}, dayDu, { DiaChi: 'Địa chỉ đã sửa', TrangThai: 'Đang hiệu lực' })).doc.DiaChi, 'Địa chỉ đã sửa');
G.taoFileHopDong(lan, hdKyT.SoHD);
const ky2 = plain(G.kyHopDong(lan, hdKyT.SoHD, 'data:image/png;base64,' + taoPng(60, 40, 2).toString('base64'), 'Trần Thị Ký'));
assert.notStrictEqual(ky2.ma, ky1.ma); // nội dung và ảnh đã khác
assert.strictEqual(plain(G.xacThucChuKyHopDong(lan, hdKyT.SoHD)).hopLe, true);
const pngMoi = G.findObj_('HopDong', hdKyT.SoHD).KyFileId;
G.xoaHopDong(admin, hdKyT.SoHD); // xóa hợp đồng cũng đưa ảnh chữ ký vào thùng rác
assert.strictEqual(drive.files.get(pngMoi).trashed, true);
assert.ok(['Ký điện tử hợp đồng', 'Hủy chữ ký điện tử'].every(h => plain(G.dsNhatKy(admin)).some(x => x.HanhDong === h && x.DoiTuong === hdKyT.SoHD)));
// Mẫu mặc định đều có chỗ ký điện tử
G.readTable_('MauHopDong').forEach(m => { const vb = vanBan(G.idTuLink_(m.LinkMau)); assert.ok(vb.includes('{{CHUKYA}}') && vb.includes('{{XACTHUCKYA}}'), m.LoaiHD); });
// Mẫu riêng không có {{CHUKYA}}: hình chữ ký và dòng xác thực được thêm ở cuối file
const mauKhongKy = G.DocumentApp.create('Mẫu không chỗ ký'); mauKhongKy.getBody().appendParagraph('Hợp đồng {{TENDOANHNGHIEP}}');
G.DriveApp.getFileById(mauKhongKy.getId()).moveTo(G.DriveApp.getFolderById(thuMucHD.id));
G.luuMauHopDong(admin, { LoaiHD: 'Mẫu không chỗ ký', LinkMau: mauKhongKy.getUrl() });
const hdMK = cb({ LoaiHD: 'Mẫu không chỗ ký', TenDN: 'Khách MK', lines: [] });
G.taoFileHopDong(lan, hdMK.SoHD);
G.kyHopDong(lan, hdMK.SoHD, pngKy, 'Khách MK');
const fMK = G.findObj_('HopDong', hdMK.SoHD).FileId;
assert.ok(docs.get(fMK).body.getImages().length === 1 && vanBan(fMK).includes('Chữ ký điện tử của Bên A:') && vanBan(fMK).includes('Đã ký điện tử: Khách MK'));
G.xoaMauHopDong(admin, 'Mẫu không chỗ ký');

// ===== Cải tiến (4): email tổng hợp mỗi sáng =====
const { thuMail } = require('./chay-thu');
const ngayTu = n => new Date(Date.parse(today) + n * 864e5).toISOString().slice(0, 10);
G.taiDuLieu(admin); // đang ở cửa hàng phone
assert.deepStrictEqual(plain(G.taiDuLieu(admin).emailSang), { bat: false, gio: 7, den: [] });
assert.strictEqual(G.taiDuLieu(lan).emailSang, null); // nhân viên không thấy cấu hình
assert.throws(() => G.luuEmailSang(lan, { bat: true, gio: 7 }), /quản trị/);
assert.throws(() => G.luuEmailSang(admin, { bat: true, gio: 7, den: 'khong-phai-email' }), /Email không hợp lệ: khong-phai-email/);
assert.throws(() => G.luuEmailSang(admin, { bat: true, gio: 7, den: 'a@x.com,b@x.com,c@x.com,d@x.com,e@x.com,f@x.com' }), /tối đa 5/);
assert.throws(() => G.luuEmailSang(admin, { bat: true, gio: 3 }), /từ 5 đến 22/);
assert.throws(() => G.luuEmailSang(admin, { bat: true }), /từ 5 đến 22/);
assert.strictEqual(thuMail.henGio.length, 0); // lỗi nhập thì chưa đặt hẹn giờ
// Chưa cấp quyền hẹn giờ: báo cách xử lý và hoàn lại cấu hình (chưa có khóa thì xóa khóa)
thuMail.thieuQuyen = true;
assert.throws(() => G.luuEmailSang(admin, { bat: true, gio: 7 }), /chạy hàm caiDat một lần/);
thuMail.thieuQuyen = false;
assert.ok(!sheets.CaiDat.rows.some(r => r[0] === 'emailSang.phone'), 'Lỗi hẹn giờ thì không để lại cấu hình');
// Bật: lưu cấu hình, đúng một bộ hẹn giờ hằng ngày; email trùng gộp lại
assert.deepStrictEqual(plain(G.luuEmailSang(admin, { bat: true, gio: '6', den: 'a@x.com, b@y.com; a@x.com' })), { bat: true, gio: 6, den: ['a@x.com', 'b@y.com'] });
assert.deepStrictEqual(thuMail.henGio.map(t => [t.ham, t.moiNgay, t.gio, t.mui]), [['guiEmailSang', 1, 6, 'Asia/Ho_Chi_Minh']]);
assert.deepStrictEqual(plain(G.taiDuLieu(admin).emailSang), { bat: true, gio: 6, den: ['a@x.com', 'b@y.com'] });
G.luuEmailSang(admin, { bat: true, gio: 8, den: '' }); // đổi giờ: thay bộ hẹn giờ cũ, không nhân đôi
assert.deepStrictEqual(thuMail.henGio.map(t => t.gio), [8]);
thuMail.thieuQuyen = true; // chưa cấp quyền khi sửa: cấu hình cũ (giờ 8) được giữ
assert.throws(() => G.luuEmailSang(admin, { bat: true, gio: 9 }), /chạy hàm caiDat/);
thuMail.thieuQuyen = false;
assert.strictEqual(G.taiDuLieu(admin).emailSang.gio, 8);
assert.ok(sheets.CaiDat.rows.filter(r => r[0] === 'emailSang.phone').length === 1);
G.luuEmailSang(admin, { bat: false, gio: 8 });
assert.strictEqual(thuMail.henGio.length, 0);
assert.ok(G.readTable_('NhatKy').some(x => x.HanhDong === 'Tắt email tổng hợp sáng') && G.readTable_('NhatKy').some(x => x.HanhDong === 'Bật email tổng hợp sáng' && /a@x\.com, b@y\.com|lúc 6 giờ/.test(x.ChiTiet)));

// Dữ liệu thử: hợp đồng sắp/quá hạn, đợt thanh toán, đơn quá hạn giao, hàng sắp hết
const tenLa = 'Công ty <A&B> "x"';
const hdSap = G.luuHopDong(admin, { LoaiHD: 'Hợp đồng mua bán', TenDN: tenLa, TrangThai: 'Đang hiệu lực', NgayHieuLuc: ngayTu(-300), NgayHetHan: ngayTu(10), BaoTruocNgay: 20, TuGiaHan: '1', VAT: 0, lines: [] }).doc;
const hdQua = G.luuHopDong(admin, { LoaiHD: 'Hợp đồng mua bán', TenDN: 'Khách Quá Hạn', TrangThai: 'Đang hiệu lực', NgayHetHan: ngayTu(-3), VAT: 0, lines: [] }).doc;
const hdXa = G.luuHopDong(admin, { LoaiHD: 'Hợp đồng mua bán', TenDN: 'Khách Còn Lâu', TrangThai: 'Đang hiệu lực', NgayHetHan: ngayTu(200), VAT: 0, lines: [] }).doc;
const hdNhap = G.luuHopDong(admin, { LoaiHD: 'Hợp đồng mua bán', TenDN: 'Khách Soạn Thảo', TrangThai: 'Soạn thảo', NgayHetHan: ngayTu(5), VAT: 0, lines: [] }).doc;
const dhE = G.luuChungTu(admin, 'DH', { Ngay: ngayTu(-20), NgayGiao: ngayTu(-1), MaKH: 'KH00001', TenKH: 'Anh Minh', VAT: 0, lines: [{ TenHang: 'Dịch vụ E', DVT: 'Gói', SoLuong: 1, DonGia: 12000000 }] }).doc;
const dhGiaoSau = G.luuChungTu(admin, 'DH', { Ngay: ngayTu(-2), NgayGiao: ngayTu(3), MaKH: 'KH00001', TenKH: 'Anh Minh', VAT: 0, lines: [{ TenHang: 'Dịch vụ F', DVT: 'Gói', SoLuong: 1, DonGia: 1000000 }] }).doc;
const hdLich = G.luuHopDong(admin, { LoaiHD: 'Hợp đồng mua bán trả góp', TenDN: 'Anh Minh', MaKH: 'KH00001', SoDH: dhE.SoDH, TrangThai: 'Đang hiệu lực', VAT: 0, lines: [{ TenHang: 'Dịch vụ E', DVT: 'Gói', SoLuong: 1, DonGia: 12000000 }] }).doc;
G.luuLichHopDong(admin, hdLich.SoHD, [{ Nhan: 'Kỳ A', NgayDen: ngayTu(-2), SoTien: 3000000 }, { Nhan: 'Kỳ B', NgayDen: ngayTu(-1), SoTien: 3000000 }, { Nhan: 'Kỳ C', NgayDen: ngayTu(5), SoTien: 3000000 }, { Nhan: 'Kỳ D', NgayDen: ngayTu(30), SoTien: 3000000 }]);
G.thuDotHopDong(admin, hdLich.SoHD, 2, { Ngay: today, HinhThuc: 'Tiền mặt' }); // Kỳ B đã thu: không nằm trong danh sách cần thu
const hangThap = G.luuHang(admin, { TenHang: 'Ốp thử hết', GiaLe: 100000, TonToiThieu: 5 }); // chưa có phiếu kho nhưng có mức tối thiểu
const hangVua = G.luuHang(admin, { TenHang: 'Cáp thử còn 3', GiaLe: 100000, TonToiThieu: 5 });
const hangDu = G.luuHang(admin, { TenHang: 'Sạc thử còn 20', GiaLe: 100000, TonToiThieu: 5 });
const hangKhong = G.luuHang(admin, { TenHang: 'Kính thử không theo dõi', GiaLe: 100000 });
G.luuChungTu(admin, 'NK', { Ngay: today, DoiTac: 'Nhà cung cấp thử', lines: [{ MaHH: hangVua.MaHH, TenHang: hangVua.TenHang, SoLuong: 3 }, { MaHH: hangDu.MaHH, TenHang: hangDu.TenHang, SoLuong: 20 }] });

// Đơn giao một phần mà quá hẹn vẫn tính là quá hạn giao; đơn đã giao đủ thì không
const dhMotPhan = G.luuChungTu(admin, 'DH', { Ngay: ngayTu(-10), NgayGiao: ngayTu(-2), MaKH: 'KH00001', TenKH: 'Anh Minh', VAT: 0, lines: [{ MaHH: hangDu.MaHH, TenHang: hangDu.TenHang, DVT: 'Cái', SoLuong: 2, DonGia: 100000 }] }).doc;
const dhDaGiao = G.luuChungTu(admin, 'DH', { Ngay: ngayTu(-10), NgayGiao: ngayTu(-2), MaKH: 'KH00001', TenKH: 'Anh Minh', VAT: 0, lines: [{ MaHH: hangDu.MaHH, TenHang: hangDu.TenHang, DVT: 'Cái', SoLuong: 1, DonGia: 100000 }] }).doc;
G.luuChungTu(admin, 'XK', { Ngay: today, SoDH: dhMotPhan.SoDH, DoiTac: 'Anh Minh', lines: [{ MaHH: hangDu.MaHH, TenHang: hangDu.TenHang, SoLuong: 1 }] });
G.luuChungTu(admin, 'XK', { Ngay: today, SoDH: dhDaGiao.SoDH, DoiTac: 'Anh Minh', lines: [{ MaHH: hangDu.MaHH, TenHang: hangDu.TenHang, SoLuong: 1 }] });
assert.deepStrictEqual([G.findObj_('DonHang', dhMotPhan.SoDH).TrangThai, G.findObj_('DonHang', dhDaGiao.SoDH).TrangThai], ['Giao một phần', 'Đã giao']);
const du = plain(G.tongHopSang_(today));
assert.ok(du.donTre.some(x => x.SoDH === dhMotPhan.SoDH) && !du.donTre.some(x => x.SoDH === dhDaGiao.SoDH));
// Hợp đồng: đúng như hanHD_ cho từng hợp đồng, gần hạn nhất trước
assert.deepStrictEqual(du.hopDong.map(x => x.SoHD), plain(G.readTable_('HopDong')).filter(h => G.hanHD_(h, today)).sort((a, b) => String(a.NgayHetHan).localeCompare(String(b.NgayHetHan))).map(h => h.SoHD));
const xSap = du.hopDong.find(x => x.SoHD === hdSap.SoHD), xQua = du.hopDong.find(x => x.SoHD === hdQua.SoHD);
assert.deepStrictEqual([xSap.het, xSap.n, xSap.bao, xSap.quyetDinh, xSap.tuGiaHan], [false, 10, 20, -10, true]);
assert.deepStrictEqual([xQua.het, xQua.n, xQua.quyetDinh], [true, 3, null]);
assert.ok(!du.hopDong.some(x => [hdXa.SoHD, hdNhap.SoHD].includes(x.SoHD)), 'Hợp đồng còn lâu hoặc chưa hiệu lực không có trong thư');
assert.ok(du.hopDong.findIndex(x => x.SoHD === hdQua.SoHD) < du.hopDong.findIndex(x => x.SoHD === hdSap.SoHD)); // quá hạn trước sắp hạn
// Đợt thanh toán: quá hạn + trong 7 ngày, bỏ đợt đã thu và đợt xa
const dotE = du.dot.filter(x => x.SoHD === hdLich.SoHD);
assert.deepStrictEqual(dotE.map(x => [x.Nhan, x.quaHan, x.n, x.SoTien, x.TenDN]), [['Kỳ A', true, -2, 3000000, 'Anh Minh'], ['Kỳ C', false, 5, 3000000, 'Anh Minh']]);
assert.ok(du.dot.every((x, i, a) => !i || a[i - 1].NgayDen <= x.NgayDen));
// Đơn quá hạn giao
assert.ok(du.donTre.some(x => x.SoDH === dhE.SoDH && x.NgayGiao === ngayTu(-1) && x.TongCong === 12000000) && !du.donTre.some(x => x.SoDH === dhGiaoSau.SoDH));
assert.ok(du.donTre.every(x => x.NgayGiao < today));
// Hàng sắp hết: theo mức tối thiểu; có phiếu kho thì theo tồn; không đặt mức thì không báo (trừ khi tồn đã âm hoặc hết như màn hình Tổng quan)
const mh = new Set(du.hang.map(x => x.MaHH)), hangMa = ma => du.hang.find(x => x.MaHH === ma);
assert.deepStrictEqual([mh.has(hangThap.MaHH), mh.has(hangVua.MaHH), mh.has(hangDu.MaHH), mh.has(hangKhong.MaHH)], [true, true, false, false]);
assert.deepStrictEqual([hangMa(hangThap.MaHH).ton, hangMa(hangThap.MaHH).toiThieu, hangMa(hangVua.MaHH).ton], [0, 5, 3]);
// Công nợ khớp cách tính của màn hình Tổng quan (đã mua trừ đã thu theo khách, chỉ lấy số dương)
const dl = G.taiDuLieu(admin), muaT = {}, thuT = {};
dl.donHang.filter(x => x.TrangThai !== 'Hủy').forEach(x => { muaT[x.MaKH] = (muaT[x.MaKH] || 0) + (+x.TongCong || 0); });
dl.thuTien.forEach(x => { thuT[x.MaKH] = (thuT[x.MaKH] || 0) + (+x.SoTien || 0); });
const noT = Object.keys(Object.assign({}, muaT, thuT)).map(k => (muaT[k] || 0) - (thuT[k] || 0)).filter(v => v > 0);
assert.deepStrictEqual([du.no.soKhach, du.no.tong], [noT.length, noT.reduce((a, b) => a + b, 0)]);
assert.ok(du.no.top.length <= 5 && du.no.top.every((x, i, a) => !i || a[i - 1].tien >= x.tien) && du.no.top[0].TenKH);
assert.strictEqual(du.soMuc, du.hopDong.length + du.dot.length + du.donTre.length + du.hang.length);
assert.ok(du.coViec);
// Hôm qua: doanh số đơn không hủy và tiền đã thu theo ngày
assert.deepStrictEqual([du.homQua, du.homQuaBan.don >= 0, typeof du.homQuaThu], [ngayTu(-1), true, 'number']);
const duThu = plain(G.tongHopSang_(ngayTu(1))); // ngày mai: "hôm qua" là hôm nay
assert.strictEqual(duThu.homQuaBan.don, G.readTable_('DonHang').filter(x => x.TrangThai !== 'Hủy' && String(x.Ngay).slice(0, 10) === today).length);
assert.strictEqual(duThu.homQuaThu, G.readTable_('ThuTien').filter(x => String(x.Ngay).slice(0, 10) === today).reduce((a, x) => a + (+x.SoTien || 0), 0));
// Hết hạn hôm nay: còn 0 ngày
const hdHomNay = G.luuHopDong(admin, { LoaiHD: 'Hợp đồng mua bán', TenDN: 'Hết Hôm Nay', TrangThai: 'Đang hiệu lực', NgayHetHan: today, VAT: 0, lines: [] }).doc;
assert.ok(G.dungEmailSang_('X', plain(G.tongHopSang_(today)), false).text.includes('hết hạn hôm nay'));

// Dựng thư: tiêu đề, nội dung, chống chèn mã HTML từ tên khách, rút gọn khi quá nhiều dòng
const thu = plain(G.dungEmailSang_('Cửa hàng thử', du, false));
assert.ok(thu.tieuDe.startsWith('[Cửa hàng thử] Tổng hợp sáng ' + today.slice(8) + '/' + today.slice(5, 7)) && thu.tieuDe.endsWith(du.soMuc + ' việc cần chú ý'), thu.tieuDe);
assert.ok(thu.text.includes(hdSap.SoHD + ' · ' + tenLa) && thu.text.includes('đã quá hạn báo trước 10 ngày') && thu.text.includes('tự gia hạn') && thu.text.includes('Kỳ A') && thu.text.includes('quá hạn 2 ngày') && thu.text.includes('3.000.000 đ'));
assert.ok(thu.text.includes('hẹn giao ' + ngayTu(-1).split('-').reverse().join('/')) && thu.text.includes('Ốp thử hết · tồn 0 (tối thiểu 5)') && thu.text.includes('Khách còn nợ: '));
assert.ok(thu.html.includes('Công ty &lt;A&amp;B&gt; &quot;x&quot;') && !thu.html.includes('<A&B>') && thu.html.includes('<h3'));
assert.ok(!/Đây là thư gửi thử/.test(thu.text) && /Đây là thư gửi thử/.test(G.dungEmailSang_('X', du, true).text));
const nhieu = Object.assign({}, du, { hang: Array.from({ length: 13 }, (_, i) => ({ MaHH: 'H' + i, TenHang: 'Hàng ' + i, ton: 0, toiThieu: 1 })), hopDong: [], dot: [], donTre: [], soMuc: 13 });
const tn = plain(G.dungEmailSang_('X', nhieu, false));
assert.ok(tn.text.includes('Hàng sắp hết (13)') && tn.text.includes('Hàng 9 ·') && !tn.text.includes('Hàng 10 ·') && tn.text.includes('… và 3 mục khác'));
assert.ok(G.dungEmailSang_('X', Object.assign({}, nhieu, { hang: [], soMuc: 0, coViec: false }), true).text.includes('chưa có việc nào cần chú ý'));

// Gửi thử (quản trị): gửi ngay tới email đã nhập; chưa nhập thì tới chủ tài khoản; không có nơi nhận thì báo
G.luuEmailSang(admin, { bat: true, gio: 7, den: 'giamdoc@example.com, ketoan@example.com' });
thuMail.da.length = 0;
assert.throws(() => G.guiThuEmailSang(lan), /quản trị/);
let gui = plain(G.guiThuEmailSang(admin));
assert.deepStrictEqual([gui.daGui, gui.den, gui.coViec, thuMail.da.length], [true, ['giamdoc@example.com', 'ketoan@example.com'], true, 1]);
assert.deepStrictEqual([thuMail.da[0].to, thuMail.da[0].name, /Tổng hợp sáng/.test(thuMail.da[0].subject), thuMail.da[0].body.includes('Đây là thư gửi thử'), thuMail.da[0].htmlBody.includes('<div')], ['giamdoc@example.com,ketoan@example.com', G.cuaHang_('phone').ten, true, true, true]);
G.luuEmailSang(admin, { bat: true, gio: 7, den: '' });
assert.deepStrictEqual(plain(G.guiThuEmailSang(admin)).den, ['chu@example.com']);
thuMail.chu = '';
assert.throws(() => G.guiThuEmailSang(admin), /nhập email nhận/);
thuMail.chu = 'chu@example.com';

// Bộ hẹn giờ: chỉ chạy khi do bộ hẹn giờ gọi, mỗi ngày một thư, không có việc thì không gửi, lỗi gửi không làm hỏng và không đánh dấu đã gửi
const hen = { triggerUid: 'tr-1', year: +today.slice(0, 4) };
thuMail.da.length = 0; props.delete('emailSang.phone');
G.guiEmailSang(); G.guiEmailSang({}); G.guiEmailSang('x');
assert.strictEqual(thuMail.da.length, 0, 'Gọi từ trình duyệt (không phải bộ hẹn giờ) thì không gửi');
G.guiEmailSang(hen);
assert.deepStrictEqual([thuMail.da.length, thuMail.da[0].to, props.get('emailSang.phone'), thuMail.da[0].body.includes('Đây là thư gửi thử')], [1, 'chu@example.com', today, false]);
G.guiEmailSang(hen);
assert.strictEqual(thuMail.da.length, 1, 'Mỗi ngày một thư');
props.set('emailSang.phone', ngayTu(-1)); // sang ngày mới thì gửi tiếp
G.guiEmailSang(hen);
assert.strictEqual(thuMail.da.length, 2);
G.luuEmailSang(admin, { bat: false, gio: 7 });
props.delete('emailSang.phone');
G.guiEmailSang(hen);
assert.strictEqual(thuMail.da.length, 2, 'Đã tắt thì không gửi');
G.luuEmailSang(admin, { bat: true, gio: 7 });
thuMail.thieuQuyen = true;
G.guiEmailSang(hen);
assert.ok(!props.get('emailSang.phone') && logs.some(l => /Không gửi được email sáng của phone/.test(l)), 'Gửi lỗi: ghi nhật ký, chưa đánh dấu đã gửi để lần sau còn thử');
thuMail.thieuQuyen = false;
const tongGoc = G.tongHopSang_; // không có việc gì cần chú ý: không gửi, không đánh dấu
G.tongHopSang_ = d => Object.assign(plain(tongGoc(d)), { coViec: false, soMuc: 0 });
thuMail.da.length = 0; G.guiEmailSang(hen);
assert.deepStrictEqual([thuMail.da.length, props.get('emailSang.phone') || ''], [0, '']);
G.tongHopSang_ = tongGoc;
G.luuEmailSang(admin, { bat: false, gio: 7 });

// Khóa tài khoản / quản trị đặt lại mật khẩu: phiên đang đăng nhập hết hiệu lực ngay; chỉ đổi tên thì không
const tkLan = { TenDangNhap: 'lan.nguyen', HoTen: 'Lan', VaiTro: 'nhanvien', CuaHang: 'phone' };
G.luuTaiKhoan(admin, Object.assign({ TrangThai: 'Khóa' }, tkLan));
assert.throws(() => G.taiDuLieu(lan), /HET_PHIEN/);
assert.throws(() => G.dangNhap('lan.nguyen', 'lan-123'), /đã bị khóa/);
G.luuTaiKhoan(admin, Object.assign({ TrangThai: 'Hoạt động' }, tkLan));
const lan2 = G.dangNhap('lan.nguyen', 'lan-123').token;
assert.strictEqual(G.taiDuLieu(lan2).user.ten, 'Lan');
G.luuTaiKhoan(admin, Object.assign({}, tkLan, { HoTen: 'Lan N.' }));
assert.strictEqual(G.taiDuLieu(lan2).user.u, 'lan.nguyen');
G.luuTaiKhoan(admin, Object.assign({ MatKhau: 'lan-789' }, tkLan));
assert.throws(() => G.taiDuLieu(lan2), /HET_PHIEN/);
G.luuTaiKhoan(admin, { TenDangNhap: 'admin', HoTen: 'Quản trị', VaiTro: 'admin', CuaHang: 'phone,demo', MatKhau: adminPass }); // quản trị tự đặt lại mật khẩu: giữ phiên của mình
assert.strictEqual(G.taiDuLieu(admin).user.u, 'admin');

// Tự đổi mật khẩu: thiết bị đang dùng giữ phiên, thiết bị khác phải đăng nhập lại; khóa tạm sau 5 lần sai; đăng xuất
const lanA = G.dangNhap('lan.nguyen', 'lan-789').token, lanB = G.dangNhap('lan.nguyen', 'lan-789').token;
G.doiMatKhau(lanA, 'lan-789', 'lan-456');
assert.strictEqual(G.taiDuLieu(lanA).user.u, 'lan.nguyen');
assert.throws(() => G.taiDuLieu(lanB), /HET_PHIEN/);
assert.throws(() => G.dangNhap('lan.nguyen', 'lan-789'), /Sai/);
for (let i = 0; i < 4; i++) assert.throws(() => G.dangNhap('lan.nguyen', 'x'), /Sai/); // cùng lần sai ở trên là 5
assert.throws(() => G.dangNhap('lan.nguyen', 'lan-456'), /quá 5 lần/);
G.dangXuat(admin);
assert.throws(() => G.taiDuLieu(admin), /HET_PHIEN/);

// Bỏ cửa hàng PCCC: trang tính còn sót không làm app hỏng; caiDat xóa trang PCCC_…, cấu hình, bỏ quyền; nhân viên chỉ vào PCCC thì bị khóa
const tk = sheets.TaiKhoan, addTk = o => tk.appendRow(G.toRow_(tk, Object.assign({ HoTen: o.TenDangNhap, MatKhau: 'x', Muoi: 'y', TrangThai: 'Hoạt động', NgayTao: today }, o)));
['PCCC_KhachHang', 'PCCC_HangHoa', 'PCCC_DonHang', 'PCCC_NhatKy'].forEach(n => { sheets[n] = new Sheet([['Ma'], ['x']]); });
sheets.CaiDat.appendRow(['cuaHang.pccc', '{"ten":"Hoàng Quân Phát"}']);
addTk({ TenDangNhap: 'cu.pccc', VaiTro: 'nhanvien', CuaHang: 'pccc' });
addTk({ TenDangNhap: 'cu.hai', VaiTro: 'nhanvien', CuaHang: 'phone,pccc' });
addTk({ TenDangNhap: 'cu.admin', VaiTro: 'admin', CuaHang: 'pccc' });
const admin2 = G.dangNhap('admin', adminPass).token;
assert.strictEqual(G.taiDuLieu(admin2).cuaHang.id, 'phone'); // trang cũ còn nằm đó: app vẫn chạy
const sauXoa = plain(G.xoaCuaHangDaBo_());
assert.deepStrictEqual(sauXoa.sort(), ['PCCC_DonHang', 'PCCC_KhachHang', 'PCCC_HangHoa', 'PCCC_NhatKy'].sort());
assert.ok(!Object.keys(sheets).some(n => n.startsWith('PCCC_')) && sheets.PS_HangHoa && sheets.DM_HangHoa); // trang cửa hàng khác còn nguyên
assert.deepStrictEqual([sheets.CaiDat.rows.some(r => r[0] === 'cuaHang.pccc'), sheets.CaiDat.rows.some(r => r[0] === 'cuaHang.phone')], [false, true]);
const tkCu = Object.fromEntries(G.readTable_('TaiKhoan').map(t => [t.TenDangNhap, t]));
assert.deepStrictEqual([tkCu['cu.pccc'].CuaHang, tkCu['cu.pccc'].TrangThai], ['', 'Khóa']);
assert.deepStrictEqual([tkCu['cu.hai'].CuaHang, tkCu['cu.hai'].TrangThai], ['phone', 'Hoạt động']);
assert.deepStrictEqual([tkCu['cu.admin'].CuaHang, tkCu['cu.admin'].TrangThai], ['', 'Hoạt động']); // quản trị trống = vào mọi cửa hàng còn lại
assert.strictEqual(G.taiDuLieu(admin2).user.u, 'admin'); // tài khoản không bị đổi thì giữ nguyên phiên
assert.deepStrictEqual(plain(G.xoaCuaHangDaBo_()), []); // chạy lại không làm gì thêm

require('./kiem-tra-html'); // giao diện: cú pháp, và các chỗ Apps Script sẽ cắt nhầm khi xóa chú thích
console.log('OK - tất cả kiểm tra đều đạt');
