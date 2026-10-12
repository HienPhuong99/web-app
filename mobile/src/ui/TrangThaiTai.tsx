// Trạng thái tải dữ liệu của một màn hình:
// DongCapNhat: dòng nhỏ "Cập nhật lúc 13:05" / "Đang cập nhật…" / "Không cập nhật được" (luôn cao như nhau để nội dung không nhảy).
// KhungCho: khung xương nhấp nháy có hình như nội dung thật, hiện ở lần đầu khi máy chưa có số nào (thay chữ "Đang tải…").
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Animated, Platform, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { moTaLuc } from '../lib/boNho';
import type { DuLieu } from '../lib/useDuLieu';
import { The } from './The';
import { mau } from './theme';

export function DongCapNhat({ dl, style }: { dl: Pick<DuLieu<unknown>, 'du' | 'luc' | 'loi' | 'dangTai' | 'lamMoi'>; style?: StyleProp<ViewStyle> }) {
  if (!dl.du || !dl.luc) return null;
  if (dl.loi) {
    return (
      <Pressable onPress={dl.lamMoi} style={[s.dong, style]} accessibilityRole="button" accessibilityLabel={`Không cập nhật được: ${dl.loi}. Bấm để thử lại`} testID="cap-nhat-loi">
        <Ionicons name="cloud-offline-outline" size={14} color={mau.vang} />
        <Text style={[s.chu, { color: mau.vang }]} numberOfLines={1}>Chưa cập nhật được · số lúc {moTaLuc(dl.luc)} · <Text style={s.thuLai}>Thử lại</Text></Text>
      </Pressable>
    );
  }
  return (
    <View style={[s.dong, style]} testID="cap-nhat">
      {dl.dangTai ? <ActivityIndicator size="small" color={mau.xam} style={{ transform: [{ scale: 0.7 }] }} /> : <Ionicons name="checkmark-circle-outline" size={14} color={mau.xam} />}
      <Text style={s.chu} numberOfLines={1}>{dl.dangTai ? 'Đang cập nhật…' : 'Cập nhật lúc ' + moTaLuc(dl.luc)}</Text>
    </View>
  );
}

/** Kéo xuống để làm mới: vòng quay chỉ hiện khi người dùng kéo (cập nhật ở nền đã có DongCapNhat báo) */
export function useKeo(lamMoi: () => Promise<void>) {
  const [refreshing, setKeo] = useState(false);
  const onRefresh = useCallback(async () => {
    setKeo(true);
    try { await lamMoi(); } finally { setKeo(false); }
  }, [lamMoi]);
  return { refreshing, onRefresh, tintColor: mau.cam };
}

/** Thanh xám nhấp nháy dùng trong khung xương */
function useNhapNhay() {
  const [v] = useState(() => new Animated.Value(0.45));
  useEffect(() => {
    const vong = Animated.loop(Animated.sequence([
      Animated.timing(v, { toValue: 1, duration: 650, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(v, { toValue: 0.45, duration: 650, useNativeDriver: Platform.OS !== 'web' }),
    ]));
    vong.start();
    return () => vong.stop();
  }, [v]);
  return v;
}

const Thanh = ({ rong, cao = 14, tron }: { rong: number | `${number}%`; cao?: number; tron?: boolean }) => (
  <View style={{ width: rong, height: cao, borderRadius: tron ? cao / 2 : 7, backgroundColor: 'rgba(16,24,40,0.09)' }} />
);

/** Khung xương danh sách: dong = số dòng; tron = có chấm tròn đầu dòng */
export function KhungCho({ dong = 5, tron = false, style, testID = 'khung-cho' }: { dong?: number; tron?: boolean; style?: StyleProp<ViewStyle>; testID?: string }) {
  const op = useNhapNhay();
  return (
    <The style={[{ paddingVertical: 10 }, style]} testID={testID}>
      <Animated.View style={{ opacity: op }} accessibilityLabel="Đang tải" accessibilityRole="progressbar">
        {Array.from({ length: dong }, (_, i) => (
          <View key={i} style={[s.hangCho, i > 0 && s.vach]}>
            {tron ? <Thanh rong={40} cao={40} tron /> : null}
            <View style={{ flex: 1, gap: 8 }}>
              <Thanh rong={`${[72, 58, 66, 50, 62][i % 5]}%`} cao={15} />
              <Thanh rong={`${[40, 48, 34, 44, 30][i % 5]}%`} cao={12} />
            </View>
            <Thanh rong={56} cao={15} />
          </View>
        ))}
      </Animated.View>
    </The>
  );
}

/** Khung xương của Tổng quan: vòng doanh số + 3 số + biểu đồ */
export function KhungChoTongQuan() {
  const op = useNhapNhay();
  return (
    <Animated.View style={{ opacity: op }} accessibilityLabel="Đang tải số liệu" accessibilityRole="progressbar" testID="khung-cho">
      <The style={{ alignItems: 'center', marginBottom: 14 }}>
        <Thanh rong={130} cao={12} />
        <View style={{ height: 14 }} />
        <Thanh rong={150} cao={150} tron />
        <View style={{ flexDirection: 'row', alignSelf: 'stretch', marginTop: 16 }}>
          {[0, 1, 2].map(i => (
            <View key={i} style={{ flex: 1, alignItems: 'center', gap: 8 }}>
              <Thanh rong={24} cao={24} tron /><Thanh rong={60} cao={18} /><Thanh rong={70} cao={12} />
            </View>
          ))}
        </View>
      </The>
      <The style={{ marginBottom: 14 }}>
        <Thanh rong={140} cao={16} />
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10, height: 110, marginTop: 14 }}>
          {[40, 70, 30, 90, 55, 75, 100].map((c, i) => <View key={i} style={{ flex: 1 }}><Thanh rong="100%" cao={c} /></View>)}
        </View>
      </The>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  dong: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 22, marginBottom: 6, marginLeft: 4 },
  chu: { fontSize: 12.5, color: mau.chuNhat, fontWeight: '600', flexShrink: 1 },
  thuLai: { textDecorationLine: 'underline', fontWeight: '800' },
  hangCho: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  vach: { borderTopWidth: 1, borderTopColor: mau.vach },
});
