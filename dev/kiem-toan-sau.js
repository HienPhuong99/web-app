// Kiểm toán sâu & kiểm tra bất biến (PoC BUG-01 → BUG-06 + bất biến đợt 2):  node dev/kiem-toan-sau.js
const assert = require('assert');
const vm = require('vm');
const { ctx: G, sheets, logs, cache } = require('./chay-thu');

const adminPass = logs.join('\n').match(/mật khẩu: (\S+)/)[1];
G.caiDat();
const today = G.now_().slice(0, 10);
const plain = x => JSON.parse(JSON.stringify(x));
const api = body => plain(JSON.parse(G.doPost({ postData: { contents: JSON.stringify(body) } }).getContent()));
const may = (u, p, ten) => api({ fn: 'dangNhapMay', args: [u, p, ten] }).result.may;
const goi = (m, fn, ...args) => { const r = api({ may: m, fn, args }); if (!r.ok) throw new Error(r.error); return r.result; };
const goiMoi = (m, fn, ...args) => { const r = api({ may: m, fn, args, moi: true }); if (!r.ok) throw new Error(r.error); return r.result; };

const tAdmin = G.dangNhap('admin', adminPass).token;
G.luuTaiKhoan(tAdmin, { TenDangNhap: 'nv_kt', HoTen: 'NV Kiểm Toán', VaiTro: 'nhanvien', MatKhau: 'nv-123456', CuaHang: 'phone', moi: true });
const mNV = may('nv_kt', 'nv-123456', 'iPhone Kiểm Toán');

// ===== 1. PoC BUG-01 → BUG-06 (hồi quy các lỗi đợt 1) =====
{
  // BUG-01: Khách lẻ trả lại một phần tiền -> công nợ không được âm khi đơn trước đó của khách lẻ khác còn nợ
  const leNo = goi(mNV, 'banNhanh', { khachMoi: { TenKH: 'Khách lẻ' }, lines: [{ TenHang: 'Ốp lẻ nợ', SoLuong: 1, DonGia: 200000 }], thu: { SoTien: 0 } });
  G.luuChungTu(tAdmin, 'NK', { Ngay: today, DoiTac: 'NCC', lines: [{ MaHH: 'HH0001', TenHang: 'iPhone 16 Pro Max 256GB - Titan Đen', SoLuong: 1, IMEI: '358888000000001', GiaVon: 25000000 }] });
  const leMua = goi(mNV, 'banNhanh', { MaKH: leNo.MaKH, lines: [{ MaHH: 'HH0001', SoLuong: 1, DonGia: 28000000, IMEI: '358888000000001' }, { TenHang: 'Cường lực', SoLuong: 1, DonGia: 200000 }],
    thu: { SoTien: 28200000, HinhThuc: 'Tiền mặt' } });
  const tra = goi(mNV, 'traHang', { SoDH: leMua.SoDH, lines: [{ MaHH: 'HH0001', IMEI: '358888000000001' }], hoan: { SoTien: 28000000, HinhThuc: 'Tiền mặt' } });
  assert.strictEqual(G.findObj_('ThuTien', tra.SoPT).SoDH, leMua.SoDH, 'BUG-01: Phiếu hoàn tiền phải gắn SoDH');
  assert.strictEqual(goiMoi(mNV, 'chiTietKhach', leNo.MaKH).no, 200000, 'BUG-01: Nợ khách lẻ không bị bù chéo');

  // BUG-02: Mở phiếu trả lại tiền (SoTien âm) trên web rồi lưu ghi chú -> vẫn giữ số âm
  const ptHoan = G.findObj_('ThuTien', tra.SoPT);
  const ptSua = G.luuThuTien(tAdmin, Object.assign({}, ptHoan, { SoTien: Math.abs(ptHoan.SoTien), GhiChu: 'Đã chi tiền mặt tại quầy' }));
  assert.strictEqual(ptSua.SoTien, -28000000, 'BUG-02: Phiếu hoàn tiền không bị lật dấu thành dương');
  assert.throws(() => G.luuThuTien(tAdmin, Object.assign({}, ptHoan, { SoTien: 500000 })), /phiếu trả lại tiền khách/, 'BUG-02: Không cho đổi số tiền phiếu hoàn');

  // BUG-03A/B/C: Hợp đồng lập từ đơn có giảm giá hoặc đơn lên đời
  const khHD = goi(mNV, 'luuKhach', { TenKH: 'Công ty Kiểm Toán', SDT: '0911888999' });
  const hdGiam = G.luuHopDong(tAdmin, { LoaiHD: 'Hợp đồng mua bán', TenDN: khHD.TenKH, MaKH: khHD.MaKH, VAT: 10,
    lines: [{ MaHH: 'HH0002', TenHang: 'iPhone 15', SoLuong: 1, DonGia: 15000000 }, { TenHang: 'Giảm giá', SoLuong: 1, DonGia: -1000000 }] }).doc;
  assert.deepStrictEqual([hdGiam.TienHang, hdGiam.TienVAT, hdGiam.TongCong], [14000000, 1400000, 15400000], 'BUG-03A: Dòng giảm giá âm trừ trước VAT');
  assert.throws(() => G.luuHopDong(tAdmin, { LoaiHD: 'Hợp đồng mua bán', TenDN: khHD.TenKH, lines: [{ MaHH: 'HH0002', TenHang: 'iPhone 15', SoLuong: 1, DonGia: -1 }] }), /không được âm/);

  // BUG-05: Nhà cung cấp khác hoa thường / khoảng trắng gộp làm một trong gợi ý dsNCC_
  G.luuChungTu(tAdmin, 'NK', { Ngay: today, DoiTac: 'Công Ty Ánh Dương', lines: [{ MaHH: 'HH0002', TenHang: 'iPhone 15', SoLuong: 1, IMEI: '358888000000002', GiaVon: 10000000 }] });
  goi(mNV, 'luuPhieuChi', { Ngay: today, Loai: 'Trả nhà cung cấp', DoiTac: '  công ty   ánh dương ', SoTien: 10000000, HinhThuc: 'Chuyển khoản' });
  const dsNcc = goiMoi(mNV, 'soQuyMay', '').ncc.filter(x => /ánh dương/i.test(x));
  assert.strictEqual(dsNcc.length, 1, 'BUG-05: Không nhân đôi tên nhà cung cấp khác hoa thường');

  // BUG-06: Phản ví dụ tối thiểu — khách trả một phần phụ kiện của đơn có giảm giá và đã thu đủ tiền
  const op = G.luuHang(tAdmin, { TenHang: 'Ốp kiểm toán', DVT: 'Cái', GiaLe: 500000 });
  G.luuChungTu(tAdmin, 'NK', { Ngay: today, DoiTac: 'NCC', lines: [{ MaHH: op.MaHH, TenHang: op.TenHang, SoLuong: 5, GiaVon: 200000 }] });
  const dGiam = goi(mNV, 'banNhanh', { MaKH: khHD.MaKH, lines: [{ MaHH: op.MaHH, SoLuong: 2, DonGia: 500000 }], GiamGia: 200000, thu: { SoTien: 800000, HinhThuc: 'Tiền mặt' } });
  const xem = goi(mNV, 'traHang', { SoDH: dGiam.SoDH, lines: [{ MaHH: op.MaHH, SoLuong: 1 }], xemTruoc: true });
  // Trả 1/2 ốp: tiền hàng còn 500k, giảm giá chia theo tỷ lệ còn 100k -> đơn mới 400k, hoàn tối đa 400k (nếu giữ nguyên giảm giá 200k thì đơn còn 300k, khách được hoàn 500k = mua 1 ốp với giá 300k!)
  assert.deepStrictEqual([xem.tongMoi, xem.hoanToiDa], [400000, 400000], 'BUG-06: Phản ví dụ tối thiểu — giảm giá chia đúng tỷ lệ khi trả phụ kiện');
}

// ===== 2. Bất biến 1 đợt 2 (VIEC-03): Linh kiện sửa chữa chỉ xuất kho đúng 1 lần =====
{
  const lk = G.luuHang(tAdmin, { TenHang: 'Màn hình kiểm toán', DVT: 'Cái', GiaLe: 2000000 });
  G.luuChungTu(tAdmin, 'NK', { Ngay: today, DoiTac: 'NCC LK', lines: [{ MaHH: lk.MaHH, TenHang: lk.TenHang, SoLuong: 10, GiaVon: 900000 }] });
  const tonLK = () => { const x = G.tonKho_()[lk.MaHH]; return x.nhap - x.xuat; };
  const tonBanDau = tonLK();

  const p = goi(mNV, 'luuSuaChua', { Loai: 'Sửa chữa', khachMoi: { TenKH: 'Khách Kiểm Toán Sửa', SDT: '0977888999' }, TenMay: 'iPhone 13 Pro', TinhTrang: 'Sọc màn', ChiPhi: 2500000, LinhKien: [{ MaHH: lk.MaHH, SoLuong: 1 }] });
  // Khi máy 1 đang giữ khóa traSua_ (đang chạy banNhanh), máy 2 không được ghi đè phiếu qua luuSuaChua hay traMaySua(phieu)
  cache.set('traSua_phone_' + p.SoPN, '1');
  assert.throws(() => goi(mNV, 'luuSuaChua', { SoPN: p.SoPN, LinhKien: [{ MaHH: lk.MaHH, SoLuong: 3 }] }), /đang được trả ở máy khác/);
  assert.throws(() => goi(mNV, 'traMaySua', p.SoPN, { phieu: { TenMay: 'iPhone 13 Pro', TinhTrang: 'Sọc màn', LinhKien: [{ MaHH: lk.MaHH, SoLuong: 3 }] }, ChiPhi: 2500000 }), /đang được trả ở máy khác/);
  cache.delete('traSua_phone_' + p.SoPN);

  // Trả máy lần 1: xuất đúng 1 màn hình
  const kqTra = goi(mNV, 'traMaySua', p.SoPN, { thu: { SoTien: 2500000, HinhThuc: 'Tiền mặt' } });
  assert.strictEqual(tonLK(), tonBanDau - 1, 'Linh kiện xuất đúng 1 lần khi trả máy');
  assert.strictEqual(kqTra.TrangThai, 'Đã trả khách');

  // Trả máy lần 2 hoặc quản trị đổi ngược trạng thái về Đã sửa xong đều bị chặn
  assert.throws(() => goi(mNV, 'traMaySua', p.SoPN, { thu: { SoTien: 2500000 } }), /đã trả khách/);
  assert.throws(() => G.luuSuaChua(tAdmin, { SoPN: p.SoPN, TrangThai: 'Đã sửa xong' }), /không đổi lại trạng thái/);
  assert.throws(() => G.luuSuaChua(tAdmin, { SoPN: p.SoPN, TrangThai: 'Đang sửa' }), /không đổi lại trạng thái/);
  // Quản trị sửa ghi chú Kết quả thì được, nhưng LinhKien và TrangThai giữ nguyên, tồn kho không đổi
  const suaKetQua = G.luuSuaChua(tAdmin, { SoPN: p.SoPN, KetQua: 'Đã thay màn zin, bảo hành 6 tháng', LinhKien: [{ MaHH: lk.MaHH, SoLuong: 5 }] });
  assert.deepStrictEqual([suaKetQua.TrangThai, suaKetQua.LinhKien.length, suaKetQua.LinhKien[0].SoLuong, tonLK()], ['Đã trả khách', 1, 1, tonBanDau - 1]);
}

// ===== 3. Bất biến 2 đợt 2 (VIEC-03): Fuzzing bảo toàn sổ quỹ (tienMat + nganHang + cho == dau + thu - chi) =====
{
  const chGoc = plain(G.cuaHang_('phone').congTy);
  const datCho = cho => G.luuCuaHang(tAdmin, Object.assign({}, chGoc, {
    tenNgan: 'phuonghihi',
    hinhThuc: ['Tiền mặt', 'Chuyển khoản', 'Thẻ tín dụng', 'Trả góp'],
    choGiaiNgan: cho,
  }));
  datCho('Trả góp, 0\nThẻ tín dụng, 2');
  G.luuSoDuDau(tAdmin, { ngay: today, tienMat: 5000000, nganHang: 10000000 });

  // Hàm kiểm tra bất biến sổ quỹ tại mọi bước
  const kiemBatBienQuy = buoc => {
    const sq = goiMoi(mNV, 'soQuyMay', '');
    const dau = G.soDuDau_(), cho = G.choGiaiNgan_();
    let thu = 0, chi = 0;
    G.readTable_('ThuTien').forEach(p => {
      const d = String(p.Ngay || '').slice(0, 10), t = +p.SoTien || 0;
      if ((dau.ngay && d < dau.ngay) || d > today || p.HinhThuc === 'Thu máy cũ') return;
      if (t >= 0) thu += t; else chi -= t;
    });
    G.readTable_('PhieuChi').forEach(c => {
      const d = String(c.Ngay || '').slice(0, 10), t = +c.SoTien || 0;
      if ((dau.ngay && d < dau.ngay) || d > today) return;
      chi += t;
    });
    G.readTable_('GiaiNgan').forEach(g => {
      const d = String(g.Ngay || '').slice(0, 10), phi = (+g.SoTien || 0) - (+g.ThucNhan || 0);
      if ((dau.ngay && d < dau.ngay) || d > today) return;
      chi += phi;
    });
    const tongTon = sq.ton.tienMat + sq.ton.nganHang + sq.ton.cho;
    const tongLyThuyet = dau.tienMat + dau.nganHang + thu - chi;
    assert.strictEqual(tongTon, tongLyThuyet, `Bất biến tổng quỹ lệch ở bước ${buoc}: ${tongTon} !== ${tongLyThuyet}`);
    const tongChoTheoHT = (sq.choGiaiNgan || []).reduce((s, x) => s + x.con, 0);
    assert.strictEqual(tongChoTheoHT, sq.ton.cho, `Bất biến quỹ chờ chi tiết lệch ở bước ${buoc}: ${tongChoTheoHT} !== ${sq.ton.cho}`);
    return sq;
  };

  kiemBatBienQuy('khởi tạo');
  const khFuzz = goi(mNV, 'luuKhach', { TenKH: 'Khách Fuzz Sổ Quỹ', SDT: '0933444555' });
  const pkFuzz = G.luuHang(tAdmin, { TenHang: 'Sạc nhanh Fuzz', DVT: 'Cái', GiaLe: 500000 });
  G.luuChungTu(tAdmin, 'NK', { Ngay: today, DoiTac: 'NCC Fuzz', lines: [{ MaHH: pkFuzz.MaHH, TenHang: pkFuzz.TenHang, SoLuong: 200, GiaVon: 250000 }] });

  let seed = 20261020;
  const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
  const chon = ds => ds[Math.floor(rnd() * ds.length)];
  const hinhThucDS = ['Tiền mặt', 'Chuyển khoản', 'Thẻ tín dụng', 'Trả góp'];
  const dsDon = [];

  for (let i = 1; i <= 50; i++) {
    const loai = rnd();
    if (loai < 0.35) {
      // Bán nhanh thanh toán kết hợp 2 hình thức ngẫu nhiên
      const sl = 1 + Math.floor(rnd() * 3), gia = 500000, tong = sl * gia;
      const t1 = Math.floor(rnd() * (tong + 1)), t2 = Math.floor(rnd() * (tong - t1 + 1));
      const d = goi(mNV, 'banNhanh', {
        MaKH: khFuzz.MaKH,
        lines: [{ MaHH: pkFuzz.MaHH, SoLuong: sl, DonGia: gia }],
        thu: [{ SoTien: t1, HinhThuc: chon(hinhThucDS) }, { SoTien: t2, HinhThuc: chon(hinhThucDS) }],
      });
      dsDon.push(d.SoDH);
    } else if (loai < 0.55) {
      // Thu tiền lẻ
      const tien = (1 + Math.floor(rnd() * 20)) * 50000;
      goi(mNV, 'luuThuTien', { Ngay: today, MaKH: khFuzz.MaKH, SoTien: tien, HinhThuc: chon(hinhThucDS) });
    } else if (loai < 0.72) {
      // Phiếu chi
      const tien = (1 + Math.floor(rnd() * 10)) * 50000;
      goi(mNV, 'luuPhieuChi', { Ngay: today, Loai: 'Vận chuyển', SoTien: tien, HinhThuc: chon(['Tiền mặt', 'Chuyển khoản']) });
    } else if (loai < 0.90) {
      // Giải ngân một phần hoặc toàn bộ quỹ đang chờ
      const sq = goiMoi(mNV, 'soQuyMay', '');
      const coCho = (sq.choGiaiNgan || []).filter(x => x.con > 0);
      if (coCho.length) {
        const c = chon(coCho);
        const soTien = Math.max(1, Math.floor(c.con * (0.3 + 0.7 * rnd())));
        const tuTinhPhi = rnd() < 0.5;
        const thucNhan = tuTinhPhi ? '' : Math.floor(soTien * (0.95 + 0.05 * rnd()));
        goi(mNV, 'luuGiaiNgan', { HinhThuc: c.HinhThuc, SoTien: soTien, ThucNhan: thucNhan });
      }
    } else {
      // Xóa một phiếu giải ngân ngẫu nhiên (nếu có) và kiểm tra quỹ chờ hoàn lại đúng
      const dsGN = G.readTable_('GiaiNgan');
      if (dsGN.length) G.xoaGiaiNgan(tAdmin, chon(dsGN).SoGN);
    }
    kiemBatBienQuy('fuzz-' + i);
  }

  // Ngay cả khi quản trị tắt choGiaiNgan giữa chừng (khi đã có phiếu giải ngân), tổng quỹ vẫn bảo toàn tuyệt đối (không cộng đôi ngân hàng, không âm quỹ chờ)
  datCho('');
  const sqKhiTatCho = kiemBatBienQuy('tat-cho-giai-ngan');
  assert.strictEqual(sqKhiTatCho.ton.cho, 0, 'Tắt chờ giải ngân thì quỹ chờ phải bằng 0 (không bị âm)');
  datCho('Trả góp, 0\nThẻ tín dụng, 2');
  // Xóa hết phiếu giải ngân rồi giải ngân sạch 100% -> tồn chờ = 0
  G.readTable_('GiaiNgan').forEach(g => G.xoaGiaiNgan(tAdmin, g.SoGN));
  const sqCuoi = kiemBatBienQuy('xoa-het-gn');
  (sqCuoi.choGiaiNgan || []).forEach(x => {
    if (x.con > 0) goi(mNV, 'luuGiaiNgan', { HinhThuc: x.HinhThuc, SoTien: x.con });
  });
  const sqSach = kiemBatBienQuy('giai-ngan-sach');
  assert.strictEqual(sqSach.ton.cho, 0, 'Giải ngân hết thì quỹ chờ phải về 0');
}

console.log('OK - Kiểm toán sâu: PoC BUG-01..06 và bất biến đợt 2 (linh kiện + fuzzing sổ quỹ) đều đạt');
