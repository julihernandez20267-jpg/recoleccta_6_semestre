import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { containerStatusMeta, normalizeStatus, STATUS_META } from '../../constants/Reports';

type ChipMeta = {
  label: string;
  bg: string;
  text: string;
  icon: ComponentProps<typeof MaterialCommunityIcons>['name'];
};

export function MetaChip({ meta }: { meta: ChipMeta }) {
  return (
    <View style={[styles.chip, { backgroundColor: meta.bg }]}>
      <MaterialCommunityIcons name={meta.icon} size={12} color={meta.text} />
      <Text style={[styles.label, { color: meta.text }]}>{meta.label.toUpperCase()}</Text>
    </View>
  );
}

// Acepta el estado tal como llega del backend ('pending', 'in-progress'...) o en español.
export function StatusChip({ status }: { status?: string | null }) {
  return <MetaChip meta={STATUS_META[normalizeStatus(status)]} />;
}

export function ContainerStatusChip({ status }: { status?: string | null }) {
  return <MetaChip meta={containerStatusMeta(status)} />;
}

// Etiqueta para las solicitudes de comercios, que se atienden primero.
export function PriorityBadge({ businessName }: { businessName?: string | null }) {
  return (
    <View style={styles.priority}>
      <MaterialCommunityIcons name="storefront-outline" size={12} color="#7a3e00" />
      <Text style={styles.priorityText} numberOfLines={1}>
        {businessName ? `${businessName} · Prioridad` : 'Comercio · Prioridad'}
      </Text>
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
  priority: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    alignSelf: 'flex-start',
    backgroundColor: '#ffe3c2',
    maxWidth: '100%',
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7a3e00',
    flexShrink: 1,
  },
});
