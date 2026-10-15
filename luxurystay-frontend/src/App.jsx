import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import ProtectedRoute from './components/ProtectedRoute';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}
import AppShell from './layouts/AppShell';
import LoginPage from './pages/LoginPage';
import MyStayPage from './pages/public/MyStayPage';

// Public pages
import TheHousePage      from './pages/public/TheHousePage';
import SuitesPage        from './pages/public/SuitesPage';
import ContactPage       from './pages/public/ContactPage';
import ReservePage       from './pages/public/ReservePage';
import ConfirmationPage  from './pages/public/ConfirmationPage';
import GuestSettingsPage from './pages/public/GuestSettingsPage';

// Ops
import DashboardPage    from './pages/DashboardPage';
import ReservationsPage from './pages/ReservationsPage';
import CheckInPage      from './pages/CheckInPage';
import RoomsPage        from './pages/RoomsPage';
import HousekeepingPage from './pages/HousekeepingPage';
import MaintenancePage       from './pages/MaintenancePage';
import ServiceRequestsPage   from './pages/ServiceRequestsPage';

// Commerce
import BillingPage       from './pages/BillingPage';
import GuestsPage        from './pages/GuestsPage';
import FeedbackPage      from './pages/FeedbackPage';
import ContactInboxPage  from './pages/ContactInboxPage';

// Admin
import AnalyticsPage   from './pages/AnalyticsPage';
import SuitesAdminPage from './pages/SuitesAdminPage';
import StaffPage       from './pages/StaffPage';

const ADMIN_MGR = ['admin', 'manager'];
const DESK      = ['admin', 'manager', 'receptionist'];
const ALL_STAFF = ['admin', 'manager', 'receptionist', 'housekeeping', 'service'];

export default function App() {
  return (
    <>
    <ScrollToTop />
    <Routes>
      {/* ── Fully public ─────────────────────────────────────────────── */}
      <Route path="/"        element={<TheHousePage />} />
      <Route path="/suites"  element={<SuitesPage />} />
      <Route path="/contact" element={<ContactPage />} />
      <Route
        path="/book"
        element={
          <ProtectedRoute roles={['guest']}>
            <ReservePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/confirm"
        element={
          <ProtectedRoute roles={['guest']}>
            <ConfirmationPage />
          </ProtectedRoute>
        }
      />
      <Route path="/login"   element={<LoginPage />} />

      {/* ── Guest portal — standalone (no staff sidebar) ─────────────── */}
      <Route
        path="/guest"
        element={
          <ProtectedRoute roles={['guest']}>
            <MyStayPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/guest/settings"
        element={
          <ProtectedRoute roles={['guest']}>
            <GuestSettingsPage />
          </ProtectedRoute>
        }
      />

      {/* ── Staff panel — AppShell wraps all ops routes ───────────────── */}
      <Route element={<ProtectedRoute roles={ALL_STAFF}><AppShell /></ProtectedRoute>}>

        {/* Operations */}
        <Route path="/dashboard"    element={<ProtectedRoute roles={DESK}        pageLabel="Dashboard"        ><DashboardPage /></ProtectedRoute>} />
        <Route path="/reservations" element={<ProtectedRoute roles={DESK}        pageLabel="Reservations"     ><ReservationsPage /></ProtectedRoute>} />
        <Route path="/checkin"      element={<ProtectedRoute roles={DESK}        pageLabel="Check-in / out"   ><CheckInPage /></ProtectedRoute>} />
        <Route path="/rooms"        element={<ProtectedRoute roles={ALL_STAFF}   pageLabel="Rooms"            ><RoomsPage /></ProtectedRoute>} />
        <Route path="/housekeeping" element={<ProtectedRoute roles={['admin','manager','housekeeping']} pageLabel="Housekeeping"     ><HousekeepingPage /></ProtectedRoute>} />
        <Route path="/maintenance"  element={<ProtectedRoute roles={['admin','manager','housekeeping','service']}><MaintenancePage /></ProtectedRoute>} />
        <Route path="/services"     element={<ProtectedRoute roles={['admin','manager','housekeeping','service']} pageLabel="Service Requests"><ServiceRequestsPage /></ProtectedRoute>} />

        {/* Commerce */}
        <Route path="/billing"  element={<ProtectedRoute roles={DESK}      pageLabel="Billing"      ><BillingPage /></ProtectedRoute>} />
        <Route path="/guests"   element={<ProtectedRoute roles={DESK}      pageLabel="Guests"       ><GuestsPage /></ProtectedRoute>} />
        <Route path="/feedback" element={<ProtectedRoute roles={ADMIN_MGR} pageLabel="Feedback"     ><FeedbackPage /></ProtectedRoute>} />
        <Route path="/inbox"    element={<ProtectedRoute roles={DESK}      pageLabel="Inbox"        ><ContactInboxPage /></ProtectedRoute>} />

        {/* Administration */}
        <Route path="/analytics"   element={<ProtectedRoute roles={ALL_STAFF}   pageLabel="Analytics"    ><AnalyticsPage /></ProtectedRoute>} />
        <Route path="/suite-types" element={<ProtectedRoute roles={ALL_STAFF}   pageLabel="Suites"       ><SuitesAdminPage /></ProtectedRoute>} />
        <Route path="/staff"       element={<ProtectedRoute roles={ALL_STAFF}   pageLabel="Staff & Roles"><StaffPage /></ProtectedRoute>} />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </>
  );
}
