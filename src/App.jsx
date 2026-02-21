import { Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Partners from './pages/Partners';
import PartnerForm from './pages/PartnerForm';
import ContactsForm from './pages/ContactsForm';
import ContactsDirectory from './pages/ContactsDirectory';
import VesselsDirectory from './pages/VesselsDirectory';
import VesselForm from './pages/VesselForm';
import ModuleSettings from './pages/ModuleSettings';
import Reports from './pages/Reports';
import WorkLocationsDirectory from './pages/WorkLocationsDirectory';
import WorkLocationForm from './pages/WorkLocationForm';
import CatalogDirectory from './pages/CatalogDirectory';
import CatalogForm from './pages/CatalogForm';
import WorkflowBoard from './pages/workflows/WorkflowBoard';
import UniversalFinder from './pages/workflows/UniversalFinder';

// Authentication & RBAC Components
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/auth/Login';
import SignUp from './pages/auth/SignUp';
import ForgotPassword from './pages/auth/ForgotPassword';
import Unauthorized from './pages/auth/Unauthorized';
import UserManagement from './pages/UserManagement';

// App Layout wrapper to only show sidebar when logged in
const AppLayout = ({ children }) => {
  const { user } = useAuth();

  // Auth routes shouldn't show the main layout
  if (!user) {
    return children;
  }

  return (
    <div className="app-container">
      <Sidebar />
      <main className="main-content">
        {children}
      </main>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public Authentication Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/unauthorized" element={<Unauthorized />} />

        {/* Protected Application Layout and Routes */}
        <Route path="*" element={
          <AppLayout>
            <Routes>
              {/* Base Dashboard (Accessible if logged in and active, handled by wildcard ProtectedRoute) */}
              <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />

              {/* User Management (Superadmins & Admins only) */}
              <Route path="/admin/users" element={
                <ProtectedRoute>
                  <UserManagement />
                </ProtectedRoute>
              } />

              {/* Partners Module */}
              <Route path="/partners" element={<ProtectedRoute requiredModule="partners"><Partners /></ProtectedRoute>} />
              <Route path="/partners/:id" element={<ProtectedRoute requiredModule="partners"><PartnerForm /></ProtectedRoute>} />

              {/* Contacts Module */}
              <Route path="/contacts" element={<ProtectedRoute requiredModule="contacts"><ContactsDirectory /></ProtectedRoute>} />
              <Route path="/contacts/:id" element={<ProtectedRoute requiredModule="contacts"><ContactsForm /></ProtectedRoute>} />

              {/* Vessels Module */}
              <Route path="/vessels" element={<ProtectedRoute requiredModule="vessels"><VesselsDirectory /></ProtectedRoute>} />
              <Route path="/vessels/:id" element={<ProtectedRoute requiredModule="vessels"><VesselForm /></ProtectedRoute>} />

              {/* Work Locations Module */}
              <Route path="/work-locations" element={<ProtectedRoute requiredModule="work-locations"><WorkLocationsDirectory /></ProtectedRoute>} />
              <Route path="/work-locations/:id" element={<ProtectedRoute requiredModule="work-locations"><WorkLocationForm /></ProtectedRoute>} />

              {/* Catalog Module */}
              <Route path="/catalog" element={<ProtectedRoute requiredModule="catalog"><CatalogDirectory /></ProtectedRoute>} />
              <Route path="/catalog/:id" element={<ProtectedRoute requiredModule="catalog"><CatalogForm /></ProtectedRoute>} />

              {/* Workflows & Universal Finder Module */}
              <Route path="/workflows" element={<ProtectedRoute><WorkflowBoard /></ProtectedRoute>} />
              <Route path="/workflows/finder" element={<ProtectedRoute><UniversalFinder /></ProtectedRoute>} />

              {/* Reports */}
              <Route path="/reports" element={<ProtectedRoute requiredModule="reports"><Reports /></ProtectedRoute>} />

              {/* Settings */}
              <Route path="/settings" element={<ProtectedRoute requiredModule="settings"><ModuleSettings /></ProtectedRoute>} />

              {/* Fallback */}
              <Route path="*" element={<div style={{ textAlign: 'center', marginTop: '100px' }}><h1>Working on this feature...</h1></div>} />
            </Routes>
          </AppLayout>
        } />
      </Routes>
    </AuthProvider>
  );
}

export default App;
