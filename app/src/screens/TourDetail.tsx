import { t } from '../i18n';
import { navigate } from '../state/appStore';
import { Box } from '../components/ui/box';
import { Text } from '../components/ui/text';
import { Button, ButtonText } from '../components/ui/button';

interface TourDetailProps {
  tourId: string;
}

export function TourDetail({ tourId }: TourDetailProps) {
  return (
    <Box className="flex min-h-screen flex-col p-6 bg-surface">
      <Text className="font-display text-display-md text-ink mb-2">{t('tourDetailHeading')}</Text>
      <Text className="text-body-md text-ink-muted mb-6">{tourId}</Text>
      <Button
        action="primary"
        size="md"
        className="mb-3"
        onPress={() => navigate({ name: 'map', tourId })}
      >
        <ButtonText className="text-primary-foreground">{t('tourDetailOpen')}</ButtonText>
      </Button>
      <Button variant="outline" action="secondary" size="md" onPress={() => navigate({ name: 'shelf' })}>
        <ButtonText>{t('back')}</ButtonText>
      </Button>
    </Box>
  );
}
