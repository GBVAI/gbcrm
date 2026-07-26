import { type ContactPointSourceDiagnosticDTO } from 'src/engine/core-modules/contact-points/dtos/contact-point-source-diagnostic.dto';

export const buildContactPointSourceDiagnostic = ({
  ok,
  count,
  error,
}: {
  ok: boolean;
  count: number;
  error?: unknown;
}): ContactPointSourceDiagnosticDTO => ({
  ok,
  count,
  error: error instanceof Error ? error.message : error ? String(error) : null,
});
