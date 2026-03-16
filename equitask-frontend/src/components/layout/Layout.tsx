import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import { Box } from "@mui/material";
import Navbar from "./Navbar";
import Sidebar, { DRAWER_WIDTH, COLLAPSED_WIDTH } from "./Sidebar";

interface LayoutProps {
  children?: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const sidebarWidth = collapsed ? COLLAPSED_WIDTH : DRAWER_WIDTH;

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "#F5F7FA" }}>
      <Navbar onMenuClick={() => setCollapsed(!collapsed)} />
      <Sidebar
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        collapsed={collapsed}
      />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, md: 3 },
          ml: { sm: `${sidebarWidth}px` },
          mt: "64px",
          minHeight: "calc(100vh - 64px)",
          transition: 'margin-left 0.2s ease',
        }}
      >
        {children || <Outlet />}
      </Box>
    </Box>
  );
};

export default Layout;