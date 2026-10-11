// Hộp thoại hỏi Có/Không. Alert của React Native không chạy trên bản web, nên web dùng window.confirm.
import { Alert, Platform } from 'react-native';

export function hoi(tieuDe: string, noiDung: string, chuDongY = 'Đồng ý'): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(globalThis.confirm ? globalThis.confirm(tieuDe + '\n\n' + noiDung) : true);
  return new Promise(xong => Alert.alert(tieuDe, noiDung, [
    { text: 'Hủy', style: 'cancel', onPress: () => xong(false) },
    { text: chuDongY, style: 'destructive', onPress: () => xong(true) },
  ], { cancelable: true, onDismiss: () => xong(false) }));
}
