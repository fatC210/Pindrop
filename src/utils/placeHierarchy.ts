export interface PlaceAddress {
  city?: string;
  municipality?: string;
  state_district?: string;
  town?: string;
  village?: string;
  hamlet?: string;
  county?: string;
  state?: string;
  province?: string;
  suburb?: string;
  city_district?: string;
  district?: string;
  borough?: string;
  neighbourhood?: string;
  quarter?: string;
  residential?: string;
  road?: string;
  country?: string;
}

export interface PlaceHierarchy {
  cityName: string;
  regionName?: string;
  countryName: string;
}

interface ExtractPlaceHierarchyOptions {
  unknownLocationLabel: string;
  unknownCountryLabel: string;
}

function normalizeName(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function isStreetLevelName(value: string | undefined): boolean {
  const normalized = normalizeName(value);
  if (!normalized) {
    return false;
  }

  return (
    /(?:street|st\.?|road|rd\.?|avenue|ave\.?|lane|ln\.?|drive|dr\.?|court|ct\.?|boulevard|blvd\.?|way)\b/i.test(
      normalized
    ) ||
    /(街道|大道|大街|街|路|巷|胡同|弄|社区|小区)$/.test(normalized)
  );
}

function firstDefined(...values: Array<string | undefined>): string | undefined {
  for (const value of values) {
    const normalized = normalizeName(value);
    if (normalized) {
      return normalized;
    }
  }

  return undefined;
}

function firstDistinct(
  excludedValues: string[],
  ...values: Array<string | undefined>
): string | undefined {
  const excluded = new Set(excludedValues.map((value) => value.trim()).filter(Boolean));

  for (const value of values) {
    const normalized = normalizeName(value);
    if (normalized && !excluded.has(normalized)) {
      return normalized;
    }
  }

  return undefined;
}

export function extractPlaceHierarchy(
  address: PlaceAddress,
  { unknownLocationLabel, unknownCountryLabel }: ExtractPlaceHierarchyOptions
): PlaceHierarchy {
  const cityLevelName = firstDefined(
    address.city,
    address.municipality,
    address.state_district
  );
  const rawSettlementName = firstDefined(address.town, address.village, address.hamlet);
  const settlementName = isStreetLevelName(rawSettlementName)
    ? undefined
    : rawSettlementName;
  const adminLevelName = firstDefined(address.state, address.province);
  const countyName = normalizeName(address.county);
  const districtLevelName = firstDefined(
    address.city_district,
    address.district,
    address.borough
  );

  const cityName =
    cityLevelName ??
    settlementName ??
    (adminLevelName && countyName ? adminLevelName : undefined) ??
    adminLevelName ??
    countyName ??
    unknownLocationLabel;

  const regionName = firstDistinct(
    [cityName],
    districtLevelName,
    cityLevelName ? countyName : undefined,
    cityName === settlementName ? countyName : undefined,
    cityName === adminLevelName ? countyName : undefined
  );

  return {
    cityName,
    regionName,
    countryName: firstDefined(address.country) ?? unknownCountryLabel,
  };
}
