import React, { useEffect, useMemo, useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Box,
  Avatar,
  Tooltip,
  Menu,
  MenuItem,
  Divider,
  Badge,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import { alpha } from '@mui/material/styles';

import MenuIcon from '@mui/icons-material/Menu';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import RefreshIcon from '@mui/icons-material/Refresh';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import VerifiedUserOutlinedIcon from '@mui/icons-material/VerifiedUserOutlined';

import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  onMenuClick: () => void;
  onRefreshClick?: () => void;
  notificationsCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  onMenuClick,
  onRefreshClick,
  notificationsCount = 0,
}) => {
  const { user } = useAuth();

  const safeUser = user as unknown as {
    name?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    role?: string | null;
    picture?: string | null;
  } | null;

  const displayName =
    safeUser?.name ??
    [safeUser?.firstName, safeUser?.lastName].filter(Boolean).join(' ') ??
    safeUser?.email ??
    '';

  const initial = displayName ? displayName.charAt(0).toUpperCase() : '';
  const role = (safeUser?.role ?? '').toString();

  // Sucursal (reactiva ante cambios)
  const [branchName, setBranchName] = useState<string>('');
  useEffect(() => {
    const read = () => {
      try {
        setBranchName(localStorage.getItem('lastSelectedBranchName') ?? '');
      } catch {
        setBranchName('');
      }
    };
    read();
    const onBranchChanged = () => read();
    window.addEventListener('branch:changed', onBranchChanged);
    return () => window.removeEventListener('branch:changed', onBranchChanged);
  }, []);

  // Menú usuario
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const openMenu = Boolean(anchorEl);
  const handleOpenMenu = (e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget);
  const handleCloseMenu = () => setAnchorEl(null);

  const iconBtnSx = useMemo(
    () => ({
      color: alpha('#FFD600', 0.92),
      borderRadius: 2,
      '&:hover': { backgroundColor: alpha('#FFD600', 0.10) },
    }),
    []
  );

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        zIndex: (theme) => theme.zIndex.drawer + 1,
        backgroundColor: '#0B0B0B',
        borderBottom: `1px solid ${alpha('#FFD600', 0.18)}`,
        color: '#fff',
      }}
    >
      <Toolbar sx={{ minHeight: 64, px: { xs: 1, md: 2 }, gap: 1 }}>
        {/* Burger (mobile) */}
        <IconButton
          aria-label="open drawer"
          edge="start"
          onClick={onMenuClick}
          sx={{ display: { md: 'none' }, ...iconBtnSx }}
        >
          <MenuIcon />
        </IconButton>

        {/* Brand (sin icono) */}
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography
            variant="subtitle1"
            noWrap
            sx={{
              fontWeight: 900,
              letterSpacing: 0.6,
              color: '#FFD600',
              lineHeight: 1.1,
            }}
          >
            Innova
          </Typography>
          <Typography
            variant="caption"
            noWrap
            sx={{
              color: alpha('#fff', 0.78),
              letterSpacing: 1.6,
              fontWeight: 700,
              textTransform: 'uppercase',
            }}
          >
            Sistema Gestión
          </Typography>
        </Box>

        {/* Actions minimal */}
        {onRefreshClick && (
          <Tooltip title="Actualizar">
            <IconButton onClick={onRefreshClick} sx={iconBtnSx}>
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}

        <Tooltip title="Notificaciones">
          <IconButton sx={iconBtnSx}>
            <Badge
              badgeContent={notificationsCount}
              overlap="circular"
              invisible={notificationsCount <= 0}
              sx={{
                '& .MuiBadge-badge': {
                  backgroundColor: '#FFD600',
                  color: '#0B0B0B',
                  fontWeight: 900,
                },
              }}
            >
              <NotificationsNoneIcon fontSize="small" />
            </Badge>
          </IconButton>
        </Tooltip>

        {/* User */}
        {user && (
          <Tooltip title={displayName || 'Cuenta'}>
            <IconButton onClick={handleOpenMenu} sx={{ p: 0, ml: 0.5 }}>
              <Avatar
                src={safeUser?.picture ?? undefined}
                sx={{
                  width: 34,
                  height: 34,
                  bgcolor: alpha('#FFD600', 0.16),
                  color: '#FFD600',
                  fontWeight: 900,
                  border: `1px solid ${alpha('#FFD600', 0.28)}`,
                }}
              >
                {initial}
              </Avatar>
            </IconButton>
          </Tooltip>
        )}

        <Menu
          anchorEl={anchorEl}
          open={openMenu}
          onClose={handleCloseMenu}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          PaperProps={{
            elevation: 0,
            sx: {
              mt: 1,
              borderRadius: 2.5,
              minWidth: 240,
              overflow: 'hidden',
              backgroundColor: '#0F0F0F',
              color: '#fff',
              border: `1px solid ${alpha('#FFD600', 0.14)}`,
              boxShadow: '0 18px 48px rgba(0,0,0,0.45)',
              '& .MuiListItemIcon-root': { color: alpha('#FFD600', 0.9) },
            },
          }}
        >
          <Box sx={{ px: 2, py: 1.25 }}>
            <Typography sx={{ fontWeight: 900 }} noWrap>
              {displayName || 'Usuario'}
            </Typography>
            <Typography variant="caption" sx={{ color: alpha('#fff', 0.70) }} noWrap>
              {safeUser?.email ?? ''}
            </Typography>
          </Box>

          {(branchName || role) && (
            <>
              <Divider sx={{ borderColor: alpha('#FFD600', 0.12) }} />
              {branchName && (
                <MenuItem disabled sx={{ opacity: 1 }}>
                  <ListItemIcon>
                    <BusinessOutlinedIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary={branchName} />
                </MenuItem>
              )}
              {role && (
                <MenuItem disabled sx={{ opacity: 1 }}>
                  <ListItemIcon>
                    <VerifiedUserOutlinedIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary={role} />
                </MenuItem>
              )}
            </>
          )}

          <Divider sx={{ borderColor: alpha('#FFD600', 0.12) }} />

          <MenuItem onClick={handleCloseMenu}>
            <ListItemIcon>
              <PersonOutlineIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Mi perfil" />
          </MenuItem>

          <MenuItem onClick={handleCloseMenu}>
            <ListItemIcon>
              <SettingsOutlinedIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Configuración" />
          </MenuItem>

          <Divider sx={{ borderColor: alpha('#FFD600', 0.12) }} />

          <MenuItem
            onClick={() => {
              handleCloseMenu();
              // logout?.();
            }}
            sx={{ color: alpha('#fff', 0.92) }}
          >
            <ListItemIcon sx={{ color: alpha('#FFD600', 0.9) }}>
              <LogoutIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Cerrar sesión" />
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
};