import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import prisma from '../../../../src/lib/prisma';

const getStripe = () => {
  return new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
    apiVersion: '2025-02-24.acacia' as any,
  });
};

export async function POST(request: Request) {
  try {
    const { paymentIntentId, messageId } = await request.json();

    if (!paymentIntentId) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const stripe = getStripe();
    // Vérifier le statut du paiement directement auprès de Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status === 'succeeded') {
      // On retrouve l'ID du message stocké secrètement par Stripe lors de la création
      const realMessageId = paymentIntent.metadata?.messageId || messageId;
      
      if (!realMessageId) {
         return NextResponse.json({ error: 'Cannot link payment to message' }, { status: 400 });
      }

      // Le paiement est vraiment validé, on met à jour la base de données
      const updatedMessage = await prisma.message.update({
        where: { id: realMessageId },
        data: {
          paid: true,
          paymentId: paymentIntent.id,
          createdAt: new Date(), // On met à jour la date pour que le message soit "récent" sur l'écran
        },
      });

      return NextResponse.json({ success: true, message: updatedMessage });
    } else {
      return NextResponse.json({ error: 'Payment not successful' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error confirming payment:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
