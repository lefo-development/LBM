import { useState } from "react";
import { Shield, Download, Copy, Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/lib/auth-context";

interface RecoveryModalProps {
  username: string;
  words: string[];
}

export function RecoveryModal({ username, words }: RecoveryModalProps) {
  const { saveRecoveryFile, confirmRecovery } = useAuth();
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleCopy = async () => {
    const text = words.map((w, i) => `${i + 1}. ${w}`).join("\n");
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveRecoveryFile(username, words);
      setSaved(true);
    } catch {
      // User may have cancelled the save dialog — that's OK
    } finally {
      setSaving(false);
    }
  };

  const handleContinue = () => {
    confirmRecovery();
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-lg mx-4">
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10 border border-amber-500/30">
            <Shield className="h-7 w-7 text-amber-500" />
          </div>
          <CardTitle className="!text-xl font-story">
            Kurtarma Kodlarınızı Kaydedin
          </CardTitle>
          <CardDescription className="font-story !text-base">
            Bu 12 kelime, şifrenizi unutursanız hesabınızı kurtarmanın{" "}
            <strong className="text-amber-400">tek yoludur</strong>.
            Güvenli bir yere kaydedin.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {/* Recovery words grid */}
          <div className="grid grid-cols-3 gap-2 p-4 rounded-lg bg-muted/50 border border-border">
            {words.map((word, index) => (
              <div
                key={index}
                className="flex items-center gap-2 px-3 py-2 rounded-md bg-background border border-border/50"
              >
                <span className="text-xs font-mono text-muted-foreground w-5 text-right">
                  {index + 1}.
                </span>
                <span className="text-sm font-mono font-medium">{word}</span>
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleCopy}
            >
              {copied ? (
                <>
                  <Check className="mr-2 h-4 w-4 text-green-500" />
                  <span className="font-story">Kopyalandı!</span>
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" />
                  <span className="font-story">Kopyala</span>
                </>
              )}
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleSave}
              disabled={saving}
            >
              {saved ? (
                <>
                  <Check className="mr-2 h-4 w-4 text-green-500" />
                  <span className="font-story">Kaydedildi!</span>
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  <span className="font-story">
                    {saving ? "Kaydediliyor..." : "Dosyaya Kaydet"}
                  </span>
                </>
              )}
            </Button>
          </div>

          {/* Warning */}
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-muted-foreground font-story">
            <strong className="text-destructive">⚠ Uyarı:</strong> Bu kelimeleri
            kimseyle paylaşmayın. Kaybetmeniz durumunda şifreli verileriniz
            kurtarılamaz.
          </div>

          {/* Continue button */}
          <Button
            className="w-full"
            size="lg"
            onClick={handleContinue}
          >
            <span className="font-story !text-lg">Devam Et</span>
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
