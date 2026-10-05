// Triển khai bản mới lên Google chỉ bằng một lệnh (chạy trên máy đã cài clasp và đã đăng nhập, xem HUONG_DAN.md):
//   node dev/trien-khai.js            kiểm tra -> clasp push -> tạo bản triển khai mới giữ nguyên link
//   node dev/trien-khai.js --bo-qua-kiem-tra
// Dừng ngay nếu một bước lỗi. Lần đầu triển khai bản có hợp đồng còn một việc phải làm tay (cấp quyền Docs/Drive), in ở cuối.
const { spawnSync } = require('child_process'), path = require('path');
const ROOT = path.join(__dirname, '..');
const DEPLOYMENT_ID = 'AKfycbx66egogcD-sQxv48gLIjCJqeIIEeD_jwkIdmSYAKRsrHKjF_2hV1SMfa-yHRMTt02Z'; // link web app đang chạy (giữ nguyên khi triển khai lại)
const chay = (lenh, args) => {
  console.log('\n$ ' + [lenh, ...args].join(' '));
  const r = spawnSync(lenh, args, { cwd: ROOT, stdio: 'inherit', shell: process.platform === 'win32' }); // shell trên Windows để tìm được clasp.cmd
  if (r.error || r.status !== 0) { console.error('\nDừng: bước trên lỗi' + (r.error ? ' (' + r.error.message + ')' : '') + '.'); process.exit(r.status || 1); }
};
if (!process.argv.includes('--bo-qua-kiem-tra')) chay(process.execPath, [path.join('dev', 'kiem-tra.js')]);
chay('clasp', ['push', '--force']);
chay('clasp', ['create-deployment', '-i', DEPLOYMENT_ID]);
console.log(`
Đã đẩy code và triển khai lại, link giữ nguyên.
Nếu đây là lần đầu triển khai bản có Hợp đồng (hoặc bản mới đổi quyền), còn 1 việc làm tay:
  1. Chạy "clasp open" (hoặc mở Tiện ích mở rộng -> Apps Script).
  2. Chọn hàm caiDat -> Chạy -> Xem lại quyền -> Cho phép (xin quyền Google Docs/Drive; caiDat cũng tạo 5 file mẫu hợp đồng và xóa cửa hàng PCCC cũ).
  3. Chọn hàm kiemTraTaoHopDong -> Chạy: phải thấy "TẤT CẢ ĐẠT" ở Nhật ký thực thi.
Rồi thử trên link /dev (Triển khai -> Thử nghiệm các lần triển khai) trước khi dùng thật.`);
