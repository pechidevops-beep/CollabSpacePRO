import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Link } from "react-router-dom";
import NotificationBell from "@/components/NotificationBell";

import logoWings from "@/assets/logo-wings.png";

const AppLayout = () => {
  return (
    <div className="dark">
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <AppSidebar />
          <div className="flex-1 flex flex-col">
            <header className="h-14 flex items-center gap-3 border-b border-border px-4 bg-card/50 backdrop-blur-sm">
              <SidebarTrigger />
              <Link to="/dashboard" className="flex items-center gap-2">
                <img src={logoWings} alt="CollabSpace Logo" className="h-8 w-8 object-contain" />
                <span className="font-semibold text-sm text-foreground">CollabSpace</span>
              </Link>
              <div className="flex-1" />
              <NotificationBell />
            </header>
            <main className="flex-1 p-6 overflow-auto">
              <Outlet />
            </main>
          </div>
        </div>
      </SidebarProvider>
    </div>
  );
};

export default AppLayout;

