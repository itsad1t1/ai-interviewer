import {
  BrowserRouter,
  Routes,
  Route,
  Link
} from "react-router-dom";

import {
  SignedIn,
  SignedOut,
  SignInButton,
  UserButton
} from "@clerk/clerk-react";

import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Interview from "./pages/Interview";

function Navbar() {
  return (
    <nav className="border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/20">
            A
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent tracking-tight">
            Antigravity Interviewer
          </span>
        </Link>
        <span className="hidden sm:inline-block text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
          SaaS Beta
        </span>
      </div>

      <div className="flex items-center gap-4">
        <SignedIn>
          <Link to="/" className="text-sm text-zinc-400 hover:text-white transition">
            Dashboard
          </Link>
          <div className="w-px h-4 bg-zinc-800" />
          <UserButton afterSignOutUrl="/" />
        </SignedIn>

        <SignedOut>
          <SignInButton mode="modal">
            <button className="relative inline-flex items-center justify-center p-0.5 mb-2 me-2 overflow-hidden text-sm font-medium rounded-lg group bg-gradient-to-br from-purple-600 to-blue-500 group-hover:from-purple-600 group-hover:to-blue-500 hover:text-white text-white focus:ring-4 focus:outline-none focus:ring-blue-800 cursor-pointer">
              <span className="relative px-5 py-2 transition-all ease-in duration-75 bg-zinc-950 rounded-md group-hover:bg-opacity-0">
                Sign In
              </span>
            </button>
          </SignInButton>
        </SignedOut>
      </div>
    </nav>
  );
}

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[#09090b] text-white selection:bg-indigo-500/30 selection:text-indigo-200">
        <Navbar />
        <main>
          <Routes>
            <Route
              path="/"
              element={
                <>
                  <SignedIn>
                    <Dashboard />
                  </SignedIn>
                  <SignedOut>
                    <Home />
                  </SignedOut>
                </>
              }
            />
            <Route
              path="/interview"
              element={
                <>
                  <SignedIn>
                    <Interview />
                  </SignedIn>
                  <SignedOut>
                    <Home />
                  </SignedOut>
                </>
              }
            />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;