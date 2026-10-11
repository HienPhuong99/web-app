import { Tabs } from 'expo-router/js-tabs';
import { ThanhTab } from '../../ui/ThanhTab';
import { mau } from '../../ui/theme';

export default function CacTab() {
  return (
    <Tabs tabBar={p => <ThanhTab {...p} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: mau.nen1 } }}>
      <Tabs.Screen name="index" options={{ title: 'Tổng quan' }} />
      <Tabs.Screen name="khach" options={{ title: 'Khách' }} />
      <Tabs.Screen name="ban" options={{ title: 'Bán' }} />
      <Tabs.Screen name="quet" options={{ title: 'Quét' }} />
      <Tabs.Screen name="tai-khoan" options={{ title: 'Thêm' }} />
    </Tabs>
  );
}
