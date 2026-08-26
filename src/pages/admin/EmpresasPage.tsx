import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Empresa } from "@/types/api";

export default function EmpresasPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["empresas"],
    queryFn: async () => (await api.get<Empresa[]>("/empresas")).data,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Empresas</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground">Cargando...</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>RUC</TableHead>
                <TableHead>Razón Social</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.map((empresa) => (
                <TableRow key={empresa.id}>
                  <TableCell>{empresa.ruc}</TableCell>
                  <TableCell>{empresa.razon_social}</TableCell>
                  <TableCell>{empresa.is_active ? "Activa" : "Inactiva"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
