import Silk from './Silk';
import { SignupForm } from './signup-form'; // Az önce eklediğimiz kayıt formu

export default function LoginPage() {
  return (
    <div className="relative w-full h-screen overflow-hidden flex items-center justify-center">
      
      {/* 1. KATMAN: Arka Planda Akan Silk Efekti (Siteden aldığınız yeni ayarlar) */}
      <div className="absolute inset-0 z-0">
        <Silk
          speed={4}
          scale={1}
          color="#505050"
          noiseIntensity={1}
          rotation={0}
        />
      </div>

      {/* 2. KATMAN: Ön Plan (Kayıt Formu) */}
      <div className="relative z-10 w-full max-w-md mx-4 dark">
        <SignupForm />
      </div>

    </div>
  );
}