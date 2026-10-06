/**
 * Dữ liệu thử trên Google Sheet thật. Chạy trong trình soạn thảo Apps Script (chọn hàm → Chạy):
 *   napDuLieuThu  – 12 hàng, 12 khách, 3 phiếu nhập, 11 báo giá, 27 đơn rải 12 tháng (giao, thu tiền, nợ, hủy, quá hẹn), 5 hợp đồng
 *   xoaDuLieuThu  – xóa mọi thứ napDuLieuThu đã thêm (nhận theo dấu [THỬ]); số chứng từ đã dùng không lấy lại
 * Apps Script cắt mỗi lần chạy ở 6 phút: hai hàm tự dừng trước đó và báo "chạy lại"; lần sau bỏ qua phần đã làm, làm tiếp.
 * Đi qua đúng các hàm app dùng nên số chứng từ, tồn kho, công nợ, nhật ký khớp như nhập tay. Nhật ký ghi người "Dữ liệu thử".
 */
const THU_ = '[THỬ]';

// Chỉ chủ script chạy được (trong trình soạn thảo). Qua web app, người khác gọi thì getActiveUser trả về rỗng.
function phienThu_() {
  const toi = Session.getActiveUser().getEmail();
  if (!toi || toi !== Session.getEffectiveUser().getEmail()) throw new Error('Chỉ chạy trong trình soạn thảo Apps Script.');
  const token = Utilities.getUuid();
  CacheService.getScriptCache().put('ss_' + token, JSON.stringify({ u: 'dulieuthu', ten: 'Dữ liệu thử', vaiTro: 'admin', shops: [SHOP_MAC_DINH], shop: SHOP_MAC_DINH, t: Date.now() }), 1800);
  return token;
}
// Ném lỗi khi gần hết 6 phút để lần chạy sau làm tiếp
function henGio_(ten) {
  const t0 = Date.now();
  return () => { if (Date.now() - t0 > 300000) throw new Error('Gần hết 6 phút cho phép, đã dừng giữa chừng. Bấm Chạy ' + ten + ' lần nữa để làm tiếp.'); };
}

function napDuLieuThu() {
  const tk = phienThu_(), gio = henGio_('napDuLieuThu');
  // Phần đã nạp ở lần chạy trước (nhận theo tên hoặc ghi chú) thì dùng lại, không tạo thêm
  const cu = {};
  ['HangHoa', 'KhachHang', 'PhieuKho', 'BaoGia', 'DonHang', 'ThuTien', 'HopDong'].forEach(t => { cu[t] = readTable_(t); });
  const co = (t, k, v) => cu[t].find(r => String(r[k]) === v);
  const daGiao = new Set(cu.PhieuKho.filter(p => p.Loai === 'Xuất').map(p => String(p.SoDH))), daThu = new Set(cu.ThuTien.map(p => String(p.SoDH)));
  const ngay = n => Utilities.formatDate(new Date(Date.now() + n * 864e5), tz_(), 'yyyy-MM-dd');
  const ma = Date.now().toString(36).toUpperCase();
  const loai = loaiHopDong_(), loaiGop = loai.find(l => /trả góp/i.test(l)) || loai[0], loaiKhac = loai.find(l => l !== loaiGop) || loai[0];

  // [tên, model, nhóm, ĐVT, xuất xứ, giá sỉ, giá lẻ, tồn tối thiểu, bảo hành, có IMEI, SL nhập đợt 1, đợt 2, đợt 3]
  const H = [
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
  const hang = H.map(x => co('HangHoa', 'TenHang', THU_ + ' ' + x[0]) || (gio(), luuHang(tk, { TenHang: THU_ + ' ' + x[0], Model: 'THU-' + x[1], NhomHang: x[2], DVT: x[3], XuatXu: x[4], GiaSi: x[5], GiaLe: x[6], TonToiThieu: x[7], BaoHanh: x[8] })));

  // [tên, người liên hệ, SĐT, địa chỉ, MST, ngân hàng]
  const K = [
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
  const khach = K.map((x, i) => co('KhachHang', 'TenKH', THU_ + ' ' + x[0]) || (gio(), luuKhach(tk, { TenKH: THU_ + ' ' + x[0], NguoiLienHe: x[1], SDT: x[2], DiaChi: x[3], MST: x[4] || '',
    NguoiDaiDien: x[1], ChucVu: x[4] ? 'Giám đốc' : '', SoTK: x[4] ? '00710001234' + i : '', NganHang: x[5] || '', GhiChu: x[4] ? 'Khách doanh nghiệp' : 'Khách lẻ' })));

  // Nhập kho 3 đợt; máy có IMEI thì giữ vào kho để phiếu giao lấy ra theo thứ tự
  const kho = {};
  if (cu.PhieuKho.some(p => String(p.GhiChu).indexOf(THU_) >= 0)) { // lần trước đã nhập: IMEI còn trong kho = đã nhập trừ đã xuất
    const pk = {}, ra = new Set(), cua = {};
    cu.PhieuKho.forEach(p => { pk[p.SoPK] = p; });
    hang.forEach(h => { cua[h.MaHH] = 1; });
    const ct = readTable_('PhieuKhoCT').filter(l => cua[l.MaHH] && pk[l.SoPK]);
    ct.filter(l => pk[l.SoPK].Loai === 'Xuất').forEach(l => imeiList_(l.IMEI).forEach(x => ra.add(x)));
    ct.filter(l => pk[l.SoPK].Loai === 'Nhập').forEach(l => { kho[l.MaHH] = (kho[l.MaHH] || []).concat(imeiList_(l.IMEI).filter(x => !ra.has(x))); });
  }
  const dong = (h, sl) => ({ MaHH: h.MaHH, TenHang: h.TenHang, Model: h.Model, DVT: h.DVT, XuatXu: h.XuatXu, SoLuong: sl, LoaiGia: 'Lẻ', DonGia: h.GiaLe, IMEI: '' });
  [[-370, 'Nhà phân phối FPT', 10], [-160, 'Nhà phân phối Digiworld', 11], [-20, 'Nhà phân phối FPT', 12]].forEach(([n, ncc, cot], d) => {
    if (co('PhieuKho', 'GhiChu', THU_ + ' Nhập hàng đợt ' + (d + 1))) return;
    gio();
    const lines = hang.map((h, i) => {
      const sl = H[i][cot]; if (!sl) return null;
      const l = dong(h, sl);
      if (H[i][9]) { const im = Array.from({ length: sl }, (_, j) => 'THU' + ma + 'N' + d + 'H' + i + 'M' + j); l.IMEI = im.join(', '); kho[h.MaHH] = (kho[h.MaHH] || []).concat(im); }
      return l;
    }).filter(Boolean);
    luuChungTu(tk, 'NK', { Ngay: ngay(n), DoiTac: ncc, GhiChu: THU_ + ' Nhập hàng đợt ' + (d + 1), lines: lines });
  });
  const xuat = (h, sl) => Object.assign(dong(h, sl), { IMEI: kho[h.MaHH] ? kho[h.MaHH].splice(0, sl).join(', ') : '' });
  const kh = k => ({ MaKH: k.MaKH, TenKH: k.TenKH, NguoiNhan: k.NguoiLienHe || k.TenKH.replace(THU_ + ' ', ''), SDT: k.SDT, DiaChi: k.DiaChi, VAT: k.MST ? 10 : 0, GhiChu: THU_ });
  const giao = (d, n, lines) => daGiao.has(String(d.SoDH)) || gio() || luuChungTu(tk, 'XK', { Ngay: ngay(n), SoDH: d.SoDH, DoiTac: d.TenKH, GhiChu: THU_, lines: lines.map(l => xuat(hang.find(h => h.MaHH === l.MaHH), l.SoLuong)) });
  const thu = (d, n, tien, hinhThuc, ghiChu) => daThu.has(String(d.SoDH)) || gio() || luuThuTien(tk, { Ngay: ngay(n), SoDH: d.SoDH, SoTien: tien, HinhThuc: hinhThuc, GhiChu: THU_ + (ghiChu ? ' ' + ghiChu : '') });

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
  const dsDon = DON.map(([n, ki, ds], i) => {
    const k = khach[ki], lines = ds.map(([h, sl]) => dong(hang[h], sl)), nhan = THU_ + ' #' + (i + 1);
    let d = co('DonHang', 'GhiChu', nhan);
    if (d) d = Object.assign({}, d, { lines: lines });
    else {
      gio();
      const bg = i < 10 && i % 2 === 0 ? luuChungTu(tk, 'BG', Object.assign(kh(k), { Ngay: ngay(n - 1), GhiChu: nhan, lines: lines })).doc : null;
      d = luuChungTu(tk, 'DH', Object.assign(kh(k), { Ngay: ngay(n), SoBG: bg ? bg.SoBG : '', NgayGiao: ngay(i === 3 ? -1 : i < 3 ? n + 4 : n + 2), GhiChu: nhan, lines: lines })).doc;
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
  [[0, 2, [[0, 2]]], [-1, 6, [[3, 1], [6, 1]]], [-3, 9, [[1, 2]]], [-12, 10, [[4, 3]]], [-25, 5, [[2, 1], [9, 2]]], [-38, 7, [[6, 4]]]].forEach(([n, ki, ds], j) =>
    co('BaoGia', 'GhiChu', THU_ + ' Khách đang cân nhắc #' + (j + 1)) || gio() ||
    luuChungTu(tk, 'BG', Object.assign(kh(khach[ki]), { Ngay: ngay(n), GhiChu: THU_ + ' Khách đang cân nhắc #' + (j + 1), lines: ds.map(([h, sl]) => dong(hang[h], sl)) })));

  // Hợp đồng: trả góp (kỳ 1 quá hạn, kỳ 2 đến hạn sau 5 ngày), sắp hết hạn, đã hết hạn, còn dài, bản nháp
  const benA = k => ({ MaKH: k.MaKH, TenDN: k.TenKH, DiaChi: k.DiaChi, MST: k.MST, NguoiDaiDien: k.NguoiDaiDien, ChucVu: k.ChucVu, SDT: k.SDT, SoTK: k.SoTK, NganHang: k.NganHang });
  const kGop = khach[2], dGop = co('DonHang', 'GhiChu', THU_ + ' Trả góp theo hợp đồng') || (gio(), luuChungTu(tk, 'DH', Object.assign(kh(kGop), { Ngay: ngay(-45), NgayGiao: ngay(-40), GhiChu: THU_ + ' Trả góp theo hợp đồng', lines: [dong(hang[0], 2)] })).doc);
  giao(dGop, -40, [dong(hang[0], 1)]);
  const hd1 = co('HopDong', 'GhiChu', THU_ + ' Trả góp 6 kỳ, 0% lãi') || (gio(), luuHopDong(tk, Object.assign(benA(kGop), { Ngay: ngay(-45), LoaiHD: loaiGop, SoDH: dGop.SoDH, NgayHieuLuc: ngay(-45), NgayHetHan: ngay(140), TrangThai: 'Đang hiệu lực',
    NguoiPhuTrach: 'Dữ liệu thử', GhiChu: THU_ + ' Trả góp 6 kỳ, 0% lãi', lines: [dong(hang[0], 2)] })).doc);
  const tra = Math.round(hd1.TongCong * 0.3), ky = Math.floor((hd1.TongCong - tra) / 6);
  if (!lichHopDong_(hd1.SoHD).length) luuLichHopDong(tk, hd1.SoHD, [{ Nhan: 'Trả trước', NgayDen: ngay(-45), SoTien: tra }].concat(Array.from({ length: 6 }, (_, i) =>
    ({ Nhan: 'Kỳ ' + (i + 1), NgayDen: ngay(-25 + i * 30), SoTien: i === 5 ? hd1.TongCong - tra - ky * 5 : ky }))));
  if (!lichHopDong_(hd1.SoHD)[0].SoPT) thuDotHopDong(tk, hd1.SoHD, 1, { Ngay: ngay(-45), HinhThuc: 'Chuyển khoản' });
  const dv = (ten, tien) => [{ TenHang: ten, DVT: 'Gói', SoLuong: 1, DonGia: tien }];
  [[khach[2], -345, 20, 'Đang hiệu lực', 'Sắp hết hạn', dv('Bảo trì thiết bị 12 tháng', 6000000)],
   [khach[8], -370, -5, 'Đang hiệu lực', 'Đã quá hạn, chưa gia hạn', dv('Cung cấp máy cho nhân viên', 45000000)],
   [khach[11], -60, 300, 'Đang hiệu lực', 'Đại lý phân phối phụ kiện', dv('Phân phối phụ kiện theo quý', 30000000)],
  ].forEach(([k, bd, het, tt, gc, lines]) => co('HopDong', 'GhiChu', THU_ + ' ' + gc) || gio() || luuHopDong(tk, Object.assign(benA(k), { Ngay: ngay(bd), LoaiHD: loaiKhac, NgayHieuLuc: ngay(bd), NgayHetHan: ngay(het), BaoTruocNgay: 30,
    TrangThai: tt, NguoiPhuTrach: 'Dữ liệu thử', GhiChu: THU_ + ' ' + gc, lines: lines })));
  if (!co('HopDong', 'GhiChu', THU_ + ' Bản nháp')) luuHopDong(tk, Object.assign(benA(khach[8]), { Ngay: ngay(0), LoaiHD: loai[0], TrangThai: 'Soạn thảo', GhiChu: THU_ + ' Bản nháp', lines: [dong(hang[2], 3)] }));

  Logger.log('Đã nạp dữ liệu thử: ' + hang.length + ' hàng, ' + khach.length + ' khách, ' + (dsDon.length + 1) + ' đơn, 5 hợp đồng (' + hd1.SoHD + ' trả góp). Xóa: chạy xoaDuLieuThu.');
}

function xoaDuLieuThu() {
  const tk = phienThu_(), gio = henGio_('xoaDuLieuThu'), thu = v => String(v).indexOf(THU_) >= 0;
  const khach = readTable_('KhachHang').filter(k => thu(k.TenKH)).map(k => k.MaKH);
  const laKhach = r => khach.indexOf(r.MaKH) >= 0;
  const hd = readTable_('HopDong').filter(h => thu(h.TenDN) || thu(h.GhiChu));
  hd.forEach(h => lichHopDong_(h.SoHD).filter(r => r.SoPT).forEach(r => gio() || huyThuDotHopDong(tk, h.SoHD, r.Dot)));
  hd.forEach(h => gio() || xoaHopDong(tk, h.SoHD));
  readTable_('ThuTien').filter(laKhach).forEach(p => gio() || xoaThuTien(tk, p.SoPT));
  readTable_('PhieuKho').filter(p => thu(p.GhiChu)).forEach(p => gio() || xoaChungTu(tk, p.Loai === 'Nhập' ? 'NK' : 'XK', p.SoPK));
  readTable_('DonHang').filter(laKhach).forEach(d => gio() || xoaChungTu(tk, 'DH', d.SoDH));
  readTable_('BaoGia').filter(laKhach).forEach(b => gio() || xoaChungTu(tk, 'BG', b.SoBG));
  khach.forEach(m => gio() || xoaKhach(tk, m));
  readTable_('HangHoa').filter(h => thu(h.TenHang)).forEach(h => gio() || xoaHang(tk, h.MaHH));
  Logger.log('Đã xóa dữ liệu thử: ' + khach.length + ' khách, ' + hd.length + ' hợp đồng cùng đơn, phiếu, hàng liên quan.');
}
