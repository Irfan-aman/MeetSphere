import { Route, Routes, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import { Login, Signup } from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Meeting from './pages/Meeting';
import Notes from './pages/Notes';
import NotFound from './pages/NotFound';

export default function App() {
  const { pathname } = useLocation();
  const inMeeting = pathname.startsWith('/m/');
  return (
    <>
      {!inMeeting && <Navbar />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/notes/:roomId" element={<ProtectedRoute><Notes /></ProtectedRoute>} />
        <Route path="/m/:roomId" element={<Meeting />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}
