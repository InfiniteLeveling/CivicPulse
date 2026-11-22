import test from "node:test";
import assert from "node:assert/strict";
import {
  latitudeSchema,
  longitudeSchema,
  locationSelectionSchema,
  validateCoordinates,
  formatCoordinate,
} from "../src/lib/validation/location.ts";

test("latitudeSchema accepts valid latitudes between -90 and 90 including 0 and boundaries", () => {
  const valid = [0, 22.5726, -33.8688, 90, -90, 45.123456];
  for (const lat of valid) {
    assert.equal(latitudeSchema.parse(lat), lat);
  }

  assert.throws(() => latitudeSchema.parse(90.0001), /cannot exceed 90 degrees/);
  assert.throws(() => latitudeSchema.parse(-90.0001), /cannot be less than -90 degrees/);
  assert.throws(() => latitudeSchema.parse(NaN), /Latitude must be a valid number/);
  assert.throws(() => latitudeSchema.parse(Infinity), /Latitude must be a valid number/);
  assert.throws(() => latitudeSchema.parse(-Infinity), /Latitude must be a valid number/);
  assert.throws(() => latitudeSchema.parse("invalid"), /Latitude must be a valid number/);
});

test("longitudeSchema accepts valid longitudes between -180 and 180 including 0 and boundaries", () => {
  const valid = [0, 88.3639, -122.4194, 180, -180, -0.1278];
  for (const lng of valid) {
    assert.equal(longitudeSchema.parse(lng), lng);
  }

  assert.throws(() => longitudeSchema.parse(180.0001), /cannot exceed 180 degrees/);
  assert.throws(() => longitudeSchema.parse(-180.0001), /cannot be less than -180 degrees/);
  assert.throws(() => longitudeSchema.parse(NaN), /Longitude must be a valid number/);
  assert.throws(() => longitudeSchema.parse(Infinity), /Longitude must be a valid number/);
  assert.throws(() => longitudeSchema.parse(-Infinity), /Longitude must be a valid number/);
  assert.throws(() => longitudeSchema.parse("invalid"), /Longitude must be a valid number/);
});

test("locationSelectionSchema validates complete location selections across sources", () => {
  const gpsLocation = {
    latitude: 19.3149,
    longitude: 84.7941,
    source: "gps",
    accuracyMeters: 14.5,
    confirmed: true,
  };
  assert.deepEqual(locationSelectionSchema.parse(gpsLocation), gpsLocation);

  const mapLocation = {
    latitude: 28.6139,
    longitude: 77.209,
    source: "map",
    confirmed: false,
  };
  assert.deepEqual(locationSelectionSchema.parse(mapLocation), mapLocation);

  const manualLocation = {
    latitude: -34.6037,
    longitude: -58.3816,
    source: "manual",
    confirmed: true,
  };
  assert.deepEqual(locationSelectionSchema.parse(manualLocation), manualLocation);

  // Invalid source
  assert.throws(
    () =>
      locationSelectionSchema.parse({
        latitude: 10,
        longitude: 20,
        source: "satellite",
        confirmed: true,
      }),
    /Invalid option/
  );
});

test("validateCoordinates helper validates and returns friendly field errors", () => {
  const validRes = validateCoordinates(19.3149, 84.7941);
  assert.equal(validRes.valid, true);
  assert.equal(validRes.errors.latitude, null);
  assert.equal(validRes.errors.longitude, null);

  const stringCoords = validateCoordinates("19.3149", "84.7941");
  assert.equal(stringCoords.valid, true);

  const invalidLat = validateCoordinates(95, 84.7941);
  assert.equal(invalidLat.valid, false);
  assert.match(invalidLat.errors.latitude, /cannot exceed 90 degrees/);

  const invalidLng = validateCoordinates(19.3149, 200);
  assert.equal(invalidLng.valid, false);
  assert.match(invalidLng.errors.longitude, /cannot exceed 180 degrees/);
});

test("formatCoordinate formats numeric coordinates cleanly and handles empty values", () => {
  assert.equal(formatCoordinate(19.3149023, 5), "19.31490");
  assert.equal(formatCoordinate(-33.8688, 4), "-33.8688");
  assert.equal(formatCoordinate(0, 2), "0.00");
  assert.equal(formatCoordinate(null), "");
  assert.equal(formatCoordinate(undefined), "");
  assert.equal(formatCoordinate(NaN), "");
});
