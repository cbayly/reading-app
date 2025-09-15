import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
try {
  const parent = await prisma.parent.findFirst({ where: { email: 'cam@example.com' }, include: { students: true } });
  if (!parent) { console.log('No parent cam@example.com'); process.exit(0); }
  console.log('parentId', parent.id);
  const gene = parent.students.find(s => s.name === 'Gene Belcher');
  if (!gene) { console.log('No Gene Belcher under this parent'); process.exit(0); }
  console.log('geneId', gene.id);
  const plan = await prisma.plan3.findFirst({ where: { studentId: gene.id }, orderBy: { createdAt: 'desc' } });
  if (!plan) { console.log('No plan for Gene'); process.exit(0); }
  console.log('planId', plan.id);
} catch (e) {
  console.error(e);
} finally {
  await prisma.$disconnect();
}
