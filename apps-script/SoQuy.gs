// ===== Sổ quỹ, phiếu chi, giá vốn và lợi nhuận =====
// Phiếu chi (trang PhieuChi): tiền chi ra – trả nhà cung cấp hoặc chi phí cửa hàng. Cùng phiếu thu (ThuTien) làm thành sổ quỹ:
// quỹ tiền mặt (hình thức "Tiền mặt") và tiền trong ngân hàng (mọi hình thức khác: chuyển khoản, thẻ, ví…).
// Số dư đầu kỳ của hai quỹ do quản trị đặt một lần (CaiDat 'soDuDau.<cửa hàng>'); sổ quỹ tính từ ngày đó.
// Giá vốn: giá nhập một đơn vị ghi ở dòng phiếu nhập (PhieuKhoCT.GiaVon). Lãi gộp (giaVonLai_) tính máy có IMEI theo giá vốn đích danh
// (giá nhập của chính máy đó + phiếu chi "Làm lại máy cũ" của máy đó), hàng không IMEI theo bình quân các lần nhập tính đến ngày bán.
// giaVonBQ_ (bình quân mọi lần nhập) chỉ còn dùng để gợi ý giá nhập trên web.
// Lãi gộp = doanh thu (chưa VAT) − giá vốn hàng đã bán, tách lãi máy cũ (bán lại máy thu về) và lãi bán hàng mới. Chỉ quản trị xem được.
// File này dùng chung phạm vi với Code.gs (readTable_, withLock_, user_, upsert_…).

const LOAI_CHI = ['Trả nhà cung cấp', 'Làm lại máy cũ', 'Mặt bằng', 'Lương nhân viên', 'Điện, nước, internet', 'Vận chuyển', 'Quảng cáo', 'Sửa chữa, bảo hành', 'Chi khác'];
const TRA_NCC = LOAI_CHI[0], LAM_LAI_MAY = LOAI_CHI[1];
const laTienMat_ = ht => String(ht || '').trim().toLowerCase() === 'tiền mặt';

// ===== Quỹ chờ giải ngân =====
// Hình thức thu mà tiền chưa về tài khoản ngay (trả góp qua công ty tài chính, quẹt thẻ T+1…) do quản trị chọn trong Cài đặt cửa hàng, kèm % phí
// ước tính. Thu bằng các hình thức đó vào quỹ "Chờ giải ngân"; khi tiền về, ghi nhận giải ngân (trang GiaiNgan): số rời quỹ chờ, số thực nhận
// vào ngân hàng, phần chênh là phí (chi trong ngày).
/** Cài đặt cửa hàng: "Trả góp, 0\nThẻ tín dụng, 1.8" (hoặc mảng { HinhThuc, Phi }) → [{ HinhThuc, Phi }]; chỉ hình thức thu đang dùng, không gồm tiền mặt */
function docChoGiaiNgan_(v, hinhThuc) {
  const dong = Array.isArray(v) ? v : String(v == null ? '' : v).split('\n');
  const kq = [];
  dong.forEach(x => {
    let ten, phi;
    if (x && typeof x === 'object') { ten = x.HinhThuc; phi = x.Phi; }
    else { const m = /^(.*?)(?:[,;:|]\s*([\d.,]+)\s*%?)?\s*$/.exec(String(x || '').trim()); ten = m[1]; phi = m[2]; }
    ten = String(ten || '').trim();
    if (!ten) return;
    const htDung = (hinhThuc || []).find(h => h.toLowerCase() === ten.toLowerCase());
    if (!htDung) throw new Error('Chờ giải ngân: "' + ten + '" không có trong danh sách hình thức thu tiền.');
    if (laTienMat_(htDung)) throw new Error('Chờ giải ngân: tiền mặt luôn vào quỹ tiền mặt.');
    const p = +String(phi == null ? '0' : phi).replace(',', '.');
    if (!(p >= 0 && p < 100)) throw new Error('Chờ giải ngân: phí của ' + htDung + ' phải từ 0 đến dưới 100%.');
    if (!kq.some(y => y.HinhThuc === htDung)) kq.push({ HinhThuc: htDung, Phi: Math.round(p * 100) / 100 });
  });
  return kq;
}
/** { hình thức: % phí } của các hình thức chờ giải ngân của cửa hàng đang làm việc */
function choGiaiNgan_(cd) {
  const m = {};
  (cuaHang_(CUR_SHOP, cd).congTy.choGiaiNgan || []).forEach(x => { m[x.HinhThuc] = +x.Phi || 0; });
  return m;
}
/** Quỹ của một hình thức thu / chi: 'tienMat', 'cho' (chờ giải ngân) hoặc 'nganHang' */
const quyCua_ = (ht, cho) => (laTienMat_(ht) ? 'tienMat' : cho && Object.prototype.hasOwnProperty.call(cho, String(ht || '').trim()) ? 'cho' : 'nganHang');

/** Tiền đang chờ giải ngân theo hình thức (từ ngày bắt đầu sổ quỹ tới hết ngày den): { hình thức: số tiền } */
function dangCho_(den, dau, cho) {
  const n10 = v => String(v == null ? '' : v).slice(0, 10), trong = d => !((dau.ngay && d < dau.ngay) || (den && d > den)), kq = {};
  Object.keys(cho).forEach(h => { kq[h] = 0; });
  readTable_('ThuTien').forEach(p => { const h = String(p.HinhThuc || '').trim(); if (quyCua_(h, cho) === 'cho' && trong(n10(p.Ngay))) kq[h] += +p.SoTien || 0; });
  readTable_('PhieuChi').forEach(c => { const h = String(c.HinhThuc || '').trim(); if (quyCua_(h, cho) === 'cho' && trong(n10(c.Ngay))) kq[h] -= +c.SoTien || 0; });
  readTable_('GiaiNgan').forEach(g => { const h = String(g.HinhThuc || '').trim(); if (trong(n10(g.Ngay))) kq[h] = (kq[h] || 0) - (+g.SoTien || 0); });
  return kq;
}

/**
 * Ghi nhận tiền chờ giải ngân đã về tài khoản. g = { HinhThuc, SoTien (số rời quỹ chờ), ThucNhan (số vào ngân hàng; bỏ trống = trừ phí % đã cài), Ngay, GhiChu }.
 * Ai cũng ghi được (thu ngân xem sao kê); xóa chỉ quản trị.
 */
function luuGiaiNgan(token, g) {
  const user = user_(token);
  g = g || {};
  const cho = choGiaiNgan_(), ht = String(g.HinhThuc || '').trim();
  if (!Object.prototype.hasOwnProperty.call(cho, ht)) throw new Error('"' + ht + '" không phải hình thức chờ giải ngân (cài trong Cài đặt cửa hàng).');
  const ngay = ngayHopLe_(g.Ngay) || homNay_(), soTien = Math.round(+g.SoTien || 0);
  if (soTien <= 0) throw new Error('Nhập số tiền giải ngân.');
  const thucNhan = g.ThucNhan === '' || g.ThucNhan == null ? Math.round(soTien * (100 - cho[ht]) / 100) : Math.round(+g.ThucNhan);
  if (!(thucNhan >= 0 && thucNhan <= soTien)) throw new Error('Số thực nhận phải từ 0 đến ' + soTien + ' đ.');
  return withLock_(() => {
    const con = dangCho_('', soDuDau_(), cho)[ht] || 0; // đọc trong khóa: hai máy cùng ghi không giải ngân quá số đang chờ
    if (soTien > con) throw new Error(ht + ' đang chờ giải ngân ' + Math.max(0, con) + ' đ, không ghi được ' + soTien + ' đ.');
    const o = { Ngay: ngay, HinhThuc: ht, SoTien: soTien, ThucNhan: thucNhan, GhiChu: String(g.GhiChu || '').trim().slice(0, 300), NguoiTao: user.ten, NgayTao: now_() };
    upsert_('GiaiNgan', o, () => nextSo_('GiaiNgan', 'GN', ngay), []);
    log_(user, 'Ghi nhận giải ngân', o.SoGN, ht + ' · ' + soTien + ' đ · thực nhận ' + thucNhan + ' đ');
    return o;
  });
}

function xoaGiaiNgan(token, soGN) {
  const user = user_(token, true);
  withLock_(() => {
    const g = findObj_('GiaiNgan', soGN);
    if (!g) throw new Error('Không tìm thấy phiếu giải ngân ' + soGN + '.');
    deleteWhere_('GiaiNgan', soGN);
    log_(user, 'Xóa phiếu giải ngân', soGN, g.HinhThuc + ' · ' + g.SoTien + ' đ');
  });
}

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

/**
 * Giá vốn để tính lãi gộp (báo cáo lợi nhuận, lãi một đơn):
 * - Máy có IMEI đã giao theo đơn: giá vốn đích danh = giá nhập của chính máy đó (lần nhập có giá gần nhất trước khi xuất) cộng phiếu chi
 *   "Làm lại máy cũ" của máy đó. Hai máy cũ cùng tên thu giá khác nhau (máy đẹp 9tr, máy xấu 5tr) thì lãi mỗi máy vẫn đúng.
 * - Hàng không IMEI (phụ kiện) hoặc đơn chưa giao: bình quân các lần nhập có giá tính đến ngày lập đơn, nên nhập hàng sau này
 *   không làm đổi lãi các kỳ đã qua.
 * - Máy cũ thu đổi rồi trả lại khách (khách trả máy mới) không còn là hàng của cửa hàng: không tính vào bình quân.
 * Trả { mayDon(soDH) → { MaHH: [giá vốn từng máy khách đang giữ, null = máy chưa có giá nhập] }, bq(MaHH, ngay) → giá | undefined }.
 */
function giaVonLai_() {
  const pk = {}, ct = readTable_('PhieuKhoCT');
  readTable_('PhieuKho').forEach(p => { pk[p.SoPK] = p; });
  const ngay10 = v => String(v == null ? '' : v).slice(0, 10), khoa = p => ngay10(p.Ngay) + String(p.NgayTao || '');
  const soDon = (p, re) => { const m = re.exec(String(p.GhiChu || '')); return m ? m[1] : ''; };
  const traLai = {}; // 'SoDH|IMEI gọn' của máy cũ đã trả lại khách (phiếu xuất "Trả lại máy cũ · đơn …")
  ct.forEach(l => {
    const p = pk[l.SoPK], so = p && p.Loai === 'Xuất' ? soDon(p, /^Trả lại máy cũ · đơn (\S+)/) : '';
    if (so) imeiList_(l.IMEI).forEach(x => { traLai[so + '|' + gonMa_(x)] = 1; });
  });
  const nhap = [];
  ct.forEach(l => {
    const p = pk[l.SoPK], gv = +l.GiaVon || 0, sl = +l.SoLuong || 0;
    if (!p || p.Loai !== 'Nhập' || !l.MaHH || gv <= 0 || sl <= 0) return;
    const im = imeiList_(l.IMEI), so = laNhapThuCu_(p) ? soDon(p, /^Thu cũ đổi mới · đơn (\S+)/) : '';
    if (so && im.length && im.every(x => traLai[so + '|' + gonMa_(x)])) return;
    nhap.push({ k: khoa(p), ngay: ngay10(p.Ngay), MaHH: l.MaHH, sl: sl, tien: sl * gv, gv: gv, im: im });
  });
  const chi = readTable_('PhieuChi').filter(c => c.Loai === LAM_LAI_MAY && c.MaHH && +c.SoTien > 0)
    .map(c => ({ k: ngay10(c.Ngay) + String(c.NgayTao || ''), ngay: ngay10(c.Ngay), MaHH: c.MaHH, sl: 0, tien: +c.SoTien, may: gonMa_(c.IMEI) }));
  const theoGio = (a, b) => (a.k < b.k ? -1 : a.k > b.k ? 1 : 0);
  // Bình quân cộng dồn theo thời gian từng mặt hàng (chi làm lại máy cộng vào tiền, không thêm số lượng)
  const bq = {};
  nhap.concat(chi).sort(theoGio).forEach(x => {
    const a = bq[x.MaHH] || (bq[x.MaHH] = []), t = a[a.length - 1] || { sl: 0, tien: 0 };
    a.push({ ngay: x.ngay, sl: t.sl + x.sl, tien: t.tien + x.tien });
  });
  // Các lần nhập có giá của từng máy (IMEI gọn), cũ trước; lần nhập gần nhất trước thời điểm k (không có thì lần đầu)
  const goc = {};
  nhap.sort(theoGio).forEach(x => x.im.forEach(m => { (goc[gonMa_(m)] = goc[gonMa_(m)] || []).push({ k: x.k, gv: x.gv, chi: 0 }); }));
  const truoc = (a, k) => { let r = a[0]; for (let i = 0; i < a.length && a[i].k <= k; i++) r = a[i]; return r; };
  chi.forEach(c => { const a = goc[c.may]; if (a) truoc(a, c.k).chi += c.tien; });
  // Máy khách đang giữ theo đơn: xuất theo đơn (+1), khách trả lại (−1, phiếu nhập ghi số đơn hoặc ghi chú "Khách trả hàng · đơn …")
  const may = {};
  ct.forEach(l => {
    const p = pk[l.SoPK];
    if (!p || !l.IMEI || !l.MaHH) return;
    const xuat = p.Loai === 'Xuất', so = xuat ? String(p.SoDH || '') : p.Loai === 'Nhập' ? String(p.SoDH || '') || soDon(p, /^Khách trả hàng · đơn (\S+)/) : '';
    if (!so) return;
    const d = may[so] || (may[so] = {});
    imeiList_(l.IMEI).forEach(x => {
      const g = gonMa_(x), m = d[g] || (d[g] = { MaHH: l.MaHH, n: 0, k: '' });
      m.n += xuat ? 1 : -1;
      if (xuat && khoa(p) >= m.k) { m.k = khoa(p); m.MaHH = l.MaHH; }
    });
  });
  return {
    mayDon: soDH => {
      const d = may[String(soDH)] || {}, kq = {};
      Object.keys(d).filter(g => d[g].n > 0).sort((a, b) => theoGio(d[a], d[b])).forEach(g => {
        const r = goc[g] ? truoc(goc[g], d[g].k) : null;
        (kq[d[g].MaHH] = kq[d[g].MaHH] || []).push(r ? r.gv + r.chi : null);
      });
      return kq;
    },
    bq: (ma, ngay) => {
      const a = bq[ma] || [];
      let r = null;
      for (let i = 0; i < a.length && a[i].ngay <= ngay; i++) if (a[i].sl > 0) r = a[i];
      if (!r) r = a.find(x => x.sl > 0); // bán trước lần nhập có giá đầu tiên (nhập ghi lùi ngày): lấy lần nhập đầu
      return r ? Math.round(r.tien / r.sl) : undefined;
    },
  };
}

/** Giá vốn một dòng đơn (số lượng > 0, có mã hàng): máy khách đang giữ theo giá đích danh, phần còn lại theo bình quân đến ngày đơn.
 * mayDon = g.mayDon(SoDH) của đơn đó (dùng dần qua các dòng cùng mặt hàng). Trả { von, du } (du = false: có đơn vị chưa có giá nhập). */
function giaVonDong_(g, mayDon, ngay, l) {
  const sl = +l.SoLuong || 0, ma = l.MaHH;
  if (!ma || sl <= 0) return { von: 0, du: true };
  const ds = mayDon[ma] || [], dich = ds.splice(0, Math.min(Math.floor(sl), ds.length));
  let von = 0, con = sl, du = true;
  dich.forEach(x => { if (x !== null) { von += x; con--; } });
  if (con > 0) { const b = g.bq(ma, ngay); if (b === undefined) du = false; else von += con * b; }
  return { von: Math.round(von), du: du };
}

/** Giá vốn từng dòng của một đơn đã lưu (web hiện lãi gộp khi mở đơn) */
function giaVonDon_(dh, lines) {
  const g = giaVonLai_(), m = g.mayDon(dh.SoDH), ngay = String(dh.Ngay).slice(0, 10);
  return lines.map(l => (+l.SoLuong < 0 ? { von: +l.ThanhTien || 0, du: true } : giaVonDong_(g, m, ngay, l)));
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
 * Sổ quỹ một ngày cho app: tồn quỹ cuối ngày (tiền mặt, ngân hàng, chờ giải ngân), tổng thu / chi trong ngày và từng phiếu (cả phiếu giải ngân).
 * choGiaiNgan: các hình thức chờ giải ngân, % phí, số đang chờ tới hết ngày đó.
 * ngay = yyyy-MM-dd (mặc định hôm nay); truoc / sau để lật ngày (sau rỗng khi là hôm nay).
 */
function soQuyMay(token, ngay) {
  user_(token);
  const homNay = homNay_(), n = ngay == null || ngay === '' ? homNay : ngayHopLe_(ngay);
  if (!n) throw new Error('Ngày không hợp lệ.');
  const dau = soDuDau_(), ngay10 = v => String(v == null ? '' : v).slice(0, 10), cho = choGiaiNgan_();
  const ton = { tienMat: dau.tienMat, nganHang: dau.nganHang, cho: 0 }, trong = { thu: 0, chi: 0 }, ds = [];
  const cong = (ht, tien) => { ton[quyCua_(ht, cho)] += tien; };
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
  readTable_('GiaiNgan').forEach(g => { // tiền chờ về ngân hàng: rời quỹ chờ, vào ngân hàng số thực nhận; phần chênh là phí, tính vào chi trong ngày
    const d = ngay10(g.Ngay), tien = +g.SoTien || 0, nhan = +g.ThucNhan || 0;
    if ((dau.ngay && d < dau.ngay) || d > n) return;
    ton.cho -= tien; ton.nganHang += nhan;
    if (d !== n) return;
    trong.chi += tien - nhan;
    ds.push({ loai: 'giaiNgan', so: g.SoGN, noiDung: 'Giải ngân ' + g.HinhThuc + ' về ngân hàng' + (tien > nhan ? ' · phí ' + (tien - nhan) + ' đ' : '') + (g.GhiChu ? ' · ' + g.GhiChu : ''),
      SoTien: nhan, HinhThuc: g.HinhThuc || '', MaKH: '', luc: String(g.NgayTao || '') });
  });
  ds.sort((a, b) => b.luc.localeCompare(a.luc) || b.so.localeCompare(a.so));
  const conCho = dangCho_(n, dau, cho);
  const lech = k => Utilities.formatDate(new Date(Date.parse(n + 'T12:00:00Z') + k * 864e5), 'UTC', 'yyyy-MM-dd');
  return { ngay: n, homNay: homNay, truoc: lech(-1), sau: n < homNay ? lech(1) : '', batDau: dau.ngay, ton: ton, trongNgay: trong, ds: ds,
    loaiChi: LOAI_CHI, hinhThuc: (cuaHang_(CUR_SHOP).congTy.hinhThuc || ['Tiền mặt']).slice(), ncc: dsNCC_(),
    choGiaiNgan: Object.keys(cho).map(h => ({ HinhThuc: h, Phi: cho[h], con: conCho[h] || 0 })) };
}

// Tên nhà cung cấp / người nhận đã dùng (gợi ý ô "Chi cho"): bên giao ở phiếu nhập từ nhà cung cấp (không phải tồn đầu kỳ, kiểm kê,
// máy cũ thu của khách, khách trả hàng) và người nhận ở phiếu chi. Cùng cách lọc với màn Nợ nhà cung cấp của web (laNhapNCC).
const NGUON_KHONG_NO_ = /tồn đầu|đầu kỳ|kiểm kê|chuyển kho/i, NHAP_TU_KHACH_ = /^(Thu cũ đổi mới|Khách trả hàng)/i;
function dsNCC_() {
  const ten = readTable_('PhieuKho').filter(p => p.Loai === 'Nhập' && !p.SoDH && String(p.DoiTac || '').trim() && !NGUON_KHONG_NO_.test(p.DoiTac) && !NHAP_TU_KHACH_.test(String(p.GhiChu || '').trim()))
    .map(p => String(p.DoiTac).trim()).concat(readTable_('PhieuChi').map(c => String(c.DoiTac || '').trim()));
  const khoa = x => x.toLowerCase().replace(/\s+/g, ' '), da = {}; // cùng tên khác hoa thường / khoảng trắng: gợi ý một lần
  return ten.filter(x => x && !da[khoa(x)] && (da[khoa(x)] = 1)).sort((a, b) => a.localeCompare(b, 'vi'));
}

// ===== Lợi nhuận =====
/** Lãi gộp trong khoảng ngày (đơn không hủy, theo ngày lập đơn). Giá vốn theo giaVonLai_; dòng không có mã hàng (dịch vụ) coi như giá vốn 0. */
function loiNhuanKy_(from, to) {
  const g = giaVonLai_(), mayDon = {}, nhom = {};
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
    const gd = giaVonDong_(g, mayDon[l.SoDH] || (mayDon[l.SoDH] = g.mayDon(l.SoDH)), String(d.Ngay).slice(0, 10), l), von = gd.von;
    if (!gd.du) thieu[ma] = l.TenHang;
    tong.doanhThu += dt; tong.giaVon += von;
    if (ma && nhom[ma] === NHOM_MAY_CU) laiMayCu += dt - von;
    them(theoThang, String(d.Ngay).slice(0, 7), { thang: String(d.Ngay).slice(0, 7) }, dt, von);
    them(theoNhom, ma ? nhom[ma] || 'Chưa phân nhóm' : 'Dịch vụ / khác', { nhom: ma ? nhom[ma] || 'Chưa phân nhóm' : 'Dịch vụ / khác' }, dt, von);
    them(theoHang, ma || l.TenHang, { MaHH: ma || '', TenHang: l.TenHang, soLuong: 0, coGiaVon: true }, dt, von);
    theoHang[ma || l.TenHang].soLuong += sl;
    if (!gd.du) theoHang[ma].coGiaVon = false;
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
