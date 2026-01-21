import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Paper,
  Stack,
  TextField,
  Typography,
  CircularProgress,
} from '@mui/material';

type Status = 'idle' | 'loading' | 'success' | 'error';

type CashRegister = {
  id: string;
  branchId: string;
  status: 'OPEN' | 'CLOSED';
  openedAt: string;
  closedAt?: string | null;
  businessDate: string;
  notes?: string | null;
};

type Expected = {
  expected: { CASH: number; CARD: number; TRANSFER: number; OTHER: number };
};

function money(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n || 0);
}

export function CashPanel({ branchId }: { branchId: string }) {
  const apiBase = useMemo(() => String((import.meta as any).env?.VITE_API_URL ?? '').replace(/\/$/, ''), []);

  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);

  const [cash, setCash] = useState<CashRegister | null>(null);
  const [expected, setExpected] = useState<Expected | null>(null);

  // Open form
  const [openCash, setOpenCash] = useState(0);
  const [openCard, setOpenCard] = useState(0);
  const [openTransfer, setOpenTransfer] = useState(0);
  const [openOther, setOpenOther] = useState(0);

  // Close form
  const [countCash, setCountCash] = useState(0);
  const [countCard, setCountCard] = useState(0);
  const [countTransfer, setCountTransfer] = useState(0);
  const [countOther, setCountOther] = useState(0);

  const loading = status === 'loading';

  const fetchOpen = async () => {
    setStatus('loading');
    setError(null);
    setExpected(null);

    try {
      if (!apiBase) throw new Error('Falta VITE_API_URL');
      if (!branchId) {
        setCash(null);
        setStatus('success');
        return;
      }

      const res = await fetch(`${apiBase}/cash/open?branchId=${encodeURIComponent(branchId)}`, {
        credentials: 'include',
        headers: { Accept: 'application/json' },
      });

      if (!res.ok) throw new Error(await res.text());

      const json = await res.json();
      setCash(json ?? null);

      // Si hay caja abierta, traemos esperado
      if (json?.id) {
        const e = await fetch(`${apiBase}/cash/${json.id}/expected`, {
          credentials: 'include',
          headers: { Accept: 'application/json' },
        });
        if (e.ok) setExpected(await e.json());
      }

      setStatus('success');
    } catch (e) {
      setStatus('error');
      setError(e instanceof Error ? e.message : 'Error desconocido');
    }
  };

  useEffect(() => {
    fetchOpen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);

  const open = async () => {
    setStatus('loading');
    setError(null);

    try {
      const today = new Date();
      const businessDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

      const res = await fetch(`${apiBase}/cash/open`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          branchId,
          businessDate,
          opening: { cash: openCash, card: openCard, transfer: openTransfer, other: openOther },
          notes: 'Apertura',
        }),
      });

      if (!res.ok) throw new Error(await res.text());
      await fetchOpen();
    } catch (e) {
      setStatus('error');
      setError(e instanceof Error ? e.message : 'Error desconocido');
    }
  };

  const close = async () => {
    if (!cash?.id) return;

    setStatus('loading');
    setError(null);

    try {
      const res = await fetch(`${apiBase}/cash/${cash.id}/close`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          countedCash: countCash,
          countedCard: countCard,
          countedTransfer: countTransfer,
          countedOther: countOther,
          notes: 'Cierre',
        }),
      });

      if (!res.ok) throw new Error(await res.text());
      await fetchOpen();
    } catch (e) {
      setStatus('error');
      setError(e instanceof Error ? e.message : 'Error desconocido');
    }
  };

  return (
    <Paper
      variant="outlined"
      sx={{
        borderRadius: 4,
        borderColor: 'rgba(0,0,0,0.08)',
        boxShadow: '0 14px 40px rgba(0,0,0,0.06)',
        overflow: 'hidden',
      }}
    >
      <Box sx={{ p: { xs: 2, md: 2.5 } }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" gap={2}>
          <Stack spacing={0.25}>
            <Typography variant="h6" sx={{ fontWeight: 900 }}>
              Caja
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Apertura / cierre del día y arqueo por método de pago.
            </Typography>
          </Stack>

          <Stack direction="row" gap={1} alignItems="center">
            {loading && <CircularProgress size={18} />}
            <Button onClick={fetchOpen} disabled={!branchId || loading} sx={{ textTransform: 'none', fontWeight: 800 }}>
              Actualizar
            </Button>
          </Stack>
        </Stack>

        {!branchId && (
          <Alert severity="info" sx={{ mt: 2, borderRadius: 3 }}>
            Seleccioná una sucursal para operar la caja.
          </Alert>
        )}

        {status === 'error' && (
          <Alert severity="error" sx={{ mt: 2, borderRadius: 3 }}>
            {error}
          </Alert>
        )}

        <Divider sx={{ my: 2 }} />

        {branchId && (
          <>
            <Stack direction="row" gap={1} alignItems="center" sx={{ mb: 2 }}>
              <Chip
                label={cash?.status === 'OPEN' ? 'Caja abierta' : 'Caja cerrada / no abierta'}
                color={cash?.status === 'OPEN' ? 'success' : 'default'}
                sx={{ fontWeight: 900, borderRadius: 999 }}
              />
              {cash?.status === 'OPEN' && expected?.expected && (
                <Chip
                  label={`Esperado efectivo: ${money(expected.expected.CASH)}`}
                  sx={{ fontWeight: 900, borderRadius: 999 }}
                />
              )}
            </Stack>

            {/* Si NO hay caja abierta -> formulario de apertura */}
            {!cash || cash.status !== 'OPEN' ? (
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 900, mb: 1 }}>
                  Abrir caja
                </Typography>

                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' },
                    gap: 1.5,
                    mb: 2,
                  }}
                >
                  <TextField label="Efectivo" type="number" value={openCash} onChange={(e) => setOpenCash(Number(e.target.value))} />
                  <TextField label="Tarjeta" type="number" value={openCard} onChange={(e) => setOpenCard(Number(e.target.value))} />
                  <TextField label="Transferencia" type="number" value={openTransfer} onChange={(e) => setOpenTransfer(Number(e.target.value))} />
                  <TextField label="Otros" type="number" value={openOther} onChange={(e) => setOpenOther(Number(e.target.value))} />
                </Box>

                <Button
                  variant="contained"
                  onClick={open}
                  disabled={loading}
                  sx={{ textTransform: 'none', fontWeight: 900, borderRadius: 2.5 }}
                >
                  Abrir caja
                </Button>
              </Box>
            ) : (
              // Caja abierta -> cierre
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 900, mb: 1 }}>
                  Cerrar caja (arqueo)
                </Typography>

                {expected?.expected && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Esperado: CASH {money(expected.expected.CASH)} · CARD {money(expected.expected.CARD)} · TRANSFER{' '}
                      {money(expected.expected.TRANSFER)} · OTHER {money(expected.expected.OTHER)}
                    </Typography>
                  </Box>
                )}

                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' },
                    gap: 1.5,
                    mb: 2,
                  }}
                >
                  <TextField label="Contado efectivo" type="number" value={countCash} onChange={(e) => setCountCash(Number(e.target.value))} />
                  <TextField label="Contado tarjeta" type="number" value={countCard} onChange={(e) => setCountCard(Number(e.target.value))} />
                  <TextField label="Contado transferencia" type="number" value={countTransfer} onChange={(e) => setCountTransfer(Number(e.target.value))} />
                  <TextField label="Contado otros" type="number" value={countOther} onChange={(e) => setCountOther(Number(e.target.value))} />
                </Box>

                <Button
                  variant="contained"
                  color="error"
                  onClick={close}
                  disabled={loading}
                  sx={{ textTransform: 'none', fontWeight: 900, borderRadius: 2.5 }}
                >
                  Cerrar caja
                </Button>
              </Box>
            )}
          </>
        )}
      </Box>
    </Paper>
  );
}