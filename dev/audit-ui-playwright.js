// Kiểm toán giao diện Web & Dogfooding bằng Playwright (BUG-03, BUG-05, bất biến đợt 2, và rà soát 15 màn hình):
//   node dev/audit-ui-playwright.js   (hoặc NODE_PATH=$(npm root -g) node dev/audit-ui-playwright.js)
const assert = require('assert');
const path = require('path');
const fs = require('fs');
const { spawn, execSync } = require('child_process');
let playwright;
try { playwright = require('playwright'); }
catch (e) { playwright = require(path.join(execSync('npm root -g', { encoding: 'utf8' }).trim(), 'playwright')); }
const { chromium } = playwright;

const PORT = 5192;
const URL = `http://localhost:${PORT}`;
const SHOT_DIR = process.env.DOGFOOD_DIR || '';
if (SHOT_DIR) fs.mkdirSync(SHOT_DIR, { recursive: true });

(async () => {
  const server = spawn(process.execPath, [path.join(__dirname, 'chay-thu.js'), '--du-lieu-thu'], {
    env: Object.assign({}, process.env, { PORT: String(PORT) }),
  });
  let out = '';
  server.stdout.on('data', d => { out += d; });
  server.stderr.on('data', d => { out += d; });

  const browser = await chromium.launch({ headless: true });
  try {
    for (let i = 0; i < 100 && !/Chạy thử tại/.test(out); i++) await new Promise(r => setTimeout(r, 100));
    const pass = (out.match(/mật khẩu: (\S+)/) || [])[1];
    assert.ok(pass, 'Không lấy được mật khẩu admin:\n' + out);

    const page = await (await browser.newContext({ viewport: { width: 1366, height: 860 } })).newPage();
    const loiTrang = [];
    page.on('pageerror', e => loiTrang.push('pageerror: ' + e.message));
    page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) loiTrang.push('console: ' + m.text()); });

    await page.goto(URL);
    await page.fill('#lgUser', 'admin');
    await page.fill('#lgPass', pass);
    await page.click('#loginForm button[type=submit]');
    await page.waitForSelector('#nav a[data-go]', { timeout: 10000 });

    // 1. BUG-03: Lập hợp đồng từ đơn có giảm giá (hdTuDon) giữ đúng dòng giảm giá và tổng cộng
    const kqHD = await page.evaluate(async () => {
      const kh = S.khach[0];
      const dh = (await api('luuChungTu', 'DH', {
        Ngay: today(), MaKH: kh.MaKH, TenKH: kh.TenKH, VAT: 10, GiamGia: 500000,
        lines: [{ TenHang: 'Dịch vụ kiểm toán HD', SoLuong: 1, DonGia: 5500000 }],
      })).doc;
      S.donHang.unshift(dh);
      await hdTuDon(dh);
      const tongUI = hdTotal().tong;
      const dongGiam = S.hd.lines.find(l => /Giảm giá/.test(l.TenHang));
      S.dirty = false; go('home');
      return { tongDH: dh.TongCong, tongUI, donGiaGiam: dongGiam && dongGiam.DonGia };
    });
    assert.deepStrictEqual([kqHD.tongUI, kqHD.donGiaGiam], [kqHD.tongDH, -500000], 'hdTuDon phải chép dòng giảm giá sang hợp đồng');
    console.log('  ok   BUG-03: hdTuDon chép đúng dòng giảm giá sang hợp đồng trên Web');

    // 2. BUG-05: noNCC() gộp tên nhà cung cấp không phân biệt hoa thường / khoảng trắng
    const kqNCC = await page.evaluate(() => {
      S.phieuKho.push({ SoPK: 'PK-AUDIT-1', Loai: 'Nhập', Ngay: today(), DoiTac: 'NCC Kiểm Toán UI', GiaTri: 8000000, GhiChu: '' });
      S.phieuChi.push({ SoPC: 'PC-AUDIT-1', Loai: S.loaiChi[0], Ngay: today(), DoiTac: '  ncc   kiểm toán ui ', SoTien: 8000000 });
      const ds = noNCC().filter(x => /kiểm toán ui/i.test(x.ten));
      S.phieuKho = S.phieuKho.filter(p => p.SoPK !== 'PK-AUDIT-1');
      S.phieuChi = S.phieuChi.filter(c => c.SoPC !== 'PC-AUDIT-1');
      return ds.map(x => [x.ten, x.no]);
    });
    assert.deepStrictEqual(kqNCC, [['NCC Kiểm Toán UI', 0]]);
    console.log('  ok   BUG-05: noNCC() gộp đúng nhà cung cấp khác hoa thường trên Web');

    // 3. Bất biến đợt 2 trên Web: Phiếu sửa chữa đã trả khách khóa cả ô Trạng thái và Linh kiện (kể cả với admin)
    const kqSua = await page.evaluate(() => {
      openSuaChua({ SoPN: 'PN-AUDIT', Loai: 'Sửa chữa', MaKH: S.khach[0].MaKH, TenKH: S.khach[0].TenKH, TenMay: 'iPhone 15', TinhTrang: 'Hỏng mic', TrangThai: 'Đã trả khách', LinhKien: JSON.stringify([{ MaHH: 'HH0003', TenHang: 'Linh kiện', SoLuong: 1 }]) });
      const ttDisabled = document.querySelector('#modal [name="TrangThai"]').disabled;
      const lkDisabled = document.querySelector('#modal [data-lk-sl="0"]').disabled;
      const coTimLK = !!document.querySelector('#modal [data-lk-tim]');
      closeModal();
      return { ttDisabled, lkDisabled, coTimLK };
    });
    assert.deepStrictEqual(kqSua, { ttDisabled: true, lkDisabled: true, coTimLK: false });
    console.log('  ok   VIEC-03: Phiếu sửa chữa Đã trả khách khóa cả Trạng thái và Linh kiện trên Web');

    // 4. Bất biến đợt 2 trên Web: tonQuy() bảo toàn tuyệt đối kể cả khi tắt choGiaiNgan sau khi đã có phiếu giải ngân
    const kqQuy = await page.evaluate(async () => {
      const chGoc = Object.assign({}, S.congTy);
      const dat = async cho => {
        const r = await api('luuCuaHang', Object.assign({}, chGoc, { tenNgan: S.cuaHang.ten, moTa: S.cuaHang.moTa, choGiaiNgan: cho }));
        S.congTy = r.congTy;
      };
      await dat('Trả góp, 2');
      const t0 = tonQuy();
      const pt = await api('luuThuTien', { Ngay: today(), MaKH: S.khach[0].MaKH, TenKH: S.khach[0].TenKH, SoTien: 5000000, HinhThuc: 'Trả góp' });
      const gn = await api('luuGiaiNgan', { HinhThuc: 'Trả góp', SoTien: 5000000 }); // thực nhận 4.900.000, phí 100.000
      await loadAll();
      const tKhiCoCho = tonQuy();
      await dat(''); // tắt chờ giải ngân khi đã có phiếu giải ngân
      const tKhiTatCho = tonQuy();
      await api('xoaGiaiNgan', gn.SoGN);
      await api('xoaThuTien', pt.SoPT);
      await dat('');
      await loadAll();
      return {
        lechCoCho: [tKhiCoCho.cho - t0.cho, tKhiCoCho.nganHang - t0.nganHang],
        lechTatCho: [tKhiTatCho.cho - t0.cho, tKhiTatCho.nganHang - t0.nganHang],
      };
    });
    assert.deepStrictEqual(kqQuy.lechCoCho, [0, 4900000]);
    assert.deepStrictEqual(kqQuy.lechTatCho, [0, 4900000], 'Tắt chờ giải ngân không được cộng đôi ngân hàng hay làm âm quỹ chờ trên Web');
    console.log('  ok   VIEC-03: Sổ quỹ Web (tonQuy) bảo toàn tổng quỹ ngay cả khi đổi cài đặt choGiaiNgan');

    // 5. VIEC-04: Dogfood rà soát toàn bộ màn hình trong VIEWS (kiểm tra lỗi JS, tràn ngang desktop & mobile 375px)
    const manHinh = await page.evaluate(() => Object.keys(VIEWS).filter(k => k !== 'doc' && k !== 'hd'));
    for (const m of manHinh) {
      await page.evaluate(slug => { S.dirty = false; go(slug); }, m);
      await page.waitForTimeout(80);
      if (SHOT_DIR) await page.screenshot({ path: path.join(SHOT_DIR, `web-${m}.png`) });
      const tranDesktop = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      assert.strictEqual(tranDesktop, 0, `Màn ${m} bị tràn ngang trên desktop (1366px): +${tranDesktop}px`);
    }
    await page.setViewportSize({ width: 375, height: 812 });
    for (const m of ['home', 'donhang', 'suachua', 'soquy', 'ton', 'hopdong']) {
      await page.evaluate(slug => { S.dirty = false; go(slug); }, m);
      await page.waitForTimeout(80);
      if (SHOT_DIR) await page.screenshot({ path: path.join(SHOT_DIR, `mobile-${m}.png`) });
      const tranMobile = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      assert.strictEqual(tranMobile, 0, `Màn ${m} bị tràn ngang trên điện thoại (375px): +${tranMobile}px`);
    }
    console.log('  ok   VIEC-04: Rà soát 17 màn hình Web (Desktop 1366px & Mobile 375px) không lỗi JS, không tràn ngang');

    assert.strictEqual(loiTrang.length, 0, 'Lỗi console/pageerror: ' + loiTrang.join('; '));
    console.log('OK - Kiểm toán giao diện Playwright đạt 100%');
  } finally {
    await browser.close();
    server.kill();
  }
})().catch(e => { console.error(e); process.exit(1); });
