// The useClientOnlyValue value is always either true or false, but the built-in
// type suggests that it can be null. This will not happen in practice, so this
// makes it a bit easier to work with.
export default function useClientOnlyValue(): boolean {
  return false;
} 