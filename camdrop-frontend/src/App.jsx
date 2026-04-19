import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import JoinEvent from './pages/JoinEvent';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/join/:eventId" element={<JoinEvent />} />
        {/* We will add the Camera and Gallery routes next */}
        <Route path="/camera/:eventId" element={<div className="text-white p-10">Camera coming next...</div>} />
        <Route path="/" element={<div className="text-white p-10">Welcome to CamDrop. Scan a QR code to join an event.</div>} />
      </Routes>
    </Router>
  );
}

export default App;