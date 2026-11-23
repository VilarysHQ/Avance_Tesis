# Validación predictiva con CRISP-DM

## Alcance y estado

Este documento describe únicamente el trabajo realizado para el componente experimental de pronóstico de Predict Sale App. El modelo usa el dataset público **Online Retail** del UCI Machine Learning Repository; no fue entrenado ni validado con ventas de J&P Periféricos S.A.C.

La integración local Python → JSON → Express → React está completada. El despliegue de estos cambios de la rama `feat/ml-sales-forecast` en Render y Vercel permanece pendiente.

## 1. Comprensión del negocio

El objetivo académico es demostrar un componente que estime ingresos diarios futuros y que pueda integrarse de forma segura en el panel administrativo. El resultado se presenta como apoyo experimental, no como una cotización, una meta comercial ni una predicción de ventas reales de la empresa.

La variable objetivo es el ingreso diario, calculado como `Quantity × UnitPrice`. Los importes permanecen en GBP. El horizonte operativo mostrado es de 14 días posteriores al último registro del dataset de 2011.

## 2. Comprensión de los datos

- Fuente: UCI Machine Learning Repository, dataset Online Retail (`https://archive.ics.uci.edu/dataset/352/online+retail`).
- Periodo observado: 2010-12-01 a 2011-12-09.
- Filas originales: 541.909.
- Filas válidas tras limpieza: 530.104.
- Cobertura diaria: 374 días calendario.
- Moneda: GBP.
- Datos empresariales de J&P: no.

El remuestreo diario produjo 69 días con ingreso cero. De ellos, 53 son sábados; representan días calendario sin transacciones válidas en la fuente y no valores faltantes reemplazados arbitrariamente. No se eliminaron para mejorar métricas.

El mayor ingreso diario aparece el 2011-12-09 con 200.920,60 GBP. Ese valor incluye una transacción de 80.995 unidades por 2,08 GBP y, por tanto, tiene respaldo en el archivo fuente. El registro final del dataset ocurre a las 12:50, por lo que el último día puede ser parcial además de contener un valor extremo. Ambos hechos limitan la interpretación del pronóstico posterior.

## 3. Preparación de los datos

`ml/train.py` realiza las siguientes operaciones:

1. Convierte `InvoiceDate`, `Quantity` y `UnitPrice` a tipos utilizables.
2. Excluye fechas o números de factura ausentes.
3. Excluye facturas cuyo identificador comienza con `C`, asociadas a cancelaciones.
4. Excluye cantidades y precios iguales o inferiores a cero, con lo cual no incorpora devoluciones como ventas positivas.
5. Calcula `revenue = Quantity × UnitPrice`.
6. Agrega el ingreso por día mediante `resample("D").sum()`, conservando la continuidad del calendario y los días sin transacciones con valor cero.

Las variables predictoras son:

- día de la semana, mes, día del mes y día del año;
- rezagos de 1, 7, 14 y 28 días;
- medias móviles de 7 y 28 días.

Todos los rezagos usan `shift`. Las medias móviles también aplican `shift(1)` antes de la ventana, por lo que ninguna variable incorpora el valor objetivo del día que intenta predecir.

## 4. Modelado

El algoritmo es `RandomForestRegressor` con:

- 200 árboles;
- `min_samples_leaf=3`;
- semilla `random_state=42`;
- ejecución paralela mediante `n_jobs=-1`.

Las dependencias directas están fijadas en `ml/requirements.txt`. El entorno validado utilizó Python 3.14.6, NumPy 2.5.5, pandas 3.1.1, scikit-learn 1.9.1, joblib 1.6.0 y openpyxl 3.1.5.

El modelo final se ajusta con todas las observaciones con variables completas y genera 14 días recursivamente. Después del primer paso, los valores pronosticados pasan a formar parte de los rezagos y medias utilizados por los pasos siguientes.

## 5. Evaluación

### Evaluación a un día

Se mantiene el holdout cronológico 80/20 original: 276 observaciones de entrenamiento y 70 de evaluación. El modelo se entrena solo con el primer bloque. Cada fila de evaluación utiliza rezagos ya observados, por lo cual mide predicción a un día y no simula una trayectoria recursiva completa.

| Método | MAE (GBP) | RMSE (GBP) |
| --- | ---: | ---: |
| Random Forest | 13.097,23 | 23.272,42 |
| Referencia estacional, rezago 7 observado | 14.184,32 | 24.338,02 |

La reducción relativa frente a la referencia fue 7,66 % en MAE y 4,38 % en RMSE.

### Evaluación recursiva a 14 días

Se implementó rolling-origin con ventana de entrenamiento expansiva. Las 70 fechas del holdout se dividieron en cinco bloques no solapados de 14 días:

| Origen | Fin | Entrenamiento | RF MAE | RF RMSE | Base MAE | Base RMSE |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| 2011-10-01 | 2011-10-14 | 276 | 10.969,39 | 13.873,14 | 14.970,87 | 18.023,70 |
| 2011-10-15 | 2011-10-28 | 290 | 6.871,87 | 8.312,82 | 8.817,23 | 12.311,60 |
| 2011-10-29 | 2011-11-11 | 304 | 12.203,59 | 15.256,86 | 15.722,57 | 19.076,70 |
| 2011-11-12 | 2011-11-25 | 318 | 9.306,79 | 17.046,11 | 10.240,86 | 14.729,91 |
| 2011-11-26 | 2011-12-09 | 332 | 18.357,98 | 38.529,15 | 21.527,11 | 43.099,90 |

En cada origen se vuelve a entrenar únicamente con fechas anteriores. Durante los 14 pasos no se consultan ventas reales del bloque: cada predicción alimenta el paso siguiente. La referencia es un método estacional recursivo de siete días sometido a la misma restricción.

| Método | MAE (GBP) | RMSE (GBP) |
| --- | ---: | ---: |
| Random Forest recursivo | 11.541,93 | 21.304,48 |
| Referencia estacional recursiva | 14.255,73 | 24.145,07 |

Random Forest superó la referencia en los resultados agregados: reducción de 19,04 % en MAE y 11,76 % en RMSE. No fue superior en todas las métricas de todos los bloques: en el bloque iniciado el 2011-11-12 su RMSE fue mayor que el de referencia. El agregado se comunica sin selección de bloques ni eliminación de ceros o picos.

La evaluación a un día y la recursiva no son intercambiables. La primera recibe rezagos observados para cada fecha; la segunda acumula predicciones y representa mejor el uso real del horizonte de 14 días.

### Limitaciones

- Solo existe aproximadamente un año de historial, insuficiente para evaluar varios ciclos anuales o estabilidad interanual.
- Los cinco bloques proceden del mismo periodo final y comparten contexto económico y estacional.
- El dataset pertenece a un comercio minorista británico y no representa el mercado, moneda ni catálogo de J&P.
- Días sin actividad, valores extremos y el posible día final parcial afectan MAE y especialmente RMSE.
- No se realizó ajuste de hiperparámetros con un conjunto de validación independiente.
- Las métricas no justifican por sí solas decisiones comerciales en producción.

## 6. Despliegue

`ml/train.py` genera:

- `ml/output/forecast.json`, resultado legible y versionable;
- `ml/output/model.joblib`, artefacto binario ignorado por Git.

El JSON se copia a `backend/data/forecast.json`. Express lo sirve de forma precomputada mediante `GET /api/reports/forecast`, protegido por autenticación administrativa. React consume ese endpoint en `/admin/reports` y muestra histórico, pronóstico, métricas diferenciadas y advertencias.

Node.js no entrena ni ejecuta el modelo. Los resultados no se actualizan automáticamente: requieren ejecutar el pipeline, validar la salida y copiar el JSON. No se ha incorporado ningún dataset ni modelo binario al repositorio.

## Reproducción

Desde la raíz del repositorio, en PowerShell:

```powershell
py -m venv ml/.venv
& .\ml\.venv\Scripts\python.exe -m pip install -r ml/requirements.txt
& .\ml\.venv\Scripts\python.exe .\ml\train.py
Copy-Item ml/output/forecast.json backend/data/forecast.json
& .\ml\.venv\Scripts\python.exe -m unittest discover -s ml -p "test_*.py"
```

El archivo fuente esperado es `ml/data/Online Retail.xlsx`. `ml/data/`, `ml/.venv/` y `ml/output/*.joblib` están ignorados por Git.

Las validaciones de aplicación se ejecutan con:

```powershell
Set-Location backend
npm test
Set-Location ../frontend
npm test
npm run lint
npm run build
```

## Archivos relacionados

- `ml/train.py`: preparación, entrenamiento, evaluaciones y generación.
- `ml/requirements.txt`: dependencias reproducibles.
- `ml/test_train.py`: invariantes de variables temporales, referencia y semilla.
- `ml/test_output.py`: contrato y sincronización del JSON.
- `ml/output/forecast.json`: salida generada.
- `backend/data/forecast.json`: copia servida por Express.
- `backend/src/services/forecast.service.js`: lectura y validación básica.
- `backend/src/routes/forecast.routes.js`: endpoint administrativo.
- `frontend/src/components/Admin/ForecastReportPage.jsx`: presentación del reporte.
