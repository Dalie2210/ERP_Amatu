"use client"

import { useAuth } from "@/hooks/useAuth"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { role, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && role !== "admin") {
      router.replace("/dashboard")
    }
  }, [role, isLoading, router])

  if (isLoading) return null
  if (role !== "admin") return null

  return <>{children}</>
}
