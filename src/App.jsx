import { Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Partners from './pages/Partners';
import PartnerForm from './pages/PartnerForm';
import ContactsForm from './pages/ContactsForm';
import ContactsDirectory from './pages/ContactsDirectory';
import VesselsDirectory from './pages/VesselsDirectory';
import VesselForm from './pages/VesselForm';
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
          <Route path="*" element={<div style={{ textAlign: 'center', marginTop: '100px' }}><h1>Working on this feature...</h1></div>} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
