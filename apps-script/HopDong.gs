/**
 * Hợp đồng: lập, lưu, tạo file Google Docs từ mẫu, tải PDF, quản lý mẫu theo loại hợp đồng.
 * File này dùng chung phạm vi với Code.gs (Apps Script gộp mọi file .gs): dùng sheet_, readTable_, withLock_, log_, user_… ở đó.
 * Bên A = khách hàng, bên B = cửa hàng. Quy trình: luuHopDong (chỉ ghi Sheet) → taoFileHopDong (sao chép mẫu Docs, thay biến) → taiPdfHopDong.
 */

// ===== Dữ liệu hợp đồng =====
// Trạng thái lưu: HD_TRANG_THAI; "Sắp hết hạn"/"Đã hết hạn" tính từ NgayHetHan, không lưu.
const HD_TRANG_THAI = ['Soạn thảo', 'Đang hiệu lực', 'Tạm dừng', 'Hoàn thành'];
const HD_DA_KY = ['Đang hiệu lực', 'Hoàn thành']; // đã ký: nhân viên không đổi hàng và số tiền, chỉ quản trị
// Các cột có mặt trong file hợp đồng: đổi một trong số này (hoặc dòng hàng) sau khi tạo file thì file đã cũ (FileCu = '1')
const HD_TRONG_FILE = ['Ngay', 'LoaiHD', 'SoDH', 'TenDN', 'DiaChi', 'VanPhongGD', 'MST', 'NguoiDaiDien', 'ChucVu', 'SDT', 'SoTK', 'NganHang', 'NgayHieuLuc', 'NgayHetHan', 'VAT', 'GhiChu'];

function loaiHopDong_() {
  const ds = readTable_('MauHopDong').map(m => String(m.LoaiHD)).filter(Boolean);
  return ds.length ? ds : HD_LOAI_MAC_DINH.map(l => l.ten);
}

function layHopDong(token, soHD) {
  user_(token);
  return { lines: dongHopDong_(soHD) };
}
function dongHopDong_(soHD) {
  return readTable_('HopDongCT').filter(l => String(l.SoHD) === String(soHD)).sort((a, b) => a.STT - b.STT);
}

/** Lập hoặc sửa hợp đồng (chưa tạo file Docs). Tiền và bằng chữ luôn tính lại ở máy chủ. */
function luuHopDong(token, doc) {
  const user = user_(token);
  doc = doc || {};
  const str = (v, n) => String(v == null ? '' : v).trim().slice(0, n);
  const ngay = (v, ten) => {
    v = str(v, 10);
    if (v && (!/^\d{4}-\d{2}-\d{2}$/.test(v) || new Date(v + 'T00:00:00Z').toISOString().slice(0, 10) !== v)) throw new Error(ten + ' không hợp lệ (cần dạng năm-tháng-ngày).');
    return v;
  };
  const head = {
    SoHD: str(doc.SoHD, 40), Ngay: ngay(doc.Ngay, 'Ngày ký') || now_().slice(0, 10), LoaiHD: str(doc.LoaiHD, 80), SoDH: str(doc.SoDH, 40), MaKH: str(doc.MaKH, 20),
    TenDN: str(doc.TenDN, 150), DiaChi: str(doc.DiaChi, 250), VanPhongGD: str(doc.VanPhongGD, 250), MST: str(doc.MST, 20),
    NguoiDaiDien: str(doc.NguoiDaiDien, 100), ChucVu: str(doc.ChucVu, 60), SDT: str(doc.SDT, 40), SoTK: str(doc.SoTK, 40), NganHang: str(doc.NganHang, 100),
    NgayHieuLuc: ngay(doc.NgayHieuLuc, 'Ngày hiệu lực'), NgayHetHan: ngay(doc.NgayHetHan, 'Ngày hết hạn'), NguoiPhuTrach: str(doc.NguoiPhuTrach, 60),
    TrangThai: HD_TRANG_THAI.includes(doc.TrangThai) ? doc.TrangThai : HD_TRANG_THAI[0], VAT: Math.min(100, Math.max(0, +doc.VAT || 0)), GhiChu: str(doc.GhiChu, 1000),
  };
  if (!head.LoaiHD) throw new Error('Chọn loại hợp đồng.');
  if (!head.TenDN) throw new Error('Nhập tên khách hàng (bên A).');
  if (head.NgayHieuLuc && head.NgayHetHan && head.NgayHetHan < head.NgayHieuLuc) throw new Error('Ngày hết hạn phải sau ngày hiệu lực.');
  const lines = (doc.lines || []).filter(l => String(l.TenHang || '').trim()).slice(0, 200).map((l, i) => {
    const o = { STT: i + 1, MaHH: str(l.MaHH, 20), TenHang: str(l.TenHang, 200), DVT: str(l.DVT, 30), SoLuong: +l.SoLuong || 0, DonGia: Math.round(+l.DonGia || 0) };
    if (o.SoLuong <= 0) throw new Error('Dòng ' + o.STT + ': số lượng phải lớn hơn 0.');
    if (o.DonGia < 0) throw new Error('Dòng ' + o.STT + ': đơn giá không được âm.');
    o.ThanhTien = Math.round(o.SoLuong * o.DonGia);
    return o;
  });
  head.TienHang = lines.reduce((t, l) => t + l.ThanhTien, 0);
  head.TienVAT = Math.round(head.TienHang * head.VAT / 100);
  head.TongCong = head.TienHang + head.TienVAT;
  head.BangChu = docTienChu_(head.TongCong);
  head.NgaySua = now_();
  return withLock_(() => {
    const old = head.SoHD ? findObj_('HopDong', head.SoHD) : null;
    if (head.SoHD && !old) throw new Error('Không tìm thấy hợp đồng ' + head.SoHD + ' (có thể đã bị xóa).');
    if (head.SoDH && !findObj_('DonHang', head.SoDH)) throw new Error('Không tìm thấy đơn hàng ' + head.SoDH + '.');
    const khoa = ls => JSON.stringify(ls.map(l => [String(l.MaHH), String(l.TenHang), String(l.DVT), +l.SoLuong, +l.DonGia]));
    const cu = old ? dongHopDong_(head.SoHD) : [];
    if (old && HD_DA_KY.includes(old.TrangThai) && user.vaiTro !== 'admin' && (khoa(cu) !== khoa(lines) || +old.VAT !== head.VAT)) {
      throw new Error('Hợp đồng đã hiệu lực: chỉ quản trị được sửa hàng hóa và số tiền. Có thay đổi thì nhân bản thành hợp đồng mới.');
    }
    if (!old) { head.NguoiTao = user.ten; head.NgayTao = head.NgaySua; }
    // File Docs đã tạo mà nội dung hợp đồng vừa đổi thì đánh dấu file cũ (giao diện sẽ tạo lại trước khi tải PDF)
    const doiNoiDung = old && (HD_TRONG_FILE.some(k => String(old[k] == null ? '' : old[k]) !== String(head[k])) || khoa(cu) !== khoa(lines));
    head.FileCu = old && old.FileId && (doiNoiDung || old.FileCu === '1') ? '1' : '';
    upsert_('HopDong', head, () => nextSo_('HopDong', 'HD', head.Ngay), ['NguoiTao', 'NgayTao', 'FileId', 'LinkFile', 'NgayFile']);
    deleteWhere_('HopDongCT', head.SoHD);
    if (lines.length) {
      const sh = sheet_('HopDongCT');
      const rows = lines.map(l => toRow_(sh, Object.assign({ SoHD: head.SoHD }, l)));
      sh.getRange(sh.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
    }
    log_(user, (old ? 'Sửa' : 'Thêm') + ' hợp đồng', head.SoHD, head.TenDN + ' · ' + head.LoaiHD + ' · ' + head.TongCong + ' đ');
    head.lines = lines;
    return { doc: head };
  });
}

function xoaHopDong(token, soHD) {
  const user = user_(token, true);
  withLock_(() => {
    const hd = findObj_('HopDong', soHD);
    if (!hd) throw new Error('Không tìm thấy hợp đồng ' + soHD + '.');
    deleteWhere_('HopDong', soHD);
    deleteWhere_('HopDongCT', soHD);
    if (hd.FileId) { try { DriveApp.getFileById(hd.FileId).setTrashed(true); } catch (e) {} } // vào thùng rác Drive, còn khôi phục được
    log_(user, 'Xóa hợp đồng', soHD, hd.TenDN + ' · ' + hd.LoaiHD);
  });
}

/** Số tiền thành chữ tiếng Việt, vd. 112420000 → "Một trăm mười hai triệu bốn trăm hai mươi nghìn đồng chẵn." */
function docTienChu_(n) {
  n = Math.round(+n || 0);
  if (Math.abs(n) > 999999999999999) throw new Error('Số tiền quá lớn để đọc thành chữ.');
  if (n === 0) return 'Không đồng chẵn.';
  const chu = (n < 0 ? 'âm ' : '') + docSo_(Math.abs(n), false) + ' đồng chẵn.';
  return chu.charAt(0).toUpperCase() + chu.slice(1);
}
function docSo_(n, daCoTruoc) { // n nguyên dương; daCoTruoc = phía trước đã đọc nhóm lớn hơn (nhóm này đọc đủ "không trăm", "linh")
  if (n >= 1e9) return docSo_(Math.floor(n / 1e9), daCoTruoc) + ' tỷ' + (n % 1e9 ? ' ' + docSo_(n % 1e9, true) : '');
  const out = [];
  let co = daCoTruoc;
  [[Math.floor(n / 1e6) % 1000, 'triệu'], [Math.floor(n / 1e3) % 1000, 'nghìn'], [n % 1000, '']].forEach(g => {
    if (!g[0]) return;
    out.push(docSo3_(g[0], co) + (g[1] ? ' ' + g[1] : ''));
    co = true;
  });
  return out.join(' ');
}
function docSo3_(n, co) { // n 1..999
  const CH = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
  const tram = Math.floor(n / 100), chuc = Math.floor(n / 10) % 10, dv = n % 10, out = [];
  if (tram || co) out.push(CH[tram] + ' trăm');
  if (chuc > 1) out.push(CH[chuc] + ' mươi');
  else if (chuc === 1) out.push('mười');
  else if (dv && (tram || co)) out.push('linh');
  if (dv) out.push(dv === 1 && chuc > 1 ? 'mốt' : dv === 5 && chuc > 0 ? 'lăm' : dv === 4 && chuc > 1 ? 'tư' : CH[dv]); // giống hàm docSo trong Index.html (in báo giá) để hai nơi đọc như nhau
  return out.join(' ');
}

// ===== Mẫu hợp đồng (Google Docs) =====
// Biến trong mẫu viết dạng {{TEN}}; ý nghĩa ở HD_BIEN (hiện trong Cài đặt → Mẫu hợp đồng để quản trị sao chép). Biến để trống thì in dấu chấm để điền tay.
const HD_BIEN = [
  ['MAHOPDONG', 'Số hợp đồng'], ['LOAIHOPDONG', 'Loại hợp đồng'], ['THOIGIANTAO', 'Thời điểm tạo file'],
  ['NGAYKY', 'Ngày ký, dạng 25/01/2026'], ['NGAYKYDAI', 'Ngày ký, dạng "ngày 25 tháng 01 năm 2026"'], ['NGAYHIEULUC', 'Ngày hiệu lực'], ['NGAYHETHAN', 'Ngày hết hạn'],
  ['THOIHAN', 'Thời hạn viết sẵn: "từ ngày … đến hết ngày …" / "kể từ ngày ký"'], ['SODONHANG', 'Số đơn hàng liên quan'], ['NGUOIPHUTRACH', 'Người phụ trách'],
  ['TENDOANHNGHIEP', 'Bên A: tên khách hàng / doanh nghiệp'], ['DIACHIDOANHNGHIEP', 'Bên A: địa chỉ'], ['VANPHONGGIAODICH', 'Bên A: văn phòng giao dịch'], ['MASOTHUE', 'Bên A: mã số thuế'],
  ['NGUOIDAIDIEN', 'Bên A: người đại diện'], ['CHUCVU', 'Bên A: chức vụ'], ['DIENTHOAI', 'Bên A: số điện thoại'], ['SOTAIKHOAN', 'Bên A: số tài khoản'], ['NGANHANG', 'Bên A: ngân hàng'],
  ['B_TEN', 'Bên B (cửa hàng): tên in trên chứng từ'], ['B_DIACHI', 'Bên B: địa chỉ'], ['B_MST', 'Bên B: mã số thuế'], ['B_DAIDIEN', 'Bên B: người đại diện (chủ hộ)'], ['B_CHUCVU', 'Bên B: chức danh người ký'],
  ['B_LIENHE', 'Bên B: điện thoại, email'], ['B_STK', 'Bên B: số tài khoản nhận tiền'], ['B_NGANHANG', 'Bên B: ngân hàng'], ['B_CHUTK', 'Bên B: chủ tài khoản'], ['B_BAOHANH', 'Bên B: số tháng bảo hành mặc định'],
  ['BANGHANG', 'Bảng hàng hóa (STT, tên hàng, ĐVT, SL, đơn giá, thành tiền, cộng, VAT, tổng) – đặt riêng một dòng'],
  ['CONGTIENHANG', 'Cộng tiền hàng'], ['VAT', 'Thuế GTGT (%)'], ['TIENVAT', 'Tiền thuế GTGT'], ['TONGTHANHTOAN', 'Tổng thanh toán'], ['BANGCHU', 'Tổng thanh toán bằng chữ'], ['GHICHU', 'Ghi chú'],
];

// Nội dung mẫu mặc định viết bằng danh sách mục: ['cb' căn giữa đậm, 'c' căn giữa, 'tt' tiêu đề, 'ci' in nghiêng, 'p' đoạn, 'li' gạch đầu dòng,
// 'kv' nhãn đậm + giá trị, 'h' tiêu đề nhỏ, 'dieu' "Điều N." tự đánh số, 'bang' bảng hàng, 'ky' khung chữ ký, 'bl' dòng trống].
// Đây là khung tham khảo cho cửa hàng điện thoại, không thay thế tư vấn pháp lý: nên nhờ luật sư rà soát rồi sửa trực tiếp trong file Google Docs mẫu.
const HD_QH = [['cb', 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM'], ['cb', 'Độc lập – Tự do – Hạnh phúc'], ['c', '––––––––––––––––––'], ['bl']];
const hdCanCu = (...them) => [['ci', 'Căn cứ Bộ luật Dân sự năm 2015, Luật Thương mại năm 2005, Luật Bảo vệ quyền lợi người tiêu dùng năm 2023 và các văn bản pháp luật có liên quan;']]
  .concat(them.map(t => ['ci', t]));
const hdBenA = vaiTro => [['h', 'BÊN A – ' + vaiTro], ['kv', 'Tên đơn vị / cá nhân: ', '{{TENDOANHNGHIEP}}'], ['kv', 'Địa chỉ: ', '{{DIACHIDOANHNGHIEP}}'], ['kv', 'Văn phòng giao dịch: ', '{{VANPHONGGIAODICH}}'],
  ['kv', 'Mã số thuế: ', '{{MASOTHUE}}'], ['kv', 'Người đại diện: ', '{{NGUOIDAIDIEN}} – Chức vụ: {{CHUCVU}}'], ['kv', 'Điện thoại: ', '{{DIENTHOAI}}'], ['kv', 'Số tài khoản: ', '{{SOTAIKHOAN}} tại {{NGANHANG}}']];
const hdBenB = vaiTro => [['h', 'BÊN B – ' + vaiTro], ['kv', 'Tên đơn vị: ', '{{B_TEN}}'], ['kv', 'Địa chỉ: ', '{{B_DIACHI}}'], ['kv', 'Mã số thuế: ', '{{B_MST}}'],
  ['kv', 'Người đại diện: ', '{{B_DAIDIEN}} – Chức vụ: {{B_CHUCVU}}'], ['kv', 'Liên hệ: ', '{{B_LIENHE}}'], ['kv', 'Số tài khoản: ', '{{B_STK}} tại {{B_NGANHANG}} – Chủ tài khoản: {{B_CHUTK}}']];
const hdMoDau = (tieuDe, vaiA, vaiB, ...canCuThem) => HD_QH.concat([['tt', tieuDe], ['c', 'Số: {{MAHOPDONG}}'], ['bl']], hdCanCu(...canCuThem),
  [['p', 'Hôm nay, {{NGAYKYDAI}}, tại {{B_DIACHI}}, chúng tôi gồm:']], hdBenA(vaiA), hdBenB(vaiB), [['p', 'Hai bên thống nhất ký kết hợp đồng với các điều khoản sau:']]);
const hdViPham = () => [['dieu', 'Vi phạm hợp đồng và bồi thường'],
  ['p', 'Bên nào vi phạm nghĩa vụ trong hợp đồng thì phải khắc phục và bồi thường thiệt hại thực tế phát sinh cho bên kia. Hai bên có thể thỏa thuận phạt vi phạm; mức phạt do hai bên thỏa thuận bằng văn bản nhưng không quá 8% giá trị phần nghĩa vụ hợp đồng bị vi phạm theo quy định của Luật Thương mại. Bên chậm thanh toán phải trả lãi trên số tiền chậm trả theo mức hai bên thỏa thuận hoặc theo quy định của pháp luật.']];
const hdBatKhaKhang = () => [['dieu', 'Bất khả kháng'],
  ['p', 'Sự kiện bất khả kháng là sự kiện xảy ra một cách khách quan không thể lường trước và không thể khắc phục được dù đã áp dụng mọi biện pháp cần thiết trong khả năng cho phép (thiên tai, dịch bệnh, chiến tranh, quyết định của cơ quan nhà nước có thẩm quyền…). Bên bị ảnh hưởng phải thông báo cho bên kia trong thời hạn hợp lý và được miễn trách nhiệm đối với phần nghĩa vụ bị ảnh hưởng trong thời gian xảy ra sự kiện đó.']];
const hdTranhChap = () => [['dieu', 'Giải quyết tranh chấp'],
  ['p', 'Mọi tranh chấp phát sinh từ hợp đồng này trước hết được giải quyết bằng thương lượng, hòa giải trên tinh thần hợp tác. Nếu không thương lượng được trong thời hạn 30 ngày kể từ ngày phát sinh tranh chấp, mỗi bên có quyền khởi kiện tại Tòa án nhân dân có thẩm quyền theo quy định của pháp luật.']];
const hdHieuLuc = () => [['dieu', 'Hiệu lực hợp đồng'], ['li', 'Hợp đồng có hiệu lực {{THOIHAN}}.'],
  ['li', 'Mọi sửa đổi, bổ sung hợp đồng phải được lập thành văn bản và có chữ ký của hai bên.'],
  ['li', 'Hợp đồng được lập thành 02 bản có giá trị pháp lý như nhau, mỗi bên giữ 01 bản.'], ['p', 'Ghi chú thêm: {{GHICHU}}'], ['bl']];
const hdThanhToanTK = [['li', 'Thông tin nhận chuyển khoản của Bên B: số tài khoản {{B_STK}} tại {{B_NGANHANG}}, chủ tài khoản {{B_CHUTK}}; nội dung chuyển khoản ghi số hợp đồng {{MAHOPDONG}}.']];

const HD_MAU_MUA_BAN = hdMoDau('HỢP ĐỒNG MUA BÁN HÀNG HÓA', 'BÊN MUA', 'BÊN BÁN', 'Căn cứ nhu cầu và khả năng của hai bên.').concat([
  ['dieu', 'Hàng hóa, số lượng và giá'], ['p', 'Bên B bán và Bên A mua các hàng hóa sau:'], ['bang'],
  ['p', 'Tổng giá trị hợp đồng (gồm thuế GTGT {{VAT}}%): {{TONGTHANHTOAN}} đồng. Bằng chữ: {{BANGCHU}}'],
  ['dieu', 'Chất lượng, nguồn gốc và bảo hành'],
  ['li', 'Hàng hóa là hàng mới 100%, nguyên hộp, chính hãng, đúng chủng loại, model, dung lượng và màu sắc ghi trong hợp đồng.'],
  ['li', 'Số IMEI/serial của từng máy được ghi trong phiếu giao hàng kiêm phiếu bảo hành và là căn cứ để bảo hành.'],
  ['li', 'Thời hạn bảo hành: {{B_BAOHANH}} tháng kể từ ngày giao hàng, theo chính sách của nhà sản xuất và của Bên B. Không bảo hành đối với máy bị rơi vỡ, vào nước, cháy nổ, tự ý can thiệp phần cứng hoặc phần mềm, hoặc hư hỏng do sử dụng sai hướng dẫn.'],
  ['dieu', 'Giao nhận hàng'],
  ['li', 'Địa điểm giao hàng: ……………………………………; thời gian giao hàng: ……………………………………'],
  ['li', 'Khi nhận hàng, Bên A kiểm tra ngoại quan, số lượng, IMEI/serial, kích hoạt thử và ký xác nhận vào phiếu giao hàng. Mọi khiếu nại về số lượng, chủng loại, tình trạng bên ngoài phải được nêu ngay khi nhận hàng.'],
  ['li', 'Rủi ro về hàng hóa chuyển sang Bên A kể từ thời điểm Bên A nhận hàng và ký phiếu giao hàng.'],
  ['dieu', 'Thanh toán'],
  ['li', 'Bên A thanh toán cho Bên B bằng tiền mặt hoặc chuyển khoản. Tiến độ thanh toán: ……………………………………(ví dụ: đặt cọc …%, phần còn lại khi nhận hàng).']]
  .concat(hdThanhToanTK, [
  ['dieu', 'Quyền và nghĩa vụ của các bên'],
  ['li', 'Bên A: thanh toán đầy đủ, đúng hạn; nhận hàng đúng thời gian, địa điểm đã thỏa thuận; sử dụng hàng hóa theo hướng dẫn của nhà sản xuất.'],
  ['li', 'Bên B: giao hàng đúng chủng loại, số lượng, chất lượng; cung cấp phiếu giao hàng kiêm phiếu bảo hành có IMEI/serial; bảo hành theo cam kết; bảo mật thông tin của khách hàng.']],
  hdViPham(), hdBatKhaKhang(), hdTranhChap(), hdHieuLuc(), [['ky', 'ĐẠI DIỆN BÊN A (BÊN MUA)', 'ĐẠI DIỆN BÊN B (BÊN BÁN)']]));

const HD_MAU_NGUYEN_TAC = hdMoDau('HỢP ĐỒNG NGUYÊN TẮC MUA BÁN HÀNG HÓA', 'BÊN MUA', 'BÊN BÁN', 'Căn cứ nhu cầu mua bán thường xuyên giữa hai bên.').concat([
  ['dieu', 'Nguyên tắc chung'],
  ['p', 'Hợp đồng này quy định các nguyên tắc chung cho việc Bên A mua hàng của Bên B trong thời gian hợp đồng có hiệu lực. Từng lần mua bán cụ thể được xác lập bằng đơn đặt hàng, báo giá được hai bên xác nhận, phiếu giao hàng hoặc phụ lục hợp đồng, và là bộ phận không tách rời của hợp đồng này.'],
  ['dieu', 'Hàng hóa và giá'],
  ['p', 'Hàng hóa: điện thoại di động, máy tính bảng, phụ kiện và thiết bị liên quan do Bên B kinh doanh. Giá bán theo bảng giá hoặc báo giá của Bên B tại thời điểm đặt hàng; giá có thể thay đổi theo thị trường nhưng không áp dụng cho đơn hàng đã được hai bên xác nhận.'],
  ['p', 'Danh mục và đơn giá áp dụng (nếu có):'], ['bang'],
  ['dieu', 'Đặt hàng và giao nhận'],
  ['li', 'Bên A đặt hàng bằng văn bản, tin nhắn hoặc email; đơn hàng có hiệu lực khi Bên B xác nhận.'],
  ['li', 'Bên B giao hàng theo thời gian, địa điểm ghi trong đơn hàng; Bên A kiểm tra IMEI/serial, tình trạng máy và ký xác nhận khi nhận.'],
  ['dieu', 'Thanh toán và công nợ'],
  ['li', 'Thời hạn thanh toán: ………… ngày kể từ ngày nhận hàng. Hạn mức công nợ tối đa: …………………… đồng.'],
  ['li', 'Khi công nợ quá hạn hoặc vượt hạn mức, Bên B có quyền tạm ngừng giao hàng cho đến khi Bên A thanh toán.']]
  .concat(hdThanhToanTK, [
  ['dieu', 'Bảo hành và đổi trả'],
  ['p', 'Hàng hóa được bảo hành {{B_BAOHANH}} tháng theo chính sách của nhà sản xuất và của Bên B. Việc đổi hoặc sửa chữa máy lỗi kỹ thuật do nhà sản xuất được thực hiện theo chính sách tại thời điểm bán; không áp dụng đối với máy bị rơi vỡ, vào nước hoặc tự ý can thiệp.'],
  ['dieu', 'Cam kết của các bên'],
  ['li', 'Bên B cam kết hàng hóa chính hãng, có nguồn gốc rõ ràng, xuất trình chứng từ khi Bên A yêu cầu.'],
  ['li', 'Bên A cam kết mua hàng cho mục đích hợp pháp và thanh toán đúng hạn.'],
  ['dieu', 'Thời hạn và chấm dứt'],
  ['li', 'Hợp đồng có hiệu lực {{THOIHAN}}. Hết thời hạn, hợp đồng tự gia hạn thêm 12 tháng nếu không bên nào thông báo bằng văn bản không gia hạn trước 30 ngày.'],
  ['li', 'Mỗi bên có quyền chấm dứt hợp đồng bằng thông báo bằng văn bản trước 30 ngày; các đơn hàng đã xác nhận vẫn tiếp tục được thực hiện.']],
  hdViPham(), hdBatKhaKhang(), hdTranhChap(),
  [['dieu', 'Điều khoản chung'], ['li', 'Mọi sửa đổi, bổ sung phải được lập thành văn bản và có chữ ký của hai bên. Hợp đồng được lập thành 02 bản có giá trị như nhau, mỗi bên giữ 01 bản.'],
  ['p', 'Ghi chú thêm: {{GHICHU}}'], ['bl'], ['ky', 'ĐẠI DIỆN BÊN A (BÊN MUA)', 'ĐẠI DIỆN BÊN B (BÊN BÁN)']]));

const HD_MAU_DAI_LY = hdMoDau('HỢP ĐỒNG ĐẠI LÝ – PHÂN PHỐI', 'ĐẠI LÝ', 'NHÀ CUNG CẤP', 'Căn cứ nhu cầu và khả năng của hai bên.').concat([
  ['dieu', 'Phạm vi đại lý'],
  ['li', 'Bên B đồng ý để Bên A làm đại lý bán lại các sản phẩm điện thoại, máy tính bảng, phụ kiện do Bên B cung cấp; sản phẩm cụ thể: ……………………………………'],
  ['li', 'Khu vực hoạt động: ……………………………………. Quan hệ đại lý không mang tính độc quyền trừ khi hai bên thỏa thuận khác bằng văn bản.'],
  ['dieu', 'Giá và chiết khấu'],
  ['li', 'Bên A mua hàng theo bảng giá đại lý (giá sỉ) của Bên B tại thời điểm đặt hàng; mức chiết khấu theo doanh số: ……………………………………'],
  ['li', 'Bên A bán lại theo giá do Bên A tự quyết định nhưng không được quảng cáo, bán hàng gây nhầm lẫn là cửa hàng chính hãng của Bên B hoặc của nhà sản xuất.'],
  ['p', 'Danh mục và giá đại lý áp dụng ban đầu (nếu có):'], ['bang'],
  ['dieu', 'Đặt hàng, giao hàng'],
  ['li', 'Bên A đặt hàng bằng văn bản hoặc tin nhắn; đơn hàng có hiệu lực khi Bên B xác nhận. Bên B giao hàng kèm phiếu giao hàng ghi IMEI/serial.'],
  ['li', 'Bên A kiểm tra hàng khi nhận; khiếu nại về số lượng, chủng loại, tình trạng bên ngoài phải nêu ngay khi nhận hàng.'],
  ['dieu', 'Thanh toán và công nợ'],
  ['li', 'Thời hạn thanh toán: ………… ngày kể từ ngày nhận hàng; hạn mức công nợ tối đa: …………………… đồng. Vượt hạn mức hoặc quá hạn, Bên B có quyền tạm ngừng giao hàng.']]
  .concat(hdThanhToanTK, [
  ['dieu', 'Bảo hành và đổi trả'],
  ['li', 'Hàng bán qua đại lý được bảo hành {{B_BAOHANH}} tháng theo chính sách của nhà sản xuất và của Bên B, căn cứ IMEI/serial ghi trên phiếu giao hàng.'],
  ['li', 'Bên A tiếp nhận yêu cầu bảo hành của khách và chuyển cho Bên B; Bên B xử lý theo chính sách bảo hành, thông báo kết quả cho Bên A.'],
  ['dieu', 'Trách nhiệm của đại lý'],
  ['li', 'Bán đúng sản phẩm chính hãng nhận từ Bên B; không bán hàng giả, hàng nhái, hàng không rõ nguồn gốc dưới danh nghĩa sản phẩm của Bên B.'],
  ['li', 'Giữ bí mật bảng giá, chính sách và thông tin khách hàng mà Bên B cung cấp; chịu trách nhiệm về hoạt động bán hàng của mình theo quy định của pháp luật.'],
  ['dieu', 'Chấm dứt hợp đồng'],
  ['p', 'Mỗi bên có quyền chấm dứt hợp đồng bằng thông báo bằng văn bản trước 30 ngày. Khi chấm dứt, hai bên đối chiếu và thanh toán hết công nợ; hàng tồn của Bên A xử lý theo thỏa thuận: ……………………………………']],
  hdViPham(), hdBatKhaKhang(), hdTranhChap(), hdHieuLuc(), [['ky', 'ĐẠI DIỆN BÊN A (ĐẠI LÝ)', 'ĐẠI DIỆN BÊN B (NHÀ CUNG CẤP)']]));

const HD_MAU_THU_CU = hdMoDau('HỢP ĐỒNG THU CŨ ĐỔI MỚI', 'BÊN BÁN MÁY CŨ', 'BÊN MUA MÁY CŨ', 'Căn cứ nhu cầu và sự tự nguyện của hai bên.').concat([
  ['dieu', 'Máy cũ thu mua'],
  ['p', 'Bên A bán cho Bên B máy cũ: tên máy ……………………………………; dung lượng/màu ……………………………………; số IMEI/serial ……………………………………; tình trạng khi giao ……………………………………'],
  ['p', 'Giá thu mua do hai bên thống nhất sau khi Bên B kiểm tra, định giá: …………………… đồng (bằng chữ: ……………………………………).'],
  ['dieu', 'Máy mới mua'],
  ['p', 'Bên A mua của Bên B các hàng hóa sau:'], ['bang'],
  ['p', 'Tổng giá trị máy mới (gồm thuế GTGT {{VAT}}%): {{TONGTHANHTOAN}} đồng. Bằng chữ: {{BANGCHU}}'],
  ['p', 'Số tiền Bên A còn phải thanh toán = giá trị máy mới – giá thu mua máy cũ = …………………… đồng.'],
  ['dieu', 'Cam kết của Bên A về máy cũ'],
  ['li', 'Bên A là chủ sở hữu hợp pháp của máy cũ; máy không phải tài sản có được từ hành vi vi phạm pháp luật, không bị cầm cố, thế chấp hoặc đang có tranh chấp.'],
  ['li', 'Máy đã được đăng xuất tài khoản iCloud/Google, tắt tính năng tìm máy, không bị khóa mạng, khóa quản lý thiết bị (MDM) hay khóa kích hoạt; Bên A đã sao lưu và xóa dữ liệu cá nhân trước khi giao.'],
  ['li', 'Thông tin về tình trạng, linh kiện đã thay thế và lịch sử sửa chữa của máy mà Bên A cung cấp là trung thực.'],
  ['dieu', 'Quyền của Bên B'],
  ['li', 'Bên B có quyền từ chối thu mua hoặc điều chỉnh giá nếu kiểm tra thấy tình trạng máy không đúng cam kết, máy bị khóa hoặc không chứng minh được nguồn gốc.'],
  ['li', 'Nếu phát sinh tranh chấp hoặc yêu cầu của cơ quan có thẩm quyền liên quan đến máy cũ do Bên A cung cấp sai sự thật, Bên A chịu trách nhiệm trước pháp luật và hoàn lại thiệt hại cho Bên B.'],
  ['dieu', 'Thanh toán và chuyển giao'],
  ['li', 'Quyền sở hữu máy cũ chuyển sang Bên B khi Bên A giao máy và hai bên hoàn tất thanh toán/bù trừ theo hợp đồng này.']]
  .concat(hdThanhToanTK, [
  ['li', 'Máy mới được bảo hành {{B_BAOHANH}} tháng theo chính sách của nhà sản xuất và của Bên B; số IMEI/serial ghi trong phiếu giao hàng kiêm phiếu bảo hành.']],
  hdViPham(), hdBatKhaKhang(), hdTranhChap(), hdHieuLuc(), [['ky', 'ĐẠI DIỆN BÊN A (BÊN BÁN MÁY CŨ)', 'ĐẠI DIỆN BÊN B (BÊN MUA MÁY CŨ)']]));

const HD_MAU_SUA_CHUA = hdMoDau('HỢP ĐỒNG DỊCH VỤ SỬA CHỮA – BẢO HÀNH THIẾT BỊ', 'KHÁCH HÀNG', 'ĐƠN VỊ CUNG CẤP DỊCH VỤ', 'Căn cứ nhu cầu sửa chữa và khả năng cung cấp dịch vụ của hai bên.').concat([
  ['dieu', 'Thiết bị tiếp nhận'],
  ['p', 'Bên A giao cho Bên B thiết bị: tên máy ……………………………………; số IMEI/serial ……………………………………; phụ kiện kèm theo ……………………………………; tình trạng khi tiếp nhận và lỗi khách hàng yêu cầu xử lý ……………………………………'],
  ['dieu', 'Dịch vụ, linh kiện và chi phí'],
  ['p', 'Bên B thực hiện các hạng mục dịch vụ, linh kiện sau:'], ['bang'],
  ['p', 'Tổng chi phí (gồm thuế GTGT {{VAT}}%): {{TONGTHANHTOAN}} đồng. Bằng chữ: {{BANGCHU}}'],
  ['p', 'Chi phí có thể điều chỉnh nếu khi mở máy phát sinh lỗi khác; Bên B báo và được Bên A đồng ý trước khi thực hiện.'],
  ['dieu', 'Thời gian thực hiện và nhận máy'],
  ['li', 'Thời gian dự kiến hoàn thành: ………… ngày kể từ ngày tiếp nhận. Bên B thông báo cho Bên A khi sửa xong.'],
  ['li', 'Bên A nhận máy trong vòng ………… ngày kể từ ngày được thông báo; quá hạn, Bên B được tính phí lưu giữ theo mức ……………………………………'],
  ['dieu', 'Thanh toán'],
  ['li', 'Bên A thanh toán chi phí khi nhận máy (hoặc đặt cọc …………………… đồng khi tiếp nhận).']]
  .concat(hdThanhToanTK, [
  ['dieu', 'Bảo hành sau sửa chữa'],
  ['li', 'Hạng mục đã sửa chữa, linh kiện đã thay được bảo hành ………… tháng kể từ ngày giao lại máy.'],
  ['li', 'Không bảo hành đối với lỗi khác không thuộc hạng mục đã sửa, máy bị rơi vỡ, vào nước sau khi nhận lại, hoặc bị tháo mở, can thiệp bởi đơn vị khác.'],
  ['dieu', 'Dữ liệu và rủi ro'],
  ['li', 'Bên A tự sao lưu dữ liệu trước khi giao máy; Bên B không chịu trách nhiệm về dữ liệu bị mất trong quá trình sửa chữa, trừ trường hợp do lỗi cố ý của Bên B.'],
  ['li', 'Thiết bị đã từng vào nước, rơi vỡ hoặc bị can thiệp có thể phát sinh thêm lỗi khi mở máy; Bên B không bảo đảm khả năng phục hồi hoàn toàn trong các trường hợp này.']],
  hdViPham(), hdBatKhaKhang(), hdTranhChap(), hdHieuLuc(), [['ky', 'ĐẠI DIỆN BÊN A (KHÁCH HÀNG)', 'ĐẠI DIỆN BÊN B (ĐƠN VỊ DỊCH VỤ)']]));

// Loại hợp đồng có sẵn (ngành điện thoại). caiDat tạo file Google Docs mẫu cho từng loại rồi ghi vào trang MauHopDong; quản trị thêm/xóa loại ở đó.
const HD_LOAI_MAC_DINH = [
  { ten: 'Hợp đồng mua bán', moTa: 'Bán lẻ/bán sỉ điện thoại, phụ kiện: bảng hàng, giá, thanh toán, giao nhận, bảo hành.', mau: HD_MAU_MUA_BAN },
  { ten: 'Hợp đồng nguyên tắc', moTa: 'Khung cho khách mua thường xuyên: chính sách giá, thanh toán, công nợ; từng đơn mua theo phụ lục hoặc đơn hàng.', mau: HD_MAU_NGUYEN_TAC },
  { ten: 'Hợp đồng đại lý – phân phối', moTa: 'Đại lý/cộng tác viên nhận hàng bán lại: chiết khấu, công nợ, bảo hành, đổi trả.', mau: HD_MAU_DAI_LY },
  { ten: 'Hợp đồng thu cũ đổi mới', moTa: 'Mua lại máy cũ của khách (định giá, IMEI, xác nhận quyền sở hữu, xóa dữ liệu) để đổi máy mới.', mau: HD_MAU_THU_CU },
  { ten: 'Hợp đồng dịch vụ sửa chữa – bảo hành', moTa: 'Nhận máy sửa chữa/bảo hành: tình trạng máy, chi phí, thời gian, bảo hành sau sửa.', mau: HD_MAU_SUA_CHUA },
];

// Dựng nội dung mẫu vào file Google Docs mới
function dungMau_(doc, muc) {
  const body = doc.getBody(), A = DocumentApp.HorizontalAlignment;
  body.setMarginTop(57); body.setMarginBottom(57); body.setMarginLeft(85); body.setMarginRight(57); // 2cm trên/dưới/phải, 3cm trái (chuẩn văn bản hành chính)
  let dieu = 0;
  const them = (text, canh, dam, nghieng, thut) => {
    const p = body.appendParagraph(text);
    p.setAlignment(canh).setSpacingAfter(6);
    if (thut) p.setIndentStart(18);
    const t = p.editAsText();
    if (dam) t.setBold(true);
    if (nghieng) t.setItalic(true);
    return p;
  };
  muc.forEach(m => {
    const k = m[0];
    if (k === 'cb') them(m[1], A.CENTER, true);
    else if (k === 'c') them(m[1], A.CENTER);
    else if (k === 'tt') { const p = them(m[1], A.CENTER, true); p.editAsText().setFontSize(15); }
    else if (k === 'ci') them(m[1], A.JUSTIFY, false, true);
    else if (k === 'p') them(m[1], A.JUSTIFY);
    else if (k === 'li') them('- ' + m[1], A.JUSTIFY, false, false, true);
    else if (k === 'h') them(m[1], A.LEFT, true);
    else if (k === 'dieu') them('Điều ' + (++dieu) + '. ' + m[1], A.LEFT, true);
    else if (k === 'bl') them('', A.LEFT);
    else if (k === 'bang') them('{{BANGHANG}}', A.LEFT);
    else if (k === 'kv') { const p = them(m[1] + m[2], A.LEFT); p.editAsText().setBold(0, m[1].length - 1, true); }
    else if (k === 'ky') {
      const t = body.appendTable([[m[1], m[2]], ['(Ký, ghi rõ họ tên, đóng dấu)', '(Ký, ghi rõ họ tên, đóng dấu)']]);
      t.setBorderWidth(0);
      [0, 1].forEach(r => [0, 1].forEach(c => { const cell = t.getCell(r, c); cell.getChild(0).asParagraph().setAlignment(A.CENTER); if (r === 0) cell.editAsText().setBold(true); }));
    }
  });
  const dau = body.getChild(0); // đoạn trống có sẵn ở đầu file mới
  if (dau.getType() === DocumentApp.ElementType.PARAGRAPH && !dau.asParagraph().getText()) dau.asParagraph().removeFromParent();
  const kieu = {}; kieu[DocumentApp.Attribute.FONT_FAMILY] = 'Times New Roman'; kieu[DocumentApp.Attribute.FONT_SIZE] = 13;
  body.setAttributes(kieu);
}

// ===== Tạo file hợp đồng từ mẫu =====
const HD_TRONG = '………………';
function loiRieng_(msg) { return Object.assign(new Error(msg), { rieng: true }); }
function loiDocs_(e) { // việc gọi Google Docs/Drive hỏng: nói rõ cách xử lý thay vì để lộ lỗi kỹ thuật
  if (e && e.rieng) return e;
  const m = String((e && e.message) || e);
  if (/permission|authori[sz]ation|scope|quyền/i.test(m)) {
    return new Error('Script chưa được cấp quyền dùng Google Docs/Drive. Chủ script mở trình soạn thảo Apps Script, chạy hàm caiDat một lần và bấm Cho phép (xem HUONG_DAN.md), rồi thử lại.');
  }
  return new Error('Không làm được việc này với Google Docs/Drive: ' + m.replace(/^(Exception|Error):\s*/, ''));
}

function idTuLink_(link) {
  link = String(link || '').trim();
  const m = link.match(/\/d\/([a-zA-Z0-9_-]{20,})/) || link.match(/[?&]id=([a-zA-Z0-9_-]{20,})/);
  return m ? m[1] : /^[a-zA-Z0-9_-]{20,}$/.test(link) ? link : '';
}

// Thư mục Drive chứa mẫu và hợp đồng của cửa hàng hiện tại: "Hợp đồng - <tên cửa hàng>"
function thuMuc_() {
  const ten = 'Hợp đồng - ' + cuaHang_(CUR_SHOP).ten, p = PropertiesService.getScriptProperties(), k = 'hdFolder_' + CUR_SHOP, id = p.getProperty(k);
  if (id) { try { const f = DriveApp.getFolderById(id); if (!f.isTrashed()) return f; } catch (e) {} }
  const it = DriveApp.getFoldersByName(ten);
  const f = it.hasNext() ? it.next() : DriveApp.createFolder(ten);
  p.setProperty(k, f.getId());
  return f;
}

/** Tạo file Google Docs mẫu cho các loại hợp đồng mặc định còn thiếu (chỉ một loại nếu có tên). Trả về tên các loại vừa tạo. */
function taoMauMacDinh_(chiLoai) {
  const moi = [];
  HD_LOAI_MAC_DINH.forEach(l => {
    if (chiLoai && l.ten !== chiLoai) return;
    if (readTable_('MauHopDong').some(m => String(m.LoaiHD) === l.ten)) return;
    const ten = 'MẪU - ' + l.ten + ' - ' + cuaHang_(CUR_SHOP).ten;
    const doc = DocumentApp.create(ten);
    dungMau_(doc, l.mau);
    doc.saveAndClose();
    DriveApp.getFileById(doc.getId()).moveTo(thuMuc_());
    withLock_(() => {
      if (readTable_('MauHopDong').some(m => String(m.LoaiHD) === l.ten)) { try { DriveApp.getFileById(doc.getId()).setTrashed(true); } catch (e) {} return; } // người khác vừa tạo xong
      const sh = sheet_('MauHopDong');
      sh.appendRow(toRow_(sh, { LoaiHD: l.ten, LinkMau: doc.getUrl(), MoTa: l.moTa, NgayTao: now_() }));
      moi.push(l.ten);
    });
  });
  return moi;
}

function mauHopDong_(loai) {
  let m = readTable_('MauHopDong').find(x => String(x.LoaiHD) === String(loai));
  if (!m && HD_LOAI_MAC_DINH.some(l => l.ten === loai)) { taoMauMacDinh_(loai); m = readTable_('MauHopDong').find(x => String(x.LoaiHD) === String(loai)); }
  if (!m) throw loiRieng_('Loại hợp đồng "' + loai + '" chưa có file mẫu. Quản trị vào Cài đặt → Mẫu hợp đồng để thêm.');
  const id = idTuLink_(m.LinkMau);
  if (!id) throw loiRieng_('Link file mẫu của "' + loai + '" không hợp lệ. Quản trị sửa lại trong Cài đặt → Mẫu hợp đồng.');
  return id;
}

// Giá trị các biến {{…}} của một hợp đồng
function bienHopDong_(hd) {
  const c = cuaHang_(CUR_SHOP).congTy;
  const t = v => { v = String(v == null ? '' : v).replace(/\{\{|\}\}/g, '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, ' ').trim().slice(0, 500); return v || HD_TRONG; };
  const so = n => String(Math.round(+n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const ngay = s => /^\d{4}-\d{2}-\d{2}/.test(String(s)) ? String(s).slice(8, 10) + '/' + String(s).slice(5, 7) + '/' + String(s).slice(0, 4) : '';
  const ngayDai = s => /^\d{4}-\d{2}-\d{2}/.test(String(s)) ? 'ngày ' + String(s).slice(8, 10) + ' tháng ' + String(s).slice(5, 7) + ' năm ' + String(s).slice(0, 4) : 'ngày ….. tháng ….. năm …….';
  const thoiHan = hd.NgayHieuLuc && hd.NgayHetHan ? 'từ ngày ' + ngay(hd.NgayHieuLuc) + ' đến hết ngày ' + ngay(hd.NgayHetHan)
    : hd.NgayHieuLuc ? 'kể từ ngày ' + ngay(hd.NgayHieuLuc) : hd.NgayHetHan ? 'kể từ ngày ký đến hết ngày ' + ngay(hd.NgayHetHan) : 'kể từ ngày ký';
  const nh = NGAN_HANG.find(b => b[0] === c.qrNganHang);
  return {
    MAHOPDONG: t(hd.SoHD), LOAIHOPDONG: t(hd.LoaiHD), THOIGIANTAO: Utilities.formatDate(new Date(), tz_(), 'dd/MM/yyyy HH:mm'),
    NGAYKY: t(ngay(hd.Ngay)), NGAYKYDAI: ngayDai(hd.Ngay), NGAYHIEULUC: t(ngay(hd.NgayHieuLuc)), NGAYHETHAN: t(ngay(hd.NgayHetHan)), THOIHAN: thoiHan,
    SODONHANG: t(hd.SoDH), NGUOIPHUTRACH: t(hd.NguoiPhuTrach),
    TENDOANHNGHIEP: t(hd.TenDN), DIACHIDOANHNGHIEP: t(hd.DiaChi), VANPHONGGIAODICH: t(hd.VanPhongGD), MASOTHUE: t(hd.MST), NGUOIDAIDIEN: t(hd.NguoiDaiDien),
    CHUCVU: t(hd.ChucVu), DIENTHOAI: t(hd.SDT), SOTAIKHOAN: t(hd.SoTK), NGANHANG: t(hd.NganHang),
    B_TEN: t(c.ten), B_DIACHI: t((c.diaChi || []).join('; ')), B_MST: t(c.mst), B_DAIDIEN: t(c.chuHo), B_CHUCVU: t(c.kyTen), B_LIENHE: t(c.lienHe),
    B_STK: t(c.qrSoTK), B_NGANHANG: t(nh ? nh[1] : ''), B_CHUTK: t(c.qrChuTK), B_BAOHANH: t(c.baoHanhThang),
    CONGTIENHANG: so(hd.TienHang), VAT: String(+hd.VAT || 0), TIENVAT: so(hd.TienVAT), TONGTHANHTOAN: so(hd.TongCong), BANGCHU: t(hd.BangChu), GHICHU: t(hd.GhiChu),
  };
}

// Ô bảng hàng: tiêu đề, các dòng hàng, cộng tiền hàng, thuế, tổng. Không có dòng hàng thì để trống (null).
function bangHang_(hd, lines) {
  if (!lines.length) return null;
  const so = n => String(Math.round(+n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const rows = [['STT', 'Tên hàng hóa, dịch vụ', 'ĐVT', 'Số lượng', 'Đơn giá (đồng)', 'Thành tiền (đồng)']];
  lines.forEach((l, i) => rows.push([String(i + 1), String(l.TenHang), String(l.DVT || ''), String(+l.SoLuong || 0).replace('.', ','), so(l.DonGia), so(l.ThanhTien)]));
  rows.push(['', 'Cộng tiền hàng', '', '', '', so(hd.TienHang)]);
  rows.push(['', 'Thuế GTGT (' + (+hd.VAT || 0) + '%)', '', '', '', so(hd.TienVAT)]);
  rows.push(['', 'Tổng thanh toán', '', '', '', so(hd.TongCong)]);
  return rows;
}

// Thay một biến. Giá trị chứa \ hoặc $ thì không đi qua replaceText (hàm này hiểu $1 là nhóm bắt) mà chèn trực tiếp.
function thayBien_(body, ten, giaTri) {
  const mau = '\\{\\{' + ten + '\\}\\}';
  if (!/[\\$]/.test(giaTri)) { body.replaceText(mau, giaTri); return; }
  for (let i = 0, r = body.findText(mau); r && i < 100; i++, r = body.findText(mau)) {
    const t = r.getElement().asText(), a = r.getStartOffset();
    t.deleteText(a, r.getEndOffsetInclusive());
    t.insertText(a, giaTri);
  }
}

// Điền dữ liệu vào bản sao của mẫu. Trả về danh sách biến còn sót trong mẫu mà app không biết (để báo cho người dùng).
function dienMau_(doc, bien, bang) {
  const body = doc.getBody();
  const vitri = body.findText('\\{\\{BANGHANG\\}\\}');
  if (vitri) {
    let idx = -1;
    try { idx = body.getChildIndex(vitri.getElement().getParent()); } catch (e) {} // biến nằm trong ô bảng hoặc chỗ lạ: bỏ qua việc chèn bảng
    body.replaceText('\\{\\{BANGHANG\\}\\}', bang ? '' : '(Theo báo giá, đơn đặt hàng hoặc phụ lục từng lần)');
    if (bang && idx >= 0) {
      const A = DocumentApp.HorizontalAlignment, t = body.insertTable(idx, bang);
      const kieu = {}; kieu[DocumentApp.Attribute.FONT_FAMILY] = 'Times New Roman'; kieu[DocumentApp.Attribute.FONT_SIZE] = 12;
      t.setAttributes(kieu); t.setBorderWidth(1);
      [0, 1, 2, 3, 4, 5].forEach(c => t.setColumnWidth(c, [30, 175, 40, 50, 80, 85][c]));
      bang.forEach((r, i) => r.forEach((_, c) => {
        const cell = t.getCell(i, c);
        if (c >= 3) cell.getChild(0).asParagraph().setAlignment(A.RIGHT);
        if (i === 0 || i >= bang.length - 3) cell.editAsText().setBold(true);
      }));
    }
  }
  Object.keys(bien).forEach(k => thayBien_(body, k, bien[k]));
  const con = [];
  for (let r = body.findText('\\{\\{[A-Z0-9_]+\\}\\}'), i = 0; r && i < 20; r = body.findText('\\{\\{[A-Z0-9_]+\\}\\}', r), i++) {
    con.push(r.getElement().asText().getText().substring(r.getStartOffset(), r.getEndOffsetInclusive() + 1));
  }
  return con;
}

const tenFile_ = hd => ('Hợp đồng ' + hd.SoHD + ' - ' + hd.TenDN).replace(/[\\\/:*?"<>|\n\r]/g, '-').slice(0, 150);

/** Tạo (hoặc tạo lại) file Google Docs của hợp đồng từ mẫu của loại hợp đồng. File cũ chuyển vào thùng rác Drive. */
function taoFileHopDong(token, soHD) {
  const user = user_(token);
  const hd = findObj_('HopDong', soHD);
  if (!hd) throw new Error('Không tìm thấy hợp đồng ' + soHD + '.');
  const lines = dongHopDong_(soHD);
  let file, conSot;
  try {
    file = DriveApp.getFileById(mauHopDong_(hd.LoaiHD)).makeCopy(tenFile_(hd), thuMuc_());
    const doc = DocumentApp.openById(file.getId());
    conSot = dienMau_(doc, bienHopDong_(hd), bangHang_(hd, lines));
    doc.saveAndClose();
  } catch (e) {
    if (file) { try { file.setTrashed(true); } catch (x) {} }
    throw loiDocs_(e);
  }
  return withLock_(() => {
    const sh = sheet_('HopDong'), r = findRow_(sh, soHD);
    if (!r) { try { file.setTrashed(true); } catch (e) {} throw new Error('Hợp đồng ' + soHD + ' đã bị xóa trong lúc tạo file.'); }
    const cu = rowObj_(sh, r);
    const moi = Object.assign({}, cu, { FileId: file.getId(), LinkFile: file.getUrl(), NgayFile: now_(), FileCu: '' });
    writeRow_(sh, r, moi);
    if (cu.FileId) { try { DriveApp.getFileById(cu.FileId).setTrashed(true); } catch (e) {} }
    log_(user, (cu.FileId ? 'Tạo lại' : 'Tạo') + ' file hợp đồng', soHD, hd.LoaiHD);
    return { doc: moi, conSot: Array.from(new Set(conSot)) };
  });
}

/** PDF của file hợp đồng (base64) để trình duyệt tải về. Hợp đồng phải đã có file. */
function taiPdfHopDong(token, soHD) {
  user_(token);
  const hd = findObj_('HopDong', soHD);
  if (!hd) throw new Error('Không tìm thấy hợp đồng ' + soHD + '.');
  if (!hd.FileId) throw new Error('Hợp đồng chưa có file. Bấm Tạo file hợp đồng trước.');
  try {
    const blob = DriveApp.getFileById(hd.FileId).getAs(MimeType.PDF);
    return { ten: tenFile_(hd) + '.pdf', base64: Utilities.base64Encode(blob.getBytes()) };
  } catch (e) { throw loiDocs_(e); }
}

/**
 * Tạo hợp đồng mới từ một hợp đồng có sẵn: giữ bên A, hàng hóa, VAT; đổi sang loại mới nếu có; ngày ký là hôm nay, ngày hiệu lực/hết hạn để trống.
 * taoFile = tạo luôn file Docs. Gọi từng hợp đồng một (tạo hàng loạt do giao diện lặp), nên một hợp đồng lỗi không ảnh hưởng hợp đồng khác
 * và mỗi lần gọi ngắn, không chạm giới hạn thời gian của Apps Script. Lỗi tạo file không làm mất hợp đồng vừa lập (trả về loiFile).
 */
function nhanBanHopDong(token, soNguon, loaiMoi, taoFile) {
  user_(token);
  const goc = findObj_('HopDong', soNguon);
  if (!goc) throw new Error('Không tìm thấy hợp đồng ' + soNguon + '.');
  const doc = { LoaiHD: String(loaiMoi || '').trim() || goc.LoaiHD, Ngay: now_().slice(0, 10), TrangThai: HD_TRANG_THAI[0], VAT: goc.VAT, NguoiPhuTrach: goc.NguoiPhuTrach,
    SoDH: goc.SoDH && findObj_('DonHang', goc.SoDH) ? goc.SoDH : '', lines: dongHopDong_(soNguon) };
  ['MaKH', 'TenDN', 'DiaChi', 'VanPhongGD', 'MST', 'NguoiDaiDien', 'ChucVu', 'SDT', 'SoTK', 'NganHang'].forEach(k => { doc[k] = goc[k]; });
  const kq = { nguon: soNguon, doc: luuHopDong(token, doc).doc };
  if (taoFile) {
    try { const f = taoFileHopDong(token, kq.doc.SoHD); kq.doc = f.doc; kq.conSot = f.conSot; }
    catch (e) { kq.loiFile = String((e && e.message) || e); }
  }
  delete kq.doc.lines;
  return kq;
}

/**
 * Chạy tay trong trình soạn thảo Apps Script (chọn hàm kiemTraTaoHopDong → Chạy), sau khi đã chạy caiDat một lần.
 * Tạo một hợp đồng thử từ mẫu mua bán, đọc lại file bằng chính Google Docs để kiểm tra từng bước, xuất PDF rồi chuyển file thử vào thùng rác.
 * Không ghi gì vào Sheet. Kết quả hiện ở Nhật ký thực thi; trả về { ok, kq: [[tên bước, đạt, chi tiết]] }.
 * Dùng để chắc các hàm Docs/Drive chạy đúng trên Google thật (bản chạy thử trên máy chỉ là giả lập).
 */
function kiemTraTaoHopDong() {
  CUR_SHOP = SHOP_MAC_DINH;
  const kq = [], ghi = (ten, ok, ct) => { kq.push([ten, !!ok, ct || '']); Logger.log((ok ? 'ĐẠT  ' : 'LỖI  ') + ten + (ct ? ' – ' + ct : '')); };
  const lines = [{ STT: 1, TenHang: 'iPhone 16 Pro Max 256GB', DVT: 'Máy', SoLuong: 2, DonGia: 28200000, ThanhTien: 56400000 }, { STT: 2, TenHang: 'Ốp lưng', DVT: 'Cái', SoLuong: 5, DonGia: 150000, ThanhTien: 750000 }];
  const hd = { SoHD: 'KIEMTRA-001', Ngay: now_().slice(0, 10), LoaiHD: HD_LOAI_MAC_DINH[0].ten, TenDN: 'Công ty $1 & \\2 "Kiểm tra" Ơ', DiaChi: '12 Lê Lợi', MST: '', NguoiDaiDien: 'Nguyễn Văn A', ChucVu: 'Giám đốc',
    VAT: 10, TienHang: 57150000, TienVAT: 5715000, TongCong: 62865000, BangChu: docTienChu_(62865000), GhiChu: 'Ghi chú $& thử' };
  let file = null;
  try {
    const mau = DriveApp.getFileById(mauHopDong_(hd.LoaiHD));
    file = mau.makeCopy('KIEMTRA - ' + tenFile_(hd), thuMuc_());
    ghi('Sao chép file mẫu vào thư mục Drive', true, file.getName());
    const doc = DocumentApp.openById(file.getId());
    const conSot = dienMau_(doc, bienHopDong_(hd), bangHang_(hd, lines));
    doc.saveAndClose();
    const body = DocumentApp.openById(file.getId()).getBody(), vb = body.getText();
    ghi('Mọi biến {{…}} đã được thay', conSot.length === 0 && !/\{\{[A-Z0-9_]+\}\}/.test(vb), conSot.join(', '));
    ghi('Tên khách có $1, \\2, dấu nháy giữ nguyên', vb.indexOf(hd.TenDN) >= 0 && vb.indexOf(hd.GhiChu) >= 0);
    ghi('Số tiền bằng chữ và tên cửa hàng có trong file', vb.indexOf(hd.BangChu) >= 0 && vb.indexOf(cuaHang_(CUR_SHOP).congTy.ten) >= 0);
    const bang = body.getTables().filter(t => t.getNumRows() === 6 && t.getRow(0).getNumCells() === 6);
    ghi('Bảng hàng hóa được chèn (6 cột, 2 dòng hàng + tiêu đề + 3 dòng tổng)', bang.length === 1, 'số bảng khớp: ' + bang.length);
    ghi('Bảng hàng có đúng thành tiền', bang.length === 1 && bang[0].getCell(1, 5).getText() === '56.400.000' && bang[0].getCell(5, 5).getText() === '62.865.000');
    const pdf = file.getAs(MimeType.PDF).getBytes();
    ghi('Xuất PDF', pdf.length > 1000 && pdf[0] === 37 && pdf[1] === 80 && pdf[2] === 68 && pdf[3] === 70, pdf.length + ' byte');
    ghi('File mẫu gốc không bị sửa', DocumentApp.openById(mau.getId()).getBody().getText().indexOf('{{TENDOANHNGHIEP}}') >= 0);
  } catch (e) { ghi('Chạy được các bước trên', false, String((e && e.message) || e)); }
  finally { if (file) { try { file.setTrashed(true); } catch (e) {} } }
  const ok = kq.every(x => x[1]);
  Logger.log(ok ? 'TẤT CẢ ĐẠT: tạo hợp đồng từ mẫu chạy đúng trên Google. File thử đã vào thùng rác Drive.' : 'CÓ LỖI: xem các dòng LỖI ở trên (chép lại nhật ký này để được hỗ trợ).');
  return { ok: ok, kq: kq };
}

// ===== Quản lý mẫu (quản trị) =====
function trangMau_() { return { mauHD: readTable_('MauHopDong'), loaiHD: loaiHopDong_() }; }

/** Thêm hoặc đổi file mẫu của một loại hợp đồng: dán link file Google Docs (tài khoản chạy script phải mở được file). */
function luuMauHopDong(token, m) {
  const user = user_(token, true);
  const loai = String((m && m.LoaiHD) || '').trim().slice(0, 80);
  if (!loai) throw new Error('Nhập tên loại hợp đồng.');
  const id = idTuLink_(m.LinkMau);
  if (!id) throw new Error('Dán link file Google Docs mẫu (dạng https://docs.google.com/document/d/…).');
  try {
    const f = DriveApp.getFileById(id);
    if (f.getMimeType() !== MimeType.GOOGLE_DOCS) throw loiRieng_('File này không phải Google Docs (không dùng được file Word .docx hay PDF; hãy mở bằng Google Docs rồi chọn Tệp → Lưu dưới dạng Google Docs).');
    // Chỉ nhận mẫu nằm trong thư mục của cửa hàng: nếu không, quản trị trong app dán link tài liệu riêng của chủ Google rồi tạo hợp đồng + tải PDF là đọc được nội dung tài liệu đó
    const thu = thuMuc_(), cha = f.getParents();
    let trong = false;
    while (cha.hasNext()) { if (cha.next().getId() === thu.getId()) trong = true; }
    if (!trong) throw loiRieng_('File mẫu phải nằm trong thư mục "' + thu.getName() + '" trên Google Drive: mở Drive, kéo file vào thư mục đó rồi lưu lại.');
  } catch (e) { throw (e && e.rieng) ? e : new Error('Không mở được file mẫu: ' + (loiDocs_(e).message)); }
  withLock_(() => {
    const sh = sheet_('MauHopDong'), r = findRow_(sh, loai), cu = r ? rowObj_(sh, r) : null;
    const o = { LoaiHD: loai, LinkMau: 'https://docs.google.com/document/d/' + id + '/edit', MoTa: String((m && m.MoTa) || (cu && cu.MoTa) || '').trim().slice(0, 300), NgayTao: (cu && cu.NgayTao) || now_() };
    if (r) writeRow_(sh, r, o); else sh.appendRow(toRow_(sh, o));
    log_(user, (cu ? 'Sửa' : 'Thêm') + ' mẫu hợp đồng', loai, o.LinkMau);
  });
  return trangMau_();
}

function xoaMauHopDong(token, loai) {
  const user = user_(token, true);
  withLock_(() => { deleteWhere_('MauHopDong', String(loai)); log_(user, 'Xóa mẫu hợp đồng', String(loai)); });
  return trangMau_();
}

/** Tạo lại các file mẫu mặc định còn thiếu (đã xóa hoặc chưa có). */
function taoMauMacDinh(token) {
  const user = user_(token, true);
  let moi;
  try { moi = taoMauMacDinh_(); } catch (e) { throw loiDocs_(e); }
  if (moi.length) log_(user, 'Tạo mẫu hợp đồng mặc định', moi.join(', '));
  return Object.assign(trangMau_(), { moi: moi });
}

function bienHopDongMau(token) { user_(token); return HD_BIEN; }
