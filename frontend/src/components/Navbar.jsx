import { Link, useLocation } from "react-router";
import useAuthUser from "../hooks/useAuthUser";
import { BellIcon, LogOutIcon, ShipWheelIcon, MenuIcon, HomeIcon, XIcon } from "lucide-react";
import ThemeSelector from "./ThemeSelector";
import useLogout from "../hooks/useLogout";
import { useState } from "react";

const Navbar = () => {
  const { authUser } = useAuthUser();
  const location = useLocation();
  const currentPath = location.pathname;
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const { logoutMutation } = useLogout();

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  return (
    <>
      <nav className="bg-base-200 border-b border-base-300 sticky top-0 z-30 h-16 flex items-center">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between w-full">
            {/* LEFT SIDE - MOBILE MENU + LOGO */}
            <div className="flex items-center gap-3">
              {/* MOBILE MENU BUTTON - Only show on small screens */}
              <button
                className="btn btn-ghost btn-circle lg:hidden"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                <MenuIcon className="h-6 w-6" />
              </button>

              {/* LOGO - hide on desktop to avoid double branding with sidebar */}
              <Link to="/" className="flex items-center gap-2 lg:hidden">
                <ShipWheelIcon className="size-8 sm:size-9 text-primary" />
                <span className="hidden sm:inline text-2xl sm:text-3xl font-bold font-mono bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary tracking-wider">
                  Linguae
                </span>
              </Link>
            </div>

            {/* RIGHT SIDE - ACTIONS */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* HOME BUTTONS - Mobile and Desktop */}
              <Link to="/" className="btn btn-ghost btn-circle lg:hidden" aria-label="Go home">
                <HomeIcon className="h-5 w-5 text-base-content opacity-70" />
              </Link>
              <Link to="/" className="btn btn-ghost btn-circle hidden lg:inline-flex" aria-label="Go home">
                <HomeIcon className="h-5 w-5 sm:h-6 sm:w-6 text-base-content opacity-70" />
              </Link>

              <Link to="/notifications">
                <button className="btn btn-ghost btn-circle">
                  <BellIcon className="h-5 w-5 sm:h-6 sm:w-6 text-base-content opacity-70" />
                </button>
              </Link>

              <ThemeSelector />

              <div className="avatar">
                <div className="w-8 sm:w-9 rounded-full">
                  <img src={authUser?.profilePic} alt="User Avatar" rel="noreferrer" />
                </div>
              </div>

              {/* Logout button */}
              <button className="btn btn-ghost btn-circle" onClick={logoutMutation}>
                <LogOutIcon className="h-5 w-5 sm:h-6 sm:w-6 text-base-content opacity-70" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* MOBILE MENU DRAWER */}
      {isMobileMenuOpen && (
        <>
          {/* BACKDROP */}
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={closeMobileMenu}
          />

          {/* DRAWER */}
          <div className="fixed top-0 left-0 h-full w-64 bg-base-200 z-50 lg:hidden shadow-xl">
            <div className="flex flex-col h-full">
              {/* DRAWER HEADER */}
              <div className="p-5 border-b border-base-300 flex items-center justify-between">
                <Link to="/" className="flex items-center gap-2.5" onClick={closeMobileMenu}>
                  <ShipWheelIcon className="size-9 text-primary" />
                  <span className="text-2xl font-bold font-mono bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary tracking-wider">
                    Linguae
                  </span>
                </Link>
                <button
                  className="btn btn-ghost btn-sm btn-circle"
                  onClick={closeMobileMenu}
                >
                  <XIcon className="h-5 w-5" />
                </button>
              </div>

              {/* NAVIGATION */}
              <nav className="flex-1 p-4 space-y-1">
                <Link
                  to="/"
                  className={`btn btn-ghost justify-start w-full gap-3 px-3 normal-case ${
                    currentPath === "/" ? "btn-active" : ""
                  }`}
                  onClick={closeMobileMenu}
                >
                  <HomeIcon className="size-5 text-base-content opacity-70" />
                  <span>Home</span>
                </Link>

                <Link
                  to="/notifications"
                  className={`btn btn-ghost justify-start w-full gap-3 px-3 normal-case ${
                    currentPath === "/notifications" ? "btn-active" : ""
                  }`}
                  onClick={closeMobileMenu}
                >
                  <BellIcon className="size-5 text-base-content opacity-70" />
                  <span>Notifications</span>
                </Link>

                {currentPath === "/" && (
                  <button
                    className="btn btn-outline btn-sm w-full justify-start gap-2"
                    onClick={() => {
                      closeMobileMenu();
                      setTimeout(() => {
                        const el = document.getElementById("meet-learners-mobile");
                        if (el) el.scrollIntoView({ behavior: "smooth" });
                      }, 50);
                    }}
                  >
                    <span className="text-xs">Meet New Learners</span>
                  </button>
                )}
              </nav>

              {/* USER PROFILE SECTION */}
              <div className="p-4 border-t border-base-300 mt-auto">
                <div className="flex items-center gap-3">
                  <div className="avatar">
                    <div className="w-10 rounded-full">
                      <img src={authUser?.profilePic} alt="User Avatar" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{authUser?.fullName}</p>
                    <p className="text-xs text-success flex items-center gap-1">
                      <span className="size-2 rounded-full bg-success inline-block" />
                      Online
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};
export default Navbar;
