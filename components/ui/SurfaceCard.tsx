import React, { PropsWithChildren } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Colors } from '../../constants/Colors';

type SurfaceCardProps = PropsWithChildren<{
  level?: 1 | 2 | 3;
  style?: StyleProp<ViewStyle>;
}>;

const levelStyles: Record<1 | 2 | 3, { backgroundColor: string; borderColor: string; elevation: number }> = {
  1: {
    backgroundColor: Colors.surface,
    borderColor: Colors.outlineVariant,
    elevation: 1,
  },
  2: {
    backgroundColor: Colors.surfaceContainerLow,
    borderColor: Colors.outlineVariant,
    elevation: 2,
  },
  3: {
    backgroundColor: Colors.surfaceContainerHigh,
    borderColor: Colors.outlineVariant,
    elevation: 3,
  },
};

export function SurfaceCard({ children, level = 1, style }: SurfaceCardProps) {
  const variant = levelStyles[level];
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: variant.backgroundColor,
          borderColor: variant.borderColor,
          elevation: variant.elevation,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
});
