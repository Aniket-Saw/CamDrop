import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import JoinEvent from './pages/JoinEvent';
import CameraView from './pages/CameraView';
import Gallery from './pages/Gallery';
import Dashboard from './pages/Dashboard';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/join/:eventId" element={<JoinEvent />} />
        <Route path="/camera/:eventId" element={<CameraView />} />
        <Route path="/gallery/:eventId" element={<Gallery />} />
        <Route path="/dashboard/:eventId" element={<Dashboard />} />
      </Routes>
    </Router>
  );
}

export default App;