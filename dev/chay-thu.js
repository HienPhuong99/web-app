// Chạy thử web app trên máy, không cần Google: giả lập Google Sheet + Apps Script trong bộ nhớ.
//   node dev/chay-thu.js              -> dữ liệu mẫu
//   node dev/chay-thu.js du-lieu.json -> nạp dữ liệu từ file JSON {TenTrang: [[tiêu đề...], [dòng...]]}
// Mở http://localhost:5178. Mật khẩu admin in ra màn hình khi khởi động. Dữ liệu mất khi tắt.
const fs = require('fs'), http = require('http'), vm = require('vm'), crypto = require('crypto'), path = require('path');
const ROOT = path.join(__dirname, '..', 'apps-script');
const PORT = +process.env.PORT || 5178;

// ---- Giả lập SpreadsheetApp (chỉ những hàm Code.gs dùng)
const strip = v => (typeof v === 'string' && v[0] === "'" ? v.slice(1) : v); // Sheets bỏ dấu ' đầu chuỗi
class Range {
  constructor(sh, r, c, nr, nc) { Object.assign(this, { sh, r, c, nr, nc }); }
  getValues() {
    return Array.from({ length: this.nr }, (_, i) => Array.from({ length: this.nc }, (_, j) => {
      const v = (this.sh.rows[this.r - 1 + i] || [])[this.c - 1 + j]; return v === undefined || v === null ? '' : v;
    }));
  }
  setValues(vals) {
    if (vals.length !== this.nr || vals.some(r => r.length !== this.nc)) throw new Error('Kích thước dữ liệu không khớp vùng ô');
    vals.forEach((row, i) => { const R = this.r - 1 + i; while (this.sh.rows.length <= R) this.sh.rows.push([]); row.forEach((v, j) => { this.sh.rows[R][this.c - 1 + j] = strip(v); }); });
    return this;
  }
  setNumberFormat() { return this; }
}
class Sheet {
  constructor(rows) { this.rows = rows; }
  getLastRow() { return this.rows.length; }
  getLastColumn() { return this.rows.reduce((m, r) => Math.max(m, r.length), 0); }
  getMaxRows() { return Math.max(1000, this.rows.length); }
  getMaxColumns() { return this.maxCols || Math.max(26, this.getLastColumn()); }
  insertColumnsAfter(after, n) { this.maxCols = this.getMaxColumns() + n; }
  getRange(r, c, nr = 1, nc = 1) {
    if (r < 1 || c < 1 || nr < 1 || nc < 1) throw new Error('Vùng ô không hợp lệ');
    if (c + nc - 1 > this.getMaxColumns()) throw new Error('Cột nằm ngoài lưới của trang tính');
    return new Range(this, r, c, nr, nc);
  }
  getDataRange() { return this.getRange(1, 1, Math.max(1, this.getLastRow()), Math.max(1, this.getLastColumn())); }
  appendRow(v) { this.rows.push(v.map(strip)); return this; }
  deleteRows(start, n) { this.rows.splice(start - 1, n); }
  setFrozenRows() {}
  setName(n) { for (const k in sheets) if (sheets[k] === this) delete sheets[k]; sheets[n] = this; return this; }
  hideSheet() { this.hidden = true; return this; }
}
const sheets = {};
const ss = { getSheetByName: n => sheets[n] || null, insertSheet: n => (sheets[n] = new Sheet([])) };

const cache = new Map(), props = new Map();
const logs = [];
const ctx = vm.createContext({
  console,
  SpreadsheetApp: { getActive: () => ss, getActiveSpreadsheet: () => ss },
  CacheService: { getScriptCache: () => ({ get: k => (cache.has(k) ? cache.get(k) : null), put: (k, v) => cache.set(k, String(v)), remove: k => cache.delete(k),
    getAll: ks => Object.fromEntries(ks.filter(k => cache.has(k)).map(k => [k, cache.get(k)])) }) },
  PropertiesService: { getScriptProperties: () => ({ getProperty: k => (props.has(k) ? props.get(k) : null), setProperty: (k, v) => { props.set(k, String(v)); } }) },
  LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
  Logger: { log: (...a) => { logs.push(a.join(' ')); console.log('[Logger]', ...a); } },
  Utilities: {
    getUuid: () => crypto.randomUUID(),
    DigestAlgorithm: { SHA_256: 'sha256' }, Charset: { UTF_8: 'utf8' },
    computeDigest: (alg, s) => [...crypto.createHash(alg).update(String(s), 'utf8').digest()].map(b => (b > 127 ? b - 256 : b)),
    base64Encode: bytes => Buffer.from(bytes.map(b => b & 255)).toString('base64'),
    formatDate: (d, tz, fmt) => {
      const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(d).map(x => [x.type, x.value]));
      return fmt.replace('yyyy', p.year).replace('MM', p.month).replace('dd', p.day).replace('HH', p.hour).replace('mm', p.minute);
    },
  },
});
vm.runInContext(fs.readFileSync(path.join(ROOT, 'Code.gs'), 'utf8'), ctx, { filename: 'Code.gs' });

// ---- Dữ liệu
const file = process.argv[2];
const HH = ['MaHH', 'TenHang', 'Model', 'NhomHang', 'PhanLoai', 'DVT', 'XuatXu', 'GiaSi', 'GiaLe', 'TonToiThieu', 'GhiChu'];
const KH = ['MaKH', 'TenKH', 'NguoiLienHe', 'SDT', 'DiaChi', 'MST', 'Email', 'GhiChu', 'NgayTao', 'NguoiTao'];
const seed = file ? JSON.parse(fs.readFileSync(file, 'utf8')) : {
  PS_KhachHang: [KH, ['KH00001', 'Anh Minh', '', '0911000001', 'Quận 3, TP.HCM', '', '', 'Khách mẫu', '2026-09-01', 'Mẫu']],
  PS_HangHoa: [HH,
    ['HH0001', 'iPhone 16 Pro Max 256GB - Titan Đen', 'IPHONE-16-PRO-MAX-TITAN-DEN-256GB', 'iPhone 16 Series', 'iPhone 16 Pro Max', 'Máy', 'Apple - chính hãng', '', 28200000, '', ''],
    ['HH0002', 'iPhone 15 128GB - Đen', 'IPHONE-15-DEN-128GB', 'iPhone 15 Series', 'iPhone 15', 'Máy', 'Apple - chính hãng', '', 11300000, '', ''],
  ],
  PCCC_KhachHang: [KH,
    ['KH00001', 'Công ty TNHH Mẫu Một', 'Anh Nam', '0900000001', '12 Đường Số 1, TP.HCM', '0300000001', '', 'Khách mẫu', '2026-08-02', 'Mẫu'],
    ['KH00002', 'Chị Lan', '', '0900000002 / 0900000003', 'Thủ Đức, TP.HCM', '', '', '', '2026-09-10', 'Mẫu'],
  ],
  PCCC_HangHoa: [HH.filter(c => c !== 'TonToiThieu'), // thiếu cột như bản cũ: caiDat phải tự thêm
    ['HH0001', 'Bình chữa cháy bột ABC 4kg', 'MFZL4', 'Bình chữa cháy', 'BÌNH CHỮA CHÁY VICTORY (CÓ KIỂM ĐỊNH)', 'Bình', 'Victory/VN', 345000, 445000, ''],
    ['HH0002', 'Bình chữa cháy xách tay CO2 3kg', 'MT3', 'Bình chữa cháy', 'BÌNH CHỮA CHÁY VICTORY (CÓ KIỂM ĐỊNH)', 'Bình', 'Victory/VN', 435000, 555000, ''],
    ['HH0003', 'Kệ đựng 2 bình chữa cháy (Tôn 0,6mm)', '', 'Tủ + kệ + bảo hộ', 'TỦ + KỆ PCCC', 'Cái', 'Việt Nam', 85000, 120000, ''],
    ['HH0004', 'Đầu báo khói địa chỉ', 'QA01', 'Báo cháy Horing', 'HÀNG BÁO CHÁY ĐỊA CHỈ', 'Cái', 'Horing/Taiwan', '', '', 'Chưa có giá'],
  ],
};
for (const [name, rows] of Object.entries(seed)) sheets[name] = new Sheet(rows.map(r => r.slice()));
ctx.caiDat();

// ---- google.script.run giả: gọi hàm trong Code.gs qua /rpc (hàm kết thúc bằng _ là hàm riêng, không gọi được)
const SHIM = `window.google = { script: { get run() {
  const make = h => new Proxy({}, { get: (_, fn) =>
    fn === 'withSuccessHandler' ? f => make({ ...h, ok: f }) : fn === 'withFailureHandler' ? f => make({ ...h, fail: f }) :
    (...args) => fetch('/rpc', { method: 'POST', body: JSON.stringify({ fn, args }) }).then(r => r.json())
      .then(r => r.ok ? h.ok && h.ok(r.result) : h.fail && h.fail(new Error(r.error))) });
  return make({});
} } };`;

module.exports = { ctx, sheets, logs, cache, props };
if (require.main === module) http.createServer(async (req, res) => {
  if (req.method === 'POST' && req.url === '/rpc') {
    let body = '';
    for await (const c of req) body += c;
    let out;
    try {
      const { fn, args } = JSON.parse(body);
      if (!/^[A-Za-z]\w*[A-Za-z0-9]$/.test(fn) || typeof ctx[fn] !== 'function') throw new Error('Script function not found: ' + fn);
      const result = ctx[fn](...args);
      out = { ok: true, result: result === undefined ? null : JSON.parse(JSON.stringify(result)) };
    } catch (e) { out = { ok: false, error: e.message }; }
    await new Promise(r => setTimeout(r, 120)); // Apps Script thật chậm hơn nhiều
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(out));
  }
  if (req.url === '/') {
    // doGet() thật thêm thẻ viewport; ở đây chèn tay cho giống
    const html = fs.readFileSync(path.join(ROOT, 'Index.html'), 'utf8')
      .replace('<head>', '<head><meta name="viewport" content="width=device-width, initial-scale=1"><script>' + SHIM + '</script>');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(html);
  }
  res.writeHead(404); res.end();
}).listen(PORT, () => console.log(`Chạy thử tại http://localhost:${PORT}`));
