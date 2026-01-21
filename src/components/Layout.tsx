import React from 'react';
import { Box, CssBaseline, Toolbar } from '@mui/material';
import { Header } from './Header';
import { Sidebar } from '../components/Sidebar';
import { Footer } from './Footer';

export const Layout = ({ children }: { children: React.ReactNode }) => {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <CssBaseline />
      <Header onMenuClick={handleDrawerToggle} />
      <Sidebar mobileOpen={mobileOpen} handleDrawerToggle={handleDrawerToggle} />
      <Box component="main" sx={{ flexGrow: 1, p: 0 }}>
        <Toolbar />
        {children}
        <Footer />
      </Box>
    </Box>
  );
};