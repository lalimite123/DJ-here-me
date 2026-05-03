import { getServerSession } from "next-auth/next"
import { authOptions } from "../../../auth/[...nextauth]/auth-options"
import prisma from "../../../../../src/lib/prisma"
import { NextResponse } from "next/server"

export async function GET(
  request: Request,
  { params }: { params: { showId: string } }
) {
  try {
    const showId = params.showId;
    if (!showId) {
      return NextResponse.json({ error: 'Missing showId' }, { status: 400 });
    }
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let userId = session.user.id
    if (!userId && session.user.email) {
      const user = await prisma.user.findUnique({
        where: { email: session.user.email }
      })
      userId = user?.id
    }

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Show bilgilerini getir
    const show = await prisma.show.findUnique({
      where: { id: showId },
      include: {
        messages: {
          where: {
            paid: true
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });
    
    if (!show) {
      return NextResponse.json({ error: 'Show not found' }, { status: 404 });
    }
    
    // Bu show kullanıcıya ait mi kontrol et
    if (show.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const messages = show.messages || []
    const paidMessages = messages.filter(message => Number(message.payment || 0) > 0);
    const totalEarnings = messages.reduce((sum, message) => sum + Number(message.payment || 0), 0);

    const showDetails = {
      id: show.id,
      title: show.title,
      createdAt: show.createdAt,
      endedAt: show.endedAt,
      messageCount: messages.length,
      paidMessageCount: paidMessages.length,
      totalEarnings: Number(totalEarnings.toFixed(2)),
      messages
    };
    
    return NextResponse.json(showDetails);
  } catch (error) {
    console.error('Error fetching show details:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch show details',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}