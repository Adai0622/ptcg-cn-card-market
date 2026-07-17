(function () {
  const normalize = (value = '') => String(value).toLowerCase().replace(/[\s·・]/g, '');
  const keyOf = (record) => `${normalize(record.name)}|${normalize(record.setCode)}`;

  function normalizeRecord(record) {
    const price = record.price === null || record.price === '' || record.price === undefined ? null : Number(record.price);
    return {
      name: String(record.name || ''),
      setCode: String(record.setCode || ''),
      price: Number.isFinite(price) ? price : null,
      change: Number(record.change) || 0,
      high: Number(record.high) || price || 0,
      low: Number(record.low) || price || 0,
      deals: Number(record.deals) || 0,
      history: Array.isArray(record.history) ? record.history.map(Number).filter(Number.isFinite) : [],
      currency: record.currency || 'CNY',
      marketSource: record.source || 'market-feed',
      marketUpdatedAt: record.updatedAt || null
    };
  }

  async function load() {
    const endpoint = document.querySelector('meta[name="market-data-endpoint"]')?.content?.trim();
    if (!endpoint) return { records: [], status: 'disabled', label: '成交数据接口待配置' };

    try {
      const response = await fetch(endpoint, { headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      const input = Array.isArray(payload) ? payload : payload.records || [];
      return {
        records: input.map(normalizeRecord).filter((record) => record.name && record.setCode),
        status: 'connected',
        label: payload.label || '成交数据已载入',
        updatedAt: payload.updatedAt || null
      };
    } catch (error) {
      return { records: [], status: 'error', label: '成交数据暂不可用', error: error.message };
    }
  }

  function createIndex(records) {
    return new Map(records.map((record) => [keyOf(record), record]));
  }

  window.MarketDataAdapter = { load, createIndex, keyOf };
})();
