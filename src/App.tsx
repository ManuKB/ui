import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Toaster } from '@/components/ui/toast';
import { Dashboard } from '@/pages/Dashboard';
import { AssetsPage } from '@/pages/Assets';
import { RecurringPage } from '@/pages/Recurring';
import { PendingPage } from '@/pages/Pending';
import { SystemPage } from '@/pages/System';
import { SettingsPage } from '@/pages/Settings';
import { NotFound } from '@/pages/NotFound';

export function App() {
  return (
    <>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/assets" element={<AssetsPage />} />
          <Route path="/recurring" element={<RecurringPage />} />
          <Route path="/pending" element={<PendingPage />} />
          <Route path="/system" element={<SystemPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/404" element={<NotFound />} />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Routes>
      </Layout>
      <Toaster />
    </>
  );
}
