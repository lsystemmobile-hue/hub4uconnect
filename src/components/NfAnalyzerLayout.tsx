import { Link, Outlet, useLocation } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutDashboard, Upload, FileText, Settings } from "lucide-react";

export function NfAnalyzerLayout() {
  const location = useLocation();
  
  // Determine active tab based on path
  const getActiveTab = () => {
    const path = location.pathname;
    if (path.includes("/nf-analyzer/dashboard") || path === "/nf-analyzer") return "dashboard";
    if (path.includes("/nf-analyzer/upload")) return "upload";
    if (path.includes("/nf-analyzer/notas")) return "notas";
    if (path.includes("/nf-analyzer/admin")) return "admin";
    return "dashboard";
  };

  return (
    <div className="space-y-6">
      <div className="border-b pb-1">
        <Tabs value={getActiveTab()} className="w-full">
          <TabsList className="h-12 w-full justify-start gap-4 bg-transparent p-0">
            <Link to="/nf-analyzer/dashboard">
              <TabsTrigger 
                value="dashboard" 
                className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-t-lg rounded-b-none h-12 px-6 gap-2 transition-all"
              >
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </TabsTrigger>
            </Link>
            
            <Link to="/nf-analyzer/upload">
              <TabsTrigger 
                value="upload" 
                className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-t-lg rounded-b-none h-12 px-6 gap-2 transition-all"
              >
                <Upload className="h-4 w-4" />
                Upload
              </TabsTrigger>
            </Link>
            
            <Link to="/nf-analyzer/notas">
              <TabsTrigger 
                value="notas" 
                className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-t-lg rounded-b-none h-12 px-6 gap-2 transition-all"
              >
                <FileText className="h-4 w-4" />
                Notas Fiscais
              </TabsTrigger>
            </Link>
            
            <Link to="/nf-analyzer/admin">
              <TabsTrigger 
                value="admin" 
                className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-t-lg rounded-b-none h-12 px-6 gap-2 transition-all"
              >
                <Settings className="h-4 w-4" />
                Administração
              </TabsTrigger>
            </Link>
          </TabsList>
        </Tabs>
      </div>
      
      <div className="min-h-[calc(100vh-200px)]">
        <Outlet />
      </div>
    </div>
  );
}
