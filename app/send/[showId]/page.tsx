import SendMessageClient from '../[showId]/SendMessageClient'
import { notFound } from 'next/navigation'
import prisma from '../../../src/lib/prisma'

export default async function SendMessagePage({ 
  params 
}: { 
  params: Promise<{ showId: string }> // Promise olarak tanımla
}) {
  try {
    // params'ı await ile al
    const { showId } = await params;
    
    // Guard: ensure showId is present
    if (!showId) {
      console.error("SendMessagePage: missing showId")
      return (
        <div className="p-6">
          <p>Eksik parametre: `showId` bulunamadı.</p>
        </div>
      )
    }

    // Vérifier que showId est un ObjectId MongoDB valide (24 caractères hexadécimaux)
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(showId);
    if (!isObjectId) {
      console.warn(`SendMessagePage: Invalid MongoDB ObjectId format: ${showId}`);
      return notFound();
    }

    const show = await prisma.show.findUnique({
      where: {
        id: showId, // Artık düzgün değer var
      },
      include: {
        theme: {
          include: {
            takeovers: true
          }
        },
        user: {
          select: {
            name: true,
            settings: true
          }
        }
      }
    });
    
    if (!show || !show.active) {
      return notFound();
    }
    
    // Verileri SendMessageClient'ın beklediği formata dönüştür
    const showWithDJ = {
      ...show,
      dj: show.user
    };
    
    return <SendMessageClient show={showWithDJ} />;
  } catch (error: unknown) {
    console.error("Error loading show:", error);
    
    const isProd = process.env.NODE_ENV === 'production'
    
    return (
      <div className="p-6">
        <p>Bir hata oluştu. Lütfen daha sonra tekrar deneyin.</p>
        
        {!isProd && (
          <div className="mt-4 bg-red-900/20 border border-red-700 text-red-200 p-3 rounded">
            <strong>Debug:</strong>
            <pre className="whitespace-pre-wrap text-sm mt-2">
              {error instanceof Error ? `${error.message}\n\n${error.stack}` : String(error)}
            </pre>
          </div>
        )}
      </div>
    )
  }
}