# Báo cáo khảo sát thị trường và đề xuất cải tiến

Ngày làm: 05/10/2026. Phạm vi: phần mềm bán hàng cho cửa hàng điện thoại, phần mềm quản lý hợp đồng / hợp đồng điện tử, thói quen và nhu cầu của chủ cửa hàng, khách hàng và doanh nghiệp nhỏ tại Việt Nam, khung pháp lý liên quan.

> **Cách đọc:** mục 1 là kết luận, mục 5–6 là đối chiếu với app và quyết định làm gì, mục 7 là những gì đã làm (kèm giới hạn), mục 10 là nguồn. Mọi nhận định dựa trên tài liệu công khai của nhà cung cấp và bài viết chuyên ngành; tôi **không dùng thử** các phần mềm đối thủ nên không đánh giá được độ dễ dùng hay độ ổn định của họ.

## 1. Kết luận chính

1. **Phần mềm bán hàng cho cửa hàng điện thoại đã "phủ kín" các tính năng nền** (IMEI/serial, bảo hành, công nợ, báo cáo, kho). Phần app đã có ở mức tương đương cho một cửa hàng. Khoảng trống lớn so với đối thủ: **phiếu nhận máy sửa chữa**, **trả góp / thu cũ đổi mới như một nghiệp vụ**, **tem bảo hành / tra cứu bằng QR**, **điểm thưởng, hoa hồng nhân viên, hóa đơn điện tử**, **báo cáo gửi tự động**.
2. **Không đối thủ nào trong nhóm bán hàng (KiotViet, MISA eShop, Nhanh.vn, Tuki Mobile, CHViet) công bố tính năng tự động tạo hợp đồng từ mẫu.** Nhanh.vn chỉ nhắc "quản lý hợp đồng" trong nhóm dịch vụ mở rộng (thu cũ đổi mới, trả góp); CHViet có hợp đồng cầm đồ. Ngược lại, nhóm hợp đồng điện tử (VNPT, FPT, MISA WeSign, 1Office...) mạnh về ký số và quy trình nhưng **không gắn với kho, IMEI, công nợ của cửa hàng**. Đây là chỗ app có lợi thế: hợp đồng sinh thẳng từ đơn hàng, khách, hàng và IMEI.
3. **Điều doanh nghiệp nhỏ thật sự cần ở phần mềm hợp đồng** (theo phân tích dành cho SMB) là một kho tra cứu có 9 trường và cảnh báo đáng tin: đối tác, giá trị, ngày bắt đầu/kết thúc, **thời hạn báo trước (lưu bằng số) và ngày phải báo**, **trạng thái tự gia hạn và người phụ trách**, liên kết tài liệu, loại hợp đồng. Các thứ nặng (thư viện điều khoản, phê duyệt nhiều cấp, AI) bị đánh giá là thừa với đội nhỏ. App mới có cảnh báo theo ngày hết hạn, **chưa có thời hạn báo trước và tự gia hạn**.
4. **Thói quen khách hàng Việt Nam xoay quanh Zalo** (79,6 triệu người dùng thường xuyên mỗi tháng, hơn 2,1 tỷ tin nhắn mỗi ngày tính đến 12/2025) và chuyển khoản QR. Nhắc hạn, nhắc thanh toán nên đến khách qua Zalo; email chủ yếu hợp với doanh nghiệp và nội bộ chủ cửa hàng.
5. **Rủi ro pháp lý tập trung vào ba chỗ app có thể giúp được ngay:** (a) thu mua máy cũ (cần chứng minh "ngay tình": giấy tờ người bán, IMEI, cam kết nguồn gốc, lưu chứng từ); (b) trả góp trực tiếp với khách (tranh chấp khi máy lỗi, cần điều khoản bảo hành và lịch thanh toán rõ ràng); (c) dữ liệu cá nhân như số CCCD (cần thông báo mục đích và có sự đồng ý theo Nghị định 13/2023).

## 2. Phương pháp và giới hạn

- Tìm kiếm web bằng tiếng Việt và tiếng Anh, đọc trang giải pháp chính thức của KiotViet, Nhanh.vn, Tuki Mobile, CHViet, tài liệu hướng dẫn MISA eShop, các bài tổng hợp phần mềm hợp đồng điện tử, bài phân tích nhu cầu SMB, các bài về Zalo ZNS và các văn bản pháp luật liên quan.
- Giới hạn: tính năng lấy từ trang giới thiệu (có thể phóng đại hoặc thiếu), không có dữ liệu thị phần, giá của nhiều bên không công khai; công cụ tìm kiếm chỉ trả về tóm tắt. Một số trang (KiotViet, MISA eShop) **không nêu** trả góp, hợp đồng, in tem: điều đó có nghĩa là họ không công bố trên trang đó, không chắc là họ không có.
- Không có khảo sát trực tiếp người dùng. "Nhu cầu" ở mục 4 là tổng hợp từ bài viết và tài liệu nhà cung cấp, cần bạn xác nhận bằng thực tế cửa hàng.

## 3. Đối thủ

### 3.1 Phần mềm bán hàng cho cửa hàng điện thoại

| Phần mềm | Tính năng công bố liên quan | Ghi chú |
|---|---|---|
| **KiotViet** | Quản lý IMEI/serial (vòng đời từng máy, chống tráo hàng), khách hàng (lịch sử, công nợ, giá riêng), kho, **bảo hành chuỗi bán – đổi trả – bảo hành – sửa chữa** | Từ 8.000 đồng/ngày. Trang giải pháp không nêu trả góp, hợp đồng, in tem |
| **Nhanh.vn** | IMEI theo nhà cung cấp, ngày nhập/bán; **bảo hành có lý do, kỹ thuật viên, chi phí sửa, linh kiện thay**; cảnh báo tồn; bán theo IMEI, quà tặng kèm, **bảo hành mở rộng, trả góp, công nợ, hoa hồng nhân viên**; **thu cũ đổi mới, hợp đồng, công nợ trả góp theo đơn vị cung cấp**; **80 báo cáo**; đa kênh; hóa đơn điện tử; **chăm sóc tự động (sinh nhật, trạng thái bảo hành)** | Mạnh nhất về độ phủ, hướng chuỗi |
| **MISA eShop** | Hàng hóa theo IMEI/serial, tra cứu lịch sử mua và bảo hành, tích điểm, công nợ, báo cáo theo nhân viên và mặt hàng | Tài liệu ngành điện tử di động không nêu thu cũ, trả góp, hợp đồng, đặt cọc |
| **Tuki Mobile** (Samco Tech) | IMEI từng máy, **tem bảo hành điện tử**, **phiếu nhận máy sửa chữa**, công nợ khách và nhà cung cấp, lịch sử bảo hành | Bán license vĩnh viễn theo máy, không thuê bao |
| **CHViet** | Quét IMEI khi xuất kho; **thu cũ nhập kho**; **phiếu nhận máy ghi tình trạng, phụ kiện, kỹ thuật viên, linh kiện; bảo hành theo lỗi; mã QR cho khách tra tình trạng sửa**; **hợp đồng cầm đồ, trả góp qua đối tác tài chính**; chuyển/rút tiền hộ; sổ nợ; **điểm thưởng, hoa hồng**; đa chi nhánh; chấm công; **báo cáo cuối ngày gửi qua Telegram/Email** | Rất sát đặc thù tiệm điện thoại nhỏ |
| Pos365, PosApp, Uviboss, SoftPro, Ali... | Có trong kết quả tìm kiếm, tôi chưa đọc chi tiết | Không đưa vào so sánh |

### 3.2 Hợp đồng điện tử và quản lý hợp đồng tại Việt Nam

- Nhà cung cấp được nhắc nhiều: **VNPT eContract, FPT.eContract, MISA AMIS WeSign, 1Office, OnSign, Tenten eContract, C-Contract, EFY-eContract, iContract, MegaDoc**; ngoài ra EasyHRM, FastWork CRM, WPRO Contract, SlimCRM (gói thấp từ khoảng 499.000 đồng, theo bài tổng hợp).
- Tính năng chung: **ký bằng ảnh chữ ký, ảnh chữ ký xác thực OTP (SMS/email), chữ ký số USB token, chữ ký số từ xa, chứng thư dùng một lần**; quy trình phê duyệt tuần tự/song song và ủy quyền; kho lưu trữ và tra cứu; phân quyền và nhật ký thao tác; tích hợp HRM/CRM/ERP; **nhắc hạn, gia hạn, lập phụ lục nhanh** (EasyHRM); đối tác khách hàng không cần dùng phần mềm, chỉ ký qua email hoặc SMS (MISA WeSign).
- Điểm yếu đối với cửa hàng điện thoại: các hệ thống này **không biết hàng hóa, IMEI, kho, công nợ** của cửa hàng; mỗi hợp đồng phải nhập lại thông tin.

### 3.3 Quốc tế (tham chiếu về chuẩn tính năng)

- **PandaDoc** (xếp số 1 G2 mùa xuân 2026 cho SMB): soạn từ mẫu, ký điện tử, **theo dõi tài liệu đã được mở**, thu tiền cùng luồng.
- **Zoho Contracts** (khoảng 30 USD/người/tháng, có ký điện tử), Concord, ContractWorks, Juro, Agiloft: kho tập trung, **nhắc gia hạn tự động**, phiên bản, bình luận, báo cáo, **theo dõi mốc thanh toán**.
- Bài phân tích dành cho SMB: dưới khoảng 40 hợp đồng thì **bảng tính là đủ**; điều quan trọng nhất là **thời hạn báo trước lưu bằng số, tính ngày phải báo, và cảnh báo trên ngày đó** (công cụ chỉ cảnh báo theo ngày hết hạn sẽ trượt với hợp đồng tự gia hạn); thư viện điều khoản, phê duyệt nhiều cấp và AI là "thừa" với đội nhỏ; tránh mua công cụ soạn thảo khi vấn đề nằm ở **theo dõi sau ký**.

## 4. Nhu cầu và thói quen

### 4.1 Chủ cửa hàng điện thoại (tổng hợp từ tài liệu nhà cung cấp và bài tư vấn)
- Quên ghi sổ nợ và công nợ trả góp, không nắm số liệu khi vắng mặt; ghi tay dễ mất, dễ sai.
- Hàng nhỏ giá trị lớn: cần theo dõi đến từng IMEI để chống thất thoát và tráo hàng.
- Bảo hành khó theo dõi; muốn tra nhanh theo IMEI/SĐT/tên.
- Muốn thống kê thu chi, lãi lỗ chính xác và **báo cáo gửi sẵn cuối ngày** (CHViet làm qua Telegram/Email).
- Dịch vụ phụ quanh bán máy: **sửa chữa, thu cũ đổi mới, trả góp, cầm đồ** (các phần mềm chuyên ngành đều có).

### 4.2 Khách hàng
- **Zalo là kênh mặc định**: 79,6 triệu người dùng thường xuyên mỗi tháng. Zalo ZNS cho doanh nghiệp: tin thông báo khoảng 200 đồng/tin thành công, cần Zalo OA và mẫu tin được duyệt, **không được nhắc nợ nhiều lần**. Bán hàng nhỏ khó tích hợp ZNS ngay; cách thực dụng là nhân viên nhắn từ Zalo cá nhân/OA.
- Thanh toán bằng chuyển khoản/QR phổ biến (app đã in VietQR).
- Ký hợp đồng điện tử ở Việt Nam quen với **ký ảnh + OTP** (FPT, VNPT, MISA); khách cá nhân ở quầy thường ký ngay trên giấy hoặc màn hình.

### 4.3 Doanh nghiệp (bên mua theo hợp đồng nguyên tắc, đại lý)
- Cần **tra cứu hợp đồng**, **biết hạn và điều khoản báo trước**, **lịch thanh toán và công nợ theo đợt**, xuất **PDF** gửi đối tác.
- Quen **email** và file PDF/Word.

### 4.4 Khung pháp lý đáng chú ý
- **Luật Giao dịch điện tử 2023** (số 20/2023/QH15, hiệu lực 01/07/2024): chữ ký điện tử gồm chuyên dùng, số công cộng, số chuyên dùng công vụ; chữ ký điện tử chuyên dùng phải xác nhận được chủ thể ký, gắn duy nhất với nội dung, thuộc kiểm soát của người ký và **hiệu lực kiểm tra được theo điều kiện các bên thỏa thuận**. Hệ quả: một chữ ký ảnh tự vẽ **không tự động ngang chữ ký số**; giá trị phụ thuộc thỏa thuận và khả năng chứng minh.
- **Nghị định 13/2023/NĐ-CP** (dữ liệu cá nhân, hiệu lực 01/07/2023): trước khi xử lý (kể cả số CCCD) phải thông báo mục đích, loại dữ liệu, cách xử lý, bên liên quan và **có sự đồng ý**.
- **Mua máy cũ**: tội tiêu thụ tài sản do người khác phạm tội mà có chỉ bị truy cứu khi "biết rõ", nhưng nghi ngờ hợp lý (giá quá rẻ, không giấy tờ nguồn gốc) vẫn có rủi ro. Bài tư vấn khuyên giữ: hợp đồng mua bán ghi IMEI, model, tình trạng, giá; bản sao CCCD người bán; phiếu kiểm tra IMEI; chứng từ lưu lâu dài (nhắc 10 năm theo Luật Kế toán); giao dịch trên 20 triệu nên lập văn bản có chữ ký hai bên.
- **Trả góp**: tranh chấp thường là máy lỗi mà vẫn đòi trả tiếp; nên có điều khoản bảo hành, xử lý lỗi, lịch thanh toán, chậm trả.
- **Hộ kinh doanh**: từ 01/06/2025 hộ doanh thu từ 1 tỷ đồng/năm bán lẻ phải dùng **hóa đơn điện tử khởi tạo từ máy tính tiền** (Nghị định 70/2025); **Thông tư 152/2025** quy định sổ sách. App đã in sổ doanh thu S1a-HKD; **chưa xuất hóa đơn điện tử**.

## 5. Đối chiếu app (sau GĐ0–6, trước đợt cải tiến này)

| Nhu cầu / tính năng thị trường | App trước đợt này |
|---|---|
| IMEI/serial, bảo hành, công nợ, kho, báo cáo, sổ doanh thu | **Có** |
| Hợp đồng sinh từ mẫu, nhiều loại hợp đồng điện thoại, PDF, hàng loạt, nhắc hạn trong app | **Có** (lợi thế so với nhóm bán hàng) |
| Thời hạn báo trước, tự gia hạn, gia hạn một chạm | Thiếu |
| Nhắc khách qua Zalo/email | Thiếu (chỉ có cảnh báo trong app) |
| Lịch thanh toán / trả góp theo đợt, nối với phiếu thu và công nợ | Thiếu |
| Lịch sử thay đổi của từng hợp đồng | Có nhật ký chung, không xem theo hợp đồng |
| IMEI trong hợp đồng, CCCD bên A, điều khoản đồng ý dữ liệu cá nhân | Thiếu |
| Ký điện tử | Thiếu |
| Báo cáo/nhắc việc gửi tự động | Thiếu |
| Phiếu nhận máy sửa chữa, tem bảo hành/QR tra cứu, điểm thưởng, hoa hồng nhân viên | Thiếu |
| Hóa đơn điện tử, tích hợp Zalo ZNS, ký số USB token/OTP | Thiếu, ngoài phạm vi hiện tại |

## 6. Đề xuất, ưu tiên và quyết định

Tiêu chí: có bằng chứng nhu cầu ở mục 3–4, công sức, rủi ro (quyền mới, pháp lý, độ phức tạp), và việc có kiểm thử được trong môi trường làm việc không. Bạn đã giao quyền quyết định nên tôi làm luôn các mục "Làm".

| # | Tính năng | Bằng chứng nhu cầu | Quyết định |
|---|---|---|---|
| 1 | **Thời hạn báo trước + tự gia hạn + Gia hạn một chạm** | Nhu cầu số 1 của SMB về hợp đồng; EasyHRM có gia hạn nhanh | **Làm** |
| 2 | **Nhắc khách qua Zalo / email bằng một chạm** (tin soạn sẵn, mở Zalo của khách, mở email) | Zalo là kênh mặc định; ZNS tích hợp nặng; không cần quyền mới | **Làm** |
| 3 | **Lịch thanh toán / trả góp** (tạo lịch, ghi nhận thu thành phiếu thu, màn hình đợt đến hạn, mẫu "mua bán trả góp") | Nhanh.vn, CHViet có trả góp; CLM có theo dõi mốc thanh toán; tranh chấp trả góp | **Làm** |
| 4 | **Lịch sử thay đổi theo hợp đồng** | Kiểm soát phiên bản/nhật ký là tính năng chuẩn của CLM | **Làm** |
| 5 | **IMEI trong hợp đồng, CCCD bên A, điều khoản đồng ý dữ liệu cá nhân** | Thu cũ cần chứng cứ ngay tình; NĐ 13/2023 | **Làm** |
| 6 | **Ký tại quầy** (chữ ký tay trên màn hình, gắn thời điểm, mã xác thực, chèn vào file và PDF, khóa nội dung sau ký) | Mọi eContract Việt Nam có ký ảnh; khách cá nhân ký ngay tại quầy | **Làm**, kèm cảnh báo pháp lý |
| 7 | **Nhắc việc hằng ngày qua email cho chủ** (hợp đồng, đợt thanh toán, nợ, hàng sắp hết) | CHViet gửi báo cáo ngày; CLM nhắc tự động | **Làm**, tùy chọn, cần quyền mới |
| 8 | Phiếu nhận máy sửa chữa + QR tra cứu tình trạng | Nhanh.vn, Tuki, CHViet đều có; là nghiệp vụ lớn | Chưa làm: cần mô-đun riêng (đề xuất bước tiếp theo) |
| 9 | Tem bảo hành điện tử / QR tra cứu bảo hành | Tuki, CHViet | Chưa làm: phụ thuộc mục 8 |
| 10 | Điểm thưởng, hoa hồng nhân viên, chấm công | CHViet, MISA eShop | Chưa làm: ngoài phạm vi hợp đồng |
| 11 | Hóa đơn điện tử máy tính tiền | Nghị định 70/2025 | Không làm: cần kết nối nhà cung cấp hóa đơn được cấp phép |
| 12 | Zalo ZNS tự động | Zalo | Không làm: cần OA, mẫu tin được duyệt, trả phí; tính năng 2 là bước đệm |
| 13 | Ký số (USB token, OTP, chứng thư) | Luật GDĐT 2023 | Không làm: cần nhà cung cấp chứng thư; hợp đồng giá trị lớn nên dùng dịch vụ ký số |
| 14 | Phê duyệt nhiều cấp, thư viện điều khoản, AI đọc hợp đồng | Phân tích SMB xếp là "thừa" | Không làm |
| 15 | Cầm đồ, chuyển/rút tiền hộ | Chỉ CHViet | Không làm: ngoài đối tượng khách hàng |

## 7. Đã làm

Bảy tính năng ở mục 6 được làm trong **4 commit** (mỗi commit đã chạy đủ bộ kiểm tra trước khi đẩy lên). Cách dùng chi tiết nằm ở `HUONG_DAN.md`, mục "Tính năng thêm sau khảo sát thị trường" và "Email tổng hợp mỗi sáng".

| Commit | Tính năng (số ở mục 6) | Dùng thế nào | Giới hạn đã biết |
|---|---|---|---|
| Cải tiến 1 | **1** Báo trước + tự gia hạn + gia hạn một chạm · **2** Nhắc khách Zalo/email · **4** Lịch sử theo hợp đồng · **5** IMEI, CCCD, đồng ý dữ liệu cá nhân | Ô *Báo trước (ngày)* (mặc định 30), *Tự động gia hạn*, *Mỗi lần gia hạn (tháng)*; danh sách và Tổng quan hiện **hạn phải quyết định** và nhắc sớm hơn (báo trước + 14 ngày); nút **Gia hạn** chọn số tháng rồi một chạm; nút **Nhắc khách** soạn tin để mở Zalo hoặc email; cột IMEI trong bảng hàng; ô CCCD/ngày cấp; thẻ *Lịch sử thay đổi* | App **không tự gửi** gì cho khách (cố ý, xem mục 4.2). Tự gia hạn chỉ là thông tin trong hợp đồng và cách tính cảnh báo: app **không tự đổi ngày hết hạn**, người dùng bấm Gia hạn. Số CCCD là dữ liệu nhạy cảm: chỉ ghi khi cần và phải xin đồng ý |
| Cải tiến 2 | **3** Lịch thanh toán / trả góp | Mục *4. Lịch thanh toán*: trả trước + số kỳ + chu kỳ → **Tạo lịch trả góp đều**; hợp đồng gắn đơn hàng thì nút **Thu** từng đợt tạo phiếu thu theo đơn (công nợ tự giảm); menu **Lịch thanh toán** + thẻ Tổng quan cho đợt quá hạn hoặc đến hạn trong 7 ngày; mẫu thứ 6 *Hợp đồng mua bán trả góp* | Trả góp trực tiếp **không tính lãi, phạt chậm trả, không nối đối tác tài chính**. Tối đa 36 đợt/hợp đồng. Hợp đồng đã ký thì đổi lịch chưa thu phải hủy chữ ký trước |
| Cải tiến 3 | **6** Ký tại quầy | Sau khi Tạo file (còn mới): **Ký tại quầy** → khách ký trên khung, tick đồng ý → ghi người ký, thời điểm, mã xác thực SHA-256 → chèn hình chữ ký và dòng xác thực vào Docs/PDF → hợp đồng thành *Đang hiệu lực* và **khóa nội dung** (cả quản trị). *Kiểm tra chữ ký* phát hiện sửa sau khi ký; *Hủy chữ ký* (quản trị) để sửa và ký lại | **Không phải chữ ký số** của nhà cung cấp được cấp phép và **không xác thực danh tính** người ký (không OTP, không giấy tờ). Giá trị chỉ dựa trên thỏa thuận của hai bên đã ghi trong hợp đồng (mẫu có điều khoản này). Ảnh chữ ký lưu trong thư mục Drive của cửa hàng. Quản trị có thể hủy chữ ký (có ghi nhật ký) |
| Cải tiến 4 | **7** Email tổng hợp mỗi sáng | *Cài đặt → Email tổng hợp mỗi sáng*: bật, chọn giờ, email nhận; **Gửi thư thử ngay**. Thư gồm hợp đồng sắp/quá hạn và hạn báo trước, đợt thanh toán cần thu, đơn quá hạn giao, hàng sắp hết, khách còn nợ, doanh số và tiền thu hôm qua. Không có việc thì không gửi; mỗi ngày tối đa một thư | Cần quyền **gửi email** và **hẹn giờ** (cấp bằng cách chạy lại `caiDat`); Google gửi trong khoảng một giờ quanh giờ đã chọn; thư chứa tên và số điện thoại khách còn nợ nên chỉ gửi cho người trong cửa hàng; chỉ có một bộ hẹn giờ (đủ cho một cửa hàng). Không gửi cho khách |

**Cách đã kiểm thử.** Mỗi tính năng có test máy chủ (`node dev/kiem-tra.js`) và test giao diện trên Chromium (`NODE_PATH=$(npm root -g) node dev/kiem-trinh-duyet.js`) chạy trên **bản giả lập Google Sheet, Docs, Drive, MailApp, ScriptApp**. Một số điểm đáng nói:
- Các hàm tính hạn và tình trạng đợt được viết hai lần (máy chủ và giao diện) nên có test **đối chiếu hai bản cho cùng đầu vào**; số thành chữ so với 3.000 số ngẫu nhiên.
- Công nợ, hạn hợp đồng, hàng sắp hết trong email sáng được đối chiếu với cách màn hình Tổng quan tính.
- Chữ ký: ảnh PNG thử được sinh đúng chuẩn; thử ảnh trống, sai định dạng, quá lớn, ký hai lần, sửa nội dung sau khi ký, sửa ảnh/Sheet sau khi ký (phải bị phát hiện), hủy rồi ký lại.
- Sau khi viết test tôi **cố ý làm hỏng code** (bỏ kiểm tra, đổi điều kiện, bỏ chống chèn HTML...) để chắc test bắt được; một chỗ lọt (đơn "Giao một phần" quá hạn) đã bổ sung test.
- Ảnh chụp màn hình các bước chính đã được xem lại bằng mắt (khung ký, thẻ đã ký, thẻ email sáng, màn hình điện thoại không tràn ngang).
- **Chưa kiểm thử trên Google thật:** toàn bộ phần Docs/Drive/Mail/hẹn giờ. Mô phỏng chỉ đúng với hiểu biết của tôi về hành vi các API đó (xem mục 9).

## 8. Chưa làm và gợi ý bước tiếp theo

Theo thứ tự tôi đề xuất, dựa trên bằng chứng nhu cầu ở mục 3–4:
1. **Phiếu nhận máy sửa chữa + mã QR cho khách tra tình trạng** (mục 8 của bảng đề xuất): đối thủ nào làm hợp đồng dịch vụ cũng có; đây là nghiệp vụ lớn (trạng thái sửa, kỹ thuật viên, linh kiện, chi phí) nên cần mô-đun riêng. Mẫu "dịch vụ sửa chữa – bảo hành" hiện chỉ là hợp đồng, chưa có phiếu theo dõi.
2. **Trả góp có lãi, phạt chậm trả và theo dõi đối tác tài chính** nếu cửa hàng thực sự bán trả góp lớn; hiện chỉ có trả góp trực tiếp không lãi.
3. **Thu cũ đổi mới như một nghiệp vụ**: định giá máy cũ, lưu ảnh giấy tờ người bán và kết quả kiểm tra IMEI vào hồ sơ (hiện có mẫu hợp đồng và ô IMEI/CCCD, chưa có quy trình).
4. **Tem bảo hành điện tử / QR tra cứu bảo hành** cho khách (phụ thuộc mục 1).
5. **Điểm thưởng, hoa hồng nhân viên, chấm công**: ngoài phạm vi hợp đồng, chỉ làm nếu bạn thấy cần.
6. **Zalo ZNS tự động**: cần Zalo OA, mẫu tin được duyệt, trả phí; tính năng *Nhắc khách* là bước đệm.
7. **Hóa đơn điện tử máy tính tiền** (Nghị định 70/2025): chỉ cần khi hộ kinh doanh doanh thu từ 1 tỷ đồng/năm; phải nối nhà cung cấp hóa đơn được cấp phép.
8. **Ký số thật (OTP, USB token, chứng thư)** qua nhà cung cấp: dùng khi hợp đồng giá trị lớn hoặc đối tác doanh nghiệp yêu cầu.
9. Hệ thống **đại lý / nhiều cửa hàng**: mã nguồn đã hỗ trợ nhiều cửa hàng, nhưng email sáng hiện chỉ dùng một bộ hẹn giờ chung.
Không đề xuất làm: phê duyệt nhiều cấp, thư viện điều khoản, AI đọc hợp đồng, cầm đồ, chuyển/rút tiền hộ (mục 6).

## 9. Rủi ro và việc cần bạn kiểm tra

**Việc nên làm trước khi dùng thật (theo thứ tự):**
1. Dán `Code.gs`, `HopDong.gs`, **`EmailSang.gs` (tệp mới)**, `Index.html`, chạy `caiDat`, bấm **Cho phép** các quyền mới (Docs, Drive, gửi email, hẹn giờ). Hoặc `node dev/trien-khai.js`.
2. Chạy hàm **`kiemTraTaoHopDong`**: Nhật ký thực thi phải ghi **TẤT CẢ ĐẠT**. Phần này kiểm tra cả chèn hình chữ ký vào file. Có dòng LỖI thì chép nhật ký lại.
3. **Thử trên link `/dev`** (Thử nghiệm các lần triển khai) trước khi triển khai: Apps Script xử lý `Index.html` khác trình duyệt thường.
4. Lập một hợp đồng thử → Tạo file → mở Google Docs xem định dạng, bảng hàng, hình chữ ký → Tải PDF → thử **Ký tại quầy** trên điện thoại hoặc máy tính bảng thật (cảm ứng, kích thước khung ký).
5. *Cài đặt → Email tổng hợp mỗi sáng*: bật và bấm **Gửi thư thử ngay**, kiểm tra thư (cả mục Spam); hôm sau xem thư sáng có đến đúng giờ không.
6. **Nhờ luật sư rà soát** 6 mẫu hợp đồng, điều khoản ký điện tử, điều khoản trả góp (lãi/phạt/giữ quyền sở hữu), điều khoản đồng ý xử lý dữ liệu cá nhân và việc thu CCCD. Các mẫu chỉ là khung tham khảo.

**Rủi ro và giới hạn tôi biết:**
- **Chưa thử trên Google thật.** Tôi không có quyền truy cập Google trong môi trường làm việc nên Docs, Drive, MailApp, ScriptApp chỉ được thử trên bản giả lập do tôi viết. Rủi ro lớn nhất nằm ở chỗ này: hành vi thật của `replaceText`, chèn ảnh trong ô bảng, xuất PDF, `Session.getEffectiveUser()`, bộ hẹn giờ có thể khác điều tôi hiểu. Hàm `kiemTraTaoHopDong` và nút *Gửi thư thử* tồn tại để bạn kiểm tra nhanh.
- **Quyền mới.** Lần đầu sau khi cập nhật, nếu chưa cấp quyền thì tạo file hợp đồng và email sáng sẽ báo lỗi kèm cách xử lý. Tôi **chưa kiểm chứng** việc phần còn lại của app có chạy bình thường khi chưa cấp quyền mới hay không, nên đã bỏ câu khẳng định đó khỏi hướng dẫn: hãy cấp quyền ngay khi cập nhật.
- **Chữ ký điện tử**: xem giới hạn pháp lý ở mục 7. Quản trị hủy được chữ ký (có nhật ký); dữ liệu Sheet/Drive vẫn có thể bị chủ file sửa trực tiếp, `Kiểm tra chữ ký` chỉ **phát hiện** chứ không ngăn được.
- **Dữ liệu cá nhân**: số CCCD, tên và SĐT khách trong Sheet, file Docs, ảnh chữ ký và (tên, SĐT khách còn nợ) trong email sáng. Chỉ chia sẻ Sheet và thư mục Drive cho người cần; xin đồng ý của khách khi ghi CCCD.
- **Xóa cửa hàng PCCC là không hoàn tác trong app** (khôi phục bằng lịch sử phiên bản của Google Sheet). File `du-lieu/DuLieu.xlsx` trong repo **vẫn còn dữ liệu khách PCCC**: nên xóa các trang `PCCC_…` hoặc bỏ file khỏi repo và đừng chia sẻ công khai.
- `dev/trien-khai.js` chưa chạy thử được vì môi trường làm việc không có `clasp`.
- Hạn mức Google: email 100 thư/ngày với tài khoản thường (dùng 1 thư/ngày), thời gian chạy hẹn giờ có hạn mức mỗi ngày (mỗi lần gửi chỉ vài giây). Sheet lớn (hàng chục nghìn dòng) sẽ chậm vì app đọc cả trang tính mỗi lần gọi.
- Hàm `guiEmailSang` là hàm công khai của web app (ai có link gọi được); đã chặn: chỉ chạy khi do bộ hẹn giờ gọi, mỗi ngày tối đa một thư, không trả dữ liệu. Chưa kiểm chứng trường hợp Google đổi dạng đối tượng sự kiện của bộ hẹn giờ (nếu thư sáng không đến sau khi bật, đây là chỗ nên xem đầu tiên).
- **Về bản khảo sát**: dựa trên tài liệu công khai, không dùng thử đối thủ, không khảo sát người dùng thật (mục 2). Ưu tiên ở mục 6 là nhận định của tôi: hãy đối chiếu với thực tế cửa hàng của bạn (khách có thật sự trả góp không, có nhận sửa chữa không...) trước khi đầu tư thêm.

## 10. Nguồn

Phần mềm bán hàng điện thoại
- [KiotViet – giải pháp quản lý cửa hàng điện thoại](https://www.kiotviet.vn/giai-phap-quan-ly-cua-hang-dien-thoai/) · [KiotViet – hướng dẫn hàng serial/IMEI](https://www.kiotviet.vn/huong-dan-su-dung-kiotviet/huong-dan-hang-hoa/hang-hoa-serial-imei/)
- [Nhanh.vn – quản lý cửa hàng điện thoại, điện máy](https://nhanh.vn/quan-ly-chuoi-cua-hang-dien-may)
- [MISA eShop – ngành điện tử di động (tài liệu hướng dẫn)](https://helpeshop.misa.vn/v1/dien-tu-di-dong)
- [Tuki Mobile – Samco Tech](https://samcotech.com.vn/san-pham/tuki-mobile/) · [CHViet](https://chviet.com/)
- [Tổng hợp phần mềm quản lý cửa hàng điện thoại – Pos365](https://www.pos365.vn/phan-mem-quan-ly-cua-hang-dien-thoai-6756.html)

Hợp đồng và hợp đồng điện tử
- [Top phần mềm hợp đồng điện tử – 1Office](https://1office.vn/phan-mem-hop-dong-dien-tu) · [EasyHRM – phần mềm hợp đồng điện tử](https://easyhrm.vn/phan-mem-hop-dong-dien-tu/) · [Bitrix24 – phần mềm quản lý hợp đồng](https://www.bitrix24.vn/articles/best-contract-management-software.php)
- [MISA AMIS – các cách ký hợp đồng online](https://amis.misa.vn/105371/cach-ky-hop-dong-online/) · [MISA AMIS WeSign](https://amis.misa.vn/amis-wesign/) · [FPT.eContract – ký tài liệu](https://econtract.fpt.com.vn/bai-huong-dan/ky-tai-lieu/) · [VNPT eContract – bảng giá](https://vnptgroup.vn/bang-gia-hop-dong-dien-tu-vnpt-econtract/)
- [PandaDoc – G2 mùa xuân 2026](https://www.pandadoc.com/blog/number-one-contract-management-software-smb-g2-spring-2026/) · [Geekflare – 14 phần mềm quản lý hợp đồng 2026](https://geekflare.com/software/best-contract-management-software/)
- [SwotBee – SMB thật sự cần gì ở phần mềm hợp đồng](https://swotbee.com/posts/contract-management-software-small-business/)

Thói quen khách hàng
- [Zalo gần 80 triệu người dùng mỗi tháng năm 2025 – Znews](https://znews.vn/gan-80-trieu-nguoi-dung-zalo-moi-thang-trong-nam-2025-post1623499.html) · [Dấu ấn của Zalo 2025 – VnExpress](https://vnexpress.net/dau-an-cua-zalo-trong-nam-2025-5005108.html)
- [Zalo ZNS – dịch vụ và quy tắc](https://nhanh.vn/7-dich-vu-cua-zalo-zns-giup-tang-toi-da-kha-nang-giao-tiep-voi-khach-hang-n101636.html) · [Bảng giá ZNS 2026](https://www.smsthuonghieu.com/gia-zns/)

Pháp lý
- [Luật Giao dịch điện tử 2023 số 20/2023/QH15](https://thuvienphapluat.vn/van-ban/Cong-nghe-thong-tin/Luat-Giao-dich-dien-tu-2023-20-2023-QH15-513347.aspx) · [CeCA – hiệu lực 01/07/2024](https://ceca.gov.vn/luat-giao-dich-dien-tu-co-hieu-luc-tu-1-7-2024-co-hoi-de-chuyen-doi-so-viet-nam-but-pha/)
- [Nghị định 13/2023/NĐ-CP – toàn văn](https://xaydungchinhsach.chinhphu.vn/toan-van-nghi-dinh-13-2023-nd-cp-bao-ve-du-lieu-ca-nhan-119230516104357809.htm) · [Giải đáp về Nghị định 13/2023 – LuatVietnam](https://luatvietnam.vn/linh-vuc-khac/bao-ve-du-lieu-ca-nhan-theo-nghi-dinh-13-2023-nd-cp-883-100169-article.html)
- [Mua bán điện thoại cũ cần giấy tờ gì – ACC](https://congtyluatacc.vn/mua-ban-dien-thoai-cu-can-giay-to-gi-de-tranh-rac-roi-phap-luat/) · [Mua điện thoại là tài sản trộm cắp có bị truy cứu không – Thư viện pháp luật](https://thuvienphapluat.vn/hoi-dap-phap-luat/mua-dien-thoai-la-tai-san-trom-cap-thi-co-bi-truy-cuu-trach-nhiem-hinh-su-khong-306327.html)
- [Mua điện thoại trả góp máy lỗi, hủy hợp đồng – ACC](https://congtyluatacc.vn/mua-dien-thoai-tra-gop-may-loi-huy-hop-dong-duoc/) · [Rủi ro khi thành lập cửa hàng điện thoại](https://luattueminh.vn/rui-ro-va-luu-y-khi-thanh-lap-cua-hang-dien-thoai)
- [Hộ kinh doanh trên 1 tỷ phải xuất hóa đơn máy tính tiền – MISA eShop](https://www.misaeshop.vn/28175/ho-kinh-doanh-tren-1-ty-phai-xuat-hoa-don-may-tinh-tien/) · [Báo Chính phủ – Nghị định 70/2025](https://baochinhphu.vn/thuc-hien-nghi-dinh-70-2025-nd-cp-huong-toi-minh-bach-hoa-so-hoa-quan-ly-ho-kinh-doanh-102250529211550033.htm) · [Chế độ kế toán hộ kinh doanh theo Thông tư 152/2025](https://ketoanthuanthien.vn/kien-thuc/che-do-ke-toan-cho-ho-kinh-doanh-theo-thong-tu-152-2025-tt-btc/)
