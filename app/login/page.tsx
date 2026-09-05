// app/login/page.tsx
// Pantalla de login: 6 cajitas de PIN, tema negro y naranja, logo de buseta.
// El PIN por sí solo identifica al usuario (es único por persona).

"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { IconoBuseta } from "../../components/Icons";
import { APP_NOMBRE } from "../../lib/config";

export default function LoginPage() {
  const [digitos, setDigitos] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const router = useRouter();

  const enviarPin = async (pinCompleto: string) => {
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin: pinCompleto }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "PIN incorrecto");
      setDigitos(["", "", "", "", "", ""]);
      inputsRef.current[0]?.focus();
      return;
    }

    const { rol } = await res.json();
    const destino: Record<string, string> = {
      SUPER_ADMIN: "/admin",
      ADMIN_TH: "/th/aprobaciones",
      COLABORADOR: "/mis-pasajes",
      FINANZAS: "/finanzas/pagos",
    };
    router.push(destino[rol] ?? "/");
  };

  const handleChange = (index: number, valor: string) => {
    const soloNumero = valor.replace(/[^0-9]/g, "").slice(-1);
    const nuevosDigitos = [...digitos];
    nuevosDigitos[index] = soloNumero;
    setDigitos(nuevosDigitos);

    if (soloNumero && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }

    if (nuevosDigitos.every((d) => d !== "") && index === 5) {
      enviarPin(nuevosDigitos.join(""));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !digitos[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-orange-500 mb-4 text-black">
            <IconoBuseta className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-white">{APP_NOMBRE}</h1>
          <p className="text-sm text-neutral-400 mt-1">Ingresa tu PIN de 6 dígitos</p>
        </div>

        <div className="flex justify-center gap-2 sm:gap-3">
          {digitos.map((digito, index) => (
            <input
              key={index}
              ref={(el) => {
                inputsRef.current[index] = el;
              }}
              type="password"
              inputMode="numeric"
              maxLength={1}
              value={digito}
              disabled={loading}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              className="w-12 h-14 sm:w-14 sm:h-16 text-center text-2xl font-bold rounded-xl
                         bg-neutral-900 border-2 border-neutral-700 text-white
                         focus:border-orange-500 focus:ring-2 focus:ring-orange-500/30
                         outline-none transition disabled:opacity-40"
            />
          ))}
        </div>

        {error && <p className="text-sm text-red-500 text-center mt-4">{error}</p>}
        {loading && <p className="text-sm text-orange-400 text-center mt-4">Verificando...</p>}
      </div>
    </div>
  );
}