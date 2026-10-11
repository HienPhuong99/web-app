// Thông báo đẩy: xin quyền, lấy mã nhận thông báo (Expo push token) để gửi lên máy chủ (API datThongBao).
// Máy chủ gửi mỗi sáng một thông báo tóm tắt việc cần làm (cùng giờ với email sáng, mặc định 7 giờ), bấm vào mở Tổng quan.
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants, { ExecutionEnvironment } from 'expo-constants';

export const coThongBao = Platform.OS !== 'web';

if (coThongBao) {
  // App đang mở thì vẫn hiện thông báo ở đầu màn hình
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
  });
}

const laExpoGo = () => Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

/** Xin quyền và lấy mã nhận thông báo. Lỗi thì báo bằng câu dễ hiểu (chưa cho phép, Expo Go trên Android…). */
export async function layMaThongBao(): Promise<string> {
  if (!coThongBao) throw new Error('Bản web không nhận được thông báo.');
  if (!Device.isDevice) throw new Error('Cần điện thoại thật để nhận thông báo (máy ảo không nhận được).');
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', { name: 'Việc cần làm mỗi sáng', importance: Notifications.AndroidImportance.HIGH });
  }
  let { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') status = (await Notifications.requestPermissionsAsync()).status;
  if (status !== 'granted') throw new Error('Bạn chưa cho phép thông báo. Vào Cài đặt của điện thoại → Thông báo → bật cho app này rồi thử lại.');
  const projectId = (Constants.expoConfig?.extra?.eas?.projectId as string | undefined) ?? Constants.easConfig?.projectId;
  if (!projectId) throw new Error('App chưa gắn với dự án Expo (thiếu projectId trong app.json) nên chưa nhận được thông báo.');
  try {
    return (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  } catch (e) {
    if (Platform.OS === 'android' && laExpoGo()) throw new Error('Expo Go trên Android không nhận được thông báo đẩy. Cài bản APK của app (xem hướng dẫn) để dùng tính năng này.');
    throw new Error('Chưa lấy được mã nhận thông báo: ' + (e as Error).message);
  }
}
