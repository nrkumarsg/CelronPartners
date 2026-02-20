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
function App() {
  return (
    <div className="app-container">
      <Sidebar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/partners" element={<Partners />} />
          <Route path="/partners/:id" element={<PartnerForm />} />
          <Route path="/contacts" element={<ContactsDirectory />} />
          <Route path="/contacts/:id" element={<ContactsForm />} />
          <Route path="/vessels" element={<VesselsDirectory />} />
          <Route path="/vessels/:id" element={<VesselForm />} />
          <Route path="/work-locations" element={<WorkLocationsDirectory />} />
          <Route path="/work-locations/:id" element={<WorkLocationForm />} />
          <Route path="/settings" element={<ModuleSettings />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="*" element={<div style={{ textAlign: 'center', marginTop: '100px' }}><h1>Working on this feature...</h1></div>} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
