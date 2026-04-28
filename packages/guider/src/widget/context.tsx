import { createContext, useCallback, useContext, useState, type Dispatch, type PropsWithChildren, type SetStateAction } from 'react';

type GuiderContextValue = unknown;

const GuiderContext = createContext<GuiderContextValue | null>(null);

export function GuiderProvider({ children, value }: PropsWithChildren<{ value: GuiderContextValue }>) {
  return <GuiderContext.Provider value={value}>{children}</GuiderContext.Provider>;
}

export function useGuider<T = GuiderContextValue>() {
  return useContext(GuiderContext) as T;
}

export function useToggle(initial = false): [boolean, () => void, Dispatch<SetStateAction<boolean>>] {
  const [value, setValue] = useState(initial);
  const toggle = useCallback(() => setValue((current) => !current), []);
  return [value, toggle, setValue];
}