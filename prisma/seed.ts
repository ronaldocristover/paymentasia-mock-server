import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create default merchant
  const merchant = await prisma.merchant.upsert({
    where: { merchantToken: 'ae476881-7bfc-4da8-bc7d-8203ad0fb28c' },
    update: {},
    create: {
      merchantToken: 'ae476881-7bfc-4da8-bc7d-8203ad0fb28c',
      signatureSecret: '127f7830-b856-4ddf-92b4-a6478e38547b',
      name: 'Default Test Merchant',
      active: true,
    },
  });

  console.log('Created default merchant:', merchant.name);

  // Create some sample transactions for testing
  const transactions = [
    {
      merchantReference: 'SAMPLE-001',
      currency: 'HKD',
      amount: '100.00',
      network: 'Alipay',
      subject: 'Sample Alipay Payment',
      status: '1', // SUCCESS
      customerIp: '123.123.123.123',
      customerFirstName: 'John',
      customerLastName: 'Doe',
      customerEmail: 'john@example.com',
      customerPhone: '0123123123',
      notifyUrl: 'https://example.com/notify',
      returnUrl: 'https://example.com/return',
      completedTime: new Date(),
    },
    {
      merchantReference: 'SAMPLE-002',
      currency: 'USD',
      amount: '50.00',
      network: 'CreditCard',
      subject: 'Sample Credit Card Payment',
      status: '0', // PENDING
      customerIp: '123.123.123.123',
      customerFirstName: 'Jane',
      customerLastName: 'Smith',
      customerEmail: 'jane@example.com',
      customerPhone: '5551234567',
      customerAddress: '123 Main Street',
      customerState: 'CA',
      customerCountry: 'US',
      customerPostalCode: '90210',
      notifyUrl: 'https://example.com/notify',
      returnUrl: 'https://example.com/return',
    },
  ];

  for (const txData of transactions) {
    await prisma.transaction.create({
      data: {
        ...txData,
        merchantId: merchant.id,
      },
    });
  }

  console.log('Created sample transactions');
  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

