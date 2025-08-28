import React, { useEffect, useState } from 'react';
import {
  Typography, Table, TableHead, TableRow, TableCell, TableBody, Paper,
  IconButton, Select, MenuItem, TextField, Button, Box
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

const roles = ['ADMIN', 'MANAGER', 'EMPLOYEE', 'ACCOUNTANT'];

export const UsersPage: React.FC = () => {
  const { token, user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (token) {
      axios.get<User[]>('http://localhost:3000/api/v1/users', {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => setUsers(res.data))
      .catch(() => setUsers([]));
    }
  }, [token]);

  const handleEdit = (user: User) => {
    setEditId(user.id);
    setEditName(user.name);
    setEditRole(user.role);
  };

  const handleSave = async (id: number) => {
    setLoading(true);
    try {
      await axios.patch(`http://localhost:3000/api/v1/users/${id}`, { name: editName }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await axios.patch(`http://localhost:3000/api/v1/users/${id}/role`, { role: editRole }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(users.map(u =>
        u.id === id ? { ...u, name: editName, role: editRole } : u
      ));
      setEditId(null);
    } catch {}
    setLoading(false);
  };

  const handleDelete = async (id: number) => {
    setLoading(true);
    try {
      await axios.delete(`http://localhost:3000/api/v1/users/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(users.filter(u => u.id !== id));
    } catch {}
    setLoading(false);
  };

  const isAdmin = currentUser?.role === 'ADMIN';

  return (
    <Paper sx={{ p: 3, mt: 4 }}>
      <Typography variant="h5" gutterBottom>
        Usuarios registrados
      </Typography>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Email</TableCell>
            <TableCell>Rol</TableCell>
            {isAdmin && <TableCell align="center">Actions</TableCell>}
          </TableRow>
        </TableHead>
        <TableBody>
          {users.map(user => (
            <TableRow key={user.id}>
              <TableCell>
                {editId === user.id ? (
                  <TextField
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    size="small"
                  />
                ) : (
                  user.name
                )}
              </TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>
                {editId === user.id ? (
                  <Select
                    value={editRole}
                    onChange={e => setEditRole(e.target.value)}
                    size="small"
                  >
                    {roles.map(role => (
                      <MenuItem key={role} value={role}>{role}</MenuItem>
                    ))}
                  </Select>
                ) : (
                  user.role
                )}
              </TableCell>
              {isAdmin && (
                <TableCell align="center">
                  {editId === user.id ? (
                    <IconButton onClick={() => handleSave(user.id)} disabled={loading}>
                      <SaveIcon />
                    </IconButton>
                  ) : (
                    <>
                      <IconButton onClick={() => handleEdit(user)}>
                        <EditIcon />
                      </IconButton>
                      <IconButton onClick={() => handleDelete(user.id)} disabled={loading}>
                        <DeleteIcon color="error" />
                      </IconButton>
                    </>
                  )}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Paper>
  );
};

export default UsersPage;