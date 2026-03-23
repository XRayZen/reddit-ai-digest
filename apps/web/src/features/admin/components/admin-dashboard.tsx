"use client";

import { useTransition } from "react";

import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  finishAdminAction,
  startAdminAction,
} from "@/store/slices/ui-preferences-slice";
import type { AdminJob } from "@/types/content";

function getJobStatusVariant(status: AdminJob["status"]) {
  switch (status) {
    case "completed":
      return "secondary";
    case "failed":
      return "destructive";
    default:
      return "outline";
  }
}

function JobRow({ job }: { job: AdminJob }) {
  return (
    <TableRow>
      <TableCell>{job.id}</TableCell>
      <TableCell>{job.type}</TableCell>
      <TableCell className="whitespace-normal">{job.targetLabel}</TableCell>
      <TableCell>
        <Badge variant={getJobStatusVariant(job.status)}>{job.status}</Badge>
      </TableCell>
      <TableCell>{job.requestedAt}</TableCell>
    </TableRow>
  );
}

export function AdminDashboard({ jobs }: { jobs: AdminJob[] }) {
  const dispatch = useAppDispatch();
  const [isTransitionPending, startTransition] = useTransition();
  const adminActionPending = useAppSelector(
    (state) => state.uiPreferences.adminActionPending,
  );
  const adminMessage = useAppSelector(
    (state) => state.uiPreferences.adminMessage,
  );

  function runMockAction(label: string) {
    dispatch(startAdminAction(`${label} をキュー投入中です`));
    startTransition(() => {
      window.setTimeout(() => {
        dispatch(finishAdminAction(`${label} のダミー実行を完了しました`));
      }, 500);
    });
  }

  return (
    <div className="grid gap-6">
      <section className="rounded-[calc(var(--radius)+10px)] border border-border bg-card px-7 py-7 shadow-[var(--shadow)] backdrop-blur-xl">
        <p className="eyebrow">Admin Console</p>
        <h1 className="font-display mt-3 text-[clamp(2.8rem,7vw,4.75rem)] leading-none">
          収集と再要約の操作
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-8 text-muted-foreground md:text-base">
          この段階では API
          はすべてモックです。操作の手触りと導線だけを先に固めます。
        </p>
      </section>

      <Card>
        <CardHeader className="gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <p className="eyebrow">Actions</p>
            <CardTitle className="font-display text-3xl leading-none">
              管理操作
            </CardTitle>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              size="lg"
              onClick={() => runMockAction("収集")}
              disabled={adminActionPending || isTransitionPending}
            >
              収集実行
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => runMockAction("再要約")}
              disabled={adminActionPending || isTransitionPending}
            >
              再要約実行
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <Badge
            variant={
              adminActionPending || isTransitionPending
                ? "secondary"
                : "outline"
            }
            className="rounded-full px-4 py-2 text-xs uppercase tracking-[0.14em]"
          >
            {adminMessage}
          </Badge>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="gap-3">
          <p className="eyebrow">Job History</p>
          <CardTitle className="font-display text-3xl leading-none">
            ジョブ一覧
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {jobs.length === 0 ? (
            <EmptyState
              title="ジョブはまだありません"
              description="モック API の履歴を追加すると、管理導線の確認がしやすくなります。"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>種別</TableHead>
                  <TableHead>対象</TableHead>
                  <TableHead>状態</TableHead>
                  <TableHead>実行時刻</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((job) => (
                  <JobRow key={job.id} job={job} />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
