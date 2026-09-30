# Evidencia de aceptación

- Certificado usado: estructura oficial SRI de dos páginas proporcionada por el usuario.
- Backend: 7 pruebas de parser/endpoint, incluyendo RUC, domicilio, actividades, obligaciones, indicadores positivos, MIME y tamaño.
- Frontend: contrato multipart y mapper de campos persistibles cubiertos por pruebas.
- Playwright: archivo PDF seleccionado, vista previa visible, RUC/razón social/dirección aplicados al formulario.
- Persistencia: `saveRequests=0` después de aplicar; guardar sigue siendo una acción explícita separada.
- Datos informativos: artesano, ubicación, actividades, obligaciones y código de verificación visibles pero no mezclados con campos Empresa.