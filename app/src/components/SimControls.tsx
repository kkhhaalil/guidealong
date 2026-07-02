import { SIM_SPEEDS, BASE_KMH } from '../engine/constants.ts';
import { t, tFormat } from '../i18n';
import { Button, ButtonText } from './ui/button';
import { Text } from './ui/text';

export interface SimControlsProps {
  speedIndex: number;
  simPaused: boolean;
  mode: 'sim' | 'gps' | null;
  onCycleSpeed: () => void;
  onTogglePause: () => void;
  onSwitchGps: () => void;
  onSwitchSim: () => void;
}

export function SimControls({
  speedIndex,
  simPaused,
  mode,
  onCycleSpeed,
  onTogglePause,
  onSwitchGps,
  onSwitchSim,
}: SimControlsProps) {
  const multiplier = SIM_SPEEDS[speedIndex] ?? 1;
  const kmh = BASE_KMH * multiplier;

  return (
    <div
      className="absolute left-3 top-3 z-chrome flex flex-col gap-2 rounded-card bg-surface/95 p-2 shadow-card"
      data-testid="sim-controls"
    >
      <Text className="text-label-md text-ink px-2" data-testid="mode-badge">
        {mode === 'gps'
          ? t('modeGps')
          : simPaused
            ? t('modeSimPaused')
            : tFormat('modeSim', { speed: String(kmh) })}
      </Text>
      {mode === 'sim' && (
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            action="secondary"
            testID="btn-speed"
            aria-label={t('ariaSpeed')}
            onPress={onCycleSpeed}
          >
            <ButtonText>×{multiplier}</ButtonText>
          </Button>
          <Button
            size="sm"
            action="secondary"
            testID="btn-sim-pause"
            aria-label={simPaused ? t('ariaResumeSim') : t('ariaPauseSim')}
            onPress={onTogglePause}
          >
            <ButtonText>{simPaused ? '▶' : '⏸'}</ButtonText>
          </Button>
          <Button size="sm" variant="outline" testID="btn-switch-gps" onPress={onSwitchGps}>
            <ButtonText>{t('switchGps')}</ButtonText>
          </Button>
        </div>
      )}
      {mode === 'gps' && (
        <Button size="sm" variant="outline" testID="btn-switch-sim" onPress={onSwitchSim}>
          <ButtonText>{t('switchSim')}</ButtonText>
        </Button>
      )}
    </div>
  );
}
