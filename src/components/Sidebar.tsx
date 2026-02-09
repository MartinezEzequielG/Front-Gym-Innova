import React, { useMemo, useState } from 'react';
import {
  Drawer,
  Toolbar,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  ListItemIcon,
  Divider,
  Box,
  IconButton,
  Collapse,
  Tooltip,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';

import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import GroupIcon from '@mui/icons-material/Group';
import PaymentIcon from '@mui/icons-material/Payment';
import SubscriptionsIcon from '@mui/icons-material/Subscriptions';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import MenuOpenIcon from '@mui/icons-material/MenuOpen';
import MenuIcon from '@mui/icons-material/Menu';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import BusinessIcon from '@mui/icons-material/Business';
import PointOfSaleIcon from '@mui/icons-material/PointOfSale';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';

import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

const DRAWER_WIDTH = 240;
const DRAWER_COLLAPSED = 72;

interface SidebarProps {
  mobileOpen: boolean;
  handleDrawerToggle: () => void;
}

const navItems = [
  { label: 'Panel', icon: <DashboardIcon />, path: '/dashboard' },
  { label: 'Socios', icon: <PeopleIcon />, path: '/members' },
  { label: 'Pagos', icon: <PaymentIcon />, path: '/payments' },
  { label: 'Caja', icon: <PointOfSaleIcon />, path: '/cash' },
  { label: 'Suscripciones', icon: <SubscriptionsIcon />, path: '/subscriptions' },
  { label: 'Planes', icon: <FitnessCenterIcon />, path: '/plans' },
  { label: 'Sucursales', icon: <BusinessIcon />, path: '/branches' },
  { label: 'Usuarios', icon: <GroupIcon />, path: '/users' },
  { label: 'Configuración', icon: <SettingsIcon />, path: '/settings' },
];

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, handleDrawerToggle }) => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [collapsed, setCollapsed] = useState(false);
  const [receptionOpen, setReceptionOpen] = useState(false);

  const drawerWidth = collapsed ? DRAWER_COLLAPSED : DRAWER_WIDTH;

  const isActive = (path: string) => location.pathname === path;

  const handleNavigate = (path: string) => {
    navigate(path);
    if (mobileOpen) handleDrawerToggle();
  };

  const itemSx = useMemo(
    () => ({
      borderRadius: 2,
      mx: 1,
      my: 0.25,
      px: collapsed ? 1.25 : 1.5,
      py: 1.1,
      minHeight: 44,
      '& .MuiListItemIcon-root': {
        minWidth: 44,
        justifyContent: 'center',
      },
      '&:hover': {
        backgroundColor: alpha('#FFD600', 0.10),
      },
    }),
    [collapsed]
  );

  const selectedSx = useMemo(
    () => ({
      backgroundColor: alpha('#FFD600', 0.14),
      '&:hover': { backgroundColor: alpha('#FFD600', 0.18) },
      position: 'relative',
      '&::before': {
        content: '""',
        position: 'absolute',
        left: 0,
        top: 8,
        bottom: 8,
        width: 4,
        borderRadius: 8,
        backgroundColor: '#FFD600',
      },
      '& .MuiListItemText-primary': { fontWeight: 900 },
    }),
    []
  );

  const drawerContent = (
    <Box
      sx={{
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: '#111',
        color: alpha('#fff', 0.92),
        overflow: 'hidden', // clave: el scroll va en el contenedor interno
      }}
    >
      {/* Top / Brand area */}
      <Toolbar
        sx={{
          px: collapsed ? 1 : 2,
          gap: 1,
          justifyContent: collapsed ? 'center' : 'space-between',
          flexShrink: 0,
        }}
      >
        {!collapsed && (
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontWeight: 900, color: '#fff', lineHeight: 1.1 }} noWrap>
              Acero Gym
            </Typography>
            <Typography variant="caption" sx={{ color: alpha('#FFD600', 0.9), fontWeight: 800 }} noWrap>
              Menú
            </Typography>
          </Box>
        )}

        <Tooltip title={collapsed ? 'Expandir menú' : 'Colapsar menú'}>
          <IconButton
            onClick={() => setCollapsed(v => !v)}
            sx={{
              color: '#FFD600',
              borderRadius: 2.5,
              border: `1px solid ${alpha('#FFD600', 0.22)}`,
              backgroundColor: alpha('#fff', 0.06),
              '&:hover': { backgroundColor: alpha('#fff', 0.10) },
            }}
            aria-label={collapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
          >
            {collapsed ? <MenuIcon /> : <MenuOpenIcon />}
          </IconButton>
        </Tooltip>
      </Toolbar>

      <Divider sx={{ borderColor: alpha('#FFD600', 0.18), flexShrink: 0 }} />

      {/* ✅ SCROLL AREA: nav + recepción */}
      <Box
        sx={{
          flex: 1,
          minHeight: 0, // importantísimo para que overflow funcione en flex
          overflowY: 'auto',
          overflowX: 'hidden',
          py: 1,
          '&::-webkit-scrollbar': { width: 8 },
          '&::-webkit-scrollbar-thumb': {
            bgcolor: alpha('#FFD600', 0.25),
            borderRadius: 8,
          },
          '&::-webkit-scrollbar-thumb:hover': {
            bgcolor: alpha('#FFD600', 0.35),
          },
        }}
      >
        <List sx={{ py: 0 }}>
          {navItems.map(item => {
            const active = isActive(item.path);
            const button = (
              <ListItemButton
                onClick={() => handleNavigate(item.path)}
                selected={active}
                sx={{
                  ...itemSx,
                  ...(active ? selectedSx : null),
                }}
              >
                <ListItemIcon sx={{ color: active ? '#FFD600' : alpha('#fff', 0.82) }}>
                  {item.icon}
                </ListItemIcon>

                {!collapsed && (
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{ noWrap: true, sx: { fontWeight: active ? 900 : 700 } }}
                  />
                )}
              </ListItemButton>
            );

            return (
              <ListItem key={item.label} disablePadding sx={{ display: 'block' }}>
                {collapsed ? (
                  <Tooltip title={item.label} placement="right">
                    {button}
                  </Tooltip>
                ) : (
                  button
                )}
              </ListItem>
            );
          })}

          {/* Recepción */}
          <ListItem disablePadding sx={{ display: 'block', mt: 0.5 }}>
            {collapsed ? (
              <Tooltip title="Recepción" placement="right">
                <ListItemButton
                  onClick={() => {
                    // En modo rail, más UX abrir directo la pestaña
                    window.open(`${window.location.origin}/reception`, '_blank', 'noopener,noreferrer');
                  }}
                  sx={itemSx}
                >
                  <ListItemIcon sx={{ color: alpha('#fff', 0.82) }}>
                    <MeetingRoomIcon />
                  </ListItemIcon>
                </ListItemButton>
              </Tooltip>
            ) : (
              <>
                <ListItemButton onClick={() => setReceptionOpen(v => !v)} sx={itemSx}>
                  <ListItemIcon sx={{ color: alpha('#fff', 0.82) }}>
                    <MeetingRoomIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary="Recepción"
                    primaryTypographyProps={{ sx: { fontWeight: 800 } }}
                  />
                  {receptionOpen ? <ExpandLess /> : <ExpandMore />}
                </ListItemButton>

                <Collapse in={receptionOpen} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding sx={{ mt: 0.25 }}>
                    <ListItem disablePadding sx={{ display: 'block' }}>
                      <ListItemButton
                        sx={{
                          ...itemSx,
                          ml: 2,
                          mr: 1,
                          backgroundColor: alpha('#fff', 0.04),
                          '&:hover': { backgroundColor: alpha('#FFD600', 0.10) },
                        }}
                        onClick={e => {
                          e.stopPropagation();
                          window.open(`${window.location.origin}/reception`, '_blank', 'noopener,noreferrer');
                          if (mobileOpen) handleDrawerToggle();
                        }}
                      >
                        <ListItemIcon sx={{ color: alpha('#fff', 0.82) }}>
                          <OpenInNewIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText primary="Abrir Recepción en nueva pestaña" />
                      </ListItemButton>
                    </ListItem>
                  </List>
                </Collapse>
              </>
            )}
          </ListItem>
        </List>
      </Box>

      {/* ✅ BOTTOM ACTIONS: siempre visible */}
      <Box
        sx={{
          flexShrink: 0,
          px: 1,
          pb: 1,
          pt: 1,
          borderTop: `1px solid ${alpha('#FFD600', 0.14)}`,
          backgroundColor: alpha('#111', 0.98),
        }}
      >
        <List disablePadding>
          <ListItem disablePadding sx={{ display: 'block' }}>
            {collapsed ? (
              <Tooltip title="Cerrar sesión" placement="right">
                <ListItemButton
                  onClick={logout}
                  sx={{
                    ...itemSx,
                    backgroundColor: alpha('#fff', 0.04),
                    '&:hover': { backgroundColor: alpha('#b91c1c', 0.20) },
                  }}
                >
                  <ListItemIcon sx={{ color: alpha('#fff', 0.88) }}>
                    <LogoutIcon />
                  </ListItemIcon>
                </ListItemButton>
              </Tooltip>
            ) : (
              <ListItemButton
                onClick={logout}
                sx={{
                  ...itemSx,
                  backgroundColor: alpha('#fff', 0.04),
                  '&:hover': { backgroundColor: alpha('#b91c1c', 0.20) },
                }}
              >
                <ListItemIcon sx={{ color: alpha('#fff', 0.88) }}>
                  <LogoutIcon />
                </ListItemIcon>
                <ListItemText primary="Cerrar sesión" primaryTypographyProps={{ sx: { fontWeight: 800 } }} />
              </ListItemButton>
            )}
          </ListItem>
        </List>
      </Box>
    </Box>
  );

  return (
    <>
      {/* Desktop */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          width: drawerWidth,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: {
            width: drawerWidth,
            boxSizing: 'border-box',
            borderRight: `1px solid ${alpha('#FFD600', 0.14)}`,
            overflowX: 'hidden',
            transition: 'width 180ms ease',
          },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Mobile */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          [`& .MuiDrawer-paper`]: {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            borderRight: `1px solid ${alpha('#FFD600', 0.14)}`,
          },
        }}
      >
        {/* En mobile no conviene collapsed: forzá expandido si querés */}
        {drawerContent}
      </Drawer>
    </>
  );
};
