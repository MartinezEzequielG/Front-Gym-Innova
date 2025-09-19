import React, { useState } from 'react';
import {
  Drawer, Toolbar, List, ListItem, ListItemText, ListItemButton,
  ListItemIcon, Divider, Box, IconButton
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import GroupIcon from '@mui/icons-material/Group';
import PaymentIcon from '@mui/icons-material/Payment';
import SubscriptionsIcon from '@mui/icons-material/Subscriptions';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import MenuIcon from '@mui/icons-material/Menu';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom'; // Puedes usar otro icono si prefieres
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

const drawerWidth = 240;

interface SidebarProps {
  mobileOpen: boolean;
  handleDrawerToggle: () => void;
}

const navItems = [
  { label: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
  { label: 'Members', icon: <PeopleIcon />, path: '/members' },
  { label: 'Users', icon: <GroupIcon />, path: '/users' },
  { label: 'Payments', icon: <PaymentIcon />, path: '/payments' },
  { label: 'Subscriptions', icon: <SubscriptionsIcon />, path: '/subscriptions' },
  { label: 'Plans', icon: <FitnessCenterIcon />, path: '/plans' },
  { label: 'Settings', icon: <SettingsIcon />, path: '/settings' },
  { label: 'Recepción', icon: <MeetingRoomIcon />, path: '/reception' }, // <-- NUEVO
];

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, handleDrawerToggle }) => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [hidden, setHidden] = useState(false);

  const handleNavigate = (path: string) => {
    navigate(path);
    handleDrawerToggle();
  };

  const drawerContent = (
    <Box
      sx={{
        height: '100%',
        bgcolor: 'primary.main',
        color: 'primary.contrastText',
        display: 'flex',
        flexDirection: 'column',
        p: 0,
        width: drawerWidth,
      }}
    >
      <Toolbar
        sx={{
          justifyContent: 'flex-end',
          px: 2,
          display: { xs: 'none', md: 'flex' },
        }}
      >
        <IconButton
          onClick={() => setHidden(true)}
          sx={{ color: 'primary.contrastText' }}
        >
          <MenuIcon /> {/* botón para ocultar el sidebar */}
        </IconButton>
      </Toolbar>
      <List sx={{ flexGrow: 1 }}>
        {navItems.map(item => (
          <ListItem
            key={item.label}
            disablePadding
            sx={{
              bgcolor: location.pathname === item.path ? 'primary.dark' : 'inherit',
              '&:hover': { bgcolor: 'primary.light' },
              transition: 'background 0.2s',
            }}
          >
            <ListItemButton
              onClick={() => handleNavigate(item.path)}
              sx={{
                color: 'inherit',
                py: 1.5,
                px: 3,
              }}
              selected={location.pathname === item.path}
            >
              <ListItemIcon sx={{ color: 'inherit', minWidth: 0, justifyContent: 'center' }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      <Divider sx={{ bgcolor: 'primary.light', my: 1 }} />
      <List>
        <ListItem disablePadding>
          <ListItemButton
            onClick={logout}
            sx={{
              color: 'inherit',
              py: 1.5,
              px: 3,
              '&:hover': { bgcolor: 'error.main', color: 'common.white' },
            }}
          >
            <ListItemIcon sx={{ color: 'inherit', minWidth: 0, justifyContent: 'center' }}>
              <LogoutIcon />
            </ListItemIcon>
            <ListItemText primary="Logout" />
          </ListItemButton>
        </ListItem>
      </List>
    </Box>
  );

  return (
    <>
      {!hidden && (
        <Drawer
          variant="permanent"
          sx={{
            width: drawerWidth,
            flexShrink: 0,
            [`& .MuiDrawer-paper`]: {
              width: drawerWidth,
              boxSizing: 'border-box',
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              transition: 'width 0.2s',
              overflowX: 'hidden',
            },
            display: { xs: 'none', md: 'block' },
          }}
        >
          {drawerContent}
        </Drawer>
      )}

      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          [`& .MuiDrawer-paper`]: {
            width: drawerWidth,
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            transition: 'width 0.2s',
            overflowX: 'hidden',
          },
        }}
      >
        <Box
          sx={{
            height: '100%',
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            display: 'flex',
            flexDirection: 'column',
            p: 0,
            width: drawerWidth,
          }}
        >
          <Toolbar />
          <List sx={{ flexGrow: 1 }}>
            {navItems.map(item => (
              <ListItem
                key={item.label}
                disablePadding
                sx={{
                  bgcolor: location.pathname === item.path ? 'primary.dark' : 'inherit',
                  '&:hover': { bgcolor: 'primary.light' },
                  transition: 'background 0.2s',
                }}
              >
                <ListItemButton
                  onClick={() => handleNavigate(item.path)}
                  sx={{
                    color: 'inherit',
                    py: 1.5,
                    px: 3,
                  }}
                  selected={location.pathname === item.path}
                >
                  <ListItemIcon sx={{ color: 'inherit', minWidth: 0, justifyContent: 'center' }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText primary={item.label} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
          <Divider sx={{ bgcolor: 'primary.light', my: 1 }} />
          <List>
            <ListItem disablePadding>
              <ListItemButton
                onClick={logout}
                sx={{
                  color: 'inherit',
                  py: 1.5,
                  px: 3,
                  '&:hover': { bgcolor: 'error.main', color: 'common.white' },
                }}
              >
                <ListItemIcon sx={{ color: 'inherit', minWidth: 0, justifyContent: 'center' }}>
                  <LogoutIcon />
                </ListItemIcon>
                <ListItemText primary="Logout" />
              </ListItemButton>
            </ListItem>
          </List>
        </Box>
      </Drawer>

      {hidden && (
        <IconButton
          onClick={() => setHidden(false)}
          sx={{
            position: 'fixed',
            top: 16,
            left: 16,
            zIndex: 1300,
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            '&:hover': { bgcolor: 'primary.dark' },
          }}
        >
          <MenuIcon />
        </IconButton>
      )}
    </>
  );
};
