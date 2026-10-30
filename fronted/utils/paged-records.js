async function loadFilteredPage(options = {}) {
  const {
    db,
    collection,
    where = {},
    orderBy = 'createTime',
    order = 'desc',
    pageIndex = 0,
    pageSize = 10,
    filter = () => true,
    map = item => item,
    enrich,
    maxScanPages = 50
  } = options;

  let nextPageIndex = pageIndex;
  let noMore = false;
  let scanned = 0;
  const list = [];

  while (list.length < pageSize && scanned < maxScanPages) {
    const res = await db.collection(collection)
      .where(where)
      .orderBy(orderBy, order)
      .skip(nextPageIndex * pageSize)
      .limit(pageSize)
      .get();
    const rows = res.data || [];
    rows.filter(filter).forEach(item => list.push(map(item)));
    nextPageIndex += 1;
    scanned += 1;
    if (rows.length < pageSize) {
      noMore = true;
      break;
    }
  }

  const nextList = enrich ? await enrich(list) : list;
  return {
    list: nextList,
    nextPageIndex,
    noMore
  };
}

module.exports = {
  loadFilteredPage
};
