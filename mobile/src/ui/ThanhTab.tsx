// Thanh tab dạng viên thuốc nổi ở đáy. iOS 26: kính Liquid Glass thật; iOS cũ hơn / web: làm mờ; Android: nền trắng mờ (nhẹ máy).
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { bong, mau } from './theme';

const BIEU_TUONG: Record<string, [keyof typeof Ionicons.glyphMap, keyof typeof Ionicons.glyphMap]> = {
  index: ['home-outline', 'home'],
  khach: ['people-outline', 'people'],
  ban: ['bag-add-outline', 'bag-add'],
  quet: ['scan-outline', 'scan'],
  'tai-khoan': ['grid-outline', 'grid'],
};

const coKinhThat = Platform.OS === 'ios' && (() => { try { return isLiquidGlassAvailable() && isGlassEffectAPIAvailable(); } catch { return false; } })();

function NenThanh({ children }: { children: React.ReactNode }) {
  if (coKinhThat) return <GlassView style={s.vien} glassEffectStyle="regular">{children}</GlassView>;
  if (Platform.OS === 'android') return <View style={[s.vien, { backgroundColor: 'rgba(255,255,255,0.94)' }]}>{children}</View>;
  return <BlurView intensity={60} tint="light" style={[s.vien, { backgroundColor: 'rgba(255,255,255,0.55)' }]}>{children}</BlurView>;
}

export function ThanhTab({ state, descriptors, navigation }: BottomTabBarProps) {
  const inset = useSafeAreaInsets();
  return (
    <View pointerEvents="box-none" style={[s.boc, { bottom: Math.max(inset.bottom, 12) }]}>
      <View style={[s.bong, bong]}>
        <NenThanh>
          {state.routes.map((route, i) => {
            const chon = state.index === i, opt = descriptors[route.key].options;
            const nhan = typeof opt.title === 'string' ? opt.title : route.name;
            const [bt, btChon] = BIEU_TUONG[route.name] ?? ['ellipse-outline', 'ellipse'];
            const bam = () => {
              const e = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!chon && !e.defaultPrevented) {
                if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
                navigation.navigate(route.name, route.params);
              }
            };
            return (
              <Pressable key={route.key} onPress={bam} accessibilityRole="tab" accessibilityState={{ selected: chon }}
                accessibilityLabel={nhan} testID={'tab-' + route.name} style={[s.nut, chon && s.nutChon]}>
                {route.name === 'ban' ? (
                  <View style={[s.nutBan, chon && { backgroundColor: mau.camDam }]}><Ionicons name={chon ? btChon : bt} size={21} color="#fff" /></View>
                ) : <Ionicons name={chon ? btChon : bt} size={23} color={chon ? mau.camDam : mau.chuPhu} />}
                <Text style={[s.chu, chon && { color: mau.camDam }]} numberOfLines={1}>{nhan}</Text>
              </Pressable>
            );
          })}
        </NenThanh>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  boc: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  bong: { borderRadius: 999, width: '94%', maxWidth: 460 },
  vien: { flexDirection: 'row', borderRadius: 999, padding: 6, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.9)' },
  nut: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 6, borderRadius: 999, minHeight: 56, minWidth: 0 },
  nutChon: { backgroundColor: 'rgba(255,107,74,0.14)' },
  nutBan: { width: 38, height: 28, borderRadius: 14, backgroundColor: mau.cam, alignItems: 'center', justifyContent: 'center' },
  chu: { fontSize: 11, marginTop: 2, color: mau.chuPhu, fontWeight: '600' },
});
