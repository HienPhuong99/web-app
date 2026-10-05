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
