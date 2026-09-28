// components/PanelUsuariosAdmin.tsx
// CRUD de Usuarios administrativos (TH, Coordinador, Nómina, Super Admin):
// crear, editar, y "Gestionar" (Desactivar/Reactivar + Eliminar, bloqueado
// si tiene historial de aprobaciones o pagos). Para los de TH y
// Coordinador, además se gestionan sus asignaciones de Empresa/Sitio/Área
// en un modal aparte. Con buscador, filtros de Estado (Activos por
// defecto, igual que Colaboradores) y Rol, y paginación.

"use client";

import { useState, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import ComboboxBuscable from "./ComboboxBuscable";
import Modal from "./Modal";
import Spinner from "./Spinner";
import { IconoCopiar, IconoAlerta, IconoCheck, IconoRefrescar, IconoLupa, IconoChevron } from "./Icons";
import { useToast } from "./Toast";
import { ETIQUETAS_ROL } from "../lib/roles";
import MenuAcciones from "./MenuAcciones";
import { useAccionesHeader } from "../lib/accionesHeader";
import BuscadorFichaColaborador, { type Ficha } from "./BuscadorFichaColaborador";
import BarraFiltros, { CampoEstadoActivo, CampoFiltro, chipEstadoActivo, chipOpcion, chips, cumpleFiltroActivo, type FiltroActivo } from "./BarraFiltros";
import Paginacion from "./Paginacion";

type Asignacion = { id: string; etiqueta: string; empresaId: string | null; sitioId: string | null; areaId: string | null };
type Usuario = { id: string; numero: number; nombre: string; rol: string; activo: boolean; fichaPropia: Ficha | null; asignaciones: Asignacion[] };
type Area = { id: string; nombre: string };
type Sitio = { id: string; nombre: string; areas: Area[] };
type Empresa = { id: string; nombre: string; sitios: Sitio[] };

// Roles cuyo alcance se restringe por Empresa/Sitio/Área (comparten el
// mismo mecanismo de AsignacionTH, ver lib/alcanceTH.ts).
const ROLES_CON_ALCANCE = ["ADMIN_TH", "COORDINADOR"];

const POR_PAGINA = 15;

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
  const [confirmandoResetPin, setConfirmandoResetPin] = useState(false);
  const [rol, setRol] = useState("ADMIN_TH");
  // Ficha de colaborador propia (si este usuario también viaja): distingue
  // SUS solicitudes de las que registra para otros.
  const [fichaPropia, setFichaPropia] = useState<Ficha | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const [idAreas, setIdAreas] = useState<string | null>(null);

  // Evita que una respuesta fuera de orden (Resetear -> Cancelar ->
  // Resetear de nuevo, muy seguido) termine mostrando un PIN de una
  // petición vieja como si fuera el actual.
  const peticionPinRef = useRef(0);

  const generarPin = async () => {
    const idPeticion = ++peticionPinRef.current;
    setGenerandoPin(true);
    setPinCopiado(false);
    try {
      const res = await fetch("/api/auth/generar-pin", { method: "POST" });
      if (idPeticion !== peticionPinRef.current) return;
      if (res.ok) {
        const data = await res.json();
        setPin(data.pin);
      } else {
        toast.error("No se pudo generar un PIN, intenta de nuevo");
      }
    } catch {
      if (idPeticion === peticionPinRef.current) {
        toast.error("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
      }
    } finally {
      if (idPeticion === peticionPinRef.current) setGenerandoPin(false);
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
    setConfirmandoResetPin(false);
    setRol(u.rol);
    setFichaPropia(u.fichaPropia);
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
    const body = editandoId
      ? { nombre, rol, colaboradorPropioId: fichaPropia?.id ?? null, ...(reseteandoPin ? { pin } : {}) }
      : { nombre, pin, rol };

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
  const [confirmandoEliminar, setConfirmandoEliminar] = useState(false);

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
      setConfirmandoEliminar(false);
      router.refresh();
    } catch {
      setErrorGestion("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
      toast.error("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setProcesando(false);
    }
  };

  const usuarioAreas = usuarios.find((u) => u.id === idAreas);

  // ---------- Búsqueda, filtros y paginación ----------
  const [busqueda, setBusqueda] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState<FiltroActivo>("ACTIVO");
  const [rolFiltro, setRolFiltro] = useState("");
  const [paginaActual, setPaginaActual] = useState(1);

  // Solo los roles que de verdad hay en la lista, para no ofrecer filtros vacíos.
  const opcionesRol = useMemo(
    () =>
      Array.from(new Set(usuarios.map((u) => u.rol))).map((r) => ({ id: r, label: ETIQUETAS_ROL[r] ?? r })),
    [usuarios]
  );

  const usuariosFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return usuarios.filter((u) => {
      if (!cumpleFiltroActivo(estadoFiltro, u.activo)) return false;
      if (rolFiltro && u.rol !== rolFiltro) return false;
      if (!texto) return true;
      return (
        u.nombre.toLowerCase().includes(texto) ||
        (ETIQUETAS_ROL[u.rol] ?? u.rol).toLowerCase().includes(texto) ||
        String(u.numero) === texto
      );
    });
  }, [usuarios, busqueda, estadoFiltro, rolFiltro]);

  const totalPaginas = Math.max(1, Math.ceil(usuariosFiltrados.length / POR_PAGINA));
  // Si un cambio (desactivar, eliminar) deja la página actual vacía, se
  // muestra la última que sí tiene filas en vez de una tabla en blanco.
  const pagina = Math.min(paginaActual, totalPaginas);
  const usuariosPagina = usuariosFiltrados.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

  const cambiarBusqueda = (v: string) => { setBusqueda(v); setPaginaActual(1); };
  const cambiarEstadoFiltro = (v: FiltroActivo) => { setEstadoFiltro(v); setPaginaActual(1); };
  const cambiarRolFiltro = (v: string) => { setRolFiltro(v); setPaginaActual(1); };

  useAccionesHeader(
    <button
      onClick={abrirCrear}
      className="text-xs sm:text-sm font-semibold bg-orange-500 hover:bg-orange-600 text-black px-3 py-2 rounded-lg transition shadow-sm hover:shadow-md"
    >
      + Nuevo usuario
    </button>
  );

  return (
    <div className="flex-1 px-4 sm:px-8 pb-5 space-y-4">
      <BarraFiltros
        busqueda={{ valor: busqueda, onCambiar: cambiarBusqueda, placeholder: "Buscar...", ayuda: "Busca por nombre, rol o número" }}
        chips={chips(
          chipEstadoActivo(estadoFiltro, () => cambiarEstadoFiltro("ACTIVO")),
          chipOpcion("Rol", opcionesRol, rolFiltro, () => cambiarRolFiltro(""))
        )}
        onLimpiar={() => { cambiarEstadoFiltro("ACTIVO"); cambiarRolFiltro(""); }}
        resultados={usuariosFiltrados.length}
      >
        <CampoEstadoActivo valor={estadoFiltro} onCambiar={cambiarEstadoFiltro} />
        <CampoFiltro etiqueta="Rol">
          <ComboboxBuscable opciones={opcionesRol} value={rolFiltro} onChange={cambiarRolFiltro} placeholder="Todos" />
        </CampoFiltro>
      </BarraFiltros>

      <div className="bg-neutral-50 dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 rounded-2xl overflow-hidden shadow-sm ring-1 ring-black/5 dark:ring-white/10">
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[640px]">
            <thead className="bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 text-left">
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
              {usuariosPagina.map((u) => (
                <tr key={u.id} className="border-t border-neutral-200/70 dark:border-neutral-800/70 hover:bg-neutral-100/60 dark:hover:bg-neutral-800/60 transition">
                  <td className="px-4 py-3 text-neutral-400 dark:text-neutral-500">{u.numero}</td>
                  <td className="px-4 py-3">{u.nombre}</td>
                  <td className="px-4 py-3 text-neutral-600 dark:text-neutral-300">{ETIQUETAS_ROL[u.rol] ?? u.rol}</td>
                  <td className="px-4 py-3 text-neutral-500 dark:text-neutral-400">
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
                  <td className="px-4 py-3 text-right">
                    <MenuAcciones
                      acciones={[
                        { label: "Editar", onClick: () => abrirEditar(u) },
                        ...(ROLES_CON_ALCANCE.includes(u.rol)
                          ? [{ label: "Áreas", onClick: () => setIdAreas(u.id) }]
                          : []),
                        {
                          label: "Gestionar",
                          tono: "peligro" as const,
                          onClick: () => { setGestionando(u); setErrorGestion(""); setConfirmandoEliminar(false); },
                        },
                      ]}
                    />
                  </td>
                </tr>
              ))}
              {usuariosFiltrados.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-neutral-400 dark:text-neutral-500">
                    {usuarios.length === 0 ? "Aún no hay usuarios administrativos creados" : "Ningún usuario coincide con la búsqueda o los filtros"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <Paginacion paginaActual={pagina} totalPaginas={totalPaginas} onCambiarPagina={setPaginaActual} />
      </div>

      {/* Modal: Crear/Editar usuario */}
      <Modal
        abierto={modalAbierto && !confirmandoResetPin}
        onCerrar={() => setModalAbierto(false)}
        onConfirmar={guardar}
        className="bg-white dark:bg-neutral-900 text-black dark:text-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-sm p-7 space-y-4 shadow-2xl"
      >
            <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
              {editandoId ? "Editar usuario" : "Nuevo usuario"}
            </h2>

            {!editandoId && (
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                  PIN de acceso
                </label>
                <div className="mt-1.5 flex gap-1.5">
                  <input
                    value={generandoPin ? "" : pin}
                    readOnly
                    placeholder={generandoPin ? "Generando..." : "······"}
                    className="flex-1 min-w-0 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-3.5 py-3 text-lg font-bold tracking-[0.4em] text-neutral-900 dark:text-white outline-none"
                  />
                  <button
                    type="button"
                    onClick={copiarPin}
                    disabled={!pin || generandoPin}
                    title="Copiar PIN"
                    className="shrink-0 w-11 flex items-center justify-center rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition disabled:opacity-40"
                  >
                    {pinCopiado ? <IconoCheck className="w-4 h-4" /> : <IconoCopiar className="w-4 h-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={generarPin}
                    disabled={generandoPin}
                    title="Generar otro PIN"
                    className="shrink-0 w-11 flex items-center justify-center rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition disabled:opacity-40"
                  >
                    <IconoRefrescar className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">Cópialo y comunícaselo al usuario para su primer ingreso</p>
              </div>
            )}

            {editandoId && !reseteandoPin && (
              <button
                type="button"
                onClick={() => setConfirmandoResetPin(true)}
                className="text-xs font-semibold text-orange-600 hover:text-orange-700 transition"
              >
                Resetear PIN de acceso
              </button>
            )}

            {editandoId && reseteandoPin && (
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                    Nuevo PIN de acceso
                  </label>
                  <button
                    type="button"
                    onClick={() => { setReseteandoPin(false); setPin(""); }}
                    className="text-xs text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 transition"
                  >
                    Cancelar
                  </button>
                </div>
                <div className="mt-1.5 flex gap-1.5">
                  <input
                    value={generandoPin ? "" : pin}
                    readOnly
                    placeholder={generandoPin ? "Generando..." : "······"}
                    className="flex-1 min-w-0 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-3.5 py-3 text-lg font-bold tracking-[0.4em] text-neutral-900 dark:text-white outline-none"
                  />
                  <button
                    type="button"
                    onClick={copiarPin}
                    disabled={!pin || generandoPin}
                    title="Copiar PIN"
                    className="shrink-0 w-11 flex items-center justify-center rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition disabled:opacity-40"
                  >
                    {pinCopiado ? <IconoCheck className="w-4 h-4" /> : <IconoCopiar className="w-4 h-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={generarPin}
                    disabled={generandoPin}
                    title="Generar otro PIN"
                    className="shrink-0 w-11 flex items-center justify-center rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition disabled:opacity-40"
                  >
                    <IconoRefrescar className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-amber-600 mt-1">
                  El PIN anterior deja de funcionar en cuanto guardes. Cópialo y comunícaselo al usuario.
                </p>
              </div>
            )}

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Nombre</label>
              <input
                value={nombre}
                onChange={(e) => setNombre(e.target.value.toUpperCase())}
                className="mt-1.5 w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white px-3.5 py-3 text-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-500/15 outline-none"
                placeholder="Ej: ANA RODRÍGUEZ"
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Rol</label>
              <div className="mt-1.5 flex flex-wrap bg-neutral-100 dark:bg-neutral-800 rounded-xl p-1 gap-1">
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
                    className={`flex-1 min-w-[80px] text-xs font-semibold py-2 rounded-lg transition ${
                      rol === op.value ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm" : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-200/70 dark:hover:bg-neutral-700"
                    }`}
                  >
                    {op.label}
                  </button>
                ))}
              </div>
              {editandoId && rol !== usuarios.find((u) => u.id === editandoId)?.rol && (
                <p className="text-xs text-amber-600 mt-1">
                  Vas a cambiar el rol de este usuario en cuanto guardes — eso cambia a qué pantallas tiene acceso.
                </p>
              )}
            </div>

            {editandoId && (
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                  Ficha de colaborador (opcional)
                </label>
                <div className="mt-1.5">
                  <BuscadorFichaColaborador valor={fichaPropia} onCambiar={setFichaPropia} />
                </div>
                <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
                  Si este usuario también viaja, su ficha de colaborador: así distingue sus propias solicitudes de las que registra para otros.
                </p>
              </div>
            )}

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex gap-2 justify-end pt-1">
              <button
                onClick={() => setModalAbierto(false)}
                className="px-4 py-2.5 text-sm font-medium text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition"
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

      {/* Modal: advertencia antes de resetear el PIN */}
      <Modal
        abierto={confirmandoResetPin}
        onCerrar={() => setConfirmandoResetPin(false)}
        onConfirmar={() => { setConfirmandoResetPin(false); setReseteandoPin(true); generarPin(); }}
        variante="centro"
        className="bg-white dark:bg-neutral-900 text-black dark:text-white rounded-3xl p-7 w-full max-w-xs text-center space-y-4 shadow-2xl"
      >
        <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto"><IconoAlerta className="w-6 h-6" /></div>
        <p className="font-semibold text-neutral-900 dark:text-white">¿Resetear el PIN de acceso?</p>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          El PIN actual dejará de funcionar en cuanto guardes los cambios. Vas a tener que comunicarle el nuevo PIN al usuario.
        </p>
        <div className="flex gap-2 justify-center pt-1">
          <button
            type="button"
            onClick={() => setConfirmandoResetPin(false)}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-neutral-600 dark:text-neutral-300 border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => { setConfirmandoResetPin(false); setReseteandoPin(true); generarPin(); }}
            className="flex-1 px-4 py-2.5 text-sm font-semibold bg-orange-500 hover:bg-orange-600 text-white rounded-xl transition"
          >
            Sí, resetear
          </button>
        </div>
      </Modal>

      {/* Modal: Gestionar (Desactivar/Reactivar + Eliminar) */}
      <Modal abierto={!!gestionando && !confirmandoEliminar} onCerrar={() => setGestionando(null)} variante="centro" className="bg-white dark:bg-neutral-900 text-black dark:text-white rounded-3xl p-7 w-full max-w-sm space-y-4 shadow-2xl">
            <div>
              <h2 className="font-semibold text-neutral-900 dark:text-white">{gestionando?.nombre}</h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{ETIQUETAS_ROL[gestionando?.rol ?? ""] ?? gestionando?.rol}</p>
            </div>

            {errorGestion && <p className="text-sm text-red-600">{errorGestion}</p>}

            <div className="space-y-2">
              {gestionando?.activo ? (
                <button
                  onClick={() => cambiarEstado(false)}
                  disabled={procesando}
                  className="w-full text-left px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition disabled:opacity-50"
                >
                  <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">Desactivar</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">No podrá iniciar sesión, pero conserva su historial. Se puede reactivar luego.</p>
                </button>
              ) : (
                <button
                  onClick={() => cambiarEstado(true)}
                  disabled={procesando}
                  className="w-full text-left px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition disabled:opacity-50"
                >
                  <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">Reactivar</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">Vuelve a poder iniciar sesión normalmente.</p>
                </button>
              )}

              <button
                onClick={() => setConfirmandoEliminar(true)}
                disabled={procesando}
                className="w-full text-left px-4 py-3 rounded-xl border border-red-200 hover:bg-red-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <p className="text-sm font-medium text-red-600">Eliminar definitivamente</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Solo funciona si nunca aprobó ni pagó nada. Si tiene historial, esta opción se bloqueará automáticamente.
                </p>
              </button>
            </div>

            <button
              onClick={() => setGestionando(null)}
              disabled={procesando}
              className="w-full text-center text-sm font-medium text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl py-2.5 transition"
            >
              Cancelar
            </button>
      </Modal>

      <Modal abierto={confirmandoEliminar} onCerrar={() => setConfirmandoEliminar(false)} onConfirmar={eliminarUsuario} variante="centro" className="bg-white dark:bg-neutral-900 text-black dark:text-white rounded-3xl p-7 w-full max-w-xs text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto"><IconoAlerta className="w-6 h-6" /></div>
            <p className="font-semibold text-neutral-900 dark:text-white">¿Eliminar a {gestionando?.nombre}?</p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Esta acción no se puede deshacer.</p>
            {errorGestion && <p className="text-sm text-red-600">{errorGestion}</p>}
            <div className="flex gap-2 justify-center pt-1">
              <button
                onClick={() => setConfirmandoEliminar(false)}
                disabled={procesando}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
              >
                Cancelar
              </button>
              <button
                onClick={eliminarUsuario}
                disabled={procesando}
                className="flex-1 px-4 py-2.5 text-sm font-semibold bg-red-500 hover:bg-red-600 text-white rounded-xl disabled:opacity-50 transition"
              >
                {procesando ? "Eliminando..." : "Sí, eliminar"}
              </button>
            </div>
      </Modal>

      {/* Modal: Gestionar áreas asignadas (solo TH) */}
      <ModalAreasTH abierto={!!idAreas} usuario={usuarioAreas ?? null} empresas={empresas} onCerrar={() => setIdAreas(null)} />
    </div>
  );
}

// Sin mayúsculas ni tildes: "logistica" encuentra "LOGÍSTICA".
const normalizarTexto = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

type Alcance = { empresaId: string; sitioId: string | null; areaId: string | null };

const NIVEL_ASIGNACION = (a: Asignacion) =>
  a.areaId ? { texto: "Área", clase: "bg-neutral-200 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-200" }
  : a.sitioId ? { texto: "Sitio", clase: "bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300" }
  : { texto: "Empresa", clase: "bg-orange-100 text-orange-800 dark:bg-orange-500/15 dark:text-orange-300" };

// Accesos de un TH/Coordinador: arriba lo que ya tiene (con Quitar), abajo
// el árbol Empresa › Sitio › Área con buscador para agregar, todo en la
// misma ventana (antes eran 3 desplegables apretados dentro del modal).
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
  const [busqueda, setBusqueda] = useState("");
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());
  const [agregandoClave, setAgregandoClave] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [idAQuitar, setIdAQuitar] = useState<string | null>(null);
  const [quitando, setQuitando] = useState(false);
  const [pendiente, setPendiente] = useState<Alcance | null>(null);
  const [confirmacion, setConfirmacion] = useState<{
    tipo: "achicar" | "ensanchar";
    nuevaEtiqueta: string;
    cubrePorEtiqueta?: string;
    redundantesEtiquetas: string[];
  } | null>(null);

  const asignaciones = useMemo(() => usuario?.asignaciones ?? [], [usuario]);

  // ¿Ya tiene acceso a este nodo (por él mismo o por uno más amplio)?
  const cubierto = (empresaId: string, sitioId: string | null, areaId: string | null) =>
    asignaciones.some(
      (a) =>
        a.empresaId === empresaId &&
        (!a.sitioId || a.sitioId === sitioId) &&
        (!a.areaId || a.areaId === areaId)
    );

  // Árbol filtrado por la búsqueda: se muestra un nodo si coincide él o
  // algo de adentro; al buscar, los caminos con coincidencias se abren solos.
  const texto = normalizarTexto(busqueda.trim());
  const arbol = useMemo(() => {
    const coincide = (n: string) => !texto || normalizarTexto(n).includes(texto);
    return empresas
      .map((e) => {
        const empresaCoincide = coincide(e.nombre);
        const sitios = e.sitios
          .map((s) => {
            const sitioCoincide = empresaCoincide || coincide(s.nombre);
            const areas = s.areas.filter((a) => sitioCoincide || coincide(a.nombre));
            return { ...s, areas, visible: sitioCoincide || areas.length > 0 };
          })
          .filter((s) => s.visible);
        return { ...e, sitios, visible: empresaCoincide || sitios.length > 0 };
      })
      .filter((e) => e.visible);
  }, [empresas, texto]);

  const abiertoNodo = (id: string) => !!texto || expandidos.has(id);
  const alternar = (id: string) =>
    setExpandidos((prev) => {
      const copia = new Set(prev);
      if (copia.has(id)) copia.delete(id);
      else copia.add(id);
      return copia;
    });

  const cerrar = () => {
    setBusqueda("");
    setExpandidos(new Set());
    setError("");
    onCerrar();
  };

  const agregar = async (alcance: Alcance, confirmar = false) => {
    if (!usuario) return;
    const clave = alcance.areaId ?? alcance.sitioId ?? alcance.empresaId;
    setAgregandoClave(clave);
    setError("");
    try {
      const res = await fetch("/api/admin/asignaciones-th", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuarioId: usuario.id, ...alcance, confirmar }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        // 409: este alcance cambia lo que el usuario ya tenía (para más
        // amplio o para más específico) — se pregunta antes de aplicarlo.
        if (res.status === 409 && data.requiereConfirmacion) {
          setPendiente(alcance);
          setConfirmacion({
            tipo: data.tipo,
            nuevaEtiqueta: data.nuevaEtiqueta,
            cubrePorEtiqueta: data.cubrePorEtiqueta,
            redundantesEtiquetas: data.redundantesEtiquetas ?? [],
          });
          return;
        }
        setError(data.error ?? "No se pudo guardar");
        toast.error(data.error ?? "No se pudo agregar el acceso");
        return;
      }
      const data = await res.json().catch(() => ({}));
      toast.exito(
        data.quitadas > 0
          ? `Acceso agregado; se quitaron ${data.quitadas} más específicos que ya quedaban incluidos`
          : "Acceso agregado"
      );
      setConfirmacion(null);
      setPendiente(null);
      router.refresh();
    } catch {
      setError("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
      toast.error("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setAgregandoClave(null);
    }
  };

  const quitar = async () => {
    if (!idAQuitar) return;
    setQuitando(true);
    try {
      const res = await fetch(`/api/admin/asignaciones-th/${idAQuitar}`, { method: "DELETE" });
      setIdAQuitar(null);
      if (res.ok) {
        toast.exito("Acceso quitado");
        router.refresh();
      } else {
        toast.error("No se pudo quitar el acceso");
      }
    } catch {
      setIdAQuitar(null);
      toast.error("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setQuitando(false);
    }
  };

  // Botón de cada nodo del árbol: "Con acceso" si ya está cubierto, si no
  // "+ Agregar" (con el alcance que corresponde a ese nivel).
  const botonNodo = (alcance: Alcance, textoAgregar: string) => {
    if (cubierto(alcance.empresaId, alcance.sitioId, alcance.areaId)) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-green-700 dark:text-green-400 shrink-0">
          <IconoCheck className="w-3.5 h-3.5" /> Con acceso
        </span>
      );
    }
    const clave = alcance.areaId ?? alcance.sitioId ?? alcance.empresaId;
    const cargando = agregandoClave === clave;
    return (
      <button
        type="button"
        onClick={(ev) => { ev.stopPropagation(); agregar(alcance); }}
        disabled={!!agregandoClave}
        className="shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold text-orange-700 dark:text-orange-400 border border-orange-300 dark:border-orange-500/40 hover:bg-orange-50 dark:hover:bg-orange-500/10 px-2 py-1 rounded-lg transition disabled:opacity-40"
      >
        {cargando && <Spinner className="w-3 h-3" />}
        {textoAgregar}
      </button>
    );
  };

  return (
    <Modal
      abierto={abierto}
      onCerrar={cerrar}
      className="bg-white dark:bg-neutral-900 text-black dark:text-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
    >
      <div className="px-6 pt-6 pb-4 border-b border-neutral-200/70 dark:border-neutral-800/70">
        <h2 className="text-lg font-bold text-neutral-900 dark:text-white">Accesos de {usuario?.nombre}</h2>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
          {usuario ? (ETIQUETAS_ROL[usuario.rol] ?? usuario.rol) : ""} · Solo verá colaboradores, rutas y solicitudes de lo que tenga acceso.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            Tiene acceso a {asignaciones.length > 0 && <span className="text-neutral-400">({asignaciones.length})</span>}
          </h3>
          {asignaciones.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl px-4 py-3">
              <IconoAlerta className="w-4 h-4 shrink-0" />
              Todavía no tiene acceso a nada. Agrégalo abajo.
            </div>
          ) : (
            <ul className="divide-y divide-neutral-200/70 dark:divide-neutral-800/70 rounded-xl ring-1 ring-black/5 dark:ring-white/10 overflow-hidden">
              {asignaciones.map((a) => {
                const nivel = NIVEL_ASIGNACION(a);
                return (
                  <li key={a.id} className="flex items-center gap-3 px-3 py-2.5 bg-neutral-50 dark:bg-neutral-800/40">
                    <span className={`text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded w-16 text-center shrink-0 ${nivel.clase}`}>
                      {nivel.texto}
                    </span>
                    <span className="flex-1 min-w-0 text-xs text-neutral-800 dark:text-neutral-200 truncate" title={a.etiqueta}>
                      {a.etiqueta}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIdAQuitar(a.id)}
                      className="shrink-0 text-[11px] font-medium text-neutral-500 hover:text-red-600 hover:bg-red-50 dark:text-neutral-400 dark:hover:text-red-400 dark:hover:bg-red-500/10 px-2 py-1 rounded-lg transition"
                    >
                      Quitar
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Agregar acceso</h3>
          <div className="relative">
            <IconoLupa className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar empresa, sitio o área..."
              aria-label="Buscar empresa, sitio o área"
              className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white pl-9 pr-3 py-2.5 text-sm placeholder-neutral-400 focus:border-orange-400 focus:ring-2 focus:ring-orange-500/15 outline-none"
            />
          </div>
          <p className="text-[11px] text-neutral-400 dark:text-neutral-500">
            Abre una empresa para ver sus sitios, y un sitio para ver sus áreas. Puedes dar acceso a toda la empresa, a todo un sitio o a áreas sueltas.
          </p>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="rounded-xl ring-1 ring-black/5 dark:ring-white/10 divide-y divide-neutral-200/70 dark:divide-neutral-800/70">
            {arbol.map((e) => {
              const eAbierta = abiertoNodo(e.id);
              return (
                <div key={e.id}>
                  <div
                    onClick={() => alternar(e.id)}
                    className="flex items-center gap-2 px-3 py-2.5 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/60"
                  >
                    <IconoChevron className={`w-3.5 h-3.5 shrink-0 text-neutral-400 transition-transform ${eAbierta ? "rotate-90" : ""}`} />
                    <span className="flex-1 min-w-0 text-sm font-semibold text-neutral-900 dark:text-white truncate">{e.nombre}</span>
                    <span className="text-[11px] text-neutral-400 shrink-0 hidden sm:inline">{e.sitios.length} sitio{e.sitios.length === 1 ? "" : "s"}</span>
                    {botonNodo({ empresaId: e.id, sitioId: null, areaId: null }, "+ Toda la empresa")}
                  </div>
                  {eAbierta && e.sitios.map((s) => {
                    const sAbierto = abiertoNodo(s.id);
                    return (
                      <div key={s.id}>
                        <div
                          onClick={() => alternar(s.id)}
                          className="flex items-center gap-2 pl-8 pr-3 py-2 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/60"
                        >
                          <IconoChevron className={`w-3.5 h-3.5 shrink-0 text-neutral-400 transition-transform ${sAbierto ? "rotate-90" : ""}`} />
                          <span className="flex-1 min-w-0 text-xs font-medium text-neutral-800 dark:text-neutral-200 truncate">{s.nombre}</span>
                          <span className="text-[11px] text-neutral-400 shrink-0 hidden sm:inline">{s.areas.length} área{s.areas.length === 1 ? "" : "s"}</span>
                          {botonNodo({ empresaId: e.id, sitioId: s.id, areaId: null }, "+ Todo el sitio")}
                        </div>
                        {sAbierto && s.areas.map((a) => (
                          <div key={a.id} className="flex items-center gap-2 pl-16 pr-3 py-1.5 hover:bg-neutral-50 dark:hover:bg-neutral-800/60">
                            <span className="flex-1 min-w-0 text-xs text-neutral-700 dark:text-neutral-300 truncate">{a.nombre}</span>
                            {botonNodo({ empresaId: e.id, sitioId: s.id, areaId: a.id }, "+ Agregar")}
                          </div>
                        ))}
                        {sAbierto && s.areas.length === 0 && (
                          <p className="pl-16 pr-3 py-1.5 text-[11px] text-neutral-400">Sin áreas</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
            {arbol.length === 0 && (
              <p className="px-3 py-4 text-xs text-neutral-400 dark:text-neutral-500">
                {empresas.length === 0 ? "Aún no hay empresas creadas" : "Nada coincide con la búsqueda"}
              </p>
            )}
          </div>
        </section>
      </div>

      <div className="px-6 py-4 border-t border-neutral-200/70 dark:border-neutral-800/70 flex justify-end">
        <button
          onClick={cerrar}
          className="px-5 py-2.5 text-sm font-semibold bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200 rounded-xl transition"
        >
          Listo
        </button>
      </div>

      <Modal abierto={!!idAQuitar} onCerrar={() => setIdAQuitar(null)} onConfirmar={quitar} variante="centro" className="bg-white dark:bg-neutral-900 text-black dark:text-white rounded-3xl p-7 w-full max-w-xs text-center space-y-4 shadow-2xl">
        <p className="font-semibold text-neutral-900 dark:text-white">¿Quitar este acceso?</p>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          {asignaciones.find((a) => a.id === idAQuitar)?.etiqueta}
        </p>
        <div className="flex gap-2 justify-center pt-1">
          <button
            onClick={() => setIdAQuitar(null)}
            disabled={quitando}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
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

      <Modal
        abierto={!!confirmacion}
        onCerrar={() => { setConfirmacion(null); setPendiente(null); }}
        onConfirmar={() => pendiente && agregar(pendiente, true)}
        variante="centro"
        className="bg-white dark:bg-neutral-900 text-black dark:text-white rounded-3xl p-7 w-full max-w-xs text-center space-y-4 shadow-2xl"
      >
        <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto"><IconoAlerta className="w-6 h-6" /></div>
        <p className="font-semibold text-neutral-900 dark:text-white">
          {confirmacion?.tipo === "achicar" ? "¿Achicar el acceso?" : "¿Ampliar el acceso?"}
        </p>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          {confirmacion?.tipo === "achicar" ? (
            <>
              Ya tiene acceso a <strong>{confirmacion.cubrePorEtiqueta}</strong>. Si continúas, eso se
              reemplaza por <strong>{confirmacion.nuevaEtiqueta}</strong> y dejará de tener acceso al resto.
            </>
          ) : (
            <>
              Esto le dará acceso a <strong>{confirmacion?.nuevaEtiqueta}</strong>. Se quitarán{" "}
              {confirmacion?.redundantesEtiquetas.length} acceso(s) más específico(s) que ya quedan
              incluidos: {confirmacion?.redundantesEtiquetas.join(", ")}.
            </>
          )}
        </p>
        <div className="flex gap-2 justify-center pt-1">
          <button
            onClick={() => { setConfirmacion(null); setPendiente(null); }}
            disabled={!!agregandoClave}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
          >
            Cancelar
          </button>
          <button
            onClick={() => pendiente && agregar(pendiente, true)}
            disabled={!!agregandoClave}
            className="flex-1 px-4 py-2.5 text-sm font-semibold bg-orange-500 hover:bg-orange-600 text-white rounded-xl disabled:opacity-50 transition"
          >
            {agregandoClave ? "Guardando..." : "Sí, guardar"}
          </button>
        </div>
      </Modal>
    </Modal>
  );
}
