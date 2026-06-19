"use client"

import { useState, useEffect } from "react"
import { Eye, EyeOff, Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useAuth, ProfileInfo } from "@/lib/auth-context"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function SignupForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const { createEncryptedAccount, createGuestAccount, loginWithPassword, getAllProfiles, error, clearError, isLoading } = useAuth()

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [validationError, setValidationError] = useState<string | null>(null)

  // Existing profiles state
  const [profiles, setProfiles] = useState<ProfileInfo[]>([])
  const [selectedProfileId, setSelectedProfileId] = useState<string>("")
  const [loginPassword, setLoginPassword] = useState("")
  const [showLoginPassword, setShowLoginPassword] = useState(false)

  useEffect(() => {
    getAllProfiles().then(data => {
      setProfiles(data);
      if (data.length > 0) {
        setSelectedProfileId(data[0].id);
      }
    });
  }, [getAllProfiles]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()
    setValidationError(null)

    // Validations
    if (!username.trim()) {
      setValidationError("Hesap adı boş olamaz.")
      return
    }
    if (password.length < 8) {
      setValidationError("Şifre en az 8 karakter olmalıdır.")
      return
    }
    if (password !== confirmPassword) {
      setValidationError("Şifreler eşleşmiyor.")
      return
    }

    await createEncryptedAccount(username.trim(), password)
  }

  const handleGuestLogin = async (e: React.MouseEvent) => {
    e.preventDefault()
    clearError()
    setValidationError(null)
    await createGuestAccount()
  }

  const handleExistingLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()
    setValidationError(null)
    
    const profile = profiles.find(p => p.id === selectedProfileId);
    if (!profile) return;

    if (profile.profile_type === "encrypted" && !loginPassword) {
      setValidationError("Şifre girmelisiniz.");
      return;
    }

    await loginWithPassword(profile.username, profile.profile_type === "encrypted" ? loginPassword : "");
  }

  const displayError = validationError || error
  const selectedProfile = profiles.find(p => p.id === selectedProfileId)

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="!text-xl font-story">Yerel Hesabınızı Oluşturun</CardTitle>
          <CardDescription className="font-story !text-lg">
            Bir isim ve şifre girerek şifreli yerel bir hesap oluşturabilirsiniz.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel className="font-story !text-lg" htmlFor="name">Hesap Adı</FieldLabel>
                <Input
                  className="!font-story !text-lg"
                  id="name"
                  type="text"
                  placeholder="Lefo"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </Field>
              <Field>
                <Field className="grid grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel className="font-story !text-lg" htmlFor="password">Şifre</FieldLabel>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        className="pr-10"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={isLoading}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"}
                        aria-pressed={showPassword}
                        className="absolute right-2 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center text-white"
                        style={{
                          background: "transparent",
                          border: "none",
                          outline: "none",
                          boxShadow: "none",
                          padding: 0,
                          cursor: "pointer",
                          WebkitAppearance: "none",
                          appearance: "none",
                          WebkitTapHighlightColor: "transparent",
                        }}
                      >
                        {showPassword ? (
                          <EyeOff size={20} />
                        ) : (
                          <Eye size={20} />
                        )}
                      </button>
                    </div>
                  </Field>
                  <Field>
                    <FieldLabel className="font-story !text-lg" htmlFor="confirm-password">
                      Şifrenizi Tekrar Girin
                    </FieldLabel>
                    <div className="relative">
                      <Input
                        id="confirm-password"
                        type={showConfirmPassword ? "text" : "password"}
                        className="pr-10"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        disabled={isLoading}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                        aria-label={
                          showConfirmPassword ? "Şifreyi gizle" : "Şifreyi göster"
                        }
                        aria-pressed={showConfirmPassword}
                        className="absolute right-2 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center text-white"
                        style={{
                          background: "transparent",
                          border: "none",
                          outline: "none",
                          boxShadow: "none",
                          padding: 0,
                          cursor: "pointer",
                          WebkitAppearance: "none",
                          appearance: "none",
                          WebkitTapHighlightColor: "transparent",
                        }}
                      >
                        {showConfirmPassword ? (
                          <EyeOff size={20} />
                        ) : (
                          <Eye size={20} />
                        )}
                      </button>
                    </div>
                  </Field>
                </Field>
                <FieldDescription className="font-story !text-lg">
                  Şifreniz en az 8 karakter uzunluğunda olmalı
                </FieldDescription>
              </Field>

              {/* Error display */}
              {displayError && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive font-story">
                  {displayError}
                </div>
              )}

              <Field>
                <Button type="submit" disabled={isLoading} className="w-full">
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      <span className="font-story !text-lg">Oluşturuluyor...</span>
                    </>
                  ) : (
                    <span className="font-story !text-lg">Hesap Oluştur</span>
                  )}
                </Button>
                <FieldDescription className="font-story !text-lg text-center">
                  Şifresiz yerel bir hesap oluşturmak için{" "}
                  <a
                    href="#"
                    onClick={handleGuestLogin}
                    className="underline underline-offset-4 hover:text-primary"
                  >
                    Giriş Yap
                  </a>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>

          {profiles.length > 0 && (
            <div className="mt-8">
              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground font-story">
                    Mevcut Profiller
                  </span>
                </div>
              </div>

              <form onSubmit={handleExistingLogin} className="space-y-4">
                <Field>
                  <FieldLabel className="font-story !text-lg">Profil Seçin</FieldLabel>
                  <Select value={selectedProfileId} onValueChange={setSelectedProfileId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Profil seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {profiles.map(p => (
                        <SelectItem key={p.id} value={p.id} className="font-story">
                          {p.username} {p.profile_type === "guest" ? "(Misafir)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                {selectedProfile?.profile_type === "encrypted" && (
                  <Field>
                    <FieldLabel className="font-story !text-lg">Şifreniz</FieldLabel>
                    <div className="relative">
                      <Input
                        type={showLoginPassword ? "text" : "password"}
                        className="pr-10 font-story"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        disabled={isLoading}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword((prev) => !prev)}
                        className="absolute right-2 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center text-white"
                        style={{
                          background: "transparent",
                          border: "none",
                          outline: "none",
                          boxShadow: "none",
                          padding: 0,
                          cursor: "pointer",
                        }}
                      >
                        {showLoginPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                  </Field>
                )}

                <Button type="submit" variant="secondary" disabled={isLoading} className="w-full">
                  {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  <span className="font-story !text-lg">Giriş Yap</span>
                </Button>
              </form>
            </div>
          )}

        </CardContent>
      </Card>
      <FieldDescription className="font-story !text-lg px-6 text-center">
        Hesap oluşturarak <a href="#">Hizmet Şartları</a>{" "}
        ve <a href="#">Gizlilik Politikası</a> koşullarını kabul etmiş olursunuz.
      </FieldDescription>
    </div>
  )
}
