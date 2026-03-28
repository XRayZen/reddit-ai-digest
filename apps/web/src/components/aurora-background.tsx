"use client";

/**
 * AuroraBackground
 *
 * dark-first な公開 UI の背景に、薄い虹色がゆっくり流れる aurora 演出を追加する。
 * - 固定フルスクリーンの装飾レイヤー (2〜3 層) + dark veil
 * - aria-hidden, pointer-events: none で本文操作を阻害しない
 * - animation は transform / opacity のみ (paint/layout 負荷最小化)
 * - prefers-reduced-motion 時は停止 (globals.css で制御)
 */

export function AuroraBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-[2] overflow-hidden"
    >
      {/* Layer A: 左上→中央 へゆっくり流れる cyan/teal 楕円 */}
      <div
        className="aurora-layer"
        style={{
          width: "74vw",
          height: "62vh",
          top: "-12%",
          left: "-12%",
          background: `radial-gradient(ellipse at 40% 35%, var(--aurora-cyan), var(--aurora-teal) 52%, transparent 78%)`,
          animation: `aurora-drift-a var(--aurora-duration-a) ease-in-out infinite`,
        }}
      />

      {/* Layer B: 右上→対角 へ逆方向に漂う blue/indigo 楕円 */}
      <div
        className="aurora-layer"
        style={{
          width: "62vw",
          height: "54vh",
          top: "-6%",
          right: "-12%",
          background: `radial-gradient(ellipse at 55% 40%, var(--aurora-blue), var(--aurora-indigo) 58%, transparent 80%)`,
          animation: `aurora-drift-b var(--aurora-duration-b) ease-in-out infinite`,
        }}
      />

      {/* Layer C: 一瞬だけ虹が走る細い帯。常時は抑え、通過時だけ見えるようにする */}
      <div
        className="aurora-layer"
        style={{
          width: "76vw",
          height: "18vh",
          top: "20%",
          left: "-8%",
          borderRadius: "999px",
          background: `linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.06) 10%, var(--aurora-cyan) 22%, var(--aurora-blue) 44%, var(--aurora-indigo) 64%, var(--aurora-rose) 80%, transparent 100%)`,
          animation: `aurora-ribbon-pass 12s ease-in-out infinite`,
        }}
      />

      {/* Rainbow line: 背景の上を一筋だけ流れる、認識しやすい虹の帯 */}
      <div
        className="aurora-ribbon-line"
        style={{
          width: "72vw",
          height: "6px",
          top: "28%",
          left: "4%",
          background:
            "linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.18) 8%, rgba(34, 211, 238, 0.96) 18%, rgba(96, 165, 250, 1) 38%, rgba(129, 140, 248, 0.96) 58%, rgba(251, 113, 133, 0.88) 80%, transparent 100%)",
          boxShadow:
            "0 0 12px rgba(255, 255, 255, 0.24), 0 0 20px rgba(34, 211, 238, 0.55), 0 0 32px rgba(96, 165, 250, 0.42), 0 0 44px rgba(251, 113, 133, 0.28)",
          animation: "aurora-line-sweep 9s ease-in-out infinite",
        }}
      />

      {/* Layer D: 下辺に広い薄膜。ほぼ静止に近い速度で揺らす */}
      <div
        className="aurora-layer"
        style={{
          width: "100vw",
          height: "48vh",
          bottom: "-15%",
          left: "0%",
          background: `radial-gradient(ellipse at 50% 58%, var(--aurora-teal), var(--aurora-rose) 64%, transparent 84%)`,
          animation: `aurora-drift-c var(--aurora-duration-c) ease-in-out infinite`,
        }}
      />

      {/* Dark veil: 色が強く出すぎるのを抑える薄膜 */}
      <div className="aurora-veil" />
    </div>
  );
}
