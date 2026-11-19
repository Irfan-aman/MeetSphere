import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <main className="center-screen">
      <div className="empty">
        <h1>Page not found</h1>
        <p>The page you’re looking for doesn’t exist or has moved.</p>
        <Link to="/" className="btn btn-primary">Back to home</Link>
      </div>
    </main>
  );
}
