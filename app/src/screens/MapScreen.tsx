import { t } from '../i18n';
import { navigate } from '../state/appStore';
import { Box } from '../components/ui/box';
import { Text } from '../components/ui/text';
import { Button, ButtonText } from '../components/ui/button';

interface MapScreenProps {
  tourId: string;
}

export function MapScreen({ tourId }: MapScreenProps) {
  return (
    <Box className="flex min-h-screen flex-col p-6 bg-surface">
      <Text className="font-display text-display-md text-ink mb-2">{t('mapScreenHeading')}</Text>
      <Text className="text-body-md text-ink-muted mb-6">
        {t('mapScreenPlaceholder')} — {tourId}
      </Text>
      <Button action="secondary" size="md" onPress={() => navigate({ name: 'tour-detail', tourId })}>
        <ButtonText>{t('back')}</ButtonText>
      </Button>
    </Box>
  );
}
