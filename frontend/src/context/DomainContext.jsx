import { createContext, useContext, useState } from "react";

const DomainContext = createContext();

export function DomainProvider({ children }) {
  const [domain, setDomain] = useState("movies"); // "movies" | "books" | "songs"

  return (
    <DomainContext.Provider value={{ domain, setDomain }}>
      {children}
    </DomainContext.Provider>
  );
}

export function useDomain() {
  const context = useContext(DomainContext);
  if (!context) throw new Error("useDomain must be used within DomainProvider");
  return context;
}
