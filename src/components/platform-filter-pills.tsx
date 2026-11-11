import { Pressable, ScrollView } from 'react-native';

import { Text } from '@/components/ui/text';
import type { PlatformFilter } from '@/lib/post-filters';

const FILTERS: { value: PlatformFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'x', label: 'X' },
  { value: 'threads', label: 'Threads' },
  { value: 'reddit', label: 'Reddit' },
];

/** Pilules de filtre par plateforme sous le titre de All posts (refonte, décision 1). */
export function PlatformFilterPills({
  value,
  onChange,
}: {
  value: PlatformFilter;
  onChange: (value: PlatformFilter) => void;
}) {
  return (
    // Défile à l'horizontale : six pilules ne tiennent pas sur un écran étroit.
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="grow-0"
      contentContainerClassName="gap-1.5 px-5 pb-2"
      accessibilityRole="tablist">
      {FILTERS.map((f) => {
        const active = f.value === value;
        return (
          <Pressable
            key={f.value}
            onPress={() => onChange(f.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            className={`rounded-full px-3 py-2 ${active ? 'bg-primary' : 'bg-pill'}`}>
            <Text className={`text-[12.5px] font-medium ${active ? 'text-primary-foreground' : ''}`}>
              {f.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
