// Kiểm tra giao diện trên trình duyệt thật (Chromium không giao diện), không cần thao tác tay:
//   NODE_PATH=$(npm root -g) node dev/kiem-trinh-duyet.js
// Tự bật máy chủ thử (dev/chay-thu.js) ở cổng ngẫu nhiên, đăng nhập bằng mật khẩu admin in ra, chạy từng bước, tắt máy chủ.
// Cần Playwright (npm i -g playwright) và Chromium; không bắt buộc khi dùng thật.
const { spawn } = require('child_process'), path = require('path'), assert = require('assert');
const { chromium } = require('playwright');

const PORT = 20000 + Math.floor(Math.random() * 20000);
const URL = 'http://localhost:' + PORT;

// Mỗi giai đoạn thêm bước của mình vào đây: (page, ctx) => Promise
const BUOC = [];
BUOC.push(['Đăng nhập, chỉ còn một cửa hàng', async page => {
  assert.match(await page.locator('#shopName').textContent(), /phuonghihi/);
  await page.locator('#nav a, #nav button, #nav [data-go]').filter({ hasText: 'Cài đặt' }).first().click();
  await page.waitForSelector('text=Thông tin cửa hàng');
  assert.strictEqual(await page.locator('text=Nâng cao').count(), 0, 'Mục Nâng cao (chọn cửa hàng) phải ẩn khi chỉ có 1 cửa hàng');
}]);
BUOC.push(['Báo giá vẫn lập, lưu và hỏi khi bỏ dở (hồi quy sau khi thêm Hợp đồng)', async page => {
  const hoi = [];
  const ghi = d => { hoi.push(d.message()); d.accept(); };
  page.on('dialog', ghi);
  try {
    await page.click('#nav a[data-go="baogia"]');
    await page.locator('#topActions .btn', { hasText: 'Lập báo giá' }).click();
    await page.fill('input[data-h="TenKH"]', 'minh');
    await page.locator('#picker [data-i]').first().click();
    await page.fill('tr[data-i="0"] [data-f="TenHang"]', 'iphone 16');
    await page.locator('#picker [data-i]').first().click();
    await page.locator('#topActions .btn', { hasText: 'Lưu' }).click();
    await page.waitForFunction(() => /Báo giá \d{3}-\d{4}\/BG/.test(document.querySelector('#title').textContent), null, { timeout: 8000 });
    await page.locator('#topActions .btn', { hasText: 'Sao chép' }).click(); // bản sao chưa lưu
    await page.click('#nav a[data-go="home"]');
    assert.ok(hoi.some(m => /chưa lưu/.test(m)), 'Phải hỏi khi bỏ bản sao chưa lưu: ' + hoi.join('|'));
  } finally { page.off('dialog', ghi); }
}]);
BUOC.push(['Nhập khách hàng và hàng hóa từ file CSV / dán từ Excel', async page => {
  const hoi = [];
  const ghi = d => { hoi.push(d.message()); d.accept(); };
  page.on('dialog', ghi);
  try {
    await page.click('#nav a[data-go="khach"]');
    await page.locator('#topActions .btn', { hasText: 'Nhập từ file' }).click();
    // file CSV có BOM, ô có nháy kép chứa dấu phẩy và xuống dòng, dấu ; làm dấu ngăn cột
    const csv = '﻿Tên khách hàng;Điện thoại;Địa chỉ\r\n"Công ty Nhập, Một";0955000001;"12 Đường A\nQuận 1"\r\nKhách Nhập Hai;0955000002;\r\n;0955000003;thiếu tên\r\n';
    await page.setInputFiles('#modal input[type=file]', { name: 'khach.csv', mimeType: 'text/csv', buffer: Buffer.from(csv, 'utf-8') });
    await page.waitForSelector('#modal [name=xem] table');
    assert.match(await page.locator('#modal [name=xem]').innerText(), /3\s*dòng dữ liệu.*1 dòng thiếu/s);
    await page.locator('#modal .btn', { hasText: /^Nhập$/ }).click();
    await page.waitForSelector('#modal:has-text("Bỏ qua 1 dòng")');
    assert.match(await page.locator('#modal').innerText(), /Đã nhập 2 khách hàng.*Dòng 4: Thiếu tên/s);
    await page.locator('#modal [data-close]').first().click();
    await page.fill('input[type=search], input.search, #view input', 'Nhập Hai');
    await page.waitForSelector('#view tbody tr:has-text("Khách Nhập Hai")');
    assert.ok(hoi.some(m => /Nhập 3 dòng/.test(m)), 'Phải hỏi xác nhận: ' + hoi.join('|'));
    // hàng hóa: dán từ Excel (tab), giá có dấu chấm ngăn nghìn
    await page.click('#nav a[data-go="hang"]');
    await page.locator('#topActions .btn', { hasText: 'Nhập từ file' }).click();
    await page.fill('#modal [name=text]', 'Tên hàng\tModel\tGiá sỉ\tGiá lẻ\nỐp nhập thử\tOP1\t90.000\t120.000\n');
    await page.waitForSelector('#modal [name=xem] table');
    await page.locator('#modal .btn', { hasText: /^Nhập$/ }).click();
    await page.waitForSelector('#modal', { state: 'hidden' });
    await page.waitForSelector('#view tbody tr:has-text("Ốp nhập thử")');
    assert.match(await page.locator('#view tbody tr:has-text("Ốp nhập thử")').first().innerText(), /120\.000/);
  } finally { page.off('dialog', ghi); }
}]);
BUOC.push(['Danh sách: sắp xếp, lọc mới, Bỏ lọc, nhớ lựa chọn khi quay lại; phiếu kho có hàng hóa và số lượng', async page => {
  const chon = async (f, v) => { await page.selectOption(`#view .toolbar [data-f="${f}"]`, v); };
  const dau = () => page.locator('#view tbody tr[data-i]').first().innerText();
  await page.click('#nav a[data-go="hang"]');
  const chieu = () => page.getAttribute('#view .toolbar .chieu', 'aria-label');
  assert.match(await chieu(), /tăng dần/); // mã hàng: A → Z
  await chon('sx', 'gia'); // giá: mặc định cao trước
  assert.match(await dau(), /iPhone 16 Pro Max/);
  assert.match(await chieu(), /giảm dần/);
  assert.ok(await page.locator('#view .bo-loc').isVisible(), 'Đổi sắp xếp thì hiện nút Bỏ lọc');
  assert.ok(!(await page.locator('#view .toolbar .chieu.on').count()), 'Chiều mặc định của tiêu chí: nút ↓ không tô đậm');
  await page.click('#view .toolbar .chieu'); // đảo chiều: thấp trước
  assert.match(await dau(), /Ốp nhập thử/);
  assert.match(await chieu(), /tăng dần/);
  assert.ok(await page.locator('#view .toolbar .chieu.on').count(), 'Đã đảo chiều: nút tô đậm');
  await page.click('#nav a[data-go="khach"]');
  await page.click('#nav a[data-go="hang"]');
  assert.strictEqual(await page.inputValue('#view [data-f="sx"]'), 'gia'); // nhớ tiêu chí và chiều
  assert.match(await chieu(), /tăng dần/);
  assert.match(await dau(), /Ốp nhập thử/);
  await page.locator('#view .bo-loc').click();
  assert.deepStrictEqual([await page.inputValue('#view [data-f="sx"]'), await page.locator('#view .bo-loc').isVisible()], ['ma', false]);
  assert.match(await chieu(), /tăng dần/);
  // Phiếu kho: tạo 1 phiếu nhập 5 máy, 1 phiếu nhập 1 cái, 1 phiếu xuất 2 máy
  await page.evaluate(async () => {
    const h = S.hang.find(x => /iPhone 16/.test(x.TenHang)), op = S.hang.find(x => x.TenHang === 'Ốp nhập thử');
    const dong = (x, sl) => ({ MaHH: x.MaHH, TenHang: x.TenHang, DVT: x.DVT, SoLuong: sl });
    await api('luuChungTu', 'NK', { Ngay: '2026-01-05', DoiTac: 'Nhà cung cấp A', lines: [dong(h, 5)] });
    await api('luuChungTu', 'NK', { Ngay: '2026-01-06', DoiTac: 'Nhà cung cấp B', lines: [dong(op, 1)] });
    await api('luuChungTu', 'XK', { Ngay: '2026-01-07', DoiTac: 'Khách lẻ', lines: [dong(h, 2)] });
    await loadAll();
  });
  await page.click('#nav a[data-go="kho"]');
  await page.waitForSelector('#view tbody tr:has-text("iPhone 16 Pro Max 256GB - Titan Đen ×5")');
  await chon('sx', 'sl'); // số lượng: mặc định nhiều trước
  assert.match(await dau(), /Nhà cung cấp A[\s\S]*\+5/);
  await page.click('#view .toolbar .chieu');
  assert.match(await dau(), /Nhà cung cấp B[\s\S]*\+1/);
  await chon('loai', 'Xuất');
  assert.deepStrictEqual(await page.locator('#view tbody tr[data-i]').allInnerTexts().then(t => t.map(x => /Khách lẻ/.test(x))), [true]);
  assert.match(await page.locator('#view .foot').innerText(), /1 phiếu[\s\S]*Nhập\s*0[\s\S]*Xuất\s*2/);
  await page.fill('#view .search input', 'op nhap'); // tìm theo tên hàng trong phiếu
  await chon('loai', '');
  await page.waitForFunction(() => document.querySelector('#view .count').textContent === '1 dòng');
  await page.locator('#view .bo-loc').click();
}]);
BUOC.push(['Tổng quan động: chọn kỳ, bấm số liệu xem chi tiết, mở chứng từ, mở danh sách có bộ lọc', async page => {
  await page.click('#nav a[data-go="home"]');
  await page.click('#view [data-ky="nam"]');
  assert.match(await page.locator('#view .kpi[data-ct="ds"] .l').innerText(), /Doanh số năm nay/);
  const soDon = +(await page.locator('#view .kpi[data-ct="ds"] .s').innerText()).match(/(\d+) đơn/)[1];
  await page.click('#view .kpi[data-ct="ds"]');
  await page.waitForSelector('#modal [data-chitiet] table, #modal [data-chitiet] p');
  assert.strictEqual(await page.locator('#modal [data-chitiet] tbody tr').count(), soDon);
  assert.match(await page.locator('#modal h3').innerText(), /Doanh số năm nay/);
  await page.locator('#modal .btn', { hasText: 'Mở trong danh sách' }).click();
  await page.waitForSelector('#view .toolbar [data-f="tt"]');
  assert.deepStrictEqual([await page.inputValue('#view [data-f="tt"]'), await page.inputValue('#view [data-f="ngayFrom"]'), (await page.locator('#view .count').innerText())], ['khongHuy', new Date().getFullYear() + '-01-01', soDon + ' dòng']);
  // Cột tháng này trên biểu đồ 12 tháng, rồi bấm một đơn để mở
  await page.click('#nav a[data-go="home"]');
  assert.strictEqual(await page.locator('#view [data-ky].on').getAttribute('data-ky'), 'nam'); // nhớ kỳ đã chọn
  await page.click('#view .bars .col.now');
  await page.waitForSelector('#modal h3:has-text("Doanh số tháng")');
  if (await page.locator('#modal [data-chitiet] tbody tr').count()) {
    await page.locator('#modal [data-chitiet] tbody tr').first().click();
    await page.waitForFunction(() => /Đơn hàng \d{3}-\d{4}\/DH/.test(document.querySelector('#title').textContent), null, { timeout: 8000 });
  } else await page.locator('#modal [data-close]').first().click();
  await page.click('#nav a[data-go="home"]');
  await page.click('#view [data-ky="thang"]');
  await page.click('#view .kpi[data-ct="no"]');
  await page.waitForSelector('#modal h3:has-text("Công nợ phải thu")');
  await page.locator('#modal [data-close]').first().click();
}]);
try { require('./kiem-trinh-duyet-hopdong')(BUOC); } catch (e) { if (e.code !== 'MODULE_NOT_FOUND') throw e; }

(async () => {
  const server = spawn('node', [path.join(__dirname, 'chay-thu.js')], { env: Object.assign({}, process.env, { PORT }) });
  let out = '';
  server.stdout.on('data', d => { out += d; });
  server.stderr.on('data', d => { out += d; });
  const browser = await chromium.launch({ env: Object.assign({}, process.env, { LANG: process.env.LANG || 'C.UTF-8' }) }); // không có locale UTF-8 thì Chromium bỏ tên tệp tải về có dấu tiếng Việt
  let loi = 0;
  try {
    for (let i = 0; i < 100 && !/Chạy thử tại/.test(out); i++) await new Promise(r => setTimeout(r, 100));
    const pass = (out.match(/mật khẩu: (\S+)/) || [])[1];
    assert.ok(pass, 'Không lấy được mật khẩu admin từ máy chủ thử:\n' + out);
    const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
    const loiTrang = [];
    page.on('pageerror', e => loiTrang.push('pageerror: ' + e.message));
    page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) loiTrang.push('console: ' + m.text()); }); // bỏ qua phông chữ ngoài không tải được trong sandbox
    await page.goto(URL);
    await page.fill('#lgUser', 'admin');
    await page.fill('#lgPass', pass);
    await page.click('#loginForm button[type=submit]');
    await page.waitForSelector('#nav a, #nav button, #nav [data-go]', { timeout: 10000 });
    for (const [ten, fn] of BUOC) {
      try { await fn(page, { URL, pass }); console.log('  ok   ' + ten); }
      catch (e) { loi++; console.log('  LỖI  ' + ten + '\n       ' + String(e.message).split('\n').slice(0, 6).join('\n       ')); await page.screenshot({ path: path.join(process.env.TMPDIR || '/tmp', 'loi-' + loi + '.png') }).catch(() => {}); }
    }
    if (loiTrang.length) { loi++; console.log('  LỖI  Trình duyệt báo lỗi:\n       ' + loiTrang.join('\n       ')); }
  } finally { await browser.close(); server.kill(); }
  if (loi) { console.log(loi + ' lỗi'); process.exit(1); }
  console.log('OK - giao diện trên trình duyệt đạt');
})().catch(e => { console.error(e); process.exit(1); });
