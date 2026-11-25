export interface Dog {
  id: string;
  ownerId: string;
  name: string;
  breed: string | null;
  /** Calendar date as YYYY-MM-DD, or null when unknown. */
  birthDate: string | null;
  createdAt: string;
  updatedAt: string;
}

/** What the dog form holds: raw text, nothing parsed yet. */
export interface DogFormInput {
  name: string;
  breed: string;
  birthDate: string;
}

/** A dog's editable fields, cleaned and ready to save. */
export interface DogValues {
  name: string;
  breed: string | null;
  birthDate: string | null;
}

export interface DogFormErrors {
  name?: string;
  breed?: string;
  birthDate?: string;
}

export const MAX_DOG_NAME_LENGTH = 80;
export const MAX_BREED_LENGTH = 80;
/** No dog lives this long, so an earlier date is almost certainly a typo. */
export const MAX_DOG_AGE_YEARS = 40;

const DATE_SHAPE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Today's calendar date in the local time zone, as YYYY-MM-DD. */
export function toLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Splits a YYYY-MM-DD string into numbers, or null if it is not a real calendar date. */
export function parseDate(value: string): { year: number; month: number; day: number } | null {
  const match = DATE_SHAPE.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const check = new Date(Date.UTC(year, month - 1, day));
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) {
    return null;
  }
  return { year, month, day };
}

export function validateDog(input: DogFormInput, today: Date = new Date()): DogFormErrors {
  const errors: DogFormErrors = {};
  const name = input.name.trim();
  const breed = input.breed.trim();
  const birthDate = input.birthDate.trim();

  if (name.length === 0) errors.name = "Enter your dog's name.";
  else if (name.length > MAX_DOG_NAME_LENGTH) errors.name = `Use ${MAX_DOG_NAME_LENGTH} characters or fewer.`;

  if (breed.length > MAX_BREED_LENGTH) errors.breed = `Use ${MAX_BREED_LENGTH} characters or fewer.`;

  if (birthDate.length > 0) {
    const parsed = parseDate(birthDate);
    const todayString = toLocalDateString(today);
    if (!parsed) {
      errors.birthDate = 'Use the format YYYY-MM-DD, for example 2021-04-18.';
    } else if (birthDate > todayString) {
      errors.birthDate = 'The birth date cannot be in the future.';
    } else if (parsed.year < today.getFullYear() - MAX_DOG_AGE_YEARS) {
      errors.birthDate = 'Check the year. That would be a very old dog.';
    }
  }

  return errors;
}

/** Cleans form text for saving. Call only after validateDog finds no errors. */
export function parseDogInput(input: DogFormInput): DogValues {
  const breed = input.breed.trim();
  const birthDate = input.birthDate.trim();
  return {
    name: input.name.trim(),
    breed: breed.length > 0 ? breed : null,
    birthDate: birthDate.length > 0 ? birthDate : null,
  };
}

function plural(count: number, unit: string): string {
  return `${count} ${unit}${count === 1 ? '' : 's'}`;
}

/** A short age such as "3 years" or "5 months", or null if the birth date is missing or not valid. */
export function formatAge(birthDate: string | null, today: Date = new Date()): string | null {
  if (!birthDate) return null;
  const born = parseDate(birthDate);
  if (!born) return null;

  let months = (today.getFullYear() - born.year) * 12 + (today.getMonth() + 1 - born.month);
  if (today.getDate() < born.day) months -= 1;
  if (months < 0) return null;
  if (months < 1) return 'Under 1 month';
  if (months < 24) return plural(months, 'month');
  return plural(Math.floor(months / 12), 'year');
}
