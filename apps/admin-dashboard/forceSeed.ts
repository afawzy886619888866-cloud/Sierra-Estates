import { seedFirestore } from './src/seed';
seedFirestore().then(() => {
  console.log('Force seeded!');
  process.exit(0);
}).catch(e => {
  console.error(e);
  process.exit(1);
});
