"use client";

import React, { useState, useEffect } from "react";
import { Country, State, City, ICountry, IState, ICity } from "country-state-city";

interface CountryStateCityProps {
  country: string;
  state: string;
  city: string;
  onCountryChange: (country: string) => void;
  onStateChange: (state: string) => void;
  onCityChange: (city: string) => void;
  countryLabel?: string;
  stateLabel?: string;
  cityLabel?: string;
  countryRequired?: boolean;
  stateRequired?: boolean;
  cityRequired?: boolean;
  className?: string;
  restrictToIndia?: boolean; // If true, country is locked to India and not selectable
}

const CountryStateCity: React.FC<CountryStateCityProps> = ({
  country,
  state,
  city,
  onCountryChange,
  onStateChange,
  onCityChange,
  countryLabel = "Country",
  stateLabel = "State",
  cityLabel = "City",
  countryRequired = false,
  stateRequired = false,
  cityRequired = false,
  className = "",
  restrictToIndia = false,
}) => {
  const [countries, setCountries] = useState<ICountry[]>([]);
  const [states, setStates] = useState<IState[]>([]);
  const [cities, setCities] = useState<ICity[]>([]);

  // Load countries on mount
  useEffect(() => {
    const allCountries = Country.getAllCountries();
    // Sort countries alphabetically
    const sortedCountries = allCountries.sort((a, b) => a.name.localeCompare(b.name));
    setCountries(sortedCountries);
  }, []);

  // Load states when country changes
  useEffect(() => {
    if (country) {
      const countryData = Country.getCountryByCode(country);
      if (countryData) {
        const countryStates = State.getStatesOfCountry(country);
        const sortedStates = countryStates.sort((a, b) => a.name.localeCompare(b.name));
        setStates(sortedStates);
        // Reset state and city when country changes
        if (state) {
          onStateChange("");
          onCityChange("");
        }
      }
    } else {
      setStates([]);
      setCities([]);
      if (state) onStateChange("");
      if (city) onCityChange("");
    }
  }, [country]);

  // Load cities when state changes
  useEffect(() => {
    if (country && state) {
      const stateData = State.getStateByCodeAndCountry(state, country);
      if (stateData) {
        const stateCities = City.getCitiesOfState(country, state);
        const sortedCities = stateCities.sort((a, b) => a.name.localeCompare(b.name));
        setCities(sortedCities);
        // Reset city when state changes (unless it's manual entry)
        if (city && city !== "__manual__") {
          onCityChange("");
        }
      }
    } else {
      setCities([]);
      if (city && city !== "__manual__") onCityChange("");
    }
  }, [country, state]);

  // Set default to India if no country selected or if restricted to India
  useEffect(() => {
    if (restrictToIndia) {
      // Always enforce India when restricted
      if (country !== "IN") {
        onCountryChange("IN");
      }
    } else if (!country) {
      // Only set default if not restricted and no country selected
      const india = Country.getCountryByCode("IN");
      if (india) {
        onCountryChange("IN");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restrictToIndia]);

  // Get India country data
  const indiaCountry = Country.getCountryByCode("IN");

  return (
    <>
      {/* Country Select - Disabled if restricted to India */}
      {!restrictToIndia ? (
        <div className={className}>
          <label className="caption1 capitalize font-medium block mb-2">
            {countryLabel} {countryRequired && <span className="text-red">*</span>}
          </label>
          <select
            className="border border-line px-4 py-3 w-full rounded-lg focus:ring-2 focus:ring-purple-200 focus:border-purple-500 transition-all bg-white hover:border-purple-300"
            value={country}
            onChange={(e) => onCountryChange(e.target.value)}
            required={countryRequired}
          >
            <option value="">Select {countryLabel}</option>
            {countries.map((countryItem) => (
              <option key={countryItem.isoCode} value={countryItem.isoCode}>
                {countryItem.name}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div className={className}>
          <label className="caption1 capitalize font-medium block mb-2">
            {countryLabel} {countryRequired && <span className="text-red">*</span>}
          </label>
          <input
            type="text"
            className="border border-line px-4 py-3 w-full rounded-lg bg-gray-100 cursor-not-allowed"
            value={indiaCountry?.name || "India"}
            disabled
            readOnly
          />
          <p className="text-xs text-secondary mt-1">Currently, we only deliver to India</p>
        </div>
      )}

      {/* State Select */}
      <div className={className}>
        <label className="caption1 capitalize font-medium block mb-2">
          {stateLabel} {stateRequired && <span className="text-red">*</span>}
        </label>
        <select
          className="border border-line px-4 py-3 w-full rounded-lg focus:ring-2 focus:ring-purple-200 focus:border-purple-500 transition-all bg-white hover:border-purple-300 disabled:bg-gray-100 disabled:cursor-not-allowed"
          value={state}
          onChange={(e) => onStateChange(e.target.value)}
          required={stateRequired}
          disabled={!country || states.length === 0}
        >
          <option value="">
            {!country ? `Select ${countryLabel} first` : states.length === 0 ? "No states available" : `Select ${stateLabel}`}
          </option>
          {states.map((stateItem) => (
            <option key={stateItem.isoCode} value={stateItem.isoCode}>
              {stateItem.name}
            </option>
          ))}
        </select>
      </div>

      {/* City Select */}
      <div className={className}>
        <label className="caption1 capitalize font-medium block mb-2">
          {cityLabel} {cityRequired && <span className="text-red">*</span>}
        </label>
        {cities.length > 0 && city !== "__manual__" ? (
          <>
            <select
              className="border border-line px-4 py-3 w-full rounded-lg focus:ring-2 focus:ring-purple-200 focus:border-purple-500 transition-all bg-white hover:border-purple-300 disabled:bg-gray-100 disabled:cursor-not-allowed"
              value={city}
              onChange={(e) => {
                if (e.target.value === "__manual__") {
                  onCityChange("__manual__");
                } else {
                  onCityChange(e.target.value);
                }
              }}
              required={cityRequired}
              disabled={!state}
            >
              <option value="">
                {!state ? `Select ${stateLabel} first` : `Select ${cityLabel}`}
              </option>
              {cities.map((cityItem) => (
                <option key={cityItem.name} value={cityItem.name}>
                  {cityItem.name}
                </option>
              ))}
              <option value="__manual__">Other (Enter manually)</option>
            </select>
          </>
        ) : (
          <input
            type="text"
            className="border border-line px-4 py-3 w-full rounded-lg focus:ring-2 focus:ring-purple-200 focus:border-purple-500 transition-all bg-white hover:border-purple-300 disabled:bg-gray-100 disabled:cursor-not-allowed"
            value={city === "__manual__" ? "" : city}
            onChange={(e) => onCityChange(e.target.value)}
            placeholder={!state ? `Select ${stateLabel} first` : `Enter ${cityLabel}`}
            required={cityRequired}
            disabled={!state}
          />
        )}
      </div>
    </>
  );
};

export default CountryStateCity;
