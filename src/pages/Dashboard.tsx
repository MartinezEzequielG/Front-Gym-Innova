import { useEffect, useMemo, useState } from 'react';
import { Layout } from '../components/Layout';
import { CardBoxWidget } from '../components/CardBoxWidget';
import { mdiAccountMultiple, mdiCartOutline, mdiChartTimelineVariant } from '@mdi/js';
import {
  Alert,
  Box,
  CircularProgress,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
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

export default function DashboardPage() {
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardSummary | null>(null);

  const [byBranch, setByBranch] = useState<ByBranchRow[]>([]);

  const branchId = useMemo(() => localStorage.getItem('lastSelectedBranch') ?? '', []);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setStatus('loading');
      setError(null);

      try {
        const apiBase = (import.meta as any).env?.VITE_API_URL ?? '';
        if (!apiBase) throw new Error('Falta configurar VITE_API_URL (URL del backend)');

        const qs = branchId ? `?branchId=${encodeURIComponent(branchId)}` : '';
        const urlSummary = `${String(apiBase).replace(/\/$/, '')}/dashboard/summary${qs}`;
        const urlByBranch = `${String(apiBase).replace(/\/$/, '')}/dashboard/by-branch`;

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

        if (!cancelled) {
          setData(summaryJson);
          setByBranch(byBranchJson);
          setStatus('success');
        }
      } catch (e) {
        if (!cancelled) {
          setStatus('error');
          setError(e instanceof Error ? e.message : 'Error desconocido');
        }
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [branchId]);

  return (
    <Layout>
      <Box sx={{ p: { xs: 2, md: 4 } }}>
        <Typography variant="h5" fontWeight={700} mb={3} display="flex" alignItems="center" gap={1}>
          <span>
            <svg width={24} height={24} style={{ verticalAlign: 'middle' }}>
              <path d={mdiChartTimelineVariant} fill="#1976d2" />
            </svg>
          </span>
          Dashboard
        </Typography>

        {status === 'loading' && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <CircularProgress size={18} />
            <Typography variant="body2">Cargando métricas…</Typography>
          </Box>
        )}

        {status === 'error' && <Alert severity="error">No se pudo cargar el dashboard: {error}</Alert>}

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: 'repeat(3, 1fr)' },
            gap: 3,
            mb: 4,
          }}
        >
          <CardBoxWidget
            trend=""
            trendType="up"
            color="#10b981"
            icon={mdiAccountMultiple}
            number={data?.clientsCount ?? 0}
            label="Clientes"
          />
          <CardBoxWidget
            trend=""
            trendType="up"
            color="#1976d2"
            icon={mdiCartOutline}
            number={data?.revenueToday ?? 0}
            prefix="$"
            label="Recaudación (hoy)"
          />
          <CardBoxWidget
            trend=""
            trendType="alert"
            color="#ef4444"
            icon={mdiChartTimelineVariant}
            number={data?.alertsCount ?? 0}
            label="Alertas"
          />
        </Box>

        <Typography variant="h6" fontWeight={700} mb={2}>
          Resumen por sucursal
        </Typography>

        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Sucursal</TableCell>
              <TableCell align="right">Clientes</TableCell>
              <TableCell align="right">Subs. vigentes</TableCell>
              <TableCell align="right">Subs. totales</TableCell>
              <TableCell align="right">Pend. pago</TableCell>
              <TableCell align="right">Fact. hoy</TableCell>
              <TableCell align="right">Fact. mes</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {byBranch.map((r) => (
              <TableRow key={r.branchId}>
                <TableCell>{r.branchName}</TableCell>
                <TableCell align="right">{r.clientsCount}</TableCell>
                <TableCell align="right">{r.subscriptionsActive}</TableCell>
                <TableCell align="right">{r.subscriptionsTotal}</TableCell>
                <TableCell align="right">{r.subscriptionsPendingPayment}</TableCell>
                <TableCell align="right">${r.revenueToday}</TableCell>
                <TableCell align="right">${r.revenueMonthToDate}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
    </Layout>
  );
}
