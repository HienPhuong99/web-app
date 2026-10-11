// Hàng nút lọc / sắp xếp cuộn ngang (dưới ô tìm kiếm).
// BoLoc: chọn một trong các lựa chọn; dem(v): số mục của lựa chọn v, hiện trong ngoặc.
// BoSapXep: chọn tiêu chí; tiêu chí đang chọn có mũi tên (↓ lớn trước, ↑ nhỏ trước), bấm lại thì đảo chiều.
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { bamSapXep, moTaSx, type LuaChon, type SapXep, type TieuChi } from '../lib/locDs';
import { Chip } from './Chip';
import { mau } from './theme';

type Props<T extends string> = { ds: LuaChon<T>; chon: T; onChon: (v: T) => void; dem?: (v: T) => number; testID?: string };

export function BoLoc<T extends string>({ ds, chon, onChon, dem, testID }: Props<T>) {
  return (
    <Hang sapXep={false} testID={testID}>
      {ds.map(([v, t]) => (
        <Chip key={v} chu={dem ? `${t} (${dem(v)})` : t} chon={v === chon} onPress={() => onChon(v)} testID={testID ? `${testID}-${v}` : undefined} />
      ))}
    </Hang>
  );
}

type PropsSx<T extends string> = { ds: TieuChi<T>; chon: SapXep<T>; onChon: (v: SapXep<T>) => void; testID?: string };

export function BoSapXep<T extends string>({ ds, chon, onChon, testID }: PropsSx<T>) {
  return (
    <Hang sapXep testID={testID}>
      {ds.map(([v, t]) => {
        const dang = v === chon.theo;
        return (
          <Chip key={v} chu={t} chon={dang} sau={dang ? (chon.chieu === 'giam' ? 'arrow-down' : 'arrow-up') : undefined}
            nhanDoc={dang ? `Sắp xếp ${moTaSx(ds, chon)}. Bấm để đảo chiều` : `Sắp xếp theo ${t.toLowerCase()}`}
            onPress={() => onChon(bamSapXep(ds, chon, v))} testID={testID ? `${testID}-${v}` : undefined} />
        );
      })}
    </Hang>
  );
}

function Hang({ sapXep, testID, children }: { sapXep: boolean; testID?: string; children: ReactNode }) {
  return (
    <View style={s.boc} testID={testID}>
      <View style={s.nhan} accessibilityLabel={sapXep ? 'Sắp xếp' : 'Lọc'}>
        <Ionicons name={sapXep ? 'swap-vertical' : 'funnel-outline'} size={16} color={mau.chuNhat} />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={s.hang}>
        {children}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  boc: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  nhan: { width: 26, alignItems: 'flex-start' },
  hang: { gap: 8, paddingRight: 8 },
});
