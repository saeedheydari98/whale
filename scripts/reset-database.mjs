import { PrismaClient } from "@prisma/client";

const SUPERADMIN_PHONE = "09176991556";

const prisma = new PrismaClient();

async function resetDatabase() {
  const superadmin = await prisma.user.findFirst({
    where: { username: SUPERADMIN_PHONE, role: "superadmin" },
    select: { id: true, username: true, role: true },
  });

  if (!superadmin) {
    throw new Error(`Superadmin user (${SUPERADMIN_PHONE}) was not found. Aborting reset.`);
  }

  await prisma.$transaction(
    async (tx) => {
      await tx.cartItem.deleteMany();
      await tx.cart.deleteMany();
      await tx.orderItem.deleteMany();
      await tx.order.deleteMany();
      await tx.comment.deleteMany();
      await tx.adminAccessRequest.deleteMany();
      await tx.authOtp.deleteMany();
      await tx.customerProfile.deleteMany();
      await tx.banner.deleteMany();
      await tx.product.deleteMany();
      await tx.showcase.deleteMany();
      await tx.category.deleteMany();
      await tx.categoryGroup.deleteMany();
      await tx.brand.deleteMany();
      await tx.brandGroup.deleteMany();
      await tx.adminTheme.deleteMany();
      await tx.adminSecurity.deleteMany();

      await tx.user.deleteMany({
        where: {
          NOT: {
            id: superadmin.id,
          },
        },
      });

      await tx.user.update({
        where: { id: superadmin.id },
        data: {
          role: "superadmin",
          avatarUrl: null,
          refreshTokenHash: null,
          resetTokenHash: null,
          resetTokenExpiresAt: null,
        },
      });
    },
    { timeout: 120_000 }
  );

  console.log("Database reset complete. Superadmin preserved:", superadmin.username);
}

resetDatabase()
  .catch((error) => {
    console.error("Database reset failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
