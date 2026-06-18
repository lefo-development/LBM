"use client"

import { useState } from "react"
import { Eye, EyeOff } from "lucide-react"

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

export function SignupForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

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
          <form>
            <FieldGroup>
              <Field>
                <FieldLabel className="font-story !text-lg" htmlFor="name">Hesap Adı</FieldLabel>
                <Input className="!font-story !text-lg" id="name" type="text" placeholder="Lefo" required />
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
              <Field>
                <Button type="submit">
                  <span className="font-story !text-lg">Hesap Oluştur</span>
                </Button>
                <FieldDescription className="font-story !text-lg text-center">
                  Şifresiz yerel bir hesap oluşturmak için <a href="#">Giriş Yap</a>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
      <FieldDescription className="font-story !text-lg px-6 text-center">
        Hesap oluşturarak <a href="#">Hizmet Şartları</a>{" "}
        ve <a href="#">Gizlilik Politikası</a> koşullarını kabul etmiş olursunuz.
      </FieldDescription>
    </div>
  )
}
