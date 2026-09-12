# Definiciones de negocio (cerradas)

> Objetivo de este documento: **sacar el negocio de la mesa** para que el equipo se concentre en el motor y la IA. Cada definición está **decidida**, con su razón y con lo que implica para lo que hay que construir. Lo que queda abierto está marcado y **no bloquea el desarrollo**.

---

## Resumen en 10 líneas

1. **Producto:** AgroMatch. Conectamos y resolvemos necesidades del agro.
2. **Vertical 1:** Torinder, matching genético para tambos.
3. **Categorías del MVP:** maquinaria, veterinaria y genética. **Insumos no.**
4. **El productor no paga.** Paga el proveedor.
5. **No cobramos comisión sobre el trabajo.** Suscripción del proveedor.
6. **El ranking no se vende.** Nunca.
7. **Cliente objetivo:** tambo mediano-grande y su asesor; contratista y veterinario profesional.
8. **Lo que retiene es el vertical**, no el marketplace.
9. **Fuera de alcance:** pagos, contratos, seguros y logística.
10. **El pitch se sostiene con 5 números**, todos con fuente.

---

## N1 · Nombre

**Decisión: AgroMatch** para el producto, **Torinder** para el vertical genético.

**Por qué:** es lo que ya dice el repo, se entiende en 2 segundos y describe exactamente lo que hacemos. Torinder se queda como el nombre del vertical, que es el gancho gracioso del pitch sin comprometer el nombre del producto.

⚠️ **Confirmar con el equipo.** Es la única decisión de este documento que es puro gusto.

---

## N2 · Qué vendemos

> **No somos otro clasificado del agro. Somos el que ENTIENDE lo que necesitás y CALCULA quién lo resuelve mejor.**

**Lo que nos diferencia, en una línea por competidor:**

| Competidor                     | Qué hace                       | Qué hacemos distinto                                                  |
| ------------------------------ | ------------------------------ | --------------------------------------------------------------------- |
| Malevo, Agrofinders            | Publican proveedores y filtran | Interpretamos la necesidad y **calculamos** el match, con explicación |
| Agrofy, Agroads, Mercado Libre | Venden **productos**           | Resolvemos **necesidades**, que casi siempre son servicios            |
| Centrales de semen             | Recomiendan **sus** toros      | Somos **neutrales**                                                   |

---

## N3 · Categorías del MVP

**Decisión: tres categorías.**

| Categoría                          | Por qué entra                                                             |
| ---------------------------------- | ------------------------------------------------------------------------- |
| **Maquinaria** (contratistas)      | Es el dolor más grande y documentado: 80-90% de las labores tercerizadas  |
| **Veterinaria** (grandes animales) | Necesidad recurrente, alta frecuencia, y conecta con el vertical genético |
| **Genética** (Torinder)            | Es el vertical que demuestra que el motor calcula                         |

**Insumos queda afuera del MVP.** Ahí Agrofy, Agroads y Mercado Libre ya dominan con escala regional. Entrar de frente es regalar el pitch.

**Lo que implica:** el equipo carga proveedores semilla de esas tres categorías y nada más (M7).

---

## N4 · Quién paga

| Actor                                    | Paga                                             | Por qué entra                                                |
| ---------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------ |
| **Productor**                            | **Nada**                                         | Sin fricción en el lado que arranca vacío                    |
| **Proveedor** (contratista, veterinario) | **Suscripción mensual** para recibir solicitudes | Consigue trabajo sin vendedor y sin depender del boca a boca |
| **Tambo o asesor** (vertical)            | **Suscripción** por rodeo o por cartera          | Lo usa todos los meses                                       |
| **Laboratorio de genotipado**            | No paga: es **canal**                            | Entrega el resultado ya interpretado y su producto vale más  |

### La decisión importante: no cobramos comisión sobre el trabajo

En marketplaces de servicios la **desintermediación se lleva hasta el 80% de los ingresos**: se conocen por la plataforma y a la segunda vez arreglan por afuera. Cobrar un porcentaje del trabajo **premia irse**: hay que esconder el contacto, perseguir la operación y pelearse con el cliente.

**La suscripción no pelea contra eso.** El proveedor paga por estar donde aparecen las necesidades; si después arregla por WhatsApp, no perdimos nada.

⚠️ **Los precios quedan abiertos** y no bloquean nada. En el pitch se dice el **modelo**, no el número.

---

## N5 · Qué nos retiene

**El vertical, no el marketplace.** Nadie vuelve todos los meses a una lista de contratistas; sí volvés a algo que te dice qué hacer con cada vaca del rodeo.

Orden de la conversación comercial: **entrás por una necesidad puntual, te quedás por el vertical.**

**Lo que implica:** si hay que recortar, se recorta amplitud, nunca la profundidad del vertical.

---

## N6 · Neutralidad: la línea roja

1. El ranking **no se vende**. Nunca.
2. Si algún día hay patrocinio, va **fuera del ranking y etiquetado**.
3. Ni la central, ni el proveedor, ni quién paga influyen en el score.

**Lo que implica:** hay un test que cambia el nombre de la empresa en todos los proveedores y verifica que el ranking no se mueva (RN-34, RN-23).

---

## N7 · Verificación de proveedores

**Tres niveles, visibles en la tarjeta:**

| Nivel             | Qué significa                                            |
| ----------------- | -------------------------------------------------------- |
| **No verificado** | Cargado desde una fuente pública. No sabe que existimos. |
| **Verificado**    | Confirmó sus datos y su disponibilidad                   |
| **Con historial** | Tiene trabajos valorados en la plataforma                |

**Nunca** se muestra un proveedor no verificado como si fuera cliente nuestro. En la demo se ve la etiqueta, y eso **suma** credibilidad en vez de restarla.

---

## N8 · Qué NO hacemos

Pagos, acuerdos, contratos, escrow, seguros, logística y facturación. La mensajería sí vive dentro de AgroMatch para que productores y proveedores puedan conversar con trazabilidad; cualquier acuerdo ocurre por fuera de la plataforma.

---

## N9 · Los 5 números del pitch

Todos verificados y con fuente. **No se agrega ninguno sin fuente.**

| Número                                                                    | Para qué sirve                   |
| ------------------------------------------------------------------------- | -------------------------------- |
| Los contratistas hacen el **80-90%** de siembra, cosecha y aplicaciones   | El tamaño del dolor              |
| Mercado de servicios: **USD 2.000-3.000 millones al año**                 | El tamaño del mercado            |
| **"El acuerdo se cierra por WhatsApp y la palabra alcanza"**              | El dolor, en palabras del sector |
| **293 animales reales** de un tambo argentino                             | Que no inventamos los datos      |
| Las reglas clásicas mandan el **47% del rodeo a carne**; nosotros, el 30% | Que el motor calcula y corrige   |

---

## N10 · Qué mide el éxito

**En la hackathon:** que el jurado entienda en 30 segundos y vea el cálculo en vivo, no un listado.

**Como negocio (primeros 90 días, hoja de ruta):**

| Métrica                                                 | Por qué esa                                 |
| ------------------------------------------------------- | ------------------------------------------- |
| Necesidades publicadas por semana                       | Demanda real, no registros                  |
| % de necesidades con al menos una solicitud enviada     | Que el matcheo sirve                        |
| Proveedores que pasan de "no verificado" a "verificado" | Que el lado de la oferta se activa          |
| Tambos que vuelven al vertical al mes siguiente         | **La única que predice si el negocio vive** |

---

## Lo que queda abierto (y no frena nada)

| #      | Qué                                   | Quién lo cierra                            |
| ------ | ------------------------------------- | ------------------------------------------ |
| **N1** | Confirmar el nombre                   | El equipo, en 2 minutos                    |
| **N4** | Los precios                           | Después de la hackathon                    |
| **D1** | Qué es el índice **CI**               | El analista o el laboratorio               |
| **D2** | Validar el algoritmo de clasificación | El analista y el tambero                   |
| —      | ¿El proveedor pagaría?                | Hablar con un contratista y un veterinario |

**Ninguna de estas frena el desarrollo.** El motor y la IA ya tienen todo lo que necesitan: reglas, contratos, datos y criterios de aceptación.
