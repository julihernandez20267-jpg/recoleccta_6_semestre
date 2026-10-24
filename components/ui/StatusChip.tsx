import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { normalizeStatus, STATUS_META } from '../../constants/Reports';

interface StatusChipProps {
  // Acepta el estado tal como llega del backend ('pending', 'in-progress'...) o en español.
  status?: string | null;
}

export function StatusChip({ status }: StatusChipProps) {
  const meta = STATUS_META[normalizeStatus(status)];
  return (
    <View style={[styles.chip, { backgroundColor: meta.bg }]}>
      <MaterialCommunityIcons name={meta.icon} size={12} color={meta.text} />
      <Text style={[styles.label, { color: meta.text }]}>{meta.label.toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
});
