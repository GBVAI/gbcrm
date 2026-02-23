import { normalizePhoneNumber } from 'src/modules/wildix/services/wildix-call-processor.service';

describe('normalizePhoneNumber', () => {
  it('should strip Italy +39 calling code from E.164 number', () => {
    expect(normalizePhoneNumber('+393487432338')).toBe('3487432338');
  });

  it('should strip US/Canada +1 calling code from E.164 number', () => {
    expect(normalizePhoneNumber('+13025551234')).toBe('3025551234');
  });

  it('should strip UK +44 calling code from E.164 number', () => {
    expect(normalizePhoneNumber('+447911123456')).toBe('7911123456');
  });

  it('should strip France +33 calling code from E.164 number', () => {
    expect(normalizePhoneNumber('+33612345678')).toBe('612345678');
  });

  it('should strip Germany +49 calling code from E.164 number', () => {
    expect(normalizePhoneNumber('+49123456789')).toBe('123456789');
  });

  it('should handle 00-prefixed international format and strip calling code', () => {
    // 0039 = 00 (international exit code) + 39 (Italy)
    expect(normalizePhoneNumber('003912345678')).toBe('12345678');
  });

  it('should strip leading 0 for local format numbers longer than 8 digits', () => {
    expect(normalizePhoneNumber('0612345678')).toBe('612345678');
  });

  it('should return the number unchanged when already a subscriber number with no prefix', () => {
    expect(normalizePhoneNumber('3487432338')).toBe('3487432338');
  });

  it('should return empty string for empty input', () => {
    expect(normalizePhoneNumber('')).toBe('');
  });

  it('should strip spaces and then strip the calling code', () => {
    expect(normalizePhoneNumber('+39 348 743 2338')).toBe('3487432338');
  });

  it('should strip dashes and then strip the calling code', () => {
    expect(normalizePhoneNumber('+39-348-743-2338')).toBe('3487432338');
  });

  it('should return empty string for non-numeric input like Anonymous', () => {
    expect(normalizePhoneNumber('Anonymous')).toBe('');
  });

  it('should return empty string for non-numeric input like unknown', () => {
    expect(normalizePhoneNumber('unknown')).toBe('');
  });

  it('should return empty string for whitespace-only input', () => {
    expect(normalizePhoneNumber('   ')).toBe('');
  });
});
