# Resumen técnico para el Capítulo IV

## Arquitectura del componente predictivo

El componente se separó del sistema transaccional. Python y scikit-learn realizan el entrenamiento fuera del servidor web y generan un JSON precomputado. Express lee ese artefacto y lo expone mediante un endpoint protegido para administradores. React consulta el endpoint con la sesión administrativa existente y presenta el histórico, el horizonte de 14 días y las métricas. PostgreSQL, Gemini y las reglas de cotización no participan en el cálculo predictivo.

## Metodología y datos

Se utilizó Online Retail del UCI Machine Learning Repository, con transacciones entre el 1 de diciembre de 2010 y el 9 de diciembre de 2011. De 541.909 filas originales se conservaron 530.104 luego de excluir cancelaciones, devoluciones, precios o cantidades no positivos y registros inválidos. Los ingresos diarios se calcularon en GBP como cantidad por precio unitario y se agregaron sobre 374 días calendario.

Las variables comprenden calendario, rezagos de 1, 7, 14 y 28 días y medias móviles desplazadas de 7 y 28 días. El desplazamiento evita utilizar el valor futuro que se intenta predecir. Se empleó RandomForestRegressor con 200 árboles, mínimo de tres muestras por hoja y semilla 42.

## Separación y métricas

La evaluación original usa una división cronológica 80/20 con 276 observaciones de entrenamiento y 70 de prueba. En predicción a un día, Random Forest obtuvo MAE 13.097,23 y RMSE 23.272,42 GBP, frente a MAE 14.184,32 y RMSE 24.338,02 de la referencia estacional semanal.

Para representar el horizonte publicado se añadió una evaluación rolling-origin de cinco bloques no solapados de 14 días. Cada modelo usa únicamente información anterior al origen y sus predicciones se reutilizan recursivamente. Sobre 70 observaciones, Random Forest obtuvo MAE 11.541,93 y RMSE 21.304,48 GBP; la referencia estacional recursiva obtuvo MAE 14.255,73 y RMSE 24.145,07 GBP. La mejora fue agregada, no uniforme: en uno de los cinco bloques el RMSE del modelo fue mayor que el de referencia.

## Análisis de ceros y picos

El calendario contiene 69 días sin transacciones válidas, incluidos 53 sábados. Estos ceros se conservaron. El pico del 9 de diciembre de 2011 alcanza 200.920,60 GBP y está dominado por una transacción de 80.995 unidades; no se eliminó. La última fecha termina a las 12:50, por lo que también puede ser un día parcial.

## Integración y limitaciones

El resultado se almacena en `backend/data/forecast.json` y se consulta en `GET /api/reports/forecast`. La pantalla `/admin/reports` diferencia histórico y pronóstico, muestra ambos horizontes de evaluación y advierte que los datos son públicos, de 2011, en GBP y ajenos a J&P Periféricos.

La principal limitación es disponer de aproximadamente un año de historial de otra organización. No se pueden medir ciclos interanuales ni afirmar desempeño sobre ventas reales de J&P. El artefacto es estático y requiere reentrenamiento y validación manual para actualizarse. La integración está completada localmente; el despliegue de esta rama permanece pendiente.
