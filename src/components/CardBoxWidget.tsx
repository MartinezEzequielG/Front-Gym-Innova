import { Box, Typography } from '@mui/material';
import Icon from '@mdi/react';

interface CardBoxWidgetProps {
  icon: string;
  number: number | string;
  label: string;
  color?: string;
  trend?: string;
  trendType?: 'up' | 'down' | 'alert';
  prefix?: string;
  suffix?: string;
}

/*const trendColor = {
  up: 'text-emerald-500',
  down: 'text-blue-500',
  alert: 'text-red-500',
};*/

export const CardBoxWidget: React.FC<CardBoxWidgetProps> = ({
  icon,
  number,
  label,
  color = '#1976d2',
  trend,
  trendType,
  prefix,
  suffix,
}) => (
  <Box
    sx={{
      bgcolor: '#fff',
      p: 3,
      borderRadius: 2,
      boxShadow: 1,
      display: 'flex',
      alignItems: 'center',
      gap: 2,
      minHeight: 100,
    }}
  >
    <Icon path={icon} size={2} color={color} />
    <Box>
      <Typography variant="h5" fontWeight={700}>
        {prefix}{number}{suffix}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      {trend && (
        <Typography
          variant="caption"
          sx={{
            color:
              trendType === 'up'
                ? 'green'
                : trendType === 'down'
                ? 'blue'
                : trendType === 'alert'
                ? 'red'
                : 'inherit',
            fontWeight: 600,
          }}
        >
          {trendType === 'up' && '▲ '}
          {trendType === 'down' && '▼ '}
          {trend}
        </Typography>
      )}
    </Box>
  </Box>
);