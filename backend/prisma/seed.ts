import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEMO_PASSWORD = 'Password123!';

const PERMISSIONS = [
  { code: 'org:manage', name: 'Manage organizations', description: 'Create and manage organizations' },
  { code: 'team:manage', name: 'Manage teams', description: 'Create and manage teams' },
  { code: 'user:manage', name: 'Manage users', description: 'Create and manage users' },
  { code: 'role:manage', name: 'Manage roles', description: 'Create and manage roles and permissions' },
  { code: 'content:read', name: 'Read content', description: 'View content items' },
  { code: 'content:write', name: 'Write content', description: 'Create, edit, and delete content items' },
  { code: 'subscription:manage', name: 'Manage subscription', description: 'View and update organization subscription' },
] as const;

const FIRST_NAMES = [
  'Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Avery', 'Quinn',
  'Sam', 'Jamie', 'Cameron', 'Drew', 'Blake', 'Skyler', 'Reese', 'Hayden',
  'Parker', 'Logan', 'Harper', 'Emerson', 'Rowan', 'Finley', 'Dakota', 'Sage',
];

const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
  'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White',
];

const ORG_NAMES = ['Acme Corp', 'Globex Industries', 'Initech Solutions'];

const JOB_TITLES = [
  'Software Engineer', 'Product Analyst', 'Operations Specialist', 'Designer',
  'Support Agent', 'QA Engineer', 'Data Analyst', 'HR Coordinator',
];

const CITIES = ['Austin', 'Seattle', 'Denver', 'Chicago', 'Boston', 'Portland'];
const STREETS = ['Oak St', 'Pine Ave', 'Maple Rd', 'Cedar Blvd', 'Willow Ln', 'Elm Ct'];
const GENDERS = ['female', 'male', 'non_binary', 'prefer_not_to_say'] as const;
const EMPLOYMENT_TYPES = ['full_time', 'part_time', 'contract', 'intern'] as const;

function pick<T>(items: T[], index: number): T {
  return items[index % items.length];
}

function randomPhone(seed: number): string {
  const n = 1000000 + ((seed * 7919) % 8999999);
  return `+1-555-${String(n).slice(0, 3)}-${String(n).slice(3, 7)}`;
}

function profileSeed(input: {
  seed: number;
  firstName: string;
  lastName: string;
  jobTitle: string;
  department: string;
  bio: string;
}) {
  const year = 1985 + (input.seed % 15);
  const month = String((input.seed % 12) + 1).padStart(2, '0');
  const day = String((input.seed % 27) + 1).padStart(2, '0');
  return {
    title: `${input.firstName} ${input.lastName} Profile`,
    phone: randomPhone(input.seed),
    dateOfBirth: new Date(`${year}-${month}-${day}`),
    gender: pick([...GENDERS], input.seed),
    bio: input.bio,
    street: `${100 + (input.seed % 800)} ${pick(STREETS, input.seed)}`,
    city: pick(CITIES, input.seed),
    state: 'TX',
    postalCode: String(73000 + (input.seed % 999)),
    country: 'United States',
    jobTitle: input.jobTitle,
    department: input.department,
    employeeNumber: `EMP-${String(1000 + input.seed).padStart(5, '0')}`,
    employmentType: pick([...EMPLOYMENT_TYPES], input.seed),
    startDate: new Date(`202${input.seed % 5}-0${(input.seed % 8) + 1}-15`),
  };
}

async function assignPermissions(roleId: number, codes: string[]) {
  const permissions = await prisma.permission.findMany({
    where: { code: { in: codes } },
  });
  await prisma.rolePermission.createMany({
    data: permissions.map((p) => ({ roleId, permissionId: p.id })),
    skipDuplicates: true,
  });
}

async function main() {
  console.log('Seeding RBAC demo database...');

  await prisma.rolePermission.deleteMany();
  await prisma.userRole.deleteMany();
  await prisma.contentItem.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.team.deleteMany();
  await prisma.user.deleteMany();
  await prisma.role.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.organization.deleteMany();

  for (const permission of PERMISSIONS) {
    await prisma.permission.create({ data: permission });
  }

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const superAdminRole = await prisma.role.create({
    data: {
      code: 'super_admin',
      name: 'Super Admin',
      description: 'Cross-tenant full access',
      isSystem: true,
      organizationId: null,
    },
  });
  await assignPermissions(
    superAdminRole.id,
    PERMISSIONS.map((p) => p.code),
  );

  const superAdmin = await prisma.user.create({
    data: {
      email: 'superadmin@demo.local',
      passwordHash,
      firstName: 'Super',
      lastName: 'Admin',
      organizationId: null,
    },
  });
  await prisma.userRole.create({
    data: { userId: superAdmin.id, roleId: superAdminRole.id },
  });

  const demoAccounts: Array<{ label: string; email: string; role: string; org?: string }> = [
    { label: 'Super Admin', email: superAdmin.email, role: 'super_admin' },
  ];

  let userCounter = 0;

  for (let orgIndex = 0; orgIndex < ORG_NAMES.length; orgIndex += 1) {
    const orgName = ORG_NAMES[orgIndex];
    const orgSlug = orgName.toLowerCase().replace(/\s+/g, '');

    const organization = await prisma.organization.create({
      data: { name: orgName },
    });

    await prisma.subscription.create({
      data: {
        organizationId: organization.id,
        plan: orgIndex === 0 ? 'business' : 'starter',
        status: 'active',
        seats: 100,
        renewsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    const roleDefs = [
      {
        code: 'admin',
        name: 'Admin',
        description: 'Organization administrator',
        permissions: [
          'team:manage',
          'user:manage',
          'role:manage',
          'content:read',
          'content:write',
          'subscription:manage',
        ],
      },
      {
        code: 'subscriber',
        name: 'Subscriber',
        description: 'Pays for the organization subscription',
        permissions: ['subscription:manage', 'content:read'],
      },
      {
        code: 'manager',
        name: 'Manager',
        description: 'Views team member content',
        permissions: ['content:read'],
      },
      {
        code: 'employee',
        name: 'Employee',
        description: 'Manages own personal content',
        permissions: ['content:read', 'content:write'],
      },
      {
        code: 'content_viewer',
        name: 'Content Viewer',
        description: 'View-only content access (assignment demo)',
        permissions: ['content:read'],
      },
      {
        code: 'content_editor',
        name: 'Content Editor',
        description: 'Full content access (assignment demo)',
        permissions: ['content:read', 'content:write'],
      },
    ];

    const orgRoles: Record<string, number> = {};
    for (const def of roleDefs) {
      const role = await prisma.role.create({
        data: {
          organizationId: organization.id,
          code: def.code,
          name: def.name,
          description: def.description,
          isSystem: true,
        },
      });
      orgRoles[def.code] = role.id;
      await assignPermissions(role.id, def.permissions);
    }

    const admin = await prisma.user.create({
      data: {
        email: `admin@${orgSlug}.demo.local`,
        passwordHash,
        firstName: 'Org',
        lastName: 'Admin',
        organizationId: organization.id,
      },
    });
    await prisma.userRole.create({
      data: { userId: admin.id, roleId: orgRoles.admin },
    });

    const subscriber = await prisma.user.create({
      data: {
        email: `subscriber@${orgSlug}.demo.local`,
        passwordHash,
        firstName: 'Pat',
        lastName: 'Subscriber',
        organizationId: organization.id,
      },
    });
    await prisma.userRole.create({
      data: { userId: subscriber.id, roleId: orgRoles.subscriber },
    });

    if (orgIndex === 0) {
      demoAccounts.push(
        { label: 'Admin', email: admin.email, role: 'admin', org: orgName },
        { label: 'Subscriber', email: subscriber.email, role: 'subscriber', org: orgName },
      );

      const contentViewer = await prisma.user.create({
        data: {
          email: `viewer@${orgSlug}.demo.local`,
          passwordHash,
          firstName: 'Casey',
          lastName: 'Viewer',
          organizationId: organization.id,
        },
      });
      await prisma.userRole.create({
        data: { userId: contentViewer.id, roleId: orgRoles.content_viewer },
      });
      demoAccounts.push({
        label: 'Content Viewer',
        email: contentViewer.email,
        role: 'content_viewer',
        org: orgName,
      });

      const contentEditor = await prisma.user.create({
        data: {
          email: `editor@${orgSlug}.demo.local`,
          passwordHash,
          firstName: 'Riley',
          lastName: 'Editor',
          organizationId: organization.id,
        },
      });
      await prisma.userRole.create({
        data: { userId: contentEditor.id, roleId: orgRoles.content_editor },
      });
      demoAccounts.push({
        label: 'Content Editor',
        email: contentEditor.email,
        role: 'content_editor',
        org: orgName,
      });
    }

    for (let teamIndex = 0; teamIndex < 2; teamIndex += 1) {
      const managerFirst = pick(FIRST_NAMES, orgIndex * 10 + teamIndex);
      const managerLast = pick(LAST_NAMES, orgIndex * 10 + teamIndex + 3);
      const managerEmail = `manager${teamIndex + 1}@${orgSlug}.demo.local`;

      const manager = await prisma.user.create({
        data: {
          email: managerEmail,
          passwordHash,
          firstName: managerFirst,
          lastName: managerLast,
          organizationId: organization.id,
        },
      });
      await prisma.userRole.create({
        data: { userId: manager.id, roleId: orgRoles.manager },
      });

      const team = await prisma.team.create({
        data: {
          name: `Team ${String.fromCharCode(65 + teamIndex)}`,
          organizationId: organization.id,
          managerUserId: manager.id,
        },
      });

      await prisma.user.update({
        where: { id: manager.id },
        data: { teamId: team.id },
      });

      await prisma.contentItem.create({
        data: {
          organizationId: organization.id,
          userId: manager.id,
          ...profileSeed({
            seed: manager.id,
            firstName: managerFirst,
            lastName: managerLast,
            jobTitle: 'Team Manager',
            department: team.name,
            bio: `Manager of ${team.name} at ${orgName}.`,
          }),
        },
      });

      if (orgIndex === 0 && teamIndex === 0) {
        demoAccounts.push({
          label: 'Manager',
          email: manager.email,
          role: 'manager',
          org: orgName,
        });
      }

      for (let empIndex = 0; empIndex < 20; empIndex += 1) {
        userCounter += 1;
        const firstName = pick(FIRST_NAMES, userCounter + empIndex);
        const lastName = pick(LAST_NAMES, userCounter * 2 + empIndex);
        const email = `employee${teamIndex + 1}.${empIndex + 1}@${orgSlug}.demo.local`;

        const employee = await prisma.user.create({
          data: {
            email,
            passwordHash,
            firstName,
            lastName,
            organizationId: organization.id,
            teamId: team.id,
            managerId: manager.id,
          },
        });
        await prisma.userRole.create({
          data: { userId: employee.id, roleId: orgRoles.employee },
        });

        await prisma.contentItem.create({
          data: {
            organizationId: organization.id,
            userId: employee.id,
            ...profileSeed({
              seed: employee.id,
              firstName,
              lastName,
              jobTitle: pick(JOB_TITLES, empIndex + teamIndex),
              department: team.name,
              bio: `Employee on ${team.name} reporting to ${managerFirst} ${managerLast}.`,
            }),
          },
        });

        if (orgIndex === 0 && teamIndex === 0 && empIndex === 0) {
          demoAccounts.push({
            label: 'Employee',
            email: employee.email,
            role: 'employee',
            org: orgName,
          });
        }
      }
    }

    console.log(`Seeded organization: ${orgName} (${organization.uuid})`);
  }

  console.log('\nDemo login accounts (password: Password123!):');
  for (const account of demoAccounts) {
    console.log(`  - ${account.label}: ${account.email}${account.org ? ` [${account.org}]` : ''}`);
  }
  console.log('\nSeed complete.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
