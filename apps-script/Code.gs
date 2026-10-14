/**
 * Web app quản lý bán hàng cửa hàng phuonghihi (iPhone).
 * Khách hàng, hàng hóa, báo giá, đơn hàng, giao hàng – kho (IMEI, bảo hành), thu tiền – công nợ, báo cáo, nhật ký.
 * Dữ liệu nằm ở chính Google Sheet chứa script này: mỗi cửa hàng một bộ trang tính có tiền tố riêng (SHOPS),
 * riêng trang TaiKhoan và CaiDat dùng chung. Hiện chỉ có 1 cửa hàng; thêm cửa hàng thì thêm một mục vào SHOPS.
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
};
let CUR_SHOP = SHOP_MAC_DINH; // cửa hàng của lần gọi hiện tại, lấy từ phiên đăng nhập trong user_()

// Tên trang tính và cột. Thứ tự cột trong Sheet có thể đổi, code tìm cột theo tên ở dòng 1.
const TABLES = {
  TaiKhoan: ['TenDangNhap', 'HoTen', 'VaiTro', 'MatKhau', 'Muoi', 'TrangThai', 'CuaHang', 'NgayTao'],
  CaiDat: ['Khoa', 'GiaTri'],
  KhachHang: ['MaKH', 'TenKH', 'NguoiLienHe', 'SDT', 'DiaChi', 'MST', 'Email', 'GhiChu', 'NgayTao', 'NguoiTao', 'NguoiDaiDien', 'ChucVu', 'SoTK', 'NganHang', 'VanPhongGD'], // 5 cột cuối: thông tin bên A khi lập hợp đồng
  HangHoa: ['MaHH', 'TenHang', 'Model', 'NhomHang', 'PhanLoai', 'DVT', 'XuatXu', 'GiaSi', 'GiaLe', 'TonToiThieu', 'GhiChu', 'BaoHanh'],
  BaoGia: ['SoBG', 'Ngay', 'MaKH', 'TenKH', 'NguoiNhan', 'SDT', 'DiaChi', 'TienHang', 'VAT', 'TienVAT', 'TongCong', 'GhiChu', 'NguoiTao', 'NgayTao', 'NgaySua', 'GiamGia'], // GiamGia: giảm giá cả đơn (trừ trước VAT); TienHang = cộng các dòng − GiamGia
  BaoGiaCT: ['SoBG', 'STT', 'MaHH', 'TenHang', 'Model', 'DVT', 'XuatXu', 'SoLuong', 'LoaiGia', 'DonGia', 'ThanhTien'],
  DonHang: ['SoDH', 'Ngay', 'SoBG', 'MaKH', 'TenKH', 'NguoiNhan', 'SDT', 'DiaChi', 'NgayGiao', 'TienHang', 'VAT', 'TienVAT', 'TongCong', 'TrangThai', 'GhiChu', 'NguoiTao', 'NgayTao', 'NgaySua', 'GiamGia'],
  DonHangCT: ['SoDH', 'STT', 'MaHH', 'TenHang', 'Model', 'DVT', 'XuatXu', 'SoLuong', 'LoaiGia', 'DonGia', 'ThanhTien'],
  PhieuKho: ['SoPK', 'Ngay', 'Loai', 'SoDH', 'DoiTac', 'GhiChu', 'NguoiTao', 'NgayTao', 'NgaySua'],
  PhieuKhoCT: ['SoPK', 'STT', 'MaHH', 'TenHang', 'Model', 'DVT', 'SoLuong', 'IMEI', 'GiaVon'], // GiaVon: giá nhập một đơn vị (dòng của phiếu nhập) để tính lợi nhuận
  ThuTien: ['SoPT', 'Ngay', 'MaKH', 'TenKH', 'SoDH', 'SoTien', 'HinhThuc', 'GhiChu', 'NguoiTao', 'NgayTao'],
  SuaChua: ['SoPN', 'NgayNhan', 'Loai', 'MaKH', 'TenKH', 'SDT', 'TenMay', 'IMEI', 'TinhTrang', 'PhuKien', 'MatKhauMay', 'NgayHen', 'TrangThai', 'ChiPhi', 'KetQua', 'NgayTra', 'SoDH', 'Anh', 'NguoiTao', 'NgayTao', 'NgaySua', 'LinhKien'], // LinhKien: JSON linh kiện lấy từ kho [{ MaHH, TenHang, DVT, SoLuong }]; phiếu nhận bảo hành – sửa chữa; DichVu.gs
  PhieuChi: ['SoPC', 'Ngay', 'Loai', 'DoiTac', 'SoTien', 'HinhThuc', 'GhiChu', 'NguoiTao', 'NgayTao', 'MaHH', 'IMEI'], // sổ quỹ: tiền chi ra (trả nhà cung cấp, chi phí); SoQuy.gs
  GiaiNgan: ['SoGN', 'Ngay', 'HinhThuc', 'SoTien', 'ThucNhan', 'GhiChu', 'NguoiTao', 'NgayTao'], // tiền chờ giải ngân (trả góp, thẻ…) về ngân hàng: SoTien rời quỹ chờ, ThucNhan vào ngân hàng, chênh = phí; SoQuy.gs
  NhatKy: ['ThoiGian', 'NguoiDung', 'HanhDong', 'DoiTuong', 'ChiTiet'],
  // Hợp đồng: bên A = khách (các cột TenDN…NganHang), bên B = cửa hàng (lấy từ cài đặt cửa hàng khi tạo file)
  HopDong: ['SoHD', 'Ngay', 'LoaiHD', 'SoDH', 'MaKH', 'TenDN', 'DiaChi', 'VanPhongGD', 'MST', 'NguoiDaiDien', 'ChucVu', 'SDT', 'SoTK', 'NganHang', 'SoCCCD', 'CCCDCap', 'IMEI',
    'NgayHieuLuc', 'NgayHetHan', 'BaoTruocNgay', 'TuGiaHan', 'ThangGiaHan', 'NguoiPhuTrach', 'TrangThai', 'TienHang', 'VAT', 'TienVAT', 'TongCong', 'BangChu', 'GhiChu', 'FileId', 'LinkFile', 'NgayFile', 'FileCu', 'KyFileId', 'NguoiKy', 'NgayKyDT', 'MaXacThuc', 'NguoiTao', 'NgayTao', 'NgaySua'], // FileCu = '1' khi hợp đồng đã sửa sau lần tạo file gần nhất
  HopDongCT: ['SoHD', 'STT', 'MaHH', 'TenHang', 'DVT', 'SoLuong', 'DonGia', 'ThanhTien', 'IMEI'],
  HopDongLich: ['SoHD', 'Dot', 'Nhan', 'NgayDen', 'SoTien', 'SoPT', 'NgayThu'], // lịch thanh toán / trả góp: mỗi đợt một dòng; SoPT = phiếu thu đã ghi nhận cho đợt đó
  MauHopDong: ['LoaiHD', 'LinkMau', 'MoTa', 'NgayTao'], // mỗi loại hợp đồng một file Google Docs mẫu
  // Điện thoại đã đăng nhập app (Api.gs): MaMay = SHA-256 của mã đăng nhập máy (không lưu mã gốc), CapLuc = mốc cấp (ms) để thu hồi khi tài khoản bị khóa/đổi mật khẩu
  ThietBi: ['MaMay', 'TenDangNhap', 'TenMay', 'CapLuc', 'NgayTao', 'LanCuoi', 'PushToken'], // PushToken: mã nhận thông báo của app (trống = tắt)
};
// Ngân hàng nhận chuyển khoản qua mã VietQR: [mã BIN, tên] (theo danh sách của vietqr.io). Gửi cho giao diện và dùng khi in tên ngân hàng vào hợp đồng.
const NGAN_HANG = [['970436', 'Vietcombank'], ['970415', 'VietinBank'], ['970418', 'BIDV'], ['970405', 'Agribank'], ['970407', 'Techcombank'], ['970422', 'MB Bank'],
  ['970416', 'ACB'], ['970432', 'VPBank'], ['970423', 'TPBank'], ['970403', 'Sacombank'], ['970437', 'HDBank'], ['970441', 'VIB'], ['970443', 'SHB'],
  ['970431', 'Eximbank'], ['970426', 'MSB'], ['970448', 'OCB'], ['970440', 'SeABank'], ['970449', 'LPBank'], ['970428', 'Nam A Bank'], ['970409', 'Bac A Bank'],
  ['970425', 'ABBank'], ['970427', 'VietABank'], ['970412', 'PVcomBank'], ['970429', 'SCB'], ['970419', 'NCB'], ['970452', 'KienlongBank'], ['970400', 'Saigonbank'],
  ['970438', 'BaoViet Bank'], ['970433', 'VietBank'], ['970430', 'PGBank'], ['970454', 'Viet Capital Bank'], ['970414', 'MBV'], ['970446', 'Co-opBank'],
  ['970424', 'Shinhan Bank'], ['970457', 'Woori Bank'], ['422589', 'CIMB'], ['668888', 'KBank'], ['546034', 'CAKE'], ['546035', 'Ubank'], ['963388', 'Timo']];
const SHARED = ['TaiKhoan', 'CaiDat', 'ThietBi']; // trang dùng chung cho mọi cửa hàng, không có tiền tố
const NUMBER_COLS = ['Dot', 'BaoTruocNgay', 'ThangGiaHan', 'GiaSi', 'GiaLe', 'TonToiThieu', 'BaoHanh', 'TienHang', 'VAT', 'TienVAT', 'TongCong', 'STT', 'SoLuong', 'DonGia', 'ThanhTien', 'SoTien', 'GiaVon', 'ChiPhi', 'GiamGia', 'ThucNhan'];
const SESSION_TTL = 6 * 60 * 60; // giây; tối đa của CacheService, tự gia hạn khi còn dùng
const SCHEMA = '16'; // tăng số này khi thêm bảng/cột ở TABLES (hoặc cần sửa dữ liệu một lần): app tự làm ở lần gọi đầu sau khi triển khai

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
 * Chạy trong trình soạn thảo Apps Script: tạo trang tính/cột còn thiếu, xóa cửa hàng đã bỏ và tạo tài khoản admin. Chạy lại được.
 */
function caiDat() {
  taoBang_(true);
  xoaCuaHangDaBo_();
  const go = boNhanThu_();
  if (go) Logger.log('Đã bỏ dấu [THỬ] ở ' + go + ' ô dữ liệu thử.');
  const kieu = suaKieuO_();
  if (kieu) Logger.log('Đã sửa ' + kieu + ' ô bị Sheets đổi thành số / ngày (SĐT, MST, ngày giờ…).');
  try { Logger.log('Đã tạo ' + taoMauMacDinh_().length + ' file mẫu hợp đồng trong Google Drive.'); } // cũng là bước xin quyền Google Docs/Drive lần đầu
  catch (e) { Logger.log('Chưa tạo được mẫu hợp đồng (cấp quyền Google Docs/Drive rồi chạy lại caiDat): ' + e); }
  PropertiesService.getScriptProperties().setProperty('schema', SCHEMA);
  if (readTable_('TaiKhoan').some(u => u.VaiTro === 'admin')) return Logger.log('Đã có tài khoản admin, không tạo thêm.');
  const pass = Utilities.getUuid().slice(0, 8);
  ghiDong_(sheet_('TaiKhoan'), [toRow_(sheet_('TaiKhoan'), Object.assign({ TenDangNhap: 'admin', HoTen: 'Quản trị', VaiTro: 'admin',
    TrangThai: 'Hoạt động', CuaHang: Object.keys(SHOPS).join(','), NgayTao: now_() }, hashPass_(pass)))]);
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
      if (!sh) { sh = ss.insertSheet(full); moi = true; }
      const have = sh.getLastRow() ? headers_(sh) : [];
      const missing = cols.filter(c => have.indexOf(c) < 0);
      const thieuCot = have.length + missing.length - sh.getMaxColumns(); // trang tính đã dùng hết số cột của lưới
      if (thieuCot > 0) sh.insertColumnsAfter(sh.getMaxColumns(), thieuCot);
      if (missing.length) { sh.getRange(1, have.length + 1, 1, missing.length).setValues([missing]); daGhi_(sh); }
      // Cột chữ để dạng văn bản: giữ số 0 đầu SĐT, mã số thuế, IMEI
      const all = have.concat(missing);
      (dayDu ? all : missing).forEach(c => { if (c && !NUMBER_COLS.includes(c)) sh.getRange(1, all.indexOf(c) + 1, sh.getMaxRows(), 1).setNumberFormat('@'); });
      if (dayDu || moi) sh.setFrozenRows(1);
      if (shop !== SHOP_MAC_DINH && (dayDu || moi)) sh.hideSheet(); // mở file Sheet chỉ thấy cửa hàng mặc định
    }
  }
  CUR_SHOP = cur;
}

// Cửa hàng đã bỏ khỏi app (id → tiền tố trang tính). caiDat dọn sạch phần còn sót của các cửa hàng này.
const CUA_HANG_DA_BO = { pccc: 'PCCC_' };

/**
 * Xóa hẳn trang tính, cấu hình và quyền truy cập của cửa hàng đã bỏ. Không hoàn tác trong app
 * (khôi phục bằng Tệp → Lịch sử phiên bản của Google Sheet). Chạy lại được. Trả về danh sách trang đã xóa.
 */
function xoaCuaHangDaBo_() {
  const ss = SpreadsheetApp.getActive(), daXoa = [];
  ss.getSheets().forEach(sh => {
    const ten = sh.getName();
    if (Object.keys(CUA_HANG_DA_BO).some(id => ten.indexOf(CUA_HANG_DA_BO[id]) === 0)) { ss.deleteSheet(sh); daXoa.push(ten); }
  });
  Object.keys(CUA_HANG_DA_BO).forEach(id => deleteWhere_('CaiDat', 'cuaHang.' + id));
  // Tài khoản: bỏ cửa hàng cũ khỏi danh sách được vào; nhân viên chỉ được vào cửa hàng cũ thì khóa (kẻo tự rơi vào cửa hàng mặc định)
  const sh = sheet_('TaiKhoan'), n = sh.getLastRow();
  for (let r = 2; r <= n; r++) {
    const o = rowObj_(sh, r);
    const truoc = String(o.CuaHang || '').split(',').map(x => x.trim()).filter(Boolean), con = truoc.filter(x => SHOPS[x]);
    if (con.length === truoc.length) continue;
    o.CuaHang = con.join(',');
    if (!con.length && o.VaiTro !== 'admin') { o.TrangThai = 'Khóa'; Logger.log('Đã khóa tài khoản ' + o.TenDangNhap + ' (chỉ được vào cửa hàng đã bỏ). Mở khóa và cấp cửa hàng nếu cần.'); }
    writeRow_(sh, r, o);
    thuHoiPhien_(String(o.TenDangNhap).toLowerCase());
  }
  if (daXoa.length) Logger.log('Đã xóa ' + daXoa.length + ' trang tính của cửa hàng đã bỏ: ' + daXoa.join(', '));
  return daXoa;
}

// Bản code mới có thêm bảng/cột (SCHEMA đổi): tự thêm vào Sheet, không cần chạy lại caiDat
// Nâng cấp lỗi thì app vẫn chạy với bảng cũ (tính năng mới chưa lưu được) và thử lại sau 10 phút; chạy caiDat trong trình soạn thảo để xem lỗi.
function nangCap_(cache) {
  const p = PropertiesService.getScriptProperties();
  let ok = p.getProperty('schema') === SCHEMA;
  if (!ok) {
    let boSung = false, tonMay = false;
    try {
      withLock_(() => {
        taoBang_(false);
        try { boNhanThu_(); } catch (e) { console.error('Không gỡ được dấu [THỬ] của dữ liệu thử: ' + e); } // DuLieuThu.gs, chỉ chạy một lần
        try { suaKieuO_(); } catch (e) { console.error('Không sửa được ô bị đổi kiểu: ' + e); }
        try { suaGioLech_(); } catch (e) { console.error('Không sửa được ngày giờ bị lệch: ' + e); }
        p.setProperty('schema', SCHEMA);
        if (!p.getProperty('boSung.10')) { p.setProperty('boSung.10', '1'); boSung = true; } // phần bổ sung của bản 10: chỉ một lần gọi làm
        if (!p.getProperty('tonMay.15')) { p.setProperty('tonMay.15', '1'); tonMay = true; } // bản 15: tồn kho máy 2–3 máy mỗi mã, có IMEI (DuLieuThu.gs)
      });
      ok = true;
    }
    catch (e) { console.error('Không tự nâng cấp được Sheet: ' + e); }
    // Ngoài khóa (các hàm bên trong tự giữ khóa): thêm mẫu hợp đồng mặc định mới, hợp đồng mẫu mới cho Sheet đang có dữ liệu thử
    if (boSung) { try { boSungBanMoi_(); } catch (e) { console.error('Không bổ sung được mẫu / dữ liệu thử của bản mới: ' + e); } }
    if (tonMay) { try { chuanHoaTonMay(); } catch (e) { console.error('Không chuẩn hóa được tồn kho máy (chạy chuanHoaTonMay trong trình soạn thảo): ' + e); } }
  }
  cache.put('schema', SCHEMA, ok ? SESSION_TTL : 600);
}

/** Phần bổ sung một lần của bản mới: thêm mẫu hợp đồng mặc định mới (Sheet đã có mẫu), thêm hợp đồng mẫu mới vào dữ liệu thử. */
function boSungBanMoi_() {
  const cur = CUR_SHOP, kq = { mau: [], hd: 0 };
  try {
    Object.keys(SHOPS).forEach(shop => {
      CUR_SHOP = shop;
      if (readTable_('MauHopDong').length) kq.mau = kq.mau.concat(taoMauMacDinh_(HD_LOAI_MOI_)); // trước, để hợp đồng mẫu mới có đúng loại
      kq.hd += boSungDuLieuThu_();
    });
  } finally { CUR_SHOP = cur; }
  console.log('Bổ sung bản mới: ' + kq.mau.length + ' mẫu hợp đồng, ' + kq.hd + ' hợp đồng mẫu.');
  return kq;
}

/**
 * Bản SCHEMA 10 đổi các ô ngày (Sheets đã tự đổi thành ngày theo múi giờ của file Sheet) ra chữ theo giờ Việt Nam: ngày "2026-10-06" thành
 * "2026-10-06 14:00", giờ lệch 14–15 tiếng. Sửa một lần đúng các dòng bị ảnh hưởng trên Sheet của cửa hàng (danh sách dòng đối chiếu
 * với bản xuất Sheet trước khi sửa; Sheet khác không bị nên không làm gì). Đổi ngược: giờ Việt Nam → giờ của file Sheet.
 */
const GIO_LECH_ = { sheetId: '18LVeevKd0Gp9E_9-TORmBIpI-sMsEdJqz7ZofsyCOpc',
  dong: { ThietBi: [2, 2], PS_HopDong: [2, 6], PS_MauHopDong: [2, 7], PS_NhatKy: [2, 354], PS_KhachHang: [2, 14], PS_BaoGia: [2, 13], PS_DonHang: [2, 29], PS_PhieuKho: [3, 29], PS_ThuTien: [2, 27] } };
const COT_NGAY_ = /^(Ngay|NgayGiao|NgayTao|NgaySua|NgayHieuLuc|NgayHetHan|NgayDen|NgayThu|ThoiGian|LanCuoi|NgayFile|NgayKyDT)$/;
function suaGioLech_() {
  const ss = SpreadsheetApp.getActive(), p = PropertiesService.getScriptProperties();
  if (ss.getId() !== GIO_LECH_.sheetId || p.getProperty('suaGioLech') || tzSheet_() === tz_()) return 0;
  let sua = 0;
  Object.keys(GIO_LECH_.dong).forEach(ten => {
    const sh = ss.getSheetByName(ten);
    if (!sh) return;
    const [dau, cuoi] = GIO_LECH_.dong[ten], head = headers_(sh), n = Math.min(cuoi, sh.getLastRow()) - dau + 1;
    if (n < 1) return;
    const vals = sh.getRange(dau, 1, n, head.length).getValues();
    vals.forEach(row => head.forEach((k, j) => {
      const v = row[j];
      if (!COT_NGAY_.test(k) || typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(v)) return;
      const s = Utilities.formatDate(Utilities.parseDate(v, tz_(), 'yyyy-MM-dd HH:mm'), tzSheet_(), 'yyyy-MM-dd HH:mm');
      row[j] = s.slice(11) === '00:00' ? s.slice(0, 10) : s; sua++;
    }));
    ghiDong_(sh, vals.map(row => row.map(v => (typeof v === 'string' && /^[=+\-@]/.test(v) ? "'" + v : v))), dau);
  });
  p.setProperty('suaGioLech', '1');
  return sua;
}

// Cột chữ chứa số cần giữ số 0 đầu: độ dài đúng của số (thiếu đúng một chữ số thì thêm 0 đầu)
const SO_0_DAU = { SDT: 10, MST: 10, SoCCCD: 12 };
/**
 * Bản cũ ghi vào ô định dạng "Tự động": Sheets đã đổi "0911000001" thành số 911000001, "2026-10-07 14:52" thành ngày.
 * Chạy một lần (cờ suaKieuO.<cửa hàng>): đặt định dạng văn bản cho cả cột chữ, đổi số về chữ (thêm lại số 0 đầu cho SĐT, MST, CCCD;
 * số tài khoản của khách mẫu lấy lại từ dữ liệu thử), đổi ngày về "yyyy-MM-dd HH:mm" (hoặc "yyyy-MM-dd" khi không có giờ). Trả về số ô đã sửa.
 */
function suaKieuO_() {
  const p = PropertiesService.getScriptProperties(), cur = CUR_SHOP;
  let sua = 0;
  try {
    Object.keys(SHOPS).forEach(shop => {
      CUR_SHOP = shop;
      const co = 'suaKieuO.' + shop;
      if (p.getProperty(co)) return;
      const tkThu = soTKThu_(); // MaKH → số tài khoản gốc của khách mẫu
      Object.keys(TABLES).filter(t => shop === SHOP_MAC_DINH || !SHARED.includes(t)).forEach(t => {
        const sh = SpreadsheetApp.getActive().getSheetByName(tableName_(t));
        if (!sh || sh.getLastRow() < 2) return;
        const vals = sh.getDataRange().getValues(), head = vals[0].map(String), cMaKH = head.indexOf('MaKH');
        const chu = head.map(c => !!c && !NUMBER_COLS.includes(c));
        head.forEach((c, i) => { if (chu[i]) sh.getRange(1, i + 1, sh.getMaxRows(), 1).setNumberFormat('@'); }); // dòng thêm sau này cũng là chữ
        const dongSua = [];
        for (let r = 1; r < vals.length; r++) {
          let doi = false;
          vals[r].forEach((v, j) => {
            if (!chu[j] || typeof v === 'string') return;
            let s;
            if (v instanceof Date) { const gio = Utilities.formatDate(v, tzSheet_(), 'HH:mm'); s = Utilities.formatDate(v, tzSheet_(), gio === '00:00' ? 'yyyy-MM-dd' : 'yyyy-MM-dd HH:mm'); } // đúng chữ đã ghi lúc đầu
            else s = String(v);
            if (typeof v === 'number' && SO_0_DAU[head[j]] && s.length === SO_0_DAU[head[j]] - 1) s = '0' + s;
            if (typeof v === 'number' && head[j] === 'SoTK' && cMaKH >= 0 && tkThu[vals[r][cMaKH]]) s = tkThu[vals[r][cMaKH]];
            vals[r][j] = s; doi = true; sua++;
          });
          if (doi) dongSua.push(r);
        }
        for (let i = 0; i < dongSua.length;) { // ghi từng cụm dòng liền nhau đã sửa
          let j = i;
          while (j + 1 < dongSua.length && dongSua[j + 1] === dongSua[j] + 1) j++;
          ghiDong_(sh, vals.slice(dongSua[i], dongSua[j] + 1).map(row => row.map(v => (typeof v === 'string' && /^[=+\-@]/.test(v) ? "'" + v : v))), dongSua[i] + 1);
          i = j + 1;
        }
      });
      p.setProperty(co, '1');
    });
  } finally { CUR_SHOP = cur; }
  return sua;
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
  c.choGiaiNgan = docChoGiaiNgan_(o.choGiaiNgan, c.hinhThuc); // SoQuy.gs
  if (!c.ten) throw new Error('Nhập tên cửa hàng in trên chứng từ.');
  if (!c.hinhThuc.length) throw new Error('Nhập ít nhất 1 hình thức thu tiền.');
  if ((c.qrNganHang || c.qrSoTK) && !(/^\d{6}$/.test(c.qrNganHang) && /^[A-Za-z0-9]{4,19}$/.test(c.qrSoTK))) {
    throw new Error('Mã QR chuyển khoản: chọn ngân hàng và nhập số tài khoản (4–19 chữ số, viết liền).');
  }
  const giaTri = JSON.stringify({ ten: str(o.tenNgan, 60), moTa: str(o.moTa, 100), congTy: c });
  return withLock_(() => {
    const sh = sheet_('CaiDat'), khoa = 'cuaHang.' + CUR_SHOP, r = findRow_(sh, khoa), row = toRow_(sh, { Khoa: khoa, GiaTri: giaTri });
    ghiDong_(sh, [row], r);
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
  const user = phienMoi_(tk, Math.max(Date.now(), revOf_(u, cache) + 1)); // thời điểm đăng nhập, để thu hồi phiên cũ khi tài khoản bị khóa/đổi quyền
  cache.put('ss_' + token, JSON.stringify(user), SESSION_TTL);
  return { token: token, user: user };
}

// Thông tin phiên của tài khoản tk, đăng nhập lúc t (ms)
function phienMoi_(tk, t) {
  const shops = shopsOf_(tk);
  return { u: tk.TenDangNhap, ten: tk.HoTen || tk.TenDangNhap, vaiTro: tk.VaiTro, shops: shops,
    shop: shops.includes(SHOP_MAC_DINH) ? SHOP_MAC_DINH : shops[0], t: t }; // luôn mở cửa hàng mặc định trước
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
  if (!BANG_DA_DOC_) BANG_DA_DOC_ = {}; // lần gọi từ web: mỗi trang tính đọc một lần (xem docMotLan_); mọi lần ghi đều qua ghiDong_/deleteWhere_ → daGhi_
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
  const mauHD = readTable_('MauHopDong'), phieuKho = readTable_('PhieuKho'), pkCT = readTable_('PhieuKhoCT');
  const dongPK = {};
  pkCT.forEach(l => { (dongPK[l.SoPK] || (dongPK[l.SoPK] = [])).push(l); });
  phieuKho.forEach(p => Object.assign(p, tomTatPK_(dongPK[p.SoPK] || [])));
  // Tên các cửa hàng khác chỉ gửi cho tài khoản được vào (quản trị thấy hết để phân quyền)
  const ds = Object.keys(SHOPS).filter(id => user.vaiTro === 'admin' || user.shops.includes(id)).map(id => {
    const c = id === CUR_SHOP ? ch : cuaHang_(id, cd);
    return { id: id, ten: c.ten, moTa: c.moTa, duocVao: user.shops.includes(id) };
  });
  return {
    user: user, congTy: ch.congTy,
    cuaHang: { id: CUR_SHOP, ten: ch.ten, moTa: ch.moTa, icon: s.icon, mau: s.mau }, dsCuaHang: ds,
    khach: readTable_('KhachHang'), hang: hang, baoGia: readTable_('BaoGia'), donHang: donHang,
    phieuKho: phieuKho, thuTien: readTable_('ThuTien'), phieuChi: readTable_('PhieuChi'), giaiNgan: readTable_('GiaiNgan'), soDuDau: soDuDau_(cd), loaiChi: LOAI_CHI,
    suaChua: readTable_('SuaChua'), ttSua: TT_SUA, loaiSua: LOAI_SUA, htMayCu: HT_MAY_CU,
    giaVon: user.vaiTro === 'admin' ? giaVonBQ_(phieuKho, pkCT) : {}, hopDong: readTable_('HopDong').map(h => hdChoUser_(user, h)), mauHD: user.vaiTro === 'admin' ? mauHD : [], loaiHD: loaiHopDong_(mauHD), hopDongLich: readTable_('HopDongLich'), nganHang: NGAN_HANG, emailSang: user.vaiTro === 'admin' ? cauHinhEmailSang_(CUR_SHOP, cd) : null,
    ton: tonKho_(phieuKho, pkCT), thongKe: thongKe_(donHang, hang, Utilities.formatDate(new Date(Date.now() - 90 * 864e5), tz_(), 'yyyy-MM-dd'), '', 8),
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

// ===== Nhập hàng loạt từ file Excel/CSV: khách hàng, hàng hóa =====
const NHAP_TOI_DA = 2000;
const NHAP_KHACH = ['TenKH', 'NguoiLienHe', 'SDT', 'DiaChi', 'MST', 'Email', 'NguoiDaiDien', 'ChucVu', 'VanPhongGD', 'SoTK', 'NganHang', 'GhiChu'];
const NHAP_HANG = ['TenHang', 'Model', 'NhomHang', 'PhanLoai', 'DVT', 'XuatXu', 'GiaSi', 'GiaLe', 'TonToiThieu', 'BaoHanh', 'GhiChu'];
const NHAP_SO = ['GiaSi', 'GiaLe', 'TonToiThieu', 'BaoHanh'];
// Số điện thoại chỉ còn chữ số; +84 / 84 + 9 số đổi về 0 + 9 số để "+84 911 000 001" khớp "0911000001"
const sdtVN_ = x => { const d = String(x == null ? '' : x).replace(/\D/g, ''); return /^84\d{9}$/.test(d) ? '0' + d.slice(2) : /^840\d{9}$/.test(d) ? d.slice(2) : d; };
// Nhiều số trong một ô: cách nhau bằng / , ; xuống dòng hoặc " - " (dấu gạch có khoảng trắng hai bên; "0911-000-001" vẫn là một số)
const sdtList_ = s => String(s || '').split(/[\/,;\n]|\s[-–]\s/).map(sdtVN_).filter(x => x.length >= 8);

// Ghi nhiều dòng một lần (một lệnh setValues). kiem(o) trả về lý do lỗi hoặc ''; khoa(o) trả các khóa dùng để bỏ dòng trùng
// (daCo = khóa đã có trong Sheet); them(o) bổ sung cột tự điền. Trả { them: bản ghi đã ghi, bo: [{ dong, ly }] }.
function nhapBang_(name, prefix, width, rows, cols, kiem, khoa, daCo, them) {
  if (!Array.isArray(rows) || !rows.length) throw new Error('Không có dòng nào để nhập.');
  if (rows.length > NHAP_TOI_DA) throw new Error('Mỗi lần nhập tối đa ' + NHAP_TOI_DA + ' dòng; hãy chia file nhỏ hơn.');
  const bo = [], ok = [], thay = new Set(daCo);
  rows.forEach((r, i) => {
    const dong = +r._dong || i + 2, o = {};
    cols.forEach(c => { o[c] = String(r[c] == null ? '' : r[c]).trim(); });
    if (!cols.some(c => o[c])) return; // dòng trống
    const loi = kiem(o);
    if (loi) return bo.push({ dong: dong, ly: loi });
    const ks = khoa(o);
    if (ks.some(k => thay.has(k))) return bo.push({ dong: dong, ly: 'Trùng với dữ liệu đã có hoặc dòng trước trong file.' });
    ks.forEach(k => thay.add(k));
    ok.push(o);
  });
  if (!ok.length) return { them: [], bo: bo };
  const ma = nhapMa_(name, prefix, width, ok.length), key = TABLES[name][0];
  ok.forEach((o, i) => { o[key] = ma[i]; them(o); });
  const sh = sheet_(name), mang = ok.map(o => toRow_(sh, o));
  ghiDong_(sh, mang);
  return { them: ok, bo: bo };
}
// Mã liên tiếp: tính số lớn nhất một lần rồi tăng dần
function nhapMa_(name, prefix, width, n) {
  const dau = parseInt(nextCode_(name, prefix, width).slice(prefix.length), 10);
  return Array.from({ length: n }, (_, i) => prefix + String(dau + i).padStart(width, '0'));
}
function soNhap_(v) { // '345.000' hoặc '345,000' → 345000; sai định dạng → NaN; trống → ''
  const s = String(v).replace(/[\s.,]/g, '');
  return s === '' ? '' : /^\d{1,12}$/.test(s) ? +s : NaN;
}

function nhapKhach(token, rows) {
  const user = user_(token);
  return withLock_(() => {
    const daCo = [];
    readTable_('KhachHang').forEach(k => { sdtList_(k.SDT).forEach(p => daCo.push('s' + p)); });
    const r = nhapBang_('KhachHang', 'KH', 5, rows, NHAP_KHACH,
      o => o.TenKH ? '' : 'Thiếu tên khách hàng.',
      o => sdtList_(o.SDT).map(p => 's' + p),
      daCo, o => { o.NgayTao = now_(); o.NguoiTao = user.ten; });
    if (r.them.length) log_(user, 'Nhập khách hàng từ file', r.them[0].MaKH + ' … ' + r.them[r.them.length - 1].MaKH, r.them.length + ' khách');
    return r;
  });
}

function nhapHang(token, rows) {
  const user = user_(token, true);
  return withLock_(() => {
    const ten = h => 'h' + String(h.TenHang).toLowerCase() + '|' + String(h.Model || '').toLowerCase();
    const r = nhapBang_('HangHoa', 'HH', 4, rows, NHAP_HANG,
      o => {
        if (!o.TenHang) return 'Thiếu tên hàng.';
        const sai = NHAP_SO.find(c => isNaN(soNhap_(o[c])));
        return sai ? 'Cột ' + sai + ' phải là số nguyên không âm.' : '';
      },
      o => [ten(o)], readTable_('HangHoa').map(ten),
      o => { NHAP_SO.forEach(c => { o[c] = soNhap_(o[c]); }); });
    if (r.them.length) log_(user, 'Nhập mặt hàng từ file', r.them[0].MaHH + ' … ' + r.them[r.them.length - 1].MaHH, r.them.length + ' mặt hàng');
    return r;
  });
}

// ===== Chứng từ có dòng hàng: báo giá (BG), đơn hàng (DH), phiếu nhập (NK), phiếu xuất/giao hàng (XK) =====
function layChungTu(token, loai, so) {
  const user = user_(token);
  const c = ct_(loai);
  const lines = readTable_(c.lines).filter(l => String(l[TABLES[c.lines][0]]) === String(so)).sort((a, b) => a.STT - b.STT);
  if (loai === 'XK') {
    const p = findObj_('PhieuKho', so), han = hanBaoHanh_();
    lines.forEach(l => { l.HetHan = han(p && p.Ngay, l.MaHH); });
  }
  // giaVon: giá vốn từng dòng của đơn (quản trị) để web hiện lãi gộp đúng như báo cáo lợi nhuận (SoQuy.gs giaVonDon_)
  return { lines: lines, daGiao: loai === 'DH' ? daGiao_(so) : null, giaVon: loai === 'DH' && user.vaiTro === 'admin' ? giaVonDon_(findObj_('DonHang', so) || { SoDH: so }, lines) : null };
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
    lines.forEach((l, i) => { l.STT = i + 1; l.SoLuong = +l.SoLuong || 0; l.GiaVon = c.loai === 'Nhập' && +l.GiaVon > 0 ? Math.round(+l.GiaVon) : ''; });
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
    const hang = {};
    readTable_('HangHoa').forEach(h => { hang[h.MaHH] = h; });
    const thieu = lines.find(l => l.MaHH && laMay_(hang[l.MaHH]) && imeiList_(l.IMEI).length !== l.SoLuong);
    if (thieu) throw new Error('Dòng ' + thieu.STT + ': ' + thieu.TenHang + ' là máy, ghi IMEI/serial của từng máy (' + thieu.SoLuong + ' mã).');
    const gon = imeis.map(gonMa_), lap = imeis.find((x, i) => gon.indexOf(gon[i]) !== i);
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
    const cong = lines.reduce((s, l) => s + l.ThanhTien, 0);
    head.GiamGia = Math.min(Math.max(0, cong), Math.max(0, Math.round(+head.GiamGia || 0))) || ''; // giảm giá cả đơn, không quá tiền hàng
    head.TienHang = cong - (+head.GiamGia || 0);
    head.VAT = +head.VAT || 0;
    head.TienVAT = Math.round(head.TienHang * head.VAT / 100);
    head.TongCong = head.TienHang + head.TienVAT;
    // Dòng số lượng âm = máy cũ thu lại của đơn lên đời: chỉ máy chủ thêm (kèm phiếu nhập kho), trình duyệt không thêm, sửa, xóa hay hủy đơn được
    const am = lines.filter(l => l.SoLuong < 0);
    if (loai !== 'DH' && am.length) throw new Error('Số lượng mỗi dòng phải lớn hơn 0.');
    if (loai === 'DH' && !GHI_THU_CU_) {
      const old = head.SoDH ? findObj_('DonHang', head.SoDH) : null, k = l => [l.MaHH, +l.SoLuong, Math.round(+l.DonGia || 0)].join('|');
      const amCu = old ? readTable_('DonHangCT').filter(l => String(l.SoDH) === String(head.SoDH) && +l.SoLuong < 0) : [];
      if (am.map(k).sort().join() !== amCu.map(k).sort().join()) throw new Error('Dòng máy cũ thu lại (số lượng âm) chỉ thêm bằng nút "Thu máy cũ" và không sửa, xóa được. Khách trả hàng thì dùng "Khách trả hàng".');
      if (amCu.length && head.TrangThai === 'Hủy' && old.TrangThai !== 'Hủy') throw new Error('Đơn lên đời có máy cũ thu lại: không hủy được, dùng "Khách trả hàng" (trong ' + NGAY_GIU_MAY_CU + ' ngày kể từ ngày bán).');
    }
    if (am.length && head.TongCong < 0) throw new Error('Giá máy cũ thu lại lớn hơn tiền hàng của đơn.');
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
    ghiDong_(sh, rows);
    const huy = loai === 'DH' && head.TrangThai === 'Hủy' && old && old.TrangThai !== 'Hủy';
    if (loai === 'DH') head.TrangThai = capNhatDH_(head[key]);
    const donHang = loai === 'XK' ? capNhatNhieuDH_([old && old.SoDH, head.SoDH]) : null;
    if (loai === 'XK') { const han = hanBaoHanh_(); lines.forEach(l => { l.HetHan = han(head.Ngay, l.MaHH); }); }
    log_(user, (huy ? 'Hủy ' : old ? 'Sửa ' : 'Thêm ') + c.ten, head[key],
      c.loai ? [head.DoiTac, head.SoDH && 'đơn ' + head.SoDH].filter(Boolean).join(' · ') : head.TenKH + ' · ' + head.TongCong + ' đ');
    head.lines = lines;
    if (c.loai) Object.assign(head, tomTatPK_(lines)); // cho danh sách phiếu kho (không phải cột trong Sheet)
    return { doc: head, ton: c.loai ? tonKho_() : null, donHang: donHang, giaVon: c.loai === 'Nhập' && user.vaiTro === 'admin' ? giaVonBQ_() : null };
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
    if (loai === 'DH' && readTable_('DonHangCT').some(l => String(l.SoDH) === String(so) && +l.SoLuong < 0)) throw new Error('Đơn lên đời có máy cũ đã nhập kho: không xóa được.');
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
// (trừ hàng khách đã trả về kho theo đơn)
function daGiao_(soDH) {
  const pk = phieuTheoDon_(soDH);
  const da = {};
  readTable_('PhieuKhoCT').forEach(l => {
    if (!pk[l.SoPK]) return;
    const k = l.MaHH || l.TenHang;
    da[k] = (da[k] || 0) + pk[l.SoPK] * (+l.SoLuong || 0);
  });
  return da;
}

// Phiếu kho của một đơn: SoPK → 1 (phiếu xuất giao hàng) hoặc −1 (phiếu nhập khách trả hàng, DichVu.gs traHang).
// Phiếu trả hàng lập trước khi có cột số đơn ở phiếu nhập thì nhận ra theo ghi chú "Khách trả hàng · đơn …".
function phieuTheoDon_(soDH) {
  const kq = {}, so = String(soDH == null ? '' : soDH), cu = 'Khách trả hàng · đơn ' + so;
  if (!so) return kq;
  readTable_('PhieuKho').forEach(p => {
    const gc = String(p.GhiChu || '');
    if (p.Loai === 'Xuất' && String(p.SoDH) === so) kq[p.SoPK] = 1;
    else if (p.Loai === 'Nhập' && (String(p.SoDH) === so || (!p.SoDH && (gc === cu || gc.indexOf(cu + ' · ') === 0)))) kq[p.SoPK] = -1;
  });
  return kq;
}

// ===== Kho =====
function tonKho_(phieuKho, pkCT) { // phieuKho, pkCT = bảng PhieuKho, PhieuKhoCT đã đọc sẵn (đỡ đọc Sheet lại)
  const loai = {};
  (phieuKho || readTable_('PhieuKho')).forEach(p => { loai[p.SoPK] = p.Loai; });
  const ton = {};
  (pkCT || readTable_('PhieuKhoCT')).forEach(l => {
    if (!l.MaHH || !loai[l.SoPK]) return;
    const t = ton[l.MaHH] || (ton[l.MaHH] = { nhap: 0, xuat: 0 });
    if (loai[l.SoPK] === 'Nhập') t.nhap += +l.SoLuong || 0; else t.xuat += +l.SoLuong || 0;
  });
  return ton;
}

// Tóm tắt dòng hàng của một phiếu kho cho danh sách: tổng số lượng và tên hàng (tối đa 3 mặt hàng)
function tomTatPK_(lines) {
  const ten = lines.slice().sort((a, b) => a.STT - b.STT).map(l => l.TenHang + (+l.SoLuong !== 1 ? ' ×' + (+l.SoLuong || 0) : ''));
  return { SoLuong: lines.reduce((s, l) => s + (+l.SoLuong || 0), 0), Hang: ten.slice(0, 3).join(', ') + (ten.length > 3 ? ' và ' + (ten.length - 3) + ' mặt hàng khác' : ''),
    GiaTri: lines.reduce((s, l) => s + (+l.SoLuong || 0) * (+l.GiaVon || 0), 0) }; // giá trị nhập (phiếu nhập có giá vốn): để tính công nợ nhà cung cấp
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
// IMEI/serial bỏ khoảng trắng, dấu chấm, gạch: mọi phép so mã (chặn bán trùng, tra, kiểm kho, bảo hành) dùng dạng này; mã lưu giữ như người dùng nhập
const gonMa_ = v => String(v == null ? '' : v).toUpperCase().replace(/[\s._\/\-]/g, '');

// Mặt hàng đơn vị "Máy" (điện thoại, kể cả máy cũ thu về): mỗi lần nhập, xuất kho phải ghi IMEI/serial của từng máy
const laMay_ = h => !!h && String(h.DVT || '').trim().toLowerCase() === 'máy';
// Đơn lên đời: máy cũ khách đưa là một dòng số lượng −1 của đơn (giá thu là đơn giá), nhập kho ngay bằng phiếu nhập ghi chú "Thu cũ đổi mới · đơn …".
// Khách trả hàng được trong NGAY_GIU_MAY_CU ngày kể từ ngày bán (DichVu.gs traHang); trong thời gian đó máy cũ phải nằm nguyên trong kho để trả lại đúng máy.
const NGAY_GIU_MAY_CU = 7;
const laNhapThuCu_ = p => !!p && p.Loai === 'Nhập' && /^Thu cũ đổi mới/.test(String(p.GhiChu || ''));
const congNgay_ = (ngay, n) => Utilities.formatDate(new Date(Date.parse(String(ngay).slice(0, 10) + 'T12:00:00Z') + n * 864e5), 'UTC', 'yyyy-MM-dd');
const dmy_ = ngay => String(ngay).slice(0, 10).split('-').reverse().join('/');
// true trong lúc máy chủ tự ghi dòng máy cũ của đơn / trả máy cũ cho khách (banNhanh, thuMayCu, traHang); trình duyệt không đặt được
let GHI_THU_CU_ = false;
function ghiThuCu_(fn) { const truoc = GHI_THU_CU_; GHI_THU_CU_ = true; try { return fn(); } finally { GHI_THU_CU_ = truoc; } }

// Một máy không xuất 2 lần liền nhau (bán trùng), không nhập 2 lần liền nhau. Máy cũ vừa thu lại chưa xuất được trong thời gian giữ cho khách.
// ponytail: chỉ xét phiếu gần nhất của từng IMEI, không dựng lại cả chuỗi khi sửa phiếu cũ lùi ngày.
function kiemIMEI_(loai, soPK, imeis) {
  const can = new Set(imeis.map(gonMa_)), pk = {}, cuoi = {}; // cùng một máy viết có / không dấu gạch vẫn là một
  readTable_('PhieuKho').forEach(p => { pk[p.SoPK] = p; });
  readTable_('PhieuKhoCT').forEach(l => {
    const p = pk[l.SoPK];
    if (!p || !l.IMEI || String(l.SoPK) === String(soPK || '')) return;
    const k = String(p.Ngay) + p.NgayTao;
    imeiList_(l.IMEI).forEach(x => { const g = gonMa_(x); if (can.has(g) && (!cuoi[g] || k >= cuoi[g].k)) cuoi[g] = { k: k, p: p }; });
  });
  imeis.forEach(x => {
    const e = cuoi[gonMa_(x)];
    if (e && e.p.Loai === loai) {
      throw new Error(loai === 'Xuất' ? 'IMEI/serial ' + x + ' đã xuất ở phiếu ' + e.p.SoPK + (e.p.SoDH ? ' (đơn ' + e.p.SoDH + ')' : '') + '.'
        : 'IMEI/serial ' + x + ' đã nhập ở phiếu ' + e.p.SoPK + ' và chưa xuất.');
    }
    if (loai === 'Xuất' && e && laNhapThuCu_(e.p) && !GHI_THU_CU_ && homNay_() <= congNgay_(e.p.Ngay, NGAY_GIU_MAY_CU)) {
      throw new Error('Máy cũ ' + x + ' (thu lại ở phiếu ' + e.p.SoPK + ') đang giữ cho khách đổi trả đến hết ngày ' + dmy_(congNgay_(e.p.Ngay, NGAY_GIU_MAY_CU)) + ', chưa bán được.');
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
  return dsBaoHanh_();
}
// Máy khách trả lại / thu cũ về (sau phiếu xuất này còn phiếu nhập cùng IMEI) thì bảo hành không còn thuộc khách cũ: bỏ IMEI đó khỏi dòng
function dsBaoHanh_() {
  const pk = {}, dh = {}, han = hanBaoHanh_(), cuoi = {}, tatCa = {};
  readTable_('PhieuKho').forEach(p => { tatCa[p.SoPK] = p; });
  readTable_('PhieuKhoCT').forEach(l => { const p = tatCa[l.SoPK]; if (p && l.IMEI) imeiList_(l.IMEI).forEach(x => { const g = gonMa_(x), k = String(p.Ngay) + p.NgayTao; if (!cuoi[g] || k >= cuoi[g].k) cuoi[g] = { k: k, p: p }; }); });
  readTable_('PhieuKho').forEach(p => { if (p.Loai === 'Xuất' && !/^Trả lại máy cũ/.test(String(p.GhiChu || ''))) pk[p.SoPK] = p; }); // trả máy cũ cho khách (traHang) không phải bán: không bảo hành
  readTable_('DonHang').forEach(d => { dh[d.SoDH] = d; });
  return readTable_('PhieuKhoCT').filter(l => pk[l.SoPK] && l.MaHH).map(l => {
    const im = imeiList_(l.IMEI), con = im.filter(x => { const c = cuoi[gonMa_(x)]; return !c || c.p.Loai !== 'Nhập'; });
    if (im.length && !con.length) return null;
    if (con.length < im.length) l = Object.assign({}, l, { IMEI: con.join(', '), SoLuong: con.length });
    const p = pk[l.SoPK], d = dh[p.SoDH] || {};
    return { SoPK: p.SoPK, Ngay: p.Ngay, SoDH: p.SoDH, MaKH: d.MaKH || '', TenKH: d.TenKH || p.DoiTac, SDT: d.SDT || '',
      MaHH: l.MaHH, TenHang: l.TenHang, Model: l.Model, DVT: l.DVT, SoLuong: +l.SoLuong || 0, IMEI: l.IMEI || '', HetHan: han(p.Ngay, l.MaHH) };
  }).filter(Boolean);
}

// ===== Thu tiền =====
function luuThuTien(token, pt) {
  const user = user_(token);
  return withLock_(() => ghiPhieuThu_(user, pt));
}
// Phiếu thu ghi nhận một đợt trong lịch thanh toán hợp đồng: chỉ hủy / đổi qua màn hợp đồng để lịch và phiếu luôn khớp
function dotCuaPhieu_(soPT) { return readTable_('HopDongLich').find(r => String(r.SoPT) === String(soPT)) || null; }
const phieuCuaDot_ = (soPT, dot, viec) => 'Phiếu ' + soPT + ' ghi nhận ' + dot.Nhan + ' của hợp đồng ' + dot.SoHD + ': không ' + viec + ' ở đây. Mở hợp đồng → Lịch thanh toán → Hủy ghi nhận thu.';
// Kiểm tra và ghi một phiếu thu. Gọi bên trong withLock_ (khóa không lồng nhau được, nên các hàm đã giữ khóa dùng thẳng hàm này).
function ghiPhieuThu_(user, pt) {
  const dot = pt.SoPT && dotCuaPhieu_(pt.SoPT), cu = pt.SoPT ? findObj_('ThuTien', pt.SoPT) : null;
  const doiTienDon = () => Math.round(+pt.SoTien || 0) !== +cu.SoTien || String(pt.SoDH || '') !== String(cu.SoDH || '');
  // sửa phiếu đang ghi nhận một đợt hợp đồng: không đổi tiền / đơn (phiếu mất khỏi Sheet thì cũng không ghi lại)
  if (dot && (!cu || doiTienDon())) throw new Error(phieuCuaDot_(pt.SoPT, dot, 'sửa số tiền / đơn hàng'));
  if (cu && +cu.SoTien < 0) { // phiếu trả lại tiền khách (số âm, do trả hàng): giữ số âm; ô số tiền gửi lên không có dấu trừ
    if (Math.abs(Math.round(+pt.SoTien || 0)) !== -cu.SoTien || String(pt.SoDH || '') !== String(cu.SoDH || '')) throw new Error('Phiếu ' + pt.SoPT + ' là phiếu trả lại tiền khách: không sửa số tiền / đơn hàng.');
    pt.SoTien = +cu.SoTien;
  } else {
    pt.SoTien = Math.round(+pt.SoTien || 0);
    if (pt.SoTien <= 0) throw new Error('Nhập số tiền thu.');
  }
  pt.HinhThuc = String(pt.HinhThuc || '').trim() || 'Tiền mặt'; // trống thì sổ quỹ từng tính vào ngân hàng; như phiếu chi, mặc định tiền mặt
  if (pt.SoDH) {
    const dh = findObj_('DonHang', pt.SoDH);
    if (!dh) throw new Error('Không tìm thấy đơn hàng ' + pt.SoDH + '.');
    pt.MaKH = dh.MaKH; pt.TenKH = dh.TenKH;
  }
  if (!pt.MaKH) throw new Error('Chọn khách hàng.');
  if (!pt.TenKH) { const kh = findObj_('KhachHang', pt.MaKH); pt.TenKH = kh ? kh.TenKH : ''; }
  const moi = !pt.SoPT;
  if (moi) { pt.NguoiTao = user.ten; pt.NgayTao = now_(); }
  upsert_('ThuTien', pt, () => nextSo_('ThuTien', 'PT', pt.Ngay), ['NguoiTao', 'NgayTao']);
  log_(user, (moi ? 'Thêm' : 'Sửa') + ' phiếu thu', pt.SoPT, pt.TenKH + ' · ' + pt.SoTien + ' đ' + (pt.SoDH ? ' · đơn ' + pt.SoDH : ''));
  return pt;
}
function xoaThuTien(token, soPT) {
  const user = user_(token, true);
  withLock_(() => {
    const pt = findObj_('ThuTien', soPT), dot = dotCuaPhieu_(soPT);
    if (dot) throw new Error(phieuCuaDot_(soPT, dot, 'xóa'));
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
    ghiDong_(sh, [toRow_(sh, o)], r);
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
    ghiDong_(sh, [toRow_(sh, { ThoiGian: now_(), NguoiDung: user.ten + ' (' + user.u + ')', HanhDong: hanhDong, DoiTuong: doiTuong, ChiTiet: chiTiet || '' })]);
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
// Dòng tiêu đề: trong lần gọi đang nhớ bảng (BANG_DA_DOC_) chỉ đọc một lần mỗi trang – toRow_/rowObj_/ghiDong_ gọi rất nhiều lần
function headers_(sh) {
  const ten = BANG_DA_DOC_ && sh.getName(), nho = ten && TIEU_DE_DA_DOC_ && TIEU_DE_DA_DOC_[ten];
  if (nho) return nho.slice();
  const h = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
  if (ten) (TIEU_DE_DA_DOC_ || (TIEU_DE_DA_DOC_ = {}))[ten] = h;
  return h.slice();
}
function tz_() { return 'Asia/Ho_Chi_Minh'; }
function now_() { return Utilities.formatDate(new Date(), tz_(), 'yyyy-MM-dd HH:mm'); }
// Ô Sheets tự đổi thành ngày được hiểu theo múi giờ của file Sheet (có thể khác giờ Việt Nam): đọc lại cũng theo múi giờ đó
let TZ_SHEET_ = '';
function tzSheet_() { return TZ_SHEET_ || (TZ_SHEET_ = SpreadsheetApp.getActive().getSpreadsheetTimeZone() || tz_()); }
function cell_(v) { return v instanceof Date ? Utilities.formatDate(v, tzSheet_(), 'yyyy-MM-dd') : v; }

// Trong một lần gọi từ app/web (docMotLan_), mỗi trang tính chỉ đọc từ Sheet một lần; ghi vào trang nào thì bỏ bản đã đọc của trang đó.
// Mỗi lần đọc trả bản sao để hàm gọi sửa / sắp xếp thoải mái.
// Lần gọi từ trang web cũng nhớ: user_() bật ở đầu mỗi hàm (mỗi lần google.script.run là một lần chạy riêng nên bộ nhớ chỉ sống trong lần gọi đó).
let BANG_DA_DOC_ = null; // null = không nhớ (chạy trong trình soạn thảo, bộ hẹn giờ…)
let TIEU_DE_DA_DOC_ = null;
function docMotLan_(fn) {
  if (BANG_DA_DOC_) return fn();
  BANG_DA_DOC_ = {}; TIEU_DE_DA_DOC_ = null;
  PHIEN_BAN_ = ''; // đọc lại phiên bản dữ liệu mỗi lần gọi
  try { return fn(); } finally { BANG_DA_DOC_ = null; TIEU_DE_DA_DOC_ = null; }
}
function readTable_(name) {
  const ten = tableName_(name);
  let ds = BANG_DA_DOC_ && BANG_DA_DOC_[ten];
  if (!ds) {
    const values = sheet_(name).getDataRange().getValues();
    const head = values.shift().map(String);
    ds = values.filter(r => r[0] !== '').map(r => {
      const o = {};
      head.forEach((h, i) => { if (h) o[h] = cell_(r[i]); });
      return o;
    });
    if (BANG_DA_DOC_) BANG_DA_DOC_[ten] = ds;
  }
  return BANG_DA_DOC_ ? ds.map(o => Object.assign({}, o)) : ds;
}

// Gọi sau mỗi lần ghi / xóa dòng: bỏ bản đã đọc của trang đó và đổi phiên bản dữ liệu để kết quả ghi nhớ (ketQuaNho_) không dùng nữa.
// Nhật ký và danh sách điện thoại không ảnh hưởng số liệu nên không đổi phiên bản.
const KHONG_DOI_SO_LIEU = ['NhatKy', 'ThietBi'];
function daGhi_(sh) {
  const ten = sh.getName();
  if (BANG_DA_DOC_) delete BANG_DA_DOC_[ten];
  if (TIEU_DE_DA_DOC_) delete TIEU_DE_DA_DOC_[ten]; // có thể vừa thêm cột
  if (KHONG_DOI_SO_LIEU.some(n => ten === tableName_(n))) return;
  PHIEN_BAN_ = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  try { CacheService.getScriptCache().put('dv', PHIEN_BAN_, SESSION_TTL); } catch (e) {}
}

// ===== Ghi nhớ kết quả các hàm chỉ đọc (Tổng quan, kho, khách…) trong CacheService =====
// Khóa gồm phiên bản dữ liệu 'dv' (đổi mỗi lần ghi) nên ghi xong là kết quả cũ tự bỏ. Sửa thẳng trên Google Sheet (không qua app)
// thì tối đa KQ_GIAY giây sau mới thấy, hoặc kéo xuống để làm mới trên app (moi = true: bỏ qua bản ghi nhớ).
const KQ_GIAY = 300;
let PHIEN_BAN_ = '';
function ketQuaNho_(phan, moi, tinh) {
  let cache = null, khoa = '';
  try {
    cache = CacheService.getScriptCache();
    if (!PHIEN_BAN_) PHIEN_BAN_ = cache.get('dv') || '0';
    const bam = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, JSON.stringify(phan), Utilities.Charset.UTF_8)
      .map(b => ((b + 256) % 256).toString(16).padStart(2, '0')).join('');
    khoa = 'kq_' + CUR_SHOP + '_' + PHIEN_BAN_ + '_' + bam.slice(0, 40);
    const c = moi ? null : cache.get(khoa);
    if (c) return JSON.parse(c);
  } catch (e) { cache = null; }
  const kq = tinh();
  if (cache) { try { const s = JSON.stringify(kq); if (s.length < 90000) cache.put(khoa, s, KQ_GIAY); } catch (e) {} }
  return kq;
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
  ghiDong_(sh, [toRow_(sh, o)], r);
}

// Ghi các dòng (đã qua toRow_) từ dòng r, mặc định sau dòng cuối. Trước khi ghi, đặt định dạng văn bản cho cột chữ của các dòng đó:
// ô định dạng "Tự động" thì Sheets tự đổi "0911000001" thành số 911000001 và "2026-10-07 14:52" thành ngày (mất số 0 đầu, mất giờ).
// Lưới hết dòng (trang nhập từ Excel chỉ vừa đủ dữ liệu, hoặc sau khi xóa nhiều dòng) thì thêm dòng trước.
function ghiDong_(sh, rows, r) {
  if (!rows.length) return;
  r = r || sh.getLastRow() + 1;
  const cuoi = r + rows.length - 1;
  if (cuoi > sh.getMaxRows()) sh.insertRowsAfter(sh.getMaxRows(), cuoi - sh.getMaxRows());
  const chu = headers_(sh).map((c, i) => (c && !NUMBER_COLS.includes(c) ? cot_(i + 1) : '')).filter(Boolean);
  if (chu.length) sh.getRangeList(chu.map(c => c + r + ':' + c + cuoi)).setNumberFormat('@');
  sh.getRange(r, 1, rows.length, rows[0].length).setValues(rows);
  daGhi_(sh);
}
const cot_ = n => { let s = ''; for (; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + (n - 1) % 26) + s; return s; }; // 1 → A, 27 → AA

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
    ghiDong_(sh, [toRow_(sh, obj)]);
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
    daGhi_(sh);
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
  // Có khóa rồi mới đọc lại: bản đã nhớ trước khi chờ khóa có thể thiếu phần người khác vừa ghi (kiểm tra IMEI trùng, số đã giao…)
  if (BANG_DA_DOC_) { BANG_DA_DOC_ = {}; TIEU_DE_DA_DOC_ = null; }
  try { return fn(); } finally { lock.releaseLock(); }
}
