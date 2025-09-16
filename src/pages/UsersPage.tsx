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

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

const roles = ['ADMIN', 'MANAGER', 'EMPLOYEE', 'ACCOUNTANT', 'CLIENTE'];

export const UsersPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState('');
  const [loading, setLoading] = useState(false);

  // Estado para crear usuario
  const [modalCreateOpen, setModalCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('CLIENTE');
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    api.get<User[]>('/users')
      .then(res => setUsers(res.data))
      .catch(() => setUsers([]));
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
      setUsers(users.map(u =>
        u.id === id ? { ...u, name: editName, role: editRole } : u
      ));
      setEditId(null);
    } catch (err) {
      console.error('Error al editar usuario:', err);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    setLoading(true);
    try {
      await api.delete(`/users/${id}`);
      setUsers(users.filter(u => u.id !== id));
    } catch (err) {
      console.error('Error al eliminar usuario:', err);
    }
    setLoading(false);
  };

  const isAdmin = currentUser?.role === 'ADMIN';

  // Crear usuario
  const handleOpenCreate = () => setModalCreateOpen(true);
  const handleCloseCreate = () => setModalCreateOpen(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post<User>('/users', {
        name: newName,
        email: newEmail,
        role: newRole,
        password: newPassword,
      });
      setUsers([...users, res.data]);
      setNewName('');
      setNewEmail('');
      setNewRole('CLIENTE');
      setNewPassword('');
      handleCloseCreate();
    } catch (err) {
      console.error('Error al crear usuario:', err);
    }
    setLoading(false);
  };

  return (
    <Paper sx={{ p: 3, mt: 4 }}>
      <Typography variant="h5" gutterBottom>
        Usuarios registrados
      </Typography>
      {isAdmin && (
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          sx={{ mb: 2 }}
          onClick={handleOpenCreate}
        >
          Crear usuario
        </Button>
      )}

      {/* Modal para crear usuario */}
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
              <Select value={newRole} onChange={e => setNewRole(e.target.value)} required>
                {roles.map(role => (
                  <MenuItem key={role} value={role}>{role}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Contraseña"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              fullWidth
              margin="normal"
              required
              type="password"
            />
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
            {isAdmin && <TableCell align="center">Acciones</TableCell>}
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
