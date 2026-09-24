import type { ActionState } from "@/lib/forms";

export function FormMessage({ state }: { state: ActionState }) {
  if (state.error) {
    return (
      <p className="text-sm text-destructive" role="alert">
        {state.error}
      </p>
    );
  }
  if (state.success) {
    return (
      <p className="text-sm text-muted-foreground" role="status">
        {state.success}
      </p>
    );
  }
  return null;
}
