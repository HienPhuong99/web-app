// Mã lần gửi cho lệnh ghi (bán nhanh, thu tiền): tạo khi bấm, giữ nguyên khi thử lại sau lỗi mạng, bỏ khi đã ghi xong.
// Máy chủ nhớ kết quả theo mã 10 phút nên lần gửi lại không tạo thêm đơn / phiếu thu.
export function taoMaGhi(): string {
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6);
}

// Tiền thu thêm cho đơn sau khi bán (màn Thu tiền ghi, màn Đã bán đọc lại khi quay về) để "Còn nợ" và nút Thu tiền không còn số cũ
const thuThem = new Map<string, number>();
export function ghiThuThem(soDH: string, soTien: number): void {
  if (soDH) thuThem.set(soDH, (thuThem.get(soDH) ?? 0) + soTien);
}
export function daThuThem(soDH: string): number {
  return thuThem.get(soDH) ?? 0;
}
