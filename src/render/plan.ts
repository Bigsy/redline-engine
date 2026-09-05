/** Internal render plan; never sent across the worker seam. */
export type RenderPlan = string | (() => string) | RenderPlan[];
export function renderPlan(plan: RenderPlan, charge: () => void): string {
  const stack = [plan],
    chunks: string[] = [];
  while (stack.length) {
    charge();
    const piece = stack.pop()!;
    if (Array.isArray(piece)) {
      for (let i = piece.length - 1; i >= 0; i--) stack.push(piece[i]!);
    } else chunks.push(typeof piece === "function" ? piece() : piece);
  }
  return chunks.join("");
}
