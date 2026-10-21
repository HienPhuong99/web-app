// ===== API JSON cho app điện thoại (thư mục mobile/) =====
// App gửi POST tới link web app với nội dung JSON { may, fn, args } và nhận { ok, result } hoặc { ok: false, error }.
// Đăng nhập trên điện thoại cấp một "mã máy" dùng lâu dài (lưu trong Keychain/Keystore của máy), thay cho phiên 6 giờ của web.
// Sheet chỉ lưu SHA-256 của mã máy. Mã máy hết hiệu lực khi đăng xuất trên máy đó, hoặc khi tài khoản bị khóa, đổi quyền,
// đặt lại / đổi mật khẩu (cùng cơ chế thu hồi phiên của web: rev_<tài khoản>).
// Mỗi hàm gọi được qua API vẫn tự kiểm tra quyền bằng user_(token) như khi gọi từ web.

const MAY_TOI_DA = 10; // số điện thoại đăng nhập cùng lúc của một tài khoản; quá thì máy dùng lâu nhất bị đăng xuất

// Hàm app được gọi (đều nhận token phiên ở tham số đầu và tự kiểm tra quyền). Hàm không có ở đây thì không gọi được qua API.
function apiHam_() {
  return {
    taiDuLieu: taiDuLieu, tongQuanMay: tongQuanMay, traBaoHanh: traBaoHanh, dsBaoHanh: dsBaoHanh,
    layChungTu: layChungTu, theKho: theKho, baoCaoHang: baoCaoHang, layHopDong: layHopDong,
    luuKhach: luuKhach, luuChungTu: luuChungTu, luuThuTien: luuThuTien, doiMatKhau: doiMatKhau,
    cauHinhMay: cauHinhMay, khoMay: khoMay, traMaKho: traMaKho, dsMaTon: dsMaTon, dsKhachMay: dsKhachMay, chiTietKhach: chiTietKhach, banNhanh: banNhanh,
    dsHopDongMay: dsHopDongMay, taiPdfHopDong: taiPdfHopDong, dsThietBi: dsThietBi, xoaThietBi: xoaThietBi, thuThongBao: thuThongBao, chiTietTongQuan: chiTietTongQuan,
    soQuyMay: soQuyMay, luuPhieuChi: luuPhieuChi, luuGiaiNgan: luuGiaiNgan, loiNhuan: loiNhuan,
    kiemKho: kiemKho, traHang: traHang, phieuBanHangPdf: phieuBanHangPdf, dsSuaChua: dsSuaChua, chiTietSuaChua: chiTietSuaChua, luuSuaChua: luuSuaChua, traMaySua: traMaySua, thuMuaMayCu: thuMuaMayCu, luuAnhSuaChua: luuAnhSuaChua, anhSuaChua: anhSuaChua, phieuNhanMayPdf: phieuNhanMayPdf,
  };
}

// Hàm chỉ đọc: kết quả được ghi nhớ (ketQuaNho_ trong Code.gs) tới khi có dữ liệu mới. App gửi moi: true (kéo xuống làm mới) để lấy số mới nhất.
const DOC_NHO = ['tongQuanMay', 'chiTietTongQuan', 'khoMay', 'dsKhachMay', 'chiTietKhach', 'dsHopDongMay', 'theKho', 'cauHinhMay', 'traMaKho', 'dsMaTon', 'traBaoHanh', 'soQuyMay', 'loiNhuan', 'dsSuaChua', 'chiTietSuaChua'];

let MAY_HIEN_TAI_ = ''; // mã băm của điện thoại đang gọi API: để đánh dấu "máy này" và gửi thông báo thử

function doPost(e) {
  let out;
  try {
    let q;
    try { q = JSON.parse(e && e.postData && e.postData.contents || ''); } catch (x) { throw new Error('Yêu cầu không hợp lệ.'); }
    if (!q || typeof q !== 'object') throw new Error('Yêu cầu không hợp lệ.');
    const r = goiApi_(q);
    out = { ok: true, result: r === undefined ? null : r };
  } catch (err) {
    out = { ok: false, error: String(err && err.message || err) };
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

function goiApi_(q) {
  const fn = String(q.fn || ''), args = Array.isArray(q.args) ? q.args : [];
  if (fn === 'thongTinDangNhap') return thongTinDangNhap();
  const cache = CacheService.getScriptCache();
  if (cache.get('schema') !== SCHEMA) nangCap_(cache); // bản mới có bảng mới (vd. ThietBi) mà app gọi trước khi có ai mở web
  if (fn === 'dangNhapMay') return dangNhapMay_(args[0], args[1], args[2]);
  if (fn === 'dangXuatMay') return dangXuatMay_(q.may);
  const ham = apiHam_();
  if (fn !== 'datThongBao' && !Object.prototype.hasOwnProperty.call(ham, fn)) throw new Error('Không có chức năng "' + fn.slice(0, 40) + '".');
  const token = phienMay_(q.may);
  MAY_HIEN_TAI_ = bamMay_(q.may);
  // Lệnh ghi kèm mã lần gửi (maGhi): mạng chậm, app báo lỗi mà máy chủ đã ghi rồi thì lần gửi lại cùng mã nhận kết quả cũ, không ghi thêm đơn / phiếu
  const maGhi = GHI_MOT_LAN_.indexOf(fn) >= 0 && typeof q.maGhi === 'string' && /^[A-Za-z0-9-]{8,64}$/.test(q.maGhi) ? 'ghi_' + MAY_HIEN_TAI_.slice(0, 20) + '_' + q.maGhi : '';
  if (maGhi) {
    const daCo = withLock_(() => { const c = CacheService.getScriptCache(), v = c.get(maGhi); if (!v) c.put(maGhi, DANG_GHI_, 300); return v; });
    if (daCo === DANG_GHI_) throw new Error('Lần gửi trước đang được máy chủ xử lý. Đợi vài giây rồi xem lại đơn / phiếu thu trước khi gửi lại.');
    if (daCo) { MAY_HIEN_TAI_ = ''; return JSON.parse(daCo); }
  }
  let r;
  try {
    r = docMotLan_(() => {
      if (fn === 'datThongBao') return datThongBao_(token, args[0]);
      const chay = () => ham[fn].apply(null, [token].concat(args));
      if (DOC_NHO.indexOf(fn) < 0) return chay();
      const user = user_(token); // kiểm tra phiên trước khi trả kết quả ghi nhớ
      return ketQuaNho_([fn, args, user.u, user.vaiTro, homNay_()], q.moi === true, chay);
    });
  }
  catch (e) { // phiên bị thu hồi (khóa tài khoản, đặt lại mật khẩu…): xóa luôn máy này khỏi danh sách
    if (maGhi) boGiu_(maGhi); // lỗi thật (chưa ghi): cho gửi lại
    if (e && e.message === 'HET_PHIEN') withLock_(() => xoaMay_(bamMay_(q.may)));
    throw e;
  } finally { MAY_HIEN_TAI_ = ''; }
  if (fn === 'doiMatKhau') { // tự đổi mật khẩu thu hồi các máy khác; máy đang dùng giữ mốc mới để không bị đăng xuất
    const s = CacheService.getScriptCache().get('ss_' + token);
    if (s) capNhatMay_(bamMay_(q.may), { CapLuc: String(JSON.parse(s).t) });
  }
  if (maGhi) { try { CacheService.getScriptCache().put(maGhi, JSON.stringify(r === undefined ? null : r), 600); } catch (e) { boGiu_(maGhi); } }
  return r;
}
const GHI_MOT_LAN_ = ['banNhanh', 'luuThuTien', 'luuPhieuChi', 'luuGiaiNgan', 'traHang', 'traMaySua', 'luuSuaChua', 'thuMuaMayCu'], DANG_GHI_ = '…đang ghi';

function bamMay_(may) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(may), Utilities.Charset.UTF_8)
    .map(b => ((b + 256) % 256).toString(16).padStart(2, '0')).join('');
}

/** Đăng nhập trên điện thoại: trả { may, user, cuaHang }. Sai mật khẩu quá 5 lần bị chặn 10 phút như web. */
function dangNhapMay_(tenDangNhap, matKhau, tenMay) {
  const dn = dangNhap(tenDangNhap, matKhau);
  const may = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
  const ma = bamMay_(may), u = String(dn.user.u).toLowerCase();
  withLock_(() => {
    const sh = sheet_('ThietBi');
    ghiDong_(sh, [toRow_(sh, { MaMay: ma, TenDangNhap: u, TenMay: String(tenMay == null ? '' : tenMay).trim().slice(0, 60) || 'Điện thoại',
      CapLuc: String(dn.user.t), NgayTao: now_(), LanCuoi: now_() })]);
    // Quá số máy cho phép: đăng xuất máy lâu không dùng nhất
    const cua = readTable_('ThietBi').filter(r => String(r.TenDangNhap).toLowerCase() === u)
      .sort((a, b) => String(b.LanCuoi).localeCompare(String(a.LanCuoi)) || (+b.CapLuc || 0) - (+a.CapLuc || 0));
    cua.slice(MAY_TOI_DA).forEach(r => { if (r.MaMay !== ma) xoaMay_(r.MaMay); });
  });
  CacheService.getScriptCache().put('mp_' + ma, dn.token, SESSION_TTL);
  CUR_SHOP = dn.user.shop;
  log_(dn.user, 'Đăng nhập app điện thoại', u, String(tenMay || '').slice(0, 60));
  const ch = cuaHang_(dn.user.shop);
  return { may: may, user: dn.user, cuaHang: { ten: ch.ten, moTa: ch.moTa } };
}

function dangXuatMay_(may) {
  if (!may) return;
  const ma = bamMay_(may);
  withLock_(() => xoaMay_(ma));
}

function xoaMay_(ma) {
  const cache = CacheService.getScriptCache(), tok = cache.get('mp_' + ma);
  if (tok) cache.remove('ss_' + tok);
  cache.remove('mp_' + ma);
  deleteWhere_('ThietBi', ma);
}

function capNhatMay_(ma, o) {
  withLock_(() => {
    const sh = sheet_('ThietBi'), r = findRow_(sh, ma);
    if (r) writeRow_(sh, r, Object.assign(rowObj_(sh, r), o));
  });
}

/**
 * Đổi mã máy thành token phiên (dùng lại user_ để kiểm tra quyền và thu hồi). Phiên đã có trong bộ nhớ đệm thì dùng luôn;
 * hết thì dựng lại từ trang ThietBi và TaiKhoan (lấy quyền mới nhất), đồng thời ghi lần dùng cuối.
 */
function phienMay_(may) {
  if (typeof may !== 'string' || may.length < 32) throw new Error('HET_PHIEN');
  const cache = CacheService.getScriptCache(), ma = bamMay_(may);
  const tok = cache.get('mp_' + ma);
  if (tok && cache.get('ss_' + tok)) return tok; // user_() trong hàm được gọi vẫn kiểm tra thu hồi
  // Dựng lại trong khóa: quản trị đăng xuất máy này từ xa (xoaMay_, cũng trong khóa) cùng lúc thì không cấp lại phiên sau khi dòng đã xóa
  return withLock_(() => {
    const tb = readTable_('ThietBi').find(r => r.MaMay === ma);
    if (!tb) throw new Error('HET_PHIEN');
    const u = String(tb.TenDangNhap).toLowerCase();
    const tk = readTable_('TaiKhoan').find(r => String(r.TenDangNhap).toLowerCase() === u);
    const cap = +tb.CapLuc || 0, rev = revOf_(u, cache);
    if (!tk || tk.TrangThai === 'Khóa' || (rev && !(cap > rev))) { xoaMay_(ma); throw new Error('HET_PHIEN'); }
    const token = Utilities.getUuid();
    cache.put('ss_' + token, JSON.stringify(phienMoi_(tk, cap)), SESSION_TTL);
    cache.put('mp_' + ma, token, SESSION_TTL);
    const sh = sheet_('ThietBi'), r = findRow_(sh, ma); // khóa không lồng được: ghi lần dùng cuối ngay đây thay vì capNhatMay_
    if (r) writeRow_(sh, r, Object.assign(rowObj_(sh, r), { LanCuoi: now_() }));
    return token;
  });
}

/** Màn hình Tổng quan của app: doanh số, tiền thu hôm nay, 7 ngày gần nhất và các việc cần làm (cùng cách tính với email sáng). */
function tongQuanMay(token) {
  const user = user_(token);
  const du = tongHopSang_(homNay_()), ch = cuaHang_(CUR_SHOP);
  return {
    user: { u: user.u, ten: user.ten, vaiTro: user.vaiTro }, cuaHang: { ten: ch.ten, moTa: ch.moTa },
    homNay: du.homNay, ban: du.homNayBan, thu: du.homNayThu, traLai: du.homNayTien.traLai, mayCu: du.homNayTien.mayCu, homQua: du.homQuaBan, ban7: du.ban7,
    hopDong: du.hopDong.slice(0, 20), dot: du.dot.slice(0, 20), donTre: du.donTre.slice(0, 20), hang: du.hang.slice(0, 20), suaChua: du.suaChua.slice(0, 20), sapHetBH: du.sapHetBH.slice(0, 20),
    soMuc: du.soMuc, no: { soKhach: du.no.soKhach, tong: du.no.tong, top: du.no.top },
    lai: user.vaiTro === 'admin' ? loiNhuanKy_(du.homNay, du.homNay).tong : null, // lãi gộp hôm nay: chỉ quản trị
  };
}

/**
 * Chi tiết một số liệu trên Tổng quan của app.
 * loai 'ngay': đơn hàng và phiếu thu của một ngày (ngay = yyyy-MM-dd, mặc định hôm nay), kèm tổng; ngày trước / sau để lật.
 * loai 'no': mọi khách còn nợ, nhiều nhất trước.
 */
function chiTietTongQuan(token, loai, ngay) {
  user_(token);
  if (loai === 'no') { // chỉ đọc đơn, phiếu thu, khách – không chạy cả bản tổng hợp sáng
    const khach = {};
    readTable_('KhachHang').forEach(k => { khach[k.MaKH] = k; });
    const ds = dsNo_(readTable_('DonHang').filter(d => d.TrangThai !== 'Hủy'), readTable_('ThuTien'), khach);
    return { tong: ds.reduce((s, x) => s + x.tien, 0), ds: ds };
  }
  if (loai !== 'ngay') throw new Error('Không có số liệu này.');
  const n = ngay == null || ngay === '' ? homNay_() : ngayHopLe_(ngay);
  if (!n) throw new Error('Ngày không hợp lệ.');
  const thuDon = {}, tatCaThu = readTable_('ThuTien');
  const thu = tatCaThu.filter(p => String(p.Ngay).slice(0, 10) === n).map(p => ({ SoPT: p.SoPT, MaKH: p.MaKH, TenKH: p.TenKH, SoDH: p.SoDH || '', SoTien: +p.SoTien || 0, HinhThuc: p.HinhThuc || '', GhiChu: p.GhiChu || '' }));
  tatCaThu.forEach(p => { if (p.SoDH) thuDon[p.SoDH] = (thuDon[p.SoDH] || 0) + (+p.SoTien || 0); });
  const don = readTable_('DonHang').filter(d => String(d.Ngay).slice(0, 10) === n)
    .map(d => ({ SoDH: d.SoDH, MaKH: d.MaKH, TenKH: d.TenKH, TongCong: +d.TongCong || 0, daThu: thuDon[d.SoDH] || 0, TrangThai: d.TrangThai || 'Chờ giao', gio: String(d.NgayTao || '').slice(11, 16) }))
    .sort((a, b) => String(b.gio + b.SoDH).localeCompare(String(a.gio + a.SoDH)));
  const song = don.filter(d => d.TrangThai !== 'Hủy'), lech = k => Utilities.formatDate(new Date(Date.parse(n + 'T12:00:00Z') + k * 864e5), 'UTC', 'yyyy-MM-dd');
  const tienNgay = tienNgay_(tatCaThu, giaThuCuTheoNgay_(readTable_('PhieuKho'), readTable_('PhieuKhoCT')), n); // đã thu = tiền thật, như Tổng quan
  return { ngay: n, homNay: homNay_(), truoc: lech(-1), sau: n < homNay_() ? lech(1) : '', don: don, thu: thu,
    tong: { don: song.length, tien: song.reduce((s, d) => s + d.TongCong, 0), thu: tienNgay.thu, traLai: tienNgay.traLai, mayCu: tienNgay.mayCu, huy: don.length - song.length } };
}

// Lọc danh sách theo chữ gõ bằng tìm kiếm thông minh (TimKiem.gs): bỏ dấu, viết liền, viết tắt, chữ cái đầu. them(x): điều kiện khớp
// riêng (số điện thoại, IMEI). Không có dòng nào khớp thì mới thử gần đúng (gõ sai chính tả). Giữ thứ tự ds.
function locTim_(ds, raw, text, them) {
  const pt = phanTichTim_(raw);
  if (!pt.length) return ds;
  const ban = ds.map(x => banTim_(text(x)));
  const kq = ds.filter((x, i) => (them && them(x)) || diemTim_(pt, ban[i], false) > 0);
  return kq.length ? kq : ds.filter((x, i) => diemTim_(pt, ban[i], true) > 0);
}
const boDau_ = s => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();

/**
 * Tra bảo hành theo IMEI/serial (quét mã vạch hoặc gõ một phần), số điện thoại hoặc tên khách (không cần dấu).
 * Trả { q, tong, ds } với tối đa 30 máy mới giao nhất; mỗi máy có IMEIKhop (mã khớp), ConHan, ConNgay (âm = đã hết hạn).
 */
function traBaoHanh(token, q) {
  const raw = String(q == null ? '' : q).trim().slice(0, 60);
  const ma = gonMa_(raw);
  if (ma.length < 3) throw new Error('Nhập ít nhất 3 ký tự: IMEI/serial, số điện thoại hoặc tên khách.');
  const ds = dsBaoHanh(token), homNay = homNay_();
  // Mã vạch serial trên hộp máy Apple thường có chữ S ở đầu
  const maThu = /^S[A-Z0-9]{10,12}$/.test(ma) ? [ma, ma.slice(1)] : [ma];
  const laSo = /^[\d\s.\-+]+$/.test(raw), so = sdtVN_(raw);
  const khopMa = x => imeiList_(x.IMEI).find(i => maThu.some(m => gonMa_(i).indexOf(m) >= 0));
  const sdt = x => laSo && so.length >= 4 && String(x.SDT || '').replace(/\D/g, '').indexOf(so) >= 0;
  const kq = [];
  // gõ chữ: theo tên khách (tìm kiếm thông minh; không theo tên máy kẻo ra cả kho) hoặc serial; gõ số: theo IMEI / số điện thoại
  (laSo ? ds.filter(x => khopMa(x) || sdt(x)) : locTim_(ds, raw, x => x.TenKH, x => !!khopMa(x))).forEach(x => {
    const khop = khopMa(x);
    const n = x.HetHan ? Math.round((Date.parse(x.HetHan) - Date.parse(homNay)) / 864e5) : null;
    kq.push(Object.assign({}, x, { IMEIKhop: khop || '', ConHan: n === null ? null : n >= 0, ConNgay: n }));
  });
  kq.sort((a, b) => String(b.Ngay + b.SoPK).localeCompare(String(a.Ngay + a.SoPK)));
  return { q: raw, tong: kq.length, ds: kq.slice(0, 30) };
}

// ===== Cài đặt dùng trên app: hình thức thu tiền, tài khoản nhận chuyển khoản (mã VietQR), VAT mặc định =====
function cauHinhMay(token) {
  const user = user_(token), c = cuaHang_(CUR_SHOP).congTy, nh = NGAN_HANG.find(b => b[0] === c.qrNganHang);
  return {
    hinhThuc: (c.hinhThuc || []).slice(), choGiaiNgan: Object.keys(choGiaiNgan_()), vat: +c.vatMacDinh || 0, quanTri: user.vaiTro === 'admin',
    qr: c.qrNganHang && c.qrSoTK ? { bin: c.qrNganHang, nganHang: nh ? nh[1] : c.qrNganHang, soTK: c.qrSoTK, chuTK: c.qrChuTK || '' } : null,
  };
}

// ===== Kho =====
/** Danh sách hàng kèm tồn kho (nhập − xuất), sắp theo tên. */
function khoMay(token) {
  user_(token);
  const ton = tonKho_();
  return readTable_('HangHoa').map(h => {
    const t = ton[h.MaHH] || { nhap: 0, xuat: 0 };
    return { MaHH: h.MaHH, TenHang: h.TenHang, Model: h.Model, NhomHang: h.NhomHang, DVT: h.DVT, GiaLe: +h.GiaLe || 0, GiaSi: +h.GiaSi || 0,
      TonToiThieu: +h.TonToiThieu || 0, nhap: t.nhap, xuat: t.xuat, ton: t.nhap - t.xuat };
  }).sort((a, b) => String(a.TenHang).localeCompare(String(b.TenHang), 'vi'));
}

/**
 * Một IMEI/serial đang ở đâu, theo phiếu kho gần nhất có mã đó: trongKho (lần cuối là nhập), daBan (lần cuối là xuất) hoặc chuaCo.
 * Dùng khi bán nhanh: quét IMEI là biết máy nào, giá bao nhiêu, đã bán chưa.
 */
function traMaKho(token, q) {
  user_(token);
  const ma = gonMa_(q).slice(0, 40);
  if (ma.length < 4) throw new Error('Nhập IMEI/serial (ít nhất 4 ký tự).');
  const maThu = /^S[A-Z0-9]{10,12}$/.test(ma) ? [ma, ma.slice(1)] : [ma]; // mã vạch serial Apple có chữ S đầu
  const pk = {}, hang = {};
  readTable_('PhieuKho').forEach(p => { pk[p.SoPK] = p; });
  readTable_('HangHoa').forEach(h => { hang[h.MaHH] = h; });
  let cuoi = null;
  readTable_('PhieuKhoCT').forEach(l => {
    const p = pk[l.SoPK];
    if (!p || !l.IMEI) return;
    const khop = imeiList_(l.IMEI).find(x => maThu.indexOf(gonMa_(x)) >= 0);
    const k = String(p.Ngay) + p.NgayTao;
    if (khop && (!cuoi || k >= cuoi.k)) cuoi = { k: k, p: p, l: l, khop: khop };
  });
  if (!cuoi) return { ma: maThu[maThu.length - 1], trangThai: 'chuaCo' };
  const h = hang[cuoi.l.MaHH] || {};
  return { ma: cuoi.khop, trangThai: cuoi.p.Loai === 'Nhập' ? 'trongKho' : 'daBan', MaHH: cuoi.l.MaHH, TenHang: h.TenHang || cuoi.l.TenHang,
    DVT: h.DVT || cuoi.l.DVT || '', GiaLe: +h.GiaLe || 0, SoPK: cuoi.p.SoPK, Ngay: cuoi.p.Ngay, SoDH: cuoi.p.SoDH || '', DoiTac: cuoi.p.DoiTac || '' };
}

// ===== Khách hàng =====
// Công nợ theo khách = đã mua (đơn không hủy) − đã thu, cùng cách tính với Tổng quan / email sáng
function noKhach_() {
  const mua = {}, da = {}, cuoi = {};
  readTable_('DonHang').forEach(d => {
    if (d.TrangThai === 'Hủy') return;
    mua[d.MaKH] = (mua[d.MaKH] || 0) + (+d.TongCong || 0);
    if (String(d.Ngay) > (cuoi[d.MaKH] || '')) cuoi[d.MaKH] = String(d.Ngay);
  });
  readTable_('ThuTien').forEach(p => { da[p.MaKH] = (da[p.MaKH] || 0) + (+p.SoTien || 0); });
  return { no: k => (mua[k] || 0) - (da[k] || 0), cuoi: k => cuoi[k] || '' };
}

/**
 * Sắp ds theo tiêu chí bang[sx] = [khoá(r), chiều mặc định]; chieu: 'giam' lớn trước (mới trước, Z → A), 'tang' nhỏ trước, không gửi thì theo chiều mặc định.
 * Khoá là số, hoặc chữ / ngày (so theo tiếng Việt). Khoá trống luôn xếp cuối dù đảo chiều. Bằng nhau thì theo phu(a, b) (không đảo chiều).
 */
function sapXep_(ds, bang, sx, chieu, phu) {
  const tc = bang[sx];
  if (!tc) return ds;
  const khoa = tc[0], dau = (chieu === 'giam' || chieu === 'tang' ? chieu : tc[1]) === 'giam' ? -1 : 1;
  const trong = v => v === '' || v == null;
  return ds.sort((a, b) => {
    const x = khoa(a), y = khoa(b);
    if (trong(x) || trong(y)) return (trong(x) - trong(y)) || (phu ? phu(a, b) : 0);
    const d = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'vi');
    return dau * d || (phu ? phu(a, b) : 0);
  });
}

/**
 * Tìm khách theo tên (không cần dấu), số điện thoại hoặc mã. Tối đa 50 khách.
 * o.loc: 'no' còn nợ, 'mua' đã mua, 'chua' chưa mua; o.sx: 'gan' lần mua cuối (mặc định gần nhất trước), 'ten' tên (A → Z), 'no' nợ (nhiều trước), 'moi' ngày thêm (mới trước);
 * o.chieu: 'giam' / 'tang' để đảo chiều. Không gửi o.sx (bản app cũ): có chữ tìm thì theo tên, không có thì mua gần đây.
 */
function dsKhachMay(token, q, o) {
  user_(token);
  o = o || {};
  const raw = String(q == null ? '' : q).trim().slice(0, 60), laSo = /^[\d\s.\-+]+$/.test(raw), so = sdtVN_(raw);
  const n = noKhach_();
  let ds = readTable_('KhachHang').map(k => ({ MaKH: k.MaKH, TenKH: k.TenKH, SDT: String(k.SDT || ''), DiaChi: k.DiaChi || '', no: n.no(k.MaKH), muaCuoi: n.cuoi(k.MaKH), NgayTao: String(k.NgayTao || '') }));
  if (raw) ds = laSo ? ds.filter(k => so.length >= 3 && k.SDT.replace(/\D/g, '').indexOf(so) >= 0) : locTim_(ds, raw, k => k.TenKH + ' ' + k.MaKH + ' ' + k.DiaChi);
  const loc = { no: k => k.no > 0, mua: k => !!k.muaCuoi, chua: k => !k.muaCuoi }[o.loc];
  if (loc) ds = ds.filter(loc);
  const ten = (a, b) => String(a.TenKH).localeCompare(String(b.TenKH), 'vi'), moiThem = (a, b) => b.NgayTao.localeCompare(a.NgayTao) || String(b.MaKH).localeCompare(String(a.MaKH));
  const SX = { gan: [k => k.muaCuoi, 'giam'], ten: [k => String(k.TenKH), 'tang'], no: [k => k.no, 'giam'], moi: [k => k.NgayTao, 'giam'] };
  const sx = SX[o.sx] ? o.sx : raw ? 'ten' : 'gan';
  sapXep_(ds, SX, sx, o.chieu, sx === 'no' ? ten : sx === 'moi' ? (a, b) => String(b.MaKH).localeCompare(String(a.MaKH)) : moiThem);
  return { tong: ds.length, ds: ds.slice(0, 50) };
}

/** Hồ sơ một khách: liên hệ, công nợ, đơn hàng, phiếu thu, máy đã mua (kèm hạn bảo hành), hợp đồng. */
function chiTietKhach(token, maKH) {
  user_(token);
  const kh = findObj_('KhachHang', maKH);
  if (!kh) throw new Error('Không tìm thấy khách hàng ' + maKH + '.');
  const moiTruoc = (a, b) => String(b.Ngay + (b.SoDH || b.SoPT || b.SoHD)).localeCompare(String(a.Ngay + (a.SoDH || a.SoPT || a.SoHD)));
  const thu = readTable_('ThuTien').filter(p => p.MaKH === maKH).sort(moiTruoc), daThuDon = {};
  thu.forEach(p => { if (p.SoDH) daThuDon[p.SoDH] = (daThuDon[p.SoDH] || 0) + (+p.SoTien || 0); });
  const don = readTable_('DonHang').filter(d => d.MaKH === maKH).sort(moiTruoc);
  const mua = don.filter(d => d.TrangThai !== 'Hủy').reduce((s, d) => s + (+d.TongCong || 0), 0), da = thu.reduce((s, p) => s + (+p.SoTien || 0), 0);
  const homNay = homNay_();
  const may = dsBaoHanh(token).filter(x => x.MaKH === maKH).map(x => {
    const n = x.HetHan ? Math.round((Date.parse(x.HetHan) - Date.parse(homNay)) / 864e5) : null;
    return Object.assign(x, { ConHan: n === null ? null : n >= 0, ConNgay: n });
  }).sort((a, b) => String(b.Ngay + b.SoPK).localeCompare(String(a.Ngay + a.SoPK)));
  const hopDong = readTable_('HopDong').filter(h => h.MaKH === maKH).sort(moiTruoc)
    .map(h => ({ SoHD: h.SoHD, Ngay: h.Ngay, LoaiHD: h.LoaiHD, TongCong: +h.TongCong || 0, NgayHetHan: h.NgayHetHan || '', TrangThai: h.TrangThai || '', coFile: !!h.FileId }));
  return {
    kh: { MaKH: kh.MaKH, TenKH: kh.TenKH, SDT: String(kh.SDT || ''), DiaChi: kh.DiaChi || '', Email: kh.Email || '', NguoiLienHe: kh.NguoiLienHe || '', GhiChu: kh.GhiChu || '' },
    mua: mua, da: da, no: mua - da,
    don: don.slice(0, 30).map(d => ({ SoDH: d.SoDH, Ngay: d.Ngay, TongCong: +d.TongCong || 0, TrangThai: d.TrangThai, daThu: daThuDon[d.SoDH] || 0 })),
    thu: thu.slice(0, 30).map(p => ({ SoPT: p.SoPT, Ngay: p.Ngay, SoTien: +p.SoTien || 0, HinhThuc: p.HinhThuc || '', SoDH: p.SoDH || '' })),
    may: may.slice(0, 30), hopDong: hopDong,
  };
}

// ===== Bán nhanh tại quầy =====
/**
 * Một lần bấm: lập đơn hàng, phiếu xuất kho (kèm IMEI) và phiếu thu nếu khách trả ngay. Ngày là hôm nay.
 * o = { MaKH | khachMoi: { TenKH, SDT }, lines: [{ MaHH, TenHang, SoLuong, DonGia, IMEI }], VAT, GhiChu, thu: { SoTien, HinhThuc }, thuCu: [{ TenHang, IMEI, GiaThu }] }
 * thuCu (đơn lên đời): mỗi máy cũ là một dòng −1 của đơn và vào kho bằng phiếu nhập; tổng đơn, giảm giá, VAT tính trên tiền hàng đã trừ máy cũ (DichVu.gs).
 * Kiểm tra hết trước khi ghi; phiếu xuất / nhập máy cũ vẫn lỗi thì xóa phần vừa ghi. Phiếu thu lỗi thì giữ đơn + phiếu kho và báo loiThu.
 * Trả về TongCong (đã trừ máy cũ) và daThu = tiền thật khách trả.
 */
function banNhanh(token, o) {
  const user = user_(token);
  o = o || {};
  const ngay = homNay_(), hang = {};
  readTable_('HangHoa').forEach(h => { hang[h.MaHH] = h; });
  const raw = Array.isArray(o.lines) ? o.lines : [];
  if (!raw.length) throw new Error('Chưa có hàng nào trong đơn.');
  if (raw.length > 50) throw new Error('Mỗi đơn tối đa 50 dòng hàng.');
  let imeis = [];
  const lines = raw.map((l, i) => {
    l = l || {};
    const h = l.MaHH ? hang[l.MaHH] : null;
    if (l.MaHH && !h) throw new Error('Dòng ' + (i + 1) + ': không tìm thấy mặt hàng ' + l.MaHH + '.');
    const ten = String(h ? h.TenHang : l.TenHang || '').trim().slice(0, 200);
    if (!ten) throw new Error('Dòng ' + (i + 1) + ': nhập tên hàng / dịch vụ.');
    const sl = +l.SoLuong, gia = Math.round(+l.DonGia);
    if (!(sl > 0) || Math.round(sl) !== sl) throw new Error('Dòng ' + (i + 1) + ': số lượng phải là số nguyên lớn hơn 0.');
    if (!(gia >= 0)) throw new Error('Dòng ' + (i + 1) + ': đơn giá không hợp lệ.');
    const im = imeiList_(l.IMEI);
    const sai = im.find(x => !/^[A-Z0-9][A-Z0-9._/-]{3,39}$/.test(x));
    if (sai) throw new Error('Dòng ' + (i + 1) + ': IMEI/serial "' + sai + '" không hợp lệ.');
    if (im.length && im.length !== sl) throw new Error('Dòng ' + (i + 1) + ': có ' + im.length + ' IMEI/serial nhưng số lượng là ' + sl + '.');
    if (laMay_(h) && im.length !== sl) throw new Error('Dòng ' + (i + 1) + ': ' + ten + ' là máy, ghi IMEI/serial của từng máy.');
    imeis = imeis.concat(im);
    return { MaHH: h ? h.MaHH : '', TenHang: ten, Model: h ? h.Model : '', DVT: h ? h.DVT : String(l.DVT || ''), XuatXu: h ? h.XuatXu : '',
      SoLuong: sl, LoaiGia: h && gia === (+h.GiaLe || 0) ? 'Giá lẻ' : 'Giá tùy chọn', DonGia: gia, IMEI: im.join(', ') };
  });
  const gon = imeis.map(gonMa_), lap = imeis.find((x, i) => gon.indexOf(gon[i]) !== i);
  if (lap) throw new Error('IMEI/serial ' + lap + ' bị lặp trong đơn.');
  if (imeis.length) kiemIMEI_('Xuất', '', imeis); // máy đã bán thì báo ngay, chưa ghi gì
  const mayCu = chuanMayCu_(o.thuCu), tongCu = mayCu.reduce((s, m) => s + m.GiaThu, 0); // thu cũ đổi mới: dòng −1 của đơn (DichVu.gs)
  const vat = Math.min(100, Math.max(0, +o.VAT || 0)), cong = lines.reduce((s, l) => s + Math.round(l.SoLuong * l.DonGia), 0) - tongCu;
  if (cong < 0) throw new Error('Giá máy cũ (' + tongCu + ' đ) lớn hơn tiền hàng (' + (cong + tongCu) + ' đ).');
  const giam = Math.min(cong, Math.max(0, Math.round(+o.GiamGia || 0))), tienHang = cong - giam; // giảm giá cả đơn, trước VAT
  // Tiền khách trả: một hình thức { SoTien, HinhThuc } hoặc trả kết hợp nhiều hình thức [{ SoTien, HinhThuc }, …] (vd 10tr tiền mặt + 20tr chuyển khoản)
  const tong = tienHang + Math.round(tienHang * vat / 100), dsThu = [];
  (Array.isArray(o.thu) ? o.thu : [o.thu || {}]).slice(0, 4).forEach(x => {
    x = x || {};
    const tien = Math.round(+x.SoTien || 0), ht = String(x.HinhThuc || 'Tiền mặt').trim().slice(0, 60) || 'Tiền mặt';
    if (tien < 0) throw new Error('Số tiền khách trả không được âm.');
    const cung = dsThu.find(y => y.HinhThuc === ht);
    if (cung) cung.SoTien += tien; else if (tien > 0) dsThu.push({ SoTien: tien, HinhThuc: ht });
  });
  const soThu = dsThu.reduce((s, x) => s + x.SoTien, 0);
  if (soThu < 0 || soThu > tong) throw new Error('Số tiền khách trả phải từ 0 đến ' + tong + ' đ' + (tongCu ? ' (đã trừ máy cũ ' + tongCu + ' đ)' : '') + '.');
  // Khách: chọn sẵn, hoặc khách mới (trùng số điện thoại với khách cũ thì dùng khách cũ)
  let kh, khMoi = false;
  if (o.MaKH) {
    kh = findObj_('KhachHang', o.MaKH);
    if (!kh) throw new Error('Không tìm thấy khách hàng ' + o.MaKH + '.');
  } else {
    const km = o.khachMoi || {}, ten = String(km.TenKH || '').trim().slice(0, 150), sdt = String(km.SDT || '').trim().slice(0, 40);
    if (!ten) throw new Error('Chọn khách hoặc nhập tên khách mới.');
    const so = sdtVN_(sdt), le = !so && boDau_(ten) === 'khach le'; // "Khách lẻ": mọi lần bán lẻ dùng chung một khách
    kh = so.length >= 8 ? readTable_('KhachHang').find(k => sdtList_(k.SDT).indexOf(so) >= 0)
      : le ? readTable_('KhachHang').find(k => boDau_(k.TenKH) === 'khach le') : null;
    if (!kh) { kh = luuKhach(token, { TenKH: ten, SDT: sdt }); khMoi = true; }
  }
  // Lập đơn / xuất kho lỗi: bỏ đơn vừa lập và khách vừa tạo trong lần này (chưa có giao dịch nào), thử lại không sinh khách trùng
  const boKhachMoi = () => { if (khMoi) deleteWhere_('KhachHang', kh.MaKH); };
  const ghiChu = String(o.GhiChu || '').trim().slice(0, 500);
  let dh;
  try {
    mayCu.forEach(m => { m.h = hangMayCu_(user, m); });
    dh = ghiThuCu_(() => luuChungTu(token, 'DH', { Ngay: ngay, MaKH: kh.MaKH, TenKH: kh.TenKH, SDT: kh.SDT || '', DiaChi: kh.DiaChi || '', NgayGiao: ngay, VAT: vat, GiamGia: giam, GhiChu: ghiChu,
      lines: lines.map(l => ({ MaHH: l.MaHH, TenHang: l.TenHang, Model: l.Model, DVT: l.DVT, XuatXu: l.XuatXu, SoLuong: l.SoLuong, LoaiGia: l.LoaiGia, DonGia: l.DonGia })).concat(mayCu.map(dongMayCu_)) }).doc);
  } catch (e) { withLock_(boKhachMoi); throw e; }
  let pk;
  try {
    pk = luuChungTu(token, 'XK', { Ngay: ngay, SoDH: dh.SoDH, DoiTac: kh.TenKH, GhiChu: 'Bán nhanh trên app',
      lines: lines.map(l => ({ MaHH: l.MaHH, TenHang: l.TenHang, Model: l.Model, DVT: l.DVT, SoLuong: l.SoLuong, IMEI: l.IMEI })) }).doc;
  } catch (e) {
    withLock_(() => { deleteWhere_('DonHang', dh.SoDH); deleteWhere_('DonHangCT', dh.SoDH); boKhachMoi(); });
    throw e;
  }
  let nk = null;
  if (mayCu.length) {
    try { nk = nhapMayCu_(token, kh, dh.SoDH, mayCu, ngay); }
    catch (e) {
      withLock_(() => { deleteWhere_('PhieuKhoCT', pk.SoPK); deleteWhere_('PhieuKho', pk.SoPK); deleteWhere_('DonHang', dh.SoDH); deleteWhere_('DonHangCT', dh.SoDH); boKhachMoi(); });
      throw e;
    }
  }
  const dsPT = [];
  let loiThu = '';
  dsThu.forEach(x => {
    if (loiThu) return;
    try { const pt = luuThuTien(token, { Ngay: ngay, SoDH: dh.SoDH, SoTien: x.SoTien, HinhThuc: x.HinhThuc, GhiChu: 'Bán nhanh trên app' }); dsPT.push({ SoPT: pt.SoPT, SoTien: x.SoTien, HinhThuc: x.HinhThuc }); }
    catch (e) { loiThu = String(e && e.message || e); }
  });
  return { SoDH: dh.SoDH, SoPK: pk.SoPK, SoPT: dsPT.map(x => x.SoPT).join(', '), dsPT: dsPT, TongCong: dh.TongCong, daThu: dsPT.reduce((s, x) => s + x.SoTien, 0), thuCu: mayCu.map(m => ketQuaMayCu_(m, nk.SoPK)), MaKH: kh.MaKH, TenKH: kh.TenKH,
    lines: pk.lines.map(l => ({ TenHang: l.TenHang, SoLuong: l.SoLuong, IMEI: l.IMEI, HetHan: l.HetHan })), loiThu: loiThu };
}

// ===== Hợp đồng =====
/**
 * Danh sách hợp đồng, tìm theo số hợp đồng / tên bên A / số điện thoại. File PDF tải bằng taiPdfHopDong.
 * o.loc: 'hieuLuc', 'sap' sắp hết hạn, 'het' đã hết hạn, 'nhap' soạn thảo, 'coFile'; o.sx: 'ngay' (mặc định, mới trước), 'giaTri' (cao trước), 'hetHan' (sớm trước, không có ngày hết hạn xếp cuối);
 * o.chieu: 'giam' / 'tang' để đảo chiều. Bản app cũ gửi 'moi' / 'cu' = ngày mới / cũ trước.
 */
function dsHopDongMay(token, q, o) {
  user_(token);
  o = o || {};
  const raw = String(q == null ? '' : q).trim().slice(0, 60), so = sdtVN_(raw), homNay = homNay_();
  let ds = readTable_('HopDong');
  if (raw) ds = locTim_(ds, raw, h => h.SoHD + ' ' + h.TenDN, h => so.length >= 4 && String(h.SDT || '').replace(/\D/g, '').indexOf(so) >= 0);
  const loc = {
    hieuLuc: h => h.TrangThai === 'Đang hiệu lực', sap: h => !!(hanHD_(h, homNay) || {}).sap, het: h => !!(hanHD_(h, homNay) || {}).het,
    nhap: h => h.TrangThai === 'Soạn thảo', coFile: h => !!h.FileId,
  }[o.loc];
  if (loc) ds = ds.filter(loc);
  const moi = (a, b) => String(b.Ngay + b.SoHD).localeCompare(String(a.Ngay + a.SoHD));
  const SX = { ngay: [h => String(h.Ngay + h.SoHD), 'giam'], giaTri: [h => +h.TongCong || 0, 'giam'], hetHan: [h => String(h.NgayHetHan || ''), 'tang'] };
  const cu = { moi: ['ngay', 'giam'], cu: ['ngay', 'tang'] }[o.sx];
  sapXep_(ds, SX, cu ? cu[0] : SX[o.sx] ? o.sx : 'ngay', cu ? cu[1] : o.chieu, moi);
  return { tong: ds.length, ds: ds.slice(0, 50).map(h => ({ SoHD: h.SoHD, Ngay: h.Ngay, LoaiHD: h.LoaiHD, TenDN: h.TenDN, MaKH: h.MaKH || '', SDT: String(h.SDT || ''),
    TongCong: +h.TongCong || 0, NgayHetHan: h.NgayHetHan || '', TrangThai: h.TrangThai || '', coFile: !!h.FileId, fileCu: h.FileCu === '1' || h.FileCu === 1 })) };
}

// ===== Điện thoại đã đăng nhập (dùng cả trên web và app) =====
/** Quản trị thấy mọi điện thoại; nhân viên thấy điện thoại của mình. mayNay = máy đang gọi (khi gọi từ app). */
function dsThietBi(token) {
  const user = user_(token), u = String(user.u).toLowerCase();
  return readTable_('ThietBi').filter(r => user.vaiTro === 'admin' || String(r.TenDangNhap).toLowerCase() === u)
    .map(r => ({ MaMay: r.MaMay, TenDangNhap: r.TenDangNhap, TenMay: r.TenMay, NgayTao: r.NgayTao, LanCuoi: r.LanCuoi, thongBao: !!r.PushToken, mayNay: !!MAY_HIEN_TAI_ && r.MaMay === MAY_HIEN_TAI_ }))
    .sort((a, b) => String(b.LanCuoi).localeCompare(String(a.LanCuoi)));
}

/** Đăng xuất một điện thoại từ xa (mất máy, nhân viên nghỉ). Nhân viên chỉ đăng xuất được máy của mình. */
function xoaThietBi(token, maMay) {
  const user = user_(token), r = readTable_('ThietBi').find(x => x.MaMay === String(maMay || ''));
  if (!r) throw new Error('Không tìm thấy điện thoại này (có thể đã đăng xuất).');
  if (user.vaiTro !== 'admin' && String(r.TenDangNhap).toLowerCase() !== String(user.u).toLowerCase()) throw new Error('Chỉ quản trị đăng xuất được điện thoại của người khác.');
  withLock_(() => xoaMay_(r.MaMay));
  log_(user, 'Đăng xuất điện thoại từ xa', r.TenDangNhap, r.TenMay);
}

// ===== Thông báo đẩy (Expo Push) =====
// Điện thoại bật thông báo thì app gửi mã nhận thông báo (Expo push token) lên, lưu ở cột PushToken của ThietBi.
// Mỗi sáng bộ hẹn giờ của email sáng (EmailSang.gs) gửi thêm một thông báo tóm tắt việc cần làm tới các máy đã bật.
const PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const PUSH_RE = /^Expo(nent)?PushToken\[[A-Za-z0-9_\-]{10,200}\]$/;

function datThongBao_(token, pushToken) {
  user_(token);
  const v = String(pushToken == null ? '' : pushToken).trim();
  if (v && !PUSH_RE.test(v)) throw new Error('Mã nhận thông báo không hợp lệ.');
  capNhatMay_(MAY_HIEN_TAI_, { PushToken: v });
  if (v) { try { withLock_(() => datHenGioEmailSang_()); } catch (e) { console.error('Chưa đặt được hẹn giờ thông báo sáng: ' + e); } }
  return { bat: !!v };
}

/** Gửi một thông báo thử tới chính điện thoại đang dùng. */
function thuThongBao(token) {
  user_(token);
  const r = readTable_('ThietBi').find(x => x.MaMay === MAY_HIEN_TAI_);
  if (!r || !r.PushToken) throw new Error('Máy này chưa bật thông báo.');
  const kq = guiPush_([{ to: r.PushToken, title: 'Thông báo thử', body: 'Điện thoại này đã nhận được thông báo từ ' + cuaHang_(CUR_SHOP).ten + '.', data: { url: '/' } }]);
  if (!kq.ok) throw new Error('Chưa gửi được thông báo: ' + kq.loi);
  if (kq.boMay) throw new Error('Điện thoại này đã tắt thông báo hoặc cài lại app nên không nhận được. Bật lại thông báo trong app rồi thử lại.');
  return kq;
}

/** Nội dung thông báo sáng từ kết quả tongHopSang_ (null khi không có việc gì). */
function noiDungThongBao_(tenCH, du) {
  const muc = [[(du.suaChua || []).length, 'máy sửa cần trả khách'], [du.dot.length, 'đợt trả góp cần thu'], [du.hopDong.length, 'hợp đồng sắp/quá hạn'], [du.donTre.length, 'đơn trễ giao'], [du.hang.length, 'mặt hàng sắp hết']]
    .filter(m => m[0] > 0).map(m => m[0] + ' ' + m[1]);
  if (!muc.length) return null;
  return { title: tenCH + ': ' + du.soMuc + ' việc cần làm hôm nay', body: muc.join(' · ') };
}

/** Gửi thông báo sáng của cửa hàng id (CUR_SHOP đã đặt) tới mọi máy đã bật, của tài khoản còn hoạt động được vào cửa hàng này. */
function guiThongBaoSang_(id, homNay) {
  const nd = noiDungThongBao_(cuaHang_(id).ten, tongHopSang_(homNay));
  if (!nd) return { daGui: 0 };
  const tk = {}, cache = CacheService.getScriptCache();
  readTable_('TaiKhoan').forEach(t => { tk[String(t.TenDangNhap).toLowerCase()] = t; });
  const den = readTable_('ThietBi').filter(r => {
    const u = String(r.TenDangNhap).toLowerCase(), t = tk[u], rev = t ? revOf_(u, cache) : 0;
    // máy đã bị thu hồi (đổi/đặt lại mật khẩu) nhưng chưa mở lại app nên còn trong Sheet: không gửi
    return r.PushToken && t && t.TrangThai !== 'Khóa' && shopsOf_(t).indexOf(id) >= 0 && !(rev && !(+r.CapLuc > rev));
  }).map(r => r.PushToken);
  const ds = den.filter((x, i) => den.indexOf(x) === i);
  if (!ds.length) return { daGui: 0 };
  const kq = guiPush_(ds.map(to => ({ to: to, title: nd.title, body: nd.body, data: { url: '/' } })));
  return { daGui: ds.length - kq.boMay - kq.soLoi, loi: kq.loi };
}

function coThongBao_() { try { return readTable_('ThietBi').some(r => r.PushToken); } catch (e) { return false; } }

// Gửi tới máy chủ Expo (tối đa 100 thông báo mỗi lần). Máy đã gỡ app (DeviceNotRegistered) thì xóa mã để lần sau không gửi nữa.
function guiPush_(msgs) {
  let boMay = 0, soLoi = 0, loi = '';
  const chet = [];
  for (let i = 0; i < msgs.length; i += 100) {
    const lo = msgs.slice(i, i + 100).map(m => Object.assign({ sound: 'default', priority: 'high' }, m));
    const res = UrlFetchApp.fetch(PUSH_URL, { method: 'post', contentType: 'application/json', payload: JSON.stringify(lo), muteHttpExceptions: true });
    let j = {};
    try { j = JSON.parse(res.getContentText()); } catch (e) {}
    if (res.getResponseCode() !== 200 || !Array.isArray(j.data)) { loi = 'máy chủ thông báo trả lỗi ' + res.getResponseCode(); soLoi += lo.length; continue; }
    j.data.forEach((d, k) => {
      if (d.status === 'ok') return;
      const err = d.details && d.details.error;
      if (err === 'DeviceNotRegistered') { boMay++; chet.push(lo[k].to); } else { soLoi++; loi = d.message || err || 'lỗi không rõ'; }
    });
  }
  if (chet.length) boPushToken_(chet); // gom một lần khóa: sau khi cập nhật app có thể có nhiều mã cùng hết hạn
  return { ok: !loi, loi: loi, boMay: boMay, soLoi: soLoi };
}

function boPushToken_(dsToken) {
  const bo = new Set([].concat(dsToken));
  withLock_(() => {
    const sh = sheet_('ThietBi'), c = headers_(sh).indexOf('PushToken');
    if (c < 0) return;
    const v = sh.getDataRange().getValues();
    for (let r = 1; r < v.length; r++) if (bo.has(v[r][c])) sh.getRange(r + 1, c + 1).setValues([['']]);
    daGhi_(sh);
  });
}
