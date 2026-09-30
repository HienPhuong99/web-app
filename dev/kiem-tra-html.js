// Kiểm tra Index.html trước khi đẩy lên Apps Script:  node dev/kiem-tra-html.js
// HtmlService của Apps Script tự xóa chú thích trong <script>, nhưng bộ xóa đó không hiểu chuỗi `...` và biểu thức /regex/:
// gặp "//" ở trong đó nó cắt bỏ phần còn lại của dòng (vd `https://...` thành `https:) làm hỏng cả trang, mà chạy thử trên máy không thấy.
// Vì vậy: trong mã giao diện, "//" và "/*" chỉ được xuất hiện ở chú thích thật.
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'apps-script', 'Index.html'), 'utf8');
const js = html.match(/<script>([\s\S]*)<\/script>/)[1];
new Function(js); // cú pháp hợp lệ

const bad = [];
const lineOf = i => js.slice(0, i).split('\n').length;
const stack = []; // ngữ cảnh: 'tpl' = trong `...`, số = độ sâu ngoặc nhọn của ${...}
let i = 0, prev = ''; // prev = ký tự có nghĩa gần nhất, để đoán "/" là chia hay mở regex
const top = () => stack[stack.length - 1];
while (i < js.length) {
  const c = js[i], d = js[i + 1];
  if (top() === 'tpl') { // trong chuỗi mẫu
    if (c === '\\') { i += 2; continue; }
    if (c === '`') { stack.pop(); prev = '`'; i++; continue; }
    if (c === '$' && d === '{') { stack.push(0); i += 2; prev = '{'; continue; }
    if (c === '/' && (d === '/' || d === '*')) bad.push([lineOf(i), 'trong chuỗi `...`']);
    i++; continue;
  }
  if (c === '/' && d === '/') { while (i < js.length && js[i] !== '\n') i++; continue; } // chú thích thật
  if (c === '/' && d === '*') { i = js.indexOf('*/', i + 2) + 2; continue; }
  if (c === "'" || c === '"') { // chuỗi thường: "//" bên trong cũng báo, cho chắc
    let j = i + 1;
    while (js[j] !== c) { if (js[j] === '\\') j++; else if (js[j] === '/' && (js[j + 1] === '/' || js[j + 1] === '*')) bad.push([lineOf(j), 'trong chuỗi ' + c + '...' + c]); j++; }
    i = j + 1; prev = c; continue;
  }
  if (c === '`') { stack.push('tpl'); i++; continue; }
  if (c === '/' && !/[\w$)\]'"`]/.test(prev)) { // mở regex
    let j = i + 1, cls = false;
    while (js[j] !== '/' || cls) {
      if (js[j] === '\\') j++; else if (js[j] === '[') cls = true; else if (js[j] === ']') cls = false;
      else if (js[j] === '/' && (js[j + 1] === '/' || js[j + 1] === '*')) bad.push([lineOf(j), 'trong regex']);
      j++;
    }
    if (js[j + 1] === '/' || js[j + 1] === '*') bad.push([lineOf(j), 'ngay sau regex']);
    i = j + 1; prev = ')'; continue;
  }
  if (typeof top() === 'number') { // trong ${...}
    if (c === '{') stack[stack.length - 1]++;
    else if (c === '}') { if (top() === 0) { stack.pop(); i++; continue; } stack[stack.length - 1]--; }
  }
  if (!/\s/.test(c)) prev = c;
  i++;
}
if (bad.length) {
  bad.forEach(([l, where]) => console.error(`Dòng ${l} của <script>: có "//" hoặc "/*" ${where}: ${js.split('\n')[l - 1].trim().slice(0, 110)}`));
  console.error('Apps Script sẽ cắt các dòng này. Tách ra, vd "https:/" + "/ten-mien".');
  process.exit(1);
}
if (/<\?/.test(html)) { console.error('Index.html có "<?" – Apps Script coi là mã scriptlet.'); process.exit(1); }
console.log('OK - Index.html: cú pháp hợp lệ, không có "//" hay "/*" ngoài chú thích');
