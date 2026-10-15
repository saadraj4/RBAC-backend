import "dotenv/config";
import bcrypt from "bcrypt";
import { prisma, pool } from "../config/db.js";

const DEFAULT_ROLES = ["admin", "manager", "user"];

async function main() {
  // 1. Seed Roles
  const roles = {};
  for (const roleName of DEFAULT_ROLES) {
    const role = await prisma.role.upsert({
      where: { name: roleName },
      update: { isDeleted: false },
      create: { name: roleName, isDeleted: false },
    });
    roles[roleName] = role;
    console.log(`✔ Role "${roleName}" upserted`);
  }

  // 2. Seed Default Admin User
  const adminEmail = "admin@example.com";
  const adminPassword = "Password123!";
  const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 10;
  const passwordHash = await bcrypt.hash(adminPassword, saltRounds);

  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      passwordHash,
      isActive: true,
      isDeleted: false,
    },
    create: {
      name: "Super Admin",
      email: adminEmail,
      passwordHash,
      isActive: true,
      isDeleted: false,
    },
  });

  // 3. Assign admin role to Super Admin via UserRole join table
  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: adminUser.id,
        roleId: roles.admin.id,
      },
    },
    update: {},
    create: {
      userId: adminUser.id,
      roleId: roles.admin.id,
    },
  });

  console.log(`✔ Default Admin User upserted: ${adminUser.email}`);
  console.log(`  Role:     admin`);
  console.log(`  Email:    ${adminEmail}`);
  console.log(`  Password: ${adminPassword}`);
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
