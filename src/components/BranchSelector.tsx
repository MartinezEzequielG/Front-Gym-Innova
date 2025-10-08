import React from 'react';
import { FormControl, InputLabel, Select, MenuItem } from '@mui/material';

interface Branch {
  id: string;
  name: string;
  address: string;
}

interface BranchSelectorProps {
  branches: Branch[];
  value: string;
  onChange: (branchId: string) => void;
  required?: boolean;
  label?: string;
  disabled?: boolean;
}

export const BranchSelector: React.FC<BranchSelectorProps> = ({
  branches,
  value,
  onChange,
  required = false,
  label = "Sucursal",
  disabled = false
}) => (
  <FormControl fullWidth required={required} disabled={disabled}>
    <InputLabel>{label}</InputLabel>
    <Select
      value={value}
      onChange={e => onChange(e.target.value)}
      label={label}
    >
      {branches.map(branch => (
        <MenuItem key={branch.id} value={branch.id}>
          {branch.name} - {branch.address}
        </MenuItem>
      ))}
    </Select>
  </FormControl>
);