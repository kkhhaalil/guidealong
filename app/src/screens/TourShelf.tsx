import { t } from '../i18n';
import { navigate } from '../state/appStore';
import { Box } from '../components/ui/box';
import { Text } from '../components/ui/text';
import { Button, ButtonText } from '../components/ui/button';

export function TourShelf() {
  return (
    <Box className="flex min-h-screen flex-col p-6 bg-surface">
      <Text className="font-display text-display-lg text-ink mb-2">{t('appTitle')}</Text>
      <Text className="text-body-md text-ink-muted mb-8">{t('appSubtitle')}</Text>
      <Text className="text-title-md text-ink mb-4">{t('tourShelfHeading')}</Text>
      <Button
        action="primary"
        size="lg"
        className="bg-primary rounded-poster"
        onPress={() => navigate({ name: 'tour-detail', tourId: 'demo' })}
        testID="demo-button"
      >
        <ButtonText className="text-primary-foreground text-body-lg">{t('demoButton')}</ButtonText>
      </Button>
    </Box>
  );
}
