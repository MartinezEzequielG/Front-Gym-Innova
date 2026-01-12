import { useState, useRef, useEffect } from 'react';
import { api } from '../context/AuthContext';

type Status = 'idle' | 'loading' | 'success' | 'error';

export function useReceptionCheckin(autoResetMs: number) {
  const [dni, setDni] = useState('');
  const [client, setClient] = useState<any>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetForm = (focus = true) => {
    setDni('');
    setClient(null);
    setError('');
    setStatus('idle');
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (focus) setTimeout(() => inputRef.current?.focus(), 50);
  };

  useEffect(() => {
    if (status === 'success' || status === 'error') {
      timeoutRef.current = setTimeout(() => resetForm(true), autoResetMs);
    }
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [status, autoResetMs]);

  const handleCheck = async (branchId: string) => {
    const cleanDni = dni.trim();
    if (!branchId || !cleanDni) {
      setError('Selecciona sucursal y DNI');
      setStatus('error');
      return null;
    }

    setStatus('loading');
    setError('');
    setClient(null);

    try {
      type ReceptionCheckinResponse = {
        client: any;
      };

      const res = await api.post<ReceptionCheckinResponse>('/attendance/quick-checkin', { dni: cleanDni, branchId });
      const payload = res.data.client;
      setClient(payload);
      setStatus('success');
      return payload;
    } catch (err: any) {
      const httpStatus = err?.response?.status;
      const backendMsg = err?.response?.data?.message;

      if (httpStatus === 404) setError('No se encontró un cliente con ese DNI.');
      else if (httpStatus === 403) setError(backendMsg || 'Acceso denegado para esta sucursal.');
      else if (httpStatus === 401) setError('Sesión vencida. Inicia sesión nuevamente.');
      else setError(backendMsg || 'Error al conectar con el servidor.');

      setStatus('error');
      return null;
    }
  };

  return { dni, setDni, client, status, error, inputRef, resetForm, handleCheck };
}