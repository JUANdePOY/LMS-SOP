import { createContext, useContext, useState, useCallback } from "react";

const NavigationContext = createContext(null);

/**
 * Tracks which secondary (nested) navigation panel is open beside the main
 * sidebar. `null` means none; `'clients'` opens the client-list panel.
 */
export function NavigationProvider({ children }) {
  const [secondaryNav, setSecondaryNav] = useState(null);

  const toggleSecondaryNav = useCallback((key) => {
    setSecondaryNav((prev) => (prev === key ? null : key));
  }, []);

  const openSecondaryNav = useCallback((key) => {
    setSecondaryNav(key);
  }, []);

  const closeSecondaryNav = useCallback(() => {
    setSecondaryNav(null);
  }, []);

  return (
    <NavigationContext.Provider
      value={{ secondaryNav, toggleSecondaryNav, openSecondaryNav, closeSecondaryNav }}
    >
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const ctx = useContext(NavigationContext);
  if (!ctx) {
    throw new Error("useNavigation must be used within a NavigationProvider");
  }
  return ctx;
}
