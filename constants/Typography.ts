import { TextStyle } from 'react-native';

const base: TextStyle = {
  fontFamily: 'System',
};

export const Typography: Record<string, TextStyle> = {
  displayLg: { ...base, fontSize: 40, lineHeight: 46, fontWeight: '800' },
  displayMd: { ...base, fontSize: 32, lineHeight: 38, fontWeight: '800' },
  displaySm: { ...base, fontSize: 26, lineHeight: 32, fontWeight: '700' },
  headlineMd: { ...base, fontSize: 24, lineHeight: 30, fontWeight: '700' },
  headlineSm: { ...base, fontSize: 20, lineHeight: 26, fontWeight: '700' },
  titleMd: { ...base, fontSize: 17, lineHeight: 22, fontWeight: '700' },
  titleSm: { ...base, fontSize: 15, lineHeight: 20, fontWeight: '600' },
  bodyMd: { ...base, fontSize: 14, lineHeight: 20, fontWeight: '400' },
  bodySm: { ...base, fontSize: 12, lineHeight: 18, fontWeight: '400' },
  labelLg: { ...base, fontSize: 12, lineHeight: 16, fontWeight: '600' },
  labelMd: { ...base, fontSize: 11, lineHeight: 16, fontWeight: '600' },
  labelSm: { ...base, fontSize: 10, lineHeight: 14, fontWeight: '600' },
};
