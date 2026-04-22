import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import LandingPage from './pages/LandingPage';
import CreateEvent from './pages/CreateEvent';
import JoinEvent from './pages/JoinEvent';
import CameraView from './pages/CameraView';
import Gallery from './pages/Gallery';
import Dashboard from './pages/Dashboard';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/create" element={<CreateEvent />} />
          <Route path="/join/:eventId" element={<JoinEvent />} />
          <Route path="/camera/:eventId" element={<CameraView />} />
          <Route path="/gallery/:eventId" element={<Gallery />} />
          <Route path="/dashboard/:eventId" element={<Dashboard />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;