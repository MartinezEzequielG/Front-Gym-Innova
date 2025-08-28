import React from 'react';
import { Box, Typography } from '@mui/material';

export const Footer: React.FC = () => (
  <Box
    component="footer"
    sx={{
      width: '100%',
      position: 'fixed',
      bottom: 0,
      left: 0,
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