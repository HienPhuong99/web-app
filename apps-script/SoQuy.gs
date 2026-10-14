// ===== Sổ quỹ, phiếu chi, giá vốn và lợi nhuận =====
// Phiếu chi (trang PhieuChi): tiền chi ra – trả nhà cung cấp hoặc chi phí cửa hàng. Cùng phiếu thu (ThuTien) làm thành sổ quỹ:
// quỹ tiền mặt (hình thức "Tiền mặt") và tiền trong ngân hàng (mọi hình thức khác: chuyển khoản, thẻ, ví…).
// Số dư đầu kỳ của hai quỹ do quản trị đặt một lần (CaiDat 'soDuDau.<cửa hàng>'); sổ quỹ tính từ ngày đó.
// Giá vốn: giá nhập một đơn vị ghi ở dòng phiếu nhập (PhieuKhoCT.GiaVon), tính bình quân theo mọi lần nhập có giá của mặt hàng,
// cộng các phiếu chi "Làm lại máy cũ" (thay pin, màn… của một máy theo IMEI) vào giá vốn của mặt hàng máy đó.
// Lãi gộp = doanh thu (chưa VAT) − giá vốn hàng đã bán, tách lãi máy cũ (bán lại máy thu về) và lãi bán hàng mới. Chỉ quản trị xem được.
// File này dùng chung phạm vi với Code.gs (readTable_, withLock_, user_, upsert_…).

const LOAI_CHI = ['Trả nhà cung cấp', 'Làm lại máy cũ', 'Mặt bằng', 'Lương nhân viên', 'Điện, nước, internet', 'Vận chuyển', 'Quảng cáo', 'Sửa chữa, bảo hành', 'Chi khác'];
const TRA_NCC = LOAI_CHI[0], LAM_LAI_MAY = LOAI_CHI[1];
const laTienMat_ = ht => String(ht || '').trim().toLowerCase() === 'tiền mặt';

/** Số dư đầu kỳ: { ngay ('' = từ đầu), tienMat, nganHang }. cd = CaiDat đã đọc sẵn. */
function soDuDau_(cd) {
  let o = {};
  try { o = JSON.parse((cd || caiDatMap_())['soDuDau.' + CUR_SHOP] || '{}') || {}; } catch (e) {}
  return { ngay: ngayHopLe_(o.ngay) || '', tienMat: Math.round(+o.tienMat || 0), nganHang: Math.round(+o.nganHang || 0) };
}

/** Quản trị đặt số dư đầu kỳ của quỹ tiền mặt và tài khoản ngân hàng */
function luuSoDuDau(token, o) {
  const user = user_(token, true);
  o = o || {};
  const v = { ngay: ngayHopLe_(o.ngay), tienMat: Math.round(+o.tienMat || 0), nganHang: Math.round(+o.nganHang || 0) };
  if (!v.ngay) throw new Error('Chọn ngày bắt đầu sổ quỹ.');
  return withLock_(() => {
    ghiCaiDat_('soDuDau.' + CUR_SHOP, JSON.stringify(v));
    log_(user, 'Đặt số dư đầu sổ quỹ', v.ngay, 'tiền mặt ' + v.tienMat + ' đ · ngân hàng ' + v.nganHang + ' đ');
    return v;
  });
}

/** Giá vốn bình quân mỗi mặt hàng: { MaHH: giá } từ các dòng phiếu nhập có giá. Mặt hàng chưa nhập có giá thì không có trong bảng. */
function giaVonBQ_(phieuKho, pkCT) {
  const nhap = {}, t = {};
  (phieuKho || readTable_('PhieuKho')).forEach(p => { if (p.Loai === 'Nhập') nhap[p.SoPK] = true; });
  (pkCT || readTable_('PhieuKhoCT')).forEach(l => {
    const gv = +l.GiaVon || 0, sl = +l.SoLuong || 0;
    if (!nhap[l.SoPK] || !l.MaHH || gv <= 0 || sl <= 0) return;
    const x = t[l.MaHH] || (t[l.MaHH] = { sl: 0, tien: 0 });
    x.sl += sl; x.tien += sl * gv;
  });
  readTable_('PhieuChi').forEach(c => { const x = c.Loai === LAM_LAI_MAY && t[c.MaHH]; if (x) x.tien += +c.SoTien || 0; }); // chi phí làm lại máy vào giá vốn
  const kq = {};
  Object.keys(t).forEach(k => { kq[k] = Math.round(t[k].tien / t[k].sl); });
  return kq;
}

// ===== Phiếu chi =====
/** Thêm / sửa phiếu chi. Ai cũng thêm được (thu ngân trả tiền ship…); sửa phiếu đã có chỉ quản trị. */
function luuPhieuChi(token, pc) {
  const user = user_(token);
  pc = Object.assign({}, pc || {});
  if (pc.SoPC && user.vaiTro !== 'admin') throw new Error('Chỉ tài khoản quản trị được sửa phiếu chi.');
  pc.Ngay = ngayHopLe_(pc.Ngay) || homNay_();
  pc.SoTien = Math.round(+pc.SoTien || 0);
  if (pc.SoTien <= 0) throw new Error('Nhập số tiền chi.');
  pc.Loai = String(pc.Loai || '').trim().slice(0, 60) || 'Chi khác';
  pc.DoiTac = String(pc.DoiTac || '').trim().slice(0, 150);
  if (pc.Loai === TRA_NCC && !pc.DoiTac) throw new Error('Nhập tên nhà cung cấp được trả tiền.');
  // Làm lại máy cũ: ghi IMEI máy đang trong kho; tiền chi cộng vào giá vốn của mặt hàng máy đó (lãi máy cũ không bị tính cao hơn thực tế)
  if (pc.Loai === LAM_LAI_MAY) {
    const ma = gonMa_(pc.IMEI), cu = pc.SoPC ? findObj_('PhieuChi', pc.SoPC) : null;
    if (!ma) throw new Error('Nhập IMEI/serial của máy được làm lại.');
    if (cu && cu.MaHH && gonMa_(cu.IMEI) === ma) { pc.IMEI = cu.IMEI; pc.MaHH = cu.MaHH; } // sửa phiếu cũ (máy có thể đã bán): giữ máy đã ghi
    else {
      const k = imeiTrongKho_().kho[ma];
      if (!k || !k.MaHH) throw new Error('Máy ' + pc.IMEI + ' không có trong kho.');
      pc.IMEI = k.IMEI; pc.MaHH = k.MaHH; pc.DoiTac = pc.DoiTac || k.TenHang;
    }
  } else { pc.IMEI = ''; pc.MaHH = ''; }
  pc.HinhThuc = String(pc.HinhThuc || '').trim().slice(0, 60) || 'Tiền mặt';
  pc.GhiChu = String(pc.GhiChu || '').trim().slice(0, 500);
  return withLock_(() => {
    const moi = !pc.SoPC;
    if (moi) { pc.NguoiTao = user.ten; pc.NgayTao = now_(); }
    upsert_('PhieuChi', pc, () => nextSo_('PhieuChi', 'PC', pc.Ngay), ['NguoiTao', 'NgayTao']);
    log_(user, (moi ? 'Thêm' : 'Sửa') + ' phiếu chi', pc.SoPC, pc.Loai + (pc.DoiTac ? ' · ' + pc.DoiTac : '') + ' · ' + pc.SoTien + ' đ');
    return pc;
  });
}

function xoaPhieuChi(token, soPC) {
  const user = user_(token, true);
  withLock_(() => {
    const pc = findObj_('PhieuChi', soPC);
    if (!pc) throw new Error('Không tìm thấy phiếu chi ' + soPC + '.');
    deleteWhere_('PhieuChi', soPC);
    log_(user, 'Xóa phiếu chi', soPC, pc.Loai + ' · ' + pc.SoTien + ' đ');
  });
}

// ===== Sổ quỹ =====
/**
 * Sổ quỹ một ngày cho app: tồn quỹ cuối ngày (tiền mặt, ngân hàng), tổng thu / chi trong ngày và từng phiếu.
 * ngay = yyyy-MM-dd (mặc định hôm nay); truoc / sau để lật ngày (sau rỗng khi là hôm nay).
 */
function soQuyMay(token, ngay) {
  user_(token);
  const homNay = homNay_(), n = ngay == null || ngay === '' ? homNay : ngayHopLe_(ngay);
  if (!n) throw new Error('Ngày không hợp lệ.');
  const dau = soDuDau_(), ngay10 = v => String(v == null ? '' : v).slice(0, 10);
  const ton = { tienMat: dau.tienMat, nganHang: dau.nganHang }, trong = { thu: 0, chi: 0 }, ds = [];
  const cong = (ht, tien) => { if (laTienMat_(ht)) ton.tienMat += tien; else ton.nganHang += tien; };
  readTable_('ThuTien').forEach(p => {
    const d = ngay10(p.Ngay), tien = +p.SoTien || 0;
    if ((dau.ngay && d < dau.ngay) || d > n || p.HinhThuc === HT_MAY_CU) return; // máy cũ thu về không phải tiền
    cong(p.HinhThuc, tien);
    if (d !== n) return;
    if (tien < 0) trong.chi -= tien; else trong.thu += tien; // phiếu thu âm: trả lại tiền khách trả hàng
    ds.push({ loai: tien < 0 ? 'chi' : 'thu', so: p.SoPT, noiDung: (tien < 0 ? 'Trả lại tiền · ' : '') + p.TenKH + (p.SoDH ? ' · đơn ' + p.SoDH : ''), SoTien: Math.abs(tien), HinhThuc: p.HinhThuc || '', MaKH: p.MaKH || '', luc: String(p.NgayTao || '') });
  });
  readTable_('PhieuChi').forEach(c => {
    const d = ngay10(c.Ngay), tien = +c.SoTien || 0;
    if ((dau.ngay && d < dau.ngay) || d > n) return;
    cong(c.HinhThuc, -tien);
    if (d !== n) return;
    trong.chi += tien;
    ds.push({ loai: 'chi', so: c.SoPC, noiDung: c.Loai + (c.DoiTac ? ' · ' + c.DoiTac : '') + (c.GhiChu ? ' · ' + c.GhiChu : ''), SoTien: tien, HinhThuc: c.HinhThuc || '', MaKH: '', luc: String(c.NgayTao || '') });
  });
  ds.sort((a, b) => b.luc.localeCompare(a.luc) || b.so.localeCompare(a.so));
  const lech = k => Utilities.formatDate(new Date(Date.parse(n + 'T12:00:00Z') + k * 864e5), 'UTC', 'yyyy-MM-dd');
  return { ngay: n, homNay: homNay, truoc: lech(-1), sau: n < homNay ? lech(1) : '', batDau: dau.ngay, ton: ton, trongNgay: trong, ds: ds,
    loaiChi: LOAI_CHI, hinhThuc: (cuaHang_(CUR_SHOP).congTy.hinhThuc || ['Tiền mặt']).slice() };
}

// ===== Lợi nhuận =====
/** Lãi gộp trong khoảng ngày (đơn không hủy, theo ngày lập đơn). Dòng không có mã hàng (dịch vụ) coi như giá vốn 0. */
function loiNhuanKy_(from, to) {
  const gv = giaVonBQ_(), nhom = {};
  readTable_('HangHoa').forEach(h => { nhom[h.MaHH] = h.NhomHang || 'Chưa phân nhóm'; });
  const don = {};
  readTable_('DonHang').forEach(d => { const n = String(d.Ngay).slice(0, 10); if (d.TrangThai !== 'Hủy' && n >= from && n <= to) don[d.SoDH] = d; });
  const tong = { doanhThu: 0, giaVon: 0 }, theoThang = {}, theoNhom = {}, theoHang = {}, theoDon = {}, thieu = {};
  const them = (m, k, o, dt, von) => { const x = m[k] || (m[k] = Object.assign({ doanhThu: 0, giaVon: 0 }, o)); x.doanhThu += dt; x.giaVon += von; };
  let laiMayCu = 0;
  readTable_('DonHangCT').forEach(l => {
    const d = don[l.SoDH];
    if (!d) return;
    const dt = +l.ThanhTien || 0, sl = +l.SoLuong || 0, ma = l.MaHH;
    // Dòng máy cũ thu lại của đơn lên đời (−1): máy vào kho đúng giá thu nên giá vốn = giá thu, lãi 0; lãi máy cũ có khi bán lại máy đó
    if (sl < 0) {
      tong.doanhThu += dt; tong.giaVon += dt;
      them(theoThang, String(d.Ngay).slice(0, 7), { thang: String(d.Ngay).slice(0, 7) }, dt, dt);
      them(theoNhom, 'Máy cũ thu vào (trừ vào đơn)', { nhom: 'Máy cũ thu vào (trừ vào đơn)' }, dt, dt);
      them(theoHang, '~thuCu', { MaHH: '', TenHang: 'Máy cũ thu vào (trừ vào đơn)', soLuong: 0, coGiaVon: true }, dt, dt);
      theoHang['~thuCu'].soLuong -= sl;
      them(theoDon, d.SoDH, { SoDH: d.SoDH, Ngay: d.Ngay, MaKH: d.MaKH, TenKH: d.TenKH }, dt, dt);
      return;
    }
    if (ma && gv[ma] === undefined) thieu[ma] = l.TenHang;
    const von = ma ? Math.round(sl * (gv[ma] || 0)) : 0;
    tong.doanhThu += dt; tong.giaVon += von;
    if (ma && nhom[ma] === NHOM_MAY_CU) laiMayCu += dt - von;
    them(theoThang, String(d.Ngay).slice(0, 7), { thang: String(d.Ngay).slice(0, 7) }, dt, von);
    them(theoNhom, ma ? nhom[ma] || 'Chưa phân nhóm' : 'Dịch vụ / khác', { nhom: ma ? nhom[ma] || 'Chưa phân nhóm' : 'Dịch vụ / khác' }, dt, von);
    them(theoHang, ma || l.TenHang, { MaHH: ma || '', TenHang: l.TenHang, soLuong: 0, coGiaVon: !ma || gv[ma] !== undefined }, dt, von);
    theoHang[ma || l.TenHang].soLuong += sl;
    them(theoDon, d.SoDH, { SoDH: d.SoDH, Ngay: d.Ngay, MaKH: d.MaKH, TenKH: d.TenKH }, dt, von);
  });
  // Giảm giá cả đơn: trừ vào doanh thu của đơn, tháng, tổng; theo nhóm / mặt hàng thì thành một dòng riêng
  Object.keys(don).forEach(so => {
    const d = don[so], g = +d.GiamGia || 0;
    if (!g) return;
    tong.doanhThu -= g;
    them(theoThang, String(d.Ngay).slice(0, 7), { thang: String(d.Ngay).slice(0, 7) }, -g, 0);
    them(theoNhom, 'Giảm giá đơn hàng', { nhom: 'Giảm giá đơn hàng' }, -g, 0);
    them(theoHang, '~giam', { MaHH: '', TenHang: 'Giảm giá đơn hàng', soLuong: 0, coGiaVon: true }, -g, 0);
    them(theoDon, d.SoDH, { SoDH: d.SoDH, Ngay: d.Ngay, MaKH: d.MaKH, TenKH: d.TenKH }, -g, 0);
  });
  const lai = x => Object.assign(x, { lai: x.doanhThu - x.giaVon });
  const theo = (m, sx) => Object.keys(m).map(k => lai(m[k])).sort(sx);
  lai(tong);
  tong.laiMayCu = laiMayCu; tong.laiMayMoi = tong.lai - laiMayCu; // lãi bán lại máy thu về / lãi bán hàng mới (gồm dịch vụ, trừ giảm giá)
  return {
    tong: tong,
    theoThang: theo(theoThang, (a, b) => a.thang.localeCompare(b.thang)),
    theoNhom: theo(theoNhom, (a, b) => b.lai - a.lai),
    theoHang: theo(theoHang, (a, b) => b.lai - a.lai),
    theoDon: theo(theoDon, (a, b) => String(b.Ngay + b.SoDH).localeCompare(String(a.Ngay + a.SoDH))),
    thieuGiaVon: Object.keys(thieu).map(k => ({ MaHH: k, TenHang: thieu[k] })),
  };
}

/** Báo cáo lợi nhuận (web, app): chỉ quản trị */
function loiNhuan(token, from, to) {
  user_(token, true);
  const a = ngayHopLe_(from), b = ngayHopLe_(to);
  if (!a || !b || a > b) throw new Error('Khoảng ngày không hợp lệ.');
  return loiNhuanKy_(a, b);
}
