# App điện thoại phuonghihi (Android / iOS)

App Expo (React Native) cho nhân viên đứng quầy. Dữ liệu lấy từ web app Apps Script qua `apps-script/Api.gs`.

| Màn hình | Làm gì |
|---|---|
| Đăng nhập | Tài khoản của web app. Mã đăng nhập máy lưu trong Keychain / Keystore, mở lại app không phải nhập lại |
| Tổng quan | Doanh số hôm nay (vòng lớn), đơn / đã thu / khách còn nợ, 7 ngày gần nhất, việc cần làm (trả góp, hợp đồng, đơn trễ, hàng sắp hết), gọi nhanh khách còn nợ |
| Quét IMEI | Quét mã vạch IMEI/serial trên hộp máy bằng camera, hoặc gõ IMEI / SĐT / tên khách → máy đã bán cho ai, ngày giao, còn bảo hành bao lâu |
| Tài khoản | Ai đang đăng nhập, máy chủ, đăng xuất |

Giao diện: nền màu đào, thẻ kính mờ, thanh tab nổi. Trên iPhone iOS 26 thanh tab dùng Liquid Glass thật (`expo-glass-effect`); máy khác dùng làm mờ hoặc nền trắng mờ.

## Thử trên điện thoại (miễn phí, Expo Go)

1. Cài app **Expo Go** trên điện thoại (App Store / Google Play).
2. Trên máy tính: `cd mobile`, `npm install` (lần đầu), rồi `npx expo start`.
3. Android: mở Expo Go → quét mã QR. iPhone: mở Camera → quét mã QR.
   Điện thoại và máy tính phải cùng mạng Wi-Fi; khác mạng thì chạy `npx expo start --tunnel`.

App mặc định nối tới **link web app thật** (`extra.apiUrl` trong `app.json`). Bản trên Google phải có `Api.gs` (xem `HUONG_DAN.md`, mục *App điện thoại*).

**Thử mà không đụng dữ liệu thật:** chạy `node dev/chay-thu.js --mau-app` ở thư mục gốc (in mật khẩu admin, có sẵn vài máy đã bán). Trong app bấm **Máy chủ** dưới nút Đăng nhập, nhập `http://<IP máy tính>:5178/api` (xem IP bằng `ipconfig`). IMEI mẫu: `356789012345672` (còn hạn), `351234567890124` (hết hạn).

## Cài hẳn vào máy

- **Android (miễn phí):** `npx eas-cli@latest build -p android --profile preview` → tải file APK, gửi qua Zalo/Drive, cài. Cần tài khoản Expo (miễn phí).
- **iPhone:** cần Apple Developer Program (99 USD/năm), rồi `npx eas-cli@latest build -p ios --profile preview` hoặc TestFlight.

## Kiểm tra

- `npm run kiem-tra` (trong `mobile/`): kiểm tra kiểu TypeScript, hàm định dạng / nhận dạng mã quét, gọi API thật của máy chủ thử qua HTTP.
- `npx expo lint`, `npx expo-doctor`.
- `node dev/kiem-trinh-duyet-app.js` (thư mục gốc, cần Playwright): build bản web, bấm qua đăng nhập, tổng quan, tra bảo hành, đăng xuất trên Chromium cỡ điện thoại.

Camera quét mã chỉ thử được trên điện thoại thật (bản web / test tự động dùng ô gõ tay).

## Cấu trúc

- `src/app/`: màn hình (Expo Router). `(tabs)/` là ba tab, `dang-nhap.tsx` là đăng nhập.
- `src/lib/`: gọi API (`api.ts`), trạng thái đăng nhập (`auth.tsx`), lưu an toàn (`luuTru.ts`), định dạng (`dinhDang.ts`), mã quét (`maQuet.ts`).
- `src/ui/`: màu, nền, thẻ kính, nút, vòng số, biểu đồ, thanh tab.
- `AGENTS.md`: ghi chú cho trợ lý lập trình (Expo đổi API theo từng SDK, đọc tài liệu đúng phiên bản).
