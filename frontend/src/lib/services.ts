import { api } from './api';
import type {
  AppUser,
  AuthUser,
  ContentItem,
  DemoAccount,
  Organization,
  Role,
  Permission,
  ProfileUpdatePayload,
  Subscription,
  Team,
} from '../types/api';

type Data<T> = { data: T };

export async function loginRequest(email: string, password: string) {
  const { data } = await api.post<Data<{ token: string; user: AuthUser }>>('/auth/login', {
    email,
    password,
  });
  return data.data;
}

export async function fetchDemoAccounts() {
  const { data } = await api.get<Data<DemoAccount[]>>('/auth/demo-accounts');
  return data.data;
}

export async function fetchOrganizations() {
  const { data } = await api.get<Data<Organization[]>>('/organizations');
  return data.data;
}

export async function createOrganization(name: string) {
  const { data } = await api.post<Data<Organization>>('/organizations', { name });
  return data.data;
}

export async function updateOrganization(orgUuid: string, name: string) {
  const { data } = await api.patch<Data<Organization>>(`/organizations/${orgUuid}`, { name });
  return data.data;
}

export async function fetchTeams(orgUuid: string) {
  const { data } = await api.get<Data<Team[]>>(`/organizations/${orgUuid}/teams`);
  return data.data;
}

export async function createTeam(
  orgUuid: string,
  payload: { name: string; managerUserId: number },
) {
  const { data } = await api.post<Data<Team>>(`/organizations/${orgUuid}/teams`, payload);
  return data.data;
}

export async function deleteTeam(orgUuid: string, id: number) {
  await api.delete(`/organizations/${orgUuid}/teams/${id}`);
}

export async function fetchUsers(orgUuid: string) {
  const { data } = await api.get<Data<AppUser[]>>(`/organizations/${orgUuid}/users`);
  return data.data;
}

export async function createUser(
  orgUuid: string,
  payload: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    teamId?: number | null;
    managerId?: number | null;
    roleIds: number[];
  },
) {
  const { data } = await api.post<Data<AppUser>>(`/organizations/${orgUuid}/users`, payload);
  return data.data;
}

export async function deleteUser(orgUuid: string, id: number) {
  await api.delete(`/organizations/${orgUuid}/users/${id}`);
}

export async function fetchRoles(orgUuid: string) {
  const { data } = await api.get<Data<Role[]>>(`/organizations/${orgUuid}/roles`);
  return data.data;
}

export async function fetchPermissions(orgUuid: string) {
  const { data } = await api.get<Data<Permission[]>>(`/organizations/${orgUuid}/roles/permissions`);
  return data.data;
}

export async function updateRolePermissions(
  orgUuid: string,
  roleId: number,
  permissionIds: number[],
) {
  const { data } = await api.patch<Data<Role>>(`/organizations/${orgUuid}/roles/${roleId}`, {
    permissionIds,
  });
  return data.data;
}

export async function fetchContent(orgUuid: string, userId?: number) {
  const { data } = await api.get<Data<ContentItem[]>>(`/organizations/${orgUuid}/content`, {
    params: userId ? { userId } : undefined,
  });
  return data.data;
}

export async function fetchMyContent(orgUuid: string) {
  const { data } = await api.get<Data<ContentItem>>(`/organizations/${orgUuid}/content/me`);
  return data.data;
}

export async function updateContent(
  orgUuid: string,
  id: number,
  payload: ProfileUpdatePayload,
) {
  const { data } = await api.patch<Data<ContentItem>>(
    `/organizations/${orgUuid}/content/${id}`,
    payload,
  );
  return data.data;
}

export async function uploadAvatar(orgUuid: string, id: number, file: Blob, fileName = 'avatar.jpg') {
  const form = new FormData();
  form.append('avatar', file, fileName);
  const { data } = await api.post<Data<ContentItem>>(
    `/organizations/${orgUuid}/content/${id}/avatar`,
    form,
  );
  return data.data;
}

export async function deleteAvatar(orgUuid: string, id: number) {
  const { data } = await api.delete<Data<ContentItem>>(
    `/organizations/${orgUuid}/content/${id}/avatar`,
  );
  return data.data;
}

export async function fetchAvatarBlob(orgUuid: string, id: number) {
  const { data } = await api.get<Blob>(`/organizations/${orgUuid}/content/${id}/avatar`, {
    responseType: 'blob',
  });
  return data;
}

export async function fetchSubscription(orgUuid: string) {
  const { data } = await api.get<Data<Subscription>>(`/organizations/${orgUuid}/subscription`);
  return data.data;
}

export async function updateSubscription(
  orgUuid: string,
  payload: { plan?: string; status?: string; seats?: number },
) {
  const { data } = await api.patch<Data<Subscription>>(
    `/organizations/${orgUuid}/subscription`,
    payload,
  );
  return data.data;
}
