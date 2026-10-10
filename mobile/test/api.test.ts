// Gọi API thật của máy chủ thử (dev/chay-thu.js --mau-app, giả lập Apps Script) qua HTTP, đúng như app làm.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import path from 'node:path';
import http from 'node:http';
import { goiApi, LoiPhien, type DangNhapKQ, type TraBaoHanhKQ, type TongQuan } from '../src/lib/api.ts';

const PORT = 21000 + Math.floor(Math.random() * 20000);
const URL = `http://127.0.0.1:${PORT}/api`;
let mayChu: ChildProcess, matKhau = '';

before(async () => {
  mayChu = spawn(process.execPath, [path.join(import.meta.dirname, '..', '..', 'dev', 'chay-thu.js'), '--mau-app'], { env: { ...process.env, PORT: String(PORT) } });
  let ra = '';
  await new Promise<void>((xong, loi) => {
    const hen = setTimeout(() => loi(new Error('Máy chủ thử không chạy: ' + ra)), 15000);
    mayChu.stdout!.on('data', d => { ra += d; if (/Chạy thử tại/.test(ra)) { clearTimeout(hen); xong(); } });
    mayChu.on('exit', c => loi(new Error('Máy chủ thử dừng (' + c + '): ' + ra)));
  });
  matKhau = /mật khẩu: (\S+)/.exec(ra)![1];
});
after(() => { mayChu.kill(); });

test('đăng nhập, tổng quan, tra bảo hành, đăng xuất', async () => {
  assert.equal((await goiApi<{ ten: string }>(URL, { fn: 'thongTinDangNhap' })).ten, 'phuonghihi');
  await assert.rejects(goiApi(URL, { fn: 'dangNhapMay', args: ['admin', 'sai'] }), /Sai tên đăng nhập/);
  await assert.rejects(goiApi(URL, { fn: 'tongQuanMay' }), LoiPhien);

  const dn = await goiApi<DangNhapKQ>(URL, { fn: 'dangNhapMay', args: ['admin', matKhau, 'Node test'] });
  assert.match(dn.may, /^[0-9a-f]{64}$/);
  assert.equal(dn.user.ten, 'Quản trị');

  const tq = await goiApi<TongQuan>(URL, { fn: 'tongQuanMay', may: dn.may });
  assert.deepEqual([tq.ban.don, tq.ban.tien, tq.thu, tq.ban7.length], [1, 28200000, 20000000, 7]);
  assert.equal(tq.no.tong, 8200000);

  const con = await goiApi<TraBaoHanhKQ>(URL, { fn: 'traBaoHanh', args: ['356789012345672'], may: dn.may });
  assert.deepEqual([con.tong, con.ds[0].TenKH, con.ds[0].ConHan], [1, 'Anh Minh', true]);
  const het = await goiApi<TraBaoHanhKQ>(URL, { fn: 'traBaoHanh', args: ['351234567890124'], may: dn.may });
  assert.deepEqual([het.tong, het.ds[0].ConHan, het.ds[0].HetHan], [1, false, '2025-03-10']);
  await assert.rejects(goiApi(URL, { fn: 'traBaoHanh', args: ['12'], may: dn.may }), /ít nhất 3 ký tự/);

  assert.equal(await goiApi(URL, { fn: 'dangXuatMay', may: dn.may }), null);
  await assert.rejects(goiApi(URL, { fn: 'tongQuanMay', may: dn.may }), LoiPhien);
});

test('lỗi mạng, địa chỉ sai, máy chủ trả HTML, chờ quá lâu', async () => {
  await assert.rejects(goiApi('script.google.com', { fn: 'x' }), /Địa chỉ máy chủ không hợp lệ/);
  await assert.rejects(goiApi('http://127.0.0.1:9/api', { fn: 'x' }), /Không kết nối được máy chủ/);
  // Máy chủ giả: trang HTML (web app chưa mở cho "Bất kỳ ai"), lỗi 500, và trả lời rất chậm
  const gia = http.createServer((req, res) => {
    if (req.url === '/html') { res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end('<html>Đăng nhập Google</html>'); }
    if (req.url === '/500') { res.writeHead(500); return res.end(); }
    if (req.url === '/sai') { res.writeHead(200); return res.end('{"a":1}'); }
    setTimeout(() => res.end('{"ok":true,"result":1}'), 2000);
  });
  await new Promise<void>(r => gia.listen(0, '127.0.0.1', r));
  const goc = `http://127.0.0.1:${(gia.address() as { port: number }).port}`;
  try {
    await assert.rejects(goiApi(goc + '/html', { fn: 'x' }), /không đọc được/);
    await assert.rejects(goiApi(goc + '/500', { fn: 'x' }), /HTTP 500/);
    await assert.rejects(goiApi(goc + '/sai', { fn: 'x' }), /không đúng dạng/);
    await assert.rejects(goiApi(goc + '/cham', { fn: 'x' }, 300), /quá lâu/);
    assert.equal(await goiApi(goc + '/cham', { fn: 'x' }, 5000), 1);
  } finally { gia.close(); }
});
