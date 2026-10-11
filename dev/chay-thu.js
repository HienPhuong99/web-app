// Chạy thử web app trên máy, không cần Google: giả lập Google Sheet + Apps Script trong bộ nhớ.
//   node dev/chay-thu.js              -> dữ liệu mẫu
//   node dev/chay-thu.js du-lieu.json -> nạp dữ liệu từ file JSON {TenTrang: [[tiêu đề...], [dòng...]]}
//   node dev/chay-thu.js --du-lieu-thu -> thêm bộ dữ liệu thử đầy đủ (như chạy napDuLieuThu trên Google)
// Mở http://localhost:5178. Mật khẩu admin in ra màn hình khi khởi động. Dữ liệu mất khi tắt.
const fs = require('fs'), http = require('http'), vm = require('vm'), crypto = require('crypto'), path = require('path');
const ROOT = path.join(__dirname, '..', 'apps-script');
const PORT = +process.env.PORT || 5178;

// ---- Giả lập SpreadsheetApp (chỉ những hàm Code.gs dùng)
// Sheets bỏ dấu ' đầu chuỗi; chuỗi bắt đầu bằng "=" mà không có dấu ' thì Sheets hiểu là công thức (ở đây ghi lại để test thấy)
const strip = v => (typeof v === 'string' && v[0] === "'" ? v.slice(1) : typeof v === 'string' && v[0] === '=' ? '#CÔNG THỨC ' + v : v);
// Ô chưa đặt định dạng văn bản ("Tự động"): Sheets tự đổi chuỗi toàn chữ số thành số (mất số 0 đầu) và chuỗi ngày giờ thành ngày, như Google thật.
// Dấu ' đầu chuỗi giữ nguyên là chữ.
const NgayVM = () => vm.runInContext('Date', ctx); // ngày phải thuộc phạm vi của script để instanceof Date đúng
function giaTriO(sh, R, C, v) {
  const giuChu = typeof v === 'string' && v[0] === "'";
  v = strip(v);
  if (typeof v !== 'string' || giuChu || sh.laChu(R, C)) return v;
  if (/^\d{1,15}$/.test(v)) return Number(v);
  const m = /^(\d{4}-\d{2}-\d{2})(?: (\d{2}:\d{2}))?$/.exec(v);
  if (m) { const D = NgayVM(); return new D(m[1] + 'T' + (m[2] || '00:00') + ':00+07:00'); }
  return v;
}
class Range {
  constructor(sh, r, c, nr, nc) { Object.assign(this, { sh, r, c, nr, nc }); }
  getValues() {
    return Array.from({ length: this.nr }, (_, i) => Array.from({ length: this.nc }, (_, j) => {
      const v = (this.sh.rows[this.r - 1 + i] || [])[this.c - 1 + j]; return v === undefined || v === null ? '' : v;
    }));
  }
  setValues(vals) {
    if (vals.length !== this.nr || vals.some(r => r.length !== this.nc)) throw new Error('Kích thước dữ liệu không khớp vùng ô');
    vals.forEach((row, i) => { const R = this.r - 1 + i; while (this.sh.rows.length <= R) this.sh.rows.push([]); row.forEach((v, j) => { this.sh.rows[R][this.c - 1 + j] = giaTriO(this.sh, R, this.c - 1 + j, v); }); });
    return this;
  }
  setNumberFormat(f) { // chỉ ghi nhận định dạng văn bản '@'
    for (let i = 0; i < this.nr; i++) { const R = this.r - 1 + i, d = this.sh.dinhDang[R] || (this.sh.dinhDang[R] = []); for (let j = 0; j < this.nc; j++) d[this.c - 1 + j] = f === '@'; }
    return this;
  }
}
class Sheet {
  // maxR: số dòng của lưới. Trang tạo mới có 1000 dòng; trang nhập từ file Excel chỉ vừa đủ dữ liệu (dòng thêm sau đó chưa có định dạng)
  constructor(rows, maxR) { this.rows = rows; this.maxR = maxR || 1000; this.dinhDang = []; }
  laChu(R, C) { return !!(this.dinhDang[R] && this.dinhDang[R][C]); }
  getLastRow() { return this.rows.length; }
  getLastColumn() { return this.rows.reduce((m, r) => Math.max(m, r.length), 0); }
  getMaxRows() { return Math.max(this.maxR, this.rows.length); }
  getMaxColumns() { return this.maxCols || Math.max(26, this.getLastColumn()); }
  insertColumnsAfter(after, n) { this.maxCols = this.getMaxColumns() + n; }
  insertRowsAfter(after, n) { this.maxR = this.getMaxRows() + n; this.dinhDang.splice(after, 0, ...Array.from({ length: n }, () => [])); } // dòng chèn thêm: coi như chưa có định dạng (trường hợp xấu nhất)
  getRange(r, c, nr = 1, nc = 1) {
    if (r < 1 || c < 1 || nr < 1 || nc < 1) throw new Error('Vùng ô không hợp lệ');
    if (c + nc - 1 > this.getMaxColumns()) throw new Error('Cột nằm ngoài lưới của trang tính');
    if (r + nr - 1 > this.getMaxRows()) throw new Error('Tọa độ vùng ô nằm ngoài kích thước trang tính');
    return new Range(this, r, c, nr, nc);
  }
  getRangeList(a1s) { // "C5:C7" → đặt định dạng cho từng vùng
    const rs = a1s.map(a => { const m = /^([A-Z]+)(\d+):([A-Z]+)(\d+)$/.exec(a), col = s => [...s].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0); return this.getRange(+m[2], col(m[1]), +m[4] - +m[2] + 1, col(m[3]) - col(m[1]) + 1); });
    return { setNumberFormat: f => { rs.forEach(r => r.setNumberFormat(f)); } };
  }
  getDataRange() { return this.getRange(1, 1, Math.max(1, this.getLastRow()), Math.max(1, this.getLastColumn())); }
  appendRow(v) { const R = this.rows.length; if (R >= this.maxR) this.maxR = R + 1; this.rows.push(v.map((x, j) => giaTriO(this, R, j, x))); return this; }
  deleteRows(start, n) { this.rows.splice(start - 1, n); this.dinhDang.splice(start - 1, n); this.maxR = Math.max(this.rows.length, this.maxR - n); }
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
  appendInlineImage(blob) { const img = { blob, w: 0, h: 0, setWidth(w) { this.w = w; return this; }, setHeight(h) { this.h = h; return this; } }; (this.images = this.images || []).push(img); return img; }
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
class MCell { constructor(text, table) { this.para = new MPara(text, this); this.table = table; } setPaddingBottom() { return this; } getText() { return this.para.text; } getChild() { return this.para; } getText() { return this.para.text; } editAsText() { return this.para.editAsText(); } }
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
  getImages() { return this.allParas().flatMap(p => p.images || []); }
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
class MFolder { constructor(f) { this.f = f; } createFile(blob) { quyen('Folder.createFile'); const id = newId('G'); drive.files.set(id, { id, name: blob.getName(), mime: blob.getContentType(), folder: this.f.id, bytes: blob.getBytes() }); return new MFile(drive.files.get(id)); } getId() { return this.f.id; } getName() { return this.f.name; } isTrashed() { return !!this.f.trashed; } }
class MFile {
  constructor(f) { this.f = f; }
  getId() { return this.f.id; } getName() { return this.f.name; } getUrl() { return 'https://docs.google.com/document/d/' + this.f.id + '/edit'; }
  getBlob() { return { getBytes: () => this.f.bytes || [], getContentType: () => this.f.mime, getName: () => this.f.name }; }
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
const thuMail = { da: [], henGio: [], chu: 'chu@example.com', thieuQuyen: false };
const push = { da: [], loi: {}, http: 0, thieuQuyen: false };
const logs = [];
const ctx = vm.createContext({
  console,
  SpreadsheetApp: { getActive: () => ss, getActiveSpreadsheet: () => ss },
  DocumentApp, DriveApp, MimeType: { PDF: 'application/pdf', GOOGLE_DOCS: 'application/vnd.google-apps.document' },
  CacheService: { getScriptCache: () => ({ get: k => (cache.has(k) ? cache.get(k) : null), put: (k, v) => cache.set(k, String(v)), remove: k => cache.delete(k),
    getAll: ks => Object.fromEntries(ks.filter(k => cache.has(k)).map(k => [k, cache.get(k)])) }) },
  PropertiesService: { getScriptProperties: () => ({ getProperty: k => (props.has(k) ? props.get(k) : null), setProperty: (k, v) => { props.set(k, String(v)); } }) },
  // Gửi mail và hẹn giờ giả: ghi lại để kiểm tra. thuMail.thieuQuyen = true giả lập chưa cấp quyền.
  MailApp: { sendEmail: m => { if (thuMail.thieuQuyen) throw new Error('Bạn không có quyền gọi MailApp.sendEmail. Quyền cần thiết: https://www.googleapis.com/auth/script.send_mail'); thuMail.da.push(m); } },
  ScriptApp: {
    getProjectTriggers: () => thuMail.henGio.slice(),
    deleteTrigger: t => { thuMail.henGio = thuMail.henGio.filter(x => x !== t); },
    newTrigger: ham => { const t = { ham, getHandlerFunction: () => ham }; const b = { timeBased: () => b, everyDays: n => { t.moiNgay = n; return b; }, atHour: h => { t.gio = h; return b; }, inTimezone: z => { t.mui = z; return b; },
      create: () => { if (thuMail.thieuQuyen) throw new Error('Bạn không có quyền gọi ScriptApp.newTrigger.'); thuMail.henGio.push(t); return t; } }; return b; },
  },
  Session: { getEffectiveUser: () => ({ getEmail: () => thuMail.chu }), getActiveUser: () => ({ getEmail: () => thuMail.nguoiChay === undefined ? thuMail.chu : thuMail.nguoiChay }) },
  // Máy chủ thông báo Expo giả: ghi lại các lô đã gửi. push.loi[token] = mã lỗi trả về cho máy đó; push.http = mã HTTP khác 200.
  UrlFetchApp: { fetch: (url, o) => {
    if (push.thieuQuyen) throw new Error('Bạn không có quyền gọi UrlFetchApp.fetch. Quyền cần thiết: https://www.googleapis.com/auth/script.external_request');
    const msgs = JSON.parse(o.payload);
    push.da.push({ url, msgs });
    const data = msgs.map(m => push.loi[m.to] ? { status: 'error', message: push.loi[m.to], details: { error: push.loi[m.to] } } : { status: 'ok', id: 'id-' + push.da.length });
    return { getResponseCode: () => push.http || 200, getContentText: () => JSON.stringify(push.http ? { errors: [{ message: 'lỗi' }] } : { data }) };
  } },
  ContentService: { MimeType: { JSON: 'application/json' }, createTextOutput: s => ({ text: String(s), mime: 'text/plain',
    setMimeType(m) { this.mime = m; return this; }, getContent() { return this.text; }, getMimeType() { return this.mime; } }) },
  LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
  Logger: { log: (...a) => { logs.push(a.join(' ')); console.log('[Logger]', ...a); } },
  Utilities: {
    getUuid: () => crypto.randomUUID(),
    DigestAlgorithm: { SHA_256: 'sha256' }, Charset: { UTF_8: 'utf8' },
    computeDigest: (alg, s) => [...crypto.createHash(alg).update(String(s), 'utf8').digest()].map(b => (b > 127 ? b - 256 : b)),
    base64Decode: s => { if (!/^[A-Za-z0-9+\/=\s]*$/.test(s)) throw new Error('Invalid argument'); return [...Buffer.from(s, 'base64')].map(b => (b > 127 ? b - 256 : b)); },
    newBlob: (bytes, type, name) => ({ getBytes: () => bytes, getContentType: () => type, getName: () => name }),
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
const MAU_APP = process.argv.includes('--mau-app'); // thêm vài máy đã giao có IMEI để thử app điện thoại
const file = process.argv.slice(2).find(a => !a.startsWith('--'));
const HH = ['MaHH', 'TenHang', 'Model', 'NhomHang', 'PhanLoai', 'DVT', 'XuatXu', 'GiaSi', 'GiaLe', 'TonToiThieu', 'GhiChu'];
const KH = ['MaKH', 'TenKH', 'NguoiLienHe', 'SDT', 'DiaChi', 'MST', 'Email', 'GhiChu', 'NgayTao', 'NguoiTao'];
const seed = file ? JSON.parse(fs.readFileSync(file, 'utf8')) : {
  PS_KhachHang: [KH, ['KH00001', 'Anh Minh', '', '0911000001', 'Quận 3, TP.HCM', '', '', 'Khách mẫu', '2026-09-01', 'Mẫu']],
  PS_HangHoa: [HH,
    ['HH0001', 'iPhone 16 Pro Max 256GB - Titan Đen', 'IPHONE-16-PRO-MAX-TITAN-DEN-256GB', 'iPhone 16 Series', 'iPhone 16 Pro Max', 'Máy', 'Apple - chính hãng', '', 28200000, '', ''],
    ['HH0002', 'iPhone 15 128GB - Đen', 'IPHONE-15-DEN-128GB', 'iPhone 15 Series', 'iPhone 15', 'Máy', 'Apple - chính hãng', '', 11300000, '', ''],
  ],
};
for (const [name, rows] of Object.entries(seed)) sheets[name] = new Sheet(rows.map(r => r.slice()), rows.length); // như nhập từ file Excel: lưới vừa đủ dữ liệu
ctx.caiDat();
if (MAU_APP) {
  const t = ctx.dangNhap('admin', logs.join('\n').match(/mật khẩu: (\S+)/)[1]).token, homNay = ctx.now_().slice(0, 10);
  const may16 = { MaHH: 'HH0001', TenHang: 'iPhone 16 Pro Max 256GB - Titan Đen', DVT: 'Máy' }, may15 = { MaHH: 'HH0002', TenHang: 'iPhone 15 128GB - Đen', DVT: 'Máy' };
  ctx.luuChungTu(t, 'NK', { Ngay: homNay, DoiTac: 'Tồn đầu kỳ', lines: [Object.assign({ SoLuong: 5 }, may16), Object.assign({ SoLuong: 1 }, may15)] });
  ctx.luuChungTu(t, 'NK', { Ngay: homNay, DoiTac: 'Nhà cung cấp', lines: [Object.assign({ SoLuong: 2, IMEI: '356789012345680, 356789012345698' }, may16),
    Object.assign({ SoLuong: 1, IMEI: '351234567890132' }, may15)] });
  const dh = ctx.luuChungTu(t, 'DH', { Ngay: homNay, MaKH: 'KH00001', TenKH: 'Anh Minh', SDT: '0911000001', VAT: 0, lines: [Object.assign({ SoLuong: 1, DonGia: 28200000 }, may16)] }).doc;
  ctx.luuChungTu(t, 'XK', { Ngay: homNay, SoDH: dh.SoDH, DoiTac: 'Anh Minh', lines: [Object.assign({ SoLuong: 1, IMEI: '356789012345672' }, may16)] });
  ctx.luuChungTu(t, 'XK', { Ngay: '2024-03-10', DoiTac: 'Khách lẻ', lines: [Object.assign({ SoLuong: 1, IMEI: '351234567890124' }, may15)] });
  ctx.luuThuTien(t, { Ngay: homNay, SoDH: dh.SoDH, SoTien: 20000000, HinhThuc: 'Tiền mặt' });
  console.log('Mẫu tra bảo hành trên app: IMEI 356789012345672 (còn hạn), 351234567890124 (hết hạn), SĐT 0911000001');
  console.log('Máy còn trong kho để thử bán nhanh: 356789012345680, 356789012345698 (iPhone 16 Pro Max), 351234567890132 (iPhone 15)');
}
if (process.argv.includes('--du-lieu-thu')) ctx.napDuLieuThu(); // thêm bộ dữ liệu thử đầy đủ (DuLieuThu.gs): 27 đơn, 9 hợp đồng…

// ---- google.script.run giả: gọi hàm trong Code.gs qua /rpc (hàm kết thúc bằng _ là hàm riêng, không gọi được)
const SHIM = `window.google = { script: { get run() {
  const make = h => new Proxy({}, { get: (_, fn) =>
    fn === 'withSuccessHandler' ? f => make({ ...h, ok: f }) : fn === 'withFailureHandler' ? f => make({ ...h, fail: f }) :
    (...args) => fetch('/rpc', { method: 'POST', body: JSON.stringify({ fn, args }) }).then(r => r.json())
      .then(r => r.ok ? h.ok && h.ok(r.result) : h.fail && h.fail(new Error(r.error))) });
  return make({});
} } };`;

module.exports = { ctx, sheets, logs, cache, props, Sheet, drive, docs, thuMail, push };
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
  // API của app điện thoại (Api.gs → doPost). App trong Expo Go trỏ tới http://<IP máy tính>:5178/api
  if (req.url === '/api' && (req.method === 'POST' || req.method === 'OPTIONS')) {
    const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type' };
    if (req.method === 'OPTIONS') { res.writeHead(204, cors); return res.end(); }
    let body = '';
    for await (const c of req) body += c;
    const out = ctx.doPost({ postData: { contents: body, type: req.headers['content-type'] || '' } });
    await new Promise(r => setTimeout(r, 120));
    res.writeHead(200, Object.assign({ 'Content-Type': out.getMimeType() }, cors));
    return res.end(out.getContent());
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
