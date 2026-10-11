// Hàng nút lọc / sắp xếp cuộn ngang (dưới ô tìm kiếm): chọn một trong các lựa chọn. dem(v): số mục của lựa chọn v, hiện trong ngoặc.
import { ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { LuaChon } from '../lib/locDs';
import { Chip } from './Chip';
import { mau } from './theme';

type Props<T extends string> = { ds: LuaChon<T>; chon: T; onChon: (v: T) => void; sapXep?: boolean; dem?: (v: T) => number; testID?: string };

export function BoLoc<T extends string>({ ds, chon, onChon, sapXep, dem, testID }: Props<T>) {
  return (
    <View style={s.boc} testID={testID}>
      <View style={s.nhan} accessibilityLabel={sapXep ? 'Sắp xếp' : 'Lọc'}>
        <Ionicons name={sapXep ? 'swap-vertical' : 'funnel-outline'} size={16} color={mau.chuNhat} />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={s.hang}>
        {ds.map(([v, t]) => (
          <Chip key={v} chu={dem ? `${t} (${dem(v)})` : t} chon={v === chon} onPress={() => onChon(v)} testID={testID ? `${testID}-${v}` : undefined} />
        ))}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  boc: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  nhan: { width: 26, alignItems: 'flex-start' },
  hang: { gap: 8, paddingRight: 8 },
});
