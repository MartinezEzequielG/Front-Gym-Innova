import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Stepper, Step, StepLabel, Box, TextField, MenuItem, CircularProgress, Alert
} from '@mui/material';
import { api } from '../context/AuthContext';

const steps = ['Cliente', 'Suscripción', 'Pago'];

export default function QuickRegisterDialog({ open, onClose, onSuccess }: { open: boolean, onClose: () => void, onSuccess: () => void }) {
  const [activeStep, setActiveStep] = useState(0);

  const [clientData, setClientData] = useState({
    name: '',
    dni: '',
    email: '',
    phone: '',
    birthDate: '',
    address: '',
  });
  const [subscriptionData, setSubscriptionData] = useState({ planId: '', startDate: '' });
  const [paymentData, setPaymentData] = useState({ amount: '', method: 'CASH' });

  const [plans, setPlans] = useState<{ id: string; name: string; price: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open && plans.length === 0) {
      api.get('/plans').then(res => setPlans(res.data)).catch(() => setPlans([]));
    }
    if (!open) {
      setActiveStep(0);
      setClientData({
        name: '',
        dni: '',
        email: '',
        phone: '',
        birthDate: '',
        address: '',
      });
      setSubscriptionData({ planId: '', startDate: '' });
      setPaymentData({ amount: '', method: 'CASH' });
      setError('');
    }
  }, [open]);

  useEffect(() => {
    const plan = plans.find(p => p.id === subscriptionData.planId);
    if (plan) setPaymentData(pd => ({ ...pd, amount: plan.price.toString() }));
  }, [subscriptionData.planId, plans]);

  const handleNext = async () => {
    setError('');
    if (activeStep === 0) {
      if (!clientData.name || !clientData.dni || !clientData.email) {
        setError('Completa todos los campos del cliente.');
        return;
      }
      setActiveStep(1);
    } else if (activeStep === 1) {
      if (!subscriptionData.planId || !subscriptionData.startDate) {
        setError('Selecciona un plan y fecha de inicio.');
        return;
      }
      setActiveStep(2);
    } else if (activeStep === 2) {
      if (!paymentData.amount || !paymentData.method) {
        setError('Completa los datos de pago.');
        return;
      }
      setLoading(true);
      try {
        const clientRes = await api.post('/clients', {
          ...clientData,
          birthDate: clientData.birthDate
            ? new Date(clientData.birthDate).toISOString()
            : undefined,
        });
        const clientId = clientRes.data.id;
        const subRes = await api.post('/subscriptions', {
          clientId,
          planId: subscriptionData.planId,
          startDate: new Date(subscriptionData.startDate).toISOString(),
          endDate: (() => {
            const plan = plans.find(p => p.id === subscriptionData.planId);
            if (!plan) return undefined;
            const start = new Date(subscriptionData.startDate);
            start.setDate(start.getDate() + plan.durationDays);
            return start.toISOString();
          })(),
        });
        const subscriptionId = subRes.data.id;
        await api.post('/payments', {
          clientId,
          subscriptionId,
          amount: Number(paymentData.amount),
          method: paymentData.method,
          provider: 'manual',
          status: 'APPROVED',
        });
        setLoading(false);
        onSuccess();
      } catch (err: any) {
        setLoading(false);
        setError('Error al registrar. Verifica los datos.');
      }
    }
  };

  const handleBack = () => setActiveStep(prev => prev - 1);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Alta rápida de cliente</DialogTitle>
      <DialogContent>
        <Stepper activeStep={activeStep} sx={{ mb: 2 }}>
          {steps.map(label => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
        </Stepper>
        <Box>
          {activeStep === 0 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <TextField label="Nombre" value={clientData.name} onChange={e => setClientData(d => ({ ...d, name: e.target.value }))} required />
              <TextField label="DNI" value={clientData.dni} onChange={e => setClientData(d => ({ ...d, dni: e.target.value }))} required />
              <TextField label="Email" value={clientData.email} onChange={e => setClientData(d => ({ ...d, email: e.target.value }))} required />
              <TextField label="Teléfono" value={clientData.phone} onChange={e => setClientData(d => ({ ...d, phone: e.target.value }))} />
              <TextField
                label="Fecha de nacimiento"
                type="date"
                value={clientData.birthDate}
                onChange={e => setClientData(d => ({ ...d, birthDate: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="Dirección"
                value={clientData.address}
                onChange={e => setClientData(d => ({ ...d, address: e.target.value }))}
              />
            </Box>
          )}
          {activeStep === 1 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <TextField
                label="Plan"
                select
                value={subscriptionData.planId}
                onChange={e => setSubscriptionData(d => ({ ...d, planId: e.target.value }))}
                required
              >
                {plans.map(plan => (
                  <MenuItem key={plan.id} value={plan.id}>{plan.name}</MenuItem>
                ))}
              </TextField>
              <TextField
                label="Fecha de inicio"
                type="date"
                value={subscriptionData.startDate}
                onChange={e => setSubscriptionData(d => ({ ...d, startDate: e.target.value }))}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Box>
          )}
          {activeStep === 2 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <TextField
                label="Monto"
                value={paymentData.amount}
                InputProps={{ readOnly: true }}
                required
              />
              <TextField
                label="Método de pago"
                select
                value={paymentData.method}
                onChange={e => setPaymentData(d => ({ ...d, method: e.target.value }))}
                required
              >
                <MenuItem value="CASH">Efectivo</MenuItem>
                <MenuItem value="CARD">Tarjeta</MenuItem>
                <MenuItem value="TRANSFER">Transferencia</MenuItem>
                <MenuItem value="MP">Mercado Pago</MenuItem>
              </TextField>
            </Box>
          )}
          {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
          {loading && <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}><CircularProgress /></Box>}
        </Box>
      </DialogContent>
      <DialogActions>
        {activeStep > 0 && <Button onClick={handleBack} disabled={loading}>Atrás</Button>}
        <Button onClick={handleNext} variant="contained" disabled={loading}>
          {activeStep === steps.length - 1 ? 'Finalizar' : 'Siguiente'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}