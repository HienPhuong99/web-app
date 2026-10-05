// ===== Email tổng hợp mỗi sáng (tùy chọn) =====
// Quản trị bật trong Cài đặt: mỗi sáng app tự gửi một email các việc cần chú ý (hợp đồng sắp hết hạn, đợt thanh toán đến hạn, đơn quá hạn giao,
// hàng sắp hết, khách còn nợ) tới chủ tài khoản Google đã triển khai app hoặc các email quản trị nhập thêm. Không có việc gì thì không gửi.
// Không gửi gì cho khách hàng. Cần quyền gửi email và hẹn giờ của Google: chạy lại caiDat() trong trình soạn thảo một lần để cấp.
const EMAIL_HAM = 'guiEmailSang'; // hàm do bộ hẹn giờ gọi mỗi ngày
const EMAIL_TOI_DA = 10; // số dòng tối đa mỗi mục trong thư; còn lại ghi "và N mục khác"
const EMAIL_RE = /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/;

/** Cấu hình email sáng của một cửa hàng: { bat, gio (5–22), den: [email nhận thêm] }. cd = CaiDat đã đọc sẵn. */
function cauHinhEmailSang_(id, cd) {
  let o = {};
  try { o = JSON.parse((cd || caiDatMap_())['emailSang.' + id] || '{}') || {}; } catch (e) {}
  const gio = Math.round(+o.gio);
  return { bat: o.bat === true, gio: gio >= 5 && gio <= 22 ? gio : 7, den: (Array.isArray(o.den) ? o.den : []).map(String).filter(x => EMAIL_RE.test(x)).slice(0, 5) };
}

/** Quản trị bật/tắt email sáng cho cửa hàng đang làm việc. o = { bat, gio, den: "a@x.com, b@y.com" }. Lưu rồi đặt lại bộ hẹn giờ; hẹn giờ lỗi thì hoàn lại cấu hình cũ. */
function luuEmailSang(token, o) {
  const user = user_(token, true);
  o = o || {};
  const den = String(o.den == null ? '' : o.den).split(/[\s,;]+/).filter(Boolean);
  const sai = den.find(x => !EMAIL_RE.test(x));
  if (sai) throw new Error('Email không hợp lệ: ' + sai);
  if (den.length > 5) throw new Error('Nhập tối đa 5 email nhận.');
  const gio = Math.round(+o.gio);
  if (o.bat && !(gio >= 5 && gio <= 22)) throw new Error('Giờ gửi từ 5 đến 22.');
  const moi = { bat: !!o.bat, gio: gio >= 5 && gio <= 22 ? gio : 7, den: den.filter((x, i) => den.indexOf(x) === i) };
  return withLock_(() => {
    const khoa = 'emailSang.' + CUR_SHOP, cu = caiDatMap_()[khoa];
    ghiCaiDat_(khoa, JSON.stringify(moi));
    try { datHenGioEmailSang_(); }
    catch (e) {
      if (cu === undefined) deleteWhere_('CaiDat', khoa); else ghiCaiDat_(khoa, cu);
      throw new Error('Chưa đặt được lịch gửi email, thường do chưa cấp quyền gửi email/hẹn giờ cho script. Mở Apps Script, chạy hàm caiDat một lần, bấm cho phép rồi thử lại. (' + (e && e.message || e) + ')');
    }
    log_(user, moi.bat ? 'Bật email tổng hợp sáng' : 'Tắt email tổng hợp sáng', CUR_SHOP, moi.bat ? 'lúc ' + moi.gio + ' giờ' + (moi.den.length ? ', gửi ' + moi.den.join(', ') : '') : '');
    return cauHinhEmailSang_(CUR_SHOP);
  });
}

function ghiCaiDat_(khoa, giaTri) {
  const sh = sheet_('CaiDat'), r = findRow_(sh, khoa), row = toRow_(sh, { Khoa: khoa, GiaTri: giaTri });
  if (r) sh.getRange(r, 1, 1, row.length).setValues([row]); else sh.appendRow(row);
}

/** Một bộ hẹn giờ hằng ngày gọi guiEmailSang; xóa hết bộ hẹn giờ cũ của hàm này rồi tạo lại nếu còn cửa hàng bật. Hiện chỉ có 1 cửa hàng. */
function datHenGioEmailSang_() {
  const cd = caiDatMap_(), gio = Object.keys(SHOPS).map(id => cauHinhEmailSang_(id, cd)).filter(c => c.bat).map(c => c.gio);
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === EMAIL_HAM).forEach(t => ScriptApp.deleteTrigger(t));
  if (!gio.length) return 0;
  ScriptApp.newTrigger(EMAIL_HAM).timeBased().everyDays(1).atHour(Math.min.apply(null, gio)).inTimezone(tz_()).create();
  return 1;
}

/** Quản trị bấm "Gửi thử": gửi ngay (kể cả khi không có việc gì) để kiểm tra email nhận được. */
function guiThuEmailSang(token) {
  user_(token, true);
  return guiEmailSang_(CUR_SHOP, cauHinhEmailSang_(CUR_SHOP), homNay_(), true);
}

/** Bộ hẹn giờ gọi mỗi sáng. Chỉ chạy khi do bộ hẹn giờ gọi (người lạ gọi từ trình duyệt thì bỏ qua); mỗi cửa hàng tối đa một thư mỗi ngày. Không trả dữ liệu. */
function guiEmailSang(e) {
  if (!e || typeof e !== 'object' || !(e.triggerUid || e.year)) return;
  const homNay = homNay_(), cd = caiDatMap_(), props = PropertiesService.getScriptProperties();
  Object.keys(SHOPS).forEach(id => {
    if (!cauHinhEmailSang_(id, cd).bat || props.getProperty('emailSang.' + id) === homNay) return;
    try {
      CUR_SHOP = id;
      if (guiEmailSang_(id, cauHinhEmailSang_(id, cd), homNay, false).daGui) props.setProperty('emailSang.' + id, homNay);
    } catch (err) { Logger.log('Không gửi được email sáng của ' + id + ': ' + err); }
  });
}

const homNay_ = () => Utilities.formatDate(new Date(), tz_(), 'yyyy-MM-dd');
function emailChu_() { try { return Session.getEffectiveUser().getEmail() || ''; } catch (e) { return ''; } }

// Gửi cho cửa hàng id (CUR_SHOP đã đặt). Trả { daGui, den, coViec, soMuc }.
function guiEmailSang_(id, cfg, homNay, thu) {
  const du = tongHopSang_(homNay), ten = cuaHang_(id).ten;
  if (!du.coViec && !thu) return { daGui: false, den: [], coViec: false, soMuc: 0 };
  const den = cfg.den.length ? cfg.den : [emailChu_()].filter(Boolean);
  if (!den.length) throw new Error('Chưa biết gửi email tới đâu: nhập email nhận.');
  const m = dungEmailSang_(ten, du, thu);
  MailApp.sendEmail({ to: den.join(','), subject: m.tieuDe, body: m.text, htmlBody: m.html, name: ten });
  return { daGui: true, den: den, coViec: du.coViec, soMuc: du.soMuc };
}

/**
 * Gom các việc cần chú ý tại homNay (yyyy-MM-dd). Cách tính phải giống màn hình Tổng quan (hanHD, trangThaiDot, conNo, isLow).
 */
function tongHopSang_(homNay) {
  const homQua = new Date(Date.parse(homNay) - 864e5).toISOString().slice(0, 10), ngay = v => String(v == null ? '' : v).slice(0, 10);
  const donHang = readTable_('DonHang'), thu = readTable_('ThuTien'), khach = {};
  readTable_('KhachHang').forEach(k => { khach[k.MaKH] = k; });
  const song = donHang.filter(d => d.TrangThai !== 'Hủy');
  // Hợp đồng sắp / quá hạn, gần hạn nhất trước
  const hopDong = readTable_('HopDong').map(h => ({ h: h, x: hanHD_(h, homNay) })).filter(o => o.x)
    .sort((a, b) => String(a.h.NgayHetHan).localeCompare(String(b.h.NgayHetHan)))
    .map(o => ({ SoHD: o.h.SoHD, TenDN: o.h.TenDN, NgayHetHan: ngay(o.h.NgayHetHan), het: !!o.x.het, n: o.x.n, bao: o.x.bao, quyetDinh: o.x.quyetDinh, tuGiaHan: o.h.TuGiaHan === '1' || o.h.TuGiaHan === 1 }));
  // Đợt thanh toán quá hạn hoặc đến hạn trong 7 ngày
  const hd = {};
  readTable_('HopDong').forEach(h => { hd[h.SoHD] = h; });
  const dot = readTable_('HopDongLich').filter(r => hd[r.SoHD] && ['quahan', 'sap'].includes(trangThaiDot_(r, homNay)))
    .sort((a, b) => String(a.NgayDen).localeCompare(String(b.NgayDen)))
    .map(r => ({ SoHD: r.SoHD, TenDN: hd[r.SoHD].TenDN, Nhan: r.Nhan, NgayDen: ngay(r.NgayDen), SoTien: +r.SoTien || 0, quaHan: trangThaiDot_(r, homNay) === 'quahan', n: Math.round((Date.parse(ngay(r.NgayDen)) - Date.parse(homNay)) / 864e5) }));
  // Đơn chờ giao đã quá ngày hẹn giao
  const donTre = song.filter(d => (d.TrangThai === 'Chờ giao' || d.TrangThai === 'Giao một phần') && d.NgayGiao && ngay(d.NgayGiao) < homNay)
    .sort((a, b) => String(a.NgayGiao).localeCompare(String(b.NgayGiao)))
    .map(d => ({ SoDH: d.SoDH, TenKH: d.TenKH, NgayGiao: ngay(d.NgayGiao), TongCong: +d.TongCong || 0 }));
  // Hàng sắp hết: tồn <= mức tối thiểu (hàng có nhập xuất), hoặc có đặt mức tối thiểu mà chưa có phiếu kho nào
  const ton = tonKho_();
  const hang = readTable_('HangHoa').filter(h => ton[h.MaHH] ? ton[h.MaHH].nhap - ton[h.MaHH].xuat <= (+h.TonToiThieu || 0) : h.TonToiThieu !== '' && +h.TonToiThieu > 0)
    .map(h => ({ MaHH: h.MaHH, TenHang: h.TenHang, ton: ton[h.MaHH] ? ton[h.MaHH].nhap - ton[h.MaHH].xuat : 0, toiThieu: +h.TonToiThieu || 0 }))
    .sort((a, b) => (a.ton - a.toiThieu) - (b.ton - b.toiThieu));
  // Công nợ theo khách = đã mua (đơn không hủy) trừ đã thu (mọi phiếu thu của khách)
  const mua = {}, da = {};
  song.forEach(d => { mua[d.MaKH] = (mua[d.MaKH] || 0) + (+d.TongCong || 0); });
  thu.forEach(p => { da[p.MaKH] = (da[p.MaKH] || 0) + (+p.SoTien || 0); });
  const noDs = Object.keys(Object.assign({}, mua, da)).map(k => ({ MaKH: k, tien: (mua[k] || 0) - (da[k] || 0) })).filter(x => x.tien > 0).sort((a, b) => b.tien - a.tien)
    .map(x => ({ MaKH: x.MaKH, TenKH: x.MaKH && khach[x.MaKH] ? khach[x.MaKH].TenKH : (x.MaKH || 'Khách lẻ'), SDT: x.MaKH && khach[x.MaKH] ? khach[x.MaKH].SDT : '', tien: x.tien }));
  const homQuaDon = song.filter(d => ngay(d.Ngay) === homQua);
  const du = {
    homNay: homNay, homQua: homQua,
    homQuaBan: { don: homQuaDon.length, tien: homQuaDon.reduce((s, d) => s + (+d.TongCong || 0), 0) },
    homQuaThu: thu.filter(p => ngay(p.Ngay) === homQua).reduce((s, p) => s + (+p.SoTien || 0), 0),
    hopDong: hopDong, dot: dot, donTre: donTre, hang: hang,
    no: { soKhach: noDs.length, tong: noDs.reduce((s, x) => s + x.tien, 0), top: noDs.slice(0, 5) },
  };
  du.soMuc = hopDong.length + dot.length + donTre.length + hang.length;
  du.coViec = du.soMuc > 0; // khách còn nợ chỉ là thông tin kèm theo, không đủ để gửi thư mỗi sáng
  return du;
}

const tienEmail_ = n => Math.round(+n || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' đ';
const ngayEmail_ = s => String(s || '').slice(0, 10).split('-').reverse().join('/');
const escEmail_ = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Dựng thư từ kết quả tongHopSang_: { tieuDe, html, text }. thu = thư gửi thử (ghi rõ ở đầu thư). */
function dungEmailSang_(tenCH, du, thu) {
  const muc = []; // [tiêu đề mục, [dòng chữ]]
  const them = (tieuDe, ds, fn) => { if (ds.length) muc.push([tieuDe + ' (' + ds.length + ')', ds.slice(0, EMAIL_TOI_DA).map(fn).concat(ds.length > EMAIL_TOI_DA ? ['… và ' + (ds.length - EMAIL_TOI_DA) + ' mục khác, xem trong app'] : [])]); };
  them('Hợp đồng sắp hết hạn / đã hết hạn', du.hopDong, x => {
    const han = x.het ? 'đã quá hạn ' + x.n + ' ngày' : x.n === 0 ? 'hết hạn hôm nay' : 'còn ' + x.n + ' ngày';
    const qd = x.bao ? (x.quyetDinh < 0 ? '; đã quá hạn báo trước ' + (-x.quyetDinh) + ' ngày' : '; còn ' + x.quyetDinh + ' ngày để quyết định gia hạn hoặc chấm dứt') : '';
    return x.SoHD + ' · ' + x.TenDN + ' · hết hạn ' + ngayEmail_(x.NgayHetHan) + ' (' + han + qd + ')' + (x.tuGiaHan && !x.het ? ' · tự gia hạn' : '');
  });
  them('Đợt thanh toán cần thu', du.dot, x => x.SoHD + ' · ' + x.TenDN + ' · ' + x.Nhan + ' · ' + tienEmail_(x.SoTien) + ' · ' + (x.quaHan ? 'quá hạn ' + (-x.n) + ' ngày' : x.n === 0 ? 'đến hạn hôm nay' : 'còn ' + x.n + ' ngày'));
  them('Đơn hàng quá hạn giao', du.donTre, x => x.SoDH + ' · ' + (x.TenKH || 'Khách lẻ') + ' · hẹn giao ' + ngayEmail_(x.NgayGiao) + ' · ' + tienEmail_(x.TongCong));
  them('Hàng sắp hết', du.hang, x => x.TenHang + ' · tồn ' + x.ton + (x.toiThieu ? ' (tối thiểu ' + x.toiThieu + ')' : ''));
  if (du.no.soKhach) muc.push(['Khách còn nợ: ' + tienEmail_(du.no.tong) + ' (' + du.no.soKhach + ' khách)', du.no.top.map(x => x.TenKH + (x.SDT ? ' · ' + x.SDT : '') + ' · ' + tienEmail_(x.tien))]);
  const dau = 'Hôm qua (' + ngayEmail_(du.homQua) + '): ' + du.homQuaBan.don + ' đơn, doanh số ' + tienEmail_(du.homQuaBan.tien) + ', đã thu ' + tienEmail_(du.homQuaThu) + '.';
  const ghiChu = thu ? 'Đây là thư gửi thử.' + (du.coViec ? '' : ' Hôm nay chưa có việc nào cần chú ý, nên bình thường app sẽ không gửi thư.') : '';
  const tieuDe = '[' + tenCH + '] Tổng hợp sáng ' + ngayEmail_(du.homNay).slice(0, 5) + (du.soMuc ? ': ' + du.soMuc + ' việc cần chú ý' : '');
  const text = [ghiChu, 'Chào buổi sáng! ' + dau, ''].filter((x, i) => i || x).concat(...muc.map(m => [m[0] + ':'].concat(m[1].map(l => '- ' + l)).concat([''])), ['Mở app để xử lý. Tắt thư này trong Cài đặt → Email tổng hợp sáng.']).join('\n');
  const html = '<div style="font-family:Arial,sans-serif;font-size:14px;color:#1d2939;max-width:640px">'
    + (ghiChu ? '<p style="background:#fff3df;padding:8px 12px;border-radius:8px">' + escEmail_(ghiChu) + '</p>' : '')
    + '<h2 style="margin:0 0 6px">' + escEmail_(tenCH) + ' · Tổng hợp sáng</h2><p style="margin:0 0 12px;color:#475467">' + escEmail_(dau) + '</p>'
    + muc.map(m => '<h3 style="margin:16px 0 4px;font-size:15px">' + escEmail_(m[0]) + '</h3><ul style="margin:0;padding-left:20px">' + m[1].map(l => '<li style="margin:3px 0">' + escEmail_(l) + '</li>').join('') + '</ul>').join('')
    + '<p style="margin-top:20px;color:#667085;font-size:12.5px">Mở app để xử lý. Tắt thư này trong Cài đặt → Email tổng hợp sáng.</p></div>';
  return { tieuDe: tieuDe, text: text, html: html };
}
