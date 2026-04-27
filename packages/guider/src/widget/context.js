import React, { createContext, useContext, useState, useCallback } from 'react';

const Ctx = createContext(null);

export function GuiderProvider({ children, value }) {
  return React.createElement(Ctx.Provider, { value }, children);
}

export function useGuider() {
  return useContext(Ctx);
}

export function useToggle(initial = false) {
  const [v, setV] = useState(initial);
  const toggle = useCallback(() => setV((x) => !x), []);
  return [v, toggle, setV];
}
