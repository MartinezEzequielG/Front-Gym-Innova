import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stepper,
  Step,
  StepLabel,
  Box,
  TextField,
  MenuItem,
  CircularProgress,
  Alert,
} from '@mui/material';
import { api } from '../context/AuthContext';

const steps = ['Cliente', 'Suscripción', 'Pago'];

type Branch = {
  id: string;
  name: string;
};

type Plan = {
  id: string;
  name: string;
  price: number;
  durationDays: number;
  branchId: string;
};

export default function QuickRegisterDialog({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [activeStep, setActiveStep] = useState(0);

  const [clientData, setClientData] = useState({
    name: '',
    dni: '',
    email: '',
    phone: '',
    birthDate: '',
    address: '',
  });

  // ahora la sucursal se elige explícitamente
  const [subscriptionData, setSubscriptionData] = useState({
    branchId: '',
    planId: '',
    startDate: '',
  });

  const [paymentData, setPaymentData] = useState({ amount: '', method: 'CASH' });

  const [branches, setBranches] = useState<Branch[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const plansForBranch = useMemo(() => {
    if (!subscriptionData.branchId) return [];
    return plans.filter((p) => p.branchId === subscriptionData.branchId);
  }, [plans, subscriptionData.branchId]);

  useEffect(() => {
    if (open) {
      Promise.all([api.get<Branch[]>('/branches'), api.get<Plan[]>('/plans')])
        .then(([b, p]) => {
          setBranches(b.data);
          setPlans(p.data);
        })
        .catch(() => {
          setBranches([]);
          setPlans([]);
        });
    }

    if (!open) {
      setActiveStep(0);
      setClientData({ name: '', dni: '', email: '', phone: '', birthDate: '', address: '' });
      setSubscriptionData({ branchId: '', planId: '', startDate: '' });
      setPaymentData({ amount: '', method: 'CASH' });
      setError('');
      setLoading(false);
    }
  }, [open]);

  useEffect(() => {
    const plan = plans.find((p) => p.id === subscriptionData.planId);
    if (plan) setPaymentData((pd) => ({ ...pd, amount: plan.price.toString() }));
  }, [subscriptionData.planId, plans]);

  const handleNext = async () => {
    if (loading) return; // evita doble submit
    setError('');

    if (activeStep === 0) {
      if (!clientData.name || !clientData.dni || !clientData.email) {
        setError('Completa todos los campos del cliente.');
        return;
      }
      setActiveStep(1);
      return;
    }

    if (activeStep === 1) {
      if (!subscriptionData.branchId) {
        setError('Selecciona una sucursal.');
        return;
      }
      if (!subscriptionData.planId || !subscriptionData.startDate) {
        setError('Selecciona un plan y fecha de inicio.');
        return;
      }

      const plan = plans.find((p) => p.id === subscriptionData.planId);
      if (!plan) {
        setError('Plan inválido.');
        return;
      }
      if (plan.branchId !== subscriptionData.branchId) {
        setError('El plan seleccionado no pertenece a la sucursal elegida.');
        return;
      }

      setActiveStep(2);
      return;
    }

    // Paso pago
    if (!paymentData.amount || !paymentData.method) {
      setError('Completa los datos de pago.');
      return;
    }

    const plan = plans.find((p) => p.id === subscriptionData.planId);
    if (!plan) {
      setError('Plan inválido.');
      return;
    }

    setLoading(true);
    try {
      const provider = paymentData.method === 'MP' ? 'mercadopago' : 'manual';

      await api.post('/clients/quick-register', {
        client: {
          ...clientData,
          dni: String(clientData.dni).trim(),
          birthDate: clientData.birthDate || undefined, // "YYYY-MM-DD"
        },
        planId: plan.id,
        branchId: subscriptionData.branchId,
        startDate: subscriptionData.startDate, // "YYYY-MM-DD"
        payment: {
          amount: Number(paymentData.amount),
          method: paymentData.method,
          provider,
          status: 'APPROVED',
          type: 'SUBSCRIPTION',
          currency: 'ARS',
        },
      });

      setLoading(false);
      onSuccess();
    } catch (err: any) {
      setLoading(false);
      const msg = err?.response?.data?.message ?? err?.message ?? 'Error al registrar. Verifica los datos.';
      setError(Array.isArray(msg) ? msg.join(' - ') : String(msg));
    }
  };

  const handleBack = () => setActiveStep((prev) => prev - 1);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Alta rápida de cliente</DialogTitle>
      <DialogContent>
        <Stepper activeStep={activeStep} sx={{ mb: 2 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        <Box>
          {activeStep === 0 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <TextField label="Nombre" value={clientData.name} onChange={(e) => setClientData((d) => ({ ...d, name: e.target.value }))} required />
              <TextField label="DNI" value={clientData.dni} onChange={(e) => setClientData((d) => ({ ...d, dni: e.target.value }))} required />
              <TextField label="Email" value={clientData.email} onChange={(e) => setClientData((d) => ({ ...d, email: e.target.value }))} required />
              <TextField label="Teléfono" value={clientData.phone} onChange={(e) => setClientData((d) => ({ ...d, phone: e.target.value }))} />
              <TextField
                label="Fecha de nacimiento"
                type="date"
                value={clientData.birthDate}
                onChange={(e) => setClientData((d) => ({ ...d, birthDate: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
              <TextField label="Dirección" value={clientData.address} onChange={(e) => setClientData((d) => ({ ...d, address: e.target.value }))} />
            </Box>
          )}

          {activeStep === 1 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <TextField
                label="Sucursal"
                select
                value={subscriptionData.branchId}
                onChange={(e) =>
                  setSubscriptionData((d) => ({
                    ...d,
                    branchId: e.target.value,
                    planId: '', // reset plan al cambiar sucursal
                  }))
                }
                required
              >
                {branches.map((b) => (
                  <MenuItem key={b.id} value={b.id}>
                    {b.name}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                label="Plan"
                select
                value={subscriptionData.planId}
                onChange={(e) => setSubscriptionData((d) => ({ ...d, planId: e.target.value }))}
                required
                disabled={!subscriptionData.branchId}
              >
                {plansForBranch.map((plan) => (
                  <MenuItem key={plan.id} value={plan.id}>
                    {plan.name}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                label="Fecha de inicio"
                type="date"
                value={subscriptionData.startDate}
                onChange={(e) => setSubscriptionData((d) => ({ ...d, startDate: e.target.value }))}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Box>
          )}

          {activeStep === 2 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <TextField label="Monto" value={paymentData.amount} InputProps={{ readOnly: true }} required />
              <TextField
                label="Método de pago"
                select
                value={paymentData.method}
                onChange={(e) => setPaymentData((d) => ({ ...d, method: e.target.value }))}
                required
              >
                <MenuItem value="CASH">Efectivo</MenuItem>
                <MenuItem value="CARD">Tarjeta</MenuItem>
                <MenuItem value="TRANSFER">Transferencia</MenuItem>
                <MenuItem value="MP">Mercado Pago</MenuItem>
              </TextField>
            </Box>
          )}

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <CircularProgress />
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        {activeStep > 0 && (
          <Button onClick={handleBack} disabled={loading}>
            Atrás
          </Button>
        )}
        <Button onClick={handleNext} variant="contained" disabled={loading}>
          {activeStep === steps.length - 1 ? 'Finalizar' : 'Siguiente'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}