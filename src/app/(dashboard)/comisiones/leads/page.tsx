"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

// The leads registration form is now inline on the main commissions dashboard.
export default function LeadsRedirectPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace("/comisiones?openLeads=true")
  }, [router])
  return null
}
