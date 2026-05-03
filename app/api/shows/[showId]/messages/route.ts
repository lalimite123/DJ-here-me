// app/api/shows/[showId]/messages/route.ts

import { NextResponse } from 'next/server';
import prisma from "../../../../../src/lib/prisma"


export async function GET(
  request: Request,
  { params }: { params: { showId: string } }
) {
  try {
    const resolvedParams = await params;
    const showId = resolvedParams.showId;

    // Vérifier que showId est un ObjectId MongoDB valide
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(showId);
    if (!isObjectId) {
      return NextResponse.json({ error: "Invalid show ID format" }, { status: 400 });
    }

    const show = await prisma.show.findUnique({
      where: { id: showId },
      include: {
        messages: {
          where: {
            paid: true
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    if (!show) {
      return NextResponse.json({ error: "Show not found" }, { status: 404 });
    }

    return NextResponse.json(show.messages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}