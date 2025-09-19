import React, { useState } from 'react';
import { Box, Typography, TextField, Button, Chip, Alert } from '@mui/material';
import { api } from '../context/AuthContext';

interface Client {
  id: string;
  name: string;
  subscriptionStatus?: string;
}

const ReceptionPage: React.FC = () => {
  const [dni, setDni] = useState('');
  const [client, setClient] = useState<Client | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setClient(null);
    try {
      const res = await api.get<Client>(`/clients/by-dni/${dni}`);
      setClient(res.data);
    } catch {
      setError('No se encontró un cliente con ese DNI.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status?: string) => {
    if (status === 'VIGENTE') return 'success';
    if (status === 'PENDIENTE_PAGO') return 'warning';
    if (status === 'VENCIDA') return 'error';
    return 'default';
  };

  return (
    <Box sx={{ maxWidth: 400, mx: 'auto', mt: 8, textAlign: 'center' }}>
      <Typography variant="h4" gutterBottom>
        Ingreso al Gimnasio
      </Typography>
      <form onSubmit={handleCheck}>
        <TextField
          label="Ingrese su DNI"
          value={dni}
          onChange={e => setDni(e.target.value)}
          fullWidth
          required
          sx={{ mb: 2 }}
          inputProps={{ maxLength: 12 }}
        />
        <Button type="submit" variant="contained" disabled={loading}>
          Verificar
        </Button>
      </form>
      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      {client && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h5">
            {client.subscriptionStatus === 'VIGENTE'
              ? `¡Bienvenido/a ${client.name}!`
              : `No puede ingresar.`}
          </Typography>
          <Chip
            label={client.subscriptionStatus || 'Sin suscripción'}
            color={getStatusColor(client.subscriptionStatus)}
            sx={{ mt: 2, fontSize: 18, px: 2, py: 1 }}
            size="medium"
          />
          {client.subscriptionStatus !== 'VIGENTE' && (
            <Typography variant="body1" sx={{ mt: 2 }}>
              Su suscripción está <b>{client.subscriptionStatus}</b>. Por favor, regularice su situación en recepción.
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );
};

export default ReceptionPage;