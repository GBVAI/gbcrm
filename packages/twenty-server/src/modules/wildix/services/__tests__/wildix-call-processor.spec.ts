import {
  extractSubscriberAndCallingCode,
  normalizePhoneNumber,
} from 'src/modules/wildix/services/wildix-call-processor.service';

describe('extractSubscriberAndCallingCode', () => {
  it('should extract Italy +39', () => {
    expect(extractSubscriberAndCallingCode('+393487432338')).toEqual({
      subscriberNumber: '3487432338',
      callingCode: '+39',
    });
  });

  it('should extract US +1', () => {
    expect(extractSubscriberAndCallingCode('+13025551234')).toEqual({
      subscriberNumber: '3025551234',
      callingCode: '+1',
    });
  });

  it('should extract UK +44', () => {
    expect(extractSubscriberAndCallingCode('+447911123456')).toEqual({
      subscriberNumber: '7911123456',
      callingCode: '+44',
    });
  });

  it('should extract France +33', () => {
    expect(extractSubscriberAndCallingCode('+33612345678')).toEqual({
      subscriberNumber: '612345678',
      callingCode: '+33',
    });
  });

  it('should extract Germany +49', () => {
    expect(extractSubscriberAndCallingCode('+49123456789')).toEqual({
      subscriberNumber: '123456789',
      callingCode: '+49',
    });
  });

  it('should handle 00-prefixed international format', () => {
    expect(extractSubscriberAndCallingCode('003912345678')).toEqual({
      subscriberNumber: '12345678',
      callingCode: '+39',
    });
  });

  it('should return empty callingCode for local format with leading 0', () => {
    expect(extractSubscriberAndCallingCode('0612345678')).toEqual({
      subscriberNumber: '612345678',
      callingCode: '',
    });
  });

  it('should return empty callingCode for bare subscriber number', () => {
    expect(extractSubscriberAndCallingCode('3487432338')).toEqual({
      subscriberNumber: '3487432338',
      callingCode: '',
    });
  });

  it('should return empty for empty input', () => {
    expect(extractSubscriberAndCallingCode('')).toEqual({
      subscriberNumber: '',
      callingCode: '',
    });
  });

  it('should strip spaces before extracting', () => {
    expect(extractSubscriberAndCallingCode('+39 348 743 2338')).toEqual({
      subscriberNumber: '3487432338',
      callingCode: '+39',
    });
  });

  it('should strip dashes before extracting', () => {
    expect(extractSubscriberAndCallingCode('+39-348-743-2338')).toEqual({
      subscriberNumber: '3487432338',
      callingCode: '+39',
    });
  });

  it('should return empty for non-numeric Anonymous', () => {
    expect(extractSubscriberAndCallingCode('Anonymous')).toEqual({
      subscriberNumber: '',
      callingCode: '',
    });
  });

  it('should return empty for whitespace-only input', () => {
    expect(extractSubscriberAndCallingCode('   ')).toEqual({
      subscriberNumber: '',
      callingCode: '',
    });
  });
});

describe('normalizePhoneNumber (convenience wrapper)', () => {
  it('should return subscriber number only', () => {
    expect(normalizePhoneNumber('+393487432338')).toBe('3487432338');
  });

  it('should return empty for empty input', () => {
    expect(normalizePhoneNumber('')).toBe('');
  });
});
