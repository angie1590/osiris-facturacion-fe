import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Persona } from "@/types/api";

export default function ClientesPage() {
  const [open, setOpen] = useState(false);
  const [razonSocial, setRazonSocial] = useState("");
  const [identificacion, setIdentificacion] = useState("");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["personas", "cliente"],
    queryFn: async () => (await api.get<Persona[]>("/personas/cliente")).data,
  });

  const handleCreate = async () => {
    if (!razonSocial || !identificacion) return;
    try {
      await api.post("/personas", {
        tipo: "cliente",
        identificacion_tipo: "ruc",
        identificacion,
        razon_social: razonSocial,
      });
      setRazonSocial("");
      setIdentificacion("");
      setOpen(false);
      await refetch();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Clientes</CardTitle>
        <Button onClick={() => setOpen(true)}>+ Nuevo Cliente</Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground">Cargando...</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Identificación</TableHead>
                <TableHead>Razón Social</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Teléfono</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.map((persona) => (
                <TableRow key={persona.id}>
                  <TableCell>{persona.identificacion}</TableCell>
                  <TableCell>{persona.razon_social}</TableCell>
                  <TableCell>{persona.email || "-"}</TableCell>
                  <TableCell>{persona.telefono || "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo Cliente</DialogTitle>
            <DialogDescription>Ingresa los datos del cliente</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="identificacion">Identificación</Label>
              <Input
                id="identificacion"
                value={identificacion}
                onChange={(e) => setIdentificacion(e.target.value)}
                placeholder="1234567890"
              />
            </div>
            <div>
              <Label htmlFor="razonSocial">Razón Social</Label>
              <Input
                id="razonSocial"
                value={razonSocial}
                onChange={(e) => setRazonSocial(e.target.value)}
                placeholder="Empresa XYZ"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate}>Crear</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
