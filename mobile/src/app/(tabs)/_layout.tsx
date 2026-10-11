import { Tabs } from 'expo-router/js-tabs';
import { ThanhTab } from '../../ui/ThanhTab';
import { mau } from '../../ui/theme';

export default function CacTab() {
  return (
    <Tabs tabBar={p => <ThanhTab {...p} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: mau.nen1 } }}>
      <Tabs.Screen name="index" options={{ title: 'Tổng quan' }} />
      <Tabs.Screen name="quet" options={{ title: 'Quét IMEI' }} />
      <Tabs.Screen name="tai-khoan" options={{ title: 'Tài khoản' }} />
    </Tabs>
  );
}
