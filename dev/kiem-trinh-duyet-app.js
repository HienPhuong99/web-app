// Kiểm tra app điện thoại (mobile/) chạy bản web trên Chromium cỡ màn hình điện thoại, không cần thao tác tay:
//   NODE_PATH=$(npm root -g) node dev/kiem-trinh-duyet-app.js
// Tự bật máy chủ thử (dev/chay-thu.js --mau-app), build app ra web (expo export) trỏ tới máy chủ đó, rồi đi qua:
// đăng nhập sai/đúng, tổng quan, tra bảo hành, giữ đăng nhập khi mở lại, đăng xuất. Ảnh chụp lưu vào thư mục tạm (in ra cuối).
// Cần Playwright + Chromium (npm i -g playwright; npx playwright install chromium) và đã chạy npm install trong mobile/.
const { spawn, spawnSync } = require('child_process'), path = require('path'), fs = require('fs'), os = require('os'), http = require('http'), assert = require('assert');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..'), MOBILE = path.join(ROOT, 'mobile');
const PORT_API = 20000 + Math.floor(Math.random() * 20000), PORT_WEB = PORT_API + 1;
const TAM = fs.mkdtempSync(path.join(os.tmpdir(), 'app-web-')), DIST = path.join(TAM, 'dist'), ANH = path.join(TAM, 'anh');
fs.mkdirSync(ANH);

function batMayChuApi() {
  const p = spawn(process.execPath, [path.join(__dirname, 'chay-thu.js'), '--mau-app'], { env: { ...process.env, PORT: String(PORT_API) } });
  let ra = '';
  return new Promise((xong, loi) => {
    p.stdout.on('data', d => { ra += d; if (/Chạy thử tại/.test(ra)) xong({ p, matKhau: /mật khẩu: (\S+)/.exec(ra)[1] }); });
    p.on('exit', c => loi(new Error('Máy chủ thử dừng (' + c + '): ' + ra)));
  });
}

function buildWeb() {
  const r = spawnSync(process.execPath, [path.join(MOBILE, 'node_modules', 'expo', 'bin', 'cli'), 'export', '--platform', 'web', '--output-dir', DIST, '--clear'],
    { cwd: MOBILE, env: { ...process.env, CI: '1', EXPO_PUBLIC_API_URL: `http://127.0.0.1:${PORT_API}/api` }, encoding: 'utf8' });
  if (r.status !== 0) throw new Error('expo export lỗi:\n' + r.stdout + r.stderr);
}

// Phục vụ thư mục dist như một web app một trang (đường dẫn lạ → index.html)
function phucVu() {
  const loai = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.ttf': 'font/ttf', '.json': 'application/json', '.ico': 'image/x-icon' };
  const s = http.createServer((req, res) => {
    let f = path.join(DIST, decodeURIComponent(req.url.split('?')[0]));
    if (!f.startsWith(DIST) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(DIST, 'index.html');
    res.writeHead(200, { 'Content-Type': loai[path.extname(f)] || 'application/octet-stream' });
    fs.createReadStream(f).pipe(res);
  });
  return new Promise(r => s.listen(PORT_WEB, '127.0.0.1', () => r(s)));
}

const BUOC = [];
const buoc = (ten, fn) => BUOC.push([ten, fn]);
const chup = (page, ten) => page.screenshot({ path: path.join(ANH, ten + '.png'), fullPage: true });
const khongTranNgang = async page => assert.ok(await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth, window.innerWidth) <= window.screen.width + 1), 'Trang tràn ngang');

buoc('Màn hình đăng nhập lấy tên cửa hàng từ máy chủ; sai mật khẩu báo lỗi', async (page, c) => {
  await page.goto(c.url);
  await page.getByTestId('ten-cua-hang').getByText('phuonghihi').waitFor();
  await page.getByText('Cửa hàng iPhone chính hãng').waitFor(); // mô tả lấy từ API thongTinDangNhap
  await page.getByTestId('o-ten').fill('admin');
  await page.getByTestId('o-mk').fill('sai-mat-khau');
  await page.getByTestId('nut-dang-nhap').click();
  await page.getByTestId('loi').getByText(/Sai tên đăng nhập/).waitFor();
  await khongTranNgang(page);
  await chup(page, '1-dang-nhap-sai');
});

buoc('Đăng nhập đúng → Tổng quan: doanh số hôm nay, đã thu, còn nợ, 7 ngày', async (page, c) => {
  await page.getByTestId('o-mk').fill(c.matKhau);
  await page.getByTestId('o-mk').press('Enter');
  await page.getByTestId('ten-nguoi-dung').getByText('Quản trị').waitFor({ timeout: 15000 });
  await page.getByText('DOANH SỐ HÔM NAY').waitFor({ timeout: 15000 });
  assert.strictEqual(await page.getByTestId('vong-giua').textContent(), '28,2 tr');
  await page.getByText('20 tr', { exact: true }).waitFor(); // đã thu
  await page.getByText('8,2 tr', { exact: true }).waitFor(); // khách còn nợ
  await page.getByText('7 ngày gần nhất').waitFor();
  await page.getByText(/1 khách còn nợ 8\.200\.000 đ/).waitFor();
  await khongTranNgang(page);
  await chup(page, '2-tong-quan');
});

buoc('Mở lại app vẫn đăng nhập (mã máy đã lưu)', async page => {
  await page.reload();
  await page.getByTestId('ten-nguoi-dung').getByText('Quản trị').waitFor({ timeout: 15000 });
});

buoc('Tra bảo hành: còn hạn, hết hạn, theo SĐT, không thấy, mã EAN, quá ngắn', async page => {
  await page.getByTestId('tab-quet').click();
  await page.getByText('Tra bảo hành').waitFor();
  const tra = async q => { await page.getByTestId('o-tra').fill(q); await page.getByTestId('nut-tra').click(); };
  await tra('356789012345672');
  await page.getByTestId('so-ket-qua').getByText('1 máy khớp "356789012345672"').waitFor({ timeout: 15000 });
  assert.match(await page.getByTestId('tinh-trang').textContent(), /^Còn 36[56] ngày$/);
  assert.strictEqual(await page.getByText(/sai số kiểm tra|mã sản phẩm/).count(), 0, 'IMEI đúng thì không cảnh báo mã');
  await page.getByTestId('the-may').getByText('Anh Minh').waitFor();
  await page.getByTestId('the-may').getByText('iPhone 16 Pro Max 256GB - Titan Đen').waitFor();
  await khongTranNgang(page);
  await chup(page, '3-tra-con-han');
  await page.getByTestId('quet-tiep').click();
  await tra('351 234 567 890 124');
  await page.getByTestId('so-ket-qua').getByText('1 máy khớp "351234567890124"').waitFor({ timeout: 15000 });
  assert.match(await page.getByTestId('tinh-trang').textContent(), /^Hết hạn \d+ ngày$/);
  await page.getByTestId('the-may').getByText('10/03/2025').waitFor(); // hết bảo hành = ngày giao 10/03/2024 + 12 tháng
  await chup(page, '4-tra-het-han');
  await tra('0911 000 001');
  await page.getByTestId('so-ket-qua').getByText('1 máy khớp "0911000001"').waitFor({ timeout: 15000 });
  await tra('999999999999999');
  await page.getByText('Không tìm thấy máy nào khớp "999999999999999"').waitFor({ timeout: 15000 });
  await page.getByText(/sai số kiểm tra/).waitFor(); // IMEI 15 số sai Luhn: gợi ý quét/gõ nhầm
  await tra('8806090123456');
  await page.getByText(/mã sản phẩm \(EAN\/UPC\)/).waitFor();
  await page.getByText('Không tìm thấy máy nào khớp "8806090123456"').waitFor({ timeout: 15000 }); // chờ tra xong (nút Tra khóa khi đang tra)
  await tra('ab');
  await page.getByTestId('loi-tra').getByText(/ít nhất 3 ký tự/).waitFor();
});

buoc('Tài khoản → Đăng xuất: hỏi lại, về màn hình đăng nhập, mở lại vẫn phải đăng nhập', async (page, c) => {
  await page.getByTestId('tab-tai-khoan').click();
  await page.getByTestId('tk-ten').getByText('Quản trị').waitFor();
  await khongTranNgang(page);
  await chup(page, '5-tai-khoan');
  page.once('dialog', d => d.dismiss()); // bấm Hủy: vẫn ở lại
  await page.getByTestId('nut-dang-xuat').click();
  await page.waitForTimeout(500);
  await page.getByTestId('tk-ten').waitFor();
  page.once('dialog', d => d.accept());
  await page.getByTestId('nut-dang-xuat').click();
  await page.getByTestId('nut-dang-nhap').waitFor({ timeout: 10000 });
  await page.reload();
  await page.getByTestId('nut-dang-nhap').waitFor({ timeout: 15000 });
  // Mã máy cũ đã bị thu hồi ở máy chủ (đăng xuất xóa khỏi trang ThietBi)
  const conLai = await (await fetch(`http://127.0.0.1:${c.portApi}/api`, { method: 'POST', body: JSON.stringify({ fn: 'tongQuanMay', may: c.mayCu }) })).json();
  assert.strictEqual(conLai.error, 'HET_PHIEN');
});

buoc('Máy chủ thu hồi phiên (đặt lại mật khẩu…) → app tự về màn hình đăng nhập', async (page, c) => {
  await page.getByTestId('o-ten').fill('admin');
  await page.getByTestId('o-mk').fill(c.matKhau);
  await page.getByTestId('nut-dang-nhap').click();
  await page.getByTestId('ten-nguoi-dung').waitFor({ timeout: 15000 });
  const may = await page.evaluate(() => localStorage.getItem('may'));
  await fetch(`http://127.0.0.1:${c.portApi}/api`, { method: 'POST', body: JSON.stringify({ fn: 'dangXuatMay', may }) }); // như bị thu hồi từ nơi khác
  await page.getByTestId('tab-quet').click();
  await page.getByTestId('o-tra').fill('356789012345672');
  await page.getByTestId('nut-tra').click();
  await page.getByTestId('nut-dang-nhap').waitFor({ timeout: 15000 });
});

(async () => {
  let api, web, browser, loi = 0;
  try {
    api = await batMayChuApi();
    console.log('Đang build app ra web (expo export)…');
    buildWeb();
    web = await phucVu();
    browser = await chromium.launch();
    const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true })).newPage();
    const loiTrang = [];
    page.on('pageerror', e => loiTrang.push(e.message));
    page.on('console', m => { if (m.type() === 'error') loiTrang.push(m.text()); });
    const c = { url: `http://127.0.0.1:${PORT_WEB}/`, matKhau: api.matKhau, portApi: PORT_API };
    for (const [ten, fn] of BUOC) {
      try {
        if (ten.startsWith('Tài khoản')) c.mayCu = await page.evaluate(() => localStorage.getItem('may'));
        await fn(page, c);
        console.log('  ok   ' + ten);
      } catch (e) {
        loi++;
        console.log('  LỖI  ' + ten + '\n       ' + String(e.message).split('\n').slice(0, 4).join('\n       '));
        await chup(page, 'loi-' + loi).catch(() => {});
      }
    }
    const loiThat = loiTrang.filter(m => !/camera|getUserMedia|NotAllowedError|NotFoundError|Permission/i.test(m));
    if (loiThat.length) { loi++; console.log('  LỖI  Lỗi JavaScript trên trang:\n       ' + loiThat.slice(0, 5).join('\n       ')); }
  } finally {
    if (browser) await browser.close();
    if (web) web.close();
    if (api) api.p.kill();
  }
  console.log('Ảnh chụp: ' + ANH);
  console.log(loi ? loi + ' lỗi' : 'OK - app điện thoại (bản web): tất cả kiểm tra đều đạt');
  process.exit(loi ? 1 : 0);
})();
