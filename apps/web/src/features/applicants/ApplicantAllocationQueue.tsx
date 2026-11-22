import React, { useCallback, useEffect, useState } from "react";
import { Clock, RefreshCw, UserCheck } from "lucide-react";
import { provinceNameFromId } from "@tstaff/contracts";
import { apiClient } from "../../shared/api-client.js";
import { Badge } from "../../shared/ui/Badge.js";
import { Button } from "../../shared/ui/Button.js";
import { Card } from "../../shared/ui/Card.js";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "../../shared/ui/StateFeedback.js";
import { Link } from "react-router-dom";

type Notice = (
  type: "success" | "error" | "info" | "warning",
  title: string,
  message?: string,
) => void;
interface QueueItem {
  id: string;
  fullName: string;
  provinceId?: string | null;
  createdAt: string;
  waitingDays: number;
}
interface SupervisorOption {
  id: string;
  fullName?: string | null;
  phoneNumber: string;
  roles?: string[];
  role?: string | null;
  isActive: boolean;
}

export const ApplicantAllocationQueue: React.FC<{ onNotify: Notice }> = ({
  onNotify,
}) => {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [supervisors, setSupervisors] = useState<SupervisorOption[]>([]);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [queue, managers] = await Promise.all([
        apiClient.get<QueueItem[]>("/applicants/pending-supervisor-allocation"),
        apiClient.get<SupervisorOption[]>("/users/managers"),
      ]);
      setItems(queue);
      setSupervisors(
        managers.filter(
          (manager) =>
            manager.isActive &&
            (manager.roles ?? (manager.role ? [manager.role] : [])).includes(
              "SCIENTIFIC_SUPERVISOR",
            ),
        ),
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "دریافت صف تخصیص ناموفق بود.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const allocate = async (item: QueueItem) => {
    const supervisorId = selected[item.id];
    if (!supervisorId) return;
    setBusyId(item.id);
    try {
      await apiClient.post(
        `/applicants/${encodeURIComponent(item.id)}/assign-supervisor`,
        { supervisorId },
      );
      setItems((current) => current.filter((entry) => entry.id !== item.id));
      setSelected((current) => {
        const next = { ...current };
        delete next[item.id];
        return next;
      });
      onNotify(
        "success",
        "مدیر علمی تخصیص یافت",
        `پرونده ${item.fullName} به کارتابل مدیر علمی منتقل شد.`,
      );
    } catch (err) {
      onNotify(
        "error",
        "تخصیص انجام نشد",
        err instanceof Error ? err.message : undefined,
      );
      await load();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Card
      variant="default"
      title={
        <span className="flex items-center gap-2">
          <UserCheck className="h-4 w-4 text-[#214E3A]" />
          متقاضیان نیازمند تخصیص مدیر علمی
        </span>
      }
    >
      {loading ? (
        <LoadingState message="در حال دریافت صف تخصیص..." />
      ) : error ? (
        <ErrorState message={error} onRetry={() => void load()} />
      ) : items.length === 0 ? (
        <EmptyState
          title="صف تخصیص خالی است"
          description="متقاضی تازه‌ای در انتظار تعیین مدیر علمی نیست."
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-right text-xs">
            <thead>
              <tr className="border-b border-[#214E3A]/15 text-[#4F6659]">
                <th scope="col" className="px-3 py-2 font-semibold">
                  متقاضی
                </th>
                <th scope="col" className="px-3 py-2 font-semibold">
                  استان
                </th>
                <th scope="col" className="px-3 py-2 font-semibold">
                  تاریخ ثبت
                </th>
                <th scope="col" className="px-3 py-2 font-semibold">
                  انتظار
                </th>
                <th scope="col" className="px-3 py-2 font-semibold">
                  تخصیص
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#214E3A]/10">
              {items.map((item) => (
                <tr
                  key={item.id}
                  className="align-middle hover:bg-[#F3EBDD]/35"
                >
                  <td className="px-3 py-3">
                    <Link
                      className="font-semibold text-[#214031] hover:underline"
                      to={`/admissions/${encodeURIComponent(item.id)}`}
                    >
                      {item.fullName}
                    </Link>
                  </td>
                  <td className="px-3 py-3 text-[#4F6659]">
                    {provinceNameFromId(item.provinceId ?? null) ?? "—"}
                  </td>
                  <td className="px-3 py-3 text-[#4F6659]">
                    {new Date(item.createdAt).toLocaleDateString("fa-IR")}
                  </td>
                  <td className="px-3 py-3">
                    <Badge
                      variant={item.waitingDays >= 7 ? "warning" : "neutral"}
                      size="sm"
                    >
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {item.waitingDays} روز
                      </span>
                    </Badge>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex min-w-[300px] items-center gap-2">
                      <select
                        aria-label={`مدیر علمی برای ${item.fullName}`}
                        value={selected[item.id] ?? ""}
                        onChange={(event) =>
                          setSelected((current) => ({
                            ...current,
                            [item.id]: event.target.value,
                          }))
                        }
                        className="min-w-0 flex-1 rounded-lg border border-[#214E3A]/20 bg-[#FFFCF5] px-2 py-2 text-xs text-[#214031] focus-visible:outline"
                      >
                        <option value="">انتخاب مدیر علمی فعال...</option>
                        {supervisors.map((manager) => (
                          <option key={manager.id} value={manager.id}>
                            {manager.fullName || manager.phoneNumber}
                          </option>
                        ))}
                      </select>
                      <Button
                        size="sm"
                        variant="primary"
                        loading={busyId === item.id}
                        disabled={!selected[item.id] || busyId !== null}
                        onClick={() => void allocate(item)}
                      >
                        تخصیص
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-3 flex justify-end">
            <Button
              size="sm"
              variant="ghost"
              icon={<RefreshCw className="h-3.5 w-3.5" />}
              onClick={() => void load()}
            >
              به‌روزرسانی صف
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
};
