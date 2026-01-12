import React from 'react';
import { AppBar, Toolbar, Typography, IconButton, Box, Avatar } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  onMenuClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const { user } = useAuth();

  const safeUser = user as unknown as {
    name?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
  } | null;

  const displayName =
    safeUser?.name ??
    [safeUser?.firstName, safeUser?.lastName].filter(Boolean).join(' ') ??
    safeUser?.email ??
    '';

  const initial = displayName ? displayName.charAt(0).toUpperCase() : '';

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        zIndex: (theme) => theme.zIndex.drawer + 1,
        background: 'linear-gradient(90deg, #1976d2 0%, #42a5f5 100%)',
        boxShadow: '0 2px 8px rgba(33, 150, 243, 0.15)',
        borderBottomLeftRadius: 16,
        borderBottomRightRadius: 16,
      }}
    >
      <Toolbar sx={{ minHeight: 72, px: 3 }}>
        <IconButton
          color="inherit"
          aria-label="open drawer"
          edge="start"
          onClick={onMenuClick}
          sx={{ mr: 2, display: { md: 'none' } }}
        >
          <MenuIcon />
        </IconButton>
        <Typography
          variant="h5"
          noWrap
          sx={{
            flexGrow: 1,
            fontWeight: 700,
            letterSpacing: 2,
            fontFamily: 'Montserrat, sans-serif',
            color: '#fff',
          }}
        >
          Innova Sistem Gym
        </Typography>
        {user && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Avatar sx={{ bgcolor: '#fff', color: '#1976d2', width: 40, height: 40, fontWeight: 700 }}>
              {initial}
            </Avatar>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#fff', fontFamily: 'Montserrat, sans-serif' }}>
              {displayName}
            </Typography>
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
};