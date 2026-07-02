import type { LocaleKey, LocaleStrings } from './strings.zh-CN';
import { strings } from './strings.zh-CN';

export type { LocaleKey };

export function t(key: LocaleKey): string {
  return strings[key];
}

export function tFormat(key: LocaleKey, vars: Record<string, string | number>): string {
  let value: string = strings[key];
  for (const [name, replacement] of Object.entries(vars)) {
    value = value.replace(new RegExp(`\\{${name}\\}`, 'g'), String(replacement));
  }
  return value;
}

export type { LocaleStrings };
