// Lưu PDF (base64 từ máy chủ) ra file tạm rồi mở bảng chia sẻ của máy (Zalo, Messenger, Mail, Lưu vào Tệp…). Bản web: tải file về.
import { Platform } from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export async function chiaSePdf(ten: string, base64: string): Promise<void> {
  const tenFile = ten.replace(/[\\/:*?"<>|\n\r]/g, '-').slice(0, 150) || 'tai-lieu.pdf';
  if (Platform.OS === 'web') {
    const a = document.createElement('a');
    a.href = 'data:application/pdf;base64,' + base64;
    a.download = tenFile;
    document.body.appendChild(a); a.click(); a.remove();
    return;
  }
  const f = new File(Paths.cache, tenFile);
  if (f.exists) f.delete();
  f.create();
  f.write(base64, { encoding: 'base64' });
  if (!(await Sharing.isAvailableAsync())) throw new Error('Máy này không mở được bảng chia sẻ.');
  await Sharing.shareAsync(f.uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: tenFile });
}
