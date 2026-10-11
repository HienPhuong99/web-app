// Mảnh ghép dùng chung cho các danh sách: ô tìm kiếm, một dòng bấm được, nhãn trạng thái, dòng "nhãn: giá trị", khung trang.
import { FlatList, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type RefreshControlProps, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Nen } from './Nen';
import { DEM_DUOI, bo, mau } from './theme';

/** Khung chung của một màn hình: nền đào, vùng an toàn, cuộn dọc, rộng tối đa 560 */
export function KhungTrang({ children, refreshControl, coTab = true }: { children: React.ReactNode; refreshControl?: React.ReactElement<RefreshControlProps>; coTab?: boolean }) {
  return (
    <View style={{ flex: 1 }}>
      <Nen />
      <SafeAreaView edges={coTab ? ['top'] : ['top', 'bottom']} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={[s.khung, !coTab && { paddingBottom: 40 }]} keyboardShouldPersistTaps="handled" refreshControl={refreshControl}>
          {children}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

/**
 * Màn hình danh sách dài (kho, khách, thẻ kho…): phần đầu (tìm, lọc) cuộn cùng danh sách, các dòng nằm chung một thẻ kính,
 * nhưng chỉ vẽ các dòng đang hiện trên màn hình (FlatList) nên vài trăm dòng vẫn cuộn mượt.
 * ds = null: chưa có dữ liệu (hiện choTai, vd. khung xương). rong: chữ khi danh sách trống. testID gắn vào từng đoạn thẻ chứa dòng.
 */
export function KhungDanhSach<T>({ dau, ds, khoa, ve, rong, cuoi, choTai, refreshControl, coTab = true, testID }: {
  dau: React.ReactElement; ds: readonly T[] | null; khoa: (x: T, i: number) => string; ve: (x: T) => React.ReactElement;
  rong?: string; cuoi?: React.ReactElement | null; choTai?: React.ReactElement | null; refreshControl?: React.ReactElement<RefreshControlProps>; coTab?: boolean; testID?: string;
}) {
  const n = ds?.length ?? 0;
  return (
    <View style={{ flex: 1 }}>
      <Nen />
      <SafeAreaView edges={coTab ? ['top'] : ['top', 'bottom']} style={{ flex: 1 }}>
        <FlatList
          data={ds ?? []} keyExtractor={khoa} contentContainerStyle={[s.khung, !coTab && { paddingBottom: 40 }]}
          keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" refreshControl={refreshControl}
          initialNumToRender={14} maxToRenderPerBatch={12} windowSize={9} removeClippedSubviews={Platform.OS === 'android'}
          ListHeaderComponent={dau}
          renderItem={({ item, index }) => (
            <View testID={testID} style={[s.doan, index === 0 && s.doanDau, index === n - 1 && s.doanCuoi, index > 0 && s.doanVach]}>{ve(item)}</View>
          )}
          ListEmptyComponent={ds ? (rong ? <View testID={testID} style={[s.doan, s.doanDau, s.doanCuoi]}><ChuNhat chu={rong} style={{ marginVertical: 12 }} /></View> : null) : choTai ?? null}
          ListFooterComponent={cuoi ?? null}
        />
      </SafeAreaView>
    </View>
  );
}

export function OTim(p: TextInputProps & { ben?: React.ReactNode }) {
  const { ben, style, ...con } = p;
  return (
    <View style={s.oTim}>
      <Ionicons name="search" size={19} color={mau.xam} />
      <TextInput placeholderTextColor={mau.xam} autoCorrect={false} returnKeyType="search" clearButtonMode="while-editing" {...con} style={[s.oTimChu, style]} />
      {ben}
    </View>
  );
}

type DongProps = {
  chinh: string; phu?: string; ben?: string; benMau?: string; benPhu?: string; onPress?: () => void; testID?: string;
  bieuTuong?: keyof typeof Ionicons.glyphMap; mauBT?: string; style?: StyleProp<ViewStyle>;
};
export function Dong({ chinh, phu, ben, benMau, benPhu, onPress, testID, bieuTuong, mauBT = mau.brand, style }: DongProps) {
  const noi = (
    <>
      {bieuTuong ? <View style={[s.cham, { backgroundColor: mauBT + '1F' }]}><Ionicons name={bieuTuong} size={19} color={mauBT} /></View> : null}
      <View style={{ flex: 1 }}>
        <Text style={s.chinh} numberOfLines={2}>{chinh}</Text>
        {phu ? <Text style={s.phu} numberOfLines={2}>{phu}</Text> : null}
      </View>
      {ben || benPhu ? (
        <View style={{ alignItems: 'flex-end', maxWidth: '42%' }}>
          {ben ? <Text style={[s.ben, benMau ? { color: benMau } : null]} numberOfLines={1}>{ben}</Text> : null}
          {benPhu ? <Text style={s.benPhu} numberOfLines={1}>{benPhu}</Text> : null}
        </View>
      ) : null}
      {onPress ? <Ionicons name="chevron-forward" size={18} color={mau.xam} /> : null}
    </>
  );
  if (!onPress) return <View style={[s.dong, style]} testID={testID}>{noi}</View>;
  return (
    <Pressable onPress={onPress} testID={testID} accessibilityRole="button" accessibilityLabel={chinh}
      style={({ pressed }) => [s.dong, pressed && { opacity: 0.6 }, style]}>{noi}</Pressable>
  );
}

export const Vach = () => <View style={s.vach} />;

export const MAU_NHAN = {
  xanh: [mau.xanh, mau.xanhNhat], vang: [mau.vang, mau.vangNhat], do: [mau.do, mau.doNhat], xam: [mau.xam, mau.xamNhat], brand: [mau.brand, mau.brandNhat], cam: [mau.camDam, mau.camNhat],
} as const;
export function Nhan({ chu, loai = 'xam', testID }: { chu: string; loai?: keyof typeof MAU_NHAN; testID?: string }) {
  const [c, n] = MAU_NHAN[loai];
  return <View style={[s.nhan, { backgroundColor: n }]}><Text style={[s.nhanChu, { color: c }]} testID={testID}>{chu}</Text></View>;
}

export function DongTT({ nhan, giaTri, dam, onPress }: { nhan: string; giaTri: string; dam?: boolean; onPress?: () => void }) {
  return (
    <View style={s.dongTT}>
      <Text style={s.dongTTNhan}>{nhan}</Text>
      {onPress ? (
        <Pressable onPress={onPress} style={{ flex: 1 }}><Text style={[s.dongTTGT, { color: mau.brand, textDecorationLine: 'underline' }]}>{giaTri}</Text></Pressable>
      ) : <Text style={[s.dongTTGT, dam && { fontWeight: '800', fontVariant: ['tabular-nums'] }]} selectable>{giaTri}</Text>}
    </View>
  );
}

export const TieuDeMuc = ({ chu, testID }: { chu: string; testID?: string }) => <Text style={s.tieuDeMuc} testID={testID}>{chu}</Text>;
export const ChuNhat = ({ chu, style }: { chu: string; style?: object }) => <Text style={[s.chuNhat, style]}>{chu}</Text>;
export const ChuLoi = ({ chu, testID }: { chu: string; testID?: string }) => (chu ? <Text style={s.loi} testID={testID}>{chu}</Text> : null);

export const s = StyleSheet.create({
  khung: { padding: 18, paddingBottom: DEM_DUOI, maxWidth: 560, width: '100%', alignSelf: 'center' },
  // Mỗi dòng của KhungDanhSach là một đoạn của thẻ kính (như The): dòng đầu bo góc trên, dòng cuối bo góc dưới
  doan: { backgroundColor: mau.kinh, borderColor: mau.vienKinh, borderLeftWidth: 1, borderRightWidth: 1, paddingHorizontal: 18 },
  doanDau: { borderTopWidth: 1, borderTopLeftRadius: bo.lon, borderTopRightRadius: bo.lon, paddingTop: 6 },
  doanCuoi: { borderBottomWidth: 1, borderBottomLeftRadius: bo.lon, borderBottomRightRadius: bo.lon, paddingBottom: 6 },
  doanVach: { borderTopWidth: 1, borderTopColor: mau.vach },
  oTim: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 16, borderWidth: 1, borderColor: mau.vach, paddingHorizontal: 14 },
  oTimChu: { flex: 1, paddingVertical: 13, fontSize: 17, color: mau.chu, minWidth: 0 },
  dong: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11 },
  cham: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  chinh: { fontSize: 16, fontWeight: '700', color: mau.chu },
  phu: { fontSize: 14, color: mau.chuNhat, marginTop: 2 },
  ben: { fontSize: 15, fontWeight: '800', color: mau.chu, fontVariant: ['tabular-nums'] },
  benPhu: { fontSize: 13, color: mau.chuNhat, marginTop: 2 },
  vach: { height: 1, backgroundColor: mau.vach },
  nhan: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, alignSelf: 'flex-start' },
  nhanChu: { fontSize: 13, fontWeight: '800' },
  dongTT: { flexDirection: 'row', paddingTop: 10, gap: 12 },
  dongTTNhan: { width: 108, fontSize: 14, color: mau.chuNhat, fontWeight: '600' },
  dongTTGT: { flex: 1, fontSize: 15, color: mau.chu, fontWeight: '600' },
  tieuDeMuc: { fontSize: 18, fontWeight: '800', color: mau.chu, marginTop: 6, marginBottom: 10, marginLeft: 4 },
  chuNhat: { fontSize: 14, color: mau.chuNhat, marginTop: 8, lineHeight: 20 },
  loi: { color: mau.do, fontSize: 15, marginTop: 10, fontWeight: '600', lineHeight: 21 },
});
