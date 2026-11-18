import { useColorScheme } from 'react-native';

export interface Theme {
  background: string;
  surface: string;
  text: string;
  muted: string;
  border: string;
  primary: string;
  primaryText: string;
  error: string;
  info: string;
}

const light: Theme = {
  background: '#ffffff',
  surface: '#f4f5f7',
  text: '#14171c',
  muted: '#5b6472',
  border: '#d4d8df',
  primary: '#2456d6',
  primaryText: '#ffffff',
  error: '#b3261e',
  info: '#1d6b3a',
};

const dark: Theme = {
  background: '#0f1115',
  surface: '#1a1d23',
  text: '#f1f3f6',
  muted: '#9aa3b2',
  border: '#343944',
  primary: '#6c94ff',
  primaryText: '#0f1115',
  error: '#ff8a80',
  info: '#7fd39b',
};

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? dark : light;
}
