// ===== Tìm kiếm thông minh (máy chủ) =====
// Cùng thuật toán với web (Index.html, khối <tim-kiem>) và app (mobile/src/lib/timKiem.ts); dev/tim-kiem-mau.json kiểm cả ba bản.
// 1. Chuẩn hóa: bỏ dấu, chữ thường, bỏ ký tự lạ, tách chữ và số ("ip15pm" → "ip 15 pm", "128GB" → "128 gb").
// 2. Mỗi từ gõ phải khớp (AND), theo thứ tự ưu tiên: trùng nguyên từ (3 điểm) > đầu một từ (2) > nằm trong chuỗi liền không cách
//    (1: "0901234" khớp "0901 234 567", 4 số cuối IMEI) > chữ cái đầu các từ (0,8: "pm" = Pro Max, "tn" = tai nghe) > viết tắt (TU_TAT).
// 3. Không có kết quả nào thì mới thử gần đúng: cho sai 1 chữ (từ 3–6 ký tự) hoặc 2 chữ (từ 7 ký tự trở lên), đo bằng khoảng cách
//    sửa chuỗi (Damerau–Levenshtein: thêm, bớt, thay, đổi chỗ hai chữ cạnh nhau) – "iphnoe" vẫn ra "iphone".
// 4. Điểm cao xếp trước; từ gõ đầu trùng từ đầu của tên được cộng thêm; bằng điểm thì tên ngắn hơn trước.
const TU_TAT_TIM = { ss: ['samsung'], xm: ['xiaomi'], dt: ['dien thoai'], ip: ['iphone'], mb: ['macbook'], aw: ['apple watch'] };

function chuanChuTim_(s) {
  return String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ').replace(/([a-z])(\d)/g, '$1 $2').replace(/(\d)([a-z])/g, '$1 $2').trim();
}
/** Bản ghi đã chuẩn hóa để so: w = các từ, c = chuỗi liền không cách, i = chữ cái đầu các từ */
function banTim_(text) {
  const w = chuanChuTim_(text).split(' ').filter(Boolean);
  return { w: w, c: w.join(''), i: w.map(x => x[0]).join('') };
}
/** Câu tìm → các từ, mỗi từ kèm các cách hiểu (viết tắt có thể thành nhiều từ: "dt" → "dien thoai") */
function phanTichTim_(q) {
  return chuanChuTim_(q).split(' ').filter(Boolean).map(t => ({ t: t, alt: [[t]].concat((TU_TAT_TIM[t] || []).map(x => x.split(' '))) }));
}
// Khoảng cách sửa chuỗi (thêm / bớt / thay / đổi chỗ hai chữ cạnh nhau); dừng sớm khi chắc chắn vượt toiDa
function khoangCachTim_(a, b, toiDa) {
  if (Math.abs(a.length - b.length) > toiDa) return toiDa + 1;
  let d2 = null, d1 = [];
  for (let j = 0; j <= b.length; j++) d1.push(j);
  for (let i = 1; i <= a.length; i++) {
    const d = [i];
    let nho = i;
    for (let j = 1; j <= b.length; j++) {
      let v = Math.min(d1[j] + 1, d[j - 1] + 1, d1[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (d2 && i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, d2[j - 2] + 1);
      d.push(v);
      if (v < nho) nho = v;
    }
    if (nho > toiDa) return toiDa + 1;
    d2 = d1; d1 = d;
  }
  return d1[b.length];
}
function diemTu_(t, b, ganDung) {
  let best = 0;
  for (let k = 0; k < b.w.length; k++) {
    const w = b.w[k];
    if (w === t) return 3;
    if (best < 2 && w.lastIndexOf(t, 0) === 0) best = 2;
  }
  if (best) return best;
  if (t.length >= 2 && b.c.indexOf(t) >= 0) return 1;
  if (t.length >= 2 && t.length <= 4 && /^[a-z]+$/.test(t) && b.i.indexOf(t) >= 0) return 0.8;
  if (ganDung && t.length >= 3 && !/^\d+$/.test(t)) {
    const toiDa = t.length >= 7 ? 2 : 1;
    for (let k = 0; k < b.w.length; k++) {
      const w = b.w[k];
      if (/^\d+$/.test(w)) continue;
      if (khoangCachTim_(t, w, toiDa) <= toiDa || (w.length > t.length && khoangCachTim_(t, w.slice(0, t.length), toiDa) <= toiDa)) return 0.5;
    }
  }
  return 0;
}
/** Điểm của bản ghi b (banTim_) với câu tìm pt (phanTichTim_): 0 = không khớp. ganDung: cho gõ sai chính tả. */
function diemTim_(pt, b, ganDung) {
  if (!pt.length) return 1;
  let tong = 0;
  for (let n = 0; n < pt.length; n++) {
    let tot = 0;
    pt[n].alt.forEach(cach => {
      let d = 0;
      for (let m = 0; m < cach.length; m++) { const x = diemTu_(cach[m], b, ganDung); if (!x) return; d += x; }
      d = d / cach.length;
      if (d > tot) tot = d;
    });
    if (!tot) return 0;
    tong += tot;
  }
  const dau = b.w[0] || '';
  if (dau && (dau === pt[0].t || dau.lastIndexOf(pt[0].t, 0) === 0)) tong += 1;
  return tong - b.w.length * 0.01; // bằng điểm: tên ngắn (ít từ thừa) trước
}
/**
 * Lọc và xếp hạng ds theo câu tìm q; text(x) = chuỗi để tìm của một bản ghi. o.giuThuTu: giữ thứ tự ds (danh sách theo ngày),
 * chỉ lọc. Không có bản ghi nào khớp đúng thì trả kết quả gần đúng, kèm ds.ganDung = true.
 */
function timKiem_(ds, q, text, o) {
  o = o || {};
  const pt = phanTichTim_(q);
  if (!pt.length) return ds.slice();
  const ban = ds.map(x => banTim_(text(x)));
  const chay = ganDung => {
    const kq = [];
    ds.forEach((x, i) => { const d = diemTim_(pt, ban[i], ganDung); if (d) kq.push({ x: x, d: d, i: i }); });
    if (!o.giuThuTu) kq.sort((a, b) => b.d - a.d || a.i - b.i);
    return kq.map(k => k.x);
  };
  let kq = chay(false);
  if (!kq.length) { kq = chay(true); kq.ganDung = kq.length > 0; }
  return kq;
}
