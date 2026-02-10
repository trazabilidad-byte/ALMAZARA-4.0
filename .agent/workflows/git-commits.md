---
description: Protocolo de Gestión de Commits y Versionado
---

# Protocolo de Commits

Para garantizar que el historial de Git sea transparente y que Vercel esté siempre actualizado, seguiremos estas reglas:

1. **Commits Granulares**: Se realizará un commit después de cada cambio lógico importante (ej. añadir un botón, cambiar una validación, arreglar un bug específico).
2. **Mensajes Detallados**: Cada commit debe describir *qué* ha cambiado y *por qué*.
3. **Consulta de Acción**: 
    - Ante cambios complejos o que afecten a múltiples archivos, el agente preguntará: *"¿Quieres que haga un commit con estos cambios ahora?"*.
    - Ante cambios menores o rutinarios (corrección de erratas, ajustes de estilo), el agente podrá hacer commit automático si hay alta confianza.
4. **Sincronización con Vercel**: Todo `commit` irá seguido de un `git push origin main` para asegurar el despliegue inmediato.

Este protocolo es de obligado cumplimiento para el agente Antigravity.
