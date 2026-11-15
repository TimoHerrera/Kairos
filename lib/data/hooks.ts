"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/lib/session/provider";
import { getDataSource } from "./index";
import type { MatchStatus } from "./types";

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
