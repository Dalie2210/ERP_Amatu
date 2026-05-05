"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"
import { Leaf } from "lucide-react"
import Link from "next/link"

export default function RegisterPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      })

      if (signUpError) throw signUpError

      if (data.user) {
        // Automatically create the user record in public.users if trigger isn't ready
        // (Though we should have a trigger, this is a safety net for dev)
        await supabase.from("users").insert([
          { 
            id: data.user.id, 
            email: data.user.email,
            role: "vendedor" // Default role for new signups
          }
        ])
        
        router.push("/dashboard")
      }
    } catch (err: any) {
      setError(err.message || "Ocurrió un error al registrarse")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-none shadow-xl bg-white">
        <CardHeader className="space-y-4 flex flex-col items-center pb-8">
          <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mb-2">
            <Leaf className="h-8 w-8 text-primary" />
          </div>
          <div className="text-center">
            <CardTitle className="text-3xl font-bold font-heading tracking-tight text-primary">
              Crea tu cuenta
            </CardTitle>
            <CardDescription className="text-muted-foreground mt-2">
              Regístrate para empezar a usar Amatu ERP
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Correo Electrónico</Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-background border-muted-foreground/20 focus:border-primary h-12"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-background border-muted-foreground/20 focus:border-primary h-12"
              />
            </div>

            {error && (
              <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md border border-destructive/20 text-center">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-12 text-lg font-medium transition-all hover:scale-[1.02] active:scale-[0.98]"
              disabled={isLoading}
            >
              {isLoading ? "Creando cuenta..." : "Registrarse"}
            </Button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground">
              ¿Ya tienes cuenta?{" "}
              <Link href="/login" className="text-primary font-semibold hover:underline">
                Inicia Sesión
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
