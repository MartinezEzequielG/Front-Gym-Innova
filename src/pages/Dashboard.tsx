import { Layout } from '../components/Layout';
import { CardBoxWidget } from '../components/CardBoxWidget';
import { mdiAccountMultiple, mdiCartOutline, mdiChartTimelineVariant } from '@mdi/js';
import { Box, Typography } from '@mui/material';

export default function DashboardPage() {
  return (
    <Layout>
      <Box sx={{ p: { xs: 2, md: 4 } }}>
        <Typography variant="h5" fontWeight={700} mb={3} display="flex" alignItems="center" gap={1}>
          <span>
            <svg width={24} height={24} style={{ verticalAlign: 'middle' }}>
              <path d={mdiChartTimelineVariant} fill="#1976d2" />
            </svg>
          </span>
          Vista Previa
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: 'repeat(3, 1fr)' },
            gap: 3,
            mb: 4,
          }}
        >
          <CardBoxWidget
            trend="12%"
            trendType="up"
            color="#10b981"
            icon={mdiAccountMultiple}
            number={512}
            label="Clientes"
          />
          <CardBoxWidget
            trend="12%"
            trendType="down"
            color="#1976d2"
            icon={mdiCartOutline}
            number={7770}
            prefix="$"
            label="Ventas"
          />
          <CardBoxWidget
            trend="Overflow"
            trendType="alert"
            color="#ef4444"
            icon={mdiChartTimelineVariant}
            number={120}
            label="Alertas"
          />
        </Box>
      </Box>
    </Layout>
  );
}
