"use client";

import { useTransition } from "react";
import {
  ActivityIcon,
  CheckCircle2Icon,
  Clock3Icon,
  TerminalIcon,
} from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { Reveal } from "@/components/reveal";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime } from "@/lib/format";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  finishAdminAction,
  startAdminAction,
} from "@/store/slices/ui-preferences-slice";
import type { AdminJob } from "@/types/content";

function getJobStatusVariant(status: AdminJob["status"]) {
  // 状態ごとの差を最小限の variant に寄せ、文言変更があっても見た目の意図を保つ。
  switch (status) {
    case "completed":
      return "secondary";
    case "failed":
      return "destructive";
    default:
      return "outline";
  }
}

function getJobTypeLabel(type: AdminJob["type"]) {
  return type === "ingest" ? "収集" : "再要約";
}

function JobRow({ job }: { job: AdminJob }) {
  return (
    <TableRow>
      <TableCell>{job.id}</TableCell>
      <TableCell>{getJobTypeLabel(job.type)}</TableCell>
      <TableCell className="whitespace-normal">{job.targetLabel}</TableCell>
      <TableCell>
        <Badge variant={getJobStatusVariant(job.status)}>{job.status}</Badge>
      </TableCell>
      <TableCell>{formatDateTime(job.requestedAt)}</TableCell>
    </TableRow>
  );
}

function MobileJobCard({ job }: { job: AdminJob }) {
  return (
    <li>
      {/* mobile では 1 行テーブルより、必要情報を縦に並べた方が状態確認を完了しやすい。 */}
      <Card size="sm" className="py-0">
        <CardHeader className="gap-3 border-b pb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-2">
              <p className="eyebrow">Job</p>
              <CardTitle className="font-display text-xl leading-none">
                {job.id}
              </CardTitle>
            </div>
            <Badge variant={getJobStatusVariant(job.status)}>
              {job.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 py-4">
          <div className="surface-inline rounded-2xl p-4">
            <p className="eyebrow">種別</p>
            <p className="mt-2 text-sm font-medium text-foreground">
              {getJobTypeLabel(job.type)}
            </p>
          </div>
          <div className="surface-inline rounded-2xl p-4">
            <p className="eyebrow">対象</p>
            <p className="mt-2 text-sm font-medium text-foreground">
              {job.targetLabel}
            </p>
          </div>
          <div className="surface-inline rounded-2xl p-4">
            <p className="eyebrow">実行時刻</p>
            <p className="mt-2 text-sm font-medium text-foreground">
              {formatDateTime(job.requestedAt)}
            </p>
          </div>
        </CardContent>
      </Card>
    </li>
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
  const runningJobs = jobs.filter((job) => job.status === "running").length;
  const queuedJobs = jobs.filter((job) => job.status === "queued").length;
  const completedJobs = jobs.filter((job) => job.status === "completed").length;

  function runMockAction(label: string) {
    // 実 API 追加前でも、押下中表示と完了表示の状態遷移だけは先に固めておく。
    dispatch(startAdminAction(`${label} をキュー投入中です`));
    startTransition(() => {
      // 遷移待ちを挟み、非同期ジョブ操作へ差し替えても UI 契約を変えない。
      window.setTimeout(() => {
        dispatch(finishAdminAction(`${label} のダミー実行を完了しました`));
      }, 500);
    });
  }

  return (
    <div className="page-grid">
      <Reveal>
        <section className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.85fr)]">
          <Card className="py-0">
            <CardHeader className="gap-4 border-b pb-6">
              <p className="eyebrow">Admin Console</p>
              <h1 className="font-display text-[clamp(3rem,7vw,4.9rem)] leading-none tracking-tight">
                収集と再要約の操作
              </h1>
              <CardDescription className="max-w-3xl leading-8">
                この段階では API
                はすべてモックです。操作の手触りと導線だけを先に固めます。
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 py-6 sm:grid-cols-3">
              <div className="surface-inline rounded-2xl p-4">
                <p className="eyebrow">Running</p>
                <p className="mt-3 font-display text-3xl leading-none">
                  {runningJobs}
                </p>
              </div>
              <div className="surface-inline rounded-2xl p-4">
                <p className="eyebrow">Queued</p>
                <p className="mt-3 font-display text-3xl leading-none">
                  {queuedJobs}
                </p>
              </div>
              <div className="surface-inline rounded-2xl p-4">
                <p className="eyebrow">Completed</p>
                <p className="mt-3 font-display text-3xl leading-none">
                  {completedJobs}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card size="sm" className="py-0">
            <CardHeader className="gap-3 border-b pb-5">
              <p className="eyebrow">Operational Notes</p>
              <CardTitle className="font-display text-2xl leading-none">
                運用上の見どころ
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 py-5">
              <div className="surface-inline flex items-start gap-3 rounded-2xl p-4">
                <Clock3Icon className="mt-0.5 text-primary" />
                <p className="text-sm leading-7 text-muted-foreground">
                  pending 時はボタンを止めて多重投入を防ぎます。
                </p>
              </div>
              <div className="surface-inline flex items-start gap-3 rounded-2xl p-4">
                <ActivityIcon className="mt-0.5 text-primary" />
                <p className="text-sm leading-7 text-muted-foreground">
                  ジョブ履歴は公開画面と違い、密度を保ったまま読み取れるようにします。
                </p>
              </div>
            </CardContent>
          </Card>
        </section>
      </Reveal>

      <Reveal delay={0.04}>
        <Card className="py-0">
          <CardHeader className="gap-4 border-b pb-5">
            <div className="flex flex-col gap-2">
              <p className="eyebrow">Actions</p>
              <CardTitle className="font-display text-3xl leading-none">
                管理操作
              </CardTitle>
              <CardDescription className="leading-7">
                収集と再要約を command panel
                風にまとめ、操作状態は警告帯で返します。
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 py-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="cluster items-center">
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
              <div className="cluster items-center lg:justify-end">
                {/* dispatch と transition の両方を見て、連打よりも操作状態の一貫性を優先する。 */}
                <Badge
                  variant={
                    adminActionPending || isTransitionPending
                      ? "secondary"
                      : "outline"
                  }
                  className="rounded-full px-4 py-2 text-xs uppercase tracking-[0.14em]"
                >
                  {adminActionPending || isTransitionPending
                    ? "processing"
                    : "ready"}
                </Badge>
                <Badge variant="outline" className="rounded-full px-4 py-2">
                  jobs {jobs.length}
                </Badge>
              </div>
            </div>
            <Alert>
              {adminActionPending || isTransitionPending ? (
                <TerminalIcon />
              ) : (
                <CheckCircle2Icon />
              )}
              <AlertTitle>操作状態</AlertTitle>
              <AlertDescription>{adminMessage}</AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </Reveal>

      <Reveal delay={0.08}>
        <Card className="py-0">
          <CardHeader className="gap-3 border-b pb-5">
            <p className="eyebrow">Job History</p>
            <CardTitle className="font-display text-3xl leading-none">
              ジョブ一覧
            </CardTitle>
            <CardDescription className="leading-7">
              status を優先して読めるよう、表の密度を維持しつつ hierarchy
              を整理します。
            </CardDescription>
          </CardHeader>
          <CardContent className="py-6">
            {/* 履歴ゼロも正しい初期状態なので、空テーブルではなく empty state を明示する。 */}
            {jobs.length === 0 ? (
              <EmptyState
                title="ジョブはまだありません"
                description="モック API の履歴を追加すると、管理導線の確認がしやすくなります。"
              />
            ) : (
              <div className="grid gap-4">
                <div className="md:hidden">
                  <p className="eyebrow mb-3">モバイル履歴</p>
                  <ul aria-label="モバイル履歴カード" className="grid gap-3">
                    {jobs.map((job) => (
                      <MobileJobCard key={job.id} job={job} />
                    ))}
                  </ul>
                </div>
                <div className="hidden md:block">
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
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </Reveal>
    </div>
  );
}
