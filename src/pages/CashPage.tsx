import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';

type Status = 'idle' | 'loading' | 'success' | 'error';

type ByBranchRow = {
  branchId: string;
  branchName: string;
};

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

type LedgerItem =
  | {
      kind: 'PAYMENT';
      id: string;
      moment: string;
      method: 'CASH' | 'CARD' | 'TRANSFER' | 'OTHER';
      provider: string;
      amount: number;
      client: { id: string; name: string; email: string; dni: string };
    }
  | {
      kind: 'MOVEMENT';
      id: string;
      moment: string;
      type: string;
      method: 'CASH' | 'CARD' | 'TRANSFER' | 'OTHER';
      amount: number;
      description: string | null;
      createdBy: { id: string; name: string; email: string } | null;
    };

type LedgerResponse = {
  cashRegister: any;
  items: LedgerItem[];
  totals: any;
};

function nfMoney(n: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(Number.isFinite(n) ? n : 0);
}

function nfDate(iso?: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium', timeStyle: 'short' }).format(d);
}

function toNumber(v: unknown) {
  const n = typeof v === 'number' ? v : Number(String(v ?? '').trim());
  return Number.isFinite(n) ? n : 0;
}

function rowLabel(item: LedgerItem) {
  if (item.kind === 'PAYMENT') return `Pago • ${item.provider}`;
  return `Movimiento • ${item.type}`;
}

function rowSecondary(item: LedgerItem) {
  if (item.kind === 'PAYMENT') return `${item.client.name} • ${item.client.dni}`;
  return item.description ?? '—';
}

export default function CashPage() {
  const apiBase = useMemo(() => String((import.meta as any).env?.VITE_API_URL ?? '').replace(/\/$/, ''), []);

  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);

  const [branches, setBranches] = useState<ByBranchRow[]>([]);
  const [branchId, setBranchId] = useState<string>(() => localStorage.getItem('lastSelectedBranch') ?? '');

  const [cash, setCash] = useState<CashRegister | null>(null);
  const [expected, setExpected] = useState<Expected | null>(null);

  const [ledger, setLedger] = useState<LedgerResponse | null>(null);

  // Open
  const [openCash, setOpenCash] = useState(0);
  const [openCard, setOpenCard] = useState(0);
  const [openTransfer, setOpenTransfer] = useState(0);
  const [openOther, setOpenOther] = useState(0);

  // Close
  const [countCash, setCountCash] = useState(0);
  const [countCard, setCountCard] = useState(0);
  const [countTransfer, setCountTransfer] = useState(0);
  const [countOther, setCountOther] = useState(0);

  const loading = status === 'loading';

  const selectedBranchName = useMemo(
    () => branches.find((b) => b.branchId === branchId)?.branchName ?? '',
    [branches, branchId],
  );

  const fetchBranches = async (): Promise<ByBranchRow[]> => {
    const tryUrls = [`${apiBase}/branches`, `${apiBase}/dashboard/by-branch`];

    for (const url of tryUrls) {
      const res = await fetch(url, { credentials: 'include', headers: { Accept: 'application/json' } });
      if (!res.ok) continue;

      const json = await res.json();

      if (Array.isArray(json) && json.length && json[0]?.id && json[0]?.name) {
        return json.map((b: any) => ({ branchId: b.id, branchName: b.name }));
      }

      if (Array.isArray(json) && json.length && json[0]?.branchId && json[0]?.branchName) {
        return json.map((r: any) => ({ branchId: r.branchId, branchName: r.branchName }));
      }

      if (Array.isArray(json) && json.length === 0) return [];
    }

    return [];
  };

  const fetchOpen = async (bid: string) => {
    setExpected(null);
    setCash(null);
    setLedger(null);

    if (!bid) return;

    const res = await fetch(`${apiBase}/cash/open?branchId=${encodeURIComponent(bid)}`, {
      credentials: 'include',
      headers: { Accept: 'application/json' },
    });

    const text = await res.text();

    if (res.status === 404) {
      setCash(null);
      setExpected(null);
      setLedger(null);
      return;
    }
    if (!res.ok) {
      throw new Error(text || 'Error al obtener la caja');
    }

    if (!text) {
      setCash(null);
      setExpected(null);
      setLedger(null);
      return;
    }
    const json = JSON.parse(text);
    setCash(json ?? null);

    if (json?.id) {
      const e = await fetch(`${apiBase}/cash/${json.id}/expected`, {
        credentials: 'include',
        headers: { Accept: 'application/json' },
      });
      if (e.ok) setExpected(await e.json());

      const l = await fetch(`${apiBase}/cash/${json.id}/ledger`, {
        credentials: 'include',
        headers: { Accept: 'application/json' },
      });
      if (l.ok) setLedger(await l.json());
    }
  };

  const refresh = async () => {
    setStatus('loading');
    setError(null);

    try {
      if (!apiBase) throw new Error('Falta configurar VITE_API_URL');

      const bs = await fetchBranches();
      setBranches(bs);

      let bid = branchId;
      if (!bid && bs.length) {
        bid = bs[0].branchId;
        setBranchId(bid);
        localStorage.setItem('lastSelectedBranch', bid);
      }

      if (!bid) {
        setCash(null);
        setExpected(null);
        setLedger(null);
        setStatus('success');
        return;
      }

      await fetchOpen(bid);
      setStatus('success');
    } catch (e) {
      setStatus('error');
      setError(e instanceof Error ? e.message : 'Error desconocido');
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onChangeBranch = async (bid: string) => {
    setBranchId(bid);
    localStorage.setItem('lastSelectedBranch', bid);

    setStatus('loading');
    setError(null);
    try {
      await fetchOpen(bid);
      setStatus('success');
    } catch (e) {
      setStatus('error');
      setError(e instanceof Error ? e.message : 'Error desconocido');
    }
  };

  const open = async () => {
    setStatus('loading');
    setError(null);

    try {
      if (!branchId) throw new Error('Seleccioná una sucursal');

      const today = new Date();
      const businessDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
        today.getDate(),
      ).padStart(2, '0')}`;

      const res = await fetch(`${apiBase}/cash/open`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          branchId,
          businessDate,
          opening: {
            cash: toNumber(openCash),
            card: toNumber(openCard),
            transfer: toNumber(openTransfer),
            other: toNumber(openOther),
          },
          notes: 'Apertura',
        }),
      });

      if (!res.ok) throw new Error(await res.text());
      await fetchOpen(branchId);

      setOpenCash(0);
      setOpenCard(0);
      setOpenTransfer(0);
      setOpenOther(0);

      setStatus('success');
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
          countedCash: toNumber(countCash),
          countedCard: toNumber(countCard),
          countedTransfer: toNumber(countTransfer),
          countedOther: toNumber(countOther),
          notes: 'Cierre',
        }),
      });

      if (!res.ok) throw new Error(await res.text());
      await fetchOpen(branchId);

      setStatus('success');
    } catch (e) {
      setStatus('error');
      setError(e instanceof Error ? e.message : 'Error desconocido');
    }
  };

  const expectedTotals = expected?.expected ?? { CASH: 0, CARD: 0, TRANSFER: 0, OTHER: 0 };
  const expectedSum = expectedTotals.CASH + expectedTotals.CARD + expectedTotals.TRANSFER + expectedTotals.OTHER;

  const countedSum = toNumber(countCash) + toNumber(countCard) + toNumber(countTransfer) + toNumber(countOther);
  const diffSum = countedSum - expectedSum;

  const isOpen = cash?.status === 'OPEN';
  const hasBranch = Boolean(branchId);

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1250, mx: 'auto' }}>
      {/* Header */}
      <Paper
        variant="outlined"
        sx={{
          borderRadius: 4,
          p: { xs: 2, md: 2.5 },
          mb: 3,
          borderColor: 'rgba(0,0,0,0.08)',
          boxShadow: '0 14px 40px rgba(0,0,0,0.06)',
          background:
            'radial-gradient(1200px 200px at 10% 0%, rgba(25,118,210,0.14) 0%, rgba(255,255,255,0) 60%), linear-gradient(180deg, rgba(255,255,255,0.95), rgba(255,255,255,0.85))',
        }}
      >
        <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ md: 'center' }} justifyContent="space-between" gap={2}>
          <Stack spacing={0.5}>
            <Typography variant="h5" sx={{ fontWeight: 900, letterSpacing: -0.4 }}>
              Caja
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Apertura y cierre del día, con arqueo y control por métodos de pago.
            </Typography>
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.25} alignItems={{ sm: 'center' }}>
            <TextField
              select
              size="small"
              label="Sucursal"
              value={branchId}
              onChange={(e) => onChangeBranch(e.target.value)}
              sx={{ minWidth: 240 }}
              disabled={branches.length === 0}
              helperText={branches.length === 0 ? 'No hay sucursales disponibles' : ' '}
            >
              {branches.map((b) => (
                <MenuItem key={b.branchId} value={b.branchId}>
                  {b.branchName}
                </MenuItem>
              ))}
            </TextField>

            <Button
              onClick={refresh}
              disabled={loading}
              variant="contained"
              sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 900 }}
            >
              Actualizar
            </Button>
          </Stack>
        </Stack>

        <Stack direction="row" gap={1} alignItems="center" sx={{ mt: 2, flexWrap: 'wrap' }}>
          <Chip
            label={isOpen ? 'Caja abierta' : 'Caja cerrada / no abierta'}
            color={isOpen ? 'success' : 'default'}
            sx={{ fontWeight: 900, borderRadius: 999 }}
          />
          <Chip
            label={
              selectedBranchName
                ? `Sucursal: ${selectedBranchName}`
                : hasBranch
                  ? 'Sucursal seleccionada'
                  : 'Sin sucursal'
            }
            sx={{ fontWeight: 900, borderRadius: 999 }}
          />
          {cash?.businessDate && <Chip label={`Día: ${nfDate(cash.businessDate)}`} sx={{ fontWeight: 900, borderRadius: 999 }} />}
          {cash?.openedAt && <Chip label={`Apertura: ${nfDate(cash.openedAt)}`} sx={{ fontWeight: 900, borderRadius: 999 }} />}
          {loading && <CircularProgress size={18} />}
        </Stack>

        {status === 'error' && (
          <Alert severity="error" sx={{ mt: 2, borderRadius: 3 }}>
            {error}
          </Alert>
        )}
      </Paper>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1.25fr 0.75fr' }, gap: 2.5 }}>
        {/* Operación */}
        <Paper
          variant="outlined"
          sx={{
            borderRadius: 4,
            p: 2.5,
            borderColor: 'rgba(0,0,0,0.08)',
            boxShadow: '0 14px 40px rgba(0,0,0,0.06)',
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 900, mb: 0.5 }}>
            Operación
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {isOpen ? 'Realizá el arqueo y cerrá la caja.' : 'Ingresá el saldo inicial y abrí la caja.'}
          </Typography>

          <Divider sx={{ mb: 2 }} />

          {!hasBranch ? (
            <Alert severity="warning" sx={{ borderRadius: 3 }}>
              Seleccioná una sucursal para operar la caja.
            </Alert>
          ) : !isOpen ? (
            <>
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
                <TextField
                  label="Efectivo"
                  type="number"
                  value={openCash}
                  onChange={(e) => setOpenCash(toNumber(e.target.value))}
                  inputProps={{ min: 0, step: 100 }}
                />
                <TextField
                  label="Tarjeta"
                  type="number"
                  value={openCard}
                  onChange={(e) => setOpenCard(toNumber(e.target.value))}
                  inputProps={{ min: 0, step: 100 }}
                />
                <TextField
                  label="Transferencia"
                  type="number"
                  value={openTransfer}
                  onChange={(e) => setOpenTransfer(toNumber(e.target.value))}
                  inputProps={{ min: 0, step: 100 }}
                />
                <TextField
                  label="Otros"
                  type="number"
                  value={openOther}
                  onChange={(e) => setOpenOther(toNumber(e.target.value))}
                  inputProps={{ min: 0, step: 100 }}
                />
              </Box>

              <Button
                variant="contained"
                onClick={open}
                disabled={loading}
                sx={{ textTransform: 'none', fontWeight: 900, borderRadius: 2.5 }}
              >
                Abrir caja
              </Button>
            </>
          ) : (
            <>
              <Typography variant="subtitle2" sx={{ fontWeight: 900, mb: 1 }}>
                Cerrar caja (arqueo)
              </Typography>

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' },
                  gap: 1.5,
                  mb: 2,
                }}
              >
                <TextField
                  label="Contado efectivo"
                  type="number"
                  value={countCash}
                  onChange={(e) => setCountCash(toNumber(e.target.value))}
                  inputProps={{ min: 0, step: 100 }}
                />
                <TextField
                  label="Contado tarjeta"
                  type="number"
                  value={countCard}
                  onChange={(e) => setCountCard(toNumber(e.target.value))}
                  inputProps={{ min: 0, step: 100 }}
                />
                <TextField
                  label="Contado transferencia"
                  type="number"
                  value={countTransfer}
                  onChange={(e) => setCountTransfer(toNumber(e.target.value))}
                  inputProps={{ min: 0, step: 100 }}
                />
                <TextField
                  label="Contado otros"
                  type="number"
                  value={countOther}
                  onChange={(e) => setCountOther(toNumber(e.target.value))}
                  inputProps={{ min: 0, step: 100 }}
                />
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
            </>
          )}
        </Paper>

        {/* Resumen */}
        <Paper
          variant="outlined"
          sx={{
            borderRadius: 4,
            p: 2.5,
            borderColor: 'rgba(0,0,0,0.08)',
            boxShadow: '0 14px 40px rgba(0,0,0,0.06)',
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 900, mb: 0.5 }}>
            Resumen
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Totales esperados vs arqueo.
          </Typography>

          <Divider sx={{ mb: 2 }} />

          <Stack spacing={1.2}>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Esperado efectivo
              </Typography>
              <Typography sx={{ fontWeight: 900 }}>{nfMoney(expectedTotals.CASH)}</Typography>
            </Box>

            <Box>
              <Typography variant="caption" color="text.secondary">
                Esperado tarjeta
              </Typography>
              <Typography sx={{ fontWeight: 900 }}>{nfMoney(expectedTotals.CARD)}</Typography>
            </Box>

            <Box>
              <Typography variant="caption" color="text.secondary">
                Esperado transferencia
              </Typography>
              <Typography sx={{ fontWeight: 900 }}>{nfMoney(expectedTotals.TRANSFER)}</Typography>
            </Box>

            <Box>
              <Typography variant="caption" color="text.secondary">
                Esperado otros
              </Typography>
              <Typography sx={{ fontWeight: 900 }}>{nfMoney(expectedTotals.OTHER)}</Typography>
            </Box>

            <Divider />

            <Box>
              <Typography variant="caption" color="text.secondary">
                Total esperado
              </Typography>
              <Typography sx={{ fontWeight: 900 }}>{nfMoney(expectedSum)}</Typography>
            </Box>

            <Box>
              <Typography variant="caption" color="text.secondary">
                Total contado
              </Typography>
              <Typography sx={{ fontWeight: 900 }}>{nfMoney(countedSum)}</Typography>
            </Box>

            <Box>
              <Typography variant="caption" color="text.secondary">
                Diferencia total
              </Typography>
              <Typography
                sx={{
                  fontWeight: 900,
                  color: diffSum === 0 ? 'success.main' : diffSum > 0 ? 'warning.main' : 'error.main',
                }}
              >
                {nfMoney(diffSum)}
              </Typography>
            </Box>
          </Stack>
        </Paper>
      </Box>

      {/* Libro de caja */}
      <Paper
        variant="outlined"
        sx={{
          mt: 2.5,
          borderRadius: 4,
          p: 2.5,
          borderColor: 'rgba(0,0,0,0.08)',
          boxShadow: '0 14px 40px rgba(0,0,0,0.06)',
        }}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 900 }}>
            Libro de caja (pagos + movimientos)
          </Typography>

          <Chip label={ledger ? `${ledger.items.length} ítems` : 'Sin datos'} sx={{ fontWeight: 900, borderRadius: 999 }} />
        </Stack>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Se arma con pagos APPROVED asociados a la caja y movimientos manuales.
        </Typography>

        <Divider sx={{ mb: 2 }} />

        {!cash?.id ? (
          <Alert severity="info" sx={{ borderRadius: 3 }}>
            No hay caja abierta para mostrar el libro.
          </Alert>
        ) : !ledger ? (
          <Alert severity="warning" sx={{ borderRadius: 3 }}>
            No se pudo cargar el libro. Verificá que exista el endpoint <b>/cash/{'{id}'}/ledger</b> y que responda 200.
          </Alert>
        ) : ledger.items.length === 0 ? (
          <Alert severity="info" sx={{ borderRadius: 3 }}>
            La caja no tiene pagos ni movimientos en el día.
          </Alert>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 900 }}>Fecha</TableCell>
                  <TableCell sx={{ fontWeight: 900 }}>Tipo</TableCell>
                  <TableCell sx={{ fontWeight: 900 }}>Detalle</TableCell>
                  <TableCell sx={{ fontWeight: 900 }}>Método</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 900 }}>
                    Monto
                  </TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {ledger.items.map((it) => (
                  <TableRow key={`${it.kind}-${it.id}`} hover>
                    <TableCell>{nfDate(it.moment)}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={it.kind === 'PAYMENT' ? 'Pago' : 'Movimiento'}
                        color={it.kind === 'PAYMENT' ? 'primary' : 'default'}
                        sx={{ fontWeight: 900 }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontWeight: 800 }}>{rowLabel(it)}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {rowSecondary(it)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip size="small" label={it.method} sx={{ fontWeight: 900 }} />
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 900 }}>
                      {nfMoney(it.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Box>
  );
}