import { Link, useLocation } from "react-router";
import { useAuth } from "../../context/AuthContext";

export function Header() {
  const location = useLocation();
  const { user, isLoggedIn } = useAuth();

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  const getFirstName = (name: string) => {
    return name.split(" ")[0];
  };

  return (
    <header className="border-b border-blue-200/50 bg-white/90 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="relative bg-blue-500/10 p-1.5 rounded-lg border border-blue-500/20 flex items-center justify-center shadow-sm">
              <img src="/logo.svg" alt="VeritasAI Logo" className="w-7 h-7 object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="tracking-tight bg-gradient-to-r from-blue-800 to-blue-600 bg-clip-text text-transparent font-bold" style={{ fontSize: '1.25rem', letterSpacing: '-0.02em' }}>
                  Veritas
                </span>
                <span className="tracking-tight text-blue-500 font-bold" style={{ fontSize: '1.25rem' }}>AI</span>
              </div>
              <p className="text-xs text-muted-foreground" style={{ marginTop: '-2px' }}>Credibility Verification Platform</p>
            </div>
          </Link>

          <nav className="flex items-center gap-4 sm:gap-6">
            <Link
              to="/"
              className={`text-sm transition-colors hover:text-blue-600 font-medium ${
                location.pathname === '/' ? 'text-blue-600' : 'text-muted-foreground'
              }`}
            >
              Home
            </Link>
            
            {isLoggedIn ? (
              <>
                <Link
                  to="/verify"
                  className={`text-sm transition-colors hover:text-blue-600 font-medium ${
                    location.pathname === '/verify' ? 'text-blue-600' : 'text-muted-foreground'
                  }`}
                >
                  Verify
                </Link>
                <Link
                  to="/profile"
                  className={`flex items-center gap-2 p-1 pr-3 rounded-full border transition-all shadow-sm ${
                    location.pathname === '/profile'
                      ? 'border-blue-500 bg-blue-50/80 ring-1 ring-blue-500/20'
                      : 'border-blue-200/50 bg-blue-50/40 hover:bg-blue-50 hover:border-blue-300'
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-700 to-blue-500 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                    {user ? getInitials(user.name) : "MM"}
                  </div>
                  <span className="text-xs text-blue-900 font-semibold hidden sm:inline">
                    {user ? getFirstName(user.name) : "Michael"}
                  </span>
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className={`text-sm transition-colors hover:text-blue-600 font-medium ${
                    location.pathname === '/login' ? 'text-blue-600' : 'text-muted-foreground'
                  }`}
                >
                  Log In
                </Link>
                <Link
                  to="/signup"
                  className="px-4 py-2 bg-gradient-to-r from-blue-700 to-blue-500 text-white rounded-lg hover:from-blue-800 hover:to-blue-600 transition-all shadow-sm hover:shadow-md clip-corner-sm text-sm font-medium"
                  style={{
                    clipPath: "polygon(0 4px, 4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%)"
                  }}
                >
                  Sign Up
                </Link>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
