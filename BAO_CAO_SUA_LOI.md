# Báo cáo sửa lỗi theo bản kiểm toán ngày 14/10/2026

Đã kiểm tra từng lỗi trong báo cáo kiểm toán trên mã nguồn thật (commit `4264c97`). Lỗi nào đúng thì đã sửa và viết test cho nó. Lỗi nào báo cáo nói quá hoặc thực ra là chuyện thiết kế thì ghi rõ bên dưới.

## 1. Đã sửa

| # | Lỗi | Kết luận | Đã làm |
|---|---|---|---|
| BUG-01 | App: tra bảo hành theo tên khách bị nuốt dấu cách | **Đúng.** Gõ "Minh Anh" thì app gửi "MINHANH", tìm không ra khách "Anh Minh". | Ô tra giữ dấu cách khi gõ tên nhiều từ. IMEI, serial, số điện thoại vẫn được bỏ cách như cũ. |
| BUG-02 | Khách trả một phần đơn có giảm giá thì món còn lại thành 0 đ | **Đúng.** Ví dụ máy 30tr + ốp 500k, giảm 600k: khách trả máy thì đơn còn 0 đ và được hoàn đủ 29,9tr. | Đợt 1 chia giảm giá theo tiền hàng; **đợt 2 theo lựa chọn của bạn: trả máy thì mất hết giảm giá** (ốp còn 500k, hoàn tối đa 29,4tr), chỉ trả phụ kiện thì vẫn chia theo tiền hàng. Cột GiamGia của đơn cập nhật theo. |
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

## 3. Quyết định của bạn và việc đã làm theo (đợt 2)

| Việc | Bạn chọn | Đã làm |
|---|---|---|
| Giảm giá khi khách trả một phần | Trả **máy** thì mất hết giảm giá | Trả máy: món còn lại tính giá gốc (máy 30tr + ốp 500k giảm 600k, trả máy → ốp còn 500k). Chỉ trả phụ kiện: giảm giá vẫn chia theo tiền hàng. |
| Hợp đồng từ đơn có giảm giá | Giữ dòng "Giảm giá" âm | Giữ nguyên như đợt 1. |
| Trả góp / quẹt thẻ | Thêm quỹ "Chờ giải ngân" + phí, tự cài | **Cài đặt → Thông tin cửa hàng → "Hình thức chờ giải ngân, % phí"** (mỗi dòng, vd `Trả góp, 0` / `Thẻ tín dụng, 1.8`). Tiền thu bằng các hình thức này vào quỹ **Chờ giải ngân**. Khi tiền về, bấm **Ghi nhận tiền về** (web: Sổ quỹ; app: Sổ quỹ): app gợi ý số thực nhận đã trừ % phí, sửa được theo sao kê; phần chênh tính là chi trong ngày. Chưa cài gì thì sổ quỹ chạy như cũ. |
| Thanh toán kết hợp | Làm | App **Bán nhanh → "+ Trả thêm hình thức khác"**: vd 10tr tiền mặt + phần còn lại chuyển khoản (mã QR đúng phần chuyển khoản). Mỗi hình thức một phiếu thu, sổ quỹ vào đúng quỹ. |
| Sửa chữa đầy đủ hơn | Làm | **Linh kiện thay lấy từ kho** (web và app): trả máy thì linh kiện xuất kho theo đơn dịch vụ, giá vốn tính vào lãi; bảo hành miễn phí cũng xuất kho (đơn 0 đ, lãi âm đúng giá vốn linh kiện). **App xem ảnh máy ngay** (bấm để xem to). **App gửi phiếu nhận máy PDF** qua Zalo… |
| Kiểm kho trên app | Làm | Danh sách mã đã quét **lưu trên máy** (thoát ra, tắt app vẫn còn), **bỏ từng mã quét nhầm**, "Làm lại" hỏi trước (báo cáo cũ nói thiếu chỗ này là sai: đã có hỏi từ trước). |
| Thu mua máy cũ lẻ, iCloud | Chưa chọn | Không làm. |

**Lưu ý khi triển khai đợt 2:** Sheet tự thêm trang `GiaiNgan` và cột `LinhKien` (trang Sửa chữa) ở lần mở đầu tiên, không cần chạy `caiDat`. Linh kiện xuất kho không chặn khi tồn = 0 (giống phiếu xuất hiện nay); app hiện số tồn khi chọn.

## 4. Kiểm thử đã chạy (tất cả đạt, cả đợt 1 và đợt 2)

- `node dev/kiem-tra.js`: chạy cả bộ test máy chủ, API, tìm kiếm, HTML và dữ liệu thử.
- `node dev/kiem-tra-api.js`: có thêm test cho BUG-02, BUG-03A/B/C và dòng giảm giá của hợp đồng.
  - Đã thử chạy lại test BUG-02 trên mã cũ: test báo lỗi đúng như báo cáo kiểm toán mô tả (đơn còn 0 đ, hoàn 29,9tr).
- `node dev/kiem-trinh-duyet.js`: test trình duyệt cho web. Có thêm bước hợp đồng từ đơn có giảm giá + IMEI, và bước nợ nhà cung cấp viết khác hoa/thường.
- `node dev/kiem-trinh-duyet-app.js`: test app điện thoại (bản web). Có thêm bước tra bảo hành theo tên "Minh Anh".
- `mobile`: `npm run kiem-tra` (typecheck + 34 test) và lint đều sạch.
- Đợt 2 thêm test: trả máy mất giảm giá, thanh toán kết hợp, quỹ chờ giải ngân (cài đặt, giải ngân trừ phí, xóa), linh kiện sửa chữa (xuất kho, lãi gộp, bảo hành 0 đ), xem ảnh, PDF phiếu nhận máy, kiểm kho lưu tạm / bỏ mã — cả máy chủ, web (trình duyệt) và app (bản web).
