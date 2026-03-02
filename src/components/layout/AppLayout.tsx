import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Code2 } from "lucide-react";
import { Link } from "react-router-dom";

const AppLayout = () => {
  return (
    <div className="dark">
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <AppSidebar />
          <div className="flex-1 flex flex-col">
            <header className="h-14 flex items-center gap-3 border-b border-border px-4 bg-card/50 backdrop-blur-sm">
              <SidebarTrigger />
              <Link to="/" className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-md bg-primary flex items-center justify-center">
                  <Code2 className="h-3.5 w-3.5 text-primary-foreground" />
                </div>
                <span className="font-semibold text-sm text-foreground">CollabSpace</span>
              </Link>
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
