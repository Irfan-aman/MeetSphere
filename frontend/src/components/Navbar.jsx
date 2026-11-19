import { Link, NavLink, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import Logo from './Logo';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const account = user && !user.guest;
  return (
    <header className="nav">
      <div className="container nav-inner">
        <Link to="/" className="brand" aria-label="MeetSphere home">
          <Logo />
          <span>MeetSphere</span>
        </Link>
        <nav className="nav-links" aria-label="Main">
          {account ? (
            <>
              <NavLink to="/dashboard">Dashboard</NavLink>
              <span className="nav-user">{user.name}</span>
              <button className="btn btn-ghost btn-sm" onClick={() => { logout(); nav('/'); }}>
                <LogOut size={16} /> Sign out
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login">Sign in</NavLink>
              <Link to="/signup" className="btn btn-primary btn-sm">Create account</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
