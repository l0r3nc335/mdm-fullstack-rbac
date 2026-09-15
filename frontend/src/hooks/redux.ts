import { useDispatch, useSelector, type TypedUseSelectorHook } from 'react-redux';
import type { AppDispatch, RootState } from '../store';

export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

export function usePermissions() {
  const permissions = useAppSelector((s) => s.auth.user?.permissions ?? []);
  const roles = useAppSelector((s) => s.auth.user?.roles ?? []);

  const hasPermission = (code: string) => permissions.includes(code);
  const hasAnyPermission = (...codes: string[]) => codes.some((c) => permissions.includes(c));
  const hasRole = (code: string) => roles.some((r) => r.code === code);

  return { permissions, roles, hasPermission, hasAnyPermission, hasRole };
}

export function useOrgUuid() {
  return useAppSelector((s) => s.auth.user?.organization?.uuid ?? null);
}
