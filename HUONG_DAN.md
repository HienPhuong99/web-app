# Web app quản lý bán hàng – 2 cửa hàng

Một app, hai cửa hàng tách riêng dữ liệu:

| Cửa hàng | Hàng hóa | Hiện khi |
|---|---|---|
| **phuonghihi** – iPhone chính hãng | 198 phiên bản iPhone (dung lượng × màu) lấy từ phone-shop.up.railway.app | **Mặc định** khi đăng nhập |
| **Hoàng Quân Phát** – thiết bị PCCC | 347 mặt hàng + 165 khách từ 2 file cũ | Chỉ vào được ở **Cài đặt → Nâng cao**, với tài khoản được cấp quyền |

Mỗi cửa hàng có khách hàng, bảng giá, báo giá, đơn hàng, kho, công nợ, số chứng từ, màu giao diện, logo và mẫu in riêng. Tài khoản đăng nhập dùng chung; quản trị chọn mỗi tài khoản được vào cửa hàng nào. Chạy trên Google Apps Script, dữ liệu nằm trong 1 Google Sheet. Miễn phí, không cần máy chủ.

**Bản đang chạy** (cài ngày 30/09/2026): link ngắn <https://sites.google.com/view/phuonghihi> (Google Sites nhúng web app) · [link web app gốc](https://script.google.com/macros/s/AKfycbx66egogcD-sQxv48gLIjCJqeIIEeD_jwkIdmSYAKRsrHKjF_2hV1SMfa-yHRMTt02Z/exec) · dữ liệu: [Google Sheet "Quản lý bán hàng - dữ liệu app"](https://docs.google.com/spreadsheets/d/18LVeevKd0Gp9E_9-TORmBIpI-sMsEdJqz7ZofsyCOpc/edit).

| Tệp | Dùng để |
|---|---|
| `apps-script/Code.gs` | Phần máy chủ (dán vào Apps Script) |
| `apps-script/Index.html` | Giao diện (dán vào Apps Script) |
| `apps-script/appsscript.json`, `.clasp.json` | Cấu hình dự án (múi giờ VN, web app) và mã dự án Apps Script cho `clasp` |
| `du-lieu/DuLieu.xlsx` | Dữ liệu ban đầu của cả 2 cửa hàng. **Có thông tin khách PCCC, đừng chia sẻ công khai.** |
| `dev/` | Chạy thử trên máy, không cần khi dùng thật |

## Cài đặt (làm 1 lần, khoảng 10 phút)

1. **Tạo Google Sheet**: mở <https://sheets.new> bằng tài khoản Google sẽ giữ dữ liệu.
2. **Nạp dữ liệu**: Tệp → Nhập (*File → Import*) → Tải lên → chọn `du-lieu/DuLieu.xlsx` → Vị trí nhập: **Thay thế bảng tính** (*Replace spreadsheet*) → Nhập dữ liệu.
   Sheet có trang `TaiKhoan` (dùng chung), 9 trang `PS_…` (phuonghihi) và 9 trang `PCCC_…`. Không đổi tên trang và dòng tiêu đề.
   *Đã cài bản trước (1 cửa hàng)?* Dán code mới rồi chạy `caiDat` (bước 4): các trang cũ tự đổi tên thành `PCCC_…`, giữ nguyên dữ liệu; cửa hàng phuonghihi khi đó còn trống. Muốn có sẵn 198 iPhone thì làm lại từ bước 1 với file mới.
3. **Dán code**: Tiện ích mở rộng → Apps Script (*Extensions → Apps Script*).
   - Xóa hết nội dung `Code.gs` có sẵn, dán toàn bộ `apps-script/Code.gs`.
   - Bấm **+** cạnh "Tệp" → HTML → đặt tên đúng là `Index` → xóa nội dung có sẵn, dán toàn bộ `apps-script/Index.html`.
   - Bấm Lưu (Ctrl+S).
4. **Chạy `caiDat`**: trên thanh công cụ chọn hàm `caiDat` → **Chạy**. Hàm này tạo trang/cột còn thiếu, **ẩn các trang PCCC_…** (mở file Sheet chỉ thấy phuonghihi; muốn xem: Xem → Trang tính bị ẩn) và tạo tài khoản quản trị được vào cả 2 cửa hàng.
   Lần đầu Google hỏi quyền: Xem lại quyền → chọn tài khoản → Nâng cao → Đi tới … (không an toàn) → Cho phép. (Đây là script của chính bạn nên Google chưa "xác minh".)
   Xem **Nhật ký thực thi** bên dưới: có dòng `Tài khoản quản trị: admin / mật khẩu: ...`.
5. **Triển khai**: Triển khai → Tùy chọn triển khai mới (*Deploy → New deployment*) → biểu tượng ⚙ → **Ứng dụng web**:
   - Thực thi với tư cách (*Execute as*): **Tôi**
   - Người có quyền truy cập (*Who has access*): **Bất kỳ ai** (*Anyone*) – ai có link chỉ thấy trang đăng nhập phuonghihi.
   - Bấm Triển khai → sao chép **URL ứng dụng web**.
6. Mở link → đăng nhập `admin` → **Cài đặt → Đổi mật khẩu** → menu **Tài khoản** → tạo tài khoản nhân viên, tích chọn cửa hàng được vào (mặc định chỉ phuonghihi).

## Chuyển sang cửa hàng PCCC

**Cài đặt → Nâng cao → Cửa hàng đang làm việc → Hoàng Quân Phát.** Giao diện đổi sang màu đỏ, logo và dữ liệu PCCC. Mục Nâng cao chỉ hiện với tài khoản được vào từ 2 cửa hàng trở lên; nhân viên chỉ có quyền phuonghihi không thấy mục này và không nhận được dữ liệu nào của PCCC. Lần đăng nhập sau luôn mở lại phuonghihi.

## Sửa code sau này

Dán code mới vào Apps Script → Lưu → nếu bản mới có thêm bảng/cột thì **chạy lại `caiDat`** (an toàn, không mất dữ liệu, chỉ thêm phần thiếu) → Triển khai → Quản lý các lần triển khai (*Manage deployments*) → ✏ → Phiên bản: **Phiên bản mới** → Triển khai. Link giữ nguyên.
Máy này đã cài sẵn **clasp** (công cụ dòng lệnh của Google, đã đăng nhập), nên trong thư mục `D:\web-app` chỉ cần 2 lệnh: `clasp push` (thay bước dán code) rồi `clasp create-deployment -i AKfycbx66egogcD-sQxv48gLIjCJqeIIEeD_jwkIdmSYAKRsrHKjF_2hV1SMfa-yHRMTt02Z` (thay bước triển khai lại, link giữ nguyên).

Thông tin in trên chứng từ, màu, VAT mặc định (phuonghihi 0% vì giá đã gồm VAT, PCCC 8%), các hình thức thu tiền của từng cửa hàng: đầu tệp `Code.gs`, mục `SHOPS`.

## Quy trình làm việc (giống nhau ở 2 cửa hàng)

**Báo giá → Chốt thành đơn hàng → Giao hàng (tự trừ kho) → Thu tiền (tự tính công nợ)**

1. **Báo giá**: gõ tên hoặc SĐT khách để chọn (khách mới bấm **+**). Ở bảng hàng gõ tên/model rồi chọn hàng (vd. `16 pro max 256 den`). Cột **Loại giá**: *Giá sỉ* / *Giá lẻ* lấy giá từ bảng giá; tự sửa đơn giá thì tự chuyển *Giá tùy chọn*. Dòng dịch vụ (dán cường lực, công lắp đặt…) cứ gõ tên và giá.
2. **Chốt thành đơn hàng**: mở báo giá đã lưu → *Chốt thành đơn hàng* → điền ngày hẹn giao → Lưu. Cũng có thể tạo đơn hàng thẳng.
3. **Giao hàng**: trong đơn bấm *Giao hàng* → phiếu xuất kho điền sẵn số còn phải giao; giao một phần thì sửa số lượng → Lưu. Đơn tự chuyển *Giao một phần* / *Đã giao*, tồn kho tự trừ.
4. **Thu tiền**: trong đơn bấm *Thu tiền* (hoặc menu *Thu tiền & công nợ*) → số tiền điền sẵn phần còn nợ, sửa nếu là tiền cọc → Lưu. In được phiếu thu.
5. **Kho**: *Nhập kho* khi hàng về. *Tồn kho* xem số tồn, bấm vào mặt hàng xem **thẻ kho**. Đặt *Tồn tối thiểu* trong Hàng hóa để được báo *Sắp hết*.

**Mẹo:** **F2** tạo mới · **F3** tìm · **F8** lưu · **Esc** đóng hộp thoại. Tìm không cần gõ dấu. In / PDF: chọn "Lưu dưới dạng PDF". Đơn không thực hiện thì *Hủy đơn* thay vì xóa.

| | Nhân viên | Quản trị |
|---|---|---|
| Xem, thêm/sửa khách hàng, báo giá, đơn hàng, phiếu kho, phiếu thu (ở cửa hàng được vào) | ✓ | ✓ |
| Thêm/sửa bảng giá hàng hóa | | ✓ |
| Xóa chứng từ, khách hàng, mặt hàng | | ✓ |
| Quản lý tài khoản, cấp quyền cửa hàng | | ✓ |

## Dữ liệu ban đầu

**phuonghihi** (lấy từ website ngày 30/09/2026):
- 198 mặt hàng = 20 mẫu iPhone (12 → 16, SE 3) × dung lượng × màu. Tên dạng `iPhone 16 Pro Max 256GB - Titan Đen`, Model = mã SKU của website, Nhóm = dòng máy (iPhone 16 Series…), ĐVT = Máy.
- Giá lẻ = giá niêm yết trên website. Website không có giá sỉ nên cột Giá sỉ để trống.
- **Tồn kho** trên website được ghi thành phiếu nhập `001-2026/NK` "Tồn đầu kỳ (theo website phuonghihi)" – 5.075 máy. Nếu số này chỉ là dữ liệu mẫu của website: vào *Nhập – xuất kho*, mở phiếu đó, bấm *Xóa* (tài khoản quản trị) là tồn về 0.
- Chưa có khách hàng.

**Hoàng Quân Phát (PCCC)**: như bản trước – 165 khách (từ sheet lead tháng 6–9, đã tách SĐT, gộp khách trùng) và 347 mặt hàng từ "BÁO GIÁ SỈ LẺ 2025" (chỉ giá sỉ/lẻ). 23 mặt hàng có giá rác do công thức đã được xóa giá, ghi "Chưa có giá"; tổng 94 mặt hàng chưa có giá – lọc **Chưa có giá** trong Hàng hóa để bổ sung. Tồn kho, đơn hàng, công nợ bắt đầu từ 0 (nhập tồn đầu kỳ bằng một phiếu Nhập kho; nợ cũ bằng một đơn "Công nợ đầu kỳ", VAT 0, rồi Giao hàng → Lưu).

## Chạy thử trên máy (không bắt buộc)

Cần Node.js. `node dev/chay-thu.js` rồi mở <http://localhost:5178> (mật khẩu admin in ra màn hình, dữ liệu mẫu 2 cửa hàng, mất khi tắt).
`node dev/kiem-tra.js` kiểm tra phần máy chủ: đăng nhập, phân quyền cửa hàng, tách dữ liệu 2 cửa hàng, đánh số chứng từ, tính tiền, giao hàng từng phần, tồn kho, công nợ, nâng cấp từ bản cũ.
