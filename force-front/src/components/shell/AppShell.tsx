import Sidebar from './Sidebar';

/** Estructura base: sidebar fijo + área principal (cada pantalla pone su Topbar). */
export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="app">
      <Sidebar />
      <main className="main">{children}</main>
    </div>
  );
}
