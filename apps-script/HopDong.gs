/**
 * Hợp đồng: lập, lưu, tạo file Google Docs từ mẫu, tải PDF, quản lý mẫu theo loại hợp đồng.
 * File này dùng chung phạm vi với Code.gs (Apps Script gộp mọi file .gs): dùng sheet_, readTable_, withLock_, log_, user_… ở đó.
 * Bên A = khách hàng, bên B = cửa hàng. Quy trình: luuHopDong (chỉ ghi Sheet) → taoFileHopDong (sao chép mẫu Docs, thay biến) → taiPdfHopDong.
 */

// ===== Dữ liệu hợp đồng =====
// Trạng thái lưu: HD_TRANG_THAI; "Sắp hết hạn"/"Đã hết hạn" tính từ NgayHetHan, không lưu.
const HD_TRANG_THAI = ['Soạn thảo', 'Đang hiệu lực', 'Tạm dừng', 'Hoàn thành'];
const HD_DA_KY = ['Đang hiệu lực', 'Hoàn thành', 'Tạm dừng']; // đã ký (mọi trạng thái trừ Soạn thảo): nhân viên không đổi hàng và số tiền, không đưa về Soạn thảo; chỉ quản trị
// Các cột có mặt trong file hợp đồng: đổi một trong số này (hoặc dòng hàng) sau khi tạo file thì file đã cũ (FileCu = '1')
const HD_TRONG_FILE = ['Ngay', 'LoaiHD', 'SoDH', 'NguoiPhuTrach', 'TenDN', 'DiaChi', 'VanPhongGD', 'MST', 'SoCCCD', 'CCCDCap', 'NguoiDaiDien', 'ChucVu', 'SDT', 'SoTK', 'NganHang', 'NgayHieuLuc', 'NgayHetHan', 'BaoTruocNgay', 'TuGiaHan', 'ThangGiaHan', 'VAT', 'GhiChu'];
const HD_SAP = 30; // báo "sắp hết hạn" khi còn chừng này ngày (hoặc thời hạn báo trước + 14 ngày nếu dài hơn)

function loaiHopDong_(mau) { // mau = các dòng MauHopDong đã đọc sẵn (đỡ đọc Sheet lại)
  const ds = (mau || readTable_('MauHopDong')).map(m => String(m.LoaiHD)).filter(Boolean);
  return ds.length ? ds : HD_LOAI_MAC_DINH.map(l => l.ten);
}

function layHopDong(token, soHD) {
  user_(token);
  return { lines: dongHopDong_(soHD), lich: lichHopDong_(soHD) };
}
// Nhân viên chỉ cần biết hợp đồng đã có file hay chưa (không mở được Drive): giấu mã và link file
function hdChoUser_(user, hd) { return user.vaiTro === 'admin' ? hd : Object.assign({}, hd, { FileId: hd.FileId ? '1' : '', LinkFile: '', KyFileId: hd.KyFileId ? '1' : '' }); }
// Nội dung hợp đồng xuất hiện trong file Docs (các trường HD_TRONG_FILE + dòng hàng): so hai bản để biết file có cũ không
function noiDungHD_(hd, lines, lich) {
  return JSON.stringify([HD_TRONG_FILE.map(k => String(hd[k] == null ? '' : hd[k])), lines.map(l => [String(l.MaHH), String(l.TenHang), String(l.DVT), +l.SoLuong, +l.DonGia, String(l.IMEI || '')]),
    (lich || []).map(r => [String(r.Nhan), String(r.NgayDen), +r.SoTien])]);
}
function dongHopDong_(soHD) {
  return readTable_('HopDongCT').filter(l => String(l.SoHD) === String(soHD)).sort((a, b) => a.STT - b.STT);
}

const ngayHopLe_ = v => { v = String(v == null ? '' : v).trim().slice(0, 10); return /^\d{4}-\d{2}-\d{2}$/.test(v) && new Date(v + 'T00:00:00Z').toISOString().slice(0, 10) === v ? v : ''; };
const dmyHD_ = s => /^\d{4}-\d{2}-\d{2}/.test(String(s)) ? String(s).slice(8, 10) + '/' + String(s).slice(5, 7) + '/' + String(s).slice(0, 4) : '';

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
    SoCCCD: str(doc.SoCCCD, 20), CCCDCap: str(doc.CCCDCap, 120),
    NgayHieuLuc: ngay(doc.NgayHieuLuc, 'Ngày hiệu lực'), NgayHetHan: ngay(doc.NgayHetHan, 'Ngày hết hạn'), NguoiPhuTrach: str(doc.NguoiPhuTrach, 60),
    BaoTruocNgay: Math.min(365, Math.max(0, Math.round(+doc.BaoTruocNgay || 0))), TuGiaHan: doc.TuGiaHan === '1' || doc.TuGiaHan === true ? '1' : '',
    TrangThai: HD_TRANG_THAI.includes(doc.TrangThai) ? doc.TrangThai : HD_TRANG_THAI[0], VAT: Math.min(100, Math.max(0, +doc.VAT || 0)), GhiChu: str(doc.GhiChu, 1000),
  };
  head.ThangGiaHan = Math.min(120, Math.max(0, Math.round(+doc.ThangGiaHan || 0))) || (head.TuGiaHan ? 12 : 0); // tự gia hạn mà chưa nhập số tháng thì 12 tháng
  if (!head.LoaiHD) throw new Error('Chọn loại hợp đồng.');
  if (!head.TenDN) throw new Error('Nhập tên khách hàng (bên A).');
  if (head.NgayHieuLuc && head.NgayHetHan && head.NgayHetHan < head.NgayHieuLuc) throw new Error('Ngày hết hạn phải sau ngày hiệu lực.');
  const lines = (doc.lines || []).filter(l => String(l.TenHang || '').trim()).slice(0, 200).map((l, i) => {
    const o = { STT: i + 1, MaHH: str(l.MaHH, 20), TenHang: str(l.TenHang, 200), DVT: str(l.DVT, 30), SoLuong: +l.SoLuong || 0, DonGia: Math.round(+l.DonGia || 0) };
    if (o.SoLuong <= 0) throw new Error('Dòng ' + o.STT + ': số lượng phải lớn hơn 0.');
    if (o.DonGia < 0) throw new Error('Dòng ' + o.STT + ': đơn giá không được âm.');
    const im = imeiList_(l.IMEI), sai = im.find(x => !/^[A-Z0-9][A-Z0-9._/-]{3,39}$/.test(x));
    if (sai) throw new Error('Dòng ' + o.STT + ': IMEI/serial "' + sai + '" không hợp lệ (4–40 chữ, số).');
    o.IMEI = im.join(', ');
    o.ThanhTien = Math.round(o.SoLuong * o.DonGia);
    return o;
  });
  head.IMEI = lines.map(l => l.IMEI).filter(Boolean).join(', ').slice(0, 1000); // gộp để tìm hợp đồng theo IMEI
  head.TienHang = lines.reduce((t, l) => t + l.ThanhTien, 0);
  head.TienVAT = Math.round(head.TienHang * head.VAT / 100);
  head.TongCong = head.TienHang + head.TienVAT;
  head.BangChu = docTienChu_(head.TongCong);
  head.NgaySua = now_();
  return withLock_(() => {
    const old = head.SoHD ? findObj_('HopDong', head.SoHD) : null;
    if (head.SoHD && !old) throw new Error('Không tìm thấy hợp đồng ' + head.SoHD + ' (có thể đã bị xóa).');
    if (head.SoDH && !findObj_('DonHang', head.SoDH)) throw new Error('Không tìm thấy đơn hàng ' + head.SoDH + '.');
    if (!(old && old.LoaiHD === head.LoaiHD) && !loaiHopDong_().includes(head.LoaiHD)) throw new Error('Loại hợp đồng "' + head.LoaiHD + '" chưa có mẫu. Chọn loại khác, hoặc quản trị thêm ở Cài đặt → Mẫu hợp đồng.');
    const khoa = ls => JSON.stringify(ls.map(l => [String(l.MaHH), String(l.TenHang), String(l.DVT), +l.SoLuong, +l.DonGia, String(l.IMEI || '')]));
    const cu = old ? dongHopDong_(head.SoHD) : [];
    if (old && old.KyFileId && noiDungKy_(old, cu, lichHopDong_(head.SoHD)) !== noiDungKy_(head, lines, lichHopDong_(head.SoHD))) {
      throw new Error('Hợp đồng đã có chữ ký điện tử: sửa bên A, hàng hóa, số tiền hoặc điều khoản sẽ làm chữ ký mất giá trị. Quản trị bấm "Hủy chữ ký" trước nếu thật sự cần sửa (rồi cho khách ký lại).');
    }
    if (old && HD_DA_KY.includes(old.TrangThai) && user.vaiTro !== 'admin') {
      if (head.TrangThai === HD_TRANG_THAI[0]) throw new Error('Hợp đồng đã ký không đưa về Soạn thảo được (chỉ quản trị). Cần thay đổi thì nhân bản thành hợp đồng mới.');
      if (khoa(cu) !== khoa(lines) || +old.VAT !== head.VAT) throw new Error('Hợp đồng đã hiệu lực: chỉ quản trị được sửa hàng hóa và số tiền. Có thay đổi thì nhân bản thành hợp đồng mới.');
    }
    if (!old) { head.NguoiTao = user.ten; head.NgayTao = head.NgaySua; }
    // File Docs đã tạo mà nội dung hợp đồng vừa đổi thì đánh dấu file cũ (giao diện sẽ tạo lại trước khi tải PDF)
    const doiNoiDung = old && noiDungHD_(old, cu) !== noiDungHD_(head, lines);
    head.FileCu = old && old.FileId && (doiNoiDung || old.FileCu === '1') ? '1' : '';
    upsert_('HopDong', head, () => nextSo_('HopDong', 'HD', head.Ngay), ['NguoiTao', 'NgayTao', 'FileId', 'LinkFile', 'NgayFile', 'KyFileId', 'NguoiKy', 'NgayKyDT', 'MaXacThuc']);
    deleteWhere_('HopDongCT', head.SoHD);
    if (lines.length) {
      const sh = sheet_('HopDongCT');
      const rows = lines.map(l => toRow_(sh, Object.assign({ SoHD: head.SoHD }, l)));
      sh.getRange(sh.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
    }
    log_(user, (old ? 'Sửa' : 'Thêm') + ' hợp đồng', head.SoHD, head.TenDN + ' · ' + head.LoaiHD + ' · ' + head.TongCong + ' đ');
    head.lines = lines;
    return { doc: hdChoUser_(user, head) };
  });
}

function xoaHopDong(token, soHD) {
  const user = user_(token, true);
  withLock_(() => {
    const hd = findObj_('HopDong', soHD);
    if (!hd) throw new Error('Không tìm thấy hợp đồng ' + soHD + '.');
    if (lichHopDong_(soHD).some(r => r.SoPT)) throw new Error('Hợp đồng đã ghi nhận thu tiền theo lịch thanh toán. Hủy các phiếu thu đó trước (Lịch thanh toán → Hủy thu) rồi mới xóa.');
    deleteWhere_('HopDong', soHD);
    deleteWhere_('HopDongCT', soHD);
    deleteWhere_('HopDongLich', soHD);
    if (hd.FileId) { try { DriveApp.getFileById(hd.FileId).setTrashed(true); } catch (e) {} } // vào thùng rác Drive, còn khôi phục được
    if (hd.KyFileId) { try { DriveApp.getFileById(hd.KyFileId).setTrashed(true); } catch (e) {} }
    log_(user, 'Xóa hợp đồng', soHD, hd.TenDN + ' · ' + hd.LoaiHD);
  });
}

// ===== Lịch thanh toán / trả góp =====
// Mỗi đợt một dòng ở trang HopDongLich. Ghi nhận thu một đợt = tạo phiếu thu gắn với đơn hàng của hợp đồng (công nợ tự khớp) và lưu số phiếu vào đợt.
const HD_DOT_TOI_DA = 36;
function lichHopDong_(soHD) {
  return readTable_('HopDongLich').filter(r => String(r.SoHD) === String(soHD)).sort((a, b) => a.Dot - b.Dot);
}
function timDongLich_(soHD, dot) {
  const sh = sheet_('HopDongLich'), h = headers_(sh), n = sh.getLastRow();
  if (n >= 2) {
    const v = sh.getRange(2, 1, n - 1, h.length).getValues(), a = h.indexOf('SoHD'), b = h.indexOf('Dot');
    for (let i = 0; i < v.length; i++) if (String(v[i][a]) === String(soHD) && +v[i][b] === +dot) return { sh: sh, r: i + 2 };
  }
  return { sh: sh, r: 0 };
}

/**
 * Lưu toàn bộ lịch thanh toán của hợp đồng (thay thế lịch cũ). Đợt đã thu (có SoPT) phải gửi lại nguyên vẹn và không bỏ được;
 * hợp đồng đã ký thì nhân viên không đổi các đợt chưa thu (chỉ quản trị). Trả về lịch đã lưu (đánh số lại theo ngày đến hạn).
 */
function luuLichHopDong(token, soHD, rows) {
  const user = user_(token);
  rows = Array.isArray(rows) ? rows : [];
  if (rows.length > HD_DOT_TOI_DA) throw new Error('Tối đa ' + HD_DOT_TOI_DA + ' đợt thanh toán.');
  return withLock_(() => {
    const hd = findObj_('HopDong', soHD);
    if (!hd) throw new Error('Không tìm thấy hợp đồng ' + soHD + '.');
    const cu = lichHopDong_(soHD), daThu = cu.filter(r => r.SoPT), dung = {};
    const moi = rows.map((r, i) => {
      if (r.SoPT) {
        const g = daThu.find(x => String(x.SoPT) === String(r.SoPT));
        if (!g || dung[g.SoPT]) throw new Error('Đợt ' + (i + 1) + ': không khớp với đợt đã thu tiền đang lưu.');
        dung[g.SoPT] = 1;
        return Object.assign({}, g);
      }
      const ngay = ngayHopLe_(r.NgayDen), soTien = Math.round(+r.SoTien || 0);
      if (!ngay) throw new Error('Đợt ' + (i + 1) + ': ngày đến hạn không hợp lệ.');
      if (soTien <= 0) throw new Error('Đợt ' + (i + 1) + ': số tiền phải lớn hơn 0.');
      return { SoHD: soHD, Nhan: String(r.Nhan || '').trim().slice(0, 60) || 'Đợt ' + (i + 1), NgayDen: ngay, SoTien: soTien, SoPT: '', NgayThu: '' };
    });
    if (daThu.some(g => !dung[g.SoPT])) throw new Error('Không bỏ được đợt đã thu tiền. Hủy phiếu thu của đợt đó trước (quản trị).');
    const chuaThu = ls => JSON.stringify(ls.filter(x => !x.SoPT).map(x => [String(x.Nhan), String(x.NgayDen), +x.SoTien]));
    if (hd.KyFileId && chuaThu(cu) !== chuaThu(moi)) throw new Error('Hợp đồng đã có chữ ký điện tử: đổi lịch thanh toán làm chữ ký mất giá trị. Quản trị hủy chữ ký trước nếu thật sự cần đổi.');
    if (user.vaiTro !== 'admin' && HD_DA_KY.includes(hd.TrangThai) && chuaThu(cu) !== chuaThu(moi)) throw new Error('Hợp đồng đã hiệu lực: chỉ quản trị được đổi lịch thanh toán.');
    moi.sort((a, b) => String(a.NgayDen).localeCompare(String(b.NgayDen)) || (a.SoPT ? -1 : 1)).forEach((r, i) => { r.Dot = i + 1; });
    deleteWhere_('HopDongLich', soHD);
    if (moi.length) {
      const sh = sheet_('HopDongLich'), out = moi.map(r => toRow_(sh, r));
      sh.getRange(sh.getLastRow() + 1, 1, out.length, out[0].length).setValues(out);
    }
    const khoa = ls => JSON.stringify(ls.map(x => [String(x.Nhan), String(x.NgayDen), +x.SoTien]));
    if (hd.FileId && khoa(cu) !== khoa(moi)) { // lịch có trong file nên file cũ
      const sh = sheet_('HopDong'); writeRow_(sh, findRow_(sh, soHD), Object.assign({}, hd, { FileCu: '1' }));
    }
    log_(user, 'Sửa lịch thanh toán', soHD, moi.length + ' đợt · tổng ' + moi.reduce((t, r) => t + (+r.SoTien || 0), 0) + ' đ');
    return { lich: moi };
  });
}

/** Ghi nhận khách đã trả một đợt: tạo phiếu thu theo đơn hàng của hợp đồng và đánh dấu đợt đã thu. Nhân viên làm được. */
function thuDotHopDong(token, soHD, dot, tt) {
  const user = user_(token);
  tt = tt || {};
  return withLock_(() => {
    const hd = findObj_('HopDong', soHD);
    if (!hd) throw new Error('Không tìm thấy hợp đồng ' + soHD + '.');
    if (!hd.SoDH) throw new Error('Gắn hợp đồng với một đơn hàng (ô "Theo đơn hàng") để ghi nhận thu tiền và công nợ tự khớp.');
    const f = timDongLich_(soHD, dot);
    if (!f.r) throw new Error('Không tìm thấy đợt ' + dot + ' của hợp đồng ' + soHD + '.');
    const row = rowObj_(f.sh, f.r);
    if (row.SoPT) throw new Error('Đợt ' + dot + ' đã thu (phiếu ' + row.SoPT + ').');
    const hinhThuc = String(tt.HinhThuc || '').trim() || (cuaHang_(CUR_SHOP).congTy.hinhThuc || [])[0] || 'Chuyển khoản';
    const pt = ghiPhieuThu_(user, { Ngay: ngayHopLe_(tt.Ngay) || now_().slice(0, 10), SoDH: hd.SoDH, SoTien: row.SoTien, HinhThuc: hinhThuc,
      GhiChu: ('Hợp đồng ' + soHD + ' – ' + row.Nhan + (tt.GhiChu ? ' – ' + String(tt.GhiChu).trim() : '')).slice(0, 200) });
    writeRow_(f.sh, f.r, Object.assign({}, row, { SoPT: pt.SoPT, NgayThu: pt.Ngay }));
    log_(user, 'Thu đợt hợp đồng', soHD, row.Nhan + ' · ' + row.SoTien + ' đ · phiếu ' + pt.SoPT);
    return { lich: lichHopDong_(soHD), phieu: pt };
  });
}

/** Quản trị hủy ghi nhận thu của một đợt: xóa phiếu thu đã tạo và đưa đợt về chưa thu. */
function huyThuDotHopDong(token, soHD, dot) {
  const user = user_(token, true);
  return withLock_(() => {
    const f = timDongLich_(soHD, dot);
    if (!f.r) throw new Error('Không tìm thấy đợt ' + dot + ' của hợp đồng ' + soHD + '.');
    const row = rowObj_(f.sh, f.r);
    if (!row.SoPT) throw new Error('Đợt ' + dot + ' chưa thu tiền.');
    deleteWhere_('ThuTien', row.SoPT);
    writeRow_(f.sh, f.r, Object.assign({}, row, { SoPT: '', NgayThu: '' }));
    log_(user, 'Hủy thu đợt hợp đồng', soHD, row.Nhan + ' · xóa phiếu ' + row.SoPT);
    return { lich: lichHopDong_(soHD), soPT: row.SoPT };
  });
}

/** Tình trạng một đợt (homNay dạng yyyy-MM-dd): 'thu' | 'quahan' | 'sap' (còn ≤ 7 ngày) | 'cho'. Phải giống trangThaiDot trong Index.html. */
function trangThaiDot_(r, homNay) {
  if (r.SoPT) return 'thu';
  const n = Math.round((Date.parse(r.NgayDen) - Date.parse(homNay)) / 864e5);
  return n < 0 ? 'quahan' : n <= 7 ? 'sap' : 'cho';
}

// ===== Ký tại quầy (chữ ký điện tử bằng tay trên màn hình) =====
// Giá trị pháp lý của loại chữ ký này dựa trên thỏa thuận của hai bên (Luật Giao dịch điện tử 2023): mẫu hợp đồng có điều khoản đồng ý ký điện tử, app ghi người ký,
// thời điểm và mã xác thực (SHA-256 của nội dung đã ký + ảnh chữ ký). Hợp đồng giá trị lớn hoặc cần giá trị pháp lý cao nên dùng chữ ký số của nhà cung cấp được cấp phép.
// Nội dung đã ký = bên A, hàng hóa và IMEI, số tiền, lịch thanh toán, điều khoản chính; không gồm ngày hết hạn (để còn gia hạn), ghi chú, người phụ trách, trạng thái, đơn hàng.
const HD_NOI_DUNG_KY = ['LoaiHD', 'Ngay', 'TenDN', 'DiaChi', 'VanPhongGD', 'MST', 'SoCCCD', 'CCCDCap', 'NguoiDaiDien', 'ChucVu', 'SDT', 'SoTK', 'NganHang', 'NgayHieuLuc', 'BaoTruocNgay', 'TuGiaHan', 'ThangGiaHan', 'VAT'];
function noiDungKy_(hd, lines, lich) {
  return JSON.stringify([HD_NOI_DUNG_KY.map(k => String(hd[k] == null ? '' : hd[k])), lines.map(l => [String(l.MaHH), String(l.TenHang), String(l.DVT), +l.SoLuong, +l.DonGia, String(l.IMEI || '')]),
    (lich || []).map(r => [String(r.Nhan), String(r.NgayDen), +r.SoTien])]);
}
const hex_ = bytes => bytes.map(b => ('0' + (b & 255).toString(16)).slice(-2)).join('');
const sha256Hex_ = v => hex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, v, Utilities.Charset.UTF_8));
const nhomMa_ = ma => String(ma).toUpperCase().slice(0, 16).replace(/(.{4})(?=.)/g, '$1-'); // 8F2A-91C3-77D0-12AB

/**
 * Khách ký tại quầy: pngBase64 là ảnh chữ ký (PNG). Hợp đồng phải đã có file Docs và file không cũ (khách ký đúng bản đã xem).
 * Lưu ảnh vào thư mục Drive, ghi người ký, thời điểm, mã xác thực; chuyển Soạn thảo thành Đang hiệu lực; tạo lại file có chữ ký.
 * Từ đây nội dung đã ký không sửa được (kể cả quản trị) trừ khi quản trị hủy chữ ký.
 */
function kyHopDong(token, soHD, pngBase64, tenNguoiKy) {
  const user = user_(token);
  const ten = String(tenNguoiKy || '').trim().slice(0, 100);
  if (!ten) throw new Error('Nhập họ tên người ký.');
  const b64 = String(pngBase64 || '').replace(/^data:image\/png;base64,/, '');
  if (b64.length > 400000) throw new Error('Ảnh chữ ký quá lớn.');
  let bytes;
  try { bytes = Utilities.base64Decode(b64); } catch (e) { throw new Error('Ảnh chữ ký không hợp lệ.'); }
  if (bytes.length < 600 || (bytes[0] & 255) !== 0x89 || bytes[1] !== 80 || bytes[2] !== 78 || bytes[3] !== 71) throw new Error('Chưa có chữ ký (ảnh trống hoặc không phải PNG). Cho khách ký lại.');
  const ma = withLock_(() => {
    const sh = sheet_('HopDong'), r = findRow_(sh, soHD);
    if (!r) throw new Error('Không tìm thấy hợp đồng ' + soHD + '.');
    const hd = rowObj_(sh, r);
    if (hd.KyFileId) throw new Error('Hợp đồng đã có chữ ký điện tử. Quản trị hủy chữ ký trước nếu cần ký lại.');
    if (!hd.FileId) throw new Error('Tạo file hợp đồng trước khi ký, để khách xem đúng nội dung sẽ ký.');
    if (hd.FileCu === '1') throw new Error('File hợp đồng đã cũ so với nội dung hiện tại. Tạo lại file rồi mới cho khách ký.');
    const luc = now_(), maXT = sha256Hex_(JSON.stringify([noiDungKy_(hd, dongHopDong_(soHD), lichHopDong_(soHD)), ten, luc, sha256Hex_(bytes)])).toUpperCase();
    let file;
    try { file = thuMuc_().createFile(Utilities.newBlob(bytes, 'image/png', 'Chữ ký ' + tenFile_(hd) + '.png')); } catch (e) { throw loiDocs_(e); }
    writeRow_(sh, r, Object.assign({}, hd, { KyFileId: file.getId(), NguoiKy: ten, NgayKyDT: luc, MaXacThuc: maXT, FileCu: '1', NgaySua: luc,
      TrangThai: hd.TrangThai === HD_TRANG_THAI[0] ? HD_TRANG_THAI[1] : hd.TrangThai }));
    log_(user, 'Ký điện tử hợp đồng', soHD, ten + ' · mã ' + nhomMa_(maXT));
    return maXT;
  });
  const kq = { ma: ma };
  try { kq.doc = taoFileHopDong(token, soHD).doc; } // tạo lại file để có hình chữ ký; lỗi thì chữ ký vẫn được giữ, báo loiFile
  catch (e) { kq.loiFile = String((e && e.message) || e); kq.doc = hdChoUser_(user, findObj_('HopDong', soHD)); }
  return kq;
}

/** Quản trị hủy chữ ký (để sửa nội dung hoặc cho ký lại): xóa ảnh chữ ký (vào thùng rác Drive), file hợp đồng đánh dấu cũ. */
function huyChuKyHopDong(token, soHD) {
  const user = user_(token, true);
  return withLock_(() => {
    const sh = sheet_('HopDong'), r = findRow_(sh, soHD);
    if (!r) throw new Error('Không tìm thấy hợp đồng ' + soHD + '.');
    const hd = rowObj_(sh, r);
    if (!hd.KyFileId) throw new Error('Hợp đồng chưa có chữ ký điện tử.');
    try { DriveApp.getFileById(hd.KyFileId).setTrashed(true); } catch (e) {}
    const o = Object.assign({}, hd, { KyFileId: '', NguoiKy: '', NgayKyDT: '', MaXacThuc: '', FileCu: hd.FileId ? '1' : '', NgaySua: now_() });
    writeRow_(sh, r, o);
    log_(user, 'Hủy chữ ký điện tử', soHD, hd.NguoiKy + ' · ' + nhomMa_(hd.MaXacThuc));
    return { doc: o };
  });
}

/** Kiểm tra chữ ký còn nguyên: tính lại mã xác thực từ nội dung hiện tại + ảnh chữ ký đã lưu và so với mã lúc ký. */
function xacThucChuKyHopDong(token, soHD) {
  user_(token);
  const hd = findObj_('HopDong', soHD);
  if (!hd) throw new Error('Không tìm thấy hợp đồng ' + soHD + '.');
  if (!hd.KyFileId) return { coChuKy: false };
  const kq = { coChuKy: true, nguoi: hd.NguoiKy, luc: hd.NgayKyDT, ma: nhomMa_(hd.MaXacThuc), hopLe: false, lyDo: '' };
  let bytes;
  try { bytes = DriveApp.getFileById(hd.KyFileId).getBlob().getBytes(); } catch (e) { kq.lyDo = 'Không đọc được ảnh chữ ký đã lưu.'; return kq; }
  const lai = sha256Hex_(JSON.stringify([noiDungKy_(hd, dongHopDong_(soHD), lichHopDong_(soHD)), hd.NguoiKy, hd.NgayKyDT, sha256Hex_(bytes)])).toUpperCase();
  kq.hopLe = lai === String(hd.MaXacThuc);
  if (!kq.hopLe) kq.lyDo = 'Nội dung hợp đồng hoặc ảnh chữ ký đã thay đổi sau khi ký.';
  return kq;
}

/** Gia hạn một chạm: cộng thêm số tháng vào ngày hết hạn của hợp đồng đang hiệu lực (không đụng hàng hóa, số tiền). Nhân viên làm được. */
function giaHanHopDong(token, soHD, soThang) {
  const user = user_(token);
  soThang = Math.round(+soThang || 0);
  if (soThang < 1 || soThang > 120) throw new Error('Số tháng gia hạn từ 1 đến 120.');
  return withLock_(() => {
    const sh = sheet_('HopDong'), r = findRow_(sh, soHD);
    if (!r) throw new Error('Không tìm thấy hợp đồng ' + soHD + '.');
    const hd = rowObj_(sh, r);
    if (hd.TrangThai !== 'Đang hiệu lực') throw new Error('Chỉ gia hạn được hợp đồng đang hiệu lực.');
    if (!hd.NgayHetHan) throw new Error('Hợp đồng chưa có ngày hết hạn để gia hạn.');
    const moi = congThang_(hd.NgayHetHan, soThang);
    const o = Object.assign({}, hd, { NgayHetHan: moi, NgaySua: now_(), FileCu: hd.FileId ? '1' : hd.FileCu });
    writeRow_(sh, r, o);
    log_(user, 'Gia hạn hợp đồng', soHD, 'thêm ' + soThang + ' tháng: ' + hd.NgayHetHan + ' → ' + moi);
    return { doc: hdChoUser_(user, o) };
  });
}

/** Lịch sử thao tác của một hợp đồng (mới nhất trước), lấy từ Nhật ký. */
function lichSuHopDong(token, soHD) {
  user_(token);
  return readTable_('NhatKy').filter(x => String(x.DoiTuong) === String(soHD)).reverse().slice(0, 100);
}

/**
 * Hợp đồng đang hiệu lực đã quá hạn hoặc sắp hết hạn (homNay dạng yyyy-MM-dd), còn lại null. Phải giống hàm hanHD trong Index.html.
 * Trả về { het|sap: true, n: số ngày (quá / còn), bao: ngày báo trước, quyetDinh: số ngày còn lại tới hạn phải báo hoặc null }.
 */
function hanHD_(h, homNay) {
  if (h.TrangThai !== 'Đang hiệu lực' || !h.NgayHetHan) return null;
  const n = Math.round((Date.parse(h.NgayHetHan) - Date.parse(homNay)) / 864e5), bao = +h.BaoTruocNgay || 0, quyetDinh = bao ? n - bao : null;
  if (n < 0) return { het: true, n: -n, bao: bao, quyetDinh: quyetDinh };
  return n <= Math.max(HD_SAP, bao ? bao + 14 : 0) ? { sap: true, n: n, bao: bao, quyetDinh: quyetDinh } : null;
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
  ['THOIHAN', 'Thời hạn viết sẵn: "từ ngày … đến hết ngày …" / "kể từ ngày ký"'], ['BAOTRUOC', 'Số ngày báo trước khi chấm dứt hoặc không gia hạn'],
  ['GIAHAN', 'Câu viết sẵn về gia hạn: tự động gia hạn thêm N tháng / không tự động gia hạn'], ['SODONHANG', 'Số đơn hàng liên quan'], ['NGUOIPHUTRACH', 'Người phụ trách'],
  ['TENDOANHNGHIEP', 'Bên A: tên khách hàng / doanh nghiệp'], ['DIACHIDOANHNGHIEP', 'Bên A: địa chỉ'], ['VANPHONGGIAODICH', 'Bên A: văn phòng giao dịch'], ['MASOTHUE', 'Bên A: mã số thuế'], ['SOCCCD', 'Bên A: số CCCD/CMND (cá nhân)'], ['CCCDCAP', 'Bên A: ngày cấp, nơi cấp CCCD/CMND'],
  ['NGUOIDAIDIEN', 'Bên A: người đại diện'], ['CHUCVU', 'Bên A: chức vụ'], ['DIENTHOAI', 'Bên A: số điện thoại'], ['SOTAIKHOAN', 'Bên A: số tài khoản'], ['NGANHANG', 'Bên A: ngân hàng'],
  ['B_TEN', 'Bên B (cửa hàng): tên in trên chứng từ'], ['B_DIACHI', 'Bên B: địa chỉ'], ['B_MST', 'Bên B: mã số thuế'], ['B_DAIDIEN', 'Bên B: người đại diện (chủ hộ)'], ['B_CHUCVU', 'Bên B: chức danh người ký'],
  ['B_LIENHE', 'Bên B: điện thoại, email'], ['B_STK', 'Bên B: số tài khoản nhận tiền'], ['B_NGANHANG', 'Bên B: ngân hàng'], ['B_CHUTK', 'Bên B: chủ tài khoản'], ['B_BAOHANH', 'Bên B: số tháng bảo hành mặc định'],
  ['BANGLICH', 'Bảng lịch thanh toán / trả góp (đợt, nội dung, ngày đến hạn, số tiền) – đặt riêng một dòng'], ['SOKY', 'Số kỳ trả góp (không tính đợt "Trả trước")'], ['TONGLICH', 'Tổng số tiền các đợt trong lịch'], ['TRATRUOC', 'Số tiền đợt "Trả trước"'],
  ['CHUKYA', 'Chỗ chèn hình chữ ký điện tử của Bên A (đặt trong ô chữ ký)'], ['XACTHUCKYA', 'Dòng ghi người ký, thời điểm và mã xác thực của chữ ký điện tử Bên A'], ['CHUKYB', 'Chỗ ký của Bên B (để trống ký tay)'], ['XACTHUCKYB', 'Dòng xác thực của Bên B (để trống)'],
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
  ['kv', 'Mã số thuế: ', '{{MASOTHUE}}'], ['kv', 'CCCD/CMND (nếu là cá nhân): ', '{{SOCCCD}} – cấp: {{CCCDCAP}}'],
  ['kv', 'Người đại diện: ', '{{NGUOIDAIDIEN}} – Chức vụ: {{CHUCVU}}'], ['kv', 'Điện thoại: ', '{{DIENTHOAI}}'], ['kv', 'Số tài khoản: ', '{{SOTAIKHOAN}} tại {{NGANHANG}}']];
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
const hdDuLieuCaNhan = () => [['dieu', 'Bảo vệ dữ liệu cá nhân'],
  ['p', 'Hai bên đồng ý để bên kia xử lý thông tin cá nhân nêu trong hợp đồng (họ tên, số CCCD/CMND, địa chỉ, điện thoại, số tài khoản) cho mục đích lập, thực hiện, bảo hành và lưu trữ hợp đồng theo quy định của pháp luật về bảo vệ dữ liệu cá nhân. Mỗi bên chỉ dùng thông tin của bên kia cho các mục đích trên và có trách nhiệm bảo mật thông tin đó.']];
const hdHieuLuc = () => [['dieu', 'Hiệu lực hợp đồng'], ['li', 'Hợp đồng có hiệu lực {{THOIHAN}} và chấm dứt khi hai bên hoàn thành nghĩa vụ, hoặc khi hết thời hạn nêu trên: lúc đó hợp đồng {{GIAHAN}}. Thời hạn báo trước khi chấm dứt hoặc không gia hạn: {{BAOTRUOC}} ngày.'],
  ['li', 'Mọi sửa đổi, bổ sung hợp đồng phải được lập thành văn bản và có chữ ký của hai bên.'],
  ['li', 'Hợp đồng được lập thành 02 bản có giá trị pháp lý như nhau, mỗi bên giữ 01 bản.'],
  ['li', 'Hai bên đồng ý hợp đồng có thể được ký bằng chữ ký điện tử (ký tay trên thiết bị cảm ứng tại quầy, kèm người ký, thời điểm ký và mã xác thực ghi trong hợp đồng); chữ ký điện tử này có giá trị như chữ ký trên bản giấy theo thỏa thuận của hai bên.'],
  ['p', 'Ghi chú thêm: {{GHICHU}}'], ['bl']];
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
  hdViPham(), hdBatKhaKhang(), hdTranhChap(), hdDuLieuCaNhan(), hdHieuLuc(), [['ky', 'ĐẠI DIỆN BÊN A (BÊN MUA)', 'ĐẠI DIỆN BÊN B (BÊN BÁN)']]));

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
  ['li', 'Hợp đồng có hiệu lực {{THOIHAN}}. Khi hết thời hạn, hợp đồng {{GIAHAN}}.'],
  ['li', 'Mỗi bên có quyền chấm dứt hợp đồng bằng thông báo bằng văn bản trước {{BAOTRUOC}} ngày; các đơn hàng đã xác nhận vẫn tiếp tục được thực hiện.']],
  hdViPham(), hdBatKhaKhang(), hdTranhChap(), hdDuLieuCaNhan(),
  [['dieu', 'Điều khoản chung'], ['li', 'Mọi sửa đổi, bổ sung phải được lập thành văn bản và có chữ ký của hai bên. Hợp đồng được lập thành 02 bản có giá trị như nhau, mỗi bên giữ 01 bản.'],
  ['li', 'Hai bên đồng ý hợp đồng có thể được ký bằng chữ ký điện tử (ký tay trên thiết bị cảm ứng tại quầy, kèm người ký, thời điểm ký và mã xác thực ghi trong hợp đồng); chữ ký điện tử này có giá trị như chữ ký trên bản giấy theo thỏa thuận của hai bên.'],
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
  ['p', 'Mỗi bên có quyền chấm dứt hợp đồng bằng thông báo bằng văn bản trước {{BAOTRUOC}} ngày. Khi chấm dứt, hai bên đối chiếu và thanh toán hết công nợ; hàng tồn của Bên A xử lý theo thỏa thuận: ……………………………………']],
  hdViPham(), hdBatKhaKhang(), hdTranhChap(), hdDuLieuCaNhan(), hdHieuLuc(), [['ky', 'ĐẠI DIỆN BÊN A (ĐẠI LÝ)', 'ĐẠI DIỆN BÊN B (NHÀ CUNG CẤP)']]));

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
  hdViPham(), hdBatKhaKhang(), hdTranhChap(), hdDuLieuCaNhan(), hdHieuLuc(), [['ky', 'ĐẠI DIỆN BÊN A (BÊN BÁN MÁY CŨ)', 'ĐẠI DIỆN BÊN B (BÊN MUA MÁY CŨ)']]));

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
  hdViPham(), hdBatKhaKhang(), hdTranhChap(), hdDuLieuCaNhan(), hdHieuLuc(), [['ky', 'ĐẠI DIỆN BÊN A (KHÁCH HÀNG)', 'ĐẠI DIỆN BÊN B (ĐƠN VỊ DỊCH VỤ)']]));

const HD_MAU_TRA_GOP = hdMoDau('HỢP ĐỒNG MUA BÁN TRẢ GÓP', 'BÊN MUA', 'BÊN BÁN', 'Căn cứ thỏa thuận của hai bên về việc mua bán hàng hóa trả chậm, trả dần.').concat([
  ['dieu', 'Hàng hóa và giá'], ['p', 'Bên B bán và Bên A mua các hàng hóa sau:'], ['bang'],
  ['p', 'Tổng giá trị hợp đồng (gồm thuế GTGT {{VAT}}%): {{TONGTHANHTOAN}} đồng. Bằng chữ: {{BANGCHU}}'],
  ['dieu', 'Phương thức thanh toán trả góp'],
  ['li', 'Bên A thanh toán giá trị hợp đồng theo lịch dưới đây. Trả góp trực tiếp với Bên B, không tính lãi trả góp:'], ['bang_lich'],
  ['li', 'Số tiền trả trước: {{TRATRUOC}} đồng; số kỳ trả góp: {{SOKY}}; tổng các đợt: {{TONGLICH}} đồng.']]
  .concat(hdThanhToanTK, [
  ['dieu', 'Giao nhận hàng'],
  ['li', 'Bên B giao hàng cho Bên A sau khi Bên A thanh toán khoản trả trước (nếu có) tại: ……………………………………; Bên A kiểm tra ngoại quan, số lượng, IMEI/serial, kích hoạt thử và ký xác nhận vào phiếu giao hàng.'],
  ['dieu', 'Quyền sở hữu'],
  ['li', 'Hai bên thỏa thuận Bên B bảo lưu quyền sở hữu hàng hóa cho đến khi Bên A thanh toán đủ giá trị hợp đồng, theo quy định của Bộ luật Dân sự. Trong thời gian này Bên A được sử dụng hàng hóa nhưng không được bán, cầm cố, thế chấp, cho thuê hoặc chuyển giao cho người khác.'],
  ['dieu', 'Thanh toán chậm'],
  ['li', 'Nếu Bên A chậm thanh toán một đợt quá ……… ngày, Bên B có quyền: tính lãi chậm trả theo mức ……… %/ngày trên số tiền chậm trả (không vượt mức pháp luật cho phép); yêu cầu thanh toán ngay toàn bộ số tiền còn lại; và thu hồi hàng hóa theo thỏa thuận bảo lưu quyền sở hữu.'],
  ['dieu', 'Bảo hành và xử lý máy lỗi'],
  ['li', 'Hàng hóa được bảo hành {{B_BAOHANH}} tháng theo chính sách của nhà sản xuất và của Bên B; số IMEI/serial ghi trong phiếu giao hàng kiêm phiếu bảo hành là căn cứ bảo hành.'],
  ['li', 'Máy phát sinh lỗi do nhà sản xuất: Bên B đổi, sửa chữa hoặc hoàn tiền theo chính sách. Nếu Bên B không xử lý được trong ……… ngày kể từ khi tiếp nhận, hai bên thỏa thuận tạm dừng hoặc điều chỉnh các đợt chưa đến hạn.']],
  hdViPham(), hdBatKhaKhang(), hdTranhChap(), hdDuLieuCaNhan(), hdHieuLuc(), [['ky', 'ĐẠI DIỆN BÊN A (BÊN MUA)', 'ĐẠI DIỆN BÊN B (BÊN BÁN)']]));

// Loại hợp đồng có sẵn (ngành điện thoại). caiDat tạo file Google Docs mẫu cho từng loại rồi ghi vào trang MauHopDong; quản trị thêm/xóa loại ở đó.
const HD_LOAI_MAC_DINH = [
  { ten: 'Hợp đồng mua bán', moTa: 'Bán lẻ/bán sỉ điện thoại, phụ kiện: bảng hàng, giá, thanh toán, giao nhận, bảo hành.', mau: HD_MAU_MUA_BAN },
  { ten: 'Hợp đồng mua bán trả góp', moTa: 'Bán trả chậm/trả góp trực tiếp cho khách: lịch thanh toán theo đợt, bảo lưu quyền sở hữu, xử lý chậm trả và máy lỗi.', mau: HD_MAU_TRA_GOP },
  { ten: 'Hợp đồng nguyên tắc', moTa: 'Khung cho khách mua thường xuyên: chính sách giá, thanh toán, công nợ; từng đơn mua theo phụ lục hoặc đơn hàng.', mau: HD_MAU_NGUYEN_TAC },
  { ten: 'Hợp đồng đại lý – phân phối', moTa: 'Đại lý/cộng tác viên nhận hàng bán lại: chiết khấu, công nợ, bảo hành, đổi trả.', mau: HD_MAU_DAI_LY },
  { ten: 'Hợp đồng thu cũ đổi mới', moTa: 'Mua lại máy cũ của khách (định giá, IMEI, xác nhận quyền sở hữu, xóa dữ liệu) để đổi máy mới.', mau: HD_MAU_THU_CU },
  { ten: 'Hợp đồng dịch vụ sửa chữa – bảo hành', moTa: 'Nhận máy sửa chữa/bảo hành: tình trạng máy, chi phí, thời gian, bảo hành sau sửa.', mau: HD_MAU_SUA_CHUA },
];

// Dựng nội dung mẫu vào file Google Docs mới. Mỗi đoạn đặt tường minh toàn bộ định dạng (phông, cỡ, đậm, nghiêng, căn lề, thụt lề) trong một lần gọi,
// không dựa vào việc đoạn mới có thừa hưởng kiểu của đoạn trước hay không.
function dungMau_(doc, muc) {
  const body = doc.getBody(), A = DocumentApp.HorizontalAlignment, AT = DocumentApp.Attribute;
  body.setMarginTop(57); body.setMarginBottom(57); body.setMarginLeft(85); body.setMarginRight(57); // 2cm trên/dưới/phải, 3cm trái (chuẩn văn bản hành chính)
  let dieu = 0;
  const them = (text, canh, o) => {
    o = o || {};
    const p = body.appendParagraph(text), st = {};
    st[AT.FONT_FAMILY] = 'Times New Roman'; st[AT.FONT_SIZE] = o.co || 13; st[AT.BOLD] = !!o.dam; st[AT.ITALIC] = !!o.nghieng; st[AT.UNDERLINE] = false;
    st[AT.HORIZONTAL_ALIGNMENT] = canh; st[AT.SPACING_AFTER] = 6; st[AT.INDENT_START] = o.thut ? 18 : 0; st[AT.INDENT_FIRST_LINE] = 0;
    p.setAttributes(st);
    return p;
  };
  muc.forEach(m => {
    const k = m[0];
    if (k === 'cb') them(m[1], A.CENTER, { dam: true });
    else if (k === 'c') them(m[1], A.CENTER);
    else if (k === 'tt') them(m[1], A.CENTER, { dam: true, co: 15 });
    else if (k === 'ci') them(m[1], A.JUSTIFY, { nghieng: true });
    else if (k === 'p') them(m[1], A.JUSTIFY);
    else if (k === 'li') them('- ' + m[1], A.JUSTIFY, { thut: true });
    else if (k === 'h') them(m[1], A.LEFT, { dam: true });
    else if (k === 'dieu') them('Điều ' + (++dieu) + '. ' + m[1], A.LEFT, { dam: true });
    else if (k === 'bl') them('', A.LEFT);
    else if (k === 'bang') them('{{BANGHANG}}', A.LEFT);
    else if (k === 'bang_lich') them('{{BANGLICH}}', A.LEFT);
    else if (k === 'kv') { const p = them(m[1] + m[2], A.LEFT); p.editAsText().setBold(0, m[1].length - 1, true); }
    else if (k === 'ky') {
      const t = body.appendTable([[m[1], m[2]], ['(Ký, ghi rõ họ tên, đóng dấu)', '(Ký, ghi rõ họ tên, đóng dấu)'], ['{{CHUKYA}}', '{{CHUKYB}}'], ['{{XACTHUCKYA}}', '{{XACTHUCKYB}}']]);
      const kieu = {}; kieu[AT.FONT_FAMILY] = 'Times New Roman'; kieu[AT.FONT_SIZE] = 13;
      t.setAttributes(kieu); t.setBorderWidth(0);
      [0, 1, 2, 3].forEach(r => [0, 1].forEach(c => { const cell = t.getCell(r, c); cell.getChild(0).asParagraph().setAlignment(A.CENTER); if (r === 0) cell.editAsText().setBold(true); if (r === 2) cell.setPaddingBottom(40); })); // hàng 3: chỗ ký tay hoặc hình chữ ký điện tử
    }
  });
  const dau = body.getChild(0); // đoạn trống có sẵn ở đầu file mới
  if (dau.getType() === DocumentApp.ElementType.PARAGRAPH && !dau.asParagraph().getText()) dau.asParagraph().removeFromParent();
}

// ===== Tạo file hợp đồng từ mẫu =====
const HD_TRONG = '………………';
const tien_ = n => String(Math.round(+n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); // 1234567 -> 1.234.567
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
function taoMauMacDinh_() {
  const moi = [], co = readTable_('MauHopDong').map(m => String(m.LoaiHD));
  HD_LOAI_MAC_DINH.forEach(l => {
    if (co.includes(l.ten)) return;
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
  let ds = readTable_('MauHopDong');
  if (!ds.length) { taoMauMacDinh_(); ds = readTable_('MauHopDong'); } // chưa có mẫu nào (caiDat chưa tạo được): tạo đủ bộ mặc định; đã có mẫu thì tôn trọng việc quản trị xóa mẫu
  const m = ds.find(x => String(x.LoaiHD) === String(loai));
  if (!m) throw loiRieng_('Loại hợp đồng "' + loai + '" chưa có file mẫu. Quản trị vào Cài đặt → Mẫu hợp đồng để thêm.');
  const id = idTuLink_(m.LinkMau);
  if (!id) throw loiRieng_('Link file mẫu của "' + loai + '" không hợp lệ. Quản trị sửa lại trong Cài đặt → Mẫu hợp đồng.');
  return id;
}

// Giá trị các biến {{…}} của một hợp đồng
function bienHopDong_(hd, lich, ky) {
  lich = lich || [];
  const c = cuaHang_(CUR_SHOP).congTy;
  const t = v => { v = String(v == null ? '' : v).replace(/\{\{|\}\}/g, '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, ' ').trim().slice(0, 500); return v || HD_TRONG; };
  const so = tien_;
  const ngay = dmyHD_;
  const ngayDai = s => /^\d{4}-\d{2}-\d{2}/.test(String(s)) ? 'ngày ' + String(s).slice(8, 10) + ' tháng ' + String(s).slice(5, 7) + ' năm ' + String(s).slice(0, 4) : 'ngày ….. tháng ….. năm …….';
  const thoiHan = hd.NgayHieuLuc && hd.NgayHetHan ? 'từ ngày ' + ngay(hd.NgayHieuLuc) + ' đến hết ngày ' + ngay(hd.NgayHetHan)
    : hd.NgayHieuLuc ? 'kể từ ngày ' + ngay(hd.NgayHieuLuc) : hd.NgayHetHan ? 'kể từ ngày ký đến hết ngày ' + ngay(hd.NgayHetHan) : 'kể từ ngày ký';
  const nh = NGAN_HANG.find(b => b[0] === c.qrNganHang);
  return {
    MAHOPDONG: t(hd.SoHD), LOAIHOPDONG: t(hd.LoaiHD), THOIGIANTAO: Utilities.formatDate(new Date(), tz_(), 'dd/MM/yyyy HH:mm'),
    NGAYKY: t(ngay(hd.Ngay)), NGAYKYDAI: ngayDai(hd.Ngay), NGAYHIEULUC: t(ngay(hd.NgayHieuLuc)), NGAYHETHAN: t(ngay(hd.NgayHetHan)), THOIHAN: thoiHan,
    SODONHANG: t(hd.SoDH), NGUOIPHUTRACH: t(hd.NguoiPhuTrach),
    TENDOANHNGHIEP: t(hd.TenDN), DIACHIDOANHNGHIEP: t(hd.DiaChi), VANPHONGGIAODICH: t(hd.VanPhongGD), MASOTHUE: t(hd.MST), NGUOIDAIDIEN: t(hd.NguoiDaiDien),
    BAOTRUOC: +hd.BaoTruocNgay > 0 ? String(+hd.BaoTruocNgay) : HD_TRONG,
    GIAHAN: hd.TuGiaHan === '1' ? 'tự động gia hạn thêm ' + (+hd.ThangGiaHan || 12) + ' tháng mỗi lần nếu không bên nào thông báo chấm dứt trong thời hạn báo trước' : 'không tự động gia hạn, muốn tiếp tục phải ký phụ lục hoặc hợp đồng mới',
    SOCCCD: t(hd.SoCCCD), CCCDCAP: t(hd.CCCDCap),
    CHUCVU: t(hd.ChucVu), DIENTHOAI: t(hd.SDT), SOTAIKHOAN: t(hd.SoTK), NGANHANG: t(hd.NganHang),
    B_TEN: t(c.ten), B_DIACHI: t((c.diaChi || []).join('; ')), B_MST: t(c.mst), B_DAIDIEN: t(c.chuHo), B_CHUCVU: t(c.kyTen), B_LIENHE: t(c.lienHe),
    B_STK: t(c.qrSoTK), B_NGANHANG: t(nh ? nh[1] : ''), B_CHUTK: t(c.qrChuTK), B_BAOHANH: t(c.baoHanhThang),
    SOKY: String(lich.filter(r => r.Nhan !== 'Trả trước').length), TONGLICH: so(lich.reduce((t, r) => t + (+r.SoTien || 0), 0)), TRATRUOC: so(lich.filter(r => r.Nhan === 'Trả trước').reduce((t, r) => t + (+r.SoTien || 0), 0)),
    CHUKYA: '', CHUKYB: '', XACTHUCKYB: '',
    XACTHUCKYA: ky ? 'Đã ký điện tử: ' + ky.nguoi + ' – ' + dmyHD_(String(ky.luc).slice(0, 10)) + ' ' + String(ky.luc).slice(11, 16) + ' – Mã xác thực ' + nhomMa_(ky.ma) : '',
    CONGTIENHANG: so(hd.TienHang), VAT: String(+hd.VAT || 0), TIENVAT: so(hd.TienVAT), TONGTHANHTOAN: so(hd.TongCong), BANGCHU: t(hd.BangChu), GHICHU: t(hd.GhiChu),
  };
}

// Ô bảng hàng: tiêu đề, các dòng hàng, cộng tiền hàng, thuế, tổng. Không có dòng hàng thì để trống (null).
function bangHang_(hd, lines) {
  if (!lines.length) return null;
  const so = tien_;
  const rows = [['STT', 'Tên hàng hóa, dịch vụ', 'ĐVT', 'Số lượng', 'Đơn giá (đồng)', 'Thành tiền (đồng)']];
  lines.forEach((l, i) => rows.push([String(i + 1), String(l.TenHang) + (l.IMEI ? ' – IMEI/serial: ' + l.IMEI : ''), String(l.DVT || ''), String(+l.SoLuong || 0).replace('.', ','), so(l.DonGia), so(l.ThanhTien)]));
  rows.push(['', 'Cộng tiền hàng', '', '', '', so(hd.TienHang)]);
  rows.push(['', 'Thuế GTGT (' + (+hd.VAT || 0) + '%)', '', '', '', so(hd.TienVAT)]);
  rows.push(['', 'Tổng thanh toán', '', '', '', so(hd.TongCong)]);
  return rows;
}

// Ô bảng lịch thanh toán: tiêu đề, từng đợt, tổng. Không có lịch thì null.
function bangLich_(lich) {
  if (!lich || !lich.length) return null;
  const rows = [['Đợt', 'Nội dung', 'Ngày đến hạn', 'Số tiền (đồng)']];
  lich.forEach(r => rows.push([String(r.Dot), String(r.Nhan), dmyHD_(r.NgayDen), tien_(r.SoTien)]));
  rows.push(['', 'Tổng cộng', '', tien_(lich.reduce((t, r) => t + (+r.SoTien || 0), 0))]);
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

// Chèn một bảng vào chỗ đặt biến {{ten}} (riêng một dòng); không có dữ liệu thì thay bằng câu ghi chú. cot = { rong: [..], canPhai: cột bắt đầu căn phải, dam: số dòng cuối in đậm }
function chenBang_(body, ten, rows, ghiChu, cot) {
  const mau = '\\{\\{' + ten + '\\}\\}', vitri = body.findText(mau);
  if (!vitri) return;
  let idx = -1;
  try { idx = body.getChildIndex(vitri.getElement().getParent()); } catch (e) {} // biến nằm trong ô bảng hoặc chỗ lạ: bỏ qua việc chèn bảng
  body.replaceText(mau, rows ? '' : ghiChu);
  if (!rows || idx < 0) return;
  const A = DocumentApp.HorizontalAlignment, t = body.insertTable(idx, rows);
  const kieu = {}; kieu[DocumentApp.Attribute.FONT_FAMILY] = 'Times New Roman'; kieu[DocumentApp.Attribute.FONT_SIZE] = 12;
  t.setAttributes(kieu); t.setBorderWidth(1);
  cot.rong.forEach((w, c) => t.setColumnWidth(c, w));
  rows.forEach((r, i) => r.forEach((_, c) => {
    const cell = t.getCell(i, c);
    if (c >= cot.canPhai) cell.getChild(0).asParagraph().setAlignment(A.RIGHT);
    if (i === 0 || i >= rows.length - cot.dam) cell.editAsText().setBold(true);
  }));
}

// Điền dữ liệu vào bản sao của mẫu. Trả về danh sách biến còn sót trong mẫu mà app không biết (để báo cho người dùng).
function dienMau_(doc, bien, bang, lich, ky) {
  const body = doc.getBody();
  chenBang_(body, 'BANGHANG', bang, '(Theo báo giá, đơn đặt hàng hoặc phụ lục từng lần)', { rong: [30, 175, 40, 50, 80, 85], canPhai: 3, dam: 3 });
  chenBang_(body, 'BANGLICH', lich, '(Chưa lập lịch thanh toán: hai bên thỏa thuận bằng phụ lục)', { rong: [35, 175, 100, 110], canPhai: 3, dam: 1 });
  if (ky) { // chèn hình chữ ký vào chỗ {{CHUKYA}}; mẫu không có chỗ đó thì thêm một khối ở cuối file
    const vt = body.findText('\\{\\{CHUKYA\\}\\}');
    const p = vt ? vt.getElement().getParent().asParagraph() : body.appendParagraph('Chữ ký điện tử của Bên A:');
    p.appendInlineImage(ky.blob).setWidth(150).setHeight(60);
    if (!vt) body.appendParagraph(bien.XACTHUCKYA);
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
  const lines = dongHopDong_(soHD), lich = lichHopDong_(soHD);
  const noiDung = noiDungHD_(hd, lines, lich); // nội dung dùng để tạo file: người khác sửa trong lúc tạo thì file coi là cũ
  let file, conSot;
  try {
    file = DriveApp.getFileById(mauHopDong_(hd.LoaiHD)).makeCopy(tenFile_(hd), thuMuc_());
    const doc = DocumentApp.openById(file.getId());
    const ky = hd.KyFileId ? { blob: DriveApp.getFileById(hd.KyFileId).getBlob(), nguoi: hd.NguoiKy, luc: hd.NgayKyDT, ma: hd.MaXacThuc } : null;
    conSot = dienMau_(doc, bienHopDong_(hd, lich, ky), bangHang_(hd, lines), bangLich_(lich), ky);
    doc.saveAndClose();
  } catch (e) {
    if (file) { try { file.setTrashed(true); } catch (x) {} }
    throw loiDocs_(e);
  }
  return withLock_(() => {
    const sh = sheet_('HopDong'), r = findRow_(sh, soHD);
    if (!r) { try { file.setTrashed(true); } catch (e) {} throw new Error('Hợp đồng ' + soHD + ' đã bị xóa trong lúc tạo file.'); }
    const cu = rowObj_(sh, r);
    const moi = Object.assign({}, cu, { FileId: file.getId(), LinkFile: file.getUrl(), NgayFile: now_(), FileCu: noiDungHD_(cu, dongHopDong_(soHD), lichHopDong_(soHD)) === noiDung ? '' : '1' });
    writeRow_(sh, r, moi);
    if (cu.FileId) { try { DriveApp.getFileById(cu.FileId).setTrashed(true); } catch (e) {} }
    log_(user, (cu.FileId ? 'Tạo lại' : 'Tạo') + ' file hợp đồng', soHD, hd.LoaiHD);
    return { doc: hdChoUser_(user, moi), conSot: Array.from(new Set(conSot)) };
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
    const anhMau = Utilities.newBlob(Utilities.base64Decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8BQDwAEgAF/QualIQAAAABJRU5ErkJggg=='), 'image/png', 'kiemtra.png');
    const dk = DocumentApp.create('KIEMTRA - chèn chữ ký');
    try { // chèn hình chữ ký vào chỗ {{CHUKYA}} như khi khách ký tại quầy
      dk.getBody().appendParagraph('Chữ ký: {{CHUKYA}}');
      dienMau_(dk, bienHopDong_(hd, [], { blob: anhMau, nguoi: 'Khách thử', luc: '2026-01-02 10:30', ma: 'ABCDEF0123456789ABCDEF' }), null, null, { blob: anhMau, nguoi: 'Khách thử', luc: '2026-01-02 10:30', ma: 'ABCDEF0123456789ABCDEF' });
      dk.saveAndClose();
      const bk = DocumentApp.openById(dk.getId()).getBody();
      ghi('Chèn được hình chữ ký vào file', bk.getImages().length === 1 && bk.getText().indexOf('{{') < 0);
    } finally { try { DriveApp.getFileById(dk.getId()).setTrashed(true); } catch (e) {} }
    const thu = DocumentApp.create('KIEMTRA - dựng mẫu');
    try { // gọi đủ các hàm định dạng đoạn và bảng chữ ký mà bộ mẫu mặc định dùng
      dungMau_(thu, [['cb', 'A'], ['tt', 'B'], ['ci', 'C'], ['p', 'D'], ['li', 'E'], ['h', 'F'], ['kv', 'G: ', 'H'], ['dieu', 'I'], ['bang'], ['ky', 'J', 'K']]);
      thu.saveAndClose();
      const vb2 = DocumentApp.openById(thu.getId()).getBody().getText();
      ghi('Dựng được nội dung mẫu mới (định dạng đoạn, bảng chữ ký)', vb2.indexOf('Điều 1. I') >= 0 && vb2.indexOf('G: H') >= 0 && vb2.indexOf('- E') >= 0 && vb2.indexOf('{{BANGHANG}}') >= 0);
    } finally { try { DriveApp.getFileById(thu.getId()).setTrashed(true); } catch (e) {} }
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
