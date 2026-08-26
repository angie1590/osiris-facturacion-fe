export type UserRole = "admin" | "operator" | "supervisor";

export interface EmpresaAcceso {
  empresa_id: number;
  razon_social: string;
  role: UserRole;
}

export interface CurrentUser {
  id: number;
  username: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  require_password_change: boolean;
  empresas: EmpresaAcceso[];
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  require_password_change: boolean;
}

export type IdentificationType = "ruc" | "cedula" | "pasaporte" | "consumidor_final";

export interface Empresa {
  id: number;
  ruc: string;
  razon_social: string;
  nombre_comercial: string | null;
  identification_type: IdentificationType;
  obligado_contabilidad: boolean;
  is_active: boolean;
}

export interface Sucursal {
  id: number;
  empresa_id: number;
  codigo_establecimiento: string;
  nombre: string;
  direccion: string | null;
  is_active: boolean;
}

export interface PuntoEmision {
  id: number;
  sucursal_id: number;
  codigo_punto_emision: string;
  descripcion: string | null;
  is_active: boolean;
}
