"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"
import { Leaf, Eye, EyeOff } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

// ---------- Friendly error mapping ----------
const ERROR_MESSAGES: Record<string, string> = {
  "Invalid login credentials": "Correo o contraseña incorrectos.",
  "Email not confirmed": "Tu correo aún no ha sido confirmado. Revisa tu bandeja de entrada.",
  "Too many requests": "Demasiados intentos. Por favor espera un momento e intenta de nuevo.",
  "User not found": "No existe una cuenta con ese correo electrónico.",
}

function getFriendlyError(raw: string): string {
  for (const [key, friendly] of Object.entries(ERROR_MESSAGES)) {
    if (raw.toLowerCase().includes(key.toLowerCase())) return friendly
  }
  return "Ocurrió un error al iniciar sesión. Intenta de nuevo."
}

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) throw authError

      router.push("/dashboard")
      router.refresh()
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Error desconocido"
      setError(getFriendlyError(message))
    } finally {
      setIsLoading(false)
    }
  }

  const handleForgotPassword = () => {
    toast.info("Funcionalidad próximamente", {
      description:
        "La recuperación de contraseña estará disponible en una próxima actualización. Contacta al administrador si necesitas ayuda.",
    })
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
                  <Button
                    variant="link"
                    className="px-0 font-normal h-auto text-xs text-primary"
                    type="button"
                    onClick={handleForgotPassword}
                  >
                    ¿Olvidaste tu contraseña?
                  </Button>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 bg-muted/50 border-transparent focus-visible:ring-primary focus-visible:bg-background transition-colors pr-12"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
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
