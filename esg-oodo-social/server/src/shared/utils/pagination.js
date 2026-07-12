/**
 * Parse and validate pagination + sorting query params
 * @returns { skip, take, page, limit, sortBy, sortOrder }
 */
const parsePagination = (query) => {
  const page  = Math.max(1, parseInt(query.page)  || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 10));
  const skip  = (page - 1) * limit;

  const allowedSortOrders = ['asc', 'desc'];
  const sortOrder = allowedSortOrders.includes(query.sortOrder?.toLowerCase())
    ? query.sortOrder.toLowerCase()
    : 'desc';

  const sortBy = query.sortBy || 'createdAt';

  return { skip, take: limit, page, limit, sortBy, sortOrder };
};

module.exports = { parsePagination };
