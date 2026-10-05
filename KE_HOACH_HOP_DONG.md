# Kế hoạch: thêm module "Hợp đồng tự động" vào web app bán hàng

> Bản nháp để bạn duyệt. **Chưa có dòng code nào được sửa.** Sau khi bạn chốt các mục ở phần 8, tôi mới bắt tay làm theo từng giai đoạn ở phần 5.

## 1. Video nói gì (Optimatevn – "Tạo hợp đồng mua bán, HĐ kinh tế tự động")

Video 60 giây, quay màn hình một file Google Sheet có thêm menu **Hợp đồng** (Apps Script). Ý tưởng gồm 6 phần:

| # | Chức năng trong video | Cách hoạt động |
|---|---|---|
| 1 | **Thiết lập mẫu** (trang `Thiết lập file`) | Mỗi *loại hợp đồng* (mua bán, nguyên tắc…) gắn với 1 file Google Docs mẫu. Trong mẫu viết sẵn biến dạng `{{MAHOPDONG}}`, `{{TENDOANHNGHIEP}}`, `{{MASOTHUE}}`, `{{NGUOIDAIDIEN}}`, `{{CHUCVU}}`, `{{SOTAIKHOAN}}`, `{{NGANHANG}}`… Bảng bên cạnh cho sửa tên cột ↔ tên biến. |
| 2 | **Tạo hợp đồng mới** (hộp thoại) | 3 bước: (1) chọn loại hợp đồng, (2) điền thông tin bên A (mã HĐ, tên DN, địa chỉ, VP giao dịch, MST, người đại diện, chức vụ, SĐT, STK, ngân hàng), (3) bảng hàng hóa: chọn SKU → tự điền ĐVT + đơn giá, nhập SL → tự tính thành tiền. |
| 3 | **Tổng hợp tiền** | Cộng tiền hàng, VAT % (lấy từ cấu hình), tiền VAT, tổng thanh toán, **bằng chữ** ("Một trăm mười hai triệu bốn trăm hai mươi nghìn đồng chẵn"). |
| 4 | **Bấm "Tạo hợp đồng"** | Script sao chép file Docs mẫu, thay mọi `{{BIẾN}}` bằng dữ liệu, chèn bảng hàng hóa, rồi **ghi 1 dòng vào trang `Hợp đồng`** kèm thời gian tạo, loại HĐ và **link file**. |
| 5 | **Tạo từ hợp đồng cũ / tạo hàng loạt** | Tìm và tick nhiều hợp đồng nguồn → chọn 1 loại hợp đồng mới chung → "Tạo hợp đồng hàng loạt" → báo kết quả từng mã (`HD-003/2025 → OK`). Dùng khi cần ra cùng lúc nhiều hợp đồng nguyên tắc từ các hợp đồng mua bán đã có. |
| 6 | **Quản lý vòng đời** (trang `Hợp đồng`, `Hợp đồng đến hạn`) | Cột *Ngày ký / hiệu lực / hết hạn*, *Người phụ trách*, *Trạng thái* (Soạn thảo · Đang hiệu lực · Tạm dừng · Hoàn thành · Đã hết hạn) có màu; trang riêng lọc hợp đồng sắp hết hạn. Dữ liệu hàng hóa của từng hợp đồng nằm ở trang `ContractItems`. |

Menu trong video: *Thiết lập Template hợp đồng · Tạo hợp đồng mới · Tạo từ hợp đồng cũ · Tạo nhanh từ dữ liệu*.

> Lưu ý: video chỉ có chữ chạy trên màn hình, không có lời thuyết minh nên tôi suy ra cách hoạt động từ hình ảnh. Những chỗ suy đoán được ghi rõ ở phần 7.

## 2. Vì sao hợp với web app hiện tại

Repo đã có sẵn đúng những thứ video cần, nên **không phải làm lại từ đầu**, chỉ gắn thêm một module:

| Cần cho hợp đồng | Đã có trong app |
|---|---|
| Danh sách khách (tên DN, MST, địa chỉ, SĐT) | `KhachHang` |
| Danh mục hàng + ĐVT + giá | `HangHoa` (giá sỉ/lẻ) |
| Dòng hàng, tính tiền, VAT ở máy chủ | `luuChungTu` / `BaoGiaCT` / `DonHangCT` |
| Đánh số theo năm, riêng từng cửa hàng | `nextSo_` → dạng `001-2026/HD` |
| Thông tin bên bán (tên, địa chỉ, MST, người ký, ngân hàng) | `SHOPS[..].congTy`, sửa trong Cài đặt |
| Tách dữ liệu 2 cửa hàng, phân quyền, nhật ký | `PS_`/`PCCC_` + `user_()` + `log_()` |
| Tự thêm bảng/cột khi đổi `SCHEMA` | `taoBang_` / `nangCap_` |

Điểm hơn video: hợp đồng có thể **sinh thẳng từ Đơn hàng đã chốt** (Báo giá → Đơn hàng → **Hợp đồng**), khỏi gõ lại thông tin khách và hàng.

## 3. Thiết kế

### 3.1 Dữ liệu (thêm vào `TABLES`, tăng `SCHEMA` lên `'3'`; app tự tạo trang ở lần mở đầu, không mất dữ liệu cũ)

```
HopDong:   SoHD, Ngay(ngày ký), LoaiHD, SoDH, MaKH,
           TenDN, DiaChi, VanPhongGD, MST, NguoiDaiDien, ChucVu, SDT, SoTK, NganHang,   ← bên A (khách)
           NgayHieuLuc, NgayHetHan, NguoiPhuTrach, TrangThai,
           TienHang, VAT, TienVAT, TongCong, BangChu,
           FileId, LinkFile, NguoiTao, NgayTao, NgaySua
HopDongCT: SoHD, STT, MaHH, TenHang, DVT, SoLuong, DonGia, ThanhTien
MauHopDong: LoaiHD, LinkMau, GhiChu            ← mẫu Docs, mỗi cửa hàng một bộ
KhachHang: thêm cột NguoiDaiDien, ChucVu, SoTK, NganHang, VanPhongGD   ← gõ 1 lần, các hợp đồng sau tự điền
```

- **Bên A = khách, bên B = cửa hàng** (đúng như mẫu trong video). Thông tin bên B lấy từ *Cài đặt → Thông tin cửa hàng*; thêm 2 ô còn thiếu: *Chức vụ người ký*, *Số tài khoản + ngân hàng* (đã có `qrSoTK`/`nganHang`, chỉ cần nối vào biến).
- Trạng thái lưu: *Soạn thảo, Đang hiệu lực, Tạm dừng, Hoàn thành*. **"Đã hết hạn" và "Sắp hết hạn" tính tự động** từ `NgayHetHan` (video nhập tay nên dễ sai).
- Số hợp đồng tự sinh `001-2026/HD` giống các chứng từ khác (cho sửa tay nếu cần theo mẫu `HD-001/2025`).

### 3.2 Sinh file hợp đồng

Hai lựa chọn, **tôi khuyến nghị A**:

- **A. Google Docs mẫu (như video).** Người dùng tự soạn mẫu trong Google Docs, không cần sửa code mỗi khi đổi điều khoản. Máy chủ: `DriveApp.getFileById(mau).makeCopy()` → `DocumentApp` thay `{{BIẾN}}` → chèn bảng hàng tại `{{BANGHANG}}` → lưu. Cần thêm quyền Drive/Docs (xem rủi ro R1).
- **B. In HTML trong app** (như báo giá hiện nay, `printDoc` → PDF). Không cần quyền mới, nhưng điều khoản nằm trong code, sửa mẫu phải nhờ lập trình.

Dù chọn A, vẫn có nút **Tải PDF** ngay trong app (máy chủ xuất PDF từ Docs trả về trình duyệt) vì nhân viên đăng nhập bằng tài khoản của app, **không có quyền mở link Drive**. Link Docs chỉ dành cho chủ file/quản trị.

### 3.3 Biến trong mẫu

Giữ đúng tên như video để tận dụng mẫu có sẵn: `{{MAHOPDONG}} {{TENDOANHNGHIEP}} {{DIACHIDOANHNGHIEP}} {{VANPHONGGIAODICH}} {{MASOTHUE}} {{NGUOIDAIDIEN}} {{CHUCVU}} {{DIENTHOAI}} {{SOTAIKHOAN}} {{NGANHANG}} {{THOIGIANTAO}} {{LOAIHOPDONG}}`, thêm `{{NGAYKY}} {{NGAYHIEULUC}} {{NGAYHETHAN}} {{CONGTIENHANG}} {{VAT}} {{TIENVAT}} {{TONGTHANHTOAN}} {{BANGCHU}} {{BANGHANG}}` và nhóm bên B `{{B_TEN}} {{B_DIACHI}} {{B_MST}} {{B_DAIDIEN}} {{B_CHUCVU}} {{B_STK}} {{B_NGANHANG}}`. Màn hình *Cài đặt → Mẫu hợp đồng* liệt kê sẵn danh sách này để bấm sao chép.

### 3.4 Giao diện (thêm vào `NAV` trong `Index.html`)

Nhóm mới **Hợp đồng**: `Hợp đồng` (danh sách + lọc loại/trạng thái/người phụ trách, tìm không dấu) và `Sắp hết hạn` (có số đếm trên menu như "Đơn hàng"). Nút **Lập hợp đồng** mở màn hình 4 phần giống video: ① Loại & mẫu · ② Thông tin bên A (chọn khách thì tự điền) · ③ Bảng hàng (gõ tên chọn hàng, tự điền ĐVT/giá) · ④ Tổng hợp + bằng chữ. Thêm: nút *Tạo hợp đồng từ đơn hàng* trong màn hình Đơn hàng, *Nhân bản* một hợp đồng, *Tạo hàng loạt* (hộp thoại tick nhiều hợp đồng + chọn loại mới), mục *Hợp đồng sắp hết hạn* trên Tổng quan.

## 4. Quyền và an toàn

- Nhân viên: xem, lập, sửa hợp đồng ở cửa hàng được vào. Quản trị: xóa hợp đồng, sửa mẫu, cấu hình. Mọi thao tác ghi `NhatKy`.
- Mọi số tiền và bằng chữ **tính lại ở máy chủ** (như `luuChungTu`), không tin số từ trình duyệt.
- Dữ liệu điền vào Docs: chặn ký tự điều khiển, giới hạn độ dài; thay bằng `replaceText` với chuỗi đã escape ký tự regex (vì `$1`, `\` trong tên khách có thể làm hỏng kết quả).
- Mẫu chỉ nhận link/ID Docs mà tài khoản chủ app mở được; kiểm tra khi lưu cấu hình.
- Hợp đồng sau khi chuyển *Đang hiệu lực* không cho sửa số tiền, muốn đổi phải tạo phụ lục/nhân bản (tránh sửa lén).

## 5. Kế hoạch theo giai đoạn

Mỗi giai đoạn tự chạy được và có thể triển khai riêng; sau mỗi giai đoạn chạy `node dev/kiem-tra.js`, `node dev/kiem-tra-html.js` và thử trên link `/dev` thật của Google.

| GĐ | Nội dung | Kết quả nghiệm thu |
|---|---|---|
| **0. Chốt yêu cầu** | Bạn trả lời phần 8; gửi 1–2 hợp đồng mẫu đang dùng thật | Có file Docs mẫu đầu tiên với biến |
| **1. Nền dữ liệu** | Thêm `HopDong`, `HopDongCT`, `MauHopDong`, cột mới của `KhachHang`; `SCHEMA='3'`; hàm `layHopDong/luuHopDong/xoaHopDong` (kiểm tra, tính tiền, đánh số, nhật ký); hàm đọc số thành chữ tiếng Việt | Test: lưu hợp đồng đúng tiền/VAT/bằng chữ; sai quyền bị chặn; nâng cấp từ bản cũ không mất dữ liệu |
| **2. Giao diện danh sách + form** | Menu Hợp đồng, bảng danh sách có lọc, form 4 phần, tính tiền/bằng chữ trực tiếp, chưa sinh file | Lập, sửa, xóa hợp đồng chạy trên bản thử máy (`chay-thu.js`) cả 2 cửa hàng |
| **3. Sinh file từ mẫu Docs** | Màn hình *Mẫu hợp đồng*; `taoFileHopDong_` (copy → thay biến → chèn bảng hàng → lưu link); nút *Mở file* và *Tải PDF*; thêm giả lập `DriveApp/DocumentApp` vào `dev/chay-thu.js` để test | Hợp đồng ra file đúng mẫu, đủ biến, bảng hàng đúng; chạy thật trên `/dev` ra file mở được |
| **4. Quy trình liên thông** | *Tạo từ đơn hàng*, *Nhân bản*, *Tạo hàng loạt* (chạy tuần tự từng hợp đồng, tối đa ~15/lượt để không vượt giới hạn 6 phút của Apps Script, có thanh tiến độ và báo lỗi từng mã) | Hàng loạt 10 hợp đồng ra đủ 10 file; lỗi 1 hợp đồng không làm hỏng các hợp đồng khác |
| **5. Theo dõi hạn** | Trạng thái màu, trang *Sắp hết hạn*, số đếm menu, thẻ trên Tổng quan; (tùy chọn) email nhắc hằng ngày cho quản trị bằng trigger theo giờ | Hợp đồng hết hạn trong 30 ngày hiện đúng; email gửi đúng 1 lần/ngày |
| **6. Hoàn thiện** | Cập nhật `HUONG_DAN.md`, mở rộng `dev/kiem-tra.js`, kiểm thử tay trên điện thoại, triển khai bản mới giữ nguyên link | Checklist phần 6 đạt hết |

Ước lượng thô: GĐ1–2 khoảng 1 phiên làm việc, GĐ3 một phiên (khó nhất vì phải thử trên Google thật), GĐ4–6 một phiên.

## 6. Kiểm thử

- **Tự động** (`dev/kiem-tra.js`): tính tiền/VAT/bằng chữ (0, số lẻ, hàng tỷ), đánh số theo năm, phân quyền, tách 2 cửa hàng, nhân bản/hàng loạt, tính hạn ("sắp hết hạn" ở biên 30 ngày, qua ngày), nâng cấp `SCHEMA` từ bản cũ.
- **Giao diện** (`dev/kiem-tra-html.js`): bắt lỗi Apps Script cắt chuỗi sau `//` trong template string — lỗi này đã từng làm trang trắng.
- **Trên Google thật** (`/dev`): mở file sinh ra, kiểm tra từng biến đã được thay, bảng hàng đúng, PDF tải được, tiếng Việt có dấu không lỗi font.
- **Tay trên điện thoại** vì app dùng cho cửa hàng.

## 7. Rủi ro và điểm cần lưu ý

| | Rủi ro | Cách xử lý |
|---|---|---|
| R1 | Dùng `DriveApp/DocumentApp` cần thêm quyền; web app đã triển khai sẽ lỗi cho tới khi **chủ script cấp quyền lại** | Hướng dẫn 1 lần: chạy hàm `caiDat` trong trình soạn thảo, bấm *Cho phép*, rồi triển khai phiên bản mới. Ghi vào `HUONG_DAN.md` |
| R2 | Giới hạn thời gian 6 phút, mỗi file Docs mất vài giây | Hàng loạt chạy từng hợp đồng một từ trình duyệt, có giới hạn lượt |
| R3 | Mẫu Docs bị sửa làm mất biến | Kiểm tra mẫu khi lưu và khi tạo, báo rõ biến nào thiếu/không nhận ra |
| R4 | File Drive nằm trong Drive của chủ app, nhân viên không mở được | Tải PDF trong app; thư mục riêng `Hợp đồng - <cửa hàng>` tự tạo |
| R5 | Hợp đồng chứa thông tin khách PCCC | Không đưa dữ liệu thật vào repo (đã có `du-lieu/` trong `.gitignore`) |
| R6 | Mẫu pháp lý (điều khoản, thuế) | App chỉ điền dữ liệu; nội dung điều khoản do bạn/luật sư soạn trong Docs. Tôi không soạn điều khoản pháp lý thay bạn |
| R7 | Video không có lời nói, tôi chỉ suy ra từ hình | Phần 8 hỏi lại những chỗ chưa chắc |

## 8. Cần bạn quyết định trước khi làm

1. **Cách sinh file**: A (Google Docs mẫu, như video, khuyến nghị) hay B (in HTML trong app)?
2. **Áp dụng cho cửa hàng nào**: cả `phuonghihi` (iPhone) và PCCC, hay chỉ PCCC (bán B2B, thường cần hợp đồng)? Mỗi cửa hàng sẽ có bộ mẫu riêng.
3. **Loại hợp đồng cần có**: ngoài *mua bán* và *nguyên tắc* như video, bạn cần thêm loại nào (thi công lắp đặt PCCC, bảo trì, đại lý…)?
4. **Bên A/bên B**: để khách là bên A và cửa hàng là bên B như video có đúng ý bạn không, hay ngược lại?
5. **Đánh số**: `001-2026/HD` (đồng bộ chứng từ khác) hay `HD-001/2026`?
6. **Nhắc hạn**: chỉ hiện trong app, hay thêm email nhắc hằng ngày cho quản trị (cần quyền gửi mail)?
7. **Mẫu thật**: bạn có sẵn file Word/Docs hợp đồng đang dùng không? Gửi lên (đã xóa thông tin nhạy cảm) để tôi dựng danh sách biến chính xác.

## 9. Hướng dẫn sử dụng sau khi xong (bản tóm tắt cho người dùng cuối)

1. Quản trị: **Cài đặt → Mẫu hợp đồng** → dán link Google Docs mẫu cho từng loại (mẫu có `{{BIẾN}}` và `{{BANGHANG}}`).
2. **Hợp đồng → Lập hợp đồng**, hoặc mở một **Đơn hàng → Tạo hợp đồng**.
3. Chọn loại, chọn khách (tự điền), kiểm tra bảng hàng, điền ngày hiệu lực/hết hạn, người phụ trách → **Tạo hợp đồng**.
4. Bấm **Tải PDF** gửi khách; đổi trạng thái *Đang hiệu lực* khi hai bên ký.
5. Theo dõi ở mục **Sắp hết hạn**; cần ra nhiều hợp đồng cùng loại thì dùng **Tạo hàng loạt**.
