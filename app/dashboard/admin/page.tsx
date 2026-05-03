import { getServerSession } from "next-auth"
import { authOptions } from "../../api/auth/[...nextauth]/auth-options"
import { redirect } from "next/navigation"
import ThemeManagerClient from "./ThemeManagerClient"
import AdminHeader from "./AdminHeader"

export default async function AdminDashboardPage() {
  const session = await getServerSession(authOptions)

  // En production, décommentez pour bloquer l'accès aux non-admins
  // if (!session?.user?.isAdmin) {
  //   redirect('/dashboard')
  // }

  return (
    <div className="p-8 max-w-4xl mx-auto min-h-screen">
      <AdminHeader />
      <ThemeManagerClient />
    </div>
  )
}
