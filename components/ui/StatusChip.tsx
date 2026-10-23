import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '../../constants/Colors';
import { Typography } from '../../constants/Typography';

type StatusVariant = 'pending' | 'in-progress' | 'completed';

interface StatusChipProps {
  status: StatusVariant;
  label?: string;
}

const variantMap: Record<StatusVariant, { bg: string; text: string; defaultLabel: string }> = {
  pending: { bg: Colors.tertiaryContainer, text: Colors.onTertiary, defaultLabel: 'Pendiente' },
  'in-progress': { bg: Colors.secondaryContainer, text: Colors.onSecondaryContainer, defaultLabel: 'En proceso' },
  completed: { bg: Colors.primaryContainer, text: Colors.onPrimary, defaultLabel: 'Completado' },
};

export function StatusChip({ status, label }: StatusChipProps) {
  const { bg, text, defaultLabel } = variantMap[status] ?? variantMap.pending;
  return (
    <View style={[styles.chip, { backgroundColor: bg }]}>
      <Text style={[Typography.labelMd, styles.label, { color: text }]}>
        {label ?? defaultLabel}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
});
