/**
 * Web app quản lý bán hàng cho 2 cửa hàng tách riêng dữ liệu: phuonghihi (iPhone, mặc định)
 * và Hoàng Quân Phát (PCCC, chỉ mở được trong Cài đặt → Nâng cao).
 * Khách hàng, hàng hóa, báo giá, đơn hàng, giao hàng – kho (IMEI, bảo hành), thu tiền – công nợ, báo cáo, nhật ký.
 * Dữ liệu nằm ở chính Google Sheet chứa script này: mỗi cửa hàng một bộ trang tính có tiền tố riêng,
 * riêng trang TaiKhoan và CaiDat dùng chung.
 */

// ===== Cửa hàng: giá trị mặc định. Quản trị sửa được trong app (Cài đặt → Sửa thông tin cửa hàng), phần sửa lưu ở trang CaiDat =====
const SHOP_MAC_DINH = 'phone';
const SHOPS = {
  phone: {
    ten: 'phuonghihi', moTa: 'Cửa hàng iPhone chính hãng', prefix: 'PS_', soBG: 'BG', icon: 'phone',
    mau: { brand: '#0b4174', brandD: '#08325a', brand50: '#e9f0f8', rgb: '11,65,116', grad: 'linear-gradient(120deg, #0b4174, #1f5f9e 55%, #ff6b4a)' },
    congTy: {
      ten: 'CỬA HÀNG PHUONGHIHI',
      khauHieu: 'iPhone chính hãng - Giá niêm yết công khai - Bảo hành 12 tháng - Trả góp 0%',
      diaChi: ['123 Đường Lê Lợi, Quận 1, TP. Hồ Chí Minh'],
      lienHe: 'Hotline: 0900 300 300 - Email: hotro@phuonghihi.example - Mở cửa 08:00 - 21:00 hằng ngày',
      chuHo: '', mst: '',
      loiMo: 'Cảm ơn Quý khách đã quan tâm đến sản phẩm của phuonghihi. Chúng tôi xin gửi Quý khách báo giá chi tiết như sau:',
      gioiThieu: 'phuonghihi - cửa hàng chuyên iPhone chính hãng: giá niêm yết công khai, bảo hành 12 tháng, trả góp 0%, thu cũ đổi mới, giao hàng toàn quốc.',
      dieuKien: ['Giá đã bao gồm thuế GTGT.', 'Bảo hành chính hãng 12 tháng.', 'Hỗ trợ trả góp 0%, thu cũ đổi mới.', 'Giao hàng toàn quốc.'],
      nganHang: '',
      qrNganHang: '', qrSoTK: '', qrChuTK: '', // tài khoản nhận chuyển khoản để in mã VietQR (mã BIN ngân hàng 6 số)
      kyTen: 'Quản lý cửa hàng',
      vatMacDinh: 0,
      baoHanhThang: 12,
      hinhThuc: ['Tiền mặt', 'Chuyển khoản', 'Thẻ tín dụng', 'VNPay', 'Trả góp'],
    },
  },
  pccc: {
    ten: 'Hoàng Quân Phát', moTa: 'Thiết bị phòng cháy chữa cháy', prefix: 'PCCC_', soBG: 'PCCC', icon: 'flame',
    mau: { brand: '#d63b2f', brandD: '#b92f25', brand50: '#fdeeec', rgb: '214,59,47', grad: 'linear-gradient(120deg, #c62f25, #e34d2e 55%, #f59e0b)' },
    congTy: {
      ten: 'CÔNG TY TNHH MTV HOÀNG QUÂN PHÁT',
      khauHieu: 'Tư Vấn - Thiết Kế - Thi Công Lắp Đặt - Kinh Doanh Phương Tiện - Thiết Bị PCCC',
      diaChi: [
        'Địa chỉ GPKD: Số 16, đường N4, Khu nhà ở TM DV Phú Mỹ, Khu 5, Phường Bình Dương, Tp Hồ Chí Minh',
        'Địa chỉ VPDD: Số 262 Quốc lộ 1A, P. Tam Bình, Q. Thủ Đức, Tp. Hồ Chí Minh',
      ],
      lienHe: 'ĐT: 028.6656.6422 - 0888.357.114 - Email: hoangquanphat@gmail.com',
      chuHo: '', mst: '',
      loiMo: 'Công ty TNHH MTV Hoàng Quân Phát chân thành cảm ơn sự quan tâm của Quý khách hàng đối với sản phẩm của chúng tôi. Sau đây, chúng tôi xin gửi tới Quý khách bảng báo giá chi tiết như sau:',
      gioiThieu: 'CÔNG TY TNHH MTV HOÀNG QUÂN PHÁT là đơn vị được Công an PCCC tỉnh Bình Dương cấp phép đủ điều kiện kinh doanh PCCC với các chức năng: Tư vấn thiết kế, Tư vấn giám sát, Thi công lắp đặt và Kinh doanh vật tư thiết bị PCCC theo quy định pháp luật.',
      dieuKien: [
        'Đơn giá chưa bao gồm thuế GTGT.',
        'Báo giá chưa bao gồm chi phí vận chuyển và lắp đặt.',
        'Khi chốt hàng vui lòng liên hệ lại để kiểm kho.',
        'Thanh toán 50% khi đặt hàng và 50% khi có thông báo giao hàng.',
        'Thời hạn bảo hành 12 tháng kể từ ngày giao hàng.',
        'Thời hạn báo giá 15 ngày.',
      ],
      nganHang: 'Tài khoản: CÔNG TY TNHH MTV HOÀNG QUÂN PHÁT - Số TK: 6100201006846 - Agribank CN Thủ Đức',
      qrNganHang: '970405', qrSoTK: '6100201006846', qrChuTK: 'CONG TY TNHH MTV HOANG QUAN PHAT', // 970405 = Agribank
      kyTen: 'Giám đốc',
      vatMacDinh: 8,
      baoHanhThang: 12,
      hinhThuc: ['Chuyển khoản', 'Tiền mặt'],
    },
  },
};
let CUR_SHOP = SHOP_MAC_DINH; // cửa hàng của lần gọi hiện tại, lấy từ phiên đăng nhập trong user_()

// Tên trang tính và cột. Thứ tự cột trong Sheet có thể đổi, code tìm cột theo tên ở dòng 1.
const TABLES = {
  TaiKhoan: ['TenDangNhap', 'HoTen', 'VaiTro', 'MatKhau', 'Muoi', 'TrangThai', 'CuaHang', 'NgayTao'],
  CaiDat: ['Khoa', 'GiaTri'],
  KhachHang: ['MaKH', 'TenKH', 'NguoiLienHe', 'SDT', 'DiaChi', 'MST', 'Email', 'GhiChu', 'NgayTao', 'NguoiTao'],
  HangHoa: ['MaHH', 'TenHang', 'Model', 'NhomHang', 'PhanLoai', 'DVT', 'XuatXu', 'GiaSi', 'GiaLe', 'TonToiThieu', 'GhiChu', 'BaoHanh'],
  BaoGia: ['SoBG', 'Ngay', 'MaKH', 'TenKH', 'NguoiNhan', 'SDT', 'DiaChi', 'TienHang', 'VAT', 'TienVAT', 'TongCong', 'GhiChu', 'NguoiTao', 'NgayTao', 'NgaySua'],
  BaoGiaCT: ['SoBG', 'STT', 'MaHH', 'TenHang', 'Model', 'DVT', 'XuatXu', 'SoLuong', 'LoaiGia', 'DonGia', 'ThanhTien'],
  DonHang: ['SoDH', 'Ngay', 'SoBG', 'MaKH', 'TenKH', 'NguoiNhan', 'SDT', 'DiaChi', 'NgayGiao', 'TienHang', 'VAT', 'TienVAT', 'TongCong', 'TrangThai', 'GhiChu', 'NguoiTao', 'NgayTao', 'NgaySua'],
  DonHangCT: ['SoDH', 'STT', 'MaHH', 'TenHang', 'Model', 'DVT', 'XuatXu', 'SoLuong', 'LoaiGia', 'DonGia', 'ThanhTien'],
  PhieuKho: ['SoPK', 'Ngay', 'Loai', 'SoDH', 'DoiTac', 'GhiChu', 'NguoiTao', 'NgayTao', 'NgaySua'],
  PhieuKhoCT: ['SoPK', 'STT', 'MaHH', 'TenHang', 'Model', 'DVT', 'SoLuong', 'IMEI'],
  ThuTien: ['SoPT', 'Ngay', 'MaKH', 'TenKH', 'SoDH', 'SoTien', 'HinhThuc', 'GhiChu', 'NguoiTao', 'NgayTao'],
  NhatKy: ['ThoiGian', 'NguoiDung', 'HanhDong', 'DoiTuong', 'ChiTiet'],
};
const SHARED = ['TaiKhoan', 'CaiDat']; // trang dùng chung cho mọi cửa hàng, không có tiền tố
const NUMBER_COLS = ['GiaSi', 'GiaLe', 'TonToiThieu', 'BaoHanh', 'TienHang', 'VAT', 'TienVAT', 'TongCong', 'STT', 'SoLuong', 'DonGia', 'ThanhTien', 'SoTien'];
const SESSION_TTL = 6 * 60 * 60; // giây; tối đa của CacheService, tự gia hạn khi còn dùng
const SCHEMA = '2'; // tăng số này khi thêm bảng/cột ở TABLES: app tự thêm phần thiếu ở lần gọi đầu sau khi triển khai

// Loại chứng từ có dòng hàng. Số chứng từ dạng 001-2026/DH, mỗi năm đánh lại từ 001 (riêng từng cửa hàng).
const CT = {
  BG: { head: 'BaoGia', lines: 'BaoGiaCT', ten: 'báo giá' }, // hậu tố số báo giá theo cửa hàng: SHOPS[..].soBG
  DH: { head: 'DonHang', lines: 'DonHangCT', suffix: 'DH', ten: 'đơn hàng' },
  NK: { head: 'PhieuKho', lines: 'PhieuKhoCT', suffix: 'NK', loai: 'Nhập', ten: 'phiếu nhập kho' },
  XK: { head: 'PhieuKho', lines: 'PhieuKhoCT', suffix: 'XK', loai: 'Xuất', ten: 'phiếu xuất kho' },
};

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle(cuaHang_(SHOP_MAC_DINH).ten + ' - Quản lý bán hàng')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL); // cho phép nhúng vào Google Sites
}

/**
 * Chạy trong trình soạn thảo Apps Script: tạo trang tính/cột còn thiếu và tài khoản admin. Chạy lại được.
 * Trang tính của bản cũ chưa có tiền tố (KhachHang, HangHoa…) được đổi tên thành PCCC_… để giữ dữ liệu.
 */
function caiDat() {
  taoBang_(true);
  PropertiesService.getScriptProperties().setProperty('schema', SCHEMA);
  if (readTable_('TaiKhoan').some(u => u.VaiTro === 'admin')) return Logger.log('Đã có tài khoản admin, không tạo thêm.');
  const pass = Utilities.getUuid().slice(0, 8);
  sheet_('TaiKhoan').appendRow(toRow_(sheet_('TaiKhoan'), Object.assign({ TenDangNhap: 'admin', HoTen: 'Quản trị', VaiTro: 'admin',
    TrangThai: 'Hoạt động', CuaHang: Object.keys(SHOPS).join(','), NgayTao: now_() }, hashPass_(pass))));
  Logger.log('Tài khoản quản trị: admin / mật khẩu: ' + pass + '  -> đăng nhập xong hãy đổi mật khẩu.');
}

// Tạo trang tính/cột còn thiếu theo TABLES. dayDu = chạy từ caiDat: định dạng lại mọi cột chữ và ẩn trang của cửa hàng phụ.
function taoBang_(dayDu) {
  const ss = SpreadsheetApp.getActive(), cur = CUR_SHOP;
  for (const shop of Object.keys(SHOPS)) {
    CUR_SHOP = shop;
    for (const [name, cols] of Object.entries(TABLES)) {
      const chung = SHARED.includes(name);
      if (chung && shop !== SHOP_MAC_DINH) continue;
      const full = tableName_(name);
      let sh = ss.getSheetByName(full), moi = false;
      if (!sh && shop === 'pccc' && !chung && ss.getSheetByName(name)) sh = ss.getSheetByName(name).setName(full);
      if (!sh) { sh = ss.insertSheet(full); moi = true; }
      const have = sh.getLastRow() ? headers_(sh) : [];
      const missing = cols.filter(c => have.indexOf(c) < 0);
      const thieuCot = have.length + missing.length - sh.getMaxColumns(); // trang tính đã dùng hết số cột của lưới
      if (thieuCot > 0) sh.insertColumnsAfter(sh.getMaxColumns(), thieuCot);
      if (missing.length) sh.getRange(1, have.length + 1, 1, missing.length).setValues([missing]);
      // Cột chữ để dạng văn bản: giữ số 0 đầu SĐT, mã số thuế, IMEI
      const all = have.concat(missing);
      (dayDu ? all : missing).forEach(c => { if (c && !NUMBER_COLS.includes(c)) sh.getRange(1, all.indexOf(c) + 1, sh.getMaxRows(), 1).setNumberFormat('@'); });
      if (dayDu || moi) sh.setFrozenRows(1);
      if (shop !== SHOP_MAC_DINH && (dayDu || moi)) sh.hideSheet(); // mở file Sheet chỉ thấy cửa hàng mặc định
    }
  }
  CUR_SHOP = cur;
}

// Bản code mới có thêm bảng/cột (SCHEMA đổi): tự thêm vào Sheet, không cần chạy lại caiDat
// Nâng cấp lỗi thì app vẫn chạy với bảng cũ (tính năng mới chưa lưu được) và thử lại sau 10 phút; chạy caiDat trong trình soạn thảo để xem lỗi.
function nangCap_(cache) {
  const p = PropertiesService.getScriptProperties();
  let ok = p.getProperty('schema') === SCHEMA;
  if (!ok) {
    try { withLock_(() => { taoBang_(false); p.setProperty('schema', SCHEMA); }); ok = true; }
    catch (e) { console.error('Không tự nâng cấp được Sheet: ' + e); }
  }
  cache.put('schema', SCHEMA, ok ? SESSION_TTL : 600);
}

// Cửa hàng tài khoản được vào; để trống thì quản trị vào tất cả, nhân viên chỉ cửa hàng mặc định
function shopsOf_(tk) {
  const list = String(tk.CuaHang || '').split(',').map(s => s.trim()).filter(s => SHOPS[s]);
  if (list.length) return Object.keys(SHOPS).filter(s => list.includes(s));
  return tk.VaiTro === 'admin' ? Object.keys(SHOPS) : [SHOP_MAC_DINH];
}

// ===== Thông tin cửa hàng: mặc định ở SHOPS + phần quản trị đã sửa trong app (trang CaiDat, khóa cuaHang.<id>) =====
function caiDatMap_() {
  const m = {};
  try { readTable_('CaiDat').forEach(r => { m[r.Khoa] = r.GiaTri; }); } catch (e) {} // chưa có trang CaiDat: dùng mặc định
  return m;
}
function cuaHang_(id, cd) {
  const s = SHOPS[id];
  let o = {};
  try { o = JSON.parse((cd || caiDatMap_())['cuaHang.' + id] || '{}') || {}; } catch (e) {}
  return { ten: o.ten || s.ten, moTa: o.moTa || s.moTa, congTy: Object.assign({}, s.congTy, o.congTy) };
}

/** Tên cửa hàng hiện trên trang đăng nhập (chưa cần đăng nhập). */
function thongTinDangNhap() {
  const c = cuaHang_(SHOP_MAC_DINH);
  return { ten: c.ten, moTa: c.moTa };
}

/** Quản trị sửa thông tin cửa hàng đang làm việc: tên, thông tin in chứng từ, tài khoản nhận chuyển khoản… */
function luuCuaHang(token, o) {
  const user = user_(token, true);
  o = o || {};
  const str = (v, n) => String(v == null ? '' : v).trim().slice(0, n);
  const list = v => (Array.isArray(v) ? v : String(v == null ? '' : v).split('\n')).map(x => str(x, 300)).filter(Boolean).slice(0, 20);
  const num = (v, max) => Math.min(max, Math.max(0, +v || 0));
  const c = {
    ten: str(o.ten, 150), khauHieu: str(o.khauHieu, 300), diaChi: list(o.diaChi), lienHe: str(o.lienHe, 300),
    chuHo: str(o.chuHo, 150), mst: str(o.mst, 20), loiMo: str(o.loiMo, 1000), gioiThieu: str(o.gioiThieu, 1000), dieuKien: list(o.dieuKien),
    nganHang: str(o.nganHang, 300), qrNganHang: str(o.qrNganHang, 6), qrSoTK: str(o.qrSoTK, 40).replace(/\s/g, ''), qrChuTK: str(o.qrChuTK, 60),
    kyTen: str(o.kyTen, 60), vatMacDinh: num(o.vatMacDinh, 100), baoHanhThang: Math.round(num(o.baoHanhThang, 120)), hinhThuc: list(o.hinhThuc),
  };
  if (!c.ten) throw new Error('Nhập tên cửa hàng in trên chứng từ.');
  if (!c.hinhThuc.length) throw new Error('Nhập ít nhất 1 hình thức thu tiền.');
  if ((c.qrNganHang || c.qrSoTK) && !(/^\d{6}$/.test(c.qrNganHang) && /^[A-Za-z0-9]{4,19}$/.test(c.qrSoTK))) {
    throw new Error('Mã QR chuyển khoản: chọn ngân hàng và nhập số tài khoản (4–19 chữ số, viết liền).');
  }
  const giaTri = JSON.stringify({ ten: str(o.tenNgan, 60), moTa: str(o.moTa, 100), congTy: c });
  return withLock_(() => {
    const sh = sheet_('CaiDat'), khoa = 'cuaHang.' + CUR_SHOP, r = findRow_(sh, khoa), row = toRow_(sh, { Khoa: khoa, GiaTri: giaTri });
    if (r) sh.getRange(r, 1, 1, row.length).setValues([row]); else sh.appendRow(row);
    log_(user, 'Sửa thông tin cửa hàng', str(o.tenNgan, 60) || SHOPS[CUR_SHOP].ten, c.ten);
    return cuaHang_(CUR_SHOP);
  });
}

// ===== Đăng nhập =====
function dangNhap(tenDangNhap, matKhau) {
  const u = String(tenDangNhap || '').trim().toLowerCase();
  const cache = CacheService.getScriptCache();
  const fails = +(cache.get('fail_' + u) || 0);
  if (fails >= 5) throw new Error('Nhập sai quá 5 lần. Thử lại sau 10 phút.');
  const tk = readTable_('TaiKhoan').find(r => String(r.TenDangNhap).toLowerCase() === u);
  if (!tk || hashPass_(String(matKhau), tk.Muoi).MatKhau !== tk.MatKhau) {
    cache.put('fail_' + u, String(fails + 1), 600);
    throw new Error('Sai tên đăng nhập hoặc mật khẩu.');
  }
  if (tk.TrangThai === 'Khóa') throw new Error('Tài khoản đã bị khóa.');
  cache.remove('fail_' + u);
  const token = Utilities.getUuid();
  const shops = shopsOf_(tk);
  const user = { u: tk.TenDangNhap, ten: tk.HoTen || tk.TenDangNhap, vaiTro: tk.VaiTro, shops: shops,
    shop: shops.includes(SHOP_MAC_DINH) ? SHOP_MAC_DINH : shops[0], // luôn mở cửa hàng mặc định trước
    t: Math.max(Date.now(), revOf_(u, cache) + 1) }; // thời điểm đăng nhập, để thu hồi phiên cũ khi tài khoản bị khóa/đổi quyền
  cache.put('ss_' + token, JSON.stringify(user), SESSION_TTL);
  return { token: token, user: user };
}

function dangXuat(token) { CacheService.getScriptCache().remove('ss_' + token); }

// Phiên hết hạn sau 6 giờ không dùng; bị thu hồi ngay khi tài khoản bị khóa, đổi quyền hoặc đổi mật khẩu.
function user_(token, adminOnly) {
  const cache = CacheService.getScriptCache();
  const s = token && cache.get('ss_' + token);
  if (!s) throw new Error('HET_PHIEN');
  const user = JSON.parse(s);
  if (!user.shops) throw new Error('HET_PHIEN'); // phiên của bản cũ chưa có cửa hàng: đăng nhập lại
  const u = String(user.u).toLowerCase(), c = cache.getAll(['rev_' + u, 'schema']);
  const rev = c['rev_' + u] === undefined ? revOf_(u, cache) : +c['rev_' + u];
  if (rev && !(user.t > rev)) { cache.remove('ss_' + token); throw new Error('HET_PHIEN'); }
  cache.put('ss_' + token, s, SESSION_TTL);
  if (c.schema !== SCHEMA) nangCap_(cache);
  if (adminOnly && user.vaiTro !== 'admin') throw new Error('Chỉ tài khoản quản trị được làm việc này.');
  CUR_SHOP = SHOPS[user.shop] ? user.shop : SHOP_MAC_DINH;
  return user;
}

// Mốc thu hồi phiên của một tài khoản: phiên đăng nhập trước mốc này không còn hiệu lực (0 = chưa từng thu hồi)
function revOf_(u, cache) {
  let v = cache.get('rev_' + u);
  if (v === null) { v = PropertiesService.getScriptProperties().getProperty('rev_' + u) || '0'; cache.put('rev_' + u, v, SESSION_TTL); }
  return +v;
}
function thuHoiPhien_(u) {
  const v = String(Date.now());
  PropertiesService.getScriptProperties().setProperty('rev_' + u, v);
  CacheService.getScriptCache().put('rev_' + u, v, SESSION_TTL);
  return +v;
}
function giuPhien_(token, user, rev) { // người vừa tự đổi mật khẩu vẫn dùng tiếp phiên hiện tại
  user.t = rev + 1;
  CacheService.getScriptCache().put('ss_' + token, JSON.stringify(user), SESSION_TTL);
}

/** Chuyển cửa hàng đang làm việc (Cài đặt → Nâng cao), trả về dữ liệu của cửa hàng mới. */
function chonCuaHang(token, shop) {
  const user = user_(token);
  if (!SHOPS[shop] || !user.shops.includes(shop)) throw new Error('Tài khoản không được vào cửa hàng này.');
  user.shop = shop;
  CacheService.getScriptCache().put('ss_' + token, JSON.stringify(user), SESSION_TTL);
  return taiDuLieu(token);
}

// ponytail: SHA-256 có muối, đủ cho app nội bộ (bảng mật khẩu chỉ chủ Sheet xem được).
function hashPass_(pass, salt) {
  salt = salt || Utilities.getUuid();
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, salt + pass, Utilities.Charset.UTF_8);
  return { MatKhau: Utilities.base64Encode(bytes), Muoi: salt };
}

// ===== Tải dữ liệu khi mở app =====
// ponytail: tải toàn bộ bảng mỗi lần mở app; đủ nhanh tới vài chục nghìn dòng, lớn hơn thì cần phân trang.
function taiDuLieu(token) {
  const user = user_(token);
  const hang = readTable_('HangHoa');
  const donHang = readTable_('DonHang');
  const s = SHOPS[CUR_SHOP], cd = caiDatMap_(), ch = cuaHang_(CUR_SHOP, cd);
  // Tên các cửa hàng khác chỉ gửi cho tài khoản được vào (quản trị thấy hết để phân quyền)
  const ds = Object.keys(SHOPS).filter(id => user.vaiTro === 'admin' || user.shops.includes(id)).map(id => {
    const c = id === CUR_SHOP ? ch : cuaHang_(id, cd);
    return { id: id, ten: c.ten, moTa: c.moTa, duocVao: user.shops.includes(id) };
  });
  return {
    user: user, congTy: ch.congTy,
    cuaHang: { id: CUR_SHOP, ten: ch.ten, moTa: ch.moTa, icon: s.icon, mau: s.mau }, dsCuaHang: ds,
    khach: readTable_('KhachHang'), hang: hang, baoGia: readTable_('BaoGia'), donHang: donHang,
    phieuKho: readTable_('PhieuKho'), thuTien: readTable_('ThuTien'),
    ton: tonKho_(), thongKe: thongKe_(donHang, hang, Utilities.formatDate(new Date(Date.now() - 90 * 864e5), tz_(), 'yyyy-MM-dd'), '', 8),
  };
}

// Doanh số theo mặt hàng và theo nhóm hàng trong khoảng ngày (chưa VAT, bỏ đơn hủy). soDong = 0: lấy hết.
function thongKe_(donHang, hang, from, to, soDong) {
  const ok = new Set(donHang.filter(d => d.TrangThai !== 'Hủy' && String(d.Ngay) >= from && (!to || String(d.Ngay) <= to)).map(d => String(d.SoDH)));
  const nhom = {};
  hang.forEach(h => { nhom[h.MaHH] = h.NhomHang; });
  const theoHang = {}, theoNhom = {};
  readTable_('DonHangCT').forEach(l => {
    if (!ok.has(String(l.SoDH))) return;
    const k = l.MaHH || l.TenHang, g = nhom[l.MaHH] || 'Dịch vụ / khác';
    const t = theoHang[k] || (theoHang[k] = { MaHH: l.MaHH, TenHang: l.TenHang, DVT: l.DVT, Nhom: g, SoLuong: 0, ThanhTien: 0 });
    t.SoLuong += +l.SoLuong || 0; t.ThanhTien += +l.ThanhTien || 0;
    theoNhom[g] = (theoNhom[g] || 0) + (+l.ThanhTien || 0);
  });
  const ds = Object.values(theoHang).sort((a, b) => b.ThanhTien - a.ThanhTien);
  return {
    topHang: soDong ? ds.slice(0, soDong) : ds,
    theoNhom: Object.keys(theoNhom).map(k => ({ ten: k, tien: theoNhom[k] })).sort((a, b) => b.tien - a.tien),
  };
}

/** Màn hình Báo cáo: doanh số theo mặt hàng, nhóm hàng từ ngày … đến ngày … */
function baoCaoHang(token, from, to) {
  user_(token);
  const ngay = /^\d{4}-\d{2}-\d{2}$/;
  if (!ngay.test(from) || !ngay.test(to)) throw new Error('Khoảng ngày không hợp lệ.');
  return thongKe_(readTable_('DonHang'), readTable_('HangHoa'), from, to, 0);
}

// ===== Khách hàng =====
function luuKhach(token, kh) {
  const user = user_(token);
  if (!String(kh.TenKH || '').trim()) throw new Error('Nhập tên khách hàng.');
  kh.SDT = String(kh.SDT || '').trim();
  return withLock_(() => {
    const moi = !kh.MaKH;
    if (moi) { kh.NgayTao = now_(); kh.NguoiTao = user.ten; }
    upsert_('KhachHang', kh, () => nextCode_('KhachHang', 'KH', 5), ['NgayTao', 'NguoiTao']);
    log_(user, (moi ? 'Thêm' : 'Sửa') + ' khách hàng', kh.MaKH, kh.TenKH);
    return kh;
  });
}
function xoaKhach(token, maKH) {
  const user = user_(token, true);
  withLock_(() => {
    if (readTable_('DonHang').some(d => d.MaKH === maKH) || readTable_('ThuTien').some(p => p.MaKH === maKH)) {
      throw new Error('Khách đã có đơn hàng hoặc phiếu thu, không xóa được (để giữ công nợ).');
    }
    deleteWhere_('KhachHang', maKH);
    log_(user, 'Xóa khách hàng', maKH);
  });
}

// ===== Hàng hóa (chỉ quản trị sửa giá) =====
function luuHang(token, hh) {
  const user = user_(token, true);
  if (!String(hh.TenHang || '').trim()) throw new Error('Nhập tên hàng.');
  return withLock_(() => {
    const moi = !hh.MaHH, gia = v => (v === '' || v == null ? '—' : v + ' đ');
    upsert_('HangHoa', hh, () => nextCode_('HangHoa', 'HH', 4), []);
    log_(user, (moi ? 'Thêm' : 'Sửa') + ' mặt hàng', hh.MaHH, hh.TenHang + ' · sỉ ' + gia(hh.GiaSi) + ' · lẻ ' + gia(hh.GiaLe));
    return hh;
  });
}
function xoaHang(token, maHH) {
  const user = user_(token, true);
  withLock_(() => { deleteWhere_('HangHoa', maHH); log_(user, 'Xóa mặt hàng', maHH); });
}

// ===== Chứng từ có dòng hàng: báo giá (BG), đơn hàng (DH), phiếu nhập (NK), phiếu xuất/giao hàng (XK) =====
function layChungTu(token, loai, so) {
  user_(token);
  const c = ct_(loai);
  const lines = readTable_(c.lines).filter(l => String(l[TABLES[c.lines][0]]) === String(so)).sort((a, b) => a.STT - b.STT);
  if (loai === 'XK') {
    const p = findObj_('PhieuKho', so), han = hanBaoHanh_();
    lines.forEach(l => { l.HetHan = han(p && p.Ngay, l.MaHH); });
  }
  return { lines: lines, daGiao: loai === 'DH' ? daGiao_(so) : null };
}

function luuChungTu(token, loai, doc) {
  const user = user_(token);
  const c = ct_(loai);
  const key = TABLES[c.head][0];
  const lines = (doc.lines || []).filter(l => String(l.TenHang || '').trim());
  if (!lines.length) throw new Error('Chưa có dòng hàng nào.');
  const head = Object.assign({}, doc);
  delete head.lines;
  let imeis = [];
  if (c.loai) {
    lines.forEach((l, i) => { l.STT = i + 1; l.SoLuong = +l.SoLuong || 0; });
    if (lines.some(l => l.SoLuong <= 0)) throw new Error('Số lượng mỗi dòng phải lớn hơn 0.');
    // IMEI/serial: mỗi máy một mã; có nhập thì số mã phải bằng số lượng
    lines.forEach(l => {
      const im = imeiList_(l.IMEI);
      const sai = im.find(x => !/^[A-Z0-9][A-Z0-9._/-]{3,39}$/.test(x));
      if (sai) throw new Error('Dòng ' + l.STT + ': IMEI/serial "' + sai + '" không hợp lệ (4–40 chữ, số).');
      if (im.length && im.length !== l.SoLuong) throw new Error('Dòng ' + l.STT + ': có ' + im.length + ' IMEI/serial nhưng số lượng là ' + l.SoLuong + '.');
      l.IMEI = im.join(', ');
      imeis = imeis.concat(im);
    });
    const lap = imeis.find((x, i) => imeis.indexOf(x) !== i);
    if (lap) throw new Error('IMEI/serial ' + lap + ' bị lặp trong phiếu.');
    if (head.SoDH && !findObj_('DonHang', head.SoDH)) throw new Error('Không tìm thấy đơn hàng ' + head.SoDH + '.');
    head.Loai = c.loai;
  } else {
    if (!String(head.TenKH || '').trim()) throw new Error('Chọn hoặc nhập khách hàng.');
    if (loai === 'DH' && !head.MaKH) throw new Error('Đơn hàng cần chọn khách trong danh sách để theo dõi công nợ.');
    // Tính lại tiền ở máy chủ để số liệu luôn khớp
    lines.forEach((l, i) => {
      l.STT = i + 1; l.SoLuong = +l.SoLuong || 0; l.DonGia = Math.round(+l.DonGia || 0);
      l.ThanhTien = Math.round(l.SoLuong * l.DonGia);
    });
    head.TienHang = lines.reduce((s, l) => s + l.ThanhTien, 0);
    head.VAT = +head.VAT || 0;
    head.TienVAT = Math.round(head.TienHang * head.VAT / 100);
    head.TongCong = head.TienHang + head.TienVAT;
  }
  head.NgaySua = now_();
  if (!head[key]) { head.NguoiTao = user.ten; head.NgayTao = head.NgaySua; }
  return withLock_(() => {
    const old = head[key] ? findObj_(c.head, head[key]) : null;
    if (imeis.length) kiemIMEI_(c.loai, head[key], imeis);
    upsert_(c.head, head, () => nextSo_(c.head, c.suffix || SHOPS[CUR_SHOP].soBG, head.Ngay), ['NguoiTao', 'NgayTao']);
    deleteWhere_(c.lines, head[key]);
    const sh = sheet_(c.lines);
    const rows = lines.map(l => toRow_(sh, Object.assign({}, l, { [TABLES[c.lines][0]]: head[key] })));
    sh.getRange(sh.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
    const huy = loai === 'DH' && head.TrangThai === 'Hủy' && old && old.TrangThai !== 'Hủy';
    if (loai === 'DH') head.TrangThai = capNhatDH_(head[key]);
    const donHang = loai === 'XK' ? capNhatNhieuDH_([old && old.SoDH, head.SoDH]) : null;
    if (loai === 'XK') { const han = hanBaoHanh_(); lines.forEach(l => { l.HetHan = han(head.Ngay, l.MaHH); }); }
    log_(user, (huy ? 'Hủy ' : old ? 'Sửa ' : 'Thêm ') + c.ten, head[key],
      c.loai ? [head.DoiTac, head.SoDH && 'đơn ' + head.SoDH].filter(Boolean).join(' · ') : head.TenKH + ' · ' + head.TongCong + ' đ');
    head.lines = lines;
    return { doc: head, ton: c.loai ? tonKho_() : null, donHang: donHang };
  });
}

function xoaChungTu(token, loai, so) {
  const user = user_(token, true);
  const c = ct_(loai);
  return withLock_(() => {
    const doc = findObj_(c.head, so);
    if (!doc) throw new Error('Không tìm thấy ' + so + '.');
    if (loai === 'DH' && (readTable_('ThuTien').some(p => p.SoDH === so) || readTable_('PhieuKho').some(p => p.SoDH === so))) {
      throw new Error('Đơn đã có phiếu thu hoặc phiếu giao hàng. Xóa các phiếu đó trước, hoặc bấm Hủy đơn.');
    }
    deleteWhere_(c.head, so);
    deleteWhere_(c.lines, so);
    log_(user, 'Xóa ' + c.ten, so, c.loai ? doc.DoiTac : doc.TenKH + ' · ' + doc.TongCong + ' đ');
    return { ton: c.loai ? tonKho_() : null, donHang: loai === 'XK' ? capNhatNhieuDH_([doc.SoDH]) : null };
  });
}

// Tính lại trạng thái các đơn bị ảnh hưởng bởi phiếu xuất, trả về bản mới để giao diện cập nhật
function capNhatNhieuDH_(ds) {
  return ds.filter((so, i) => so && ds.indexOf(so) === i).map(so => { capNhatDH_(so); return findObj_('DonHang', so); }).filter(Boolean);
}

function ct_(loai) {
  if (!CT[loai]) throw new Error('Loại chứng từ không hợp lệ: ' + loai);
  return CT[loai];
}

// Trạng thái giao hàng của đơn: so số lượng đã xuất kho theo đơn với số lượng đặt (đơn Hủy giữ nguyên)
function capNhatDH_(soDH) {
  const sh = sheet_('DonHang');
  const r = findRow_(sh, soDH);
  if (!r) return '';
  const dh = rowObj_(sh, r);
  if (dh.TrangThai === 'Hủy') return 'Hủy';
  const can = {};
  readTable_('DonHangCT').forEach(l => {
    if (String(l.SoDH) !== String(soDH)) return;
    const k = l.MaHH || l.TenHang;
    can[k] = (can[k] || 0) + (+l.SoLuong || 0);
  });
  const da = daGiao_(soDH);
  const keys = Object.keys(can);
  const tt = keys.length && keys.every(k => (da[k] || 0) >= can[k]) ? 'Đã giao'
    : keys.some(k => (da[k] || 0) > 0) ? 'Giao một phần' : 'Chờ giao';
  if (tt !== dh.TrangThai) { dh.TrangThai = tt; writeRow_(sh, r, dh); }
  return tt;
}

// Số lượng đã giao theo từng mặt hàng (MaHH, hoặc tên nếu là dòng dịch vụ) của một đơn
function daGiao_(soDH) {
  const pk = new Set(readTable_('PhieuKho').filter(p => p.Loai === 'Xuất' && String(p.SoDH) === String(soDH)).map(p => String(p.SoPK)));
  const da = {};
  readTable_('PhieuKhoCT').forEach(l => {
    if (!pk.has(String(l.SoPK))) return;
    const k = l.MaHH || l.TenHang;
    da[k] = (da[k] || 0) + (+l.SoLuong || 0);
  });
  return da;
}

// ===== Kho =====
function tonKho_() {
  const loai = {};
  readTable_('PhieuKho').forEach(p => { loai[p.SoPK] = p.Loai; });
  const ton = {};
  readTable_('PhieuKhoCT').forEach(l => {
    if (!l.MaHH || !loai[l.SoPK]) return;
    const t = ton[l.MaHH] || (ton[l.MaHH] = { nhap: 0, xuat: 0 });
    if (loai[l.SoPK] === 'Nhập') t.nhap += +l.SoLuong || 0; else t.xuat += +l.SoLuong || 0;
  });
  return ton;
}

// Thẻ kho: các lần nhập/xuất của một mặt hàng, cũ trước mới sau
function theKho(token, maHH) {
  user_(token);
  const pk = {};
  readTable_('PhieuKho').forEach(p => { pk[p.SoPK] = p; });
  return readTable_('PhieuKhoCT').filter(l => l.MaHH === maHH && pk[l.SoPK]).map(l => {
    const p = pk[l.SoPK];
    return { SoPK: p.SoPK, Ngay: p.Ngay, Loai: p.Loai, SoDH: p.SoDH, DoiTac: p.DoiTac, GhiChu: p.GhiChu, SoLuong: +l.SoLuong || 0, IMEI: l.IMEI || '', NgayTao: p.NgayTao };
  }).sort((a, b) => String(a.Ngay + a.NgayTao).localeCompare(String(b.Ngay + b.NgayTao)));
}

// ===== IMEI/serial và bảo hành =====
// Ô IMEI của một dòng phiếu kho: các mã cách nhau bằng dấu phẩy, chấm phẩy, khoảng trắng hoặc xuống dòng
function imeiList_(v) {
  return String(v == null ? '' : v).toUpperCase().split(/[\s,;]+/).filter(Boolean);
}

// Một máy không xuất 2 lần liền nhau (bán trùng), không nhập 2 lần liền nhau. Nhập kho không bắt buộc ghi IMEI.
// ponytail: chỉ xét phiếu gần nhất của từng IMEI, không dựng lại cả chuỗi khi sửa phiếu cũ lùi ngày.
function kiemIMEI_(loai, soPK, imeis) {
  const can = new Set(imeis), pk = {}, cuoi = {};
  readTable_('PhieuKho').forEach(p => { pk[p.SoPK] = p; });
  readTable_('PhieuKhoCT').forEach(l => {
    const p = pk[l.SoPK];
    if (!p || !l.IMEI || String(l.SoPK) === String(soPK || '')) return;
    const k = String(p.Ngay) + p.NgayTao;
    imeiList_(l.IMEI).forEach(x => { if (can.has(x) && (!cuoi[x] || k >= cuoi[x].k)) cuoi[x] = { k: k, p: p }; });
  });
  imeis.forEach(x => {
    const e = cuoi[x];
    if (e && e.p.Loai === loai) {
      throw new Error(loai === 'Xuất' ? 'IMEI/serial ' + x + ' đã xuất ở phiếu ' + e.p.SoPK + (e.p.SoDH ? ' (đơn ' + e.p.SoDH + ')' : '') + '.'
        : 'IMEI/serial ' + x + ' đã nhập ở phiếu ' + e.p.SoPK + ' và chưa xuất.');
    }
  });
}

// Cộng tháng vào ngày yyyy-MM-dd; ngày 31 rơi vào tháng ngắn thì lấy ngày cuối tháng
function congThang_(ngay, thang) {
  const p = String(ngay).slice(0, 10).split('-').map(Number);
  const m = p[1] - 1 + thang, y = p[0] + Math.floor(m / 12), mm = m % 12;
  const d = Math.min(p[2], new Date(Date.UTC(y, mm + 1, 0)).getUTCDate());
  return y + '-' + String(mm + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
}

// Trả về hàm tính hạn bảo hành của một dòng giao hàng = ngày giao + số tháng của mặt hàng
// (mặt hàng để trống: theo cửa hàng; 0: không bảo hành; dòng dịch vụ không có mã hàng: không bảo hành)
function hanBaoHanh_() {
  const hang = {}, macDinh = +cuaHang_(CUR_SHOP).congTy.baoHanhThang || 0;
  readTable_('HangHoa').forEach(h => { hang[h.MaHH] = h; });
  return (ngay, maHH) => {
    const h = hang[maHH];
    const thang = h && h.BaoHanh !== '' && h.BaoHanh != null ? +h.BaoHanh : macDinh;
    return maHH && ngay && thang > 0 ? congThang_(ngay, thang) : '';
  };
}

/** Hàng đã giao kèm hạn bảo hành, để tra theo IMEI/serial, SĐT, tên khách. */
// ponytail: trả về mọi dòng xuất kho; tới vài chục nghìn dòng thì lọc theo năm.
function dsBaoHanh(token) {
  user_(token);
  const pk = {}, dh = {}, han = hanBaoHanh_();
  readTable_('PhieuKho').forEach(p => { if (p.Loai === 'Xuất') pk[p.SoPK] = p; });
  readTable_('DonHang').forEach(d => { dh[d.SoDH] = d; });
  return readTable_('PhieuKhoCT').filter(l => pk[l.SoPK] && l.MaHH).map(l => {
    const p = pk[l.SoPK], d = dh[p.SoDH] || {};
    return { SoPK: p.SoPK, Ngay: p.Ngay, SoDH: p.SoDH, MaKH: d.MaKH || '', TenKH: d.TenKH || p.DoiTac, SDT: d.SDT || '',
      MaHH: l.MaHH, TenHang: l.TenHang, Model: l.Model, DVT: l.DVT, SoLuong: +l.SoLuong || 0, IMEI: l.IMEI || '', HetHan: han(p.Ngay, l.MaHH) };
  });
}

// ===== Thu tiền =====
function luuThuTien(token, pt) {
  const user = user_(token);
  pt.SoTien = Math.round(+pt.SoTien || 0);
  if (pt.SoTien <= 0) throw new Error('Nhập số tiền thu.');
  if (pt.SoDH) {
    const dh = findObj_('DonHang', pt.SoDH);
    if (!dh) throw new Error('Không tìm thấy đơn hàng ' + pt.SoDH + '.');
    pt.MaKH = dh.MaKH; pt.TenKH = dh.TenKH;
  }
  if (!pt.MaKH) throw new Error('Chọn khách hàng.');
  if (!pt.TenKH) { const kh = findObj_('KhachHang', pt.MaKH); pt.TenKH = kh ? kh.TenKH : ''; }
  return withLock_(() => {
    const moi = !pt.SoPT;
    if (moi) { pt.NguoiTao = user.ten; pt.NgayTao = now_(); }
    upsert_('ThuTien', pt, () => nextSo_('ThuTien', 'PT', pt.Ngay), ['NguoiTao', 'NgayTao']);
    log_(user, (moi ? 'Thêm' : 'Sửa') + ' phiếu thu', pt.SoPT, pt.TenKH + ' · ' + pt.SoTien + ' đ' + (pt.SoDH ? ' · đơn ' + pt.SoDH : ''));
    return pt;
  });
}
function xoaThuTien(token, soPT) {
  const user = user_(token, true);
  withLock_(() => {
    const pt = findObj_('ThuTien', soPT);
    deleteWhere_('ThuTien', soPT);
    log_(user, 'Xóa phiếu thu', soPT, pt ? pt.TenKH + ' · ' + pt.SoTien + ' đ' : '');
  });
}

// ===== Tài khoản =====
const tkPublic_ = r => ({ TenDangNhap: r.TenDangNhap, HoTen: r.HoTen, VaiTro: r.VaiTro, TrangThai: r.TrangThai, CuaHang: shopsOf_(r).join(','), NgayTao: r.NgayTao });

function dsTaiKhoan(token) {
  user_(token, true);
  return readTable_('TaiKhoan').map(tkPublic_);
}

function luuTaiKhoan(token, tk) {
  const user = user_(token, true);
  const u = String(tk.TenDangNhap || '').trim().toLowerCase();
  if (!/^[a-z0-9._]{3,30}$/.test(u)) throw new Error('Tên đăng nhập 3–30 ký tự: chữ không dấu, số, dấu chấm hoặc gạch dưới.');
  if (tk.MatKhau && String(tk.MatKhau).length < 6) throw new Error('Mật khẩu tối thiểu 6 ký tự.');
  return withLock_(() => {
    const sh = sheet_('TaiKhoan');
    const r = findRow_(sh, u);
    if (tk.moi && r) throw new Error('Tên đăng nhập "' + u + '" đã có.');
    if (!r && !tk.MatKhau) throw new Error('Nhập mật khẩu cho tài khoản mới.');
    const cu = r ? rowObj_(sh, r) : null;
    const o = cu ? Object.assign({}, cu) : { TenDangNhap: u, NgayTao: now_() };
    o.HoTen = String(tk.HoTen || '').trim();
    o.VaiTro = tk.VaiTro === 'admin' ? 'admin' : 'nhanvien';
    o.TrangThai = tk.TrangThai === 'Khóa' ? 'Khóa' : 'Hoạt động';
    const shops = String(tk.CuaHang || '').split(',').map(s => s.trim()).filter(s => SHOPS[s]);
    if (!shops.length) throw new Error('Chọn ít nhất 1 cửa hàng tài khoản được vào.');
    o.CuaHang = Object.keys(SHOPS).filter(s => shops.includes(s)).join(',');
    if (tk.MatKhau) Object.assign(o, hashPass_(String(tk.MatKhau)));
    const others = readTable_('TaiKhoan').filter(x => String(x.TenDangNhap) !== u);
    if (!others.concat([o]).some(x => x.VaiTro === 'admin' && x.TrangThai !== 'Khóa')) throw new Error('Phải còn ít nhất 1 tài khoản quản trị đang hoạt động.');
    if (r) writeRow_(sh, r, o); else sh.appendRow(toRow_(sh, o));
    // Khóa, đổi quyền, đổi cửa hàng hoặc đặt lại mật khẩu: các phiên đang đăng nhập của tài khoản đó hết hiệu lực ngay
    const doiQuyen = cu && (cu.VaiTro !== o.VaiTro || cu.TrangThai !== o.TrangThai || shopsOf_(cu).join(',') !== o.CuaHang);
    if (doiQuyen || (cu && tk.MatKhau)) {
      const rev = thuHoiPhien_(u);
      if (!doiQuyen && u === String(user.u).toLowerCase()) giuPhien_(token, user, rev);
    }
    log_(user, (cu ? 'Sửa' : 'Thêm') + ' tài khoản', u, [o.VaiTro, o.TrangThai, o.CuaHang, tk.MatKhau ? 'đặt mật khẩu' : ''].filter(Boolean).join(' · '));
    return tkPublic_(o);
  });
}

function doiMatKhau(token, cu, moi) {
  const user = user_(token);
  if (String(moi || '').length < 6) throw new Error('Mật khẩu mới tối thiểu 6 ký tự.');
  return withLock_(() => {
    const sh = sheet_('TaiKhoan');
    const r = findRow_(sh, user.u);
    const o = rowObj_(sh, r);
    if (hashPass_(String(cu), o.Muoi).MatKhau !== o.MatKhau) throw new Error('Mật khẩu hiện tại không đúng.');
    writeRow_(sh, r, Object.assign(o, hashPass_(String(moi))));
    giuPhien_(token, user, thuHoiPhien_(String(user.u).toLowerCase())); // đăng xuất các thiết bị khác, giữ phiên này
    log_(user, 'Đổi mật khẩu', user.u);
  });
}

// ===== Nhật ký thao tác =====
// Sheet ghi mọi thay đổi dưới tên chủ file (web app chạy bằng quyền chủ), nên cần sổ riêng để biết nhân viên nào làm gì.
// ponytail: không tự dọn; tới vài trăm nghìn dòng thì xóa bớt dòng cũ ngay trong Sheet.
function log_(user, hanhDong, doiTuong, chiTiet) {
  try {
    const sh = sheet_('NhatKy');
    sh.appendRow(toRow_(sh, { ThoiGian: now_(), NguoiDung: user.ten + ' (' + user.u + ')', HanhDong: hanhDong, DoiTuong: doiTuong, ChiTiet: chiTiet || '' }));
  } catch (e) {} // ghi nhật ký lỗi không được làm hỏng thao tác chính
}

function dsNhatKy(token) {
  user_(token, true);
  return readTable_('NhatKy').slice(-500).reverse();
}

// ===== Đọc/ghi bảng =====
// Trang tính của cửa hàng hiện tại (TaiKhoan, CaiDat dùng chung, không có tiền tố)
function tableName_(name) { return (SHARED.includes(name) ? '' : SHOPS[CUR_SHOP].prefix) + name; }
function sheet_(name) {
  const sh = SpreadsheetApp.getActive().getSheetByName(tableName_(name));
  if (!sh) throw new Error('Thiếu trang tính "' + tableName_(name) + '". Chạy hàm caiDat một lần.');
  return sh;
}
function headers_(sh) { return sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String); }
function tz_() { return 'Asia/Ho_Chi_Minh'; }
function now_() { return Utilities.formatDate(new Date(), tz_(), 'yyyy-MM-dd HH:mm'); }
function cell_(v) { return v instanceof Date ? Utilities.formatDate(v, tz_(), 'yyyy-MM-dd') : v; }

function readTable_(name) {
  const values = sheet_(name).getDataRange().getValues();
  const head = values.shift().map(String);
  return values.filter(r => r[0] !== '').map(r => {
    const o = {};
    head.forEach((h, i) => { if (h) o[h] = cell_(r[i]); });
    return o;
  });
}

function toRow_(sh, o) {
  return headers_(sh).map(c => {
    const v = o[c] === undefined || o[c] === null ? '' : o[c];
    if (NUMBER_COLS.includes(c)) return v === '' ? '' : Number(v) || 0;
    const s = String(v);
    return /^[=+\-@]/.test(s) ? "'" + s : s; // không cho chuỗi nhập vào thành công thức
  });
}

function rowObj_(sh, r) {
  const head = headers_(sh);
  const vals = sh.getRange(r, 1, 1, head.length).getValues()[0];
  const o = {};
  head.forEach((h, i) => { o[h] = cell_(vals[i]); });
  return o;
}

function writeRow_(sh, r, o) {
  const row = toRow_(sh, o);
  sh.getRange(r, 1, 1, row.length).setValues([row]);
}

// Dòng (1-based) có cột A = key, 0 nếu không có
function findRow_(sh, key) {
  const n = sh.getLastRow();
  if (n < 2) return 0;
  const ids = sh.getRange(2, 1, n - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) if (String(ids[i][0]) === String(key)) return i + 2;
  return 0;
}

function findObj_(name, key) {
  const sh = sheet_(name);
  const r = findRow_(sh, key);
  return r ? rowObj_(sh, r) : null;
}

// Thêm mới (cột A trống) hoặc cập nhật theo cột A; keep = các cột giữ nguyên giá trị cũ khi cập nhật
function upsert_(name, obj, newKey, keep) {
  const sh = sheet_(name);
  const key = TABLES[name][0];
  if (obj[key]) {
    const r = findRow_(sh, obj[key]);
    if (!r) throw new Error('Không tìm thấy ' + obj[key] + ' (có thể đã bị xóa).');
    const old = rowObj_(sh, r);
    keep.forEach(k => { obj[k] = old[k]; });
    writeRow_(sh, r, obj);
  } else {
    obj[key] = newKey();
    sh.appendRow(toRow_(sh, obj));
  }
  return obj;
}

// Xóa mọi dòng có cột A = key (xóa theo cụm liền nhau, từ dưới lên)
function deleteWhere_(name, key) {
  const sh = sheet_(name);
  const n = sh.getLastRow();
  if (n < 2) return;
  const ids = sh.getRange(1, 1, n, 1).getValues().map(r => String(r[0]));
  for (let i = n - 1; i >= 1; i--) {
    if (ids[i] !== String(key)) continue;
    let j = i;
    while (j - 1 >= 1 && ids[j - 1] === String(key)) j--;
    sh.deleteRows(j + 1, i - j + 1);
    i = j;
  }
}

function nextCode_(name, prefix, width) {
  const sh = sheet_(name);
  const n = sh.getLastRow();
  const ids = n > 1 ? sh.getRange(2, 1, n - 1, 1).getValues() : [];
  const max = ids.reduce((m, r) => {
    const k = String(r[0]);
    const num = k.indexOf(prefix) === 0 ? parseInt(k.slice(prefix.length), 10) : NaN;
    return num > m ? num : m;
  }, 0);
  return prefix + String(max + 1).padStart(width, '0');
}

// Số chứng từ dạng 001-2026/DH theo năm của ngày chứng từ
function nextSo_(name, suffix, ngay) {
  const year = String(ngay || now_()).slice(0, 4);
  const re = new RegExp('^(\\d+)-' + year + '/' + suffix + '$');
  let max = 0;
  const sh = sheet_(name);
  const n = sh.getLastRow();
  if (n > 1) sh.getRange(2, 1, n - 1, 1).getValues().forEach(r => { const m = String(r[0]).match(re); if (m) max = Math.max(max, +m[1]); });
  return String(max + 1).padStart(3, '0') + '-' + year + '/' + suffix;
}

// ponytail: một khóa chung cho mọi lần ghi; đủ cho vài chục người dùng cùng lúc.
function withLock_(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try { return fn(); } finally { lock.releaseLock(); }
}
