import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000/api';
const DEMO_PASSWORD = 'Password123!';

type RoleInfo = { id: number; code: string; name: string };

type AuthUser = {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  organization: { id: number; uuid: string; name: string } | null;
  roles: RoleInfo[];
  permissions: string[];
};

type ContentItem = {
  id: number;
  title: string;
  userId: number;
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
  user?: { id: number; email: string; firstName: string; lastName: string };
};

type DemoAccount = {
  label: string;
  email: string;
  role: string;
  organizationName: string | null;
};

type TabKey = 'content' | 'profile';

type ProfileFormState = {
  title: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  bio: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  jobTitle: string;
  department: string;
  employeeNumber: string;
  employmentType: string;
  startDate: string;
};

const emptyForm: ProfileFormState = {
  title: '',
  phone: '',
  dateOfBirth: '',
  gender: '',
  bio: '',
  street: '',
  city: '',
  state: '',
  postalCode: '',
  country: '',
  jobTitle: '',
  department: '',
  employeeNumber: '',
  employmentType: '',
  startDate: '',
};

function toForm(item: ContentItem): ProfileFormState {
  return {
    title: item.title ?? '',
    phone: item.phone ?? '',
    dateOfBirth: item.dateOfBirth ?? '',
    gender: item.gender ?? '',
    bio: item.bio ?? '',
    street: item.street ?? '',
    city: item.city ?? '',
    state: item.state ?? '',
    postalCode: item.postalCode ?? '',
    country: item.country ?? '',
    jobTitle: item.jobTitle ?? '',
    department: item.department ?? '',
    employeeNumber: item.employeeNumber ?? '',
    employmentType: item.employmentType ?? '',
    startDate: item.startDate ?? '',
  };
}

async function api<T>(
  path: string,
  options: RequestInit & { token?: string | null } = {},
): Promise<T> {
  const { token, headers, ...rest } = options;
  const res = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.error?.message ?? `Request failed (${res.status})`);
  }
  return json.data as T;
}

function hasPermission(user: AuthUser | null, code: string) {
  return Boolean(user?.permissions.includes(code));
}

function hasRole(user: AuthUser | null, code: string) {
  return Boolean(user?.roles.some((r) => r.code === code));
}

function personName(item: ContentItem) {
  if (item.user) return `${item.user.firstName} ${item.user.lastName}`;
  return item.title;
}

export default function App() {
  const [demoAccounts, setDemoAccounts] = useState<DemoAccount[]>([]);
  const [email, setEmail] = useState('employee1.1@acmecorp.demo.local');
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [tab, setTab] = useState<TabKey>('content');
  const [items, setItems] = useState<ContentItem[]>([]);
  const [selected, setSelected] = useState<ContentItem | null>(null);
  const [profile, setProfile] = useState<ContentItem | null>(null);
  const [form, setForm] = useState<ProfileFormState>(emptyForm);
  const [detailForm, setDetailForm] = useState<ProfileFormState>(emptyForm);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const orgUuid = user?.organization?.uuid ?? null;
  const canWrite = hasPermission(user, 'content:write');

  useEffect(() => {
    void api<DemoAccount[]>('/auth/demo-accounts')
      .then(setDemoAccounts)
      .catch(() => setError('Could not load demo accounts. Is the API running?'));
  }, []);

  const loadContentList = useCallback(
    async (authToken: string, authUser: AuthUser) => {
      const uuid = authUser.organization?.uuid;
      if (!uuid) {
        setItems([]);
        return;
      }
      const data = await api<ContentItem[]>(`/organizations/${uuid}/content`, {
        token: authToken,
      });
      setItems(data);
    },
    [],
  );

  const loadProfile = useCallback(async (authToken: string, authUser: AuthUser) => {
    const uuid = authUser.organization?.uuid;
    if (!uuid) {
      setProfile(null);
      return;
    }
    const data = await api<ContentItem>(`/organizations/${uuid}/content/me`, {
      token: authToken,
    });
    setProfile(data);
    setForm(toForm(data));
  }, []);

  async function login() {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const data = await api<{ token: string; user: AuthUser }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setUser(data.user);
      setToken(data.token);
      setTab('content');
      setSelected(null);

      if (!data.user.organization?.uuid) {
        setItems([]);
        setProfile(null);
        setError('This account has no organization. Pick an org member account.');
        return;
      }

      await Promise.all([
        loadContentList(data.token, data.user),
        loadProfile(data.token, data.user),
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    setToken(null);
    setUser(null);
    setItems([]);
    setSelected(null);
    setProfile(null);
    setError(null);
    setMessage(null);
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => {
      const hay = [
        item.title,
        item.jobTitle,
        item.department,
        item.phone,
        item.user?.firstName,
        item.user?.lastName,
        item.user?.email,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [items, search]);

  function canWriteItem(item: ContentItem) {
    return (
      canWrite &&
      (item.userId === user?.id ||
        hasRole(user, 'admin') ||
        hasRole(user, 'super_admin') ||
        hasRole(user, 'content_editor'))
    );
  }

  async function saveProfile() {
    if (!token || !user || !orgUuid || !profile) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const updated = await api<ContentItem>(
        `/organizations/${orgUuid}/content/${profile.id}`,
        {
          method: 'PATCH',
          token,
          body: JSON.stringify(form),
        },
      );
      setProfile(updated);
      setForm(toForm(updated));
      setMessage('Profile saved');
      await loadContentList(token, user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  async function saveSelected() {
    if (!token || !user || !orgUuid || !selected) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const updated = await api<ContentItem>(
        `/organizations/${orgUuid}/content/${selected.id}`,
        {
          method: 'PATCH',
          token,
          body: JSON.stringify(detailForm),
        },
      );
      setSelected(updated);
      setDetailForm(toForm(updated));
      setMessage('Content saved');
      await loadContentList(token, user);
      if (updated.userId === user.id) {
        await loadProfile(token, user);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  if (!token || !user) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="dark-content" />
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.kicker}>RBAC Mobile</Text>
          <Text style={styles.title}>Sign in</Text>
          <Text style={styles.subtitle}>
            Same demo accounts as web. Content is a scoped list; Profile is your record.
          </Text>

          <Text style={styles.label}>Demo account</Text>
          <View style={styles.chipRow}>
            {demoAccounts.map((account) => (
              <Pressable
                key={account.email}
                style={[styles.chip, email === account.email ? styles.chipActive : null]}
                onPress={() => {
                  setEmail(account.email);
                  setPassword(DEMO_PASSWORD);
                }}
              >
                <Text
                  style={[
                    styles.chipText,
                    email === account.email ? styles.chipTextActive : null,
                  ]}
                >
                  {account.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable style={styles.button} onPress={() => void login()} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Sign in</Text>
            )}
          </Pressable>
          <Text style={styles.hint}>API: {API_URL}</Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.shell}>
        <View style={styles.topBar}>
          <View style={{ flex: 1 }}>
            <Text style={styles.kicker}>
              {user.roles.map((r) => r.name).join(', ') || 'Signed in'}
            </Text>
            <Text style={styles.topTitle}>
              {user.firstName} {user.lastName}
            </Text>
            <Text style={styles.subtitleCompact}>
              {user.organization?.name ?? 'No organization'}
            </Text>
          </View>
          <Pressable onPress={logout}>
            <Text style={styles.link}>Log out</Text>
          </Pressable>
        </View>

        {error ? <Text style={styles.bannerError}>{error}</Text> : null}
        {message ? <Text style={styles.bannerOk}>{message}</Text> : null}

        <View style={styles.body}>
          {tab === 'content' ? (
            selected ? (
              <ScrollView contentContainerStyle={styles.pad}>
                <View style={styles.headerRow}>
                  <Text style={styles.sectionTitle}>{personName(selected)}</Text>
                  <Pressable
                    onPress={() => {
                      setSelected(null);
                      setMessage(null);
                      setError(null);
                    }}
                  >
                    <Text style={styles.link}>Back to list</Text>
                  </Pressable>
                </View>
                <ProfileFields
                  form={detailForm}
                  editable={canWriteItem(selected)}
                  onChange={setDetailForm}
                />
                {canWriteItem(selected) ? (
                  <Pressable
                    style={styles.button}
                    onPress={() => void saveSelected()}
                    disabled={busy}
                  >
                    <Text style={styles.buttonText}>{busy ? 'Saving…' : 'Save content'}</Text>
                  </Pressable>
                ) : (
                  <Text style={styles.hint}>Read-only for your role on this record.</Text>
                )}
              </ScrollView>
            ) : (
              <View style={{ flex: 1 }}>
                <View style={styles.pad}>
                  <Text style={styles.sectionTitle}>Content</Text>
                  <Text style={styles.subtitleCompact}>
                    {items.length} record{items.length === 1 ? '' : 's'} in your scope
                  </Text>
                  <TextInput
                    style={[styles.input, { marginTop: 10 }]}
                    placeholder="Search name, job, department…"
                    value={search}
                    onChangeText={setSearch}
                  />
                </View>
                <FlatList
                  data={filtered}
                  keyExtractor={(item) => String(item.id)}
                  contentContainerStyle={styles.list}
                  ListEmptyComponent={
                    <Text style={styles.empty}>No content records in your current scope.</Text>
                  }
                  renderItem={({ item }) => (
                    <Pressable
                      style={styles.row}
                      onPress={() => {
                        setSelected(item);
                        setDetailForm(toForm(item));
                        setError(null);
                        setMessage(null);
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.rowTitle}>
                          {personName(item)}
                          {item.userId === user.id ? ' (you)' : ''}
                        </Text>
                        <Text style={styles.rowMeta}>{item.title}</Text>
                        <Text style={styles.rowMeta}>
                          {[item.jobTitle, item.department].filter(Boolean).join(' · ') ||
                            'No job details'}
                        </Text>
                      </View>
                      <Text style={styles.chevron}>›</Text>
                    </Pressable>
                  )}
                />
              </View>
            )
          ) : (
            <ScrollView contentContainerStyle={styles.pad}>
              <Text style={styles.sectionTitle}>Profile</Text>
              <Text style={styles.subtitleCompact}>Your personal content record</Text>

              {!profile ? (
                <Text style={styles.empty}>Loading profile…</Text>
              ) : (
                <>
                  <ProfileFields form={form} editable={canWrite} onChange={setForm} />
                  {canWrite ? (
                    <Pressable
                      style={styles.button}
                      onPress={() => void saveProfile()}
                      disabled={busy}
                    >
                      <Text style={styles.buttonText}>{busy ? 'Saving…' : 'Save profile'}</Text>
                    </Pressable>
                  ) : (
                    <Text style={styles.hint}>Read-only profile for your role.</Text>
                  )}
                </>
              )}
            </ScrollView>
          )}
        </View>

        <View style={styles.tabBar}>
          <Pressable
            style={[styles.tab, tab === 'content' ? styles.tabActive : null]}
            onPress={() => {
              setTab('content');
              setError(null);
              setMessage(null);
            }}
          >
            <Text style={[styles.tabText, tab === 'content' ? styles.tabTextActive : null]}>
              Content
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tab, tab === 'profile' ? styles.tabActive : null]}
            onPress={() => {
              setTab('profile');
              setSelected(null);
              setError(null);
              setMessage(null);
            }}
          >
            <Text style={[styles.tabText, tab === 'profile' ? styles.tabTextActive : null]}>
              Profile
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

function ProfileFields({
  form,
  editable,
  onChange,
}: {
  form: ProfileFormState;
  editable: boolean;
  onChange: (next: ProfileFormState) => void;
}) {
  function set<K extends keyof ProfileFormState>(key: K, value: ProfileFormState[K]) {
    onChange({ ...form, [key]: value });
  }

  return (
    <View style={{ gap: 10, marginTop: 12 }}>
      <Field label="Display title">
        <TextInput
          style={styles.input}
          editable={editable}
          value={form.title}
          onChangeText={(v) => set('title', v)}
        />
      </Field>
      <Field label="Phone">
        <TextInput
          style={styles.input}
          editable={editable}
          value={form.phone}
          onChangeText={(v) => set('phone', v)}
        />
      </Field>
      <Field label="Job title">
        <TextInput
          style={styles.input}
          editable={editable}
          value={form.jobTitle}
          onChangeText={(v) => set('jobTitle', v)}
        />
      </Field>
      <Field label="Department">
        <TextInput
          style={styles.input}
          editable={editable}
          value={form.department}
          onChangeText={(v) => set('department', v)}
        />
      </Field>
      <Field label="Employment type">
        <TextInput
          style={styles.input}
          editable={editable}
          value={form.employmentType}
          onChangeText={(v) => set('employmentType', v)}
          placeholder="full_time | part_time | contract | intern"
        />
      </Field>
      <Field label="City">
        <TextInput
          style={styles.input}
          editable={editable}
          value={form.city}
          onChangeText={(v) => set('city', v)}
        />
      </Field>
      <Field label="Country">
        <TextInput
          style={styles.input}
          editable={editable}
          value={form.country}
          onChangeText={(v) => set('country', v)}
        />
      </Field>
      <Field label="Bio">
        <TextInput
          style={[styles.input, { minHeight: 90, textAlignVertical: 'top' }]}
          editable={editable}
          multiline
          value={form.bio}
          onChangeText={(v) => set('bio', v)}
        />
      </Field>
    </View>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  shell: { flex: 1 },
  container: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 },
  pad: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24 },
  body: { flex: 1 },
  kicker: {
    color: '#0f766e',
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  title: { marginTop: 6, fontSize: 28, fontWeight: '700', color: '#0f172a' },
  topTitle: { marginTop: 2, fontSize: 20, fontWeight: '700', color: '#0f172a' },
  sectionTitle: { fontSize: 22, fontWeight: '700', color: '#0f172a' },
  subtitle: { marginTop: 6, color: '#64748b', marginBottom: 8 },
  subtitleCompact: { marginTop: 4, color: '#64748b', fontSize: 13 },
  label: { marginTop: 10, marginBottom: 6, fontWeight: '600', color: '#334155', fontSize: 13 },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#0f172a',
  },
  button: {
    marginTop: 18,
    backgroundColor: '#0f766e',
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 14,
  },
  buttonText: { color: '#fff', fontWeight: '700' },
  error: { marginTop: 12, color: '#b91c1c' },
  bannerError: {
    marginHorizontal: 16,
    marginBottom: 6,
    color: '#b91c1c',
    backgroundColor: '#fef2f2',
    padding: 10,
    borderRadius: 10,
    overflow: 'hidden',
  },
  bannerOk: {
    marginHorizontal: 16,
    marginBottom: 6,
    color: '#0f766e',
    backgroundColor: '#f0fdfa',
    padding: 10,
    borderRadius: 10,
    overflow: 'hidden',
  },
  hint: { marginTop: 16, color: '#94a3b8', fontSize: 12 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  chipActive: { backgroundColor: '#0f766e', borderColor: '#0f766e' },
  chipText: { color: '#334155', fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  link: { color: '#0f766e', fontWeight: '700' },
  list: { paddingHorizontal: 16, paddingBottom: 24, gap: 10 },
  row: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rowTitle: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  rowMeta: { marginTop: 3, color: '#64748b', fontSize: 13 },
  chevron: { fontSize: 24, color: '#94a3b8', paddingHorizontal: 4 },
  card: {
    marginTop: 14,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
  },
  empty: { marginTop: 24, textAlign: 'center', color: '#94a3b8' },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    backgroundColor: '#fff',
    paddingBottom: 8,
    paddingTop: 8,
    paddingHorizontal: 12,
    gap: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
  },
  tabActive: { backgroundColor: '#0f766e' },
  tabText: { fontWeight: '700', color: '#64748b' },
  tabTextActive: { color: '#fff' },
});
