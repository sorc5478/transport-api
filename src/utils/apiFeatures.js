/**
 * API 功能類，用於處理查詢、過濾、排序、分頁等
 */
class APIFeatures {
  /**
   * 初始化 APIFeatures 實例
   * @param {Object} query - Mongoose 查詢物件
   * @param {Object} queryString - Express 請求查詢字串 (req.query)
   */
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
  }

  /**
   * 過濾查詢結果
   * @returns {APIFeatures} 當前 APIFeatures 實例
   */
  filter() {
    const queryObj = { ...this.queryString };
    const excludedFields = ['page', 'sort', 'limit', 'fields'];
    excludedFields.forEach(el => delete queryObj[el]);

    // 高級過濾 (支援 gt, gte, lt, lte)
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, match => `$${match}`);

    this.query = this.query.find(JSON.parse(queryStr));

    return this;
  }

  /**
   * 排序查詢結果
   * @returns {APIFeatures} 當前 APIFeatures 實例
   */
  sort() {
    if (this.queryString.sort) {
      const sortBy = this.queryString.sort.split(',').join(' ');
      this.query = this.query.sort(sortBy);
    } else {
      this.query = this.query.sort('-createdAt');
    }

    return this;
  }

  /**
   * 限制返回的欄位
   * @returns {APIFeatures} 當前 APIFeatures 實例
   */
  limitFields() {
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(',').join(' ');
      this.query = this.query.select(fields);
    } else {
      this.query = this.query.select('-__v');
    }

    return this;
  }

  /**
   * 分頁查詢結果
   * @returns {APIFeatures} 當前 APIFeatures 實例
   */
  paginate() {
    const page = parseInt(this.queryString.page, 10) || 1;
    const limit = parseInt(this.queryString.limit, 10) || 10;
    const skip = (page - 1) * limit;

    this.query = this.query.skip(skip).limit(limit);

    return this;
  }

  /**
   * 添加租戶 ID 過濾
   * @param {String} tenantId - 租戶 ID
   * @returns {APIFeatures} 當前 APIFeatures 實例
   */
  tenant(tenantId) {
    if (tenantId) {
      this.query = this.query.find({ tenantId });
    }
    return this;
  }
}

module.exports = APIFeatures;
