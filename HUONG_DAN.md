# Web app quản lý bán hàng – phuonghihi (iPhone chính hãng)

Quản lý khách hàng, bảng giá, báo giá, đơn hàng, kho (ghi IMEI/serial, tra bảo hành), công nợ, báo cáo doanh thu, nhật ký thao tác, số chứng từ, màu giao diện, logo và mẫu in. Hàng hóa ban đầu là 198 phiên bản iPhone (dung lượng × màu) lấy từ phone-shop.up.railway.app. Chạy trên Google Apps Script, dữ liệu nằm trong 1 Google Sheet. Miễn phí, không cần máy chủ.

> **Đã bỏ cửa hàng Hoàng Quân Phát (PCCC).** Bản này chỉ còn phuonghihi; hàm `caiDat` tự xóa các trang `PCCC_…` và quyền vào cửa hàng đó (xem phần *Dọn dữ liệu PCCC cũ*). Mã nguồn vẫn hỗ trợ nhiều cửa hàng nếu sau này cần thêm: thêm một mục vào `SHOPS` ở đầu `Code.gs`.

**Bản đang chạy** (cài ngày 30/09/2026): link ngắn <https://sites.google.com/view/phuonghihi> (Google Sites nhúng web app) · [link web app gốc](https://script.google.com/macros/s/AKfycbx66egogcD-sQxv48gLIjCJqeIIEeD_jwkIdmSYAKRsrHKjF_2hV1SMfa-yHRMTt02Z/exec) · dữ liệu: [Google Sheet "Quản lý bán hàng - dữ liệu app"](https://docs.google.com/spreadsheets/d/18LVeevKd0Gp9E_9-TORmBIpI-sMsEdJqz7ZofsyCOpc/edit).

| Tệp | Dùng để |
|---|---|
| `apps-script/Code.gs` | Phần máy chủ: bán hàng, kho, công nợ, báo cáo (dán vào Apps Script) |
| `apps-script/HopDong.gs` | Phần máy chủ của Hợp đồng: lưu, tạo file Google Docs từ mẫu, PDF, mẫu (dán vào Apps Script) |
| `apps-script/Index.html` | Giao diện (dán vào Apps Script) |
| `apps-script/appsscript.json`, `.clasp.json` | Cấu hình dự án (múi giờ VN, web app) và mã dự án Apps Script cho `clasp` |
| `du-lieu/DuLieu.xlsx` | Dữ liệu ban đầu (chỉ dùng khi lập Sheet mới). **File cũ còn dữ liệu khách PCCC: nên xóa các trang `PCCC_…` hoặc bỏ file này, đừng chia sẻ công khai.** |
| `dev/` | Chạy thử trên máy, không cần khi dùng thật |

## Cài đặt (làm 1 lần, khoảng 10 phút)

1. **Tạo Google Sheet**: mở <https://sheets.new> bằng tài khoản Google sẽ giữ dữ liệu.
2. **Nạp dữ liệu**: Tệp → Nhập (*File → Import*) → Tải lên → chọn `du-lieu/DuLieu.xlsx` → Vị trí nhập: **Thay thế bảng tính** (*Replace spreadsheet*) → Nhập dữ liệu.
   Sheet có trang `TaiKhoan` (dùng chung) và các trang `PS_…` (phuonghihi); file cũ còn thêm các trang `PCCC_…` sẽ bị `caiDat` xóa ở bước 4. Không đổi tên trang và dòng tiêu đề. Các trang `CaiDat`, `…_NhatKy` và cột mới (IMEI, BaoHanh) do `caiDat` ở bước 4 tự thêm.
   *Đã cài bản trước?* Chỉ cần dán code mới rồi chạy `caiDat` (bước 4), dữ liệu phuonghihi giữ nguyên.
3. **Dán code**: Tiện ích mở rộng → Apps Script (*Extensions → Apps Script*).
   - Xóa hết nội dung `Code.gs` có sẵn, dán toàn bộ `apps-script/Code.gs`.
   - Bấm **+** cạnh "Tệp" → Tập lệnh (*Script*) → đặt tên `HopDong` → dán toàn bộ `apps-script/HopDong.gs`.
   - Bấm **+** cạnh "Tệp" → HTML → đặt tên đúng là `Index` → xóa nội dung có sẵn, dán toàn bộ `apps-script/Index.html`.
   - Bấm Lưu (Ctrl+S).
4. **Chạy `caiDat`**: trên thanh công cụ chọn hàm `caiDat` → **Chạy**. Hàm này tạo trang/cột còn thiếu, **xóa cửa hàng PCCC cũ** (trang `PCCC_…`, cấu hình, quyền vào), **tạo 5 file Google Docs mẫu hợp đồng** trong thư mục Drive `Hợp đồng - phuonghihi` và tạo tài khoản quản trị nếu chưa có.
   Lần đầu Google hỏi quyền: Xem lại quyền → chọn tài khoản → Nâng cao → Đi tới … (không an toàn) → Cho phép. (Đây là script của chính bạn nên Google chưa "xác minh".) Bản có Hợp đồng xin thêm quyền **Google Docs** và **Google Drive** (để tạo file hợp đồng từ mẫu); chưa cấp thì app vẫn chạy bình thường, chỉ nút tạo file hợp đồng báo "chưa được cấp quyền".
   Sau đó chạy thêm hàm **`kiemTraTaoHopDong`** (khoảng 30 giây): tạo thử một hợp đồng từ mẫu bằng Google thật, đọc lại để kiểm tra từng bước rồi xóa file thử; Nhật ký thực thi phải ghi **TẤT CẢ ĐẠT**. Có dòng LỖI thì chép nhật ký đó lại để được sửa.
   Xem **Nhật ký thực thi** bên dưới: có dòng `Tài khoản quản trị: admin / mật khẩu: ...`.
5. **Triển khai**: Triển khai → Tùy chọn triển khai mới (*Deploy → New deployment*) → biểu tượng ⚙ → **Ứng dụng web**:
   - Thực thi với tư cách (*Execute as*): **Tôi**
   - Người có quyền truy cập (*Who has access*): **Bất kỳ ai** (*Anyone*) – ai có link chỉ thấy trang đăng nhập phuonghihi.
   - Bấm Triển khai → sao chép **URL ứng dụng web**.
6. Mở link → đăng nhập `admin` → **Cài đặt → Đổi mật khẩu** → menu **Tài khoản** → tạo tài khoản nhân viên.

## Dọn dữ liệu PCCC cũ

`caiDat` làm các việc sau, **không hoàn tác được trong app** (nếu lỡ, khôi phục bằng Tệp → Lịch sử phiên bản của Google Sheet):
- Xóa mọi trang tính có tên bắt đầu bằng `PCCC_` (khách hàng, hàng hóa, báo giá, đơn hàng, kho, thu tiền, nhật ký của PCCC) và dòng cấu hình `cuaHang.pccc` ở trang `CaiDat`.
- Gỡ PCCC khỏi cột `CuaHang` của các tài khoản. **Nhân viên chỉ được vào PCCC bị khóa** (để không tự rơi vào phuonghihi); muốn dùng lại: menu Tài khoản → mở khóa. Quản trị không bị ảnh hưởng.
- Chạy lại nhiều lần được; khi không còn gì để xóa thì không làm gì.
Nhật ký thực thi in rõ đã xóa những trang nào và khóa tài khoản nào.

## Sửa code sau này

Dán code mới vào Apps Script → Lưu → Triển khai → Quản lý các lần triển khai (*Manage deployments*) → ✏ → Phiên bản: **Phiên bản mới** → Triển khai. Link giữ nguyên. Bản mới có thêm bảng/cột thì app **tự thêm vào Sheet** ở lần mở đầu tiên (không mất dữ liệu, không cần chạy lại `caiDat`; lần mở đó chậm hơn vài giây).
**Một lệnh:** `node dev/trien-khai.js` chạy kiểm tra, rồi `clasp push`, rồi tạo bản triển khai mới giữ nguyên link (dừng nếu một bước lỗi). Làm tay thì như sau.
Máy này đã cài sẵn **clasp** (công cụ dòng lệnh của Google, đã đăng nhập), nên trong thư mục `D:\web-app` chỉ cần 2 lệnh: `clasp push` (thay bước dán code) rồi `clasp create-deployment -i AKfycbx66egogcD-sQxv48gLIjCJqeIIEeD_jwkIdmSYAKRsrHKjF_2hV1SMfa-yHRMTt02Z` (thay bước triển khai lại, link giữ nguyên).

Tên cửa hàng, thông tin in trên chứng từ, mã số thuế, VAT mặc định (0% vì giá iPhone đã gồm VAT), thời hạn bảo hành, hình thức thu tiền, tài khoản nhận chuyển khoản: quản trị sửa ngay trong app ở **Cài đặt → Thông tin cửa hàng → Sửa** (lưu ở trang `CaiDat`). Giá trị mặc định và màu giao diện nằm ở đầu tệp `Code.gs`, mục `SHOPS`.

## Hợp đồng (từ mẫu Google Docs)

Menu **Hợp đồng**. Bên A là khách hàng, bên B là cửa hàng (lấy từ *Cài đặt → Thông tin cửa hàng*; nên điền đủ **Chủ hộ / người đại diện**, **Chức danh người ký**, **mã số thuế** và **tài khoản nhận chuyển khoản** để hợp đồng không còn chỗ chấm). Chưa điền thì chỗ đó in dấu chấm để viết tay.

1. **Lập**: *Hợp đồng → Lập hợp đồng*, hoặc mở một **đơn hàng → Tạo hợp đồng** (chép khách, VAT, hàng và gắn vào đơn), hoặc ở màn hình khách hàng bấm *Lập hợp đồng*. Chọn loại hợp đồng; gõ tên khách để chọn (tự điền bên A, thiếu thì bổ sung rồi app hỏi có lưu vào khách hàng không); chọn hàng ở bảng (đơn giá lấy từ bảng giá, sửa được); thấy ngay VAT, tổng thanh toán và **số tiền bằng chữ**. Bấm **Lưu** (số dạng `001-2026/HD`, đánh lại từ 001 mỗi năm).
2. **Tạo file**: thẻ *File hợp đồng* ở đầu màn hình soạn → **Tạo file hợp đồng**. App chép file Google Docs mẫu của loại hợp đồng, thay các biến, chèn bảng hàng và lưu trong thư mục Drive `Hợp đồng - phuonghihi`. Sửa hợp đồng sau đó thì thẻ báo **file đã cũ**. **Tải PDF** luôn khớp nội dung mới nhất (tự lưu và tạo lại file nếu cần). Nhân viên dùng được hai nút này dù không có quyền mở Drive; nút *Mở Google Docs* chỉ hiện cho quản trị và chỉ mở được bằng tài khoản Google của chủ file.
3. **Nhân bản / tạo hàng loạt**: *Nhân bản* trong màn hình soạn chép hợp đồng thành bản mới (đổi loại hợp đồng nếu muốn dùng mẫu khác). *Hợp đồng → Tạo hàng loạt*: tìm và tick nhiều hợp đồng nguồn, chọn một loại hợp đồng mới, bấm tạo; mỗi hợp đồng được chép (bên A, hàng hóa, VAT; ngày ký là hôm nay, ngày hiệu lực và hết hạn để trống) và có luôn file. Tối đa 20 hợp đồng mỗi lần; cái nào lỗi thì báo riêng cái đó.
4. **Theo dõi hạn**: nhập *Ngày hiệu lực*, *Ngày hết hạn* và chuyển trạng thái **Đang hiệu lực** khi hai bên ký. Menu **Sắp hết hạn** (có số đếm), thẻ trên **Tổng quan** liệt kê hợp đồng đã quá hạn và còn dưới 30 ngày. Gia hạn: sửa ngày hết hạn (hợp đồng tự rời khỏi danh sách) hoặc nhân bản. Hợp đồng *Hoàn thành* hoặc *Tạm dừng* không bị nhắc.
5. **Đã hiệu lực thì khóa số liệu**: nhân viên không sửa hàng hóa và số tiền của hợp đồng *Đang hiệu lực* / *Hoàn thành* (chỉ quản trị); muốn đổi thì nhân bản thành hợp đồng mới. Mọi thao tác ghi vào **Nhật ký**. Chỉ quản trị xóa hợp đồng (file Docs vào thùng rác Drive, còn khôi phục được).

**5 mẫu có sẵn** cho cửa hàng điện thoại: *Hợp đồng mua bán*, *nguyên tắc*, *đại lý – phân phối*, *thu cũ đổi mới*, *dịch vụ sửa chữa – bảo hành*. Đây là **khung tham khảo, không thay tư vấn pháp lý**: nên nhờ luật sư rà soát rồi sửa thẳng trong file mẫu (chỗ để trống ghi "……" là chỗ điền tay hoặc điều chỉnh theo thỏa thuận thực tế).

**Sửa mẫu / thêm loại hợp đồng** (quản trị): *Cài đặt → Mẫu hợp đồng*. Bấm *Mở file mẫu* để sửa nội dung trong Google Docs. Muốn dùng file Docs của riêng bạn: đưa file vào thư mục `Hợp đồng - phuonghihi` trên Drive (kéo thả), rồi *Thêm loại hợp đồng* và dán link. Bắt buộc nằm trong thư mục đó để quản trị trong app không dùng được tài liệu riêng khác của chủ Google. Trong file mẫu gõ biến dạng `{{TENDOANHNGHIEP}}`; *Danh sách biến* liệt kê hơn 30 biến (bên A, bên B, ngày, tiền, bằng chữ…) và bấm vào để sao chép. Đặt `{{BANGHANG}}` riêng một dòng để chèn bảng hàng. Biến app không biết được giữ nguyên trong file và báo sau khi tạo. Xóa một mẫu mặc định thì tự tạo lại khi cần, hoặc bấm *Tạo lại mẫu mặc định*.

**Lưu ý kỹ thuật:** file mẫu và hợp đồng thuộc Google Drive của **chủ script**; mẫu và thư mục tách riêng theo cửa hàng; đổi tên cửa hàng sau này không đổi tên thư mục đã có. Chưa có email nhắc hạn (cần thêm quyền gửi mail cho cả script).

## Quy trình làm việc

**Báo giá → Chốt thành đơn hàng → Giao hàng (tự trừ kho) → Thu tiền (tự tính công nợ)**

1. **Báo giá**: gõ tên hoặc SĐT khách để chọn (khách mới bấm **+**). Ở bảng hàng gõ tên/model rồi chọn hàng (vd. `16 pro max 256 den`). Cột **Loại giá**: *Giá sỉ* / *Giá lẻ* lấy giá từ bảng giá; tự sửa đơn giá thì tự chuyển *Giá tùy chọn*. Dòng dịch vụ (dán cường lực, công lắp đặt…) cứ gõ tên và giá.
2. **Chốt thành đơn hàng**: mở báo giá đã lưu → *Chốt thành đơn hàng* → điền ngày hẹn giao → Lưu. Cũng có thể tạo đơn hàng thẳng.
3. **Giao hàng**: trong đơn bấm *Giao hàng* → phiếu xuất kho điền sẵn số còn phải giao; giao một phần thì sửa số lượng → Lưu. Đơn tự chuyển *Giao một phần* / *Đã giao*, tồn kho tự trừ.
   Máy có **IMEI/serial**: gõ hoặc quét mã vạch vào cột *IMEI / Serial* (mỗi máy một mã, quét xong máy này quét tiếp máy kia; số lượng tự đếm). App chặn bán trùng một IMEI; khách trả máy thì làm phiếu Nhập kho ghi IMEI đó là bán lại được. Phiếu in ra là **phiếu giao hàng kiêm phiếu bảo hành** (có IMEI và ngày hết bảo hành).
4. **Thu tiền**: trong đơn hoặc ngay trên phiếu giao bấm *Thu tiền* (hoặc menu *Thu tiền & công nợ*) → số tiền điền sẵn phần còn nợ, sửa nếu là tiền cọc → Lưu. In được phiếu thu.
   Khách chuyển khoản: bấm **Mã QR chuyển khoản** để hiện mã VietQR có sẵn số tiền và số đơn cho khách quét. Mã QR cũng được in trên báo giá và đơn hàng. Bật ở *Cài đặt → Thông tin cửa hàng → Sửa*: chọn ngân hàng, nhập số tài khoản, tên chủ tài khoản – rồi **quét thử một lần** xem tên chủ tài khoản hiện đúng chưa.
5. **Kho**: *Nhập kho* khi hàng về (ghi IMEI nếu muốn, không bắt buộc). *Tồn kho* xem số tồn, bấm vào mặt hàng xem **thẻ kho**. Đặt *Tồn tối thiểu* trong Hàng hóa để được báo *Sắp hết*.
6. **Bảo hành**: menu *Bảo hành* → gõ IMEI, SĐT hoặc tên khách là ra máy đã bán, ngày giao, ngày hết bảo hành. Thời hạn: ô *Bảo hành (tháng)* của từng mặt hàng; để trống thì theo cửa hàng (mặc định 12 tháng), 0 là không bảo hành.
7. **Báo cáo & sổ doanh thu**: chọn kỳ (tháng, quý, năm hoặc từ ngày – đến ngày) → doanh thu theo ngày, theo nhân viên, theo khách, theo mặt hàng; *Xuất CSV* để mở bằng Excel/Google Sheets. Nút **In sổ doanh thu (S1a-HKD)** in sổ doanh thu bán hàng hóa, dịch vụ theo mẫu của Thông tư 152/2025/TT-BTC (hộ kinh doanh phải ghi sổ từ 01/01/2026), mỗi ngày một dòng. Điền tên chủ hộ và mã số thuế ở *Cài đặt → Thông tin cửa hàng*. Đối chiếu với mẫu của cơ quan thuế trước khi nộp; hộ doanh thu trên 1 tỷ đồng/năm dùng mẫu khác (S2a…) và phải xuất hóa đơn điện tử – app chưa làm hai việc này.
8. **Nhật ký** (quản trị): ai thêm, sửa, xóa, hủy chứng từ nào, lúc nào. Google Sheet chỉ ghi mọi thay đổi dưới tên chủ file nên đây là chỗ duy nhất biết nhân viên nào đã làm.

**Mẹo:** **F2** tạo mới · **F3** tìm · **F8** lưu · **Esc** đóng hộp thoại. Tìm không cần gõ dấu. In / PDF: chọn "Lưu dưới dạng PDF". Đơn không thực hiện thì *Hủy đơn* thay vì xóa.

| | Nhân viên | Quản trị |
|---|---|---|
| Xem, thêm/sửa khách hàng, báo giá, đơn hàng, phiếu kho, phiếu thu | ✓ | ✓ |
| Lập, sửa hợp đồng, tạo file Docs, tải PDF, nhân bản, tạo hàng loạt | ✓ | ✓ |
| Sửa hàng hóa và số tiền của hợp đồng đã hiệu lực; xóa hợp đồng; sửa mẫu hợp đồng | | ✓ |
| Thêm/sửa bảng giá hàng hóa | | ✓ |
| Xóa chứng từ, khách hàng, mặt hàng | | ✓ |
| Quản lý tài khoản, cấp quyền cửa hàng | | ✓ |
| Sửa thông tin cửa hàng, tài khoản nhận chuyển khoản; xem nhật ký | | ✓ |

Khóa tài khoản, đổi quyền hoặc đặt lại mật khẩu có hiệu lực **ngay**: các máy đang đăng nhập bằng tài khoản đó bị đăng xuất. Tự đổi mật khẩu thì máy đang dùng giữ nguyên, các máy khác phải đăng nhập lại.

## Dữ liệu ban đầu

**phuonghihi** (lấy từ website ngày 30/09/2026):
- 198 mặt hàng = 20 mẫu iPhone (12 → 16, SE 3) × dung lượng × màu. Tên dạng `iPhone 16 Pro Max 256GB - Titan Đen`, Model = mã SKU của website, Nhóm = dòng máy (iPhone 16 Series…), ĐVT = Máy.
- Giá lẻ = giá niêm yết trên website. Website không có giá sỉ nên cột Giá sỉ để trống.
- **Tồn kho** trên website được ghi thành phiếu nhập `001-2026/NK` "Tồn đầu kỳ (theo website phuonghihi)" – 5.075 máy. Nếu số này chỉ là dữ liệu mẫu của website: vào *Nhập – xuất kho*, mở phiếu đó, bấm *Xóa* (tài khoản quản trị) là tồn về 0.
- Chưa có khách hàng.


## Chạy thử trên máy (không bắt buộc)

Cần Node.js. `node dev/chay-thu.js` rồi mở <http://localhost:5178> (mật khẩu admin in ra màn hình, dữ liệu mẫu, mất khi tắt).
**Trước khi triển khai một bản mới, thử trên Google thật:** trong trình soạn thảo Apps Script bấm Triển khai → *Thử nghiệm các lần triển khai* (*Test deployments*) → mở link có đuôi `/dev`. Link này chỉ chủ tài khoản mở được và chạy đúng code vừa đẩy lên, trên dữ liệu thật. Lý do: Apps Script tự xóa chú thích trong `Index.html` khi phục vụ trang và cắt nhầm mọi thứ sau `//` nằm trong chuỗi `` `...` `` (ví dụ `` `https://...` ``), làm trang trắng – lỗi này chạy thử trên máy không thấy. `node dev/kiem-tra-html.js` bắt lỗi đó trước khi đẩy.

`node dev/kiem-tra.js` kiểm tra giao diện (lệnh trên) và phần máy chủ: đăng nhập, thu hồi phiên, phân quyền, tách dữ liệu giữa các cửa hàng (bằng một cửa hàng thử dựng trong test), dọn dữ liệu PCCC cũ, đánh số chứng từ, tính tiền, giao hàng từng phần, IMEI và hạn bảo hành, tồn kho, công nợ, báo cáo, nhật ký, sửa thông tin cửa hàng, tự nâng cấp từ bản cũ, hợp đồng (lưu, tính tiền, bằng chữ, tạo file từ mẫu, PDF, nhân bản, quản lý mẫu, thiếu quyền Docs/Drive).
`NODE_PATH=$(npm root -g) node dev/kiem-trinh-duyet.js` mở giao diện trong Chromium không giao diện, đăng nhập và thử từng màn hình, gồm cả lập hợp đồng, tải PDF, tạo hàng loạt và màn hình điện thoại (cần Playwright; `SHOT_DIR=thư-mục` để lưu ảnh chụp). **Cả hai chạy trên bản giả lập Google** (kể cả Docs/Drive): chỉ hàm `kiemTraTaoHopDong` ở trên chạy trên Google thật.
