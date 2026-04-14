import { Badge } from "@/components/ui/badge";
import { getChargeStatusLabel } from "@/modules/central-cobranca/lib";
import type { ChargeStatus } from "@/modules/central-cobranca/types";

const badgeClassNames: Record<ChargeStatus, string> = {
  pendente: "bg-amber-100 text-amber-900 hover:bg-amber-100",
  revisao: "bg-sky-100 text-sky-900 hover:bg-sky-100",
  agendada: "bg-violet-100 text-violet-900 hover:bg-violet-100",
  enviada: "bg-emerald-100 text-emerald-900 hover:bg-emerald-100",
  falha_envio: "bg-rose-100 text-rose-900 hover:bg-rose-100",
  paga: "bg-green-100 text-green-900 hover:bg-green-100",
  cancelada: "bg-slate-200 text-slate-700 hover:bg-slate-200",
};

export function CentralBillingStatusBadge({ status }: { status: ChargeStatus }) {
  return <Badge className={badgeClassNames[status]}>{getChargeStatusLabel(status)}</Badge>;
}
