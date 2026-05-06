import React, { useEffect, useState } from 'react';
import {
  Typography, Table, TableHead, TableRow, TableCell, TableBody, Paper,
  IconButton, Select, MenuItem, TextField, Button, Dialog, DialogTitle, DialogContent, DialogActions, FormControl, InputLabel
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import AddIcon from '@mui/icons-material/Add';
import { api } from '../context/AuthContext';
import { useAuth } from '../context/AuthContext';

interface Branch {
  id: string;
  name: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  branchId?: string | null;
  branch?: Branch | null;
}

const roles = ['ADMIN', 'MANAGER', 'EMPLOYEE', 'ACCOUNTANT', 'CLIENT'];

export const UsersPage: React.FC = () => {
  const { user: currentUser } = useAuth();

  const isGlobalAdmin = currentUser?.role === 'ADMIN' && currentUser?.branchId === null;

  const [users, setUsers] = useState<User[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);

  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState('');
  const [loading, setLoading] = useState(false);

  const [modalCreateOpen, setModalCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('CLIENT');
  const [newBranchId, setNewBranchId] = useState<string>(''); // '' => null (global)

  useEffect(() => {
    api.get<User[]>('/users')
      .then(res => setUsers(res.data))
      .catch(() => setUsers([]));

    api.get<Branch[]>('/branches')
      .then(res => setBranches(res.data))
      .catch(() => setBranches([]));
  }, []);

  const handleEdit = (user: User) => {
    setEditId(user.id);
    setEditName(user.name);
    setEditRole(user.role);
  };

  const handleSave = async (id: string) => {
    setLoading(true);
    try {
      await api.patch(`/users/${id}`, { name: editName });
      await api.patch(`/users/${id}/role`, { role: editRole });
      setUsers(users.map(u => (u.id === id ? { ...u, name: editName, role: editRole } : u)));
      setEditId(null);
    } catch (err) {
      console.error('Error al editar usuario:', err);
      alert('No autorizado o error al editar usuario.');
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    setLoading(true);
    try {
      await api.delete(`/users/${id}`);
      setUsers(users.filter(u => u.id !== id));
    } catch (err: any) {
      if (err.response?.status === 404) {
        alert('El usuario ya no existe.');
        setUsers(users.filter(u => u.id !== id));
      } else {
        console.error('Error al eliminar usuario:', err);
        alert('Error al eliminar usuario.');
      }
    }
    setLoading(false);
  };

  const handleOpenCreate = () => setModalCreateOpen(true);
  const handleCloseCreate = () => setModalCreateOpen(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post<User>('/users', {
        name: newName,
        email: newEmail.trim().toLowerCase(),
        role: newRole,
        branchId: newBranchId ? newBranchId : null,
      });

      setUsers([...users, res.data]);
      setNewName('');
      setNewEmail('');
      setNewRole('CLIENT');
      setNewBranchId('');
      handleCloseCreate();
    } catch (err) {
      console.error('Error al crear usuario:', err);
      alert('Error al crear usuario (¿estás logueado como admin global?)');
    }
    setLoading(false);
  };

  return (
    <Paper sx={{ p: 3, mt: 4 }}>
      <Typography variant="h5" gutterBottom>
        Usuarios registrados
      </Typography>

      {isGlobalAdmin && (
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          sx={{ mb: 2 }}
          onClick={handleOpenCreate}
        >
          Crear usuario
        </Button>
      )}

      <Dialog open={modalCreateOpen} onClose={handleCloseCreate} maxWidth="sm" fullWidth>
        <DialogTitle>Nuevo usuario</DialogTitle>
        <DialogContent>
          <form onSubmit={handleCreate}>
            <TextField
              label="Nombre"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              fullWidth
              margin="normal"
              required
            />
            <TextField
              label="Email"
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              fullWidth
              margin="normal"
              required
              type="email"
            />

            <FormControl fullWidth margin="normal">
              <InputLabel>Rol</InputLabel>
              <Select value={newRole} onChange={e => setNewRole(String(e.target.value))} required label="Rol">
                {roles.map(role => (
                  <MenuItem key={role} value={role}>{role}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth margin="normal">
              <InputLabel>Sucursal</InputLabel>
              <Select
                value={newBranchId}
                onChange={(e) => setNewBranchId(String(e.target.value))}
                label="Sucursal"
              >
                <MenuItem value="">(Global / sin sucursal)</MenuItem>
                {branches.map(b => (
                  <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <DialogActions>
              <Button onClick={handleCloseCreate}>Cancelar</Button>
              <Button type="submit" variant="contained" disabled={loading}>
                Crear usuario
              </Button>
            </DialogActions>
          </form>
        </DialogContent>
      </Dialog>

      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Nombre</TableCell>
            <TableCell>Email</TableCell>
            <TableCell>Rol</TableCell>
            {isGlobalAdmin && <TableCell>Sucursal</TableCell>}
            {isGlobalAdmin && <TableCell align="center">Acciones</TableCell>}
          </TableRow>
        </TableHead>

        <TableBody>
          {users.map(u => (
            <TableRow key={u.id}>
              <TableCell>
                {editId === u.id ? (
                  <TextField value={editName} onChange={e => setEditName(e.target.value)} size="small" />
                ) : (
                  u.name
                )}
              </TableCell>

              <TableCell>{u.email}</TableCell>

              <TableCell>
                {editId === u.id ? (
                  <Select value={editRole} onChange={e => setEditRole(String(e.target.value))} size="small">
                    {roles.map(role => (
                      <MenuItem key={role} value={role}>{role}</MenuItem>
                    ))}
                  </Select>
                ) : (
                  u.role
                )}
              </TableCell>

              {isGlobalAdmin && (
                <TableCell>
                  {u.branch?.name ?? (u.branchId ?? 'Global')}
                </TableCell>
              )}

              {isGlobalAdmin && (
                <TableCell align="center">
                  {editId === u.id ? (
                    <IconButton onClick={() => handleSave(u.id)} disabled={loading}>
                      <SaveIcon />
                    </IconButton>
                  ) : (
                    <>
                      <IconButton onClick={() => handleEdit(u)}>
                        <EditIcon />
                      </IconButton>
                      <IconButton onClick={() => handleDelete(u.id)} disabled={loading}>
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
