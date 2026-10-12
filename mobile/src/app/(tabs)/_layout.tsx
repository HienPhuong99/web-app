import { Tabs } from 'expo-router/js-tabs';
import { SX_KHACH, sxMacDinh } from '../../lib/locDs';
import { useTaiTruoc } from '../../lib/useDuLieu';
import { ThanhTab } from '../../ui/ThanhTab';
import { mau } from '../../ui/theme';

// Tham số mặc định của các màn hình (phải khớp useDuLieu ở màn hình đó thì mới dùng lại được)
const SX_KHACH_MD = sxMacDinh(SX_KHACH);
const LAY_SAN: [string, unknown[]][] = [
  ['khoMay', []], ['cauHinhMay', []], ['dsKhachMay', ['', { loc: 'tat', sx: SX_KHACH_MD.theo, chieu: SX_KHACH_MD.chieu }]],
];

export default function CacTab() {
  useTaiTruoc(LAY_SAN);
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
