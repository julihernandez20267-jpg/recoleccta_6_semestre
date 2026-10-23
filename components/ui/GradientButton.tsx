import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleProp, StyleSheet, Text, TouchableOpacity, ViewStyle } from 'react-native';
import { Colors } from '../../constants/Colors';
import { Typography } from '../../constants/Typography';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

type GradientButtonProps = {
  label: string;
  onPress: () => void;
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
};

export function GradientButton({ label, onPress, icon, style, disabled }: GradientButtonProps) {
  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={style} disabled={disabled}>
      <LinearGradient
        colors={disabled ? ['#e0e2db', '#d2d4cd'] : [Colors.primary, Colors.secondary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.button}
      >
        {icon ? <MaterialCommunityIcons name={icon} size={20} color={disabled ? Colors.onSurfaceVariant : Colors.onPrimary} /> : null}
        <Text style={[Typography.titleSm, styles.label, disabled && { color: Colors.onSurfaceVariant }]}>{label}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  label: {
    color: Colors.onPrimary,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
