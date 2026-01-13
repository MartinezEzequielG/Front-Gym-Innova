import { useEffect, useMemo, useState } from 'react';
import { Layout } from '../components/Layout';
import { mdiAccountMultiple, mdiCartOutline, mdiChartTimelineVariant, mdiRefresh } from '@mdi/js';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
} from '@mui/material';

type Status = 'idle' | 'loading' | 'success' | 'error';

type DashboardSummary = {
  clientsCount: number;
  revenueToday: number;
  alertsCount: number;
};

type ByBranchRow = {
  branchId: string;
  branchName: string;
  clientsCount: number;
  subscriptionsActive: number;
  subscriptionsTotal: number;
  subscriptionsPendingPayment: number;
  revenueToday: number;
  revenueMonthToDate: number;
};

function IconBadge({ path, bg }: { path: string; bg: string }) {
  return (
    <Box
      sx={{
        width: 44,
        height: 44,
        borderRadius: 999,
        display: 'grid',
        placeItems: 'center',
        background: bg,
        boxShadow: '0 6px 20px rgba(0,0,0,0.08)',
        flex: '0 0 auto',
      }}
    >
      <svg width={22} height={22} aria-hidden="true">
        <path d={path} fill="#fff" />
      </svg>
    </Box>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
  iconPath,
  iconBg,
  loading,
}: {
  title: string;
  value: string;
  subtitle: string;
  iconPath: string;
  iconBg: string;
  loading?: boolean;
}) {
  return (
    <Paper
      variant="outlined"
      sx={{
        borderRadius: 3,
        p: 2.25,
        background: 'linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(255,255,255,0.78) 100%)',
        backdropFilter: 'blur(6px)',
        borderColor: 'rgba(0,0,0,0.08)',
        boxShadow: '0 10px 30px rgba(0,0,0,0.06)',
        minHeight: 120,
      }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between" gap={2}>
        <Stack spacing={0.5} sx={{ minWidth: 0 }}>
          <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: 0.2 }}>
            {title}
          </Typography>

          <Typography
            variant="h4"
            sx={{
              fontWeight: 900,
              lineHeight: 1.05,
              letterSpacing: -0.6,
            }}
          >
            {loading ? '—' : value}
          </Typography>

          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {subtitle}
          </Typography>
        </Stack>

        <IconBadge path={iconPath} bg={iconBg} />
      </Stack>
    </Paper>
  );
}

export default function DashboardPage() {
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [byBranch, setByBranch] = useState<ByBranchRow[]>([]);

  // ✅ branchId reactivo + persistido
  const [branchId, setBranchId] = useState<string>(() => localStorage.getItem('lastSelectedBranch') ?? '');

  const apiBase = useMemo(() => String((import.meta as any).env?.VITE_API_URL ?? '').replace(/\/$/, ''), []);
  const nfMoney = useMemo(
    () => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }),
    [],
  );
  const nfInt = useMemo(() => new Intl.NumberFormat('es-AR'), []);

  const fetchDashboard = async (branchOverride?: string) => {
    const effectiveBranchId = typeof branchOverride === 'string' ? branchOverride : branchId;

    setStatus('loading');
    setError(null);

    try {
      if (!apiBase) throw new Error('Falta configurar VITE_API_URL (URL del backend)');

      const qs = effectiveBranchId ? `?branchId=${encodeURIComponent(effectiveBranchId)}` : '';
      const urlSummary = `${apiBase}/dashboard/summary${qs}`;
      const urlByBranch = `${apiBase}/dashboard/by-branch`;

      const [resSummary, resByBranch] = await Promise.all([
        fetch(urlSummary, { method: 'GET', credentials: 'include', headers: { Accept: 'application/json' } }),
        fetch(urlByBranch, { method: 'GET', credentials: 'include', headers: { Accept: 'application/json' } }),
      ]);

      if (!resSummary.ok) {
        const body = await resSummary.text().catch(() => '');
        throw new Error(`Summary HTTP ${resSummary.status} - ${body.slice(0, 200)}`);
      }
      if (!resByBranch.ok) {
        const body = await resByBranch.text().catch(() => '');
        throw new Error(`ByBranch HTTP ${resByBranch.status} - ${body.slice(0, 200)}`);
      }

      const summaryJson = (await resSummary.json()) as DashboardSummary;
      const byBranchJson = (await resByBranch.json()) as ByBranchRow[];

      setData(summaryJson);
      setByBranch(byBranchJson);
      setStatus('success');
    } catch (e) {
      setStatus('error');
      setError(e instanceof Error ? e.message : 'Error desconocido');
    }
  };

  // ✅ refresca cuando cambia branchId (selección)
  useEffect(() => {
    fetchDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);

  const selectedBranchName = useMemo(() => {
    if (!branchId) return '';
    return byBranch.find((b) => b.branchId === branchId)?.branchName ?? '';
  }, [branchId, byBranch]);

  const loading = status === 'loading';

  const handleBranchChange = (next: string) => {
    setBranchId(next);
    localStorage.setItem('lastSelectedBranch', next);
  };

  return (
    <Layout>
      <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1250, mx: 'auto' }}>
        {/* Header card */}
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
            backdropFilter: 'blur(8px)',
          }}
        >
          <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ md: 'center' }} justifyContent="space-between" gap={2}>
            <Stack spacing={0.5} sx={{ flex: 1 }}>
              <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: 2.5,
                    display: 'grid',
                    placeItems: 'center',
                    background: 'linear-gradient(135deg, #1976d2, #42a5f5)',
                    boxShadow: '0 10px 24px rgba(25,118,210,0.25)',
                  }}
                >
                  <svg width={20} height={20}>
                    <path d={mdiChartTimelineVariant} fill="#fff" />
                  </svg>
                </Box>

                <Typography variant="h5" sx={{ fontWeight: 900, letterSpacing: -0.4 }}>
                  Dashboard
                </Typography>

                {branchId ? (
                  <Chip
                    size="small"
                    label={selectedBranchName ? `Sucursal: ${selectedBranchName}` : 'Sucursal seleccionada'}
                    sx={{
                      ml: 0.5,
                      fontWeight: 700,
                      borderRadius: 999,
                      backgroundColor: 'rgba(25,118,210,0.10)',
                      color: 'rgba(25,118,210,1)',
                    }}
                  />
                ) : (
                  <Chip
                    size="small"
                    label="Vista global"
                    sx={{
                      ml: 0.5,
                      fontWeight: 700,
                      borderRadius: 999,
                      backgroundColor: 'rgba(16,185,129,0.10)',
                      color: 'rgba(16,185,129,1)',
                    }}
                  />
                )}
              </Stack>

              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Métricas clave del día y resumen consolidado por sucursal.
              </Typography>
            </Stack>

            {/* ✅ Selector de sucursal + recargar */}
            <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.25} alignItems={{ sm: 'center' }}>
              <FormControl size="small" sx={{ minWidth: 240 }}>
                <InputLabel id="branch-select-label">Sucursal</InputLabel>
                <Select
                  labelId="branch-select-label"
                  value={branchId}
                  label="Sucursal"
                  onChange={(e) => handleBranchChange(String(e.target.value))}
                  sx={{
                    borderRadius: 2.5,
                    backgroundColor: 'rgba(255,255,255,0.9)',
                  }}
                >
                  <MenuItem value="">
                    <em>Todas (global)</em>
                  </MenuItem>

                  {byBranch.map((b) => (
                    <MenuItem key={b.branchId} value={b.branchId}>
                      {b.branchName}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Button
                onClick={() => fetchDashboard()}
                disabled={loading}
                variant="contained"
                sx={{
                  borderRadius: 2.5,
                  textTransform: 'none',
                  fontWeight: 800,
                  px: 2,
                  boxShadow: '0 12px 26px rgba(25,118,210,0.22)',
                  whiteSpace: 'nowrap',
                }}
                startIcon={
                  <svg width={18} height={18}>
                    <path d={mdiRefresh} fill="#fff" />
                  </svg>
                }
              >
                Recargar
              </Button>
            </Stack>
          </Stack>
        </Paper>

        {/* Status */}
        {status === 'loading' && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
            <CircularProgress size={18} />
            <Typography variant="body2" color="text.secondary">
              Cargando métricas…
            </Typography>
          </Box>
        )}

        {status === 'error' && (
          <Alert
            severity="error"
            sx={{ mb: 3, borderRadius: 3 }}
            action={
              <Button color="inherit" size="small" onClick={() => fetchDashboard()} sx={{ textTransform: 'none', fontWeight: 800 }}>
                Reintentar
              </Button>
            }
          >
            No se pudo cargar el dashboard: {error}
          </Alert>
        )}

        {/* Metric cards */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
            gap: 2.5,
            mb: 3,
          }}
        >
          <MetricCard
            title="Clientes"
            value={nfInt.format(data?.clientsCount ?? 0)}
            subtitle={branchId ? 'Clientes con suscripción en la sede' : 'Total registrados'}
            iconPath={mdiAccountMultiple}
            iconBg="linear-gradient(135deg, #10b981, #34d399)"
            loading={loading}
          />
          <MetricCard
            title="Recaudación (hoy)"
            value={nfMoney.format(data?.revenueToday ?? 0)}
            subtitle={branchId ? 'Pagos aprobados del día (sede)' : 'Pagos aprobados del día (global)'}
            iconPath={mdiCartOutline}
            iconBg="linear-gradient(135deg, #1976d2, #42a5f5)"
            loading={loading}
          />
          <MetricCard
            title="Alertas"
            value={nfInt.format(data?.alertsCount ?? 0)}
            subtitle="Vencimientos + pendientes"
            iconPath={mdiChartTimelineVariant}
            iconBg="linear-gradient(135deg, #ef4444, #f97316)"
            loading={loading}
          />
        </Box>

        {/* Table section */}
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
            <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} justifyContent="space-between" gap={1}>
              <Stack spacing={0.25}>
                <Typography variant="h6" sx={{ fontWeight: 900, letterSpacing: -0.3 }}>
                  Resumen por sucursal
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Clientes, suscripciones y facturación del día/mes.
                </Typography>
              </Stack>

              <Chip
                size="small"
                label={`${byBranch.length} sucursal${byBranch.length === 1 ? '' : 'es'}`}
                sx={{ borderRadius: 999, fontWeight: 800 }}
              />
            </Stack>
          </Box>

          <Divider />

          <TableContainer sx={{ maxHeight: 520 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 900, backgroundColor: 'rgba(0,0,0,0.02)' }}>Sucursal</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 900, backgroundColor: 'rgba(0,0,0,0.02)' }}>
                    Clientes
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 900, backgroundColor: 'rgba(0,0,0,0.02)' }}>
                    Subs. vigentes
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 900, backgroundColor: 'rgba(0,0,0,0.02)' }}>
                    Subs. totales
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 900, backgroundColor: 'rgba(0,0,0,0.02)' }}>
                    Pend. pago
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 900, backgroundColor: 'rgba(0,0,0,0.02)' }}>
                    Fact. hoy
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 900, backgroundColor: 'rgba(0,0,0,0.02)' }}>
                    Fact. mes
                  </TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {!loading && byBranch.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} sx={{ py: 4 }}>
                      <Typography variant="body2" color="text.secondary">
                        No hay información para mostrar.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}

                {byBranch.map((r, idx) => (
                  <TableRow
                    key={r.branchId}
                    hover
                    sx={{
                      '& td': { borderBottomColor: 'rgba(0,0,0,0.06)' },
                      backgroundColor: idx % 2 === 0 ? 'rgba(0,0,0,0.012)' : 'transparent',
                      opacity: branchId && branchId !== r.branchId ? 0.55 : 1,
                    }}
                  >
                    <TableCell sx={{ fontWeight: 800 }}>{r.branchName}</TableCell>
                    <TableCell align="right">{nfInt.format(r.clientsCount)}</TableCell>
                    <TableCell align="right">{nfInt.format(r.subscriptionsActive)}</TableCell>
                    <TableCell align="right">{nfInt.format(r.subscriptionsTotal)}</TableCell>
                    <TableCell align="right">
                      <Chip
                        size="small"
                        label={nfInt.format(r.subscriptionsPendingPayment)}
                        sx={{
                          borderRadius: 999,
                          fontWeight: 900,
                          backgroundColor:
                            r.subscriptionsPendingPayment > 0 ? 'rgba(239,68,68,0.10)' : 'rgba(16,185,129,0.10)',
                          color: r.subscriptionsPendingPayment > 0 ? 'rgba(239,68,68,1)' : 'rgba(16,185,129,1)',
                        }}
                      />
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800 }}>
                      {nfMoney.format(r.revenueToday)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800 }}>
                      {nfMoney.format(r.revenueMonthToDate)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Box>
    </Layout>
  );
}