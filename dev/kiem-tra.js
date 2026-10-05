// Kiểm tra nhanh logic máy chủ (Code.gs) trên dữ liệu mẫu:  node dev/kiem-tra.js
const assert = require('assert');
const { ctx: G, sheets, logs, cache, props, Sheet } = require('./chay-thu');
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
