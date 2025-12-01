import { PrismaClient, Difficulty } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding flashcard data...');

  // --- 1. Create Flashcard Categories ---
  const categoryA1 = await prisma.flashcardCategory.create({
    data: {
      title: 'Basic Italian Greetings (A1)',
      difficulty: Difficulty.A1,
    },
  });

  const categoryA2 = await prisma.flashcardCategory.create({
    data: {
      title: 'Common Italian Verbs (A2)',
      difficulty: Difficulty.A2,
    },
  });

  console.log(`Created categories: ${categoryA1.title}, ${categoryA2.title}`);

  // --- 2. Create Cards for A1 Category ---
  const a1Cards = [
    { frontText: 'Ciao', backText: 'Hello / Bye' },
    { frontText: 'Grazie', backText: 'Thank you' },
    { frontText: 'Prego', backText: 'You\'re welcome' },
    { frontText: 'Scusa', backText: 'Excuse me (informal)' },
    { frontText: 'Per favore', backText: 'Please' },
    { frontText: 'Sì', backText: 'Yes' },
    { frontText: 'No', backText: 'No' },
    { frontText: 'Buon giorno', backText: 'Good morning / Good day' },
    { frontText: 'Buona sera', backText: 'Good evening' },
    { frontText: 'Buona notte', backText: 'Good night' },
  ];

  for (const card of a1Cards) {
    await prisma.card.create({
      data: {
        categoryId: categoryA1.id,
        ...card,
      },
    });
  }

  // --- 3. Create Cards for A2 Category ---
  const a2Cards = [
    { frontText: 'Andare', backText: 'To go' },
    { frontText: 'Mangiare', backText: 'To eat' },
    { frontText: 'Dormire', backText: 'To sleep' },
    { frontText: 'Vedere', backText: 'To see' },
    { frontText: 'Avere', backText: 'To have' },
    { frontText: 'Essere', backText: 'To be' },
    { frontText: 'Fare', backText: 'To do / To make' },
    { frontText: 'Volere', backText: 'To want' },
    { frontText: 'Potere', backText: 'To be able to' },
  ];

  for (const card of a2Cards) {
    await prisma.card.create({
      data: {
        categoryId: categoryA2.id,
        ...card,
      },
    });
  }

  console.log(`Seeding finished. ${a1Cards.length + a2Cards.length} cards created.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });