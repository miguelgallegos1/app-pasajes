// app/login/page.tsx
// Pantalla de login: 6 cajitas de PIN, tema negro y naranja, logo de buseta.
// También ofrece entrar con biometría (Face ID/Touch ID/Windows Hello/huella)
// si el dispositivo la soporta y el usuario ya la activó antes.

"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { APP_NOMBRE } from "../../lib/config";
import Spinner from "../../components/Spinner";
import { IconoHuella, IconoCheck } from "../../components/Icons";
import { INICIO_POR_ROL as DESTINO_POR_ROL } from "../../lib/roles";
import BotonTema from "../../components/BotonTema";

const TIEMPO_LIMITE_MS = 8000;
const REINTENTOS_MAXIMOS = 2;

// fetch con límite de tiempo: si el pedido se cuelga (red inestable, cold
// start del servidor, etc.) abortamos en vez de esperar para siempre. 8s
// alcanza para señal débil o un servidor recién despertando; enviarPin ya
// reintenta antes de culpar a la conexión (ver REINTENTOS_MAXIMOS).
async function fetchConLimite(input: RequestInfo, init?: RequestInit) {
  const controlador = new AbortController();
  const limite = setTimeout(() => controlador.abort(), TIEMPO_LIMITE_MS);
  try {
    return await fetch(input, { ...init, signal: controlador.signal });
  } finally {
    clearTimeout(limite);
  }
}

// navigator.onLine dice si el dispositivo tiene alguna conexión, no si
// llega al servidor — por eso solo lo usamos para el caso claro ("avión",
// wifi apagado). Con señal débil sigue en true y ahí preferimos reintentar
// en silencio antes de mostrarle al usuario un mensaje de "sin conexión"
// que no es exacto.
const sinConexionDetectada = () => typeof navigator !== "undefined" && navigator.onLine === false;

export default function LoginPage() {
  const [digitos, setDigitos] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mensajeCarga, setMensajeCarga] = useState("Verificando tu PIN...");
  // Distingue "todavía verificando" (spinner) de "ya se verificó, solo
  // falta que cargue la siguiente pantalla" (check verde) — con el mismo
  // spinner naranja durante todo el proceso se sentía como que la
  // pantalla se quedaba pegada justo cuando en realidad ya había pasado.
  const [entrando, setEntrando] = useState(false);
  const [biometriaDisponible, setBiometriaDisponible] = useState(false);
  // Firefox no soporta el enmascarado por CSS que usamos para evitar el
  // parpadeo de Android (ver más abajo); ahí volvemos a type="password" en
  // vez de arriesgarnos a mostrar el PIN en texto plano sin ocultar.
  const [soportaMascaraCss, setSoportaMascaraCss] = useState(true);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const router = useRouter();
  // Guarda el temporizador de respaldo de irADestino(); si la navegación
  // ocurre a tiempo este componente se desmonta y el cleanup lo cancela.
  const respaldoNavegacionRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (respaldoNavegacionRef.current) clearTimeout(respaldoNavegacionRef.current);
    };
  }, []);

  useEffect(() => {
    const soportado =
      typeof CSS !== "undefined" &&
      typeof CSS.supports === "function" &&
      (CSS.supports("-webkit-text-security", "disc") || CSS.supports("text-security", "disc"));
    // No puede resolverse en el initializer de useState: el servidor no
    // tiene CSS.supports, así que arrancar ya con el valor real (distinto
    // entre servidor y cliente) rompería la hidratación. Por eso arranca
    // en "true" (el default) y se corrige acá recién después de montar.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSoportaMascaraCss(soportado);
  }, []);

  useEffect(() => {
    if (error && !loading) {
      inputsRef.current[0]?.focus();
    }
  }, [error, loading]);

  useEffect(() => {
    // Import diferido: el código de WebAuthn (~16KB) no viaja con el
    // bundle inicial del login, se pide en paralelo sin bloquear las
    // cajitas del PIN, que deben quedar usables de inmediato.
    (async () => {
      try {
        const { browserSupportsWebAuthn, platformAuthenticatorIsAvailable } = await import("@simplewebauthn/browser");
        const disponible = browserSupportsWebAuthn() && (await platformAuthenticatorIsAvailable());
        setBiometriaDisponible(disponible);
      } catch {
        setBiometriaDisponible(false);
      }
    })();
  }, []);

  const irADestino = (rol: string) => {
    // Dejamos "loading" en true a propósito — la pantalla se queda mostrando
    // el overlay de carga hasta que router.push() navegue de verdad,
    // evitando el "parpadeo" de volver al formulario justo antes de cambiar.
    // El mensaje cambia acá: seguir diciendo "Verificando tu PIN..." una vez
    // que YA se verificó (y solo falta que cargue la siguiente pantalla) se
    // siente como que la carga se quedó pegada.
    setMensajeCarga("¡Listo! Entrando...");
    setEntrando(true);
    const destino = DESTINO_POR_ROL[rol] ?? "/";
    // Red de seguridad: si la navegación de Next se queda colgada (caché
    // del router de una sesión anterior, etc.) forzamos una recarga dura.
    // Si router.push() sí funciona, este componente se desmonta y el
    // cleanup del useEffect de arriba cancela este temporizador.
    respaldoNavegacionRef.current = setTimeout(() => {
      window.location.href = destino;
    }, 2500);
    router.push(destino);
  };

  const enviarPin = async (pinCompleto: string, intento = 0) => {
    // Un solo mensaje durante todo el proceso, incluidos los reintentos
    // silenciosos: mostrar "Reintentando..." le hacía pensar al usuario
    // que algo había fallado, cuando en realidad es solo el servidor o la
    // señal demorándose un poco (ver TIEMPO_LIMITE_MS más arriba).
    setMensajeCarga("Verificando tu PIN...");
    setLoading(true);
    setError("");

    let res: Response;
    try {
      res = await fetchConLimite("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: pinCompleto }),
      });
    } catch {
      // Se agotó el límite de tiempo o falló la red: reintentamos en
      // silencio antes de culpar a la conexión — con señal débil o un
      // servidor recién despertando, el primer intento fallando es normal.
      if (intento < REINTENTOS_MAXIMOS) {
        enviarPin(pinCompleto, intento + 1);
        return;
      }
      setError(
        sinConexionDetectada()
          ? "No hay conexión a internet. Revisa tu señal e intenta de nuevo."
          : "La conexión está lenta. Intenta de nuevo."
      );
      setDigitos(["", "", "", "", "", ""]);
      setLoading(false);
      return;
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "PIN incorrecto");
      setDigitos(["", "", "", "", "", ""]);
      setLoading(false);
      return;
    }

    const { rol } = await res.json();
    irADestino(rol);
  };

  const entrarConBiometria = async () => {
    setMensajeCarga("Verificando tu identidad...");
    setLoading(true);
    setError("");
    try {
      const [{ startAuthentication }, optsRes] = await Promise.all([
        import("@simplewebauthn/browser"),
        fetchConLimite("/api/auth/webauthn/login-opciones", { method: "POST" }),
      ]);
      if (!optsRes.ok) throw new Error("No se pudo iniciar la verificación");
      const opciones = await optsRes.json();

      const respuesta = await startAuthentication({ optionsJSON: opciones });

      const verRes = await fetchConLimite("/api/auth/webauthn/login-verificar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(respuesta),
      });

      if (!verRes.ok) {
        const data = await verRes.json().catch(() => ({}));
        throw new Error(data.error ?? "No se pudo verificar tu identidad");
      }

      const { rol } = await verRes.json();
      irADestino(rol);
    } catch (e) {
      const errorInfo = e as { name?: string; message?: string };
      if (errorInfo?.name === "AbortError") {
        setError(
          sinConexionDetectada()
            ? "No hay conexión a internet. Revisa tu señal e intenta de nuevo."
            : "La conexión está lenta. Intenta de nuevo."
        );
      } else if (errorInfo?.name !== "NotAllowedError") {
        setError(errorInfo?.message || "No se pudo verificar tu identidad");
      }
      setLoading(false);
    }
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

  const handlePaste = (index: number, e: React.ClipboardEvent<HTMLInputElement>) => {
    // maxLength={1} hace que el navegador trunque un pegado normal a un
    // solo carácter antes de disparar onChange, por eso lo interceptamos
    // acá y repartimos los dígitos pegados entre las cajitas restantes.
    const soloNumeros = e.clipboardData.getData("text").replace(/[^0-9]/g, "");
    if (!soloNumeros) return;
    e.preventDefault();

    const nuevosDigitos = [...digitos];
    let cursor = index;
    for (const caracter of soloNumeros) {
      if (cursor > 5) break;
      nuevosDigitos[cursor] = caracter;
      cursor++;
    }
    setDigitos(nuevosDigitos);

    const siguienteVacio = nuevosDigitos.findIndex((d) => d === "");
    inputsRef.current[siguienteVacio === -1 ? 5 : siguienteVacio]?.focus();

    if (nuevosDigitos.every((d) => d !== "")) {
      enviarPin(nuevosDigitos.join(""));
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-neutral-100 dark:bg-black px-4 relative text-neutral-900 dark:text-white">
      <div className="absolute top-4 right-4">
        <BotonTema />
      </div>
      <div className={`w-full max-w-md transition-opacity ${loading ? "opacity-40 pointer-events-none" : ""}`}>
        <div className="border-x border-b border-x-neutral-200 border-b-neutral-200 dark:border-x-neutral-800 dark:border-b-neutral-800 border-t-4 border-t-orange-500 rounded-3xl shadow-xl shadow-neutral-300/50 dark:shadow-black/50 bg-white dark:bg-neutral-950 p-5 sm:p-8">
        <div className="text-center mb-8">
          {/* <img>, no <Image>: /logo.png tiene su propio Cache-Control
              largo en next.config.ts para esa ruta exacta — el optimizador
              de next/image la serviría por /_next/image, sin ese header. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt={APP_NOMBRE}
            // Es la imagen LCP de esta pantalla (la más grande del primer
            // pantallazo) — sin esto, el navegador no sabe priorizarla
            // sobre el resto de los recursos hasta que termina de
            // parsear el HTML que sigue.
            fetchPriority="high"
            className="w-[100px] h-[100px] mx-auto mb-2 object-contain drop-shadow-[0_12px_20px_rgba(0,0,0,0.18)] dark:drop-shadow-[0_0_20px_rgba(249,115,22,0.35)]"
          />
          <h1 className="text-2xl font-bold">{APP_NOMBRE}</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">Ingresa tu PIN de 6 dígitos</p>
        </div>

        <div className="flex justify-center gap-1.5 sm:gap-3">
          {digitos.map((digito, index) => (
            <input
              key={index}
              ref={(el) => {
                inputsRef.current[index] = el;
              }}
              type={soportaMascaraCss ? "text" : "password"}
              inputMode="numeric"
              autoComplete="off"
              maxLength={1}
              value={digito}
              disabled={loading}
              aria-label={`Dígito ${index + 1} del PIN`}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={(e) => handlePaste(index, e)}
              // En vez de type="password": en Android el navegador muestra el
              // dígito recién tecleado en claro y lo oculta recién ~1s después
              // (animación nativa, no configurable). Enmascarando con CSS el
              // dígito se ve oculto al instante, sin ese parpadeo.
              style={soportaMascaraCss ? ({ WebkitTextSecurity: "disc", textSecurity: "disc" } as React.CSSProperties) : undefined}
              className="w-9 h-11 sm:w-14 sm:h-16 text-center text-lg sm:text-2xl font-bold rounded-xl
                        bg-white border-2 border-neutral-300 text-neutral-900
                        dark:bg-neutral-900 dark:border-neutral-700 dark:text-white
                        focus:border-orange-500 focus:shadow-[0_0_20px_rgba(249,115,22,0.5)]
                        outline-none transition disabled:opacity-40"
            />
          ))}
        </div>

        {error && <p className="text-sm text-red-500 text-center mt-4">{error}</p>}

        {biometriaDisponible && (
          <button
            type="button"
            onClick={entrarConBiometria}
            disabled={loading}
            className="mt-6 w-full flex items-center justify-center gap-2 text-sm font-medium text-neutral-600 border border-neutral-300 hover:bg-neutral-100 hover:border-neutral-400 dark:text-neutral-300 dark:border-neutral-700 dark:hover:bg-neutral-900 dark:hover:border-neutral-600 rounded-xl py-3 transition disabled:opacity-40"
          >
            <IconoHuella className="w-4 h-4" />
            Usar acceso biométrico
          </button>
        )}
        </div>
      </div>

      {/* Overlay de carga: cubre toda la pantalla mientras se verifica,
          para que sea imposible confundirlo con que "no está pasando nada".
          Aparece con un fade corto (en vez de aparecer de golpe) y, una vez
          confirmado el PIN, cambia a un check verde — así la última imagen
          antes de cambiar de pantalla es "listo", no el mismo spinner
          dando vueltas, que se sentía como una pantalla trabada. */}
      <div
        className={`absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/50 dark:bg-black/40 transition-opacity duration-200 ${
          loading ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        {entrando ? (
          <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-500/15 text-green-600 dark:text-green-400 flex items-center justify-center">
            <IconoCheck className="w-5 h-5" />
          </div>
        ) : (
          <Spinner className="w-10 h-10 text-orange-500" />
        )}
        <p className={`text-sm font-medium ${entrando ? "text-green-600 dark:text-green-400" : "text-orange-600 dark:text-orange-400"}`}>
          {mensajeCarga}
        </p>
      </div>
    </main>
  );
}
