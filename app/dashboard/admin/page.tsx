import { getServerSession } from "next-auth"
import { authOptions } from "../../api/auth/[...nextauth]/auth-options"
import { redirect } from "next/navigation"
import ThemeManagerClient from "./ThemeManagerClient"

export default async function AdminDashboardPage() {
  const session = await getServerSession(authOptions)

  // En production, décommentez pour bloquer l'accès aux non-admins
  // if (!session?.user?.isAdmin) {
  //   redirect('/dashboard')
  // }

  return (
    <div className="p-8 max-w-4xl mx-auto min-h-screen">
      <div className="mb-8">
        <h1 className="text-4xl font-black text-white mb-2 tracking-tight">Admin <span className="text-purple-500">Thèmes</span></h1>
        <p className="text-gray-400">Gérez les vidéos de fond et les animations (Takeovers) pour les DJs.</p>
      </div>

      <ThemeManagerClient />
    </div>
  )
}
