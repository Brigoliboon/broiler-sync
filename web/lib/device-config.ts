export type DeviceConfig = {
  flock_start: string | null;
  age_override_days: number | null;
  mode: "auto" | "manual";
  fan_on_delta: number;
  fan_off_delta: number;
  lamp_on_delta: number;
  lamp_off_delta: number;
  temp_warn_delta: number;
  temp_crit_delta: number;
  brood_days: number;
  fan_max_on_s: number;
  fan_rest_s: number;
  hum_low: number;
  hum_high: number;
  hum_brood_low: number;
  hum_brood_days: number;
  batt_warn_v: number;
  batt_crit_v: number;
  min_switch_s: number;
  manual_minutes: number;
  wind_alert_ms: [number, number, number];
  wind_alert_until_days: [number, number, number];
  manual_id: number;
  manual_fan: boolean;
  manual_lamp: boolean;
};

export const defaultDeviceConfig: DeviceConfig = {
  flock_start: null,
  age_override_days: null,
  mode: "auto",
  fan_on_delta: 2.0,
  fan_off_delta: 0.5,
  lamp_on_delta: 1.0,
  lamp_off_delta: 0.0,
  temp_warn_delta: 3.0,
  temp_crit_delta: 5.0,
  brood_days: 14,
  fan_max_on_s: 300,
  fan_rest_s: 300,
  hum_low: 50,
  hum_high: 70,
  hum_brood_low: 60,
  hum_brood_days: 3,
  batt_warn_v: 11.8,
  batt_crit_v: 11.0,
  min_switch_s: 30,
  manual_minutes: 30,
  wind_alert_ms: [0.15, 0.3, 0.5],
  wind_alert_until_days: [14, 21, 28],
  manual_id: 0,
  manual_fan: false,
  manual_lamp: false,
};

function numberOr(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function integerOr(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isInteger(value) ? value : fallback;
}

function booleanOr(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function numberTupleOr(
  value: unknown,
  fallback: [number, number, number],
): [number, number, number] {
  if (
    !Array.isArray(value) ||
    value.length !== 3 ||
    !value.every((item) => typeof item === "number" && Number.isFinite(item))
  ) {
    return [...fallback];
  }
  return [value[0], value[1], value[2]];
}

function integerTupleOr(
  value: unknown,
  fallback: [number, number, number],
): [number, number, number] {
  if (
    !Array.isArray(value) ||
    value.length !== 3 ||
    !value.every((item) => typeof item === "number" && Number.isInteger(item))
  ) {
    return [...fallback];
  }
  return [value[0], value[1], value[2]];
}

export function deviceConfigFromRow(
  row: Record<string, unknown> | null,
): DeviceConfig {
  if (!row) {
    return {
      ...defaultDeviceConfig,
      wind_alert_ms: [...defaultDeviceConfig.wind_alert_ms],
      wind_alert_until_days: [...defaultDeviceConfig.wind_alert_until_days],
    };
  }

  return {
    flock_start: typeof row.flock_start === "string" ? row.flock_start : null,
    age_override_days:
      typeof row.age_override_days === "number" &&
      Number.isInteger(row.age_override_days)
        ? row.age_override_days
        : null,
    mode: row.mode === "manual" ? "manual" : "auto",
    fan_on_delta: numberOr(row.fan_on_delta, defaultDeviceConfig.fan_on_delta),
    fan_off_delta: numberOr(row.fan_off_delta, defaultDeviceConfig.fan_off_delta),
    lamp_on_delta: numberOr(
      row.lamp_on_delta,
      defaultDeviceConfig.lamp_on_delta,
    ),
    lamp_off_delta: numberOr(
      row.lamp_off_delta,
      defaultDeviceConfig.lamp_off_delta,
    ),
    temp_warn_delta: numberOr(
      row.temp_warn_delta,
      defaultDeviceConfig.temp_warn_delta,
    ),
    temp_crit_delta: numberOr(
      row.temp_crit_delta,
      defaultDeviceConfig.temp_crit_delta,
    ),
    brood_days: integerOr(row.brood_days, defaultDeviceConfig.brood_days),
    fan_max_on_s: integerOr(
      row.fan_max_on_s,
      defaultDeviceConfig.fan_max_on_s,
    ),
    fan_rest_s: integerOr(row.fan_rest_s, defaultDeviceConfig.fan_rest_s),
    hum_low: numberOr(row.hum_low, defaultDeviceConfig.hum_low),
    hum_high: numberOr(row.hum_high, defaultDeviceConfig.hum_high),
    hum_brood_low: numberOr(
      row.hum_brood_low,
      defaultDeviceConfig.hum_brood_low,
    ),
    hum_brood_days: integerOr(
      row.hum_brood_days,
      defaultDeviceConfig.hum_brood_days,
    ),
    batt_warn_v: numberOr(row.batt_warn_v, defaultDeviceConfig.batt_warn_v),
    batt_crit_v: numberOr(row.batt_crit_v, defaultDeviceConfig.batt_crit_v),
    min_switch_s: integerOr(
      row.min_switch_s,
      defaultDeviceConfig.min_switch_s,
    ),
    manual_minutes: integerOr(
      row.manual_minutes,
      defaultDeviceConfig.manual_minutes,
    ),
    wind_alert_ms: numberTupleOr(
      row.wind_alert_ms,
      defaultDeviceConfig.wind_alert_ms,
    ),
    wind_alert_until_days: integerTupleOr(
      row.wind_alert_until_days,
      defaultDeviceConfig.wind_alert_until_days,
    ),
    manual_id: integerOr(row.manual_id, defaultDeviceConfig.manual_id),
    manual_fan: booleanOr(row.manual_fan, defaultDeviceConfig.manual_fan),
    manual_lamp: booleanOr(row.manual_lamp, defaultDeviceConfig.manual_lamp),
  };
}
