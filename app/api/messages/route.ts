import { getServerSession } from "next-auth/next"
import { authOptions } from "../auth/[...nextauth]/auth-options"
import prisma from "../../../src/lib/prisma"
import { NextResponse } from "next/server"


// app/api/messages/route.ts
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { showId, displayName, content, effectType, emoji3D } = body;
    
    // On récupère le prix par caractère
    const show = await prisma.show.findUnique({
      where: { id: showId },
      include: { user: { include: { settings: true } } }
    });

    if (!show) return NextResponse.json({ error: 'Show not found' }, { status: 404 });

    const pricePerChar = show.user.settings?.pricePerChar || 0.1;
    const calculatedPrice = content.length * pricePerChar;

    // Si le message n'est pas gratuit, on refuse la création directe
    // Il faut passer par l'API Stripe
    if (calculatedPrice > 0) {
      return NextResponse.json({ error: 'Payment required via Stripe' }, { status: 402 });
    }

    // Message 100% gratuit
    const message = await prisma.message.create({
      data: {
        showId,
        displayName,
        content,
        payment: 0,
        paid: true, // Gratuit = "payé" par défaut
        effectType,
        emoji3D
      }
    });
    return NextResponse.json(message);
  } catch (error) {
    console.error('Error creating message:', error);
    return NextResponse.json(
      { error: 'Failed to create message' },
      { status: 500 }
    );
  }
}


export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const showId = searchParams.get('showId')
    
    if (!showId) {
      return NextResponse.json({ error: "showId parametresi gerekli" }, { status: 400 })
    }
    
    // Son 10 mesajı getir
    const messages = await prisma.message.findMany({
      where: {
        showId: showId,
        paid: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    })
    
    return NextResponse.json(messages)
  } catch (error: any) {
    console.error("Error fetching messages:", error)
    return NextResponse.json({ error: "Mesajlar getirilemedi", details: error.message }, { status: 500 })
  }
}