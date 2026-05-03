import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import prisma from '../../../../src/lib/prisma';
import Pusher from 'pusher';

// Webhook Stripe
const getStripe = () => {
  return new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
    apiVersion: '2025-02-24.acacia' as any,
  });
};

// Configuration de Pusher Serveur
const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID || "123",
  key: process.env.NEXT_PUBLIC_PUSHER_KEY || "123",
  secret: process.env.PUSHER_SECRET || "123",
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "eu",
  useTLS: true
});

// Obligatoire pour Next.js App Router quand on traite les requêtes brutes (Webhooks)
export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('stripe-signature');
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!signature || !webhookSecret) {
      console.error('Missing Stripe signature or webhook secret');
      return NextResponse.json({ error: 'Missing configuration' }, { status: 400 });
    }

    let event: Stripe.Event;

    // Vérification cryptographique pour s'assurer que c'est bien Stripe qui parle
    try {
      const stripe = getStripe();
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (err: any) {
      console.error(`Webhook Error: ${err.message}`);
      return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
    }

    // On écoute l'événement de paiement réussi
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      
      // On récupère l'ID du message caché dans les métadonnées lors de la création
      const messageId = paymentIntent.metadata.messageId;

      if (messageId) {
        // Le paiement est reçu : on passe le message en 'paid: true' dans la BDD
        const updatedMessage = await prisma.message.update({
          where: { id: messageId },
          data: {
            paid: true,
            paymentId: paymentIntent.id,
            createdAt: new Date(), // On met à jour la date pour que le message soit "récent"
          },
        });
        
        // DÉCLENCHER PUSHER POUR AFFICHAGE INSTANTANÉ !
        await pusher.trigger(`show-${updatedMessage.showId}`, 'new-message', updatedMessage);
        
        console.log(`Message ${messageId} payé et validé avec succès.`);
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error handling webhook:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
