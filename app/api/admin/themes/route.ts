import { NextResponse } from 'next/server';
import prisma from '../../../../src/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/auth-options';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const formData = await request.formData();
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const bgVideo = formData.get('backgroundVideo') as File;
    const thumbnail = formData.get('thumbnail') as File | null;

    if (!name || !bgVideo) {
      return NextResponse.json({ error: 'Le nom et la vidéo sont requis' }, { status: 400 });
    }

    // 1. Définir et créer le dossier d'upload (public/uploads/themes)
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'themes');
    await mkdir(uploadsDir, { recursive: true });

    // 2. Sauvegarder la vidéo sur le disque
    const bgVideoBuffer = Buffer.from(await bgVideo.arrayBuffer());
    // Nom de fichier unique
    const bgVideoFilename = `${Date.now()}-${bgVideo.name.replace(/[^a-zA-Z0-9.]/g, '')}`;
    await writeFile(path.join(uploadsDir, bgVideoFilename), bgVideoBuffer);
    const backgroundVideoUrl = `/uploads/themes/${bgVideoFilename}`;

    // 3. Sauvegarder la miniature sur le disque (si elle existe)
    let thumbnailUrl = null;
    if (thumbnail) {
      const thumbBuffer = Buffer.from(await thumbnail.arrayBuffer());
      const thumbFilename = `${Date.now()}-${thumbnail.name.replace(/[^a-zA-Z0-9.]/g, '')}`;
      await writeFile(path.join(uploadsDir, thumbFilename), thumbBuffer);
      thumbnailUrl = `/uploads/themes/${thumbFilename}`;
    }

    // 4. Enregistrer dans la base de données
    const theme = await prisma.theme.create({
      data: {
        name,
        description,
        backgroundVideoUrl,
        thumbnailUrl,
        isActive: true
      }
    });

    return NextResponse.json({ success: true, theme });

  } catch (error) {
    console.error('Erreur lors de la création du thème:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}

export async function GET() {
  try {
    // Récupère tous les thèmes avec leurs sous-vidéos
    const themes = await prisma.theme.findMany({
      include: {
        takeovers: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    return NextResponse.json(themes);
  } catch (error) {
    console.error('Erreur lors de la récupération des thèmes:', error);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}
