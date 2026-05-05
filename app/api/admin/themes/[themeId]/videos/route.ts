import { NextResponse } from 'next/server';
import prisma from '../../../../../../src/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../auth/[...nextauth]/auth-options';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(request: Request, { params }: { params: Promise<{ themeId: string }> }) {
  try {
    const { themeId } = await params;
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const formData = await request.formData();
    const name = formData.get('name') as string;
    const priceStr = formData.get('price') as string;
    const videoFile = formData.get('video') as File | null;
    const youtubeUrl = formData.get('youtubeUrl') as string | null;

    if (!name || (!videoFile && !youtubeUrl) || !priceStr) {
      return NextResponse.json({ error: 'Le nom, la vidéo (fichier ou URL) et le prix sont requis' }, { status: 400 });
    }

    const theme = await prisma.theme.findUnique({ where: { id: themeId } });
    if (!theme) {
      return NextResponse.json({ error: 'Thème introuvable' }, { status: 404 });
    }

    let videoUrl = '';

    if (youtubeUrl) {
      videoUrl = youtubeUrl;
    } else if (videoFile) {
      // 1. Dossier d'upload pour les takeovers
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'takeovers');
      await mkdir(uploadsDir, { recursive: true });

      // 2. Sauvegarder la vidéo
      const videoBuffer = Buffer.from(await videoFile.arrayBuffer());
      const videoFilename = `${Date.now()}-${videoFile.name.replace(/[^a-zA-Z0-9.]/g, '')}`;
      await writeFile(path.join(uploadsDir, videoFilename), videoBuffer);
      videoUrl = `/uploads/takeovers/${videoFilename}`;
    }

    const themeVideo = await prisma.themeVideo.create({
      data: {
        name,
        videoUrl,
        price: parseFloat(priceStr),
        themeId: themeId
      }
    });

    return NextResponse.json({ success: true, themeVideo });

  } catch (error) {
    console.error('Erreur lors de l\'ajout de la sous-vidéo:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}
