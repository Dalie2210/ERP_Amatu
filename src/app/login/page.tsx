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

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      router.push("/dashboard")
      router.refresh()
    } catch (err: any) {
      setError(err.message || "Error al iniciar sesión")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo Placeholder */}
        <div className="flex flex-col items-center justify-center mb-10 text-primary">
          <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Leaf className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold font-heading tracking-tight text-foreground">
            AMATU
          </h1>
          <p className="text-sm font-medium tracking-widest uppercase text-muted-foreground mt-1">
            Premium Pet Nutrition
          </p>
        </div>

        {/* Login Card */}
        <Card className="border-none shadow-sm bg-card p-4">
          <CardHeader className="space-y-1 pb-8">
            <CardTitle className="text-2xl font-semibold text-center font-heading">
              Iniciar Sesión
            </CardTitle>
            <CardDescription className="text-center text-muted-foreground">
              Ingresa tus credenciales para acceder al ERP
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs uppercase tracking-wider text-muted-foreground">
                  Correo Electrónico
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="ejemplo@amatu.co"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 bg-muted/50 border-transparent focus-visible:ring-primary focus-visible:bg-background transition-colors"
                  required
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs uppercase tracking-wider text-muted-foreground">
                    Contraseña
                  </Label>
                  <Button variant="link" className="px-0 font-normal h-auto text-xs text-primary" type="button">
                    ¿Olvidaste tu contraseña?
                  </Button>
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 bg-muted/50 border-transparent focus-visible:ring-primary focus-visible:bg-background transition-colors"
                  required
                />
              </div>

              {error && (
                <div className="p-3 text-sm text-destructive-foreground bg-destructive/90 rounded-md">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-12 text-md font-medium mt-4 shadow-sm hover:shadow transition-all"
                disabled={isLoading}
              >
                {isLoading ? "Iniciando..." : "Ingresar"}
              </Button>
            </form>
          </CardContent>
          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground">
              ¿No tienes cuenta?{" "}
              <Link href="/register" className="text-primary font-semibold hover:underline">
                Regístrate aquí
              </Link>
            </p>
          </div>
        </Card>
        
        <p className="text-center text-xs text-muted-foreground mt-8">
          © {new Date().getFullYear()} Amatu. Todos los derechos reservados.
        </p>
      </div>
    </div>
  )
}
