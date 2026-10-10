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
  };
}

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
  if (fn === 'dangNhapMay') return dangNhapMay_(args[0], args[1], args[2]);
  if (fn === 'dangXuatMay') return dangXuatMay_(q.may);
  const ham = apiHam_();
  if (!Object.prototype.hasOwnProperty.call(ham, fn)) throw new Error('Không có chức năng "' + fn.slice(0, 40) + '".');
  const token = phienMay_(q.may);
  let r;
  try { r = ham[fn].apply(null, [token].concat(args)); }
  catch (e) { // phiên bị thu hồi (khóa tài khoản, đặt lại mật khẩu…): xóa luôn máy này khỏi danh sách
    if (e && e.message === 'HET_PHIEN') withLock_(() => xoaMay_(bamMay_(q.may)));
    throw e;
  }
  if (fn === 'doiMatKhau') { // tự đổi mật khẩu thu hồi các máy khác; máy đang dùng giữ mốc mới để không bị đăng xuất
    const s = CacheService.getScriptCache().get('ss_' + token);
    if (s) capNhatMay_(bamMay_(q.may), { CapLuc: String(JSON.parse(s).t) });
  }
  return r;
}

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
    sh.appendRow(toRow_(sh, { MaMay: ma, TenDangNhap: u, TenMay: String(tenMay == null ? '' : tenMay).trim().slice(0, 60) || 'Điện thoại',
      CapLuc: String(dn.user.t), NgayTao: now_(), LanCuoi: now_() }));
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
  const tb = readTable_('ThietBi').find(r => r.MaMay === ma);
  if (!tb) throw new Error('HET_PHIEN');
  const u = String(tb.TenDangNhap).toLowerCase();
  const tk = readTable_('TaiKhoan').find(r => String(r.TenDangNhap).toLowerCase() === u);
  const cap = +tb.CapLuc || 0, rev = revOf_(u, cache);
  if (!tk || tk.TrangThai === 'Khóa' || (rev && !(cap > rev))) { withLock_(() => xoaMay_(ma)); throw new Error('HET_PHIEN'); }
  const token = Utilities.getUuid();
  cache.put('ss_' + token, JSON.stringify(phienMoi_(tk, cap)), SESSION_TTL);
  cache.put('mp_' + ma, token, SESSION_TTL);
  capNhatMay_(ma, { LanCuoi: now_() });
  return token;
}

/** Màn hình Tổng quan của app: doanh số, tiền thu hôm nay, 7 ngày gần nhất và các việc cần làm (cùng cách tính với email sáng). */
function tongQuanMay(token) {
  const user = user_(token);
  const du = tongHopSang_(homNay_()), ch = cuaHang_(CUR_SHOP);
  return {
    user: { u: user.u, ten: user.ten, vaiTro: user.vaiTro }, cuaHang: { ten: ch.ten, moTa: ch.moTa },
    homNay: du.homNay, ban: du.homNayBan, thu: du.homNayThu, homQua: du.homQuaBan, ban7: du.ban7,
    hopDong: du.hopDong.slice(0, 20), dot: du.dot.slice(0, 20), donTre: du.donTre.slice(0, 20), hang: du.hang.slice(0, 20),
    soMuc: du.soMuc, no: du.no,
  };
}

const boDau_ = s => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();

/**
 * Tra bảo hành theo IMEI/serial (quét mã vạch hoặc gõ một phần), số điện thoại hoặc tên khách (không cần dấu).
 * Trả { q, tong, ds } với tối đa 30 máy mới giao nhất; mỗi máy có IMEIKhop (mã khớp), ConHan, ConNgay (âm = đã hết hạn).
 */
function traBaoHanh(token, q) {
  const raw = String(q == null ? '' : q).trim().slice(0, 60);
  const ma = raw.toUpperCase().replace(/[\s.\-]/g, '');
  if (ma.length < 3) throw new Error('Nhập ít nhất 3 ký tự: IMEI/serial, số điện thoại hoặc tên khách.');
  const ds = dsBaoHanh(token), homNay = homNay_();
  // Mã vạch serial trên hộp máy Apple thường có chữ S ở đầu
  const maThu = /^S[A-Z0-9]{10,12}$/.test(ma) ? [ma, ma.slice(1)] : [ma];
  const laSo = /^[\d\s.\-+]+$/.test(raw), so = raw.replace(/\D/g, ''), chu = boDau_(raw);
  const kq = [];
  ds.forEach(x => {
    const imei = imeiList_(x.IMEI), khop = imei.find(i => maThu.some(m => i.indexOf(m) >= 0));
    const sdt = laSo && so.length >= 4 && String(x.SDT || '').replace(/\D/g, '').indexOf(so) >= 0;
    if (!khop && !sdt && !(!laSo && boDau_(x.TenKH).indexOf(chu) >= 0)) return;
    const n = x.HetHan ? Math.round((Date.parse(x.HetHan) - Date.parse(homNay)) / 864e5) : null;
    kq.push(Object.assign({}, x, { IMEIKhop: khop || '', ConHan: n === null ? null : n >= 0, ConNgay: n }));
  });
  kq.sort((a, b) => String(b.Ngay + b.SoPK).localeCompare(String(a.Ngay + a.SoPK)));
  return { q: raw, tong: kq.length, ds: kq.slice(0, 30) };
}
