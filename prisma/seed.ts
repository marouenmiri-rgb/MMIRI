import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const user = await db.user.upsert({
    where: { email: "demo@adgen.ai" },
    update: {},
    create: { email: "demo@adgen.ai", name: "Demo", plan: "PRO" },
  });

  await db.ad.createMany({
    data: [
      {
        userId: user.id,
        productUrl: "https://ember.com/products/ember-travel-mug-2",
        productTitle: "Ember Travel Mug 2",
        status: "READY",
        thumbnailUrl:
          "https://images.unsplash.com/photo-1511920170033-f8396924c348?w=400",
        scriptJson: {
          hook: "Cold coffee ruins your morning. Here's the fix.",
          problem: "You take one sip, get pulled into a meeting, and by the time you look back — your $6 latte is cold.",
          solution: "Ember Mug 2 holds your drink at the exact temperature you choose. For 3 hours.",
          cta: "Tap the link. First sip's still hot at noon.",
          fullScript:
            "Cold coffee ruins your morning. You take one sip, get pulled into a meeting, and your $6 latte is ice. Ember Mug 2 holds it at the exact temp you pick — for three hours. Tap the link. First sip's still hot at noon.",
        },
      },
      {
        userId: user.id,
        productUrl: "https://www.allbirds.com/products/mens-wool-runners",
        productTitle: "Allbirds Wool Runner",
        status: "RENDERING",
        thumbnailUrl:
          "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400",
      },
    ],
    skipDuplicates: true,
  });

  await db.lead.createMany({
    data: [
      {
        userId: user.id,
        storeName: "Highland & Pine",
        websiteUrl: "https://highlandpine.co",
        email: "hello@highlandpine.co",
        source: "seed",
      },
      {
        userId: user.id,
        storeName: "Dune Goods",
        websiteUrl: "https://dunegoods.myshopify.com",
        source: "seed",
      },
    ],
    skipDuplicates: true,
  });

  console.log(`Seeded demo user ${user.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
