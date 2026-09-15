export type RoleInfo = {
  id: number;
  code: string;
  name: string;
};

export type Organization = {
  id: number;
  uuid: string;
  name: string;
  createdAt?: string;
  _count?: { users: number; teams: number };
  subscription?: Subscription | null;
};

export type AuthUser = {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  organizationId: number | null;
  organization: Organization | null;
  teamId: number | null;
  managerId: number | null;
  roles: RoleInfo[];
  permissions: string[];
};

export type DemoAccount = {
  label: string;
  email: string;
  role: string;
  organizationName: string | null;
};

export type Team = {
  id: number;
  name: string;
  organizationId: number;
  managerUserId: number;
  manager?: { id: number; email: string; firstName: string; lastName: string };
  _count?: { members: number };
  members?: Array<{
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    managerId: number | null;
  }>;
};

export type AppUser = {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  organizationId: number | null;
  teamId: number | null;
  managerId: number | null;
  isActive: boolean;
  roles: RoleInfo[];
  team: { id: number; name: string } | null;
};

export type Permission = {
  id: number;
  code: string;
  name: string;
  description: string | null;
};

export type Role = {
  id: number;
  code: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  organizationId: number | null;
  userCount?: number;
  permissions: Permission[];
};

export type ContentItem = {
  id: number;
  organizationId: number;
  userId: number;
  title: string;
  phone: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  bio: string | null;
  street: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  jobTitle: string | null;
  department: string | null;
  employeeNumber: string | null;
  employmentType: string | null;
  startDate: string | null;
  hasAvatar: boolean;
  avatarUrl: string | null;
  user?: { id: number; email: string; firstName: string; lastName: string };
};

export type ProfileUpdatePayload = {
  title?: string;
  phone?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  bio?: string | null;
  street?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
  jobTitle?: string | null;
  department?: string | null;
  employeeNumber?: string | null;
  employmentType?: string | null;
  startDate?: string | null;
};

export type Subscription = {
  id: number;
  organizationId: number;
  plan: string;
  status: string;
  seats: number;
  renewsAt: string;
};

export type NamedCount = {
  name: string;
  count: number;
};

export type DashboardStats = {
  scope: 'platform' | 'organization' | 'team' | 'self';
  organization: { id: number; uuid: string; name: string } | null;
  summary: {
    organizationCount?: number;
    userCount: number;
    activeUserCount: number;
    inactiveUserCount: number;
    teamCount: number;
    contentCount: number;
    reportCount?: number;
    seats: number | null;
    seatsUsed: number | null;
    seatsUtilization: number | null;
    profileCompletenessAvg: number;
  };
  subscription: {
    plan: string;
    status: string;
    seats: number;
    renewsAt: string;
  } | null;
  usersByRole: NamedCount[];
  teamSizes: Array<{ id: number; name: string; memberCount: number }>;
  departments: NamedCount[];
  employmentTypes: NamedCount[];
  genders: NamedCount[];
  cities: NamedCount[];
  jobTitles: NamedCount[];
  tenureBuckets: NamedCount[];
  profileCompleteness: {
    complete: number;
    partial: number;
    empty: number;
    averageScore: number;
  };
  organizations?: Array<{
    id: number;
    uuid: string;
    name: string;
    userCount: number;
    teamCount: number;
    plan: string | null;
    status: string | null;
    seats: number | null;
    seatsUtilization: number | null;
  }>;
  subscriptionsByPlan?: NamedCount[];
  subscriptionsByStatus?: NamedCount[];
};
