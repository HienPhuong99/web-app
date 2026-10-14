// Tìm kiếm thông minh: máy chủ (apps-script/TimKiem.gs) và web (Index.html, khối <tim-kiem>) phải là cùng một đoạn mã và
// cho đúng kết quả mẫu trong dev/tim-kiem-mau.json (app chạy cùng mẫu này trong mobile/test/timKiem.test.ts).  node dev/kiem-tra-tim-kiem.js
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const goc = p => fs.readFileSync(path.join(__dirname, '..', 'apps-script', p), 'utf8');
const gs = goc('TimKiem.gs').split('\n').slice(2).join('\n').trim();
const khoi = goc('Index.html').match(/\/\/ <tim-kiem>[^\n]*\n([\s\S]*?)\n\/\/ <\/tim-kiem>/);
assert.ok(khoi, 'Index.html thiếu khối // <tim-kiem> … // </tim-kiem>');
assert.strictEqual(khoi[1].trim(), gs, 'Khối <tim-kiem> trong Index.html khác apps-script/TimKiem.gs: chép lại cho giống');
const mau = require('./tim-kiem-mau.json');
const ctx = vm.createContext({});
vm.runInContext(gs + '\nthis.timKiem_ = timKiem_;', ctx);
mau.forEach(m => {
  const kq = ctx.timKiem_(m.ds, m.q, x => x);
  assert.deepStrictEqual([[...kq], !!kq.ganDung], [m.kq, !!m.ganDung], m.ten + ' (gõ "' + m.q + '")');
});
// giuThuTu: chỉ lọc, giữ thứ tự danh sách (vd mới nhất trước)
assert.deepStrictEqual([...ctx.timKiem_(['Ốp lưng iPhone 15', 'iPhone 15 128GB'], 'iphone 15', x => x, { giuThuTu: true })], ['Ốp lưng iPhone 15', 'iPhone 15 128GB']);
console.log('OK - tìm kiếm thông minh: ' + mau.length + ' mẫu, web và máy chủ cùng một mã');
