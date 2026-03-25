import { Stack } from 'expo-router';

import { AdminAccessGate } from '@/components/AdminAccessGate';
import { appStackScreenOptions } from '@/constants/navigation';

export default function AdminLayout() {
  return (
    <AdminAccessGate>
      <Stack screenOptions={appStackScreenOptions} />
    </AdminAccessGate>
  );
}
