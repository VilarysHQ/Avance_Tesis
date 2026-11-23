
from pathlib import Path
from datetime import timedelta
import json

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error

ROOT = Path(__file__).resolve().parent
DATA_FILE = ROOT / "data" / "Online Retail.xlsx"
OUTPUT = ROOT / "output"

LAGS = [1, 7, 14, 28]
WINDOWS = [7, 28]
HORIZON = 14
RANDOM_STATE = 42


def create_features(series):
    data = pd.DataFrame({"sales": series})
    data["weekday"] = data.index.day_of_week
    data["month"] = data.index.month
    data["day"] = data.index.day
    data["dayofyear"] = data.index.day_of_year

    for lag in LAGS:
        data[f"lag_{lag}"] = data["sales"].shift(lag)

    for window in WINDOWS:
        data[f"rolling_{window}"] = (
            data["sales"].shift(1).rolling(window).mean()
        )

    return data.dropna()


def feature_row(history, date, columns):
    values = {
        "weekday": date.day_of_week,
        "month": date.month,
        "day": date.day,
        "dayofyear": date.day_of_year,
    }

    for lag in LAGS:
        values[f"lag_{lag}"] = float(history.iloc[-lag])

    for window in WINDOWS:
        values[f"rolling_{window}"] = float(
            history.iloc[-window:].mean()
        )

    return pd.DataFrame([values], columns=columns)


def build_model():
    return RandomForestRegressor(
        n_estimators=200,
        min_samples_leaf=3,
        random_state=RANDOM_STATE,
        n_jobs=-1,
    )


def recursive_random_forest(model, history, dates, columns):
    working_history = history.copy()
    predictions = []

    for date in dates:
        row = feature_row(working_history, date, columns)
        prediction = max(0.0, float(model.predict(row)[0]))
        predictions.append(prediction)
        working_history.loc[date] = prediction

    return np.asarray(predictions)


def recursive_seasonal_baseline(history, dates, lag=7):
    working_history = history.copy()
    predictions = []

    for date in dates:
        prediction = max(0.0, float(working_history.iloc[-lag]))
        predictions.append(prediction)
        working_history.loc[date] = prediction

    return np.asarray(predictions)


def evaluate_recursive_horizon(daily, evaluation_dates, columns):
    """Evalúa bloques no solapados sin usar el futuro de cada origen."""
    origins = evaluation_dates[::HORIZON]
    actual_values = []
    model_values = []
    baseline_values = []
    blocks = []

    for origin in origins:
        dates = evaluation_dates[
            (evaluation_dates >= origin)
            & (evaluation_dates < origin + timedelta(days=HORIZON))
        ]
        if len(dates) != HORIZON:
            continue

        history = daily.loc[daily.index < origin].copy()
        training = create_features(history)
        model = build_model()
        model.fit(training[columns], training["sales"])

        actual = daily.loc[dates].to_numpy()
        predicted = recursive_random_forest(model, history, dates, columns)
        baseline = recursive_seasonal_baseline(history, dates)

        actual_values.extend(actual)
        model_values.extend(predicted)
        baseline_values.extend(baseline)
        blocks.append({
            "origin": origin.strftime("%Y-%m-%d"),
            "end": dates[-1].strftime("%Y-%m-%d"),
            "train_samples": int(len(training)),
            "metrics": {
                "mae": round(float(mean_absolute_error(actual, predicted)), 2),
                "rmse": round(float(np.sqrt(mean_squared_error(actual, predicted))), 2),
                "baseline_mae": round(float(mean_absolute_error(actual, baseline)), 2),
                "baseline_rmse": round(float(np.sqrt(mean_squared_error(actual, baseline))), 2),
            },
        })

    actual_values = np.asarray(actual_values)
    model_values = np.asarray(model_values)
    baseline_values = np.asarray(baseline_values)
    if len(actual_values) == 0:
        raise ValueError("No hay bloques completos para evaluar 14 días.")

    return {
        "strategy": "rolling_origin_expanding_window",
        "horizon_days": HORIZON,
        "blocks": blocks,
        "observations": int(len(actual_values)),
        "mae": round(float(mean_absolute_error(actual_values, model_values)), 2),
        "rmse": round(float(np.sqrt(mean_squared_error(actual_values, model_values))), 2),
        "baseline": "seasonal_naive_lag_7_recursive",
        "baseline_mae": round(float(mean_absolute_error(actual_values, baseline_values)), 2),
        "baseline_rmse": round(float(np.sqrt(mean_squared_error(actual_values, baseline_values))), 2),
    }


def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)

    print("Leyendo transacciones...")
    df = pd.read_excel(DATA_FILE, engine="openpyxl")
    df["InvoiceDate"] = pd.to_datetime(
        df["InvoiceDate"], errors="coerce"
    )
    df["Quantity"] = pd.to_numeric(
        df["Quantity"], errors="coerce"
    )
    df["UnitPrice"] = pd.to_numeric(
        df["UnitPrice"], errors="coerce"
    )

    # Excluir cancelaciones, devoluciones y operaciones inválidas.
    valid = (
        df["InvoiceDate"].notna()
        & df["InvoiceNo"].notna()
        & ~df["InvoiceNo"].astype(str).str.upper().str.startswith("C")
        & (df["Quantity"] > 0)
        & (df["UnitPrice"] > 0)
    )
    clean = df.loc[valid].copy()
    clean["revenue"] = clean["Quantity"] * clean["UnitPrice"]

    daily = (
        clean.set_index("InvoiceDate")["revenue"]
        .resample("D")
        .sum()
        .astype(float)
    )

    # El dataset tiene precios en GBP; no convertir a soles.
    features = create_features(daily)
    columns = features.drop(columns=["sales"]).columns.tolist()

    split = int(len(features) * 0.8)
    train, test = features.iloc[:split], features.iloc[split:]

    if len(train) < 60 or len(test) < 14:
        raise ValueError("Historial insuficiente para esta evaluación.")

    model = build_model()
    model.fit(train[columns], train["sales"])

    predictions = model.predict(test[columns])
    baseline = test["lag_7"].to_numpy()

    mae = mean_absolute_error(test["sales"], predictions)
    rmse = np.sqrt(mean_squared_error(test["sales"], predictions))
    baseline_mae = mean_absolute_error(test["sales"], baseline)
    baseline_rmse = np.sqrt(
        mean_squared_error(test["sales"], baseline)
    )

    recursive_metrics = evaluate_recursive_horizon(
        daily,
        test.index,
        columns,
    )

    # Reentrenar con todo el historial para pronosticar el futuro.
    final_model = build_model()
    final_model.fit(features[columns], features["sales"])

    history = daily.copy()
    future = []

    future_dates = pd.date_range(
        history.index[-1] + timedelta(days=1),
        periods=HORIZON,
        freq="D",
    )
    future_values = recursive_random_forest(
        final_model,
        history,
        future_dates,
        columns,
    )
    for date, prediction in zip(future_dates, future_values):
        future.append({
            "date": date.strftime("%Y-%m-%d"),
            "predicted_sales": round(prediction, 2),
        })

    result = {
        "status": "experimental",
        "source": "UCI Machine Learning Repository - Online Retail",
        "dataset": "Online Retail",
        "currency": "GBP",
        "company_data": False,
        "target": "daily_revenue",
        "model": "RandomForestRegressor",
        "validation": "chronological_holdout_80_20",
        "evaluation_type": "one_step_ahead_with_observed_lags",
        "forecast_type": "recursive_14_day",
        "dataset_period": {
            "start": daily.index[0].strftime("%Y-%m-%d"),
            "end": daily.index[-1].strftime("%Y-%m-%d"),
        },
        "original_rows": int(len(df)),
        "valid_rows": int(len(clean)),
        "days": int(len(daily)),
        "train_samples": int(len(train)),
        "test_samples": int(len(test)),
        "metrics": {
            "mae": round(float(mae), 2),
            "rmse": round(float(rmse), 2),
            "baseline_mae": round(float(baseline_mae), 2),
            "baseline_rmse": round(float(baseline_rmse), 2),
        },
        "horizon_metrics": {
            "one_step": {
                "description": "holdout with observed lag values",
                "observations": int(len(test)),
                "mae": round(float(mae), 2),
                "rmse": round(float(rmse), 2),
                "baseline": "seasonal_naive_lag_7_observed",
                "baseline_mae": round(float(baseline_mae), 2),
                "baseline_rmse": round(float(baseline_rmse), 2),
            },
            "recursive_14_day": recursive_metrics,
        },
        "history": [
            {
                "date": day.strftime("%Y-%m-%d"),
                "sales": round(float(value), 2),
            }
            for day, value in daily.tail(60).items()
        ],
        "forecast": future,
    }

    (OUTPUT / "forecast.json").write_text(
        json.dumps(result, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    joblib.dump(
        {"model": final_model, "features": columns},
        OUTPUT / "model.joblib",
    )

    print("\nENTRENAMIENTO COMPLETADO")
    print(f"Registros válidos: {len(clean):,}")
    print(f"Días históricos: {len(daily)}")
    print(f"Entrenamiento: {len(train)} observaciones")
    print(f"Evaluación: {len(test)} observaciones")
    print(f"Random Forest MAE: {mae:,.2f} GBP")
    print(f"Random Forest RMSE: {rmse:,.2f} GBP")
    print(f"Referencia MAE: {baseline_mae:,.2f} GBP")
    print(f"Referencia RMSE: {baseline_rmse:,.2f} GBP")
    print("\nEVALUACIÓN RECURSIVA DE 14 DÍAS")
    print(f"Bloques: {len(recursive_metrics['blocks'])}")
    print(f"Observaciones: {recursive_metrics['observations']}")
    print(f"Random Forest MAE: {recursive_metrics['mae']:,.2f} GBP")
    print(f"Random Forest RMSE: {recursive_metrics['rmse']:,.2f} GBP")
    print(f"Referencia MAE: {recursive_metrics['baseline_mae']:,.2f} GBP")
    print(f"Referencia RMSE: {recursive_metrics['baseline_rmse']:,.2f} GBP")
    print("\nGenerado: ml/output/forecast.json")
    print("Generado: ml/output/model.joblib")


if __name__ == "__main__":
    main()
