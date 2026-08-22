import { Prisma } from "@prisma/client";

// Which column tripped a P2002 unique violation.
//
// Prisma 6 reported this as meta.target = ["email"]. With a driver adapter
// Prisma 7 reports it further down, under
// meta.driverAdapterError.cause.constraint.fields. Both shapes are read here
// so this keeps working either way, and callers get undefined rather than a
// TypeError when neither is present.
export function duplicatedField(
  error: Prisma.PrismaClientKnownRequestError,
): string | undefined {
  const meta = error.meta as any;
  if (!meta) return undefined;

  const fields = meta.driverAdapterError?.cause?.constraint?.fields;
  if (Array.isArray(fields) && fields.length > 0) return fields[0];

  const target = meta.target;
  if (Array.isArray(target) && target.length > 0) return target[0];
  if (typeof target === "string") return target;

  return undefined;
}
