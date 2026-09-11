// components/PanelUsuariosAdmin.tsx
// CRUD de Usuarios administrativos (TH, Coordinador, Nómina, Super Admin):
// crear, editar, y "Gestionar" (Desactivar/Reactivar + Eliminar, bloqueado
// si tiene historial de aprobaciones o pagos). Para los de TH y
// Coordinador, además se gestionan sus asignaciones de Empresa/Sitio/Área
// en un modal aparte.

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ComboboxBuscable from "./ComboboxBuscable";
import Modal from "./Modal";
import Spinner from "./Spinner";
import { IconoCopiar } from "./Icons";
import { useToast } from "./Toast";
import { ETIQUETAS_ROL } from "../lib/roles";

type Asignacion = { id: string; etiqueta: string };
type Usuario = { id: string; numero: number; nombre: string; rol: string; activo: boolean; asignaciones: Asignacion[] };
type Area = { id: string; nombre: string };
type Sitio = { id: string; nombre: string; areas: Area[] };
type Empresa = { id: string; nombre: string; sitios: Sitio[] };

// Roles cuyo alcance se restringe por Empresa/Sitio/Área (comparten el
// mismo mecanismo de AsignacionTH, ver lib/alcanceTH.ts).
const ROLES_CON_ALCANCE = ["ADMIN_TH", "COORDINADOR"];

export default function PanelUsuariosAdmin({
  usuarios,
  empresas,
}: {
  usuarios: Usuario[];
  empresas: Empresa[];
}) {
  const router = useRouter();
  const toast = useToast();

  const [modalAbierto, setModalAbierto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [nombre, setNombre] = useState("");
  const [pin, setPin] = useState("");
  const [generandoPin, setGenerandoPin] = useState(false);
  const [pinCopiado, setPinCopiado] = useState(false);
  const [reseteandoPin, setReseteandoPin] = useState(false);
  const [rol, setRol] = useState("ADMIN_TH");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const [idAreas, setIdAreas] = useState<string | null>(null);

  const generarPin = async () => {
    setGenerandoPin(true);
    setPinCopiado(false);
    try {
      const res = await fetch("/api/auth/generar-pin", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setPin(data.pin);
      } else {
        toast.error("No se pudo generar un PIN, intenta de nuevo");
      }
    } catch {
      toast.error("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setGenerandoPin(false);
    }
  };

  const copiarPin = async () => {
    try {
      await navigator.clipboard.writeText(pin);
      setPinCopiado(true);
      setTimeout(() => setPinCopiado(false), 2000);
    } catch {
      toast.error("No se pudo copiar, cópialo manualmente");
    }
  };

  const abrirCrear = () => {
    setEditandoId(null);
    setNombre("");
    setPin("");
    setRol("ADMIN_TH");
    setError("");
    setModalAbierto(true);
    generarPin();
  };

  const abrirEditar = (u: Usuario) => {
    setEditandoId(u.id);
    setNombre(u.nombre);
    setPin("");
    setReseteandoPin(false);
    setError("");
    setModalAbierto(true);
  };

  const guardar = async () => {
    if (!nombre.trim()) {
      setError("El nombre es obligatorio");
      return;
    }
    if ((!editandoId || reseteandoPin) && !/^\d{6}$/.test(pin)) {
      setError("El PIN debe tener exactamente 6 dígitos");
      return;
    }

    setGuardando(true);
    setError("");

    const url = editandoId ? `/api/admin/usuarios/${editandoId}` : "/api/admin/usuarios";
    const method = editandoId ? "PATCH" : "POST";
    const body = editandoId ? { nombre, ...(reseteandoPin ? { pin } : {}) } : { nombre, pin, rol };

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "No se pudo guardar");
        toast.error(data.error ?? "No se pudo guardar el usuario");
        return;
      }
      setModalAbierto(false);
      toast.exito(
        editandoId ? (reseteandoPin ? "Usuario actualizado y PIN reseteado" : "Usuario actualizado") : "Usuario creado"
      );
      router.refresh();
    } catch {
      setError("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
      toast.error("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setGuardando(false);
    }
  };

  // ---------- Modal Gestionar (Desactivar/Reactivar + Eliminar) ----------
  const [gestionando, setGestionando] = useState<Usuario | null>(null);
  const [procesando, setProcesando] = useState(false);
  const [errorGestion, setErrorGestion] = useState("");

  const cambiarEstado = async (nuevoActivo: boolean) => {
    if (!gestionando) return;
    setProcesando(true);
    setErrorGestion("");
    try {
      const res = await fetch(`/api/admin/usuarios/${gestionando.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activo: nuevoActivo }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErrorGestion(data.error ?? "No se pudo actualizar");
        toast.error(data.error ?? "No se pudo actualizar el usuario");
        return;
      }
      toast.exito(nuevoActivo ? "Usuario reactivado" : "Usuario desactivado");
      setGestionando(null);
      router.refresh();
    } catch {
      setErrorGestion("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
      toast.error("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setProcesando(false);
    }
  };

  const eliminarUsuario = async () => {
    if (!gestionando) return;
    setProcesando(true);
    setErrorGestion("");
    try {
      const res = await fetch(`/api/admin/usuarios/${gestionando.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErrorGestion(data.error ?? "No se pudo eliminar");
        toast.error(data.error ?? "No se pudo eliminar el usuario");
        return;
      }
      toast.exito("Usuario eliminado");
      setGestionando(null);
      router.refresh();
    } catch {
      setErrorGestion("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
      toast.error("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setProcesando(false);
    }
  };

  const usuarioAreas = usuarios.find((u) => u.id === idAreas);

  return (
    <div className="flex-1 px-4 sm:px-8 py-5 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-lg sm:text-xl font-bold">Usuarios</h1>
        <button
          onClick={abrirCrear}
          className="text-xs sm:text-sm font-semibold bg-orange-500 hover:bg-orange-600 text-black px-3 py-2 rounded-lg transition shadow-sm hover:shadow-md"
        >
          + Nuevo usuario
        </button>
      </div>
      <p className="text-xs text-orange-400 font-medium">
        Talento Humano, Coordinadores, Nómina, Jefes y Super Administradores
      </p>

      <div className="bg-neutral-50 text-neutral-800 rounded-2xl overflow-hidden shadow-sm ring-1 ring-black/5">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="bg-neutral-100/70 text-neutral-500 text-left">
              <tr>
                <th className="px-4 py-3 font-medium w-12">N°</th>
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 font-medium">Rol</th>
                <th className="px-4 py-3 font-medium">Áreas asignadas</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id} className="border-t border-neutral-200/70 hover:bg-neutral-100/60 transition">
                  <td className="px-4 py-3 text-neutral-400">{u.numero}</td>
                  <td className="px-4 py-3">{u.nombre}</td>
                  <td className="px-4 py-3 text-neutral-600">{ETIQUETAS_ROL[u.rol] ?? u.rol}</td>
                  <td className="px-4 py-3 text-neutral-500">
                    {ROLES_CON_ALCANCE.includes(u.rol) ? `${u.asignaciones.length} asignada(s)` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                        u.activo ? "bg-green-100 text-green-800" : "bg-neutral-200 text-neutral-600"
                      }`}
                    >
                      {u.activo ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => abrirEditar(u)}
                        className="text-xs font-medium text-white bg-neutral-700 hover:bg-neutral-800 px-3 py-1.5 rounded-full transition"
                      >
                        Editar
                      </button>
                      {ROLES_CON_ALCANCE.includes(u.rol) && (
                        <button
                          onClick={() => setIdAreas(u.id)}
                          className="text-xs font-medium text-white bg-orange-500 hover:bg-orange-600 px-3 py-1.5 rounded-full transition"
                        >
                          Áreas
                        </button>
                      )}
                      <button
                        onClick={() => { setGestionando(u); setErrorGestion(""); }}
                        className="text-xs font-medium text-white bg-red-500 hover:bg-red-600 px-3 py-1.5 rounded-full transition"
                      >
                        Gestionar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {usuarios.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-neutral-400">
                    Aún no hay usuarios administrativos creados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Crear/Editar usuario */}
      <Modal
        abierto={modalAbierto}
        className="bg-white text-black rounded-t-3xl sm:rounded-3xl w-full sm:max-w-sm p-7 space-y-4 shadow-2xl"
      >
            <h2 className="text-lg font-bold text-neutral-900">
              {editandoId ? "Editar usuario" : "Nuevo usuario"}
            </h2>

            {!editandoId && (
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  PIN de acceso
                </label>
                <div className="mt-1.5 flex gap-1.5">
                  <input
                    value={generandoPin ? "" : pin}
                    readOnly
                    placeholder={generandoPin ? "Generando..." : "······"}
                    className="flex-1 min-w-0 rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-3 text-lg font-bold tracking-[0.4em] text-neutral-900 outline-none"
                  />
                  <button
                    type="button"
                    onClick={copiarPin}
                    disabled={!pin || generandoPin}
                    title="Copiar PIN"
                    className="shrink-0 w-11 flex items-center justify-center rounded-xl border border-neutral-200 text-neutral-600 hover:bg-neutral-100 transition disabled:opacity-40"
                  >
                    {pinCopiado ? "✓" : <IconoCopiar className="w-4 h-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={generarPin}
                    disabled={generandoPin}
                    title="Generar otro PIN"
                    className="shrink-0 w-11 flex items-center justify-center rounded-xl border border-neutral-200 text-neutral-600 hover:bg-neutral-100 transition disabled:opacity-40"
                  >
                    ↻
                  </button>
                </div>
                <p className="text-xs text-neutral-400 mt-1">Copialo y comunícaselo al usuario para su primer ingreso</p>
              </div>
            )}

            {editandoId && !reseteandoPin && (
              <button
                type="button"
                onClick={() => { setReseteandoPin(true); generarPin(); }}
                className="text-xs font-semibold text-orange-600 hover:text-orange-700 transition"
              >
                Resetear PIN de acceso
              </button>
            )}

            {editandoId && reseteandoPin && (
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    Nuevo PIN de acceso
                  </label>
                  <button
                    type="button"
                    onClick={() => { setReseteandoPin(false); setPin(""); }}
                    className="text-xs text-neutral-400 hover:text-neutral-600 transition"
                  >
                    Cancelar
                  </button>
                </div>
                <div className="mt-1.5 flex gap-1.5">
                  <input
                    value={generandoPin ? "" : pin}
                    readOnly
                    placeholder={generandoPin ? "Generando..." : "······"}
                    className="flex-1 min-w-0 rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-3 text-lg font-bold tracking-[0.4em] text-neutral-900 outline-none"
                  />
                  <button
                    type="button"
                    onClick={copiarPin}
                    disabled={!pin || generandoPin}
                    title="Copiar PIN"
                    className="shrink-0 w-11 flex items-center justify-center rounded-xl border border-neutral-200 text-neutral-600 hover:bg-neutral-100 transition disabled:opacity-40"
                  >
                    {pinCopiado ? "✓" : <IconoCopiar className="w-4 h-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={generarPin}
                    disabled={generandoPin}
                    title="Generar otro PIN"
                    className="shrink-0 w-11 flex items-center justify-center rounded-xl border border-neutral-200 text-neutral-600 hover:bg-neutral-100 transition disabled:opacity-40"
                  >
                    ↻
                  </button>
                </div>
                <p className="text-xs text-amber-600 mt-1">
                  El PIN anterior deja de funcionar en cuanto guardes. Copialo y comunícaselo al usuario.
                </p>
              </div>
            )}

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Nombre</label>
              <input
                value={nombre}
                onChange={(e) => setNombre(e.target.value.toUpperCase())}
                className="mt-1.5 w-full rounded-xl border border-neutral-200 px-3.5 py-3 text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-500/15 outline-none"
                placeholder="Ej: ANA RODRÍGUEZ"
              />
            </div>

            {!editandoId && (
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Rol</label>
                  <div className="mt-1.5 flex bg-neutral-100 rounded-xl p-1 gap-1">
                    {[
                      { value: "ADMIN_TH", label: "TH" },
                      { value: "COORDINADOR", label: "Coordinador" },
                      { value: "NOMINA", label: "Nómina" },
                      { value: "JEFE", label: "Jefe" },
                      { value: "SUPER_ADMIN", label: "Super Admin" },
                    ].map((op) => (
                      <button
                        key={op.value}
                        type="button"
                        onClick={() => setRol(op.value)}
                        className={`flex-1 text-xs font-semibold py-2 rounded-lg transition ${
                          rol === op.value ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-700"
                        }`}
                      >
                        {op.label}
                      </button>
                    ))}
                  </div>
                </div>
            )}

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex gap-2 justify-end pt-1">
              <button
                onClick={() => setModalAbierto(false)}
                className="px-4 py-2.5 text-sm font-medium text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 rounded-xl transition"
              >
                Cancelar
              </button>
              <button
                onClick={guardar}
                disabled={guardando}
                className="px-5 py-2.5 text-sm font-semibold bg-orange-500 hover:bg-orange-600 text-white rounded-xl disabled:opacity-50 transition flex items-center justify-center gap-2"
              >
                {guardando && <Spinner className="w-4 h-4" />}
                {guardando ? "Guardando..." : "Guardar"}
              </button>
            </div>
      </Modal>

      {/* Modal: Gestionar (Desactivar/Reactivar + Eliminar) */}
      <Modal abierto={!!gestionando} variante="centro" className="bg-white text-black rounded-3xl p-7 w-full max-w-sm space-y-4 shadow-2xl">
            <div>
              <h2 className="font-semibold text-neutral-900">{gestionando?.nombre}</h2>
              <p className="text-xs text-neutral-500 mt-0.5">{ETIQUETAS_ROL[gestionando?.rol ?? ""] ?? gestionando?.rol}</p>
            </div>

            {errorGestion && <p className="text-sm text-red-600">{errorGestion}</p>}

            <div className="space-y-2">
              {gestionando?.activo ? (
                <button
                  onClick={() => cambiarEstado(false)}
                  disabled={procesando}
                  className="w-full text-left px-4 py-3 rounded-xl border border-neutral-200 hover:bg-neutral-50 transition disabled:opacity-50"
                >
                  <p className="text-sm font-medium text-neutral-800">Desactivar</p>
                  <p className="text-xs text-neutral-500">No podrá iniciar sesión, pero conserva su historial. Se puede reactivar luego.</p>
                </button>
              ) : (
                <button
                  onClick={() => cambiarEstado(true)}
                  disabled={procesando}
                  className="w-full text-left px-4 py-3 rounded-xl border border-neutral-200 hover:bg-neutral-50 transition disabled:opacity-50"
                >
                  <p className="text-sm font-medium text-neutral-800">Reactivar</p>
                  <p className="text-xs text-neutral-500">Vuelve a poder iniciar sesión normalmente.</p>
                </button>
              )}

              <button
                onClick={eliminarUsuario}
                disabled={procesando}
                className="w-full text-left px-4 py-3 rounded-xl border border-red-200 hover:bg-red-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <p className="text-sm font-medium text-red-600">Eliminar definitivamente</p>
                <p className="text-xs text-neutral-500">
                  Solo funciona si nunca aprobó ni pagó nada. Si tiene historial, esta opción se bloqueará automáticamente.
                </p>
              </button>
            </div>

            <button
              onClick={() => setGestionando(null)}
              disabled={procesando}
              className="w-full text-center text-sm font-medium text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 rounded-xl py-2.5 transition"
            >
              Cancelar
            </button>
      </Modal>

      {/* Modal: Gestionar áreas asignadas (solo TH) */}
      <ModalAreasTH abierto={!!idAreas} usuario={usuarioAreas ?? null} empresas={empresas} onCerrar={() => setIdAreas(null)} />
    </div>
  );
}

function ModalAreasTH({
  abierto,
  usuario,
  empresas,
  onCerrar,
}: {
  abierto: boolean;
  usuario: Usuario | null;
  empresas: Empresa[];
  onCerrar: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const [empresaId, setEmpresaId] = useState("");
  const [sitioId, setSitioId] = useState("");
  const [areaId, setAreaId] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [idAQuitar, setIdAQuitar] = useState<string | null>(null);
  const [quitando, setQuitando] = useState(false);

  const empresa = empresas.find((e) => e.id === empresaId);
  const sitios = empresa?.sitios ?? [];
  const sitio = sitios.find((s) => s.id === sitioId);
  const areas = sitio?.areas ?? [];

  const agregar = async () => {
    if (!usuario || !empresaId) {
      setError("Selecciona al menos la empresa");
      return;
    }
    setGuardando(true);
    setError("");
    try {
      const res = await fetch("/api/admin/asignaciones-th", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuarioId: usuario.id, empresaId, sitioId: sitioId || null, areaId: areaId || null }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "No se pudo guardar");
        toast.error(data.error ?? "No se pudo agregar la asignación");
        return;
      }
      toast.exito("Asignación agregada");
      setEmpresaId("");
      setSitioId("");
      setAreaId("");
      router.refresh();
    } catch {
      setError("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
      toast.error("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setGuardando(false);
    }
  };

  const quitar = async () => {
    if (!idAQuitar) return;
    setQuitando(true);
    try {
      const res = await fetch(`/api/admin/asignaciones-th/${idAQuitar}`, { method: "DELETE" });
      setIdAQuitar(null);
      if (res.ok) {
        toast.exito("Asignación quitada");
        router.refresh();
      } else {
        toast.error("No se pudo quitar la asignación");
      }
    } catch {
      setIdAQuitar(null);
      toast.error("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setQuitando(false);
    }
  };

  return (
    <Modal
      abierto={abierto}
      className="bg-white text-black rounded-t-3xl sm:rounded-3xl w-full sm:max-w-lg p-7 space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl"
    >
        <h2 className="text-lg font-bold text-neutral-900">Áreas de {usuario?.nombre}</h2>

        <div className="flex flex-wrap gap-2">
          {(usuario?.asignaciones ?? []).map((a) => (
            <span
              key={a.id}
              className="inline-flex items-center gap-1.5 bg-neutral-50 border border-neutral-200 text-xs px-3 py-1.5 rounded-full"
            >
              {a.etiqueta}
              <button onClick={() => setIdAQuitar(a.id)} className="text-neutral-400 hover:text-red-500 transition">
                ×
              </button>
            </span>
          ))}
          {usuario && usuario.asignaciones.length === 0 && (
            <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-full">
              Sin áreas asignadas
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <ComboboxBuscable
            opciones={empresas.map((e) => ({ id: e.id, label: e.nombre }))}
            value={empresaId}
            onChange={(v) => { setEmpresaId(v); setSitioId(""); setAreaId(""); }}
            placeholder="Empresa"
          />
          <ComboboxBuscable
            opciones={sitios.map((s) => ({ id: s.id, label: s.nombre }))}
            value={sitioId}
            onChange={(v) => { setSitioId(v); setAreaId(""); }}
            placeholder={empresaId ? "Sitio (opcional)" : "Primero elige empresa"}
          />
          <ComboboxBuscable
            opciones={areas.map((a) => ({ id: a.id, label: a.nombre }))}
            value={areaId}
            onChange={setAreaId}
            placeholder={sitioId ? "Área (opcional)" : "Primero elige sitio"}
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          onClick={agregar}
          disabled={guardando || !empresaId}
          className="text-xs sm:text-sm font-semibold bg-orange-500 hover:bg-orange-600 text-black px-4 py-2 rounded-lg transition disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {guardando && <Spinner className="w-4 h-4" />}
          {guardando ? "Agregando..." : "+ Agregar asignación"}
        </button>

        <button
          onClick={onCerrar}
          className="w-full text-center text-sm font-medium text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 rounded-xl py-2.5 transition"
        >
          Cerrar
        </button>

        <Modal abierto={!!idAQuitar} variante="centro" className="bg-white text-black rounded-3xl p-7 w-full max-w-xs text-center space-y-4 shadow-2xl">
              <p className="font-semibold text-neutral-900">¿Quitar esta asignación?</p>
              <div className="flex gap-2 justify-center pt-1">
                <button
                  onClick={() => setIdAQuitar(null)}
                  disabled={quitando}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-neutral-600 border border-neutral-200 rounded-xl hover:bg-neutral-100 transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={quitar}
                  disabled={quitando}
                  className="flex-1 px-4 py-2.5 text-sm font-semibold bg-red-500 hover:bg-red-600 text-white rounded-xl disabled:opacity-50 transition"
                >
                  {quitando ? "Quitando..." : "Quitar"}
                </button>
              </div>
        </Modal>
    </Modal>
  );
}