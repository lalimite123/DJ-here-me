const { loadEnvConfig } = require('@next/env');
const path = require('path');

// Charge les variables d'environnement EXACTEMENT comme Next.js le fait 
// (il va lire .env, .env.local, etc.)
const projectDir = process.cwd();
loadEnvConfig(projectDir);

console.log("\n=======================================================");
console.log("🔍 VÉRIFICATION DE LA CONFIGURATION GOOGLE AUTH");
console.log("=======================================================\n");

const requiredVars = [
  'NEXTAUTH_URL',
  'NEXTAUTH_SECRET',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET'
];

let allGood = true;

requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (!value) {
    console.log(`❌ MANQUANT : ${varName}`);
    allGood = false;
  } else {
    // Masquer les secrets pour ne pas les afficher en clair dans le terminal
    const isSecret = varName.includes('SECRET');
    const displayValue = isSecret ? `${value.substring(0, 5)}... (masqué)` : value;
    console.log(`✅ PRÉSENT  : ${varName} = ${displayValue}`);
    
    // Vérification du format du Client ID
    if (varName === 'GOOGLE_CLIENT_ID' && !value.endsWith('.apps.googleusercontent.com')) {
      console.log(`   ⚠️ ATTENTION : Le GOOGLE_CLIENT_ID ne se termine pas par '.apps.googleusercontent.com'.`);
      console.log(`   Vérifiez que vous avez bien copié l'ID complet depuis la Google Cloud Console.`);
    }
  }
});

console.log("\n=======================================================");
console.log("🔗 VÉRIFICATION DES URLS DE REDIRECTION (CALLBACK)");
console.log("=======================================================\n");

const nextAuthUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
console.log(`URL de base détectée : ${nextAuthUrl}`);
console.log(`\nPour que Google Auth fonctionne, vous DEVEZ ajouter EXACTEMENT cette URL`);
console.log(`dans la section "URI de redirection autorisés" de votre Google Cloud Console :`);
console.log(`\n👉 ${nextAuthUrl}/api/auth/callback/google\n`);

if (nextAuthUrl.includes('localhost')) {
  console.log(`⚠️ REMARQUE : Vous êtes configuré en LOCAL (localhost).`);
  console.log(`Si l'erreur survient en production sur Railway, c'est que Railway ne possède pas`);
  console.log(`la variable d'environnement NEXTAUTH_URL dans son onglet "Variables".`);
}

console.log("=======================================================");
if (allGood) {
  console.log("✅ Toutes les variables requises sont présentes localement !");
} else {
  console.log("❌ Certaines variables manquent. L'authentification échouera.");
}
console.log("=======================================================\n");
