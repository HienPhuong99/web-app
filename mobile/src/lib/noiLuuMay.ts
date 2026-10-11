// Nơi lưu lâu dài của bộ nhớ dữ liệu (boNho.ts): mỗi khóa một file trong thư mục riêng của app; bản web (chỉ để thử) dùng localStorage.
// File ghi khóa ở dòng đầu để chắc chắn đọc đúng mục (tên file là mã băm của khóa).
import { Platform } from 'react-native';
import { Directory, File, Paths } from 'expo-file-system';
import type { NoiLuu } from './boNho';

const TIEN_TO = 'bn:';

function bam(s: string): string { // FNV-1a 2 lần, đủ để đặt tên file
  let a = 0x811c9dc5, b = 0x01000193;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    a = Math.imul(a ^ c, 0x01000193) >>> 0;
    b = Math.imul(b ^ c, 0x5bd1e995) >>> 0;
  }
  return a.toString(16).padStart(8, '0') + b.toString(16).padStart(8, '0');
}

const web: NoiLuu = {
  doc: async k => globalThis.localStorage?.getItem(TIEN_TO + k) ?? null,
  ghi: async (k, v) => { try { globalThis.localStorage?.setItem(TIEN_TO + k, v); } catch { /* đầy: bỏ qua */ } },
  xoaHet: async () => {
    const ls = globalThis.localStorage;
    if (!ls) return;
    Object.keys(ls).filter(k => k.startsWith(TIEN_TO)).forEach(k => ls.removeItem(k));
  },
};

function thuMuc() { return new Directory(Paths.document, 'bo-nho'); }

const may: NoiLuu = {
  doc: async k => {
    const f = new File(thuMuc(), bam(k) + '.json');
    if (!f.exists) return null;
    const s = await f.text(), i = s.indexOf('\n');
    return i > 0 && s.slice(0, i) === k ? s.slice(i + 1) : null;
  },
  ghi: async (k, v) => {
    const d = thuMuc();
    if (!d.exists) d.create({ intermediates: true, idempotent: true });
    const f = new File(d, bam(k) + '.json');
    if (!f.exists) f.create();
    f.write(k + '\n' + v);
  },
  xoaHet: async () => { const d = thuMuc(); if (d.exists) d.delete(); },
};

export const noiLuuMay: NoiLuu = Platform.OS === 'web' ? web : may;
