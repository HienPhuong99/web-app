// Kiểm tra dữ liệu thử (DuLieuThu.gs): nạp, chạy lại không trùng, gỡ dấu [THỬ] của bản cũ khi nâng cấp, xóa sạch.
// Chạy trong tiến trình riêng (kiem-tra.js gọi ở cuối) để có Sheet sạch:  node dev/kiem-tra-du-lieu-thu.js
const assert = require('assert');
const fs = require('fs'), path = require('path'), vm = require('vm'), { execFileSync } = require('child_process');
const { ctx: G, sheets, logs, cache, props, thuMail } = require('./chay-thu');
const plain = x => JSON.parse(JSON.stringify(x));
const admin = G.dangNhap('admin', logs.join('\n').match(/mật khẩu: (\S+)/)[1]).token;
const PS = () => Object.keys(sheets).filter(k => k.indexOf('PS_') === 0);
const oCoDau = () => PS().flatMap(k => sheets[k].rows.flatMap((r, i) => r.filter(v => typeof v === 'string' && /\[TH[ỬU]\]/i.test(v) && !/gõ sau nâng cấp/.test(v)).map(v => k + ':' + i + ':' + v))); // bỏ qua tên người dùng tự gõ sau nâng cấp (nhật ký còn ghi)
const dem = t => sheets['PS_' + t].rows.length - 1;
const soThu = () => JSON.parse(props.get('duLieuThu.phone') || '{}');
const goc = { HangHoa: dem('HangHoa'), KhachHang: dem('KhachHang') }; // dữ liệu có sẵn của chay-thu (không phải dữ liệu thử)
const luhn = s => s.split('').reverse().reduce((t, c, i) => { let d = +c; if (i % 2) { d *= 2; if (d > 9) d -= 9; } return t + d; }, 0) % 10 === 0;
const kiemTon = () => Object.values(plain(G.taiDuLieu(admin).ton)).forEach(t => assert.ok(t.nhap >= t.xuat, 'tồn âm')); // phiếu giao lấy đúng máy đã nhập

// Chỉ chủ script chạy được
thuMail.nguoiChay = 'nguoi-khac@example.com';
assert.throws(() => G.napDuLieuThu(), /trình soạn thảo/);
assert.throws(() => G.xoaDuLieuThu(), /trình soạn thảo/);
thuMail.nguoiChay = undefined;

// ===== 1. Bản cũ (gắn dấu [THỬ]) đã nạp vào Sheet, rồi triển khai bản mới =====
// Lấy DuLieuThu.gs của bản trước có dấu [THỬ] từ git, đổi tên hàm để chạy song song với bản mới
const cu = execFileSync('git', ['show', 'c8f217d:apps-script/DuLieuThu.gs'], { cwd: path.join(__dirname, '..') }).toString()
  .replace(/\bphienThu_\b/g, 'phienThuCu_').replace(/\bhenGio_\b/g, 'henGioCu_').replace(/\bnapDuLieuThu\b/g, 'napDuLieuThuCu').replace(/\bxoaDuLieuThu\b/g, 'xoaDuLieuThuCu').replace(/\bTHU_\b/g, 'THU_CU_BAN_TRUOC');
vm.runInContext(cu, G, { filename: 'DuLieuThu-cu.gs' });
props.set('boNhanThu.phone', ''); props.set('suaKieuO.phone', ''); // giả như Sheet chưa từng chạy bản mới
G.napDuLieuThuCu();
const kh1 = { HangHoa: dem('HangHoa'), KhachHang: dem('KhachHang'), DonHang: dem('DonHang'), BaoGia: dem('BaoGia'), PhieuKho: dem('PhieuKho'), ThuTien: dem('ThuTien'), HopDong: dem('HopDong') };
assert.ok(oCoDau().length > 100);
// Một khách thật có ghi chú bắt đầu bằng "=" nằm xen giữa dữ liệu thử: giữ nguyên
const khThat = G.luuKhach(admin, { TenKH: 'Khách thật', SDT: '0909000999', GhiChu: '=giữ nguyên, không phải công thức' });
const khTay = G.luuKhach(admin, { TenKH: '[THỬ] Khách nhập tay', SDT: '0909000888', GhiChu: '=gọi trước khi giao' }); // dòng có dấu, có ô bắt đầu bằng "="
// Sheet cũ: chỉ có 6 mẫu hợp đồng; ô ghi vào lưới chưa định dạng văn bản đã bị Sheets đổi kiểu (SĐT, MST, số tài khoản thành số, ngày giờ thành ngày)
vm.runInContext('HD_LOAI_MOI_', G).forEach(l => G.xoaMauHopDong(admin, l));
const shKH = sheets.PS_KhachHang, cKH = k => shKH.rows[0].indexOf(k), D = vm.runInContext('Date', G);
const hongKH = r => /Ánh Dương/.test(r[cKH('TenKH')]);
shKH.rows.filter(hongKH).forEach(r => { r[cKH('SDT')] = Number(r[cKH('SDT')]); r[cKH('MST')] = Number(r[cKH('MST')]); r[cKH('SoTK')] = Number(r[cKH('SoTK')]); r[cKH('NgayTao')] = new D('2026-10-06T14:51:00-07:00'); }); // ngày: Sheets hiểu chữ đã ghi theo múi giờ của file (giờ Mỹ)
const shDH = sheets.PS_DonHang, cDH = shDH.rows[0].indexOf('SDT');
shDH.rows.slice(1).forEach(r => { if (/^0\d+$/.test(r[cDH])) r[cDH] = Number(r[cDH]); });
const cNgayDH = shDH.rows[0].indexOf('Ngay'), soDH1 = shDH.rows[1][0];
shDH.rows[1][cNgayDH] = new D('2026-10-06T00:00:00-07:00'); // ô ngày (không giờ) bị Sheets đổi thành ngày lúc 0 giờ theo múi giờ của file
Object.values(sheets).forEach(sh => { sh.dinhDang = []; }); // định dạng "Tự động"
// Nâng cấp: lần gọi đầu sau khi triển khai (SCHEMA mới) tự gỡ dấu, sửa kiểu ô, thêm 4 mẫu và 4 hợp đồng mẫu mới
props.set('schema', '8'); cache.delete('schema');
G.taiDuLieu(admin);
const anhDuong = G.readTable_('KhachHang').find(k => k.TenKH === 'Công ty TNHH Ánh Dương');
assert.deepStrictEqual([anhDuong.SDT, anhDuong.MST, anhDuong.SoTK, anhDuong.NgayTao], ['0281000003', '0312345678', '007100012342', '2026-10-06 14:51']);
assert.ok(G.readTable_('DonHang').every(d => typeof d.SDT === 'string' && /^0/.test(d.SDT)), 'SĐT trong đơn có số 0 đầu');
assert.strictEqual(G.findObj_('DonHang', soDH1).Ngay, '2026-10-06'); // không thành "2026-10-06 14:00"
assert.strictEqual(G.readTable_('MauHopDong').length, 10);
// Sau khi sửa, ghi tiếp vào cuối trang (lưới đã hết dòng định dạng) vẫn giữ chữ
const khMoi = G.luuKhach(admin, { TenKH: 'Khách sau nâng cấp', SDT: '0977000111' });
assert.deepStrictEqual([G.findObj_('KhachHang', khMoi.MaKH).SDT, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(G.findObj_('KhachHang', khMoi.MaKH).NgayTao)], ['0977000111', true]);
G.xoaKhach(admin, khMoi.MaKH);
assert.deepStrictEqual(oCoDau(), []);
assert.strictEqual(props.get('schema'), vm.runInContext('SCHEMA', G));
const hang = G.readTable_('HangHoa'), khach = G.readTable_('KhachHang');
assert.ok(hang.some(h => h.TenHang === 'iPhone 16 Pro Max 256GB' && h.Model === 'IP16PM'));
assert.ok(!hang.some(h => /^THU-/.test(h.Model)) && !G.readTable_('DonHangCT').some(l => /^THU-/.test(l.Model)));
assert.ok(khach.some(k => k.TenKH === 'Anh Minh') && khach.some(k => k.TenKH === 'Khách nhập tay'));
assert.strictEqual(G.findObj_('KhachHang', khTay.MaKH).GhiChu, '=gọi trước khi giao'); // ghi lại dòng đã sửa vẫn giữ dạng chữ, không thành công thức
assert.strictEqual(G.findObj_('KhachHang', khThat.MaKH).GhiChu, '=giữ nguyên, không phải công thức');
assert.ok(!G.readTable_('DonHang').some(d => /#\d/.test(d.GhiChu)) && !G.readTable_('BaoGia').some(d => /#\d/.test(d.GhiChu)));
assert.ok(G.readTable_('BaoGia').some(b => b.GhiChu === 'Khách đang cân nhắc'));
assert.ok(G.readTable_('PhieuKho').some(p => p.GhiChu === 'Nhập hàng đợt 1'));
assert.ok(G.readTable_('ThuTien').some(p => p.GhiChu === 'Đặt cọc'));
assert.ok(!PS().some(k => sheets[k].rows.some(r => r.includes('Dữ liệu thử')))); // người lập / phụ trách
// Sổ dữ liệu thử nhận đủ bản ghi cũ để chạy lại / xóa được
const so1 = soThu(), dau = p => Object.keys(so1).filter(k => k.indexOf(p) === 0).length;
assert.deepStrictEqual([dau('h:'), dau('k:'), dau('pk:'), dau('dh:'), dau('bg:'), dau('hd:')], [12, 12, 3, 27, 11, 9]); // 5 hợp đồng cũ + 4 mới tự thêm khi nâng cấp
assert.strictEqual(dem('HopDong'), kh1.HopDong + 4);
// Chỉ chạy một lần: sau nâng cấp, người dùng tự gõ "[THỬ]" vào tên thì giữ nguyên
const khSau = G.luuKhach(admin, { TenKH: '[THỬ] gõ sau nâng cấp' });
assert.strictEqual(G.boNhanThu_(), 0);
assert.strictEqual(G.findObj_('KhachHang', khSau.MaKH).TenKH, '[THỬ] gõ sau nâng cấp');
G.xoaKhach(admin, khSau.MaKH);

// Chạy napDuLieuThu sau đó: không tạo trùng (4 hợp đồng mới đã có từ lúc nâng cấp, đúng loại hợp đồng mới)
G.napDuLieuThu();
['HangHoa', 'KhachHang', 'DonHang', 'BaoGia', 'PhieuKho', 'ThuTien'].forEach(t => assert.strictEqual(dem(t), kh1[t] + (t === 'KhachHang' ? 2 : 0), t));
assert.strictEqual(dem('HopDong'), kh1.HopDong + 4);
const loaiMoi = G.readTable_('HopDong').map(h => h.LoaiHD);
['Hợp đồng đặt cọc mua hàng', 'Hợp đồng cho thuê thiết bị', 'Hợp đồng bảo hành mở rộng', 'Hợp đồng cộng tác viên bán hàng'].forEach(l => assert.ok(loaiMoi.includes(l), l));
kiemTon();

// Xóa: hết dữ liệu thử, còn dữ liệu thật (kể cả khách thật vừa thêm)
G.xoaDuLieuThu();
assert.deepStrictEqual([dem('HangHoa'), dem('DonHang'), dem('BaoGia'), dem('PhieuKho'), dem('ThuTien'), dem('HopDong'), dem('HopDongLich')], [goc.HangHoa, 0, 0, 0, 0, 0, 0]);
assert.deepStrictEqual(G.readTable_('KhachHang').map(k => k.TenKH).sort(), ['Anh Minh', 'Khách nhập tay', 'Khách thật']); // khách gốc của chay-thu + 2 khách nhập tay
assert.deepStrictEqual(soThu(), {});

// ===== 2. Nạp mới bằng bản mới =====
const truoc = Object.fromEntries(['HangHoa', 'KhachHang'].map(t => [t, dem(t)]));
G.napDuLieuThu();
assert.deepStrictEqual(oCoDau(), []);
assert.deepStrictEqual([dem('HangHoa') - truoc.HangHoa, dem('KhachHang') - truoc.KhachHang, dem('DonHang'), dem('BaoGia'), dem('PhieuKho') > 20, dem('HopDong')], [12, 12, 27, 11, true, 9]);
const ds = plain(G.taiDuLieu(admin));
assert.ok(ds.hopDong.every(h => !/thử/i.test(h.TenDN + h.GhiChu + h.NguoiPhuTrach)));
// IMEI mẫu: 15 số, đúng số kiểm tra
const imei = G.readTable_('PhieuKhoCT').flatMap(l => G.imeiList_(l.IMEI));
assert.ok(imei.length > 50 && imei.every(x => /^35\d{13}$/.test(x) && luhn(x)), imei.find(x => !luhn(x)));
assert.strictEqual(new Set(imei.filter((x, i) => imei.indexOf(x) === i)).size, G.readTable_('PhieuKhoCT').filter(l => G.readTable_('PhieuKho').find(p => p.SoPK === l.SoPK).Loai === 'Nhập').reduce((s, l) => s + G.imeiList_(l.IMEI).length, 0));
kiemTon();
// Danh sách phiếu kho kèm tổng số lượng và tên hàng (để sắp xếp, tìm theo hàng)
const nk1 = ds.phieuKho.find(p => p.GhiChu === 'Nhập hàng đợt 1');
assert.deepStrictEqual([nk1.SoLuong, /^iPhone 16 Pro Max 256GB ×6, iPhone 16 128GB ×5, iPhone 15 128GB ×6 và 9 mặt hàng khác$/.test(nk1.Hang)], [180, true]);
assert.ok(ds.phieuKho.every(p => p.SoLuong > 0 && p.Hang));
// Chạy lại: không thêm gì
const dong = PS().map(k => sheets[k].rows.length).join();
G.napDuLieuThu();
assert.strictEqual(PS().filter(k => k !== 'PS_NhatKy').map(k => sheets[k].rows.length).join(), dong.split(',').filter((_, i) => PS()[i] !== 'PS_NhatKy').join());
// Mã máy nhập từ website: tồn đầu kỳ 45 máy, không IMEI (ghi thẳng vào Sheet như bản cũ)
const may13 = G.luuHang(admin, { TenHang: 'iPhone 13 128GB web', DVT: 'Máy', NhomHang: 'iPhone 13 Series', GiaLe: 12000000 });
const themDong = (t, o) => sheets['PS_' + t].rows.push(sheets['PS_' + t].rows[0].map(c => o[c] === undefined ? '' : o[c]));
themDong('PhieuKho', { SoPK: '900-2026/NK', Ngay: '2026-09-30', Loai: 'Nhập', DoiTac: 'Tồn đầu kỳ (theo website)', GhiChu: 'Số lượng lấy từ website', NguoiTao: 'Nhập từ website', NgayTao: '2026-09-30 12:00' });
themDong('PhieuKhoCT', { SoPK: '900-2026/NK', STT: 1, MaHH: may13.MaHH, TenHang: may13.TenHang, DVT: 'Máy', SoLuong: 45 });
// Đã xóa bớt dữ liệu thử (một mặt hàng mẫu, một hợp đồng mẫu): lần nâng cấp sau không tự tạo lại
const soTruoc = soThu(), hdTruoc = dem('HopDong'), hhTruoc = dem('HangHoa');
G.xoaHang(admin, soTruoc['h:11']); G.xoaHopDong(admin, soTruoc['hd:ctv']);
const tonTruoc = plain(G.tonKho_()), hangMay = G.readTable_('HangHoa').filter(h => h.DVT === 'Máy' && h.NhomHang !== 'Máy cũ').map(h => h.MaHH);
props.set('schema', '9'); props.set('boSung.10', ''); props.set('tonMay.15', ''); cache.delete('schema');
G.taiDuLieu(admin);
assert.deepStrictEqual([dem('HangHoa'), dem('HopDong')], [hhTruoc - 1, hdTruoc - 1]);
// Bản 15 tự chuẩn hóa một lần: mỗi mã máy còn 2–3 máy, máy nào cũng có IMEI (15 số hợp lệ, không trùng); phụ kiện giữ nguyên
{
  const tonSau = plain(G.tonKho_()), loai = {}, net = {};
  G.readTable_('PhieuKho').forEach(p => { loai[p.SoPK] = p.Loai; });
  G.readTable_('PhieuKhoCT').forEach(l => G.imeiList_(l.IMEI).forEach(x => { const k = l.MaHH + '|' + x; net[k] = (net[k] || 0) + (loai[l.SoPK] === 'Nhập' ? 1 : -1); }));
  hangMay.filter(m => tonTruoc[m]).forEach(m => {
    const con = tonSau[m].nhap - tonSau[m].xuat;
    assert.ok(con >= 2 && con <= 3, m + ' còn ' + con);
    assert.strictEqual(Object.keys(net).filter(k => k.startsWith(m + '|') && net[k] > 0).length, con, m); // máy nào cũng có IMEI
  });
  Object.keys(tonTruoc).filter(m => !hangMay.includes(m)).forEach(m => assert.deepStrictEqual(tonSau[m], tonTruoc[m], m));
  const tatCa = G.readTable_('PhieuKhoCT').flatMap(l => G.imeiList_(l.IMEI)).filter(x => /^357/.test(x));
  assert.ok(tatCa.length >= 2 && tatCa.every(x => /^\d{15}$/.test(x) && luhn(x)));
  assert.ok(G.readTable_('NhatKy').some(n => n.HanhDong === 'Chuẩn hóa tồn kho máy'));
  assert.match(G.chuanHoaTonMay()[0], /không có gì cần sửa/); // chạy lại: không đổi gì
  kiemTon();
}
// Sửa giờ lệch (chỉ trên Sheet của cửa hàng, đúng các dòng trong danh sách): chuỗi giờ Việt Nam sai → giờ của file Sheet
const { ss } = require('./chay-thu'), GL = vm.runInContext('GIO_LECH_', G), idCu = ss.id;
const o = (t, r, c) => sheets[t].rows[r - 1][sheets[t].rows[0].indexOf(c)], dat = (t, r, c, v) => { sheets[t].rows[r - 1][sheets[t].rows[0].indexOf(c)] = v; };
dat('PS_KhachHang', 2, 'NgayTao', '2026-10-07 04:51'); dat('PS_DonHang', 2, 'Ngay', '2026-10-06 14:00'); dat('PS_DonHang', 2, 'NgayGiao', '2027-02-23 15:00'); dat('PS_PhieuKho', 2, 'NgayTao', '2026-09-30 12:00');
props.set('suaGioLech', '');
assert.strictEqual(G.suaGioLech_(), 0); // Sheet khác: không làm gì
ss.id = GL.sheetId;
assert.ok(G.suaGioLech_() > 0);
assert.deepStrictEqual([o('PS_KhachHang', 2, 'NgayTao'), o('PS_DonHang', 2, 'Ngay'), o('PS_DonHang', 2, 'NgayGiao'), o('PS_PhieuKho', 2, 'NgayTao')], ['2026-10-06 14:51', '2026-10-06', '2027-02-23', '2026-09-30 12:00']); // dòng 2 phiếu kho không thuộc danh sách
assert.strictEqual(G.suaGioLech_(), 0); // chỉ một lần
ss.id = idCu;
G.xoaDuLieuThu();
assert.deepStrictEqual([dem('HangHoa'), dem('KhachHang'), dem('DonHang'), dem('PhieuKho'), dem('HopDong')], [truoc.HangHoa + 1, truoc.KhachHang, 0, 1, 0]); // còn mã + phiếu tồn đầu kỳ nhập tay ở trên

console.log('OK - dữ liệu thử: nạp, chạy lại, gỡ dấu [THỬ] bản cũ, xóa');
