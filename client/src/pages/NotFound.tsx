import { Link } from "react-router-dom";

const NotFound = () => {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <p className="text-6xl mb-4">🏟️</p>
      <h1 className="font-display text-4xl font-bold text-foreground mb-2">404</h1>
      <p className="text-muted-foreground mb-6">This page doesn't exist</p>
      <Link
        to="/"
        className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold"
      >
        Go Home
      </Link>
    </div>
  );
};

export default NotFound;
