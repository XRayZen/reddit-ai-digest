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
          width: "65vw",
          height: "55vh",
          top: "-10%",
          left: "-8%",
          background: `radial-gradient(ellipse at 40% 35%, var(--aurora-cyan), var(--aurora-teal) 50%, transparent 75%)`,
          animation: `aurora-drift-a var(--aurora-duration-a) ease-in-out infinite`,
        }}
      />

      {/* Layer B: 右上→対角 へ逆方向に漂う blue/indigo 楕円 */}
      <div
        className="aurora-layer"
        style={{
          width: "55vw",
          height: "50vh",
          top: "-5%",
          right: "-10%",
          background: `radial-gradient(ellipse at 55% 40%, var(--aurora-blue), var(--aurora-indigo) 55%, transparent 78%)`,
          animation: `aurora-drift-b var(--aurora-duration-b) ease-in-out infinite`,
        }}
      />

      {/* Layer C: 下辺に広い薄膜。ほぼ静止に近い速度で揺らす */}
      <div
        className="aurora-layer"
        style={{
          width: "90vw",
          height: "40vh",
          bottom: "-12%",
          left: "5%",
          background: `radial-gradient(ellipse at 50% 60%, var(--aurora-teal), var(--aurora-rose) 60%, transparent 80%)`,
          animation: `aurora-drift-c var(--aurora-duration-c) ease-in-out infinite`,
        }}
      />

      {/* Dark veil: 色が強く出すぎるのを抑える薄膜 */}
      <div className="aurora-veil" />
    </div>
  );
}
