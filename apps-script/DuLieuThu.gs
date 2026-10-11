/**
 * Dữ liệu thử trên Google Sheet thật. Chạy trong trình soạn thảo Apps Script (chọn hàm → Chạy):
 *   napDuLieuThu  – 12 hàng, 12 khách, 3 phiếu nhập, 11 báo giá, 27 đơn rải 12 tháng (giao, thu tiền, nợ, hủy, quá hẹn), 9 hợp đồng
 *   xoaDuLieuThu  – xóa mọi thứ napDuLieuThu đã thêm; số chứng từ đã dùng không lấy lại
 * Dữ liệu trông như dữ liệu thật (không gắn chữ "thử" vào tên). Mã các bản ghi đã tạo được ghi vào Script Properties (khóa duLieuThu.<cửa hàng>)
 * để chạy lại không tạo trùng và xoaDuLieuThu biết xóa gì. Bản cũ gắn dấu [THỬ]: boNhanThu_ gỡ dấu và chuyển sang cách ghi mới.
 * Apps Script cắt mỗi lần chạy ở 6 phút: hai hàm tự dừng trước đó và báo "chạy lại"; lần sau bỏ qua phần đã làm, làm tiếp.
 * Đi qua đúng các hàm app dùng nên số chứng từ, tồn kho, công nợ, nhật ký khớp như nhập tay.
 */
const THU_CU_ = /\[\s*TH[ỬửUu]\s*\]\s*/gi; // dấu của bản cũ
const NGUOI_THU_ = 'Quản lý cửa hàng';      // người lập chứng từ mẫu

// [tên, model, nhóm, ĐVT, xuất xứ, giá sỉ, giá lẻ, tồn tối thiểu, bảo hành, có IMEI, SL nhập đợt 1, đợt 2, đợt 3]
const DLT_HANG_ = [
  ['iPhone 16 Pro Max 256GB', 'IP16PM', 'iPhone 16 Series', 'Máy', 'Apple - chính hãng', 27500000, 28990000, 2, 12, 1, 6, 4, 2],
  ['iPhone 16 128GB', 'IP16', 'iPhone 16 Series', 'Máy', 'Apple - chính hãng', 19200000, 20490000, 2, 12, 1, 5, 4, 2],
  ['iPhone 15 128GB', 'IP15', 'iPhone 15 Series', 'Máy', 'Apple - chính hãng', 15800000, 16490000, 5, 12, 1, 6, 3, 0],
  ['Samsung Galaxy S25 Ultra', 'S25U', 'Samsung', 'Máy', 'Samsung Việt Nam', 26000000, 27990000, 2, 12, 1, 4, 3, 1],
  ['Samsung Galaxy A56', 'A56', 'Samsung', 'Máy', 'Samsung Việt Nam', 8900000, 9490000, 2, 12, 1, 5, 3, 2],
  ['Xiaomi Redmi Note 14', 'RN14', 'Xiaomi', 'Máy', 'Xiaomi Việt Nam', 5200000, 5690000, 4, 18, 1, 6, 0, 0],
  ['AirPods Pro 2', 'APP2', 'Phụ kiện', 'Cái', 'Apple - chính hãng', 5300000, 5990000, 8, 12, 0, 8, 4, 2],
  ['Sạc nhanh 20W', 'SAC20', 'Phụ kiện', 'Cái', 'Apple - chính hãng', 350000, 490000, 10, 6, 0, 25, 15, 10],
  ['Ốp lưng MagSafe', 'OP', 'Phụ kiện', 'Cái', 'Trung Quốc', 120000, 250000, 15, 0, 0, 30, 20, 0],
  ['Cường lực chống nhìn trộm', 'CL', 'Phụ kiện', 'Miếng', 'Trung Quốc', 40000, 150000, 20, 0, 0, 40, 30, 20],
  ['Cáp USB-C 1m', 'CAP', 'Phụ kiện', 'Sợi', 'Trung Quốc', 60000, 150000, 10, 6, 0, 30, 0, 0],
  ['Tai nghe có dây EarPods', 'EP', 'Phụ kiện', 'Cái', 'Apple - chính hãng', 390000, 590000, 5, 12, 0, 15, 0, 0],
];
// [tên, người liên hệ, SĐT, địa chỉ, MST, ngân hàng]
const DLT_KHACH_ = [
  ['Anh Minh', '', '0911000001', '12 Lê Lợi, Quận 1, TP.HCM'],
  ['Chị Lan', '', '0911000002', '45 Hai Bà Trưng, Quận 3, TP.HCM'],
  ['Công ty TNHH Ánh Dương', 'Trần Văn Bình', '0281000003', '88 Nguyễn Huệ, Quận 1, TP.HCM', '0312345678', 'Vietcombank'],
  ['Anh Tuấn', '', '0911000004', '7 Võ Văn Tần, Quận 3, TP.HCM'],
  ['Chị Hương', '', '0911000005', '210 Cách Mạng Tháng 8, Quận 10, TP.HCM'],
  ['Anh Khoa', '', '0911000006', '15 Phan Xích Long, Phú Nhuận, TP.HCM'],
  ['Chị Thảo', '', '0911000007', '33 Nguyễn Trãi, Quận 5, TP.HCM'],
  ['Anh Phúc', '', '0911000008', '9 Lý Thường Kiệt, Tân Bình, TP.HCM'],
  ['Công ty CP Sao Việt', 'Lê Thị Mai', '0281000009', '120 Điện Biên Phủ, Bình Thạnh, TP.HCM', '0309876543', 'Techcombank'],
  ['Chị Ngọc', '', '0911000010', '56 Quang Trung, Gò Vấp, TP.HCM'],
  ['Anh Dũng', '', '0911000011', '18 Kha Vạn Cân, Thủ Đức, TP.HCM'],
  ['Cửa hàng Minh Phát', 'Nguyễn Minh Phát', '0911000012', '402 Lũy Bán Bích, Tân Phú, TP.HCM', '0315551234', 'ACB'],
];

// Sổ ghi mã các bản ghi mẫu của cửa hàng hiện tại: { nhãn: mã } (vd 'h:0' → HH0001, 'dh:#3' → 003-2026/DH)
const soThuKhoa_ = () => 'duLieuThu.' + CUR_SHOP;
function soThu_() {
  try { return JSON.parse(PropertiesService.getScriptProperties().getProperty(soThuKhoa_()) || '{}') || {}; } catch (e) { return {}; }
}
function luuSoThu_(so) { PropertiesService.getScriptProperties().setProperty(soThuKhoa_(), JSON.stringify(so)); }

// Chỉ chủ script chạy được (trong trình soạn thảo). Qua web app, người khác gọi thì getActiveUser trả về rỗng.
function phienThu_() {
  const toi = Session.getActiveUser().getEmail();
  if (!toi || toi !== Session.getEffectiveUser().getEmail()) throw new Error('Chỉ chạy trong trình soạn thảo Apps Script.');
  const token = Utilities.getUuid();
  CacheService.getScriptCache().put('ss_' + token, JSON.stringify({ u: 'quanly', ten: NGUOI_THU_, vaiTro: 'admin', shops: [SHOP_MAC_DINH], shop: SHOP_MAC_DINH, t: Date.now() }), 1800);
  boNhanThu_();
  return token;
}
// Ném lỗi khi gần hết 6 phút để lần chạy sau làm tiếp
function henGio_(ten) {
  const t0 = Date.now();
  return () => { if (Date.now() - t0 > 300000) throw new Error('Gần hết 6 phút cho phép, đã dừng giữa chừng. Bấm Chạy ' + ten + ' lần nữa để làm tiếp.'); };
}
// IMEI 15 số hợp lệ (số kiểm tra Luhn) từ 14 số đầu
function imeiLuhn_(s14) {
  const t = s14.split('').reduce((s, c, i) => { let d = +c; if (i % 2) { d *= 2; if (d > 9) d -= 9; } return s + d; }, 0);
  return s14 + (10 - t % 10) % 10;
}

function napDuLieuThu() {
  const tk = phienThu_(), gio = henGio_('napDuLieuThu'), so = soThu_();
  try { napDuLieuThu_(tk, gio, so); } finally { luuSoThu_(so); }
}

function napDuLieuThu_(tk, gio, so) {
  // Phần đã nạp ở lần chạy trước (tra theo sổ) thì dùng lại, không tạo thêm
  const cu = {};
  ['HangHoa', 'KhachHang', 'PhieuKho', 'BaoGia', 'DonHang', 'ThuTien', 'HopDong'].forEach(t => { cu[t] = readTable_(t); });
  const co = (t, nhan) => so[nhan] ? cu[t].find(r => String(r[TABLES[t][0]]) === String(so[nhan])) : null;
  const ghi = (nhan, doc, t) => { so[nhan] = doc[TABLES[t][0]]; return doc; };
  const daGiao = new Set(cu.PhieuKho.filter(p => p.Loai === 'Xuất').map(p => String(p.SoDH))), daThu = new Set(cu.ThuTien.map(p => String(p.SoDH)));
  const ngay = n => Utilities.formatDate(new Date(Date.now() + n * 864e5), tz_(), 'yyyy-MM-dd');
  if (!so.imei) so.imei = String(100000 + Math.floor(Math.random() * 900000)); // 6 số giữa của IMEI mẫu, giữ nguyên giữa các lần chạy
  const loai = loaiHopDong_(), loaiTen = re => loai.find(l => re.test(l)) || loai[0];
  const H = DLT_HANG_;

  const hang = H.map((x, i) => co('HangHoa', 'h:' + i) || (gio(), ghi('h:' + i, luuHang(tk, { TenHang: x[0], Model: x[1], NhomHang: x[2], DVT: x[3], XuatXu: x[4], GiaSi: x[5], GiaLe: x[6], TonToiThieu: x[7], BaoHanh: x[8] }), 'HangHoa')));
  const khach = DLT_KHACH_.map((x, i) => co('KhachHang', 'k:' + i) || (gio(), ghi('k:' + i, luuKhach(tk, { TenKH: x[0], NguoiLienHe: x[1], SDT: x[2], DiaChi: x[3], MST: x[4] || '',
    NguoiDaiDien: x[1], ChucVu: x[4] ? 'Giám đốc' : '', SoTK: x[4] ? '00710001234' + i : '', NganHang: x[5] || '', GhiChu: x[4] ? 'Khách doanh nghiệp' : 'Khách lẻ' }), 'KhachHang')));

  // Nhập kho 3 đợt; máy có IMEI thì giữ vào kho để phiếu giao lấy ra theo thứ tự
  const kho = {}, cuaHang = {};
  hang.forEach(h => { cuaHang[h.MaHH] = 1; });
  const pkThu = Object.keys(so).filter(k => k.indexOf('pk:') === 0).map(k => String(so[k]));
  if (pkThu.length) { // lần trước đã nhập: IMEI còn trong kho = đã nhập trừ đã xuất
    const pk = {}, ra = new Set();
    cu.PhieuKho.forEach(p => { pk[p.SoPK] = p; });
    const ct = readTable_('PhieuKhoCT').filter(l => cuaHang[l.MaHH] && pk[l.SoPK]);
    ct.filter(l => pk[l.SoPK].Loai === 'Xuất').forEach(l => imeiList_(l.IMEI).forEach(x => ra.add(x)));
    ct.filter(l => pk[l.SoPK].Loai === 'Nhập').forEach(l => { kho[l.MaHH] = (kho[l.MaHH] || []).concat(imeiList_(l.IMEI).filter(x => !ra.has(x))); });
  }
  const dong = (h, sl) => ({ MaHH: h.MaHH, TenHang: h.TenHang, Model: h.Model, DVT: h.DVT, XuatXu: h.XuatXu, SoLuong: sl, LoaiGia: 'Lẻ', DonGia: h.GiaLe, IMEI: '' });
  [[-370, 'Nhà phân phối FPT', 10], [-160, 'Nhà phân phối Digiworld', 11], [-20, 'Nhà phân phối FPT', 12]].forEach(([n, ncc, cot], d) => {
    const nhan = 'pk:Nhập hàng đợt ' + (d + 1);
    if (co('PhieuKho', nhan)) return;
    gio();
    const lines = hang.map((h, i) => {
      const sl = H[i][cot]; if (!sl) return null;
      const l = dong(h, sl);
      if (H[i][9]) {
        const im = Array.from({ length: sl }, (_, j) => imeiLuhn_('35' + so.imei + d + String(i).padStart(2, '0') + String(j).padStart(2, '0') + '0'));
        l.IMEI = im.join(', '); kho[h.MaHH] = (kho[h.MaHH] || []).concat(im);
      }
      return l;
    }).filter(Boolean);
    ghi(nhan, luuChungTu(tk, 'NK', { Ngay: ngay(n), DoiTac: ncc, GhiChu: 'Nhập hàng đợt ' + (d + 1), lines: lines }).doc, 'PhieuKho');
  });
  const xuat = (h, sl) => Object.assign(dong(h, sl), { IMEI: kho[h.MaHH] ? kho[h.MaHH].splice(0, sl).join(', ') : '' });
  const kh = (k, ghiChu) => ({ MaKH: k.MaKH, TenKH: k.TenKH, NguoiNhan: k.NguoiLienHe || k.TenKH, SDT: k.SDT, DiaChi: k.DiaChi, VAT: k.MST ? 10 : 0, GhiChu: ghiChu || '' });
  const giao = (d, n, lines) => daGiao.has(String(d.SoDH)) || gio() || luuChungTu(tk, 'XK', { Ngay: ngay(n), SoDH: d.SoDH, DoiTac: d.TenKH, GhiChu: 'Giao hàng theo đơn', lines: lines.map(l => xuat(hang.find(h => h.MaHH === l.MaHH), l.SoLuong)) });
  const thu = (d, n, tien, hinhThuc, ghiChu) => daThu.has(String(d.SoDH)) || gio() || luuThuTien(tk, { Ngay: ngay(n), SoDH: d.SoDH, SoTien: tien, HinhThuc: hinhThuc, GhiChu: ghiChu || '' });

  // 26 đơn: ngày cách hôm nay (âm = trước), mỗi đơn 1–3 dòng; [mã hàng (vị trí trong H), số lượng]
  const DON = [
    [0, 3, [[0, 1], [8, 1]]], [-1, 0, [[3, 1], [9, 2]]], [-2, 4, [[4, 1]]], [-4, 1, [[2, 1], [8, 1]]], [-5, 5, [[6, 2], [7, 2]]],
    [-9, 8, [[1, 3], [9, 3], [7, 3]]], [-14, 6, [[5, 1], [10, 1]]], [-20, 7, [[0, 1], [6, 1]]], [-27, 9, [[4, 1], [11, 1]]], [-33, 10, [[1, 1], [8, 2]]],
    [-40, 11, [[5, 2], [9, 2], [10, 2]]], [-52, 0, [[3, 1]]], [-63, 1, [[2, 1], [7, 1]]], [-75, 3, [[6, 1]]], [-90, 4, [[0, 1], [9, 1]]],
    [-105, 5, [[4, 1], [8, 1]]], [-120, 8, [[2, 2], [7, 2]]], [-140, 6, [[1, 1]]], [-160, 7, [[5, 1], [10, 1]]], [-185, 9, [[3, 1], [6, 1]]],
    [-210, 10, [[0, 1]]], [-240, 11, [[4, 2], [9, 4], [8, 2]]], [-270, 0, [[2, 1], [11, 1]]], [-300, 1, [[5, 1], [7, 1]]], [-330, 3, [[1, 1], [8, 1]]],
    [-355, 4, [[6, 1], [10, 1]]],
  ];
  const ht = ['Tiền mặt', 'Chuyển khoản', 'Quẹt thẻ'];
  const GHI_CHU_DON = ['Khách hẹn qua lấy máy', 'Giao tận nơi buổi tối', 'Khách đổi ý, đã hủy', 'Chờ hàng về'];
  const dsDon = DON.map(([n, ki, ds], i) => {
    const k = khach[ki], lines = ds.map(([h, sl]) => dong(hang[h], sl)), nhan = '#' + (i + 1);
    let d = co('DonHang', 'dh:' + nhan);
    if (d) d = Object.assign({}, d, { lines: lines });
    else {
      gio();
      const bg = i < 10 && i % 2 === 0 ? (co('BaoGia', 'bg:' + nhan) || ghi('bg:' + nhan, luuChungTu(tk, 'BG', Object.assign(kh(k), { Ngay: ngay(n - 1), lines: lines })).doc, 'BaoGia')) : null;
      d = ghi('dh:' + nhan, luuChungTu(tk, 'DH', Object.assign(kh(k, GHI_CHU_DON[i] || ''), { Ngay: ngay(n), SoBG: bg ? bg.SoBG : '', NgayGiao: ngay(i === 3 ? -1 : i < 3 ? n + 4 : n + 2), lines: lines })).doc, 'DonHang');
    }
    if (i === 0 || i === 1) { if (i === 1) thu(d, n, 2000000, 'Tiền mặt', 'Đặt cọc'); }                    // chờ giao, hẹn tuần này
    else if (i === 2) { if (d.TrangThai !== 'Hủy') luuChungTu(tk, 'DH', Object.assign({}, d, { TrangThai: 'Hủy' })); }                          // khách hủy
    else if (i === 3) thu(d, n, 3000000, 'Tiền mặt', 'Đặt cọc');                                                // quá hẹn giao, còn nợ
    else if (i === 5) { giao(d, n + 1, [d.lines[0]]); thu(d, n + 1, Math.round(d.TongCong / 2), 'Chuyển khoản'); } // giao một phần
    else {
      giao(d, n + 2, d.lines);
      thu(d, n + 2, i % 5 === 4 ? Math.round(d.TongCong * 0.6) : d.TongCong, ht[i % 3], i % 5 === 4 ? 'Trả trước 60%, còn nợ' : '');
    }
    return d;
  });
  // 6 báo giá chưa chốt (tháng này và tháng trước)
  [[0, 2, [[0, 2]]], [-1, 6, [[3, 1], [6, 1]]], [-3, 9, [[1, 2]]], [-12, 10, [[4, 3]]], [-25, 5, [[2, 1], [9, 2]]], [-38, 7, [[6, 4]]]].forEach(([n, ki, ds], j) => {
    const nhan = 'bg:Khách đang cân nhắc #' + (j + 1);
    co('BaoGia', nhan) || gio() ||
      ghi(nhan, luuChungTu(tk, 'BG', Object.assign(kh(khach[ki], 'Khách đang cân nhắc'), { Ngay: ngay(n), lines: ds.map(([h, sl]) => dong(hang[h], sl)) })).doc, 'BaoGia');
  });

  // Hợp đồng: trả góp (kỳ 1 quá hạn, kỳ 2 đến hạn sau 5 ngày), sắp hết hạn, đã hết hạn, còn dài, bản nháp, đặt cọc, cho thuê, bảo hành mở rộng, cộng tác viên
  const benA = k => ({ MaKH: k.MaKH, TenDN: k.TenKH, DiaChi: k.DiaChi, MST: k.MST, NguoiDaiDien: k.NguoiDaiDien || k.TenKH, ChucVu: k.ChucVu, SDT: k.SDT, SoTK: k.SoTK, NganHang: k.NganHang });
  const kGop = khach[2], dGop = co('DonHang', 'dh:gop') || (gio(), ghi('dh:gop', luuChungTu(tk, 'DH', Object.assign(kh(kGop, 'Trả góp theo hợp đồng'), { Ngay: ngay(-45), NgayGiao: ngay(-40), lines: [dong(hang[0], 2)] })).doc, 'DonHang'));
  giao(dGop, -40, [dong(hang[0], 1)]);
  const hd1 = co('HopDong', 'hd:gop') || (gio(), ghi('hd:gop', luuHopDong(tk, Object.assign(benA(kGop), { Ngay: ngay(-45), LoaiHD: loaiTen(/trả góp/i), SoDH: dGop.SoDH, NgayHieuLuc: ngay(-45), NgayHetHan: ngay(140), TrangThai: 'Đang hiệu lực',
    NguoiPhuTrach: NGUOI_THU_, GhiChu: 'Trả góp 6 kỳ, 0% lãi', lines: [dong(hang[0], 2)] })).doc, 'HopDong'));
  const tra = Math.round(hd1.TongCong * 0.3), ky = Math.floor((hd1.TongCong - tra) / 6);
  if (!lichHopDong_(hd1.SoHD).length) luuLichHopDong(tk, hd1.SoHD, [{ Nhan: 'Trả trước', NgayDen: ngay(-45), SoTien: tra }].concat(Array.from({ length: 6 }, (_, i) =>
    ({ Nhan: 'Kỳ ' + (i + 1), NgayDen: ngay(-25 + i * 30), SoTien: i === 5 ? hd1.TongCong - tra - ky * 5 : ky }))));
  if (!lichHopDong_(hd1.SoHD)[0].SoPT) thuDotHopDong(tk, hd1.SoHD, 1, { Ngay: ngay(-45), HinhThuc: 'Chuyển khoản' });
  const dv = (ten, tien, dvt) => [{ TenHang: ten, DVT: dvt || 'Gói', SoLuong: 1, DonGia: tien }];
  // [nhãn, khách, loại (tên gần đúng), ngày ký, ngày hết hạn (null = không), trạng thái, ghi chú, dòng hàng]
  [['baotri', khach[2], /sửa chữa/i, -345, 20, 'Đang hiệu lực', 'Bảo trì, vệ sinh máy cho văn phòng 12 tháng', dv('Bảo trì thiết bị 12 tháng', 6000000)],
   ['nhanvien', khach[8], /nguyên tắc/i, -370, -5, 'Đang hiệu lực', 'Cấp máy cho nhân viên, chưa gia hạn', dv('Cung cấp máy cho nhân viên', 45000000)],
   ['daily', khach[11], /đại lý/i, -60, 300, 'Đang hiệu lực', 'Đại lý phân phối phụ kiện theo quý', dv('Phân phối phụ kiện theo quý', 30000000)],
   ['nhap', khach[8], /^Hợp đồng mua bán$/i, 0, null, 'Soạn thảo', 'Chờ khách xác nhận số lượng', [dong(hang[2], 3)]],
   ['datcoc', khach[6], /đặt cọc/i, -3, 12, 'Đang hiệu lực', 'Giữ máy iPhone 16 Pro Max màu Titan Sa Mạc, hàng về trong tuần', [dong(hang[0], 1)]],
   ['thue', khach[2], /thuê/i, -10, 20, 'Đang hiệu lực', 'Thuê 5 máy cho sự kiện ra mắt sản phẩm', dv('Thuê iPhone 16 (5 máy × 30 ngày)', 7500000)],
   ['baohanh', khach[4], /bảo hành mở rộng/i, -30, 335, 'Đang hiệu lực', 'Gói bảo hành 1 đổi 1 thêm 12 tháng', dv('Gói bảo hành mở rộng 12 tháng', 1490000)],
   ['ctv', khach[10], /cộng tác viên/i, -90, 275, 'Đang hiệu lực', 'Hoa hồng 3% mỗi máy giới thiệu thành công', dv('Hoa hồng cộng tác viên (ước tính năm)', 12000000)],
  ].forEach(([nhan, k, re, bd, het, tt, gc, lines]) => co('HopDong', 'hd:' + nhan) || gio() || ghi('hd:' + nhan, luuHopDong(tk, Object.assign(benA(k), {
    Ngay: ngay(bd), LoaiHD: loaiTen(re), NgayHieuLuc: het === null ? '' : ngay(bd), NgayHetHan: het === null ? '' : ngay(het), BaoTruocNgay: het === null ? '' : 30,
    TrangThai: tt, NguoiPhuTrach: NGUOI_THU_, GhiChu: gc, lines: lines })).doc, 'HopDong'));

  Logger.log('Đã nạp dữ liệu thử: ' + hang.length + ' hàng, ' + khach.length + ' khách, ' + (dsDon.length + 1) + ' đơn, 9 hợp đồng (' + hd1.SoHD + ' trả góp). Xóa: chạy xoaDuLieuThu.');
}

function xoaDuLieuThu() {
  const tk = phienThu_(), gio = henGio_('xoaDuLieuThu'), so = soThu_();
  const ma = tien => new Set(Object.keys(so).filter(k => k.indexOf(tien) === 0).map(k => String(so[k])));
  const dsKhach = ma('k:'), dsHang = ma('h:'), dsHD = ma('hd:'), dsPK = ma('pk:');
  const laKhach = r => dsKhach.has(String(r.MaKH));
  const hd = readTable_('HopDong').filter(h => dsHD.has(String(h.SoHD)));
  hd.forEach(h => lichHopDong_(h.SoHD).filter(r => r.SoPT).forEach(r => gio() || huyThuDotHopDong(tk, h.SoHD, r.Dot)));
  hd.forEach(h => gio() || xoaHopDong(tk, h.SoHD));
  readTable_('ThuTien').filter(laKhach).forEach(p => gio() || xoaThuTien(tk, p.SoPT));
  const don = readTable_('DonHang').filter(laKhach), soDon = new Set(don.map(d => String(d.SoDH)));
  readTable_('PhieuKho').filter(p => dsPK.has(String(p.SoPK)) || (p.Loai === 'Xuất' && soDon.has(String(p.SoDH))))
    .forEach(p => gio() || xoaChungTu(tk, p.Loai === 'Nhập' ? 'NK' : 'XK', p.SoPK));
  don.forEach(d => gio() || xoaChungTu(tk, 'DH', d.SoDH));
  readTable_('BaoGia').filter(laKhach).forEach(b => gio() || xoaChungTu(tk, 'BG', b.SoBG));
  readTable_('KhachHang').filter(laKhach).forEach(k => gio() || xoaKhach(tk, k.MaKH));
  readTable_('HangHoa').filter(h => dsHang.has(String(h.MaHH))).forEach(h => gio() || xoaHang(tk, h.MaHH));
  luuSoThu_({});
  Logger.log('Đã xóa dữ liệu thử: ' + dsKhach.size + ' khách, ' + hd.length + ' hợp đồng cùng đơn, phiếu, hàng liên quan.');
}

/**
 * Bản cũ gắn dấu [THỬ] vào tên hàng, tên khách, ghi chú chứng từ. Chạy một lần cho mỗi cửa hàng (khi nâng cấp hoặc khi chạy napDuLieuThu/xoaDuLieuThu):
 * ghi mã các bản ghi mang dấu vào sổ dữ liệu thử, rồi gỡ dấu ở mọi ô (kể cả nhật ký), bỏ "THU-" ở model, đổi người lập "Dữ liệu thử".
 * Hợp đồng đã có file thì đánh dấu file cũ để tạo lại. Trả về số ô đã sửa.
 */
function boNhanThu_() {
  const p = PropertiesService.getScriptProperties(), cur = CUR_SHOP;
  let sua = 0;
  try {
    Object.keys(SHOPS).forEach(shop => {
      CUR_SHOP = shop;
      const co = 'boNhanThu.' + shop;
      if (p.getProperty(co)) return;
      const so = soThu_(), coDau = v => typeof v === 'string' && v.search(THU_CU_) >= 0, bo = v => String(v).replace(THU_CU_, '').trim();
      const tim = (ds, ten) => ds.findIndex(x => x[0] === ten);
      // 1. Sổ dữ liệu thử: hàng, khách theo tên; chứng từ theo ghi chú
      const ghiSo = (t, fn) => { try { readTable_(t).forEach(fn); } catch (e) {} };
      ghiSo('HangHoa', h => { const i = coDau(h.TenHang) ? tim(DLT_HANG_, bo(h.TenHang)) : -1; if (i >= 0 && !so['h:' + i]) so['h:' + i] = h.MaHH; });
      ghiSo('KhachHang', k => { const i = coDau(k.TenKH) ? tim(DLT_KHACH_, bo(k.TenKH)) : -1; if (i >= 0 && !so['k:' + i]) so['k:' + i] = k.MaKH; });
      const theoGhiChu = (t, tien, doi) => ghiSo(t, r => { if (!coDau(r.GhiChu) || !bo(r.GhiChu)) return; const nhan = tien + doi(bo(r.GhiChu)); if (!so[nhan]) so[nhan] = r[TABLES[t][0]]; });
      theoGhiChu('PhieuKho', 'pk:', g => g);
      theoGhiChu('BaoGia', 'bg:', g => g);
      theoGhiChu('DonHang', 'dh:', g => (g === 'Trả góp theo hợp đồng' ? 'gop' : g));
      const HD_CU = { 'Trả góp 6 kỳ, 0% lãi': 'gop', 'Sắp hết hạn': 'baotri', 'Đã quá hạn, chưa gia hạn': 'nhanvien', 'Đại lý phân phối phụ kiện': 'daily', 'Bản nháp': 'nhap' };
      theoGhiChu('HopDong', 'hd:', g => HD_CU[g] || g);
      luuSoThu_(so);
      // 2. Gỡ dấu trong mọi trang tính của cửa hàng
      Object.keys(TABLES).filter(t => SHARED.indexOf(t) < 0).forEach(t => {
        const sh = SpreadsheetApp.getActive().getSheetByName(tableName_(t));
        if (!sh || sh.getLastRow() < 2) return;
        const vals = sh.getDataRange().getValues(), head = vals[0].map(String), c = k => head.indexOf(k);
        const cGhi = c('GhiChu'), cModel = c('Model'), cFile = c('FileId'), cCu = c('FileCu');
        const dongSua = [];
        for (let r = 1; r < vals.length; r++) {
          const row = vals[r];
          let doi = false;
          row.forEach((v, j) => {
            if (v === 'Dữ liệu thử') { row[j] = NGUOI_THU_; doi = true; return; }
            if (!coDau(v)) return;
            let m = bo(v);
            if (j === cGhi) m = m.replace(/(^|\s)#\d+$/, '').trim();
            row[j] = m; doi = true; sua++;
          });
          if (!doi) continue;
          if (cModel >= 0 && /^THU-/.test(String(row[cModel]))) row[cModel] = String(row[cModel]).slice(4);
          if (t === 'HopDong' && cFile >= 0 && cCu >= 0 && row[cFile]) row[cCu] = '1';
          dongSua.push(r);
        }
        // Ghi từng cụm dòng liền nhau đã sửa (không đụng dòng dữ liệu thật nằm giữa); chuỗi bắt đầu bằng = + - @ giữ dạng chữ như toRow_
        for (let i = 0; i < dongSua.length;) {
          let j = i;
          while (j + 1 < dongSua.length && dongSua[j + 1] === dongSua[j] + 1) j++;
          const khoi = vals.slice(dongSua[i], dongSua[j] + 1).map(row => row.map(v => (typeof v === 'string' && /^[=+\-@]/.test(v) ? "'" + v : v)));
          sh.getRange(dongSua[i] + 1, 1, khoi.length, head.length).setValues(khoi);
          i = j + 1;
        }
      });
      p.setProperty(co, '1');
    });
  } finally { CUR_SHOP = cur; }
  return sua;
}
