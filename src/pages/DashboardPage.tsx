import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Bienvenido, {user?.full_name}</h1>
      <Card>
        <CardHeader>
          <CardTitle>Osiris Facturación</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground">
          Módulo en construcción. Próximamente: empresas, clientes, ventas y facturación electrónica.
        </CardContent>
      </Card>
    </div>
  );
}
