import React from 'react';
import { Box, Typography } from '@mui/material';

const drawerWidth = 240;

export const Footer: React.FC = () => (
  <Box
    component="footer"
    sx={{
      position: 'fixed',
      bottom: 0,
      left: { xs: 0, md: `${drawerWidth}px` },
      width: { xs: '100%', md: `calc(100% - ${drawerWidth}px)` },
      bgcolor: 'grey.200',
      py: 2,
      textAlign: 'center',
      zIndex: 1300,
    }}
  >
    <Typography variant="body2" color="text.secondary">
      Innova System Gym
    </Typography>
  </Box>
);