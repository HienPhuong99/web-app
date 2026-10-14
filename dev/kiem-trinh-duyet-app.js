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

// Tab ẩn và màn hình phía sau vẫn nằm trong trang: chỉ lấy phần tử đang hiện
const v = (page, id) => page.getByTestId(id).filter({ visible: true });
const rpc = async (c, fn, ...args) => {
  const r = await (await fetch(`http://127.0.0.1:${c.portApi}/rpc`, { method: 'POST', body: JSON.stringify({ fn, args }) })).json();
  if (!r.ok) throw new Error(fn + ': ' + r.error);
  return r.result;
};
const api = async (c, body) => (await fetch(`http://127.0.0.1:${c.portApi}/api`, { method: 'POST', body: JSON.stringify(body) })).json();

buoc('Quét: dán IMEI đã sao chép, bộ nhớ tạm trống thì báo; chọn ảnh có mã QR', async page => {
  await v(page, 'quet-tiep').click(); // bước trước còn để kết quả tra
  await page.evaluate(() => navigator.clipboard.writeText('IMEI: 356789012345672'));
  await v(page, 'nut-dan').click();
  await v(page, 'so-ket-qua').getByText('1 máy khớp "356789012345672"').waitFor({ timeout: 15000 });
  await v(page, 'quet-tiep').click();
  await page.evaluate(() => navigator.clipboard.writeText(''));
  await v(page, 'nut-dan').click();
  await v(page, 'loi-tra').getByText(/Chưa có gì để dán/).waitFor();
  const [fc] = await Promise.all([page.waitForEvent('filechooser'), v(page, 'nut-anh').click()]);
  await fc.setFiles(path.join(__dirname, 'mau', 'imei-qr.png')); // ảnh mã QR chứa IMEI 356789012345672
  await v(page, 'so-ket-qua').getByText('1 máy khớp "356789012345672"').waitFor({ timeout: 30000 });
  await chup(page, '5-quet-anh');
  await v(page, 'quet-tiep').click();
});

buoc('Bán nhanh: máy trong kho, quét trùng, máy đã bán, IMEI chưa nhập kho, dịch vụ, khách mới, trả một phần bằng chuyển khoản (mã QR)', async (page, c) => {
  // Khai tài khoản nhận chuyển khoản (như quản trị làm trên web) để app có mã VietQR
  const t = (await rpc(c, 'dangNhap', 'admin', c.matKhau)).token;
  await rpc(c, 'luuCuaHang', t, { ...(await rpc(c, 'taiDuLieu', t)).congTy, tenNgan: 'phuonghihi', qrNganHang: '970436', qrSoTK: '0123456789', qrChuTK: 'NGUYEN VAN A' });
  await page.getByTestId('tab-ban').click();
  await v(page, 'tieu-de-ban').waitFor();
  const them = async ma => { await v(page, 'o-imei-ban').fill(ma); await v(page, 'nut-them-imei').click(); };
  await them('356789012345680');
  await v(page, 'dong-gio').getByText('iPhone 16 Pro Max 256GB - Titan Đen').waitFor({ timeout: 15000 });
  assert.strictEqual(await v(page, 'o-gia').first().inputValue(), '28.200.000'); // giá lẻ lấy từ danh mục
  await them('356789012345680');
  await v(page, 'loi-imei').getByText(/đã có trong đơn/).waitFor();
  await them('356789012345672');
  await v(page, 'loi-imei').getByText(/đã bán ngày .* cho Anh Minh/).waitFor({ timeout: 15000 });
  await them('353333333333336'); // chưa từng nhập kho: chọn mặt hàng cho máy này
  await v(page, 'ma-chua-co').waitFor({ timeout: 15000 });
  await v(page, 'hang-HH0002').click();
  await page.getByText('IMEI 353333333333336').waitFor();
  assert.strictEqual(await v(page, 'dong-gio').count(), 2);
  await v(page, 'nut-bo-dong').nth(1).click();
  assert.strictEqual(await v(page, 'dong-gio').count(), 1);
  await v(page, 'nut-them-hang').click();
  await v(page, 'o-tim-hang').fill('Ốp lưng MagSafe');
  await v(page, 'o-gia-dv').fill('150000');
  await v(page, 'nut-them-dv').click();
  await v(page, 'nut-tang').click();
  assert.strictEqual(await v(page, 'so-luong').textContent(), '2');
  await v(page, 'tong-cong').getByText('28.500.000 đ').waitFor();
  await v(page, 'o-tim-khach-ban').fill('Chị Lan');
  await v(page, 'o-sdt-khach-moi').fill('0988 111 222');
  await v(page, 'nut-khach-moi').click();
  await v(page, 'khach-da-chon').getByText('Chị Lan').waitFor();
  await v(page, 'o-khach-tra').fill('20000000');
  await v(page, 'con-no').getByText('Khách còn nợ 8.500.000 đ').waitFor();
  await v(page, 'ht-chuyen-khoan').click();
  const qr = page.locator('img[src*="img.vietqr.io"]').filter({ visible: true });
  await qr.waitFor({ timeout: 10000 });
  assert.match(await qr.getAttribute('src'), /970436-0123456789-compact2\.png\?amount=20000000&addInfo=CHI%20LAN%20MUA%20HANG&accountName=NGUYEN%20VAN%20A$/);
  await khongTranNgang(page);
  await chup(page, '6-ban-nhanh');
  page.once('dialog', d => d.accept());
  await v(page, 'nut-ban').click();
  await v(page, 'da-ban').waitFor({ timeout: 20000 });
  const kq = await v(page, 'ket-qua-ban').textContent();
  assert.match(kq, /Còn nợ8\.500\.000 đ/);
  c.soDH = /\d+-\d{4}\/DH/.exec(kq)[0];
  await page.getByText('BH đến').first().waitFor(); // máy có hạn bảo hành
  await chup(page, '7-da-ban');
  // Máy chủ: máy đã ra khỏi kho
  const may = await page.evaluate(() => localStorage.getItem('may'));
  assert.strictEqual((await api(c, { may, fn: 'traMaKho', args: ['356789012345680'] })).result.trangThai, 'daBan');
});

buoc('Thu nốt tiền còn nợ của đơn vừa bán → hồ sơ khách hết nợ, có máy vừa mua', async (page, c) => {
  await v(page, 'nut-thu-sau-ban').click();
  await v(page, 'o-so-tien').waitFor({ timeout: 15000 });
  assert.strictEqual(await v(page, 'o-so-tien').inputValue(), '8.500.000');
  await v(page, 'tt-ht-tien-mat').click();
  await khongTranNgang(page);
  await v(page, 'nut-luu-thu').click();
  const xong = v(page, 'phieu-thu-xong');
  await xong.waitFor({ timeout: 15000 });
  assert.match(await xong.textContent(), new RegExp('8\\.500\\.000 đ.*Tiền mặt.*' + c.soDH.replace('/', '\\/')));
  await v(page, 'nut-xong-thu').click();
  await v(page, 'nut-xem-khach').waitFor();
  // về màn Đã bán: không còn "Còn nợ" và nút Thu tiền (trước đây vẫn hiện số cũ, bấm lại là thu trùng)
  await page.waitForFunction(() => ![...document.querySelectorAll('[data-testid="nut-thu-sau-ban"]')].some(e => e.offsetParent), null, { timeout: 15000 });
  await v(page, 'nut-xem-khach').click();
  await v(page, 'cong-no').getByText('Không còn nợ').waitFor({ timeout: 15000 });
  await v(page, 'the-may').getByText('356789012345680').waitFor();
  await v(page, 'ds-don').getByText(c.soDH).waitFor();
  await v(page, 'nut-zalo').waitFor();
  await khongTranNgang(page);
  await chup(page, '8-ho-so-khach');
  await v(page, 'nut-lui').click();
  await v(page, 'nut-ban-moi').click();
  await v(page, 'o-imei-ban').waitFor();
});

buoc('Bán nhanh: gõ vài số cuối IMEI là ra máy trong kho; chọn mặt hàng máy (tìm "ip16pm") thì chọn máy trong kho', async page => {
  await v(page, 'o-imei-ban').fill('5706'); // máy 356789012345706 đang trong kho
  await v(page, 'ma-ton-356789012345706').click({ timeout: 15000 });
  await page.getByText('IMEI 356789012345706').waitFor();
  assert.strictEqual(await v(page, 'o-imei-ban').inputValue(), '');
  await v(page, 'nut-them-hang').click();
  await v(page, 'o-tim-hang').fill('ip16pm'); // tìm kiếm thông minh: viết liền, "pm" = Pro Max
  await v(page, 'hang-HH0001').click();
  await v(page, 'chon-may-trong-kho').waitFor();
  assert.strictEqual(await v(page, 'may-kho-356789012345706').count(), 0); // máy đã có trong đơn không hiện lại
  await v(page, 'may-kho-356789012345714').click();
  await page.getByText('IMEI 356789012345714').waitFor();
  assert.strictEqual(await v(page, 'dong-gio').count(), 2);
  await khongTranNgang(page);
  page.once('dialog', d => d.accept());
  await page.getByText('Xóa đơn đang soạn').click();
  await page.waitForFunction(() => !document.querySelector('[data-testid="dong-gio"]'), null, { timeout: 5000 });
});

buoc('Khách: tìm không dấu, mở hồ sơ; thêm khách mới', async page => {
  await page.getByTestId('tab-khach').click();
  await v(page, 'o-tim-khach').fill('chi lan');
  await v(page, 'ds-khach').getByText('Chị Lan').waitFor({ timeout: 15000 });
  await v(page, 'ds-khach').getByText('Chị Lan').click();
  await v(page, 'the-cong-no').waitFor({ timeout: 15000 });
  await v(page, 'nut-lui').click();
  // Lọc, sắp xếp (máy chủ làm): Chị Lan đã trả hết, Anh Minh còn nợ
  await v(page, 'o-tim-khach').fill('');
  await v(page, 'loc-khach-no').click();
  await v(page, 'ds-khach').getByText('Anh Minh').waitFor({ timeout: 15000 });
  await page.waitForFunction(() => !/Chị Lan/.test([...document.querySelectorAll('[data-testid="ds-khach"]')].map(e => e.innerText).join()), null, { timeout: 15000 });
  await v(page, 'loc-khach-chua').click();
  await page.getByText('Không có khách nào chưa mua.').filter({ visible: true }).waitFor({ timeout: 15000 });
  await v(page, 'loc-khach-tat').click();
  // Sắp theo tên: bấm lần đầu A → Z, bấm lại Z → A
  const theoTen = chieu => page.waitForFunction(c => { const t = [...document.querySelectorAll('[data-testid^="khach-KH"]')].filter(e => e.offsetParent).map(e => e.innerText.split('\n')[0]); return t.length >= 2 && t.every((x, i) => !i || c * t[i - 1].localeCompare(x, 'vi') <= 0) && t[0] !== t[t.length - 1]; }, chieu, { timeout: 15000 });
  await v(page, 'sx-khach-ten').click();
  await theoTen(1);
  await chup(page, '9a-khach-loc');
  await v(page, 'sx-khach-ten').click();
  await theoTen(-1);
  assert.match(await v(page, 'sx-khach-ten').getAttribute('aria-label'), /giảm dần/);
  await v(page, 'sx-khach-gan').click();
  await v(page, 'nut-them-khach').click();
  await v(page, 'o-ten-khach').fill('Anh Phát');
  await v(page, 'o-sdt-khach').fill('0909 222 333');
  await v(page, 'nut-luu-khach').click();
  await page.getByText('Anh Phát').filter({ visible: true }).first().waitFor({ timeout: 15000 });
  await v(page, 'cong-no').getByText('Không còn nợ').waitFor({ timeout: 15000 });
  await chup(page, '9-khach-moi');
  await v(page, 'nut-lui').click();
});

buoc('Kho: tồn kho, kiểm tra IMEI, thẻ kho; Hợp đồng; Thêm: Face ID / thông báo chỉ có trên điện thoại', async page => {
  await page.getByTestId('tab-tai-khoan').click();
  await v(page, 'mo-kho').click();
  await v(page, 'ds-kho').getByText(/Tồn \d+/).first().waitFor({ timeout: 15000 });
  await v(page, 'o-kiem-imei').fill('356789012345698');
  await v(page, 'nut-kiem-imei').click();
  await v(page, 'tt-imei').getByText('Còn trong kho').waitFor({ timeout: 15000 });
  await v(page, 'o-kiem-imei').fill('356789012345680');
  await v(page, 'nut-kiem-imei').click();
  await v(page, 'tt-imei').getByText('Đã bán').waitFor({ timeout: 15000 });
  await khongTranNgang(page);
  // Sắp theo tồn: iPhone 16 Pro Max (HH0001) nhiều máy hơn iPhone 15 (HH0002). Bấm lần đầu: ít trước; bấm lại: nhiều trước
  const dauKho = () => page.evaluate(() => [...document.querySelectorAll('[data-testid^="kho-HH"]')].filter(e => e.offsetParent).map(e => e.dataset.testid)[0]);
  await v(page, 'sx-kho-ton').click();
  assert.strictEqual(await dauKho(), 'kho-HH0002');
  assert.match(await v(page, 'sx-kho-ton').getAttribute('aria-label'), /tồn, tăng dần/);
  await v(page, 'sx-kho-ton').click();
  assert.strictEqual(await dauKho(), 'kho-HH0001');
  assert.match(await v(page, 'sx-kho-ton').getAttribute('aria-label'), /tồn, giảm dần/);
  await v(page, 'loc-kho-con').getByText(/Còn hàng \(\d+\)/).waitFor();
  await chup(page, '10-kho');
  await v(page, 'sx-kho-ten').click();
  await v(page, 'kho-HH0001').click();
  await v(page, 'the-kho').getByText('Chị Lan').waitFor({ timeout: 15000 });
  await v(page, 'the-kho').getByText('356789012345680', { exact: true }).waitFor(); // dòng xuất bán; dòng nhập có 2 IMEI
  // Thẻ kho: chỉ nhập / chỉ xuất, sắp theo số lượng
  await v(page, 'loc-phieu-nhap').click();
  await v(page, 'the-kho').getByText('Tồn đầu kỳ').waitFor();
  assert.strictEqual(await v(page, 'the-kho').getByText('Chị Lan').count(), 0);
  await v(page, 'loc-phieu-xuat').click();
  await v(page, 'the-kho').getByText('Chị Lan').waitFor();
  assert.strictEqual(await v(page, 'the-kho').getByText('Tồn đầu kỳ').count(), 0);
  await v(page, 'loc-phieu-tat').click();
  await v(page, 'sx-phieu-sl').click(); // số lượng: nhiều trước
  assert.match(await v(page, 'the-kho').first().innerText(), /^Tồn đầu kỳ/); // phiếu nhập 5 máy lên đầu (mỗi dòng danh sách là một ô riêng)
  await chup(page, '10a-the-kho-loc');
  await v(page, 'nut-lui').click();
  await v(page, 'nut-lui').click();
  await v(page, 'mo-hop-dong').click();
  await page.getByText('Chưa có hợp đồng.').filter({ visible: true }).waitFor({ timeout: 15000 });
  await v(page, 'loc-hd-het').click();
  await page.getByText('Không có hợp đồng nào ở mục "Đã hết hạn".').filter({ visible: true }).waitFor({ timeout: 15000 });
  await v(page, 'nut-lui').click();
  await page.getByText('Chỉ có trên app điện thoại.').filter({ visible: true }).waitFor();
  assert.ok(await v(page, 'cong-tac-khoa').locator('input').isDisabled()); // bản web không có Face ID
  assert.ok(await v(page, 'cong-tac-thong-bao').locator('input').isDisabled());
});

buoc('Điện thoại đăng nhập: thấy "Máy này", đăng xuất từ xa một máy khác', async (page, c) => {
  const khac = (await api(c, { fn: 'dangNhapMay', args: ['admin', c.matKhau, 'iPad quầy'] })).result.may;
  await v(page, 'mo-thiet-bi').click();
  await v(page, 'may-nay').waitFor({ timeout: 15000 });
  await v(page, 'ds-thiet-bi').getByText('iPad quầy').waitFor();
  await khongTranNgang(page);
  await chup(page, '11-thiet-bi');
  await v(page, 'loc-may-tb').click(); // chưa máy nào bật thông báo
  await page.getByText('Không có điện thoại nào phù hợp.').filter({ visible: true }).waitFor();
  await v(page, 'loc-may-tat').click();
  await v(page, 'sx-may-dung').click(); // đang chọn nên đảo chiều: lâu không dùng trước. Thứ tự đã kiểm ở test/loc.test.ts; ở đây hai máy cùng phút nên chỉ xem còn đủ
  assert.strictEqual(await v(page, 'ds-thiet-bi').getByTestId('thiet-bi').count(), 2);
  await v(page, 'sx-may-dung').click();
  page.once('dialog', d => d.accept());
  await v(page, 'nut-xoa-thiet-bi').first().click();
  await page.waitForFunction(() => !document.body.innerText.includes('iPad quầy'), null, { timeout: 15000 });
  assert.strictEqual((await api(c, { fn: 'tongQuanMay', may: khac })).error, 'HET_PHIEN');
  await v(page, 'nut-lui').click();
});

buoc('Tổng quan: phím tắt Bán nhanh, bấm khách còn nợ mở hồ sơ', async page => {
  await page.getByTestId('tab-index').click();
  await v(page, 'no-KH00001').click({ timeout: 15000 });
  await v(page, 'the-cong-no').waitFor({ timeout: 15000 });
  await v(page, 'nut-lui').click();
  await v(page, 'pt-ban').click();
  await v(page, 'o-imei-ban').waitFor();
});

buoc('Tổng quan động: bấm số đơn → đơn và phiếu thu hôm nay, lật ngày; bấm cột 7 ngày; khách còn nợ → hồ sơ', async page => {
  const homNay = new Date(Date.now() + 7 * 36e5).toISOString().slice(0, 10); // hôm nay theo giờ Việt Nam, như app và máy chủ
  const dmy = n => n.split('-').reverse().join('/');
  await page.getByTestId('tab-index').click();
  await v(page, 'so-don').click({ timeout: 15000 });
  await v(page, 'ds-don-ngay').getByText('Anh Minh').waitFor({ timeout: 15000 }); // đơn hôm nay của chay-thu --mau-app
  await v(page, 'ds-thu-ngay').getByText('Tiền mặt', { exact: false }).first().waitFor();
  await v(page, 'tong-ngay').getByText('Doanh số').waitFor();
  assert.ok(await v(page, 'ngay-sau').isDisabled(), 'Hôm nay: không lật sang ngày sau');
  await khongTranNgang(page);
  await chup(page, '12a-so-lieu-ngay');
  await v(page, 'ngay-truoc').click();
  await page.waitForFunction(d => [...document.querySelectorAll('[data-testid="ngay-dang-xem"]')].some(e => e.offsetParent && e.innerText.includes(d)), dmy(new Date(Date.parse(homNay) - 864e5).toISOString().slice(0, 10)), { timeout: 15000 });
  await page.getByText('Không có đơn hàng nào trong ngày.').filter({ visible: true }).waitFor({ timeout: 15000 });
  await v(page, 'ngay-sau').click();
  await v(page, 'ds-don-ngay').getByText('Anh Minh').waitFor({ timeout: 15000 });
  await v(page, 'nut-lui').click();
  // Cột 7 ngày: hôm qua
  const homQua = new Date(Date.parse(homNay) - 864e5).toISOString().slice(0, 10);
  await v(page, 'cot-' + homQua).click();
  await page.waitForFunction(d => [...document.querySelectorAll('[data-testid="ngay-dang-xem"]')].some(e => e.offsetParent && e.innerText.includes(d)), dmy(homQua), { timeout: 15000 });
  await v(page, 'nut-lui').click();
  // Khách còn nợ: đủ danh sách, bấm mở hồ sơ
  await v(page, 'so-no').click();
  await v(page, 'ds-khach-no').getByText('Anh Minh').waitFor({ timeout: 15000 });
  await chup(page, '12b-khach-no');
  await v(page, 'ds-khach-no').getByTestId('no-KH00001').click();
  await v(page, 'the-cong-no').waitFor({ timeout: 15000 });
  await v(page, 'nut-lui').click();
  await v(page, 'nut-lui').click();
  await v(page, 'the-doanh-so').waitFor();
});

buoc('Sổ quỹ: tồn tiền mặt / ngân hàng, ghi phiếu chi; lãi gộp hôm nay trên Tổng quan (quản trị)', async page => {
  await page.getByTestId('tab-index').click();
  await v(page, 'lai-hom-nay').waitFor({ timeout: 15000 });
  await page.getByTestId('tab-tai-khoan').click();
  await v(page, 'mo-so-quy').click();
  await v(page, 'ton-quy').waitFor({ timeout: 15000 });
  await v(page, 'ds-quy').getByText('Tiền mặt', { exact: false }).first().waitFor(); // phiếu thu hôm nay của chay-thu --mau-app
  assert.ok(await v(page, 'quy-sau').isDisabled(), 'Hôm nay: không lật sang ngày sau');
  await v(page, 'nut-ghi-chi').click();
  await v(page, 'nut-luu-chi').click();
  await v(page, 'loi-chi').getByText('Nhập số tiền chi.').waitFor();
  await v(page, 'loai-chi-Trả nhà cung cấp').click();
  await v(page, 'o-tien-chi').fill('45000');
  await v(page, 'nut-luu-chi').click();
  await v(page, 'loi-chi').getByText('Nhập tên nhà cung cấp', { exact: false }).waitFor();
  await v(page, 'o-doi-tac-chi').fill('nha cung cao'); // gợi ý nhà cung cấp đã dùng: không dấu, sai một chữ vẫn ra
  await v(page, 'ncc-Nhà cung cấp').click();
  assert.strictEqual(await v(page, 'o-doi-tac-chi').inputValue(), 'Nhà cung cấp');
  await v(page, 'loai-chi-Vận chuyển').click();
  await v(page, 'nut-luu-chi').click();
  await v(page, 'ds-quy').getByText('Vận chuyển').waitFor({ timeout: 15000 });
  await v(page, 'ds-quy').getByText('−45.000', { exact: false }).waitFor();
  await khongTranNgang(page);
  await chup(page, '13-so-quy');
  await v(page, 'quy-truoc').click();
  await v(page, 'ds-quy').getByText('Không có phiếu thu, chi nào trong ngày.').waitFor({ timeout: 15000 });
  await v(page, 'nut-lui').click();
});

buoc('Thu cũ đổi mới khi bán nhanh; nhận bảo hành từ kết quả tra, đổi trạng thái, trả máy', async (page, c) => {
  await page.getByTestId('tab-ban').click();
  await v(page, 'tieu-de-ban').waitFor();
  await v(page, 'nut-them-hang').click();
  await v(page, 'o-tim-hang').fill('Dán cường lực');
  await v(page, 'o-gia-dv').fill('500000');
  await v(page, 'nut-them-dv').click();
  await v(page, 'o-tim-khach-ban').fill('Khách Đổi Máy');
  await v(page, 'o-sdt-khach-moi').fill('0988 333 444');
  await v(page, 'nut-khach-moi').click();
  await v(page, 'nut-may-cu').click();
  await v(page, 'o-ten-may-cu').fill('iPhone 8 64GB');
  await v(page, 'o-imei-may-cu').fill('356000999888111');
  await v(page, 'o-gia-may-cu').fill('300000');
  await v(page, 'nut-them-may-cu').click();
  await v(page, 'tong-cong').getByText('200.000 đ').waitFor(); // đơn lên đời: tổng đơn đã trừ máy cũ
  assert.strictEqual(await v(page, 'o-khach-tra').inputValue(), '200.000');
  page.once('dialog', d => d.accept());
  await v(page, 'nut-ban').click();
  await v(page, 'da-ban').waitFor({ timeout: 20000 });
  const kq = await v(page, 'ket-qua-ban').textContent();
  assert.match(kq, /Máy cũ thu về.*iPhone 8 64GB \(máy cũ\).*300\.000/);
  assert.match(kq, /Phiếu thu.*200\.000/); // tiền thật khách trả, không gồm giá máy cũ
  assert.ok(!/Còn nợ/.test(kq), 'Trả đủ sau khi trừ máy cũ: ' + kq);
  const may = await page.evaluate(() => localStorage.getItem('may'));
  assert.strictEqual((await api(c, { may, fn: 'traMaKho', args: ['356000999888111'] })).result.trangThai, 'trongKho');
  await chup(page, '13a-thu-may-cu');
  await v(page, 'nut-ban-moi').click();
  // Tra bảo hành → Nhận bảo hành: điền sẵn khách, máy, IMEI
  await page.getByTestId('tab-quet').click();
  await v(page, 'o-tra').fill('356789012345672');
  await v(page, 'nut-tra').click();
  await v(page, 'nut-nhan-bh').first().click({ timeout: 15000 });
  await v(page, 'o-tinh-trang').fill('Loa rè');
  assert.strictEqual(await v(page, 'o-imei-sua').inputValue(), '356789012345672');
  await v(page, 'nut-luu-nhan-may').click();
  await v(page, 'the-phieu-sua').waitFor({ timeout: 15000 });
  assert.match(await v(page, 'the-phieu-sua').innerText(), /ĐÃ NHẬN.*Anh Minh.*Loa rè/s);
  await v(page, 'tt-sua-3').click(); // Đã sửa xong
  await v(page, 'the-phieu-sua').getByText('ĐÃ SỬA XONG').waitFor({ timeout: 15000 });
  await khongTranNgang(page);
  await chup(page, '14-phieu-sua');
  await v(page, 'nut-tra-may').click();
  await v(page, 'nut-xac-nhan-tra').click(); // bảo hành: chi phí 0
  await v(page, 'the-phieu-sua').getByText('ĐÃ TRẢ KHÁCH').waitFor({ timeout: 15000 });
  await v(page, 'nut-lui').click();
});

buoc('Kiểm kho theo IMEI; bán có giảm giá, gửi phiếu PDF; khách trả máy (nhập lại kho, trả lại tiền)', async (page, c) => {
  await page.getByTestId('tab-tai-khoan').click();
  await v(page, 'mo-kiem-kho').click();
  const them = async ma => { await v(page, 'o-kiem').fill(ma); await v(page, 'nut-them-kiem').click(); };
  await them('356789012345698');
  await them('999999999999');
  await them('356789012345698'); // trùng: không tính lại
  await v(page, 'the-kiem-kho').getByText('ĐÃ QUÉT 2 MÁY').waitFor();
  await v(page, 'nut-so-sanh').click();
  await v(page, 'kq-kiem').waitFor({ timeout: 15000 });
  await v(page, 'ds-la').getByText('Chưa nhập kho', { exact: false }).waitFor();
  await v(page, 'ds-thieu').waitFor(); // máy khác trong kho chưa quét
  await v(page, 'nut-luu-kiem').click();
  await v(page, 'kq-kiem').getByText('Đã lưu vào nhật ký').waitFor({ timeout: 15000 });
  await khongTranNgang(page);
  await chup(page, '15-kiem-kho');
  await v(page, 'nut-lui').click();
  // Bán có giảm giá
  await page.getByTestId('tab-ban').click();
  await v(page, 'o-imei-ban').fill('356789012345698');
  await v(page, 'nut-them-imei').click();
  await v(page, 'dong-gio').getByText('iPhone 16 Pro Max', { exact: false }).waitFor({ timeout: 15000 });
  assert.ok((await v(page, 'o-giam-gia').boundingBox()).width >= 120, 'Ô giảm giá phải đủ rộng (từng co lại còn phần đệm)');
  await v(page, 'o-giam-gia').fill('200000');
  await v(page, 'tong-cong').getByText('28.000.000 đ').waitFor();
  await v(page, 'o-tim-khach-ban').fill('Khách Trả Máy');
  await v(page, 'o-sdt-khach-moi').fill('0988 555 666');
  await v(page, 'nut-khach-moi').click();
  page.once('dialog', d => d.accept());
  await v(page, 'nut-ban').click();
  await v(page, 'da-ban').waitFor({ timeout: 20000 });
  const [tai] = await Promise.all([page.waitForEvent('download', { timeout: 20000 }), v(page, 'nut-gui-phieu').click()]);
  assert.match(tai.suggestedFilename(), /^Phieu ban hang \d{3}-\d{4}-DH\.pdf$/);
  // Khách trả máy vừa mua: nhập lại kho, trả lại 28.000.000
  await v(page, 'nut-xem-khach').click();
  await v(page, 'nut-tra-may-ban').click({ timeout: 15000 });
  await v(page, 'xem-tra').getByText('hủy đơn', { exact: false }).waitFor({ timeout: 15000 });
  assert.strictEqual(await v(page, 'o-hoan').inputValue(), '28.000.000');
  await v(page, 'nut-nhan-tra').click();
  await v(page, 'ket-qua-tra').waitFor({ timeout: 15000 });
  assert.match(await v(page, 'ket-qua-tra').innerText(), /đã hủy.*28\.000\.000/s);
  const may = await page.evaluate(() => localStorage.getItem('may'));
  assert.strictEqual((await api(c, { may, fn: 'traMaKho', args: ['356789012345698'] })).result.trangThai, 'trongKho');
  await chup(page, '16-tra-may');
  await v(page, 'nut-xong-tra').click();
  await v(page, 'cong-no').getByText('Không còn nợ').waitFor({ timeout: 15000 });
  await v(page, 'nut-lui').click();
  await page.getByTestId('tab-ban').click();
  await v(page, 'nut-ban-moi').click();
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

buoc('Trang web quản lý → Điện thoại đăng nhập: thấy máy, đăng xuất từ xa', async (page, c) => {
  const may = (await api(c, { fn: 'dangNhapMay', args: ['admin', c.matKhau, 'Điện thoại bị mất'] })).result.may;
  await api(c, { may, fn: 'datThongBao', args: ['ExponentPushToken[thu-nghiem-1234567890]'] });
  const w = await page.context().newPage();
  await w.setViewportSize({ width: 1280, height: 860 });
  try {
    await w.goto(`http://127.0.0.1:${c.portApi}/`);
    await w.fill('#lgUser', 'admin');
    await w.fill('#lgPass', c.matKhau);
    await w.click('#loginForm button[type=submit]');
    await w.click('#nav a[data-go="thietbi"]', { timeout: 15000 });
    const dong = w.locator('tr', { hasText: 'Điện thoại bị mất' });
    await dong.waitFor({ timeout: 15000 });
    assert.match(await dong.textContent(), /admin.*Đang bật/);
    await w.screenshot({ path: path.join(ANH, '12-web-thiet-bi.png') });
    w.once('dialog', d => d.accept());
    await dong.getByText('Đăng xuất máy này').click();
    await w.getByText('Đã đăng xuất Điện thoại bị mất.').waitFor({ timeout: 15000 });
    assert.strictEqual(await w.locator('tr', { hasText: 'Điện thoại bị mất' }).count(), 0);
    assert.strictEqual((await api(c, { fn: 'tongQuanMay', may })).error, 'HET_PHIEN');
  } finally { await w.close(); }
});

(async () => {
  let api, web, browser, loi = 0;
  try {
    api = await batMayChuApi();
    console.log('Đang build app ra web (expo export)…');
    buildWeb();
    web = await phucVu();
    browser = await chromium.launch();
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, permissions: ['clipboard-read', 'clipboard-write'] });
    await ctx.route('https://img.vietqr.io/**', r => r.fulfill({ path: path.join(__dirname, 'mau', 'imei-qr.png') })); // không gọi dịch vụ ngoài khi test
    const page = await ctx.newPage();
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
