// ===== Thu cũ đổi mới, nhận bảo hành – sửa chữa =====
// Thu cũ đổi mới (đơn lên đời): máy cũ của khách được định giá (GiaThu) và ghi thành một dòng của chính đơn bán máy mới, số lượng −1,
// đơn giá = giá thu, tên kèm IMEI. Tổng đơn là số khách trả thật (vd 25tr − 5tr = 20tr): doanh số, công nợ, "đã thu" đều theo số này.
// Máy cũ vào kho ngay bằng một phiếu nhập "Thu cũ đổi mới · đơn …" (giá nhập = giá thu, mặt hàng nhóm "Máy cũ" tạo theo tên máy), nên lãi của dòng
// máy cũ bằng 0; lãi máy cũ chỉ có khi bán lại máy đó. Khách trả máy mới trong NGAY_GIU_MAY_CU ngày thì nhận lại đúng máy cũ (traHang).
// Đơn cũ ghi máy cũ bằng phiếu thu hình thức "Thu máy cũ" (bản trước) vẫn giữ nguyên: công nợ đúng, sổ quỹ bỏ qua phiếu đó.
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
    const ten = String(m.TenHang || '').trim().slice(0, 150), imei = gonMa_(m.IMEI);
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

/** Mặt hàng "… (máy cũ)" theo tên máy; chưa có thì tạo (hai quầy cùng thu một mẫu máy chỉ tạo một mặt hàng) */
function hangMayCu_(user, m) {
  const ten = /máy cũ/i.test(m.TenHang) ? m.TenHang : m.TenHang + ' (máy cũ)';
  const timHang = () => readTable_('HangHoa').find(x => x.NhomHang === NHOM_MAY_CU && boDau_(x.TenHang) === boDau_(ten));
  return timHang() || withLock_(() => { // tìm lại trong khóa
    const co = timHang();
    if (co) return co;
    const moi = upsert_('HangHoa', { TenHang: ten, NhomHang: NHOM_MAY_CU, PhanLoai: NHOM_MAY_CU, DVT: 'Máy', GiaLe: m.GiaLe, GhiChu: 'Tạo khi thu cũ đổi mới' }, () => nextCode_('HangHoa', 'HH', 4), []);
    log_(user, 'Thêm mặt hàng', moi.MaHH, ten + ' · máy cũ thu về');
    return moi;
  });
}

/** Phiếu nhập kho các máy cũ của một đơn lên đời (m.h = mặt hàng máy cũ). Giá nhập = giá thu. */
function nhapMayCu_(token, kh, soDH, ds, ngay) {
  const ghiChu = ds.map(m => m.GhiChu).filter(Boolean).join('; ');
  return luuChungTu(token, 'NK', { Ngay: ngay, DoiTac: kh.TenKH, GhiChu: 'Thu cũ đổi mới · đơn ' + soDH + (ghiChu ? ' · ' + ghiChu : ''),
    lines: ds.map(m => ({ MaHH: m.h.MaHH, TenHang: m.h.TenHang, Model: m.h.Model || '', DVT: m.h.DVT || 'Máy', SoLuong: 1, IMEI: m.IMEI, GiaVon: m.GiaThu })) }).doc;
}
/** Dòng máy cũ của đơn: số lượng −1, đơn giá = giá thu, tên kèm IMEI để đơn (và bản in) có đủ IMEI máy cũ */
const dongMayCu_ = m => ({ MaHH: m.h.MaHH, TenHang: m.h.TenHang + ' · IMEI ' + m.IMEI, Model: m.h.Model || '', DVT: m.h.DVT || 'Máy', XuatXu: '', SoLuong: -1, LoaiGia: 'Thu máy cũ', DonGia: m.GiaThu });
const ketQuaMayCu_ = (m, soPK) => ({ MaHH: m.h.MaHH, TenHang: m.h.TenHang, IMEI: m.IMEI, GiaThu: m.GiaThu, SoPK: soPK });
function boPhieuKho_(user, soPK, lyDo) {
  withLock_(() => { deleteWhere_('PhieuKhoCT', soPK); deleteWhere_('PhieuKho', soPK); log_(user, lyDo, soPK, ''); });
}

/** Web: thu máy cũ cho một đơn đã lập: nhập kho máy cũ, thêm dòng máy cũ (−1) vào đơn. o = { SoDH, TenHang, IMEI, GiaThu, GiaLe, GhiChu } */
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
  m.h = hangMayCu_(user, m);
  const nk = nhapMayCu_(token, kh, dh.SoDH, [m], homNay_());
  try {
    const lines = readTable_('DonHangCT').filter(l => String(l.SoDH) === String(dh.SoDH)).sort((a, b) => a.STT - b.STT).map(l => { const x = Object.assign({}, l); delete x.SoDH; return x; });
    ghiThuCu_(() => luuChungTu(token, 'DH', Object.assign({}, dh, { lines: lines.concat([dongMayCu_(m)]) })));
  } catch (e) { // ghi đơn lỗi: bỏ phiếu nhập vừa lập, kẻo máy nằm trong kho mà đơn không trừ (và không thu lại được vì IMEI đã có trong kho)
    boPhieuKho_(user, nk.SoPK, 'Bỏ phiếu nhập máy cũ (ghi đơn lỗi)');
    throw e;
  }
  return ketQuaMayCu_(m, nk.SoPK);
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
    const so = sdtVN_(p.khachMoi.SDT);
    kh = so.length >= 8 ? readTable_('KhachHang').find(k => sdtList_(k.SDT).indexOf(so) >= 0) : null;
    if (!kh) kh = luuKhach(token, { TenKH: String(p.khachMoi.TenKH).trim().slice(0, 150), SDT: String(p.khachMoi.SDT || '').trim().slice(0, 40) });
  } else if (!cu) throw new Error('Chọn khách hoặc nhập tên, số điện thoại khách.');
  Object.assign(o, kh ? { MaKH: kh.MaKH, TenKH: kh.TenKH, SDT: String(kh.SDT || '') } : { MaKH: cu.MaKH, TenKH: cu.TenKH, SDT: String(cu.SDT || '') });
  return withLock_(() => {
    const moi = !o.SoPN, now = now_();
    // đọc lại trong khóa: máy khác vừa bấm Trả máy thì không ghi đè trạng thái cũ (phiếu hiện lại như đang sửa, trả lần nữa là tính tiền hai lần)
    const hien = moi ? null : findObj_('SuaChua', o.SoPN);
    if (hien && hien.TrangThai === 'Đã trả khách' && cu.TrangThai !== 'Đã trả khách') throw new Error('Phiếu ' + o.SoPN + ' vừa được trả khách ở máy khác. Tải lại phiếu rồi sửa.');
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
  // Giữ phiếu trong khóa trước khi lập đơn: bấm hai lần / hai máy cùng trả không tạo hai đơn, hai phiếu thu
  const giu = 'traSua_' + CUR_SHOP + '_' + soPN;
  const r = withLock_(() => {
    const p = findObj_('SuaChua', soPN);
    if (!p) throw new Error('Không tìm thấy phiếu ' + soPN + '.');
    if (p.TrangThai === 'Đã trả khách') throw new Error('Phiếu ' + soPN + ' đã trả khách.');
    if (!giuCho_(giu)) throw new Error('Phiếu ' + soPN + ' đang được trả ở máy khác, đợi vài giây rồi tải lại.');
    return p;
  });
  try { return traMaySuaDaGiu_(token, user, soPN, o, r); } finally { boGiu_(giu); }
}
// Giữ chỗ một việc dài (gọi trong withLock_): false nếu lần gọi khác đang giữ. CacheService lỗi thì cho chạy như khi chưa có giữ chỗ.
function giuCho_(khoa) {
  try { const c = CacheService.getScriptCache(); if (c.get(khoa)) return false; c.put(khoa, '1', 120); } catch (e) {}
  return true;
}
function boGiu_(khoa) { try { CacheService.getScriptCache().remove(khoa); } catch (e) {} }
function traMaySuaDaGiu_(token, user, soPN, o, r) {
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

// ===== Kiểm kho theo IMEI =====
/** Máy còn trong kho: IMEI → { MaHH, TenHang, SoPK, Ngay } (lần cuối có mã này là phiếu nhập) */
function imeiTrongKho_() {
  const pk = {}, cuoi = {};
  readTable_('PhieuKho').forEach(p => { pk[p.SoPK] = p; });
  readTable_('PhieuKhoCT').forEach(l => {
    const p = pk[l.SoPK];
    if (!p || !l.IMEI) return;
    const k = String(p.Ngay) + p.NgayTao;
    imeiList_(l.IMEI).forEach(x => { const g = gonMa_(x); if (!cuoi[g] || k >= cuoi[g].k) cuoi[g] = { k: k, p: p, l: l, ma: x }; }); // khóa: mã gọn; IMEI: mã như đã lưu
  });
  const kho = {}, daXuat = {};
  Object.keys(cuoi).forEach(x => {
    const c = cuoi[x];
    if (c.p.Loai === 'Nhập') kho[x] = { IMEI: c.ma, MaHH: c.l.MaHH, TenHang: c.l.TenHang, SoPK: c.p.SoPK, Ngay: c.p.Ngay };
    else daXuat[x] = { IMEI: c.ma, MaHH: c.l.MaHH, TenHang: c.l.TenHang, SoPK: c.p.SoPK, Ngay: c.p.Ngay, DoiTac: c.p.DoiTac || '' };
  });
  return { kho: kho, daXuat: daXuat };
}

/**
 * So các IMEI/serial quét được trên kệ với tồn kho: khop (đúng, còn trong kho), thieu (trong kho mà chưa quét thấy), la (quét thấy mà kho
 * không có: đã bán / chưa nhập). o.MaHH: chỉ kiểm một mặt hàng. o.luu: ghi kết quả vào nhật ký.
 */
function kiemKho(token, ds, o) {
  const user = user_(token);
  o = o || {};
  const quet = [];
  (Array.isArray(ds) ? ds : []).forEach(x => { const m = gonMa_(x); if (m.length >= 4 && quet.indexOf(m) < 0) quet.push(m); });
  if (quet.length > 3000) throw new Error('Mỗi lần kiểm tối đa 3000 mã.');
  const { kho, daXuat } = imeiTrongKho_(), daThay = {};
  // kho / daXuat theo mã gọn (như mã quét); kết quả ghi IMEI như đã lưu
  const tim = (g, x) => (g[x] ? x : /^S[A-Z0-9]{10,12}$/.test(x) && g[x.slice(1)] ? x.slice(1) : ''); // mã vạch serial Apple có chữ S đầu; không cắt mã khác
  const khop = [], la = [];
  quet.forEach(x => {
    const m = tim(kho, x);
    if (m && (!o.MaHH || kho[m].MaHH === o.MaHH)) { daThay[m] = 1; khop.push(Object.assign({}, kho[m])); return; }
    const xm = tim(daXuat, x), xu = xm && daXuat[xm];
    la.push(m ? Object.assign({ IMEI: m, lyDo: 'Khác mặt hàng đang kiểm' }, kho[m]) : xu ? Object.assign({ IMEI: x, lyDo: 'Đã xuất ở phiếu ' + xu.SoPK + (xu.DoiTac ? ' (' + xu.DoiTac + ')' : '') }, xu) : { IMEI: x, MaHH: '', TenHang: '', lyDo: 'Chưa nhập kho' });
  });
  const thieu = Object.keys(kho).filter(x => !daThay[x] && (!o.MaHH || kho[x].MaHH === o.MaHH)).map(x => Object.assign({}, kho[x]))
    .sort((a, b) => String(a.TenHang).localeCompare(String(b.TenHang), 'vi') || a.IMEI.localeCompare(b.IMEI));
  const hang = {};
  const dong = (r, k) => { const h = hang[r.MaHH] || (hang[r.MaHH] = { MaHH: r.MaHH, TenHang: r.TenHang, trongKho: 0, thay: 0 }); h[k]++; };
  khop.forEach(r => { dong(r, 'thay'); dong(r, 'trongKho'); });
  thieu.forEach(r => dong(r, 'trongKho'));
  const kq = { soQuet: quet.length, khop: khop.length, thieu: thieu, la: la, theoHang: Object.values(hang).sort((a, b) => (a.thay - a.trongKho) - (b.thay - b.trongKho)) };
  if (o.luu) log_(user, 'Kiểm kho theo IMEI', o.MaHH || 'Tất cả', 'quét ' + quet.length + ' · khớp ' + khop.length + ' · thiếu ' + thieu.length + ' · lạ ' + la.length
    + (thieu.length ? ' · thiếu: ' + thieu.slice(0, 20).map(r => r.IMEI).join(', ') : ''));
  return kq;
}

// ===== Khách trả hàng =====
/**
 * Khách trả lại hàng của một đơn. o = { SoDH, lines: [{ MaHH, TenHang, SoLuong, IMEI }], hoan: { SoTien, HinhThuc }, GhiChu, xemTruoc }.
 * Hàng có mã khách đã nhận thì nhập lại kho (phiếu nhập ghi số đơn, giá vốn bình quân không đổi), phần đơn chưa giao chỉ bớt khỏi đơn; đơn giảm số lượng (trả hết thì hủy đơn) nên doanh thu, công nợ đúng;
 * tiền trả lại khách ghi thành phiếu thu âm (sổ quỹ giảm). xemTruoc: chỉ tính tổng mới và số tiền trả lại tối đa, chưa ghi gì.
 */
function traHang(token, o) {
  o = o || {};
  if (o.xemTruoc) return traHang_(token, o);
  user_(token);
  // Giữ đơn trong khóa trước khi kiểm tra và ghi: hai lần gửi cùng lúc không nhập kho hai lần, không trả tiền hai lần
  const giu = 'traHang_' + CUR_SHOP + '_' + o.SoDH;
  withLock_(() => { if (!giuCho_(giu)) throw new Error('Đơn ' + o.SoDH + ' đang được nhận trả ở máy khác, đợi vài giây rồi tải lại.'); });
  try { return traHang_(token, o); } finally { boGiu_(giu); }
}
function traHang_(token, o) {
  const user = user_(token);
  const dh = findObj_('DonHang', o.SoDH);
  if (!dh) throw new Error('Không tìm thấy đơn hàng ' + o.SoDH + '.');
  if (dh.TrangThai === 'Hủy') throw new Error('Đơn đã hủy.');
  const cu = readTable_('DonHangCT').filter(l => String(l.SoDH) === String(dh.SoDH)).sort((a, b) => a.STT - b.STT);
  const moi = cu.map(l => Object.assign({}, l, { SoLuong: +l.SoLuong || 0 }));
  // Đơn lên đời (có dòng máy cũ −1): chỉ nhận trả trong NGAY_GIU_MAY_CU ngày kể từ ngày bán; quá hạn thì không nhận trả vì bất kỳ lý do gì
  const amDon = moi.filter(l => l.SoLuong < 0), hanTra = amDon.length ? congNgay_(dh.Ngay, NGAY_GIU_MAY_CU) : '';
  if (hanTra && homNay_() > hanTra) throw new Error('Đơn lên đời ' + dh.SoDH + ' bán ngày ' + dmy_(dh.Ngay) + ': chỉ nhận trả trong ' + NGAY_GIU_MAY_CU + ' ngày (đến hết ' + dmy_(hanTra) + '), nay đã quá hạn.');
  const tra = (Array.isArray(o.lines) ? o.lines : []).filter(l => l && (+l.SoLuong || imeiList_(l.IMEI).length));
  if (!tra.length) throw new Error('Chọn hàng khách trả.');
  const hang = {};
  readTable_('HangHoa').forEach(h => { hang[h.MaHH] = h; });
  // Hàng đang ở chỗ khách theo mặt hàng = đã giao − đã trả về kho; trong đó bao nhiêu máy có IMEI (lần cuối của IMEI là phiếu xuất của đơn này)
  const pkDon = phieuTheoDon_(dh.SoDH), { kho, daXuat } = imeiTrongKho_(), giu = {};
  const giuCua = ma => giu[ma] || (giu[ma] = { sl: 0, imei: 0 });
  readTable_('PhieuKhoCT').forEach(l => { if (pkDon[l.SoPK] && l.MaHH) giuCua(l.MaHH).sl += pkDon[l.SoPK] * (+l.SoLuong || 0); });
  Object.keys(daXuat).forEach(x => { if (pkDon[daXuat[x].SoPK] === 1 && daXuat[x].MaHH) giuCua(daXuat[x].MaHH).imei++; });
  const nhap = tra.map((t, i) => {
    const im = imeiList_(t.IMEI), sl = im.length || Math.round(+t.SoLuong || 0);
    // Đơn có cùng mặt hàng ở nhiều dòng (giá khác nhau): t.STT chỉ đúng dòng khách trả; không có thì lấy dòng đầu còn hàng
    const l = moi.find(x => t.STT && +x.STT === +t.STT && x.SoLuong > 0) || moi.find(x => (t.MaHH ? x.MaHH === t.MaHH : !x.MaHH && x.TenHang === t.TenHang) && x.SoLuong > 0);
    if (!l || (t.MaHH && l.MaHH !== t.MaHH)) throw new Error('Dòng trả ' + (i + 1) + ': đơn không có ' + (t.TenHang || t.MaHH) + '.');
    if (!(sl > 0) || sl > l.SoLuong) throw new Error('Dòng trả ' + (i + 1) + ': số lượng trả phải từ 1 đến ' + l.SoLuong + '.');
    if (im.length && !l.MaHH) throw new Error('Dòng trả ' + (i + 1) + ': ' + l.TenHang + ' không phải hàng trong kho, không ghi IMEI/serial.');
    im.forEach(x => {
      const g = gonMa_(x), c = daXuat[g], k = kho[g]; // kho / daXuat theo mã gọn
      if (k && pkDon[k.SoPK] === -1) throw new Error('IMEI/serial ' + x + ' khách đã trả, đã nhập ở phiếu ' + k.SoPK + '.');
      if (!c || pkDon[c.SoPK] !== 1) throw new Error('IMEI/serial ' + x + ' không có trong các lần giao của đơn ' + dh.SoDH + ' (hoặc máy đã về kho, đã bán cho khách khác).');
      if (c.MaHH !== l.MaHH) throw new Error('IMEI/serial ' + x + ' là máy ' + c.TenHang + ', không phải ' + l.TenHang + '.');
    });
    // Số trả trước hết bớt phần đơn chưa giao (không nhập kho); phần còn lại là hàng khách đã nhận, nhập lại kho
    let vaoKho = 0;
    if (l.MaHH) {
      const g = giuCua(l.MaHH), dat = moi.filter(x => x.MaHH === l.MaHH && x.SoLuong > 0).reduce((s, x) => s + x.SoLuong, 0);
      vaoKho = im.length || Math.max(0, sl - Math.max(0, dat - g.sl));
      if (!im.length && vaoKho > 0 && (vaoKho > g.sl - g.imei || laMay_(hang[l.MaHH]))) throw new Error('Dòng trả ' + (i + 1) + ': ' + l.TenHang + ' đã giao kèm IMEI/serial – ghi IMEI/serial của máy khách trả.');
      g.sl -= vaoKho; g.imei -= im.length;
    }
    l.SoLuong -= sl;
    return { MaHH: l.MaHH, TenHang: l.TenHang, Model: l.Model, DVT: l.DVT, SoLuong: vaoKho, IMEI: im.join(', '), tra: sl };
  });
  // Trả máy (hoặc trả hết hàng) của đơn lên đời: bắt buộc trả lại khách đúng các máy cũ đã thu, theo IMEI ở phiếu nhập "Thu cũ đổi mới · đơn …"
  const hetHang = !moi.some(l => l.SoLuong > 0);
  const traCu = amDon.length && (hetHang || nhap.some(l => laMay_(hang[l.MaHH]))) ? amDon : [];
  const mayTra = [];
  if (traCu.length) {
    const nkCu = {}, dau = 'Thu cũ đổi mới · đơn ' + dh.SoDH;
    readTable_('PhieuKho').forEach(p => { const gc = String(p.GhiChu || ''); if (laNhapThuCu_(p) && (gc === dau || gc.indexOf(dau + ' · ') === 0)) nkCu[p.SoPK] = p; });
    const conCho = {}; // IMEI máy cũ của đơn theo mặt hàng (còn chưa ghép với dòng nào)
    readTable_('PhieuKhoCT').forEach(l => { if (nkCu[l.SoPK]) imeiList_(l.IMEI).forEach(x => { (conCho[l.MaHH] = conCho[l.MaHH] || []).push({ ma: x, SoPK: l.SoPK, l: l }); }); });
    traCu.forEach(l => {
      for (let n = 0; n < -l.SoLuong; n++) {
        const c = (conCho[l.MaHH] || []).shift();
        if (!c) throw new Error('Không tìm thấy phiếu nhập máy cũ của dòng "' + l.TenHang + '" để trả lại khách.');
        const k = kho[gonMa_(c.ma)];
        if (!k || k.SoPK !== c.SoPK) throw new Error('Máy cũ ' + c.ma + ' không còn trong kho' + (daXuat[gonMa_(c.ma)] ? ' (đã xuất ở phiếu ' + daXuat[gonMa_(c.ma)].SoPK + ')' : '') + ', không trả lại khách được.');
        mayTra.push({ MaHH: l.MaHH, TenHang: c.l.TenHang, Model: c.l.Model || '', DVT: c.l.DVT || 'Máy', IMEI: c.ma, GiaThu: Math.round(+l.DonGia || 0) });
      }
      l.SoLuong = 0;
    });
  }
  const conLai = moi.filter(l => l.SoLuong !== 0), huy = !conLai.some(l => l.SoLuong > 0);
  const cong = conLai.reduce((s, l) => s + Math.round(l.SoLuong * (+l.DonGia || 0)), 0), giam = Math.min(Math.max(0, cong), +dh.GiamGia || 0);
  const tongMoi = huy ? 0 : (cong - giam) + Math.round((cong - giam) * (+dh.VAT || 0) / 100);
  if (tongMoi < 0) throw new Error('Phần đơn còn lại nhỏ hơn giá máy cũ đã trừ: khách trả cả máy thì cửa hàng trả lại máy cũ.');
  const daThu = readTable_('ThuTien').filter(p => String(p.SoDH) === String(dh.SoDH)).reduce((s, p) => s + (+p.SoTien || 0), 0);
  const hoanToiDa = Math.max(0, daThu - tongMoi);
  const mayCuTra = mayTra.map(m => ({ TenHang: m.TenHang, IMEI: m.IMEI, GiaThu: m.GiaThu }));
  if (o.xemTruoc) return { SoDH: dh.SoDH, tongCu: +dh.TongCong || 0, tongMoi: tongMoi, daThu: daThu, hoanToiDa: hoanToiDa, huy: huy, mayCuTra: mayCuTra, hanTra: hanTra };
  const hoan = Math.round(+(o.hoan && o.hoan.SoTien) || 0);
  if (hoan < 0 || hoan > hoanToiDa) throw new Error('Tiền trả lại khách tối đa ' + hoanToiDa + ' đ (đã thu ' + daThu + ' đ, đơn còn ' + tongMoi + ' đ).');
  const ngay = homNay_(), ghiChu = String(o.GhiChu || '').trim().slice(0, 300);
  const coMa = nhap.filter(l => l.MaHH && l.SoLuong > 0).map(l => ({ MaHH: l.MaHH, TenHang: l.TenHang, Model: l.Model, DVT: l.DVT, SoLuong: l.SoLuong, IMEI: l.IMEI }));
  // Bốn bước ghi (nhập hàng trả, trả máy cũ, sửa đơn, phiếu trả tiền): bước nào lỗi thì gỡ các bước đã ghi, khách bấm lại được
  let pk = null, pkCu = null, don = null, pt = null;
  try {
    if (coMa.length) pk = luuChungTu(token, 'NK', { Ngay: ngay, SoDH: dh.SoDH, DoiTac: dh.TenKH, GhiChu: 'Khách trả hàng · đơn ' + dh.SoDH + (ghiChu ? ' · ' + ghiChu : ''), lines: coMa }).doc;
    if (mayTra.length) pkCu = ghiThuCu_(() => luuChungTu(token, 'XK', { Ngay: ngay, DoiTac: dh.TenKH, GhiChu: 'Trả lại máy cũ · đơn ' + dh.SoDH,
      lines: mayTra.map(m => ({ MaHH: m.MaHH, TenHang: m.TenHang, Model: m.Model, DVT: m.DVT, SoLuong: 1, IMEI: m.IMEI })) }).doc);
    const ghiDon = Object.assign({}, dh, huy ? { TrangThai: 'Hủy', GhiChu: [dh.GhiChu, 'Khách trả hết hàng ' + ngay].filter(Boolean).join(' · ') } : {});
    don = ghiThuCu_(() => luuChungTu(token, 'DH', Object.assign(ghiDon, { lines: (huy ? cu : conLai).map(l => { const x = Object.assign({}, l); delete x.SoDH; return x; }) })).doc);
    if (hoan > 0) {
      pt = withLock_(() => {
        const p = { Ngay: ngay, MaKH: dh.MaKH, TenKH: dh.TenKH, SoDH: dh.SoDH, SoTien: -hoan, HinhThuc: String(o.hoan.HinhThuc || 'Tiền mặt').slice(0, 60), GhiChu: 'Trả lại tiền khách trả hàng', NguoiTao: user.ten, NgayTao: now_() };
        upsert_('ThuTien', p, () => nextSo_('ThuTien', 'PT', ngay), []);
        return p;
      });
    }
  } catch (e) {
    try {
      if (don) ghiThuCu_(() => luuChungTu(token, 'DH', Object.assign({}, dh, { lines: cu.map(l => { const x = Object.assign({}, l); delete x.SoDH; return x; }) })));
      if (pkCu) boPhieuKho_(user, pkCu.SoPK, 'Bỏ phiếu trả máy cũ (trả hàng lỗi)');
      if (pk) boPhieuKho_(user, pk.SoPK, 'Bỏ phiếu nhập hàng trả (trả hàng lỗi)');
    } catch (e2) { throw new Error('Nhận trả hàng lỗi giữa chừng và chưa gỡ hết được (' + (e2 && e2.message || e2) + '). Kiểm tra lại đơn ' + dh.SoDH + ' và phiếu kho. Lỗi gốc: ' + (e && e.message || e)); }
    throw new Error('Chưa ghi gì (đã gỡ phần vừa ghi): ' + (e && e.message || e));
  }
  log_(user, 'Khách trả hàng', dh.SoDH, nhap.map(l => l.TenHang + ' ×' + l.tra + (l.IMEI ? ' (' + l.IMEI + ')' : '')).join(', ')
    + (mayTra.length ? ' · trả lại máy cũ ' + mayTra.map(m => m.IMEI).join(', ') : '') + (hoan ? ' · trả lại ' + hoan + ' đ' : '') + (huy ? ' · hủy đơn' : ''));
  return { SoDH: dh.SoDH, TrangThai: don.TrangThai, TongCong: don.TongCong, SoPK: pk ? pk.SoPK : '', SoPKCu: pkCu ? pkCu.SoPK : '', mayCuTra: mayCuTra, SoPT: pt ? pt.SoPT : '', hoan: hoan, huy: huy };
}

// ===== Phiếu bán hàng gửi khách (PDF) =====
/** Phiếu bán hàng của một đơn: hàng, IMEI, hạn bảo hành, giảm giá, đã trả, còn nợ. Trả { ten, base64 } để app chia sẻ qua Zalo, Messenger… */
function phieuBanHangPdf(token, soDH) {
  user_(token);
  const dh = findObj_('DonHang', soDH);
  if (!dh) throw new Error('Không tìm thấy đơn hàng ' + soDH + '.');
  const ch = cuaHang_(CUR_SHOP), c = ch.congTy, han = hanBaoHanh_(), e = s => String(s == null ? '' : s).replace(/[&<>"]/g, x => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[x]));
  const dmy = s => /^\d{4}-\d{2}-\d{2}/.test(String(s)) ? String(s).slice(8, 10) + '/' + String(s).slice(5, 7) + '/' + String(s).slice(0, 4) : '';
  const lines = readTable_('DonHangCT').filter(l => String(l.SoDH) === String(soDH)).sort((a, b) => a.STT - b.STT);
  const xk = {};
  readTable_('PhieuKho').forEach(p => { if (p.Loai === 'Xuất' && String(p.SoDH) === String(soDH)) xk[p.SoPK] = p; });
  const may = readTable_('PhieuKhoCT').filter(l => xk[l.SoPK] && l.IMEI).map(l => ({ TenHang: l.TenHang, IMEI: l.IMEI, HetHan: han(xk[l.SoPK].Ngay, l.MaHH) }));
  const thu = readTable_('ThuTien').filter(p => String(p.SoDH) === String(soDH));
  const daThu = thu.reduce((s, p) => s + (+p.SoTien || 0), 0), no = (+dh.TongCong || 0) - daThu, cong = lines.reduce((s, l) => s + (+l.ThanhTien || 0), 0);
  const dongTien = (t, v, dam) => '<tr><td colspan="3" style="text-align:right">' + t + '</td><td style="text-align:right">' + (dam ? '<b>' + tien_(v) + '</b>' : tien_(v)) + '</td></tr>';
  const html = '<html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;font-size:12px;color:#111}h1{font-size:18px;text-align:center;margin:12px 0 4px}'
    + 'table{width:100%;border-collapse:collapse;margin-top:8px}td,th{border:1px solid #bbb;padding:5px 6px}th{background:#f2f4f7}.nho{color:#555;font-size:11px}</style></head><body>'
    + '<div><b>' + e(c.ten || ch.ten) + '</b><br>' + e((c.diaChi || []).join(', ')) + '<br>' + e(c.lienHe) + '</div>'
    + '<h1>PHIẾU BÁN HÀNG</h1><div style="text-align:center">Số ' + e(dh.SoDH) + ' · ngày ' + dmy(dh.Ngay) + '</div>'
    + '<p>Khách hàng: <b>' + e(dh.TenKH) + '</b>' + (dh.SDT ? ' · ' + e(dh.SDT) : '') + (dh.DiaChi ? '<br>Địa chỉ: ' + e(dh.DiaChi) : '') + '</p>'
    + '<table><tr><th>Hàng hóa</th><th>SL</th><th>Đơn giá</th><th>Thành tiền</th></tr>'
    + lines.map(l => '<tr><td>' + e(l.TenHang) + '</td><td style="text-align:center">' + e(l.SoLuong) + '</td><td style="text-align:right">' + tien_(l.DonGia) + '</td><td style="text-align:right">' + tien_(l.ThanhTien) + '</td></tr>').join('')
    + (+dh.GiamGia ? dongTien('Cộng tiền hàng', cong) + dongTien('Giảm giá', -dh.GiamGia) : '') + (+dh.VAT ? dongTien('Thuế GTGT ' + dh.VAT + '%', dh.TienVAT) : '')
    + dongTien('Tổng cộng', dh.TongCong, true) + dongTien('Đã thanh toán', daThu) + (no > 0 ? dongTien('Còn phải trả', no, true) : '') + '</table>'
    + (may.length ? '<p><b>Bảo hành</b></p><table><tr><th>Máy</th><th>IMEI / serial</th><th>Bảo hành đến</th></tr>' + may.map(m => '<tr><td>' + e(m.TenHang) + '</td><td>' + e(m.IMEI) + '</td><td>' + (m.HetHan ? dmy(m.HetHan) : 'Không bảo hành') + '</td></tr>').join('') + '</table>' : '')
    + '<p class="nho">Cảm ơn Quý khách đã mua hàng tại ' + e(ch.ten) + '. Vui lòng giữ phiếu này để được bảo hành.</p></body></html>';
  const ten = 'Phieu ban hang ' + String(soDH).replace(/\//g, '-') + '.pdf';
  const pdf = Utilities.newBlob(html, 'text/html', ten.replace('.pdf', '.html')).getAs('application/pdf');
  return { ten: ten, base64: Utilities.base64Encode(pdf.getBytes()) };
}

// ===== Nhắc khách sắp hết bảo hành =====
/** Máy đã bán còn 0–15 ngày bảo hành (Tổng quan app, email sáng): mời khách quay lại kiểm tra máy trước khi hết hạn */
function sapHetBaoHanh_(homNay, ngayToiDa) {
  const toiDa = ngayToiDa || 15;
  return dsBaoHanh_().filter(x => x.HetHan && x.MaKH).map(x => Object.assign(x, { n: Math.round((Date.parse(x.HetHan) - Date.parse(homNay)) / 864e5) }))
    .filter(x => x.n >= 0 && x.n <= toiDa).sort((a, b) => a.n - b.n)
    .map(x => ({ MaKH: x.MaKH, TenKH: x.TenKH, SDT: String(x.SDT || ''), TenHang: x.TenHang, IMEI: x.IMEI, HetHan: x.HetHan, n: x.n }));
}
