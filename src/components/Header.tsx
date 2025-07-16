import { Button } from "@/components/ui/button";
import { BarChart3, Database, Upload, MessageSquare, TrendingUp, LogOut, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Link, useLocation } from "react-router-dom";

export const Header = () => {
  const location = useLocation();
  const { user, signOut } = useAuth();

  // Don't render header on auth page
  if (location.pathname === '/auth') {
    return null;
  }

  return (
    <header className="bg-slate-900 border-b border-slate-800">
      <div className="container mx-auto px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-8 h-8 bg-blue-600 rounded-lg">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">
                FlowBeast
              </h1>
              <p className="text-slate-400 text-xs">Options Flow Research</p>
            </div>
          </div>
          
          <nav className="flex items-center space-x-2">
            {user ? (
              <>
                <div className="flex items-center space-x-2 text-sm text-slate-400 mr-4">
                  <User className="w-4 h-4" />
                  <span>{user.email}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={signOut} className="text-slate-400 hover:text-white">
                  <LogOut className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <Link to="/auth">
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                  Sign In
                </Button>
              </Link>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
};