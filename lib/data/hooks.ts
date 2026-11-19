"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { resumenDeFicha } from "@/lib/domain/resumen";
import { recalcularYAvisar } from "@/lib/push/avisar";
import { useSession } from "@/lib/session/provider";
import { getDataSource, type NewBuyer, type NewDiscard, type NewProperty } from "./index";
import type { AgentSettings, Buyer, BuyerCriteria, Id, MatchStatus } from "./types";

/**
 * Todas las keys empiezan con el id del agente: los datos de una sesión
 * nunca se mezclan con los de otra, ni siquiera en caché.
 */
function useAgentKey() {
  const sesion = useSession();
  return { agentId: sesion?.agentId, listo: Boolean(sesion) };
}

export function useAgent() {
  const { agentId, listo } = useAgentKey();
  return useQuery({ queryKey: [agentId, "agent"], queryFn: () => getDataSource().agent.get(), enabled: listo });
}

export function useBuyers() {
  const { agentId, listo } = useAgentKey();
  return useQuery({ queryKey: [agentId, "buyers"], queryFn: () => getDataSource().buyers.list(), enabled: listo });
}

export function useProperties() {
  const { agentId, listo } = useAgentKey();
  return useQuery({
    queryKey: [agentId, "properties"],
    queryFn: () => getDataSource().properties.list(),
    enabled: listo,
  });
}

export function useMatches(status?: MatchStatus[]) {
  const { agentId, listo } = useAgentKey();
  return useQuery({
    queryKey: [agentId, "matches", status ?? "all"],
    queryFn: () => getDataSource().matches.list({ status }),
    enabled: listo,
  });
}

// --- Ficha de un cliente ------------------------------------------------------

export function useBuyer(id: Id) {
  const { agentId, listo } = useAgentKey();
  return useQuery({
    queryKey: [agentId, "buyers", id],
    queryFn: () => getDataSource().buyers.get(id),
    enabled: listo,
  });
}

export function useBuyerCriteria(id: Id) {
  const { agentId, listo } = useAgentKey();
  return useQuery({
    queryKey: [agentId, "buyers", id, "criteria"],
    queryFn: () => getDataSource().buyers.getCriteria(id),
    enabled: listo,
  });
}

export function useBuyerNotes(id: Id) {
  const { agentId, listo } = useAgentKey();
  return useQuery({
    queryKey: [agentId, "buyers", id, "notes"],
    queryFn: () => getDataSource().buyers.listNotes(id),
    enabled: listo,
  });
}

export function useBuyerDiscards(id: Id) {
  const { agentId, listo } = useAgentKey();
  return useQuery({
    queryKey: [agentId, "buyers", id, "discards"],
    queryFn: () => getDataSource().buyers.listDiscards(id),
    enabled: listo,
  });
}

export function useBuyerMatches(id: Id) {
  const { agentId, listo } = useAgentKey();
  return useQuery({
    queryKey: [agentId, "matches", "buyer", id],
    queryFn: () => getDataSource().matches.list({ buyerId: id }),
    enabled: listo,
  });
}

// --- Escrituras ---------------------------------------------------------------

/** Después de escribir, se vuelve a leer todo lo del agente: son pocos datos y evita vistas viejas. */
function useRefrescar() {
  const { agentId } = useAgentKey();
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: [agentId] });
}

export function useCreateBuyer() {
  const refrescar = useRefrescar();
  return useMutation({
    mutationFn: (datos: NewBuyer) => getDataSource().buyers.create(datos),
    onSuccess: refrescar,
  });
}

export function useUpdateBuyer(id: Id) {
  const refrescar = useRefrescar();
  return useMutation({
    mutationFn: (cambios: Partial<NewBuyer>) => getDataSource().buyers.update(id, cambios),
    onSuccess: refrescar,
  });
}

/**
 * Cambia la ficha a mano y rearma la frase resumen con lo nuevo.
 * Solo se toca lo que viene en `cambios`: el resto de la ficha queda igual.
 */
export function useUpdateCriteria(buyer: Pick<Buyer, "id" | "name"> | null | undefined) {
  const refrescar = useRefrescar();
  return useMutation({
    mutationFn: async (cambios: Partial<Omit<BuyerCriteria, "buyer_id" | "agent_id">>) => {
      if (!buyer) throw new Error("Falta el cliente");
      const ds = getDataSource();
      const ficha = await ds.buyers.updateCriteria(buyer.id, cambios);
      await ds.buyers.update(buyer.id, { summary: resumenDeFicha(ficha, buyer.name) });
      // Lo que busca cambió: puede haber oportunidades nuevas, o alguna que ya no le sirve.
      await recalcularYAvisar(ds, { clienteIds: [buyer.id] });
      return ficha;
    },
    onSuccess: refrescar,
  });
}

export function useAddDiscard(buyerId: Id) {
  const refrescar = useRefrescar();
  return useMutation({
    mutationFn: async (datos: NewDiscard) => {
      const ds = getDataSource();
      const descarte = await ds.buyers.addDiscard(buyerId, datos);
      await recalcularYAvisar(ds, { clienteIds: [buyerId] });
      return descarte;
    },
    onSuccess: refrescar,
  });
}

export function useRemoveDiscard(buyerId: Id) {
  const refrescar = useRefrescar();
  return useMutation({
    mutationFn: async (discardId: Id) => {
      const ds = getDataSource();
      await ds.buyers.removeDiscard(discardId);
      await recalcularYAvisar(ds, { clienteIds: [buyerId] });
    },
    onSuccess: refrescar,
  });
}

// --- Propiedades --------------------------------------------------------------

export function useProperty(id: Id) {
  const { agentId, listo } = useAgentKey();
  return useQuery({
    queryKey: [agentId, "properties", id],
    queryFn: () => getDataSource().properties.get(id),
    enabled: listo,
  });
}

export function usePropertyMatches(id: Id) {
  const { agentId, listo } = useAgentKey();
  return useQuery({
    queryKey: [agentId, "matches", "property", id],
    queryFn: () => getDataSource().matches.list({ propertyId: id }),
    enabled: listo,
  });
}

export function useCreateProperty() {
  const refrescar = useRefrescar();
  return useMutation({
    mutationFn: async (datos: NewProperty) => {
      const ds = getDataSource();
      const propiedad = await ds.properties.create(datos);
      // Al cargar una propiedad se cruza con todos los clientes activos.
      await recalcularYAvisar(ds, { propiedadIds: [propiedad.id] });
      return propiedad;
    },
    onSuccess: refrescar,
  });
}

// --- Oportunidades ------------------------------------------------------------

export function useMatch(id: Id) {
  const { agentId, listo } = useAgentKey();
  return useQuery({
    queryKey: [agentId, "matches", "one", id],
    queryFn: () => getDataSource().matches.get(id),
    enabled: listo,
  });
}

export function useSetMatchStatus() {
  const refrescar = useRefrescar();
  return useMutation({
    mutationFn: ({ id, status }: { id: Id; status: MatchStatus }) => getDataSource().matches.setStatus(id, status),
    onSuccess: refrescar,
  });
}

export function useUpdateSettings() {
  const refrescar = useRefrescar();
  return useMutation({
    mutationFn: (cambios: Partial<AgentSettings>) => getDataSource().agent.updateSettings(cambios),
    onSuccess: refrescar,
  });
}

export function useMatchMessages(matchId: Id) {
  const { agentId, listo } = useAgentKey();
  return useQuery({
    queryKey: [agentId, "messages", matchId],
    queryFn: () => getDataSource().messages.listByMatch(matchId),
    enabled: listo,
  });
}
