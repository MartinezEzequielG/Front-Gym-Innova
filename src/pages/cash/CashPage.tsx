// CashPage.tsx
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
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Switch,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import CloseSummaryDialog from './components/CloseSummaryDialog';

type Status = 'idle' | 'loading' | 'success' | 'error';

type ByBranchRow = { branchId: string; branchName: string };

type CashRegister = {
  id: string;
  branchId: string;
  status: 'OPEN' | 'CLOSED';
  openedAt: string;
  closedAt?: string | null;
  businessDate: string;
  notes?: string | null;
};

type Expected = { expected: { CASH: number; CARD: number; TRANSFER: number; OTHER: number } };

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

type LedgerResponse = { cashRegister: any; items: LedgerItem[]; totals: any };

type CashHistoryRow = {
  id: string;
  branchId: string;
  branch?: { id: string; name: string } | null;
  status: 'OPEN' | 'CLOSED';
  businessDate: string;
  openedAt: string;
  closedAt: string | null;

  expected: { CASH: number; CARD: number; TRANSFER: number; OTHER: number };
  expectedSum: number;

  counted: { CASH: number; CARD: number; TRANSFER: number; OTHER: number };
  countedSum: number;

  diff: { CASH: number; CARD: number; TRANSFER: number; OTHER: number };
  diffSum: number;
};

// --------- RESUMEN POST-CIERRE ----------
type MoneyByMethod = { CASH: number; CARD: number; TRANSFER: number; OTHER: number };
type CloseResult = {
  cash: CashRegister;
  expected: MoneyByMethod;
  counted: MoneyByMethod;
  difference: MoneyByMethod;
};
// --------------------------------------

// --------- MOVIMIENTOS (Paso 4) - Tipos y helpers ----------
const MOVEMENT_TYPES = ['INCOME', 'EXPENSE', 'ADJUSTMENT'] as const;
type MovementType = (typeof MOVEMENT_TYPES)[number];

const MOVEMENT_METHODS = ['CASH', 'CARD', 'TRANSFER', 'OTHER'] as const;
type MovementMethod = (typeof MOVEMENT_METHODS)[number];

function movementTypeLabel(t: MovementType) {
  if (t === 'INCOME') return 'Ingreso';
  if (t === 'EXPENSE') return 'Egreso';
  return 'Ajuste';
}

function movementTypeChipColor(t: MovementType): 'success' | 'warning' | 'info' {
  if (t === 'INCOME') return 'success';
  if (t === 'EXPENSE') return 'warning';
  return 'info';
}
// -----------------------------------------------------------

function nfMoney(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(
    Number.isFinite(n) ? n : 0,
  );
}

function nfDate(iso?: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium', timeStyle: 'short' }).format(d);
}

function nfDateOnly(iso?: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium' }).format(d);
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

function normalizeMoneyInput(raw: string): string {
  if (!raw) return '';
  return raw.replace(/^0+(?=\d)/, '');
}

export default function CashPage() {
  const apiBase = useMemo(() => String((import.meta as any).env?.VITE_API_URL ?? '').replace(/\/$/, ''), []);

  // Tabs:
  // 0 Operar (abrir/cerrar)
  // 1 Arqueo (esperado vs contado)
  // 2 Movimientos (hoy)
  // 3 Historial
  const [tab, setTab] = useState(0);

  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);

  const [branches, setBranches] = useState<ByBranchRow[]>([]);
  const [branchId, setBranchId] = useState<string>(() => localStorage.getItem('lastSelectedBranch') ?? '');

  const [cash, setCash] = useState<CashRegister | null>(null);
  const [expected, setExpected] = useState<Expected | null>(null);
  const [ledger, setLedger] = useState<LedgerResponse | null>(null);

  // Inputs: apertura/cierre
  const [openCash, setOpenCash] = useState('');
  const [openCard, setOpenCard] = useState('');
  const [openTransfer, setOpenTransfer] = useState('');
  const [openOther, setOpenOther] = useState('');

  const [countCash, setCountCash] = useState('');
  const [countCard, setCountCard] = useState('');
  const [countTransfer, setCountTransfer] = useState('');
  const [countOther, setCountOther] = useState('');

  const [showAdvanced, setShowAdvanced] = useState(false);

  // filtros ledger (hoy)
  const [ledgerQ, setLedgerQ] = useState('');
  const [ledgerKind, setLedgerKind] = useState<'ALL' | 'PAYMENT' | 'MOVEMENT'>('ALL');
  const [ledgerMethod, setLedgerMethod] = useState<'ALL' | 'CASH' | 'CARD' | 'TRANSFER' | 'OTHER'>('ALL');

  // Historial
  const [history, setHistory] = useState<CashHistoryRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');

  const [historyFilters, setHistoryFilters] = useState({
    branchId: '',
    status: '' as '' | 'OPEN' | 'CLOSED',
    from: '',
    to: '',
  });
  const [historyPage, setHistoryPage] = useState({ skip: 0, take: 25 });

  // Detalle historial (ledger on-demand)
  const [histDetailOpen, setHistDetailOpen] = useState(false);
  const [histDetailCash, setHistDetailCash] = useState<CashHistoryRow | null>(null);
  const [histDetailLedger, setHistDetailLedger] = useState<LedgerResponse | null>(null);
  const [histDetailLoading, setHistDetailLoading] = useState(false);
  const [histDetailError, setHistDetailError] = useState('');

  // --------- PASO 4: dialog alta movimiento ----------
  const [movOpen, setMovOpen] = useState(false);
  const [movSubmitting, setMovSubmitting] = useState(false);
  const [movError, setMovError] = useState<string>('');
  const [movType, setMovType] = useState<MovementType>('INCOME');
  const [movMethod, setMovMethod] = useState<MovementMethod>('CASH');
  const [movAmount, setMovAmount] = useState<number>(0);
  const [movDesc, setMovDesc] = useState<string>('');

  const openMovementDialog = (preset?: MovementType) => {
    if (!cash?.id || cash.status !== 'OPEN') {
      setError('No hay una caja abierta para registrar movimientos.');
      setTab(0);
      return;
    }
    setMovError('');
    setMovType(preset ?? 'INCOME');
    setMovMethod('CASH');
    setMovAmount(0);
    setMovDesc('');
    setMovOpen(true);
  };

  const closeMovementDialog = () => {
    if (movSubmitting) return;
    setMovOpen(false);
    setMovError('');
  };

  const validateMovement = () => {
    if (!cash?.id || cash.status !== 'OPEN') return 'No hay caja abierta.';
    const amt = toNumber(movAmount);
    if (!(amt > 0)) return 'El monto debe ser mayor a 0.';
    if ((movType === 'EXPENSE' || movType === 'ADJUSTMENT') && movDesc.trim().length < 3) {
      return 'La descripción es obligatoria (mínimo 3 caracteres) para egresos/ajustes.';
    }
    if (movDesc.trim().length > 140) return 'La descripción es demasiado larga (máx. 140).';
    return '';
  };

  const submitMovement = async () => {
    const v = validateMovement();
    if (v) {
      setMovError(v);
      return;
    }
    if (!cash?.id) return;

    setMovSubmitting(true);
    setMovError('');
    setStatus('loading');
    setError(null);

    try {
      const res = await fetch(`${apiBase}/cash/${cash.id}/movements`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          type: movType,
          method: movMethod,
          amount: toNumber(movAmount),
          description: movDesc.trim() ? movDesc.trim() : undefined,
        }),
      });

      if (!res.ok) throw new Error(await res.text());

      // Refrescamos expected + ledger (y caja) consistentemente
      await fetchOpen(branchId);

      setMovOpen(false);
      setMovSubmitting(false);
      setStatus('success');

      // Llevar al usuario al libro para ver el asiento recién creado
      setTab(2);
    } catch (e) {
      setMovSubmitting(false);
      setStatus('error');
      const msg = e instanceof Error ? e.message : 'Error desconocido';
      setMovError(msg);
      setError(msg);
    }
  };
  // ---------------------------------------------------

  // --------- RESUMEN POST-CIERRE ----------
  const [closeSummaryOpen, setCloseSummaryOpen] = useState(false);
  const [closeSummary, setCloseSummary] = useState<CloseResult | null>(null);
  const closeSummaryClose = () => setCloseSummaryOpen(false);
  // ---------------------------------------

  const loading = status === 'loading';
  const isOpen = cash?.status === 'OPEN';
  const hasBranch = Boolean(branchId);

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
    if (!res.ok) throw new Error(text || 'Error al obtener la caja');

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

    // recomendado: limpiar contados al cambiar sucursal (evita confusión)
    setCountCash('');
    setCountCard('');
    setCountTransfer('');
    setCountOther('');

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

      setOpenCash('');
      setOpenCard('');
      setOpenTransfer('');
      setOpenOther('');

      // recomendado: limpiar contados al abrir
      setCountCash('');
      setCountCard('');
      setCountTransfer('');
      setCountOther('');

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

      const text = await res.text();
      if (!res.ok) throw new Error(text || 'Error al cerrar caja');

      const json = text ? (JSON.parse(text) as CloseResult) : null;

      if (json) {
        setCloseSummary(json);
        setCloseSummaryOpen(true);
      } else {
        setCloseSummary(null);
        setCloseSummaryOpen(true);
      }

      await fetchOpen(branchId);

      // recomendado: limpiar contados luego del cierre
      setCountCash('');
      setCountCard('');
      setCountTransfer('');
      setCountOther('');

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

  const ledgerFiltered = useMemo(() => {
    const items = ledger?.items ?? [];
    const q = ledgerQ.trim().toLowerCase();

    return items.filter((it) => {
      if (ledgerKind !== 'ALL' && it.kind !== ledgerKind) return false;
      if (ledgerMethod !== 'ALL' && it.method !== ledgerMethod) return false;

      if (!q) return true;

      const hay = `${rowLabel(it)} ${rowSecondary(it)} ${it.method} ${it.amount} ${nfDate(it.moment)}`.toLowerCase();
      return hay.includes(q);
    });
  }, [ledger, ledgerQ, ledgerKind, ledgerMethod]);

  const ledgerStats = useMemo(() => {
    const items = ledger?.items ?? [];
    const payments = items.filter((i) => i.kind === 'PAYMENT').length;
    const moves = items.filter((i) => i.kind === 'MOVEMENT').length;

    const last = items.reduce<string | null>((acc, it) => {
      if (!acc) return it.moment;
      return new Date(it.moment).getTime() > new Date(acc).getTime() ? it.moment : acc;
    }, null);

    return { count: items.length, payments, moves, last };
  }, [ledger]);

  const fetchHistory = async () => {
    setHistoryLoading(true);
    setHistoryError('');
    try {
      const params = new URLSearchParams();
      if (historyFilters.branchId) params.set('branchId', historyFilters.branchId);
      if (historyFilters.status) params.set('status', historyFilters.status);
      if (historyFilters.from) params.set('from', historyFilters.from);
      if (historyFilters.to) params.set('to', historyFilters.to);
      params.set('skip', String(historyPage.skip));
      params.set('take', String(historyPage.take));

      const res = await fetch(`${apiBase}/cash?${params.toString()}`, {
        credentials: 'include',
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) throw new Error(await res.text());

      const json = await res.json();
      setHistory(Array.isArray(json) ? json : []);
    } catch (e: any) {
      setHistory([]);
      setHistoryError(e?.message || 'Error cargando historial.');
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (tab !== 3) return;
    fetchHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, historyFilters.branchId, historyFilters.status, historyFilters.from, historyFilters.to, historyPage.skip, historyPage.take]);

  const openHistoryDetail = async (row: CashHistoryRow) => {
    setHistDetailOpen(true);
    setHistDetailCash(row);
    setHistDetailLedger(null);
    setHistDetailError('');
    setHistDetailLoading(true);

    try {
      const res = await fetch(`${apiBase}/cash/${row.id}/ledger`, {
        credentials: 'include',
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) throw new Error(await res.text());
      setHistDetailLedger(await res.json());
    } catch (e: any) {
      setHistDetailError(e?.message || 'No se pudo cargar el detalle.');
    } finally {
      setHistDetailLoading(false);
    }
  };

  const closeHistoryDetail = () => {
    if (histDetailLoading) return;
    setHistDetailOpen(false);
    setHistDetailCash(null);
    setHistDetailLedger(null);
    setHistDetailError('');
  };

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1250, mx: 'auto' }}>
      {/* Header compacto */}
      <Paper
        variant="outlined"
        sx={{
          borderRadius: 4,
          p: { xs: 2, md: 2.5 },
          mb: 2,
          borderColor: 'rgba(0,0,0,0.08)',
          boxShadow: '0 14px 40px rgba(0,0,0,0.06)',
          background:
            'radial-gradient(1200px 200px at 10% 0%, rgba(25,118,210,0.14) 0%, rgba(255,255,255,0) 60%), linear-gradient(180deg, rgba(255,255,255,0.95), rgba(255,255,255,0.85))',
        }}
      >
        <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ md: 'center' }} justifyContent="space-between" gap={2}>
          <Stack spacing={0.5} sx={{ minWidth: 0 }}>
            <Typography variant="h5" sx={{ fontWeight: 900, letterSpacing: -0.4 }}>
              Caja
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Operación diaria simplificada.
            </Typography>

            <Stack direction="row" gap={1} alignItems="center" sx={{ mt: 1, flexWrap: 'wrap' }}>
              <Chip
                label={isOpen ? 'Abierta' : 'Cerrada'}
                color={isOpen ? 'success' : 'default'}
                sx={{ fontWeight: 900, borderRadius: 999 }}
              />
              <Chip
                label={
                  selectedBranchName ? `Sucursal: ${selectedBranchName}` : hasBranch ? 'Sucursal seleccionada' : 'Sin sucursal'
                }
                sx={{ fontWeight: 900, borderRadius: 999 }}
              />
              {!!cash?.businessDate && <Chip label={`Día: ${nfDateOnly(cash.businessDate)}`} sx={{ fontWeight: 900, borderRadius: 999 }} />}
              {loading && <CircularProgress size={18} />}
            </Stack>
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

        {status === 'error' && (
          <Alert severity="error" sx={{ mt: 2, borderRadius: 3 }}>
            {error}
          </Alert>
        )}
      </Paper>

      {/* Tabs */}
      <Paper
        variant="outlined"
        sx={{
          borderRadius: 4,
          borderColor: 'rgba(0,0,0,0.08)',
          boxShadow: '0 14px 40px rgba(0,0,0,0.06)',
          overflow: 'hidden',
        }}
      >
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 1.5, borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
          <Tab label="Operar" />
          <Tab label="Arqueo" />
          <Tab label="Movimientos" />
          <Tab label="Historial" />
        </Tabs>

        <Box sx={{ p: { xs: 2, md: 2.5 } }}>
          {!hasBranch ? (
            <Alert severity="warning" sx={{ borderRadius: 3 }}>
              Seleccioná una sucursal para operar.
            </Alert>
          ) : tab === 0 ? (
            <>
              {/* OPERAR */}
              <Stack direction={{ xs: 'column', md: 'row' }} gap={2.5} alignItems={{ md: 'flex-start' }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6" sx={{ fontWeight: 900, mb: 0.5 }}>
                    {isOpen ? 'Cerrar caja' : 'Abrir caja'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {isOpen ? 'Ingresá lo contado y confirmá el cierre.' : 'Ingresá el efectivo inicial y confirmá la apertura.'}
                  </Typography>

                  <Divider sx={{ mb: 2 }} />

                  <FormControlLabel
                    control={<Switch checked={showAdvanced} onChange={(e) => setShowAdvanced(e.target.checked)} />}
                    label="Mostrar desglose (avanzado)"
                  />

                  {!isOpen ? (
                    <Stack spacing={1.5} sx={{ mt: 1 }}>
                      <TextField
                        label="Efectivo inicial"
                        type="text"
                        value={openCash}
                        onChange={(e) => setOpenCash(e.target.value.replace(/[^\d]/g, ''))}
                        onBlur={() => setOpenCash(normalizeMoneyInput(openCash))}
                        inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
                        fullWidth
                      />

                      {showAdvanced && (
                        <Box
                          sx={{
                            display: 'grid',
                            gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
                            gap: 1.25,
                          }}
                        >
                          <TextField
                            label="Tarjeta"
                            type="number"
                            value={openCard}
                            onChange={(e) => setCountCard(e.target.value.replace(/[^\d]/g, ''))}
                            inputProps={{ min: 0, step: 100 }}
                          />
                          <TextField
                            label="Transferencia"
                            type="number"
                            value={openTransfer}
                            onChange={(e) => setCountTransfer(e.target.value.replace(/[^\d]/g, ''))}
                            inputProps={{ min: 0, step: 100 }}
                          />
                          <TextField
                            label="Otros"
                            type="number"
                            value={openOther}
                            onChange={(e) => setCountOther(e.target.value.replace(/[^\d]/g, ''))}
                            inputProps={{ min: 0, step: 100 }}
                          />
                        </Box>
                      )}

                      <Button
                        variant="contained"
                        onClick={open}
                        disabled={loading}
                        sx={{ textTransform: 'none', fontWeight: 900, borderRadius: 2.5, alignSelf: 'flex-start' }}
                      >
                        Abrir caja
                      </Button>
                    </Stack>
                  ) : (
                    <Stack spacing={1.5} sx={{ mt: 1 }}>
                      <TextField
                        label="Efectivo contado"
                        type="text"
                        value={countCash}
                        onChange={(e) => setCountCash(e.target.value.replace(/[^\d]/g, ''))}
                        inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
                        fullWidth
                      />

                      {showAdvanced && (
                        <Box
                          sx={{
                            display: 'grid',
                            gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
                            gap: 1.25,
                          }}
                        >
                          <TextField
                            label="Tarjeta contada"
                            type="number"
                            value={countCard}
                            onChange={(e) => setCountCard(e.target.value.replace(/[^\d]/g, ''))}
                            inputProps={{ min: 0, step: 100 }}
                          />
                          <TextField
                            label="Transferencia contada"
                            type="number"
                            value={countTransfer}
                            onChange={(e) => setCountTransfer(e.target.value.replace(/[^\d]/g, ''))}
                            inputProps={{ min: 0, step: 100 }}
                          />
                          <TextField
                            label="Otros contados"
                            type="number"
                            value={countOther}
                            onChange={(e) => setCountOther(e.target.value.replace(/[^\d]/g, ''))}
                            inputProps={{ min: 0, step: 100 }}
                          />
                        </Box>
                      )}

                      <Button
                        variant="contained"
                        color="error"
                        onClick={close}
                        disabled={loading}
                        sx={{ textTransform: 'none', fontWeight: 900, borderRadius: 2.5, alignSelf: 'flex-start' }}
                      >
                        Cerrar caja
                      </Button>
                    </Stack>
                  )}
                </Box>

                {/* Panel compacto “hoy” */}
                <Paper
                  variant="outlined"
                  sx={{
                    flex: { md: '0 0 360px' },
                    borderRadius: 4,
                    p: 2,
                    borderColor: 'rgba(0,0,0,0.08)',
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.92), rgba(255,255,255,0.86))',
                  }}
                >
                  <Typography sx={{ fontWeight: 900, mb: 1 }}>Hoy</Typography>
                  <Stack spacing={1}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Apertura
                      </Typography>
                      <Typography sx={{ fontWeight: 900 }}>{nfDate(cash?.openedAt)}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Total esperado
                      </Typography>
                      <Typography sx={{ fontWeight: 900 }}>{nfMoney(expectedSum)}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Diferencia (según arqueo)
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

                    <Divider />

                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Movimientos
                      </Typography>
                      <Typography sx={{ fontWeight: 900 }}>
                        {ledger ? `${ledgerStats.payments} pagos • ${ledgerStats.moves} movimientos` : '—'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Último: {ledgerStats.last ? nfDate(ledgerStats.last) : '—'}
                      </Typography>
                    </Box>

                    <Button
                      onClick={() => setTab(2)}
                      disabled={!ledger}
                      sx={{ textTransform: 'none', fontWeight: 900, borderRadius: 2.5, alignSelf: 'flex-start' }}
                    >
                      Ver movimientos
                    </Button>
                  </Stack>
                </Paper>
              </Stack>
            </>
          ) : tab === 1 ? (
            <>
              {/* ARQUEO */}
              <Typography variant="h6" sx={{ fontWeight: 900, mb: 0.5 }}>
                Arqueo
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Comparación por método: esperado vs contado.
              </Typography>

              <Divider sx={{ mb: 2 }} />

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 1.5 }}>
                {(['CASH', 'CARD', 'TRANSFER', 'OTHER'] as const).map((m) => {
                  const exp = expectedTotals[m];
                  const cnt =
                    m === 'CASH'
                      ? toNumber(countCash)
                      : m === 'CARD'
                        ? toNumber(countCard)
                        : m === 'TRANSFER'
                          ? toNumber(countTransfer)
                          : toNumber(countOther);
                  const diff = cnt - exp;

                  return (
                    <Paper
                      key={m}
                      variant="outlined"
                      sx={{
                        borderRadius: 4,
                        p: 2,
                        borderColor: 'rgba(0,0,0,0.08)',
                        background: alpha('#111827', 0.02),
                      }}
                    >
                      <Stack direction="row" alignItems="center" justifyContent="space-between">
                        <Typography sx={{ fontWeight: 900 }}>{m}</Typography>
                        <Chip
                          size="small"
                          label={diff === 0 ? 'OK' : diff > 0 ? 'Sobrante' : 'Faltante'}
                          sx={{
                            fontWeight: 900,
                            borderRadius: 999,
                            backgroundColor:
                              diff === 0
                                ? alpha('#10b981', 0.12)
                                : diff > 0
                                  ? alpha('#f59e0b', 0.14)
                                  : alpha('#ef4444', 0.12),
                            color: diff === 0 ? '#0f766e' : diff > 0 ? '#b45309' : '#b91c1c',
                          }}
                        />
                      </Stack>

                      <Stack direction="row" gap={2} sx={{ mt: 1 }}>
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Esperado
                          </Typography>
                          <Typography sx={{ fontWeight: 900 }}>{nfMoney(exp)}</Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Contado
                          </Typography>
                          <Typography sx={{ fontWeight: 900 }}>{nfMoney(cnt)}</Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Dif.
                          </Typography>
                          <Typography
                            sx={{
                              fontWeight: 900,
                              color: diff === 0 ? 'success.main' : diff > 0 ? 'warning.main' : 'error.main',
                            }}
                          >
                            {nfMoney(diff)}
                          </Typography>
                        </Box>
                      </Stack>
                    </Paper>
                  );
                })}
              </Box>

              <Paper
                variant="outlined"
                sx={{
                  mt: 2,
                  borderRadius: 4,
                  p: 2,
                  borderColor: 'rgba(0,0,0,0.08)',
                }}
              >
                <Stack direction={{ xs: 'column', sm: 'row' }} gap={1} justifyContent="space-between">
                  <Chip label={`Total esperado: ${nfMoney(expectedSum)}`} sx={{ fontWeight: 900, borderRadius: 999 }} />
                  <Chip label={`Total contado: ${nfMoney(countedSum)}`} sx={{ fontWeight: 900, borderRadius: 999 }} />
                  <Chip
                    label={`Diferencia: ${nfMoney(diffSum)}`}
                    sx={{
                      fontWeight: 900,
                      borderRadius: 999,
                      backgroundColor:
                        diffSum === 0 ? alpha('#10b981', 0.12) : diffSum > 0 ? alpha('#f59e0b', 0.14) : alpha('#ef4444', 0.12),
                      color: diffSum === 0 ? '#0f766e' : diffSum > 0 ? '#b45309' : '#b91c1c',
                    }}
                  />
                </Stack>
              </Paper>
            </>
          ) : tab === 2 ? (
            <>
              {/* MOVIMIENTOS (HOY) */}
              <Stack direction={{ xs: 'column', md: 'row' }} gap={1.25} alignItems={{ md: 'center' }} justifyContent="space-between">
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 900, mb: 0.5 }}>
                    Movimientos (hoy)
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Libro de caja (pagos + movimientos).
                  </Typography>
                </Box>

                <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.25} sx={{ flexWrap: 'wrap' }}>
                  {/* Acciones rápidas (Paso 4) */}
                  <Button
                    variant="contained"
                    disabled={!isOpen || loading}
                    onClick={() => openMovementDialog('INCOME')}
                    sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 900 }}
                  >
                    + Ingreso
                  </Button>
                  <Button
                    variant="contained"
                    color="warning"
                    disabled={!isOpen || loading}
                    onClick={() => openMovementDialog('EXPENSE')}
                    sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 900 }}
                  >
                    + Egreso
                  </Button>
                  <Button
                    variant="outlined"
                    disabled={!isOpen || loading}
                    onClick={() => openMovementDialog('ADJUSTMENT')}
                    sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 900 }}
                  >
                    Ajuste
                  </Button>

                  <TextField size="small" label="Buscar" value={ledgerQ} onChange={(e) => setLedgerQ(e.target.value)} sx={{ minWidth: { sm: 240 } }} />
                  <TextField
                    size="small"
                    select
                    label="Tipo"
                    value={ledgerKind}
                    onChange={(e) => setLedgerKind(e.target.value as any)}
                    sx={{ minWidth: 160 }}
                  >
                    <MenuItem value="ALL">Todos</MenuItem>
                    <MenuItem value="PAYMENT">Pagos</MenuItem>
                    <MenuItem value="MOVEMENT">Movimientos</MenuItem>
                  </TextField>
                  <TextField
                    size="small"
                    select
                    label="Método"
                    value={ledgerMethod}
                    onChange={(e) => setLedgerMethod(e.target.value as any)}
                    sx={{ minWidth: 160 }}
                  >
                    <MenuItem value="ALL">Todos</MenuItem>
                    <MenuItem value="CASH">CASH</MenuItem>
                    <MenuItem value="CARD">CARD</MenuItem>
                    <MenuItem value="TRANSFER">TRANSFER</MenuItem>
                    <MenuItem value="OTHER">OTHER</MenuItem>
                  </TextField>
                </Stack>
              </Stack>

              <Divider sx={{ my: 2 }} />

              {!cash?.id ? (
                <Alert severity="info" sx={{ borderRadius: 3 }}>
                  No hay caja abierta para mostrar el libro.
                </Alert>
              ) : !ledger ? (
                <Alert severity="warning" sx={{ borderRadius: 3 }}>
                  No se pudo cargar el libro. Verificá <b>/cash/{'{id}'}/ledger</b>.
                </Alert>
              ) : ledgerFiltered.length === 0 ? (
                <Alert severity="info" sx={{ borderRadius: 3 }}>
                  No hay movimientos con los filtros aplicados.
                </Alert>
              ) : (
                <Paper variant="outlined" sx={{ borderRadius: 4, borderColor: 'rgba(0,0,0,0.08)', overflow: 'hidden' }}>
                  <TableContainer sx={{ maxHeight: 560 }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 900, backgroundColor: 'rgba(0,0,0,0.02)' }}>Fecha</TableCell>
                          <TableCell sx={{ fontWeight: 900, backgroundColor: 'rgba(0,0,0,0.02)' }}>Tipo</TableCell>
                          <TableCell sx={{ fontWeight: 900, backgroundColor: 'rgba(0,0,0,0.02)' }}>Detalle</TableCell>
                          <TableCell sx={{ fontWeight: 900, backgroundColor: 'rgba(0,0,0,0.02)' }}>Método</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 900, backgroundColor: 'rgba(0,0,0,0.02)' }}>
                            Monto
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {ledgerFiltered.map((it, idx) => (
                          <TableRow
                            key={`${it.kind}-${it.id}`}
                            hover
                            sx={{
                              '& td': { borderBottomColor: 'rgba(0,0,0,0.06)' },
                              backgroundColor: idx % 2 === 0 ? 'rgba(0,0,0,0.012)' : 'transparent',
                            }}
                          >
                            <TableCell>{nfDate(it.moment)}</TableCell>
                            <TableCell>
                              <Chip
                                size="small"
                                label={it.kind === 'PAYMENT' ? 'Pago' : 'Movimiento'}
                                sx={{
                                  fontWeight: 900,
                                  borderRadius: 999,
                                  backgroundColor: it.kind === 'PAYMENT' ? alpha('#3b82f6', 0.12) : alpha('#111827', 0.06),
                                  color: it.kind === 'PAYMENT' ? '#1d4ed8' : 'text.primary',
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              <Typography sx={{ fontWeight: 800 }}>{rowLabel(it)}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {rowSecondary(it)}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip size="small" label={it.method} sx={{ fontWeight: 900, borderRadius: 999 }} />
                            </TableCell>
                            <TableCell align="right" sx={{ fontWeight: 900 }}>
                              {nfMoney(it.amount)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>
              )}
            </>
          ) : (
            <>
              {/* HISTORIAL */}
              <Stack direction={{ xs: 'column', md: 'row' }} gap={1.25} alignItems={{ md: 'center' }} justifyContent="space-between">
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 900, mb: 0.5 }}>
                    Historial de caja
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Cajas por fecha y sucursal. Abrí una fila para ver el libro.
                  </Typography>
                </Box>

                <Button
                  onClick={fetchHistory}
                  disabled={historyLoading}
                  variant="outlined"
                  sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 900 }}
                >
                  {historyLoading ? 'Cargando…' : 'Actualizar'}
                </Button>
              </Stack>

              <Divider sx={{ my: 2 }} />

              <Paper variant="outlined" sx={{ borderRadius: 4, p: 2, borderColor: 'rgba(0,0,0,0.08)', mb: 2 }}>
                <Stack direction={{ xs: 'column', md: 'row' }} gap={1.25} alignItems={{ md: 'center' }}>
                  <TextField
                    select
                    size="small"
                    label="Sucursal"
                    value={historyFilters.branchId}
                    onChange={(e) => {
                      setHistoryPage((p) => ({ ...p, skip: 0 }));
                      setHistoryFilters((f) => ({ ...f, branchId: e.target.value }));
                    }}
                    sx={{ minWidth: { xs: '100%', md: 240 } }}
                  >
                    <MenuItem value="">
                      <em>Todas</em>
                    </MenuItem>
                    {branches.map((b) => (
                      <MenuItem key={b.branchId} value={b.branchId}>
                        {b.branchName}
                      </MenuItem>
                    ))}
                  </TextField>

                  <TextField
                    select
                    size="small"
                    label="Estado"
                    value={historyFilters.status}
                    onChange={(e) => {
                      setHistoryPage((p) => ({ ...p, skip: 0 }));
                      setHistoryFilters((f) => ({ ...f, status: e.target.value as any }));
                    }}
                    sx={{ minWidth: { xs: '100%', md: 200 } }}
                  >
                    <MenuItem value="">
                      <em>Todos</em>
                    </MenuItem>
                    <MenuItem value="OPEN">OPEN</MenuItem>
                    <MenuItem value="CLOSED">CLOSED</MenuItem>
                  </TextField>

                  <TextField
                    size="small"
                    label="Desde"
                    type="date"
                    value={historyFilters.from}
                    onChange={(e) => {
                      setHistoryPage((p) => ({ ...p, skip: 0 }));
                      setHistoryFilters((f) => ({ ...f, from: e.target.value }));
                    }}
                    InputLabelProps={{ shrink: true }}
                    sx={{ minWidth: { xs: '100%', md: 180 } }}
                  />
                  <TextField
                    size="small"
                    label="Hasta"
                    type="date"
                    value={historyFilters.to}
                    onChange={(e) => {
                      setHistoryPage((p) => ({ ...p, skip: 0 }));
                      setHistoryFilters((f) => ({ ...f, to: e.target.value }));
                    }}
                    InputLabelProps={{ shrink: true }}
                    sx={{ minWidth: { xs: '100%', md: 180 } }}
                  />

                  <Button
                    variant="outlined"
                    onClick={() => setHistoryPage((p) => ({ ...p, skip: 0 }))}
                    sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 900, minWidth: { xs: '100%', md: 140 } }}
                  >
                    Buscar
                  </Button>
                </Stack>
              </Paper>

              {historyError && (
                <Alert severity="error" sx={{ borderRadius: 3, mb: 2 }}>
                  {historyError}
                </Alert>
              )}

              <Paper variant="outlined" sx={{ borderRadius: 4, borderColor: 'rgba(0,0,0,0.08)', overflow: 'hidden' }}>
                <TableContainer sx={{ maxHeight: 620 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 900, backgroundColor: 'rgba(0,0,0,0.02)' }}>Día</TableCell>
                        <TableCell sx={{ fontWeight: 900, backgroundColor: 'rgba(0,0,0,0.02)' }}>Sucursal</TableCell>
                        <TableCell sx={{ fontWeight: 900, backgroundColor: 'rgba(0,0,0,0.02)' }}>Estado</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 900, backgroundColor: 'rgba(0,0,0,0.02)' }}>
                          Esperado
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 900, backgroundColor: 'rgba(0,0,0,0.02)' }}>
                          Contado
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 900, backgroundColor: 'rgba(0,0,0,0.02)' }}>
                          Dif.
                        </TableCell>
                        <TableCell sx={{ fontWeight: 900, backgroundColor: 'rgba(0,0,0,0.02)' }}>Acción</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {!historyLoading && history.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} sx={{ py: 4 }}>
                            <Typography variant="body2" color="text.secondary">
                              Sin resultados.
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )}

                      {history.map((r, idx) => (
                        <TableRow
                          key={r.id}
                          hover
                          sx={{
                            '& td': { borderBottomColor: 'rgba(0,0,0,0.06)' },
                            backgroundColor: idx % 2 === 0 ? 'rgba(0,0,0,0.012)' : 'transparent',
                          }}
                        >
                          <TableCell>{nfDateOnly(r.businessDate)}</TableCell>
                          <TableCell>{r.branch?.name ?? r.branchId}</TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={r.status}
                              sx={{
                                fontWeight: 900,
                                borderRadius: 999,
                                backgroundColor: r.status === 'CLOSED' ? alpha('#111827', 0.06) : alpha('#10b981', 0.12),
                                color: r.status === 'CLOSED' ? 'text.primary' : '#0f766e',
                              }}
                            />
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 900 }}>
                            {nfMoney(r.expectedSum)}
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 900 }}>
                            {nfMoney(r.countedSum)}
                          </TableCell>
                          <TableCell
                            align="right"
                            sx={{
                              fontWeight: 900,
                              color: r.diffSum === 0 ? 'success.main' : r.diffSum > 0 ? 'warning.main' : 'error.main',
                            }}
                          >
                            {nfMoney(r.diffSum)}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="small"
                              onClick={() => openHistoryDetail(r)}
                              sx={{ textTransform: 'none', fontWeight: 900, borderRadius: 2.5 }}
                            >
                              Ver detalle
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                <Divider />

                <Stack direction={{ xs: 'column', sm: 'row' }} gap={1} alignItems="center" justifyContent="space-between" sx={{ p: 1.5 }}>
                  <Typography variant="caption" color="text.secondary">
                    Página: {Math.floor(historyPage.skip / historyPage.take) + 1}
                  </Typography>

                  <Stack direction="row" gap={1}>
                    <Button
                      variant="outlined"
                      disabled={historyPage.skip === 0 || historyLoading}
                      onClick={() => setHistoryPage((p) => ({ ...p, skip: Math.max(0, p.skip - p.take) }))}
                      sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 900 }}
                    >
                      Anterior
                    </Button>
                    <Button
                      variant="outlined"
                      disabled={history.length < historyPage.take || historyLoading}
                      onClick={() => setHistoryPage((p) => ({ ...p, skip: p.skip + p.take }))}
                      sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 900 }}
                    >
                      Siguiente
                    </Button>
                  </Stack>
                </Stack>
              </Paper>

              {/* MODAL DETALLE HISTORIAL */}
              <Dialog open={histDetailOpen} onClose={closeHistoryDetail} fullWidth maxWidth="md">
                <DialogTitle sx={{ fontWeight: 900 }}>
                  Detalle de caja{histDetailCash?.branch?.name ? ` • ${histDetailCash.branch.name}` : ''}
                </DialogTitle>

                <DialogContent dividers>
                  {histDetailLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                      <CircularProgress />
                    </Box>
                  ) : histDetailError ? (
                    <Alert severity="error">{histDetailError}</Alert>
                  ) : histDetailLedger && histDetailCash ? (
                    <>
                      <Stack direction={{ xs: 'column', sm: 'row' }} gap={1} sx={{ mb: 2, flexWrap: 'wrap' }}>
                        <Chip label={`Día: ${nfDateOnly(histDetailCash.businessDate)}`} sx={{ fontWeight: 900, borderRadius: 999 }} />
                        <Chip label={`Esperado: ${nfMoney(histDetailCash.expectedSum)}`} sx={{ fontWeight: 900, borderRadius: 999 }} />
                        <Chip label={`Contado: ${nfMoney(histDetailCash.countedSum)}`} sx={{ fontWeight: 900, borderRadius: 999 }} />
                        <Chip
                          label={`Dif.: ${nfMoney(histDetailCash.diffSum)}`}
                          sx={{
                            fontWeight: 900,
                            borderRadius: 999,
                            backgroundColor:
                              histDetailCash.diffSum === 0
                                ? alpha('#10b981', 0.12)
                                : histDetailCash.diffSum > 0
                                  ? alpha('#f59e0b', 0.14)
                                  : alpha('#ef4444', 0.12),
                            color:
                              histDetailCash.diffSum === 0
                                ? '#0f766e'
                                : histDetailCash.diffSum > 0
                                  ? '#b45309'
                                  : '#b91c1c',
                          }}
                        />
                      </Stack>

                      <Paper variant="outlined" sx={{ borderRadius: 4, borderColor: 'rgba(0,0,0,0.08)', overflow: 'hidden' }}>
                        <TableContainer sx={{ maxHeight: 520 }}>
                          <Table size="small" stickyHeader>
                            <TableHead>
                              <TableRow>
                                <TableCell sx={{ fontWeight: 900, backgroundColor: 'rgba(0,0,0,0.02)' }}>Fecha</TableCell>
                                <TableCell sx={{ fontWeight: 900, backgroundColor: 'rgba(0,0,0,0.02)' }}>Tipo</TableCell>
                                <TableCell sx={{ fontWeight: 900, backgroundColor: 'rgba(0,0,0,0.02)' }}>Detalle</TableCell>
                                <TableCell sx={{ fontWeight: 900, backgroundColor: 'rgba(0,0,0,0.02)' }}>Método</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 900, backgroundColor: 'rgba(0,0,0,0.02)' }}>
                                  Monto
                                </TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {histDetailLedger.items.map((it, idx) => (
                                <TableRow
                                  key={`${it.kind}-${it.id}`}
                                  hover
                                  sx={{
                                    '& td': { borderBottomColor: 'rgba(0,0,0,0.06)' },
                                    backgroundColor: idx % 2 === 0 ? 'rgba(0,0,0,0.012)' : 'transparent',
                                  }}
                                >
                                  <TableCell>{nfDate(it.moment)}</TableCell>
                                  <TableCell>
                                    <Chip
                                      size="small"
                                      label={it.kind === 'PAYMENT' ? 'Pago' : 'Movimiento'}
                                      sx={{
                                        fontWeight: 900,
                                        borderRadius: 999,
                                        backgroundColor: it.kind === 'PAYMENT' ? alpha('#3b82f6', 0.12) : alpha('#111827', 0.06),
                                        color: it.kind === 'PAYMENT' ? '#1d4ed8' : 'text.primary',
                                      }}
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <Typography sx={{ fontWeight: 800 }}>{rowLabel(it)}</Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      {rowSecondary(it)}
                                    </Typography>
                                  </TableCell>
                                  <TableCell>
                                    <Chip size="small" label={it.method} sx={{ fontWeight: 900, borderRadius: 999 }} />
                                  </TableCell>
                                  <TableCell align="right" sx={{ fontWeight: 900 }}>
                                    {nfMoney(it.amount)}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </Paper>
                    </>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      Sin datos.
                    </Typography>
                  )}
                </DialogContent>

                <DialogActions>
                  <Button onClick={closeHistoryDetail} sx={{ textTransform: 'none', fontWeight: 900 }}>
                    Cerrar
                  </Button>
                </DialogActions>
              </Dialog>
            </>
          )}
        </Box>
      </Paper>

      {/* MODAL: ALTA MOVIMIENTO (Paso 4) */}
      <Dialog open={movOpen} onClose={closeMovementDialog} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 900 }}>Registrar movimiento</DialogTitle>

        <DialogContent dividers>
          {!isOpen && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              No hay caja abierta. Abrí una caja para registrar movimientos.
            </Alert>
          )}

          {movError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {movError}
            </Alert>
          )}

          <Stack spacing={1.25}>
            <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.25}>
              <TextField select label="Tipo" value={movType} onChange={(e) => setMovType(e.target.value as MovementType)} fullWidth>
                {MOVEMENT_TYPES.map((t) => (
                  <MenuItem key={t} value={t}>
                    {movementTypeLabel(t)}
                  </MenuItem>
                ))}
              </TextField>

              <TextField select label="Método" value={movMethod} onChange={(e) => setMovMethod(e.target.value as MovementMethod)} fullWidth>
                {MOVEMENT_METHODS.map((m) => (
                  <MenuItem key={m} value={m}>
                    {m}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>

            <TextField
              label="Monto"
              type="number"
              value={movAmount}
              onChange={(e) => setMovAmount(toNumber(e.target.value))}
              inputProps={{ min: 0, step: 100 }}
              helperText="Debe ser mayor a 0"
              fullWidth
            />

            <TextField
              label="Descripción"
              value={movDesc}
              onChange={(e) => setMovDesc(e.target.value)}
              placeholder={movType === 'EXPENSE' ? 'Ej: Compra de insumos, retiro, etc.' : 'Opcional'}
              fullWidth
              multiline
              minRows={2}
              helperText={movType === 'EXPENSE' || movType === 'ADJUSTMENT' ? 'Obligatoria para egresos/ajustes (auditoría).' : 'Opcional para ingresos.'}
            />

            <Stack direction="row" gap={1} alignItems="center" sx={{ flexWrap: 'wrap' }}>
              <Chip label={movementTypeLabel(movType)} color={movementTypeChipColor(movType)} sx={{ fontWeight: 900, borderRadius: 999 }} />
              <Chip label={movMethod} sx={{ fontWeight: 900, borderRadius: 999 }} />
              <Chip label={nfMoney(toNumber(movAmount))} sx={{ fontWeight: 900, borderRadius: 999 }} />
            </Stack>
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button onClick={closeMovementDialog} disabled={movSubmitting} sx={{ textTransform: 'none', fontWeight: 900 }}>
            Cancelar
          </Button>
          <Button
            onClick={submitMovement}
            disabled={movSubmitting || !isOpen}
            variant="contained"
            sx={{ textTransform: 'none', fontWeight: 900, borderRadius: 2.5 }}
          >
            {movSubmitting ? 'Guardando…' : 'Confirmar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* MODAL: RESUMEN POST-CIERRE */}
      <CloseSummaryDialog
        open={closeSummaryOpen}
        onClose={closeSummaryClose}
        summary={closeSummary}
        branchName={selectedBranchName}
        nfMoney={nfMoney}
        nfDate={nfDate}
        nfDateOnly={nfDateOnly}
        ledgerStats={ledgerStats}
        fallbackBusinessDate={cash?.businessDate}
        fallbackOpenedAt={cash?.openedAt}
      />
    </Box>
  );
}