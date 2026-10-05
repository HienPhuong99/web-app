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
  getName() { return Object.keys(sheets).find(k => sheets[k] === this); }
}
const sheets = {};
const ss = { getSheetByName: n => sheets[n] || null, insertSheet: n => (sheets[n] = new Sheet([])), getSheets: () => Object.values(sheets),
  deleteSheet: sh => { for (const k in sheets) if (sheets[k] === sh) delete sheets[k]; } };

// ---- Giả lập DocumentApp / DriveApp (chỉ phần Code.gs dùng). Kho này nằm trong bộ nhớ; test đọc lại qua `drive`.
// Lưu ý: không thay được lần thử trên Google thật (xem HUONG_DAN.md, phần "Trước khi triển khai một bản mới").
const drive = { files: new Map(), folders: new Map(), seq: 0, thieuQuyen: false };
const newId = pre => pre + String(++drive.seq).padStart(24, '0');
const ENUM = n => Object.fromEntries(n.map(k => [k, k]));
class MPara {
  constructor(text, parent) { Object.assign(this, { text: String(text), parent, heading: 'NORMAL', align: 'LEFT', bold: false, removed: false }); }
  getType() { return 'PARAGRAPH'; } asParagraph() { return this; } getText() { return this.text; } setText(t) { this.text = String(t); return this; }
  getParent() { return this.parent; } removeFromParent() { this.removed = true; this.parent.children.splice(this.parent.children.indexOf(this), 1); return this; }
  setHeading(h) { this.heading = h; return this; } setAlignment(a) { this.align = a; return this; }
  setAttributes(st) { this.attr = st; this.bold = !!st.BOLD; if (st.HORIZONTAL_ALIGNMENT) this.align = st.HORIZONTAL_ALIGNMENT; return this; }
  setSpacingAfter() { return this; } setSpacingBefore() { return this; } setLineSpacing() { return this; } setIndentFirstLine() { return this; } setIndentStart() { return this; }
  editAsText() { return new MText(this); }
}
class MText { // sửa chữ trong một đoạn
  constructor(p) { this.p = p; }
  getText() { return this.p.text; } getParent() { return this.p; }
  setBold(a, b, c) { if (typeof a === 'boolean') this.p.bold = a; else if (c && a === 0 && b >= this.p.text.length - 1) this.p.bold = true; return this; }
  setItalic() { return this; } setFontSize() { return this; } setUnderline() { return this; }
  asText() { return this; }
  deleteText(a, b) { this.p.text = this.p.text.slice(0, a) + this.p.text.slice(b + 1); return this; }
  insertText(o, t) { this.p.text = this.p.text.slice(0, o) + t + this.p.text.slice(o); return this; }
}
class MCell { constructor(text, table) { this.para = new MPara(text, this); this.table = table; } getText() { return this.para.text; } getChild() { return this.para; } getText() { return this.para.text; } editAsText() { return this.para.editAsText(); } }
class MTable {
  constructor(cells, parent) { this.parent = parent; this.rows = cells.map(r => r.map(t => new MCell(t, this))); this.borderWidth = 1; }
  getType() { return 'TABLE'; } getParent() { return this.parent; } setBorderWidth(w) { this.borderWidth = w; return this; } setColumnWidth() { return this; } setAttributes() { return this; }
  getNumRows() { return this.rows.length; } getCell(r, c) { return this.rows[r][c]; }
  getRow(r) { const row = this.rows[r]; return { getNumCells: () => row.length, editAsText: () => ({ setBold: b => { row.forEach(c => { c.para.bold = b; }); return this; } }) }; }
  paras() { return this.rows.flat().map(c => c.para); }
}
const javaRepl = (repl, m) => repl.replace(/\\(.)|\$(\d)/g, (_, lit, g) => (lit !== undefined ? lit : m[+g] === undefined ? '' : m[+g])); // "\" thoát ký tự, "$1" là nhóm bắt như Java
class MBody {
  constructor(doc) { this.doc = doc; this.children = [new MPara('', this)]; }
  appendParagraph(t) { const p = new MPara(t, this); this.children.push(p); return p; }
  appendTable(cells) { const t = new MTable(cells, this); this.children.push(t); return t; }
  insertTable(i, cells) { const t = new MTable(cells, this); this.children.splice(i, 0, t); return t; }
  getChildIndex(el) { const i = this.children.indexOf(el); if (i < 0) throw new Error('Phần tử không phải con trực tiếp của body'); return i; }
  getTables() { return this.children.filter(c => c instanceof MTable); }
  getNumChildren() { return this.children.length; } getChild(i) { return this.children[i]; }
  setMarginTop() {} setMarginBottom() {} setMarginLeft() {} setMarginRight() {} setAttributes() { return this; }
  allParas() { return this.children.flatMap(c => (c instanceof MTable ? c.paras() : [c])); }
  getText() { return this.allParas().map(p => p.text).join('\n'); }
  findText(pattern, from) { // from = RangeElement trước đó: tìm tiếp phía sau nó
    const ps = this.allParas(); let i = 0, off = 0;
    if (from) { i = ps.indexOf(from.getElement().p); off = from.getEndOffsetInclusive() + 1; }
    for (; i < ps.length; i++, off = 0) {
      const re = new RegExp(pattern, 'g'); re.lastIndex = off; const m = re.exec(ps[i].text);
      if (m) return { getElement: () => new MText(ps[i]), getStartOffset: () => m.index, getEndOffsetInclusive: () => m.index + m[0].length - 1 };
    }
    return null;
  }
  replaceText(pattern, repl) { const re = new RegExp(pattern, 'g'); this.allParas().forEach(p => { p.text = p.text.replace(re, (...a) => javaRepl(String(repl), a)); }); return this; }
}
class MDoc {
  constructor(id) { this.id = id; this.body = new MBody(this); }
  getId() { return this.id; } getUrl() { return 'https://docs.google.com/document/d/' + this.id + '/edit'; } getName() { return drive.files.get(this.id).name; }
  getBody() { return this.body; } saveAndClose() {}
}
const docs = new Map();
const quyen = ten => { if (drive.thieuQuyen) throw new Error('You do not have permission to call ' + ten + '. Required permissions: https://www.googleapis.com/auth/drive'); };
class MFolder { constructor(f) { this.f = f; } getId() { return this.f.id; } getName() { return this.f.name; } isTrashed() { return !!this.f.trashed; } }
class MFile {
  constructor(f) { this.f = f; }
  getId() { return this.f.id; } getName() { return this.f.name; } getUrl() { return 'https://docs.google.com/document/d/' + this.f.id + '/edit'; }
  getMimeType() { return this.f.mime; } isTrashed() { return !!this.f.trashed; } setTrashed(b) { this.f.trashed = !!b; return this; }
  moveTo(folder) { this.f.folder = folder.getId(); return this; }
  getParents() { const f = drive.folders.get(this.f.folder), l = f ? [new MFolder(f)] : []; return { hasNext: () => l.length > 0, next: () => l.shift() }; }
  makeCopy(name, folder) {
    if (drive.khiSao) drive.khiSao(); // chỗ để test giả lập người khác thao tác trong lúc đang chép mẫu
    const id = newId('F'), src = docs.get(this.f.id), d = new MDoc(id);
    d.body.children = src.body.children.map(c => (c instanceof MTable ? Object.assign(new MTable(c.rows.map(r => r.map(x => x.getText())), d.body), { borderWidth: c.borderWidth })
      : Object.assign(new MPara(c.text, d.body), { heading: c.heading, align: c.align, bold: c.bold })));
    docs.set(id, d); drive.files.set(id, { id, name, mime: this.f.mime, folder: folder ? folder.getId() : 'root' });
    return new MFile(drive.files.get(id));
  }
  getAs(mime) {
    const text = '%PDF-1.4\n' + docs.get(this.f.id).body.getText();
    return { getName: () => this.f.name + '.pdf', getContentType: () => mime, getBytes: () => [...Buffer.from(text, 'utf8')].map(b => (b > 127 ? b - 256 : b)) };
  }
}
const DocumentApp = {
  HorizontalAlignment: ENUM(['LEFT', 'CENTER', 'RIGHT', 'JUSTIFY']), ParagraphHeading: ENUM(['NORMAL', 'HEADING1', 'HEADING2']),
  Attribute: ENUM(['FONT_FAMILY', 'FONT_SIZE', 'BOLD', 'ITALIC', 'UNDERLINE', 'HORIZONTAL_ALIGNMENT', 'SPACING_AFTER', 'INDENT_START', 'INDENT_FIRST_LINE']), ElementType: ENUM(['PARAGRAPH', 'TABLE']),
  create(name) { quyen('DocumentApp.create'); const id = newId('D'), d = new MDoc(id); docs.set(id, d); drive.files.set(id, { id, name, mime: 'application/vnd.google-apps.document', folder: 'root' }); return d; },
  openById(id) { quyen('DocumentApp.openById'); if (!docs.has(id)) throw new Error('Không mở được tài liệu ' + id); return docs.get(id); },
};
const DriveApp = {
  getFileById(id) { quyen('DriveApp.getFileById'); const f = drive.files.get(id); if (!f) throw new Error('Exception: Unexpected error while getting the method or property getFileById on object DriveApp.'); return new MFile(f); },
  getFolderById(id) { const f = drive.folders.get(id); if (!f) throw new Error('Không tìm thấy thư mục ' + id); return new MFolder(f); },
  getFoldersByName(name) { quyen('DriveApp.getFoldersByName'); const l = [...drive.folders.values()].filter(f => f.name === name && !f.trashed); return { hasNext: () => l.length > 0, next: () => new MFolder(l.shift()) }; },
  createFolder(name) { quyen('DriveApp.createFolder'); const f = { id: newId('R'), name }; drive.folders.set(f.id, f); return new MFolder(f); },
};

const cache = new Map(), props = new Map();
const logs = [];
const ctx = vm.createContext({
  console,
  SpreadsheetApp: { getActive: () => ss, getActiveSpreadsheet: () => ss },
  DocumentApp, DriveApp, MimeType: { PDF: 'application/pdf', GOOGLE_DOCS: 'application/vnd.google-apps.document' },
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
// Apps Script gộp mọi file .gs vào một phạm vi chung: nạp lần lượt như vậy (Code.gs trước)
fs.readdirSync(ROOT).filter(f => f.endsWith('.gs')).sort((a, b) => (a === 'Code.gs' ? -1 : b === 'Code.gs' ? 1 : a.localeCompare(b)))
  .forEach(f => vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f }));

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

module.exports = { ctx, sheets, logs, cache, props, Sheet, drive, docs };
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
