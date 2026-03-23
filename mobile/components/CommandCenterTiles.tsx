import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { FontSize, FontWeight, NeoText, Radius, Spacing } from '@/constants/theme';
import type { MotorwayStatus } from '@/lib/traffic-status';

export function CommandCenterTiles({ items }: { items: MotorwayStatus[] }) {
  const router = useRouter();
  const rows = [
    items.slice(0, 2),
    items.slice(2, 4),
  ];

  return (
    <View style={styles.container}>
      {rows.map((row, rowIdx) => (
        <View key={rowIdx} style={styles.row}>
          {row.map((item, colIdx) => {
            const alignRight = item.code === 'M80' || item.code === 'M73';
            return (
            <TouchableOpacity
                key={item.code}
              activeOpacity={0.8}
              style={styles.tile}
              onPress={() => router.push(`/motorway-status/${item.code}`)}
            >
              <ThemedText
                style={[
                  styles.code,
                  alignRight && styles.codeRight,
                ]}
              >
                {item.code}
              </ThemedText>
              <ThemedText
                style={[
                  styles.status,
                  item.hasProblems && styles.statusAlerts,
                  item.hasProblems ? styles.statusProblem : styles.statusOk,
                ]}
                numberOfLines={2}
              >
                {item.hasProblems
                  ? `${item.count} Alert${item.count === 1 ? '' : 's'}`
                  : 'ALL OK'}
              </ThemedText>
              <ThemedText style={styles.meta}>
                Click to view
              </ThemedText>
            </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 0,
    marginTop: 0,
    gap: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  tile: {
    flex: 1,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    backgroundColor: 'rgba(40, 80, 200, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(140, 180, 255, 0.7)',
  },
  code: {
    fontSize: FontSize.body,
    fontWeight: FontWeight.semibold,
    color: '#E5EDFF',
    marginBottom: Spacing.xs,
  },
  codeRight: {
    textAlign: 'right',
  },
  status: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    textAlign: 'center',
  },
  /** Slightly larger than ALL OK for the alert count line */
  statusAlerts: {
    fontSize: FontSize.sm + 3,
  },
  statusOk: {
    color: '#22c55e',
  },
  statusProblem: {
    color: '#f97373',
  },
  meta: {
    marginTop: 2,
    fontSize: FontSize.xs,
    color: NeoText.muted,
    textAlign: 'center',
  },
});

