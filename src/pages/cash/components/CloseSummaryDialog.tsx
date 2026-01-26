import {
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';

export type Totals4 = { CASH: number; CARD: number; TRANSFER: number; OTHER: number };

export type CloseResult = {
  cash: any;
  expected: Totals4;
  counted: Totals4;
  difference: Totals4;
};

export type LedgerStats = { payments: number; moves: number; last: string | null };

function safeNum(n: any) {
  const v = Number(n);
  return Number.isFinite(v) ? v : 0;
}

function sumTotals(t?: Partial<Totals4>) {
  return safeNum(t?.CASH) + safeNum(t?.CARD) + safeNum(t?.TRANSFER) + safeNum(t?.OTHER);
}

function buildCloseSummaryText(params: {
  branchName: string;
  businessDate?: string | null;
  openedAt?: string | null;
  closedAt?: string | null;
  expected?: Partial<Totals4>;
  counted?: Partial<Totals4>;
  difference?: Partial<Totals4>;
  nfMoney: (n: number) => string;
  nfDate: (iso?: string | null) => string;
  nfDateOnly: (iso?: string | null) => string;
}) {
  const { nfMoney, nfDate, nfDateOnly } = params;

  const lines: string[] = [
    `RESUMEN DE CIERRE DE CAJA`,
    `Sucursal: ${params.branchName || '—'}`,
    `Día: ${nfDateOnly(params.businessDate ?? null)}`,
    `Apertura: ${nfDate(params.openedAt ?? null)}`,
    `Cierre: ${nfDate(params.closedAt ?? null)}`,
    ``,
    `Método | Esperado | Contado | Diferencia`,
  ];

  (['CASH', 'CARD', 'TRANSFER', 'OTHER'] as const).forEach((m) => {
    lines.push(
      `${m} | ${nfMoney(safeNum(params.expected?.[m]))} | ${nfMoney(safeNum(params.counted?.[m]))} | ${nfMoney(
        safeNum(params.difference?.[m]),
      )}`,
    );
  });

  const expSum = sumTotals(params.expected);
  const cntSum = sumTotals(params.counted);
  const difSum = cntSum - expSum;

  lines.push(``);
  lines.push(`Total esperado: ${nfMoney(expSum)}`);
  lines.push(`Total contado: ${nfMoney(cntSum)}`);
  lines.push(`Diferencia: ${nfMoney(difSum)}`);

  return lines.join('\n');
}

export default function CloseSummaryDialog(props: {
  open: boolean;
  onClose: () => void;

  summary: CloseResult | null;
  branchName: string;

  // fallbacks opcionales
  fallbackBusinessDate?: string | null;
  fallbackOpenedAt?: string | null;

  ledgerStats?: LedgerStats;

  nfMoney: (n: number) => string;
  nfDate: (iso?: string | null) => string;
  nfDateOnly: (iso?: string | null) => string;
}) {
  const { open, onClose, summary, branchName, nfMoney, nfDate, nfDateOnly, ledgerStats } = props;

  const businessDate = summary?.cash?.businessDate ?? props.fallbackBusinessDate ?? null;
  const openedAt = summary?.cash?.openedAt ?? props.fallbackOpenedAt ?? null;
  const closedAt = summary?.cash?.closedAt ?? null;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 900 }}>Resumen de cierre</DialogTitle>

      <DialogContent dividers>
        {!summary ? (
          <Typography variant="body2" color="text.secondary">
            Sin datos.
          </Typography>
        ) : (
          <>
            <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mb: 2 }}>
              <Chip label={`Sucursal: ${branchName || '—'}`} sx={{ fontWeight: 900, borderRadius: 999 }} />
              <Chip label={`Día: ${nfDateOnly(businessDate)}`} sx={{ fontWeight: 900, borderRadius: 999 }} />
              <Chip label={`Apertura: ${nfDate(openedAt)}`} sx={{ fontWeight: 900, borderRadius: 999 }} />
              <Chip label={`Cierre: ${nfDate(closedAt)}`} sx={{ fontWeight: 900, borderRadius: 999 }} />
            </Stack>

            <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 900 }}>Método</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 900 }}>
                      Esperado
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 900 }}>
                      Contado
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 900 }}>
                      Dif.
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(['CASH', 'CARD', 'TRANSFER', 'OTHER'] as const).map((m) => {
                    const dif = safeNum(summary.difference?.[m]);
                    return (
                      <TableRow key={m}>
                        <TableCell sx={{ fontWeight: 900 }}>{m}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 900 }}>
                          {nfMoney(safeNum(summary.expected?.[m]))}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 900 }}>
                          {nfMoney(safeNum(summary.counted?.[m]))}
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{
                            fontWeight: 900,
                            color: dif === 0 ? 'success.main' : dif > 0 ? 'warning.main' : 'error.main',
                          }}
                        >
                          {nfMoney(dif)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Paper>

            <Divider sx={{ my: 2 }} />

            {!!ledgerStats && (
              <Stack direction="row" gap={1} flexWrap="wrap">
                <Chip label={`Pagos: ${ledgerStats.payments ?? 0}`} sx={{ fontWeight: 900, borderRadius: 999 }} />
                <Chip label={`Movimientos: ${ledgerStats.moves ?? 0}`} sx={{ fontWeight: 900, borderRadius: 999 }} />
                <Chip label={`Último: ${ledgerStats.last ? nfDate(ledgerStats.last) : '—'}`} sx={{ fontWeight: 900, borderRadius: 999 }} />
              </Stack>
            )}
          </>
        )}
      </DialogContent>

      <DialogActions>
        <Button
          onClick={async () => {
            if (!summary) return;

            const txt = buildCloseSummaryText({
              branchName,
              businessDate,
              openedAt,
              closedAt,
              expected: summary.expected,
              counted: summary.counted,
              difference: summary.difference,
              nfMoney,
              nfDate,
              nfDateOnly,
            });

            try {
              await navigator.clipboard.writeText(txt);
            } catch {
              // no rompemos la UX si el clipboard falla
            }
          }}
          sx={{ textTransform: 'none', fontWeight: 900 }}
        >
          Copiar resumen
        </Button>

        <Button onClick={() => window.print()} variant="outlined" sx={{ textTransform: 'none', fontWeight: 900 }}>
          Imprimir
        </Button>

        <Button onClick={onClose} variant="contained" sx={{ textTransform: 'none', fontWeight: 900 }}>
          Cerrar
        </Button>
      </DialogActions>
    </Dialog>
  );
}