import { type ContactPointPageInfoDTO } from 'src/engine/core-modules/contact-points/dtos/contact-point-page-info.dto';
import { type CustomerContactPointDTO } from 'src/engine/core-modules/contact-points/dtos/customer-contact-point.dto';

export const mergeSortAndSliceContactPoints = ({
  contactPoints,
  page,
  pageSize,
}: {
  contactPoints: CustomerContactPointDTO[];
  page: number;
  pageSize: number;
}): {
  contactPoints: CustomerContactPointDTO[];
  pageInfo: ContactPointPageInfoDTO;
  totalCount: number;
} => {
  const safePage = Math.max(page, 1);
  const safePageSize = Math.max(pageSize, 1);
  const offset = (safePage - 1) * safePageSize;
  const sortedContactPoints = [...contactPoints].sort(
    (a, b) => b.occurredAt.getTime() - a.occurredAt.getTime(),
  );
  const paginatedContactPoints = sortedContactPoints.slice(
    offset,
    offset + safePageSize,
  );

  return {
    contactPoints: paginatedContactPoints,
    totalCount: sortedContactPoints.length,
    pageInfo: {
      page: safePage,
      pageSize: safePageSize,
      hasMore: offset + safePageSize < sortedContactPoints.length,
    },
  };
};
