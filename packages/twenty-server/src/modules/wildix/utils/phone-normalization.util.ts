import { isDefined } from 'twenty-shared/utils';

// Extract the subscriber number and calling code from a full phone number.
// Twenty CRM stores these separately:
//   phonesPrimaryPhoneNumber = "3402541709" (subscriber digits only)
//   phonesPrimaryPhoneCallingCode = "+39" (with + prefix)
//
// Examples:
//   +393****2338  ->  { subscriberNumber: "3487432338", callingCode: "+39" }
//   +130****1234   ->  { subscriberNumber: "3025551234", callingCode: "+1" }
//   003912345678   ->  { subscriberNumber: "12345678",   callingCode: "+39" }
//   0612345678     ->  { subscriberNumber: "612345678",  callingCode: "" }
//   3487432338     ->  { subscriberNumber: "3487432338", callingCode: "" }
export function extractSubscriberAndCallingCode(phone: string): {
  subscriberNumber: string;
  callingCode: string;
} {
  if (!isDefined(phone) || phone.trim() === '') {
    return { subscriberNumber: '', callingCode: '' };
  }

  // Remove spaces, dashes, parentheses
  let cleaned = phone.replace(/[\s\-().]/g, '');

  // Strip leading + and identify the calling code
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.slice(1); // Remove the +

    // Common calling codes (longest match first to avoid ambiguity)
    const twoDigitCodes = [
      '39',
      '44',
      '33',
      '49',
      '34',
      '31',
      '32',
      '41',
      '43',
      '46',
      '47',
      '48',
      '30',
      '45',
      '36',
      '40',
      '35',
      '38',
      '37',
      '42',
      '90',
      '91',
      '92',
      '93',
      '94',
      '95',
      '98',
      '20',
      '27',
      '55',
      '52',
      '54',
      '370',
      '56',
      '57',
      '58',
      '60',
      '61',
      '62',
      '63',
      '64',
      '65',
      '66',
      '81',
      '82',
      '84',
      '86',
    ];
    const oneDigitCodes = ['1', '7'];

    const twoDigit = cleaned.slice(0, 2);

    if (twoDigitCodes.includes(twoDigit)) {
      return {
        subscriberNumber: cleaned.slice(2),
        callingCode: `+${twoDigit}`,
      };
    }

    const oneDigit = cleaned.slice(0, 1);

    if (oneDigitCodes.includes(oneDigit)) {
      return {
        subscriberNumber: cleaned.slice(1),
        callingCode: `+${oneDigit}`,
      };
    }

    // Unknown calling code — return digits without code
    return { subscriberNumber: cleaned.replace(/\D/g, ''), callingCode: '' };
  }

  // Handle 00-prefixed international format (e.g. 0039123...)
  if (cleaned.startsWith('00')) {
    return extractSubscriberAndCallingCode('+' + cleaned.slice(2));
  }

  // Strip leading 0 for local formats (e.g. 0612345678 -> 612345678)
  if (cleaned.startsWith('0') && cleaned.length > 8) {
    return {
      subscriberNumber: cleaned.slice(1).replace(/\D/g, ''),
      callingCode: '',
    };
  }

  // Already subscriber digits, no calling code
  return { subscriberNumber: cleaned.replace(/\D/g, ''), callingCode: '' };
}

// Convenience wrapper — returns just the subscriber number for simple lookups
export function normalizePhoneNumber(phone: string): string {
  return extractSubscriberAndCallingCode(phone).subscriberNumber;
}

// Strip all non-digit characters and return the last N digits.
// Used for fuzzy matching against unnormalized phone data.
export function extractLastNDigits(phone: string, digits: number = 9): string {
  if (!isDefined(phone) || phone.trim() === '') {
    return '';
  }

  const digitsOnly = phone.replace(/\D/g, '');

  if (digitsOnly.length < digits) {
    return digitsOnly;
  }

  return digitsOnly.slice(-digits);
}
