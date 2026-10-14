// Nhận dạng mã vừa quét / gõ: IMEI (15 số, đúng số kiểm tra Luhn), serial, mã sản phẩm EAN/UPC. Thuần TypeScript.

export type LoaiMa = 'imei' | 'imei-sai' | 'ean' | 'serial' | 'khac';

/** Số kiểm tra Luhn của IMEI: chữ số cuối khớp với 14 chữ số đầu */
export function dungLuhn(so: string): boolean {
  if (!/^\d+$/.test(so)) return false;
  let tong = 0;
  for (let i = 0; i < so.length; i++) {
    let d = so.charCodeAt(so.length - 1 - i) - 48;
    if (i % 2 === 1) { d *= 2; if (d > 9) d -= 9; }
    tong += d;
  }
  return tong % 10 === 0;
}

/**
 * Chuẩn hóa nội dung mã vạch / chữ gõ tay thành mã để tra:
 * - "35 678901 234567 1", "IMEI: 356789012345671", mã QR "IMEI1:…\nIMEI2:…" → IMEI 15 số (lấy IMEI đầu tiên)
 * - "S/N: F2LXK0ABC9", "Serial No. F2LXK0ABC9" → F2LXK0ABC9
 * - Còn lại: bỏ khoảng trắng, dấu gạch, dấu chấm; viết hoa
 */
export function chuanHoaMa(raw: string): string {
  const gon = String(raw ?? '').replace(/[\s.\-]/g, '').toUpperCase();
  const imei = /IMEI\d?[:=#]?(\d{15})/.exec(gon) || /^(\d{15})$/.exec(gon);
  if (imei) return imei[1];
  return gon.replace(/^(S\/N|SN|SERIALNO|SERIALNUMBER|SERIAL)[:=#]?/, '');
}

/**
 * Chữ gõ ở ô Tra bảo hành (IMEI/serial, số điện thoại hoặc tên khách): IMEI, serial, số điện thoại chuẩn hóa như chuanHoaMa;
 * tên khách nhiều từ ("Nguyễn Minh") giữ dấu cách để máy chủ tìm theo từng từ (bỏ cách thành "NGUYỄNMINH" thì không khớp "Nguyễn Văn Minh").
 */
export function chuanHoaTra(raw: string): string {
  const s = String(raw ?? '').trim().replace(/\s+/g, ' ');
  const ma = chuanHoaMa(s);
  if (/^\d{15}$/.test(ma) || /^(S\/N|SN|SERIAL)\b/i.test(s) || !/ /.test(s) || !/\p{L}/u.test(s)) return ma;
  return s;
}

export function loaiMa(ma: string): LoaiMa {
  if (/^\d{15}$/.test(ma)) return dungLuhn(ma) ? 'imei' : 'imei-sai';
  if (/^\d{8}$|^\d{12,13}$/.test(ma)) return 'ean';
  if (/^[A-Z0-9]{8,14}$/.test(ma) && /[A-Z]/.test(ma) && /\d/.test(ma)) return 'serial';
  return 'khac';
}

/** Lời nhắc dưới ô tra khi mã quét có vẻ không đúng loại */
export function goiYMa(ma: string): string {
  switch (loaiMa(ma)) {
    case 'imei-sai': return 'Mã 15 số này sai số kiểm tra, có thể quét/gõ nhầm một chữ số.';
    case 'ean': return 'Đây có vẻ là mã sản phẩm (EAN/UPC) trên hộp, không phải IMEI. Hãy quét mã vạch ghi IMEI.';
    default: return '';
  }
}
