# Osiris Facturación — Frontend

Frontend de facturación electrónica para PyMEs (Ecuador). Mantiene el design system de
[osiris-inventario-fe](https://github.com/angie1590/osiris-inventario-fe): React 19 + Vite + Tailwind v4 + Radix UI.

## Desarrollo
```bash
npm install
npm run dev
```
La API se espera en `http://localhost:8001` (configurable con `VITE_API_PROXY_TARGET`).

## Estructura
```
src/{components/ui,components/shared,contexts,features,hooks,layouts,lib,pages,types}/
```

`components/ui` y `components/shared` son el design system heredado de inventario. Los módulos de
negocio (empresas, clientes, ventas, facturación) se agregan en `features/` y `pages/`.
