# Báo cáo sửa lỗi theo bản kiểm toán ngày 14/10/2026

Đã kiểm tra từng lỗi trong báo cáo kiểm toán trên mã nguồn thật (commit `4264c97`). Lỗi nào đúng thì đã sửa và viết test cho nó. Lỗi nào báo cáo nói quá hoặc thực ra là chuyện thiết kế thì ghi rõ bên dưới.

## 1. Đã sửa

| # | Lỗi | Kết luận | Đã làm |
|---|---|---|---|
| BUG-01 | App: tra bảo hành theo tên khách bị nuốt dấu cách | **Đúng.** Gõ "Minh Anh" thì app gửi "MINHANH", tìm không ra khách "Anh Minh". | Ô tra giữ dấu cách khi gõ tên nhiều từ. IMEI, serial, số điện thoại vẫn được bỏ cách như cũ. |
| BUG-02 | Khách trả một phần đơn có giảm giá thì món còn lại thành 0 đ | **Đúng.** Ví dụ máy 30tr + ốp 500k, giảm 600k: khách trả máy thì đơn còn 0 đ và được hoàn đủ 29,9tr. | Giảm giá được chia theo tiền hàng, nên trong ví dụ này đơn còn 490.164 đ và hoàn tối đa 29.409.836 đ. Cột GiamGia của đơn cũng được cập nhật theo. |
| BUG-03A | Máy cũ cùng tên nhưng giá thu khác nhau thì lãi bị sai | **Đúng.** | Máy có IMEI giờ tính **giá vốn đích danh**: giá nhập của chính máy đó cộng phiếu chi "Làm lại máy cũ" của máy đó. |
| BUG-03B | Nhập hàng tháng sau làm thay đổi lãi các tháng trước | **Đúng.** | Hàng không có IMEI (phụ kiện) tính bình quân **chỉ gồm các lần nhập đến ngày bán**. |
| BUG-03C | Máy cũ đã trả lại khách vẫn bị tính vào bình quân | **Đúng**, nhưng ảnh hưởng nhỏ. | Phiếu nhập của máy cũ đã trả lại khách không còn được tính vào bình quân. |
| BUG-05 | Hợp đồng lập từ đơn bị mất giảm giá và để trống IMEI | **Đúng.** | Hợp đồng tự điền IMEI các máy đã giao và thêm một dòng "Giảm giá" (đơn giá âm), nên tổng hợp đồng bằng tổng đơn. |
| BUG-06 (phần 1) | Nợ nhà cung cấp bị tách thành 2 dòng khi viết khác chữ hoa/thường | **Đúng.** | Tên nhà cung cấp được gom không phân biệt hoa/thường và khoảng trắng thừa. Danh sách gợi ý tên cũng được bỏ trùng. |
| BUG-04 (phần 1) | 4 thao tác ghi trên app chưa chống ghi trùng khi mạng chập chờn | **Đúng.** | Trả hàng, lập phiếu chi, nhận máy sửa và trả máy sửa giờ gửi kèm mã lần gửi như Bán nhanh. Bấm lại sau lỗi mạng không tạo phiếu thứ hai. |

**Thay đổi số liệu bạn sẽ thấy:**
- Báo cáo lợi nhuận tính lại cả các tháng cũ theo giá vốn đích danh, nên số lãi cũ có thể thay đổi. Số mới mới là số đúng.
- Màn chi tiết đơn trên web cũng hiện lãi theo cùng cách tính.

## 2. Không sửa: báo cáo nói quá

- **BUG-04 (phần 2), "app hiện tồn kho, doanh thu cũ sau khi trả hàng":** chỉ đúng một phần. Mỗi lần quay lại màn hình, app tự tải số mới, và máy chủ đã xóa kết quả nhớ sau khi ghi. Số cũ chỉ hiện chừng 1 giây rồi tự đổi, nên không cần sửa.
- **Mã code trích dẫn trong báo cáo** (ví dụ `hdTuDon`) không khớp hẳn với mã thật. Kết luận thì vẫn đúng.
- **"499/500 kịch bản fuzzing lệch"** là số tự sinh từ một kịch bản ngẫu nhiên. Đó không phải số liệu thật của cửa hàng.

## 3. Cần bạn quyết định

1. **Chia giảm giá khi khách trả một phần (BUG-02).** Hiện đã làm: giảm giá **chia theo tiền hàng**. Cách khác là khách trả món chính thì **mất toàn bộ giảm giá**, và món còn lại tính giá gốc 500k. Bạn muốn cách nào?
2. **Hợp đồng từ đơn có giảm giá (BUG-05).** Hiện đã làm: thêm dòng "Giảm giá" với đơn giá âm. Hợp đồng in ra sẽ có dòng `Giảm giá | 1 | -1.000.000`. Cách khác là thêm hẳn cột "Giảm giá" vào hợp đồng và mẫu Google Docs (sửa nhiều hơn). Dòng âm như hiện tại có ổn không?
3. **"Trả góp", "Quẹt thẻ" đang cộng thẳng vào "Tiền trong ngân hàng" (BUG-06, phần 2).** Đây là thiết kế có chủ ý, không phải lỗi: mọi hình thức khác "Tiền mặt" đều tính là ngân hàng. Nếu bạn có bán trả góp qua công ty tài chính hoặc quẹt thẻ mất phí, có thể làm thêm quỹ "Chờ giải ngân" và trừ phí POS. Bạn có cần không?
4. **Tính năng mới trong mục 4 của báo cáo** (đây là đề xuất, không phải lỗi). Bạn chọn cái nào cần làm:
   - Thanh toán kết hợp tiền mặt + chuyển khoản trong một lần Bán nhanh.
   - Sửa chữa có thay linh kiện thì trừ kho và tính giá vốn linh kiện.
   - Xem ảnh máy sửa và xuất PDF phiếu nhận máy ngay trên app.
   - Kiểm kho trên app: lưu tạm danh sách đã quét, xóa từng mã quét nhầm, hỏi lại trước khi bấm "Làm lại".
   - Thu mua máy cũ lẻ (khách bán đứt lấy tiền, không mua máy mới).
   - Ô xác nhận bắt buộc "Đã thoát iCloud" khi thu máy cũ, và in tem dán lưng máy.

## 4. Kiểm thử đã chạy (tất cả đạt)

- `node dev/kiem-tra.js`: chạy cả bộ test máy chủ, API, tìm kiếm, HTML và dữ liệu thử.
- `node dev/kiem-tra-api.js`: có thêm test cho BUG-02, BUG-03A/B/C và dòng giảm giá của hợp đồng.
  - Đã thử chạy lại test BUG-02 trên mã cũ: test báo lỗi đúng như báo cáo kiểm toán mô tả (đơn còn 0 đ, hoàn 29,9tr).
- `node dev/kiem-trinh-duyet.js`: test trình duyệt cho web. Có thêm bước hợp đồng từ đơn có giảm giá + IMEI, và bước nợ nhà cung cấp viết khác hoa/thường.
- `node dev/kiem-trinh-duyet-app.js`: test app điện thoại (bản web). Có thêm bước tra bảo hành theo tên "Minh Anh".
- `mobile`: `npm run kiem-tra` (typecheck + 34 test) và lint đều sạch.
