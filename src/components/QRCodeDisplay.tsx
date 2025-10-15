import React from 'react';
import { Box, Typography, Button } from '@mui/material';

interface QRCodeDisplayProps {
  qrCode: string;
  title?: string;
  size?: number;
}

export const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({ 
  qrCode, 
  title = "Código QR", 
  size = 200 
}) => (
  <Box sx={{ textAlign: 'center' }}>
    <Typography variant="body1" sx={{ mb: 2 }}>
      <strong>{title}</strong>
    </Typography>
    <img 
      src={qrCode} 
      alt="QR Code" 
      style={{ 
        maxWidth: `${size}px`, 
        height: 'auto',
        border: '2px solid #ddd',
        borderRadius: '8px'
      }}
    />
    <Box sx={{ mt: 1 }}>
      <Button
        variant="outlined"
        size="small"
        onClick={() => {
          // Crear enlace de descarga
          const link = document.createElement('a');
          link.href = qrCode;
          link.download = 'qr-pago-mercadopago.png';
          link.click();
        }}
      >
        Descargar QR
      </Button>
    </Box>
  </Box>
);