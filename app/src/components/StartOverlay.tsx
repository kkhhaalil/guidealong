import { t } from '../i18n';
import { Box } from './ui/box';
import { Text } from './ui/text';
import { Button, ButtonText } from './ui/button';

export interface StartOverlayProps {
  hasResume: boolean;
  onStartSim: () => void;
  onStartGps: () => void;
  onResume: () => void;
  onReset: () => void;
}

export function StartOverlay({ hasResume, onStartSim, onStartGps, onResume, onReset }: StartOverlayProps) {
  return (
    <Box
      className="fixed inset-0 z-[2000] flex flex-col items-center justify-center bg-surface/95 p-6"
      data-testid="start-overlay"
    >
      <Text className="font-display text-display-md text-ink mb-2 text-center">{t('startTitle')}</Text>
      <Text className="text-body-md text-ink-muted mb-8 text-center max-w-sm">{t('startSubtitle')}</Text>

      <div className="flex w-full max-w-sm flex-col gap-3">
        {hasResume && (
          <Button action="primary" size="lg" testID="btn-resume" onPress={onResume}>
            <ButtonText className="text-primary-foreground">{t('resumeTour')}</ButtonText>
          </Button>
        )}
        <Button action="primary" size="lg" testID="btn-start-sim" onPress={onStartSim}>
          <ButtonText className="text-primary-foreground">{t('startSim')}</ButtonText>
        </Button>
        <Button variant="outline" action="secondary" size="lg" testID="btn-start-gps" onPress={onStartGps}>
          <ButtonText>{t('startGps')}</ButtonText>
        </Button>
        {hasResume && (
          <Button variant="link" action="secondary" size="md" testID="btn-reset" onPress={onReset}>
            <ButtonText>{t('resetTour')}</ButtonText>
          </Button>
        )}
      </div>
    </Box>
  );
}
