// app/login/page.tsx
// Pantalla de login: 6 cajitas de PIN, tema negro y naranja, logo de buseta.
// Ahora con un overlay de carga claro mientras se verifica el PIN.

"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { APP_NOMBRE } from "../../lib/config";
import Spinner from "../../components/Spinner";

export default function LoginPage() {
  const [digitos, setDigitos] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
    const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const router = useRouter();

  // Cada vez que aparece un error (y ya no está cargando), regresamos
  // el foco a la primera cajita. Usar un useEffect es más confiable que
  // llamar .focus() justo después de setLoading(false), porque React
  // todavía no ha actualizado el DOM en ese instante exacto.
  useEffect(() => {
    if (error && !loading) {
      inputsRef.current[0]?.focus();
    }
  }, [error, loading]);

  const enviarPin = async (pinCompleto: string) => {
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin: pinCompleto }),
    });

     if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "PIN incorrecto");
      setDigitos(["", "", "", "", "", ""]);
      setLoading(false);
      return;
    }

    const { rol } = await res.json();
    const destino: Record<string, string> = {
      SUPER_ADMIN: "/dashboard",
      ADMIN_TH: "/dashboard",
      COLABORADOR: "/mis-pasajes",
      FINANZAS: "/dashboard",
    };
    // OJO: dejamos "loading" en true a propósito — la pantalla se queda
    // mostrando el overlay de carga hasta que router.push() navegue de
    // verdad a la siguiente página, evitando el "parpadeo" de volver al
    // formulario justo antes de cambiar de pantalla.
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
    <div className="min-h-screen flex items-center justify-center bg-black px-4 relative">
      <div className={`w-full max-w-sm transition-opacity ${loading ? "opacity-40 pointer-events-none" : ""}`}>
        <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-28 h-28 rounded-2xl border-2 border-orange-500 shadow-[0_0_30px_rgba(249,115,22,0.5)] bg-neutral-900 mb-4 p-4">
          <img src="/logo.png" alt={APP_NOMBRE} className="w-full h-full object-contain" />
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
                        focus:border-orange-500 focus:shadow-[0_0_20px_rgba(249,115,22,0.5)]
                        outline-none transition disabled:opacity-40"
            />
          ))}
        </div>

        {error && <p className="text-sm text-red-500 text-center mt-4">{error}</p>}
      </div>

      {/* Overlay de carga: cubre toda la pantalla mientras se verifica el PIN,
          para que sea imposible confundirlo con que "no está pasando nada". */}
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/40">
          <Spinner className="w-10 h-10 text-orange-500" />
          <p className="text-sm text-orange-400 font-medium">Verificando tu PIN...</p>
        </div>
      )}
    </div>
  );
}