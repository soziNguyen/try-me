const paginationHelper = (page, limit) => {
  const currentPage = Math.max(parseInt(page) || 1, 1);  // Trang hiện tại, mặc định là 1
  const perPage = Math.max(parseInt(limit) || 100, 1);   // Số lượng item mỗi trang, mặc định 100
  const skip = (currentPage - 1) * perPage;             // Số item cần bỏ qua

  return { currentPage, perPage, skip };
};

export default paginationHelper

