// ===== Thu cũ đổi mới, nhận bảo hành – sửa chữa =====
// Thu cũ đổi mới: máy cũ của khách được định giá (GiaThu) và trừ vào đơn máy mới. Máy cũ vào kho bằng một phiếu nhập
// (giá nhập = giá thu, mặt hàng nhóm "Máy cũ", tạo tự động theo tên máy), tiền máy cũ ghi thành phiếu thu hình thức "Thu máy cũ"
// gắn với đơn – nên công nợ của khách giảm đúng, doanh thu máy mới giữ nguyên, sổ quỹ không tính (không phải tiền).
// Bảo hành – sửa chữa (trang SuaChua): phiếu nhận máy (lỗi, phụ kiện kèm, mật khẩu máy, ngày hẹn trả, ảnh), theo dõi trạng thái tới khi trả khách;
// trả máy có chi phí thì lập đơn dịch vụ (bán nhanh) để có doanh thu, công nợ, phiếu thu như mọi đơn.
// File này dùng chung phạm vi với Code.gs, Api.gs (banNhanh, luuChungTu, luuThuTien…).

const HT_MAY_CU = 'Thu máy cũ'; // hình thức của phiếu thu ghi giá trị máy cũ: không phải tiền, sổ quỹ bỏ qua
const NHOM_MAY_CU = 'Máy cũ';
const TT_SUA = ['Đã nhận', 'Đang sửa', 'Chờ linh kiện', 'Đã sửa xong', 'Không sửa được', 'Đã trả khách'];
const LOAI_SUA = ['Bảo hành', 'Sửa chữa'];

/** Kiểm tra danh sách máy cũ (chưa ghi gì): [{ TenHang, IMEI, GiaThu, GiaLe, GhiChu }] → bản đã chuẩn hóa */
function chuanMayCu_(ds) {
  if (!Array.isArray(ds)) return [];
  if (ds.length > 5) throw new Error('Mỗi đơn thu tối đa 5 máy cũ.');
  const kq = ds.map((m, i) => {
    m = m || {};
    const ten = String(m.TenHang || '').trim().slice(0, 150), imei = String(m.IMEI || '').toUpperCase().replace(/[\s.\-]/g, '');
    const gia = Math.round(+m.GiaThu || 0), giaLe = Math.round(+m.GiaLe || 0);
    if (!ten) throw new Error('Máy cũ ' + (i + 1) + ': nhập tên máy (vd: iPhone 13 128GB).');
    if (!/^[A-Z0-9][A-Z0-9._/-]{3,39}$/.test(imei)) throw new Error('Máy cũ ' + (i + 1) + ': nhập IMEI/serial của máy cũ (4–40 chữ, số).');
    if (gia <= 0) throw new Error('Máy cũ ' + (i + 1) + ': nhập giá thu.');
    return { TenHang: ten, IMEI: imei, GiaThu: gia, GiaLe: giaLe > 0 ? giaLe : '', GhiChu: String(m.GhiChu || '').trim().slice(0, 300) };
  });
  const lap = kq.find((m, i) => kq.findIndex(x => x.IMEI === m.IMEI) !== i);
  if (lap) throw new Error('IMEI/serial ' + lap.IMEI + ' của máy cũ bị lặp.');
  kiemIMEI_('Nhập', '', kq.map(m => m.IMEI)); // máy đang nằm trong kho thì không thu lại được
  return kq;
}

/** Ghi một máy cũ đã kiểm tra: mặt hàng "… (máy cũ)", phiếu nhập kho, phiếu thu "Thu máy cũ" gắn đơn */
function ghiMayCu_(token, user, kh, soDH, m, ngay) {
  const ten = /máy cũ/i.test(m.TenHang) ? m.TenHang : m.TenHang + ' (máy cũ)';
  let h = readTable_('HangHoa').find(x => x.NhomHang === NHOM_MAY_CU && boDau_(x.TenHang) === boDau_(ten));
  if (!h) {
    h = withLock_(() => {
      const moi = upsert_('HangHoa', { TenHang: ten, NhomHang: NHOM_MAY_CU, PhanLoai: NHOM_MAY_CU, DVT: 'Máy', GiaLe: m.GiaLe, GhiChu: 'Tạo khi thu cũ đổi mới' }, () => nextCode_('HangHoa', 'HH', 4), []);
      log_(user, 'Thêm mặt hàng', moi.MaHH, ten + ' · máy cũ thu về');
      return moi;
    });
  }
  const nk = luuChungTu(token, 'NK', { Ngay: ngay, DoiTac: kh.TenKH, GhiChu: 'Thu cũ đổi mới' + (soDH ? ' · đơn ' + soDH : '') + (m.GhiChu ? ' · ' + m.GhiChu : ''),
    lines: [{ MaHH: h.MaHH, TenHang: h.TenHang, Model: h.Model || '', DVT: h.DVT || 'Máy', SoLuong: 1, IMEI: m.IMEI, GiaVon: m.GiaThu }] }).doc;
  const pt = luuThuTien(token, { Ngay: ngay, SoDH: soDH, MaKH: kh.MaKH, TenKH: kh.TenKH, SoTien: m.GiaThu, HinhThuc: HT_MAY_CU, GhiChu: 'Máy cũ ' + h.TenHang + ' · IMEI ' + m.IMEI });
  return { MaHH: h.MaHH, TenHang: h.TenHang, IMEI: m.IMEI, GiaThu: m.GiaThu, SoPK: nk.SoPK, SoPT: pt.SoPT };
}

/** Web: thu máy cũ trừ vào một đơn đã lập. o = { SoDH, TenHang, IMEI, GiaThu, GiaLe, GhiChu } */
function thuMayCu(token, o) {
  const user = user_(token);
  o = o || {};
  const dh = findObj_('DonHang', o.SoDH);
  if (!dh) throw new Error('Không tìm thấy đơn hàng ' + o.SoDH + '.');
  if (dh.TrangThai === 'Hủy') throw new Error('Đơn đã hủy.');
  const m = chuanMayCu_([o])[0];
  const da = readTable_('ThuTien').filter(p => p.SoDH === dh.SoDH).reduce((s, p) => s + (+p.SoTien || 0), 0), con = (+dh.TongCong || 0) - da;
  if (m.GiaThu > con) throw new Error('Giá thu máy cũ (' + m.GiaThu + ' đ) lớn hơn số còn nợ của đơn (' + con + ' đ).');
  const kh = findObj_('KhachHang', dh.MaKH) || { MaKH: dh.MaKH, TenKH: dh.TenKH };
  return ghiMayCu_(token, user, kh, dh.SoDH, m, homNay_());
}

// ===== Bảo hành – sửa chữa =====
const homNayCong_ = n => Utilities.formatDate(new Date(Date.parse(homNay_() + 'T12:00:00Z') + n * 864e5), 'UTC', 'yyyy-MM-dd');

/** Một phiếu gửi cho app / web: thêm còn bao nhiêu ngày tới hẹn (âm = quá hẹn), danh sách ảnh */
function phieuSua_(r, homNay) {
  const n = r.NgayHen && r.TrangThai !== 'Đã trả khách' ? Math.round((Date.parse(String(r.NgayHen).slice(0, 10)) - Date.parse(homNay)) / 864e5) : null;
  return Object.assign({}, r, { ChiPhi: +r.ChiPhi || 0, SDT: String(r.SDT || ''), IMEI: String(r.IMEI || ''), Anh: String(r.Anh || '').split(',').filter(Boolean), conNgay: n });
}

/**
 * Danh sách phiếu (app): tìm theo số phiếu, IMEI, tên / SĐT khách, tên máy. o.loc: 'dang' chưa trả khách (mặc định), 'hen' đến / quá hẹn,
 * 'xong' sửa xong chờ khách lấy, 'tra' đã trả, 'tat' tất cả. Mới nhận trước; tối đa 50.
 */
function dsSuaChua(token, q, o) {
  user_(token);
  o = o || {};
  const homNay = homNay_(), raw = String(q == null ? '' : q).trim().slice(0, 60), chu = boDau_(raw), so = raw.replace(/\D/g, '');
  const LOC = {
    dang: r => r.TrangThai !== 'Đã trả khách', tra: r => r.TrangThai === 'Đã trả khách', xong: r => r.TrangThai === 'Đã sửa xong' || r.TrangThai === 'Không sửa được',
    hen: r => r.TrangThai !== 'Đã trả khách' && r.conNgay !== null && r.conNgay <= 0, tat: () => true,
  };
  let ds = readTable_('SuaChua').map(r => phieuSua_(r, homNay)).filter(LOC[o.loc] || LOC.dang);
  if (raw) ds = ds.filter(r => boDau_([r.SoPN, r.TenKH, r.TenMay, r.IMEI, r.TinhTrang].join(' ')).indexOf(chu) >= 0 || (so.length >= 4 && (r.SDT.replace(/\D/g, '').indexOf(so) >= 0 || r.IMEI.indexOf(so) >= 0)));
  ds.sort((a, b) => String(b.NgayNhan + b.SoPN).localeCompare(String(a.NgayNhan + a.SoPN)));
  return { tong: ds.length, ds: ds.slice(0, 50) };
}

function chiTietSuaChua(token, soPN) {
  user_(token);
  const r = findObj_('SuaChua', soPN);
  if (!r) throw new Error('Không tìm thấy phiếu ' + soPN + '.');
  return phieuSua_(r, homNay_());
}

/**
 * Nhận máy / sửa phiếu. p = { SoPN?, Loai, MaKH | khachMoi: { TenKH, SDT }, TenMay, IMEI, TinhTrang, PhuKien, MatKhauMay, NgayHen, TrangThai, ChiPhi, KetQua }.
 * Phiếu mới: ngày nhận hôm nay, trạng thái "Đã nhận". Trả máy dùng traMaySua (để lập đơn dịch vụ, thu tiền).
 */
function luuSuaChua(token, p) {
  const user = user_(token);
  p = Object.assign({}, p || {});
  const cu = p.SoPN ? findObj_('SuaChua', p.SoPN) : null;
  if (p.SoPN && !cu) throw new Error('Không tìm thấy phiếu ' + p.SoPN + '.');
  if (cu && cu.TrangThai === 'Đã trả khách' && user.vaiTro !== 'admin') throw new Error('Phiếu đã trả khách: chỉ quản trị được sửa.');
  const s = (k, n) => String(p[k] == null ? (cu ? cu[k] || '' : '') : p[k]).trim().slice(0, n);
  const o = {
    SoPN: p.SoPN || '', Loai: LOAI_SUA.indexOf(p.Loai) >= 0 ? p.Loai : cu ? cu.Loai : LOAI_SUA[1], TenMay: s('TenMay', 150),
    IMEI: s('IMEI', 40).toUpperCase().replace(/[\s.\-]/g, ''), TinhTrang: s('TinhTrang', 500), PhuKien: s('PhuKien', 200), MatKhauMay: s('MatKhauMay', 60),
    NgayHen: p.NgayHen === '' ? '' : ngayHopLe_(p.NgayHen) || (cu ? cu.NgayHen : homNayCong_(3)), KetQua: s('KetQua', 500),
    ChiPhi: p.ChiPhi == null ? (cu ? +cu.ChiPhi || 0 : 0) : Math.max(0, Math.round(+p.ChiPhi || 0)),
  };
  if (!o.TenMay && !o.IMEI) throw new Error('Nhập tên máy hoặc IMEI/serial.');
  if (!o.TinhTrang) throw new Error('Nhập tình trạng / lỗi máy khách báo.');
  const tt = p.TrangThai || (cu ? cu.TrangThai : TT_SUA[0]);
  if (TT_SUA.indexOf(tt) < 0) throw new Error('Trạng thái không hợp lệ.');
  if (tt === 'Đã trả khách' && (!cu || cu.TrangThai !== 'Đã trả khách')) throw new Error('Trả máy cho khách bằng nút "Trả máy" để ghi chi phí, thu tiền.');
  o.TrangThai = tt;
  // Khách: giữ khách của phiếu cũ, chọn khách có sẵn, hoặc khách mới (trùng SĐT dùng khách cũ)
  let kh = null;
  if (p.MaKH) { kh = findObj_('KhachHang', p.MaKH); if (!kh) throw new Error('Không tìm thấy khách hàng ' + p.MaKH + '.'); }
  else if (p.khachMoi && String(p.khachMoi.TenKH || '').trim()) {
    const so = String(p.khachMoi.SDT || '').replace(/\D/g, '');
    kh = so.length >= 8 ? readTable_('KhachHang').find(k => sdtList_(k.SDT).indexOf(so) >= 0) : null;
    if (!kh) kh = luuKhach(token, { TenKH: String(p.khachMoi.TenKH).trim().slice(0, 150), SDT: String(p.khachMoi.SDT || '').trim().slice(0, 40) });
  } else if (!cu) throw new Error('Chọn khách hoặc nhập tên, số điện thoại khách.');
  Object.assign(o, kh ? { MaKH: kh.MaKH, TenKH: kh.TenKH, SDT: String(kh.SDT || '') } : { MaKH: cu.MaKH, TenKH: cu.TenKH, SDT: String(cu.SDT || '') });
  return withLock_(() => {
    const moi = !o.SoPN, now = now_();
    if (moi) Object.assign(o, { NgayNhan: homNay_(), NguoiTao: user.ten, NgayTao: now });
    o.NgaySua = now;
    upsert_('SuaChua', o, () => nextSo_('SuaChua', 'PN', homNay_()), ['NgayNhan', 'NguoiTao', 'NgayTao', 'NgayTra', 'SoDH', 'Anh']);
    log_(user, moi ? 'Nhận máy ' + o.Loai.toLowerCase() : 'Sửa phiếu ' + o.Loai.toLowerCase(), o.SoPN, [o.TenKH, o.TenMay, o.IMEI, o.TrangThai].filter(Boolean).join(' · '));
    return phieuSua_(findObj_('SuaChua', o.SoPN), homNay_());
  });
}

/**
 * Trả máy cho khách. o = { ChiPhi, KetQua, thu: { SoTien, HinhThuc } }. Có chi phí: lập đơn dịch vụ (bán nhanh, có phiếu thu nếu khách trả ngay),
 * số đơn ghi vào phiếu. Bảo hành miễn phí: chỉ đổi trạng thái.
 */
function traMaySua(token, soPN, o) {
  const user = user_(token);
  o = o || {};
  const r = findObj_('SuaChua', soPN);
  if (!r) throw new Error('Không tìm thấy phiếu ' + soPN + '.');
  if (r.TrangThai === 'Đã trả khách') throw new Error('Phiếu ' + soPN + ' đã trả khách.');
  const chiPhi = Math.max(0, Math.round(+(o.ChiPhi == null ? r.ChiPhi : o.ChiPhi) || 0));
  let don = null;
  if (chiPhi > 0) {
    if (!r.MaKH) throw new Error('Phiếu chưa có khách trong danh sách: không lập được đơn thu tiền.');
    const thu = o.thu || {};
    don = banNhanh(token, { MaKH: r.MaKH, VAT: 0, GhiChu: 'Phiếu ' + r.Loai.toLowerCase() + ' ' + soPN,
      lines: [{ TenHang: (r.Loai === 'Bảo hành' ? 'Bảo hành' : 'Sửa chữa') + ' ' + (r.TenMay || r.IMEI) + ' – phiếu ' + soPN, SoLuong: 1, DonGia: chiPhi, DVT: 'Lần' }],
      thu: { SoTien: Math.min(chiPhi, Math.max(0, Math.round(+thu.SoTien || 0))), HinhThuc: thu.HinhThuc || 'Tiền mặt' } });
  }
  return withLock_(() => {
    const sh = sheet_('SuaChua'), row = findRow_(sh, soPN), cur = rowObj_(sh, row);
    Object.assign(cur, { TrangThai: 'Đã trả khách', NgayTra: now_(), ChiPhi: chiPhi, KetQua: String(o.KetQua == null ? cur.KetQua || '' : o.KetQua).trim().slice(0, 500), SoDH: don ? don.SoDH : cur.SoDH || '', NgaySua: now_() });
    writeRow_(sh, row, cur);
    log_(user, 'Trả máy cho khách', soPN, [cur.TenKH, cur.TenMay, chiPhi ? chiPhi + ' đ · đơn ' + cur.SoDH : 'không tính phí'].join(' · '));
    return Object.assign(phieuSua_(cur, homNay_()), { don: don });
  });
}

/** Thêm một ảnh (JPEG base64) vào phiếu: lưu file trong thư mục Drive "Sửa chữa - <cửa hàng>", tối đa 6 ảnh mỗi phiếu */
function luuAnhSuaChua(token, soPN, base64) {
  const user = user_(token);
  const r = findObj_('SuaChua', soPN);
  if (!r) throw new Error('Không tìm thấy phiếu ' + soPN + '.');
  const co = String(r.Anh || '').split(',').filter(Boolean);
  if (co.length >= 6) throw new Error('Mỗi phiếu lưu tối đa 6 ảnh.');
  const b64 = String(base64 || '').replace(/^data:image\/\w+;base64,/, '');
  if (!b64 || b64.length > 4 * 1024 * 1024) throw new Error('Ảnh trống hoặc quá lớn (tối đa khoảng 3 MB).');
  let id;
  try {
    const ten = 'Sửa chữa - ' + cuaHang_(CUR_SHOP).ten, it = DriveApp.getFoldersByName(ten), thuMuc = it.hasNext() ? it.next() : DriveApp.createFolder(ten);
    id = thuMuc.createFile(Utilities.newBlob(Utilities.base64Decode(b64), 'image/jpeg', soPN.replace(/\//g, '-') + ' - ' + (co.length + 1) + '.jpg')).getId();
  } catch (e) { throw new Error('Chưa lưu được ảnh vào Google Drive (cần cấp quyền Drive cho script: chạy caiDat một lần). ' + (e && e.message || e)); }
  return withLock_(() => {
    const sh = sheet_('SuaChua'), row = findRow_(sh, soPN), cur = rowObj_(sh, row);
    cur.Anh = String(cur.Anh || '').split(',').filter(Boolean).concat(id).join(',');
    writeRow_(sh, row, cur);
    log_(user, 'Thêm ảnh phiếu sửa chữa', soPN, '');
    return phieuSua_(cur, homNay_());
  });
}

/** Việc cần làm (Tổng quan, email sáng): máy đến / quá hẹn trả, máy đã sửa xong chờ khách lấy */
function suaCanLam_(homNay) {
  return readTable_('SuaChua').map(r => phieuSua_(r, homNay))
    .filter(r => r.TrangThai !== 'Đã trả khách' && ((r.conNgay !== null && r.conNgay <= 0) || r.TrangThai === 'Đã sửa xong' || r.TrangThai === 'Không sửa được'))
    .sort((a, b) => String(a.NgayHen || '9').localeCompare(String(b.NgayHen || '9')))
    .map(r => ({ SoPN: r.SoPN, MaKH: r.MaKH, TenKH: r.TenKH, SDT: r.SDT, TenMay: r.TenMay, TrangThai: r.TrangThai, NgayHen: String(r.NgayHen || '').slice(0, 10), n: r.conNgay }));
}
