import React from 'react';
import { Box, Typography } from '@mui/material';

export const Footer: React.FC = () => (
  <Box
    component="footer"
    sx={{
      mt: 'auto',
      width: '100%',
      bgcolor: 'grey.200',
      py: 2,
      textAlign: 'center',
    }}
  >
    <Typography variant="body2" color="text.secondary">
      Innova System Gym
    </Typography>
  </Box>
);