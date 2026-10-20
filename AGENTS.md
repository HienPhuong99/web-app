# web-app (phuonghihi): bán hàng, kho, công nợ cho cửa hàng iPhone

Repo: https://github.com/HienPhuong99/web-app (nhánh chính `main`).

- `apps-script/`: máy chủ và giao diện web (Google Apps Script, `Index.html` một file).
- `mobile/`: app điện thoại (Expo / React Native). Đọc thêm `mobile/AGENTS.md`.
- `dev/`: máy chủ thử chạy bằng Node và các bộ test.
- Hướng dẫn cho chủ cửa hàng: `HUONG_DAN.md`.

## Kiểm thử

```bash
node dev/kiem-tra.js              # toàn bộ test máy chủ, API, tìm kiếm, HTML, dữ liệu thử (CI chạy lệnh này ở mỗi PR)
node dev/kiem-trinh-duyet.js      # test trình duyệt cho web (Playwright)
node dev/kiem-trinh-duyet-app.js  # test app điện thoại, bản web
cd mobile && npm run kiem-tra     # typecheck + test của app
```

Thử tay trên trình duyệt: `node dev/chay-thu.js` (thêm `--du-lieu-thu` để có dữ liệu mẫu) rồi mở http://localhost:5178, đăng nhập `admin` với mật khẩu in ra khi máy chủ khởi động. Dữ liệu mất khi tắt máy chủ.

## Skill dùng chung

Có trong cả `.claude/skills/` (cho Claude) và `.agents/skills/` (cho Argon), chép từ repo `phongtro`:

| Skill | Dùng khi |
|---|---|
| `agent-browser`, `agent-browser-core` | Điều khiển trình duyệt bằng CLI `agent-browser`: mở trang, bấm, điền, chụp màn hình |
| `agent-browser-dogfood` | Đi khắp app để tìm lỗi, xuất báo cáo có ảnh và bước tái hiện |
| `fixing-accessibility` | Soát nhãn, bàn phím, độ tương phản của nút và ô nhập |
| `fixing-motion-performance` | Hiệu ứng giật, lag |
| `improve-ui` | Soát giao diện và viết kế hoạch sửa (không sửa mã) |
| `create-design-md` | Viết `DESIGN.md` mô tả ngôn ngữ thiết kế hiện có |

Cài CLI một lần trên máy: `npm i -g agent-browser && agent-browser install`. Trên máy đã có Chromium của Playwright thì đặt `AGENT_BROWSER_EXECUTABLE_PATH` tới file chạy Chromium, khỏi tải thêm.

## Vòng lặp Opus ⇄ Argon (theo yêu cầu của chủ cửa hàng)

- **Hộp thư chung:** [`chatAI.md`](chatAI.md).
- **Thứ tự:** Opus (Claude) làm → **Argon** review diff, chạy test (cả `agent-browser`), thấy lỗi hay thiếu thì **sửa luôn** và phản biện → **Opus** kiểm lại, sửa nếu còn lỗi và phản biện → Argon… cứ thế.
- **Chỉ dừng (`CONSENSUS_REACHED`)** khi cả hai cùng xác nhận mọi việc trong bảng việc đã xong và không còn lỗi.
- **Chuyển lượt:** dòng cuối của `chatAI.md` là
  `<!-- DEBATE_STATUS: WAITING_FOR_ARGON | ROUND: N -->`, `<!-- DEBATE_STATUS: WAITING_FOR_OPUS | ROUND: N -->` hoặc `<!-- DEBATE_STATUS: CONSENSUS_REACHED -->`.
  Mỗi lượt thêm một tin `## 💬 [#N] <AI gửi> → <AI nhận> (<Ngày>) — <Chủ đề>` ngay trên dòng đó, rồi đổi sang tên AI kia và tăng `ROUND`.
- **Git: không push thẳng vào `main` trong vòng lặp.** `main` đổi trong `apps-script/` là GitHub Actions (`trien-khai.yml`) **tự triển khai lên cửa hàng thật**. Cả hai làm trên **nhánh chung `claude/chat-ai-argon`** (PR #20):
  1. Đầu lượt: `git checkout claude/chat-ai-argon && git pull`.
  2. Sửa, chạy `node dev/kiem-tra.js` (và test trình duyệt nếu đụng giao diện). Test đỏ thì không push.
  3. Commit, `git push`, rồi mới đổi `DEBATE_STATUS` (đổi trạng thái nằm trong commit cuối của lượt).
  4. Không làm gì khi chưa tới lượt mình. Không viết lại lịch sử nhánh chung (không rebase, không force-push).
  5. Khi `CONSENSUS_REACHED`, chủ cửa hàng gộp PR vào `main`. Lúc đó Apps Script mới tự triển khai.
- **Không** chạy `dev/trien-khai.js`, không đụng Google Sheets thật trong lượt của mình.
- Chỗ nào cần chọn cách làm nghiệp vụ (giảm giá, quỹ, quy trình ở quầy...) thì ghi vào mục "Cần chủ cửa hàng quyết định" trong `chatAI.md`, không tự chọn.
