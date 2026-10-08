import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import { Box, useMediaQuery, useTheme } from "@mui/material";
import Navbar from "./Navbar";
import Sidebar, { DRAWER_WIDTH, COLLAPSED_WIDTH } from "./Sidebar";

interface LayoutProps {
  children?: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("sm"));

  const sidebarWidth = collapsed ? COLLAPSED_WIDTH : DRAWER_WIDTH;

  // Desktop collapses the permanent sidebar; phones open the slide-out drawer.
  const handleMenuClick = () => {
    if (isDesktop) {
      setCollapsed(!collapsed);
    } else {
      setMobileOpen(!mobileOpen);
    }
  };

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "#F5F7FA" }}>
      {/* A button rather than a #fragment link, which the router would treat as navigation. */}
      <Box
        component="button"
        type="button"
        onClick={() => document.getElementById("main-content")?.focus()}
        sx={{
          position: "fixed", top: 8, left: 8, zIndex: (t) => t.zIndex.tooltip + 1,
          px: 2, py: 1.25, border: 0, borderRadius: "8px", cursor: "pointer",
          bgcolor: "var(--accent)", color: "white", font: "inherit", fontSize: 14, fontWeight: 600,
          transform: "translateY(-150%)",
          "&:focus": { transform: "none", outline: "2px solid #1A3C5E", outlineOffset: 2 },
        }}
      >
        Skip to main content
      </Box>
      <Navbar onMenuClick={handleMenuClick} sidebarWidth={sidebarWidth} />
      <Sidebar
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        collapsed={collapsed}
      />
      <Box
        component="main"
        id="main-content"
        tabIndex={-1}
        sx={{
          "&:focus": { outline: "none" },
          flexGrow: 1,
          minWidth: 0,
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