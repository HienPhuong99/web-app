// Kiểm tra nhanh logic máy chủ (Code.gs) trên dữ liệu mẫu:  node dev/kiem-tra.js
const assert = require('assert');
const { ctx: G, sheets, logs } = require('./chay-thu');
const adminPass = logs.join('\n').match(/mật khẩu: (\S+)/)[1];
const today = G.now_().slice(0, 10);
const year = today.slice(0, 4);
const plain = x => JSON.parse(JSON.stringify(x)); // đối tượng tạo trong vm khác prototype
const rowsOf = (name, key) => sheets[name].rows.filter(r => r[0] === key);

// caiDat: mỗi cửa hàng một bộ trang tính, trang PCCC bị ẩn, cột thiếu được thêm
assert.ok(['PS_DonHang', 'PS_ThuTien', 'PCCC_DonHang', 'PCCC_PhieuKhoCT', 'TaiKhoan'].every(n => sheets[n]));
assert.ok(sheets.PCCC_HangHoa.hidden && !sheets.PS_HangHoa.hidden);
assert.ok(sheets.PCCC_HangHoa.rows[0].includes('TonToiThieu'));

// Đăng nhập: không phân biệt hoa thường; luôn mở cửa hàng mặc định (phone) trước
assert.throws(() => G.dangNhap('admin', 'sai-mat-khau'), /Sai tên đăng nhập/);
const login = G.dangNhap(' ADMIN ', adminPass), admin = login.token;
assert.deepStrictEqual([login.user.shop, plain(login.user.shops)], ['phone', ['phone', 'pccc']]);
let d = G.taiDuLieu(admin);
assert.deepStrictEqual([d.cuaHang.id, d.khach.length, d.hang.length, d.congTy.vatMacDinh], ['phone', 1, 2, 0]);

// Chuyển sang PCCC trong Cài đặt: dữ liệu của cửa hàng kia
d = G.chonCuaHang(admin, 'pccc');
assert.deepStrictEqual([d.cuaHang.id, d.khach.length, d.hang.length, d.congTy.vatMacDinh], ['pccc', 2, 4, 8]);
assert.throws(() => G.chonCuaHang(admin, 'khong-co'), /không được vào/);

// Khách hàng: mã tự sinh, sửa không đổi mã/ngày tạo, chuỗi "=..." không thành công thức
const kh = G.luuKhach(admin, { TenKH: 'Khách thử', SDT: ' 0900000009 ' });
assert.deepStrictEqual([kh.MaKH, kh.SDT], ['KH00003', '0900000009']);
assert.strictEqual(G.luuKhach(admin, { MaKH: 'KH00003', TenKH: 'Khách thử (sửa)', NgayTao: '2000-01-01' }).NgayTao, kh.NgayTao);
assert.strictEqual(G.toRow_(sheets.PCCC_KhachHang, { TenKH: '=IMPORTXML("x")' })[1], "'=IMPORTXML(\"x\")");

// Báo giá: số tự tăng theo năm, tiền luôn tính lại ở máy chủ, bỏ dòng trống
const bg = G.luuChungTu(admin, 'BG', { Ngay: today, MaKH: 'KH00002', TenKH: 'Chị Lan', VAT: 8, lines: [
  { MaHH: 'HH0001', TenHang: 'Bình chữa cháy bột ABC 4kg', SoLuong: 10, LoaiGia: 'Giá sỉ', DonGia: 345000, ThanhTien: 1 },
  { TenHang: '   ' },
  { TenHang: 'Công lắp đặt', SoLuong: 1, LoaiGia: 'Giá tùy chọn', DonGia: 500000 },
] }).doc;
assert.strictEqual(bg.SoBG, `001-${year}/PCCC`);
assert.deepStrictEqual([bg.lines.length, bg.TienHang, bg.TienVAT, bg.TongCong], [2, 3950000, 316000, 4266000]);
assert.strictEqual(G.luuChungTu(admin, 'BG', { Ngay: '2099-01-02', TenKH: 'A', lines: [{ TenHang: 'B', SoLuong: 1, DonGia: 1 }] }).doc.SoBG, '001-2099/PCCC');
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
assert.deepStrictEqual([rowsOf('PCCC_BaoGiaCT', bg.SoBG).length, rowsOf('PCCC_DonHangCT', dh.SoDH).length], [1, 2]);
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
assert.deepStrictEqual([sheets.PCCC_KhachHang.rows.length, sheets.PS_BaoGia.rows.length, sheets.PCCC_BaoGia.rows.length], [4, 2, 3]);

// Phân quyền: nhân viên không sửa bảng giá, không xóa; phải còn 1 quản trị; phải chọn ít nhất 1 cửa hàng
assert.throws(() => G.luuTaiKhoan(admin, { TenDangNhap: 'x.y', MatKhau: '123456', CuaHang: '', moi: true }), /ít nhất 1 cửa hàng/);
G.luuTaiKhoan(admin, { TenDangNhap: 'Lan.Nguyen', HoTen: 'Lan', VaiTro: 'nhanvien', MatKhau: 'lan-123', CuaHang: 'phone', moi: true });
assert.throws(() => G.luuTaiKhoan(admin, { TenDangNhap: 'lan.nguyen', MatKhau: 'khac-123', CuaHang: 'phone', moi: true }), /đã có/);
const lanLogin = G.dangNhap('lan.nguyen', 'lan-123'), lan = lanLogin.token;
assert.deepStrictEqual(plain(lanLogin.user.shops), ['phone']);
assert.throws(() => G.chonCuaHang(lan, 'pccc'), /không được vào/);
assert.ok(!JSON.stringify(G.taiDuLieu(lan)).includes('Hoàng Quân Phát')); // nhân viên phone không thấy gì của PCCC
assert.throws(() => G.luuHang(lan, { TenHang: 'X' }), /quản trị/);
assert.throws(() => G.xoaChungTu(lan, 'BG', psBg.SoBG), /quản trị/);
assert.throws(() => G.xoaThuTien(lan, 'x'), /quản trị/);
assert.throws(() => G.dsTaiKhoan(lan), /quản trị/);
assert.strictEqual(G.luuThuTien(lan, { Ngay: today, MaKH: 'KH00001', SoTien: 100000 }).NguoiTao, 'Lan');
assert.throws(() => G.luuTaiKhoan(admin, { TenDangNhap: 'admin', HoTen: 'Quản trị', VaiTro: 'nhanvien', CuaHang: 'phone,pccc' }), /ít nhất 1 tài khoản quản trị/);
assert.ok(G.dsTaiKhoan(admin).every(t => !('MatKhau' in t) && !('Muoi' in t)));
assert.strictEqual(G.dsTaiKhoan(admin).find(t => t.TenDangNhap === 'admin').CuaHang, 'phone,pccc');

// Đổi mật khẩu, khóa tạm sau 5 lần sai, đăng xuất
G.doiMatKhau(lan, 'lan-123', 'lan-456');
assert.throws(() => G.dangNhap('lan.nguyen', 'lan-123'), /Sai/);
for (let i = 0; i < 4; i++) assert.throws(() => G.dangNhap('lan.nguyen', 'x'), /Sai/); // cùng lần sai ở trên là 5
assert.throws(() => G.dangNhap('lan.nguyen', 'lan-456'), /quá 5 lần/);
G.dangXuat(admin);
assert.throws(() => G.taiDuLieu(admin), /HET_PHIEN/);

// Nâng cấp từ bản 1 cửa hàng: trang tính cũ không tiền tố được đổi tên thành PCCC_…, giữ dữ liệu
sheets.KhachHang = sheets.PCCC_KhachHang; delete sheets.PCCC_KhachHang;
G.caiDat();
assert.ok(!sheets.KhachHang && sheets.PCCC_KhachHang.rows.length === 4);

console.log('OK - tất cả kiểm tra đều đạt');
