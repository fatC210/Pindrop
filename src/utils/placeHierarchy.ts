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
  pedestrian?: string;
  footway?: string;
  cycleway?: string;
  amenity?: string;
  leisure?: string;
  tourism?: string;
  shop?: string;
  commercial?: string;
  retail?: string;
  industrial?: string;
  office?: string;
  railway?: string;
  public_transport?: string;
  aeroway?: string;
  highway?: string;
  landuse?: string;
  natural?: string;
  water?: string;
  waterway?: string;
  historic?: string;
  man_made?: string;
  beach?: string;
  bay?: string;
  harbour?: string;
  marina?: string;
  pier?: string;
  dock?: string;
  bridge?: string;
  school?: string;
  university?: string;
  college?: string;
  stadium?: string;
  country?: string;
}

export interface PlaceHierarchy {
  cityName: string;
  administrativeRegionName?: string;
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
    /(?:\u8857\u9053|\u5927\u9053|\u5927\u8857|\u8def|\u8857|\u793e\u533a|\u5c0f\u533a)$/.test(
      normalized
    )
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
  const administrativeRegionName = firstDefined(address.state, address.province);
  const countyName = isStreetLevelName(address.county)
    ? undefined
    : normalizeName(address.county);
  const rawDistrictLevelName = firstDefined(
    address.city_district,
    address.district,
    address.borough
  );
  const districtLevelName = isStreetLevelName(rawDistrictLevelName)
    ? undefined
    : rawDistrictLevelName;

  const cityName =
    cityLevelName ??
    settlementName ??
    (administrativeRegionName && countyName ? administrativeRegionName : undefined) ??
    administrativeRegionName ??
    countyName ??
    unknownLocationLabel;

  const regionName = firstDistinct(
    [cityName, administrativeRegionName ?? ''],
    districtLevelName,
    cityLevelName ? countyName : undefined,
    cityName === settlementName ? countyName : undefined,
    cityName === administrativeRegionName ? countyName : undefined
  );

  return {
    cityName,
    administrativeRegionName,
    regionName,
    countryName: firstDefined(address.country) ?? unknownCountryLabel,
  };
}
