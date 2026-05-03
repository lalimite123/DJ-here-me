import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import prisma from '../../../../src/lib/prisma';

// Lazy load Stripe to avoid build errors when env vars are missing
const getStripe = () => {
  return new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
    apiVersion: '2025-02-24.acacia' as any,
  });
};

export async function POST(request: Request) {
  try {
    const { showId, displayName, content, takeoverVideoId, emoji3D, duration } = await request.json();

    if (!showId || !displayName || !content) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    // 1. Récupérer le show et les paramètres du DJ depuis la base de données
    const show = await prisma.show.findUnique({
      where: { id: showId },
      include: {
        theme: {
          include: {
            takeovers: true
          }
        },
        user: {
          include: {
            settings: true,
          }
        }
      }
    });

    if (!show) {
      return NextResponse.json({ error: 'Show not found' }, { status: 404 });
    }

    if (!show.active) {
      return NextResponse.json({ error: 'Show is no longer active' }, { status: 400 });
    }

    // 2. Calculer le vrai prix côté serveur
    const pricePerChar = show.user.settings?.pricePerChar || 0.1;
    let amountInDollars = content.length * pricePerChar;
    
    // Ajouter le prix de l'animation vidéo (Takeover)
    if (takeoverVideoId && show.theme) {
      const takeover = show.theme.takeovers.find(t => t.id === takeoverVideoId)
      if (takeover) {
        amountInDollars += takeover.price
      }
    }

    // Ajouter le prix de la durée (+1$ par seconde au-delà de 5s)
    const validDuration = typeof duration === 'number' && duration >= 5 ? duration : 5;
    if (validDuration > 5) {
      amountInDollars += (validDuration - 5) * 1;
    }
    
    // Stripe requiert un montant minimum (ex: 0.50$ soit 50 centimes)
    if (amountInDollars < 0.50) {
      amountInDollars = 0.50;
    }
    
    const amountInCents = Math.round(amountInDollars * 100);

    // 3. Créer le message dans la base de données avec le statut "Non Payé" (paid: false)
    const message = await prisma.message.create({
      data: {
        showId,
        displayName,
        content,
        payment: amountInDollars,
        paid: false, // Ce sera passé à true par le webhook une fois le paiement validé
        paymentId: 'pending',
        takeoverVideoId: takeoverVideoId || null,
        emoji3D,
        duration: validDuration, // On sauvegarde la durée payée
      }
    });

    // 4. Créer l'intention de paiement Stripe
    const stripe = getStripe();
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'usd',
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        messageId: message.id, // Très important pour lier le paiement au message
        showId: showId,
      },
    });

    // 5. Renvoyer le "client_secret" au frontend pour afficher le formulaire de paiement
    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      messageId: message.id,
      amount: amountInDollars
    });

  } catch (error) {
    console.error('Error creating payment intent:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
