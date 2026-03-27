"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import type {
  AdminActionResult,
  AdminArticleOption,
  AdminArticleOptionsByTheme,
  AdminJob,
  ContentApiMode,
  Theme,
} from "@/types/content";

type AdminDashboardProps = {
  jobs: AdminJob[];
  themes?: Theme[];
  articleOptionsByTheme?: AdminArticleOptionsByTheme;
  mode?: ContentApiMode;
  queueIngestionAction?: (input: {
    themeSlug: string;
  }) => Promise<AdminActionResult>;
  queueResummarizationAction?: (input: {
    articleId: string;
  }) => Promise<AdminActionResult>;
};

function getInitialThemeSlug(themes: Theme[]): string {
  return themes[0]?.slug ?? "";
}

function getArticleOptionsByTheme(
  articleOptionsByTheme: AdminArticleOptionsByTheme,
  themeSlug: string,
): AdminArticleOption[] {
  return articleOptionsByTheme[themeSlug] ?? [];
}

export function resolveResummarizationArticleID(
  articleOptionsByTheme: AdminArticleOptionsByTheme,
  themeSlug: string,
  currentArticleID = "",
): string {
  const articleOptions = getArticleOptionsByTheme(
    articleOptionsByTheme,
    themeSlug,
  );

  if (articleOptions.some((article) => article.id === currentArticleID)) {
    return currentArticleID;
  }

  return articleOptions[0]?.id ?? "";
}

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

export function AdminDashboard({
  jobs,
  themes = [],
  articleOptionsByTheme = {},
  mode = "mock",
  queueIngestionAction,
  queueResummarizationAction,
}: AdminDashboardProps) {
  const router = useRouter();
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
  const initialThemeSlug = getInitialThemeSlug(themes);
  const [ingestionThemeSlug, setIngestionThemeSlug] = useState(
    () => initialThemeSlug,
  );
  const [resummarizationThemeSlug, setResummarizationThemeSlug] = useState(
    () => initialThemeSlug,
  );
  const [resummarizationArticleID, setResummarizationArticleID] = useState(() =>
    resolveResummarizationArticleID(articleOptionsByTheme, initialThemeSlug),
  );
  const selectedIngestionThemeSlug = themes.some(
    (theme) => theme.slug === ingestionThemeSlug,
  )
    ? ingestionThemeSlug
    : initialThemeSlug;
  const selectedResummarizationThemeSlug = themes.some(
    (theme) => theme.slug === resummarizationThemeSlug,
  )
    ? resummarizationThemeSlug
    : initialThemeSlug;
  const resummarizationArticleOptions = getArticleOptionsByTheme(
    articleOptionsByTheme,
    selectedResummarizationThemeSlug,
  );
  const selectedResummarizationArticleID = resolveResummarizationArticleID(
    articleOptionsByTheme,
    selectedResummarizationThemeSlug,
    resummarizationArticleID,
  );
  const adminActionBusy = adminActionPending || isTransitionPending;

  function runMockAction(label: string, successMessage: string) {
    dispatch(startAdminAction(`${label} をキュー投入中です`));
    startTransition(() => {
      // mock では backend 非依存の導線を維持しつつ、完了通知だけ live と同じ場所へ返す。
      window.setTimeout(() => {
        dispatch(finishAdminAction(successMessage));
      }, 500);
    });
  }

  function runLiveAction(
    label: string,
    action: () => Promise<AdminActionResult>,
  ) {
    dispatch(startAdminAction(`${label} をキュー投入中です`));
    startTransition(() => {
      void (async () => {
        try {
          const result = await action();

          dispatch(finishAdminAction(result.message));
          if (result.ok) {
            router.refresh();
          }
        } catch (error) {
          dispatch(
            finishAdminAction(
              error instanceof Error
                ? `${label} の投入に失敗しました: ${error.message}`
                : `${label} の投入に失敗しました`,
            ),
          );
        }
      })();
    });
  }

  function handleIngestion() {
    if (mode === "live" && queueIngestionAction) {
      runLiveAction("収集", () =>
        queueIngestionAction({ themeSlug: selectedIngestionThemeSlug }),
      );
      return;
    }

    runMockAction("収集", "収集 のダミー実行を完了しました");
  }

  function handleResummarization() {
    if (mode === "live" && queueResummarizationAction) {
      runLiveAction("再要約", () =>
        queueResummarizationAction({
          articleId: selectedResummarizationArticleID,
        }),
      );
      return;
    }

    runMockAction("再要約", "再要約 のダミー実行を完了しました");
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
                {mode === "live"
                  ? "テーマと記事を選んで管理 REST へ投入し、queued 状態を一覧再取得で確認します。"
                  : "mock 導線を既定に保ち、操作の手触りと画面構成を backend 非依存で確認できます。"}
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
            <CardContent className="grid gap-3 py-6">
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
                風にまとめ、選択対象と操作状態を同じカード内で追えるようにします。
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 py-6">
            <div className="grid gap-4 xl:grid-cols-2">
              <div className="surface-inline grid gap-3 rounded-2xl p-4">
                <p className="eyebrow">Ingestion Target</p>
                <div className="grid gap-2">
                  <p className="text-sm font-medium">収集対象テーマ</p>
                  <Select
                    value={selectedIngestionThemeSlug}
                    onValueChange={setIngestionThemeSlug}
                    disabled={adminActionBusy || themes.length === 0}
                  >
                    <SelectTrigger
                      aria-label="収集対象テーマ"
                      className="w-full"
                    >
                      <SelectValue placeholder="テーマを選択">
                        {themes.find(
                          (theme) => theme.slug === selectedIngestionThemeSlug,
                        )?.name ?? "テーマを選択"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>テーマ</SelectLabel>
                        {themes.map((theme) => (
                          <SelectItem key={theme.slug} value={theme.slug}>
                            {theme.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="surface-inline grid gap-3 rounded-2xl p-4">
                <p className="eyebrow">Resummarization Target</p>
                <div className="grid gap-2">
                  <p className="text-sm font-medium">再要約対象テーマ</p>
                  <Select
                    value={selectedResummarizationThemeSlug}
                    onValueChange={(themeSlug) => {
                      setResummarizationThemeSlug(themeSlug);
                      setResummarizationArticleID(
                        resolveResummarizationArticleID(
                          articleOptionsByTheme,
                          themeSlug,
                        ),
                      );
                    }}
                    disabled={adminActionBusy || themes.length === 0}
                  >
                    <SelectTrigger
                      aria-label="再要約対象テーマ"
                      className="w-full"
                    >
                      <SelectValue placeholder="テーマを選択">
                        {themes.find(
                          (theme) =>
                            theme.slug === selectedResummarizationThemeSlug,
                        )?.name ?? "テーマを選択"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>テーマ</SelectLabel>
                        {themes.map((theme) => (
                          <SelectItem key={theme.slug} value={theme.slug}>
                            {theme.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <p className="text-sm font-medium">再要約対象記事</p>
                  <Select
                    value={selectedResummarizationArticleID}
                    onValueChange={setResummarizationArticleID}
                    disabled={
                      adminActionBusy ||
                      resummarizationArticleOptions.length === 0
                    }
                  >
                    <SelectTrigger
                      aria-label="再要約対象記事"
                      className="w-full"
                    >
                      <SelectValue placeholder="記事を選択">
                        {resummarizationArticleOptions.find(
                          (article) =>
                            article.id === selectedResummarizationArticleID,
                        )?.title ?? "記事を選択"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>記事</SelectLabel>
                        {resummarizationArticleOptions.map((article) => (
                          <SelectItem key={article.id} value={article.id}>
                            {article.title}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="cluster items-center">
                <Button
                  type="button"
                  size="lg"
                  onClick={handleIngestion}
                  disabled={
                    adminActionBusy || selectedIngestionThemeSlug.length === 0
                  }
                >
                  収集実行
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={handleResummarization}
                  disabled={
                    adminActionBusy ||
                    selectedResummarizationArticleID.length === 0
                  }
                >
                  再要約実行
                </Button>
              </div>
              <div className="cluster items-center lg:justify-end">
                {/* dispatch と transition の両方を見て、連打よりも操作状態の一貫性を優先する。 */}
                <Badge
                  variant={adminActionBusy ? "secondary" : "outline"}
                  className="rounded-full px-4 py-2 text-xs uppercase tracking-[0.14em]"
                >
                  {adminActionBusy ? "processing" : "ready"}
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
                description={
                  mode === "live"
                    ? "管理操作を実行すると、queued ジョブがここに表示されます。"
                    : "mock API の履歴を追加すると、管理導線の確認がしやすくなります。"
                }
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
