"use client";

import { useTransition } from "react";

import { EmptyState } from "@/components/empty-state";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  finishAdminAction,
  startAdminAction,
} from "@/store/slices/ui-preferences-slice";
import type { AdminJob } from "@/types/content";

function JobRow({ job }: { job: AdminJob }) {
  return (
    <tr>
      <td>{job.id}</td>
      <td>{job.type}</td>
      <td>{job.targetLabel}</td>
      <td>{job.status}</td>
      <td>{job.requestedAt}</td>
    </tr>
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
    <div className="stack-xl">
      <section className="hero-card">
        <p className="eyebrow">Admin Console</p>
        <h1>収集と再要約の操作</h1>
        <p className="hero-copy">
          この段階では API
          はすべてモックです。操作の手触りと導線だけを先に固めます。
        </p>
      </section>

      <section className="panel action-panel">
        <div>
          <p className="eyebrow">Actions</p>
          <h2>管理操作</h2>
        </div>
        <div className="action-buttons">
          <button
            type="button"
            onClick={() => runMockAction("収集")}
            disabled={adminActionPending || isTransitionPending}
          >
            収集実行
          </button>
          <button
            type="button"
            onClick={() => runMockAction("再要約")}
            disabled={adminActionPending || isTransitionPending}
          >
            再要約実行
          </button>
        </div>
        <p className="status-text">{adminMessage}</p>
      </section>

      <section className="panel">
        <p className="eyebrow">Job History</p>
        <h2>ジョブ一覧</h2>
        {jobs.length === 0 ? (
          <EmptyState
            title="ジョブはまだありません"
            description="モック API の履歴を追加すると、管理導線の確認がしやすくなります。"
          />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>種別</th>
                  <th>対象</th>
                  <th>状態</th>
                  <th>実行時刻</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <JobRow key={job.id} job={job} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
